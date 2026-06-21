import { createServerFn } from "@tanstack/react-start";

import type {
  ChatCopilotResult,
  CitationSource,
  KnowledgeSearchResult,
  TicketCopilotResult,
} from "../copilot-types";
import { getServerConfig } from "../config.server";
import type { BackendTicketStatus, Member3HistoryItem, SupportMessage } from "../support-models";
import {
  analyzeSupportText,
  createChatSuggestion,
  createTicketDraft,
  deleteKnowledgeDocument,
  getKnowledgeDocumentStatus,
  listKnowledgeDocuments,
  reindexKnowledgeDocument,
  searchKnowledge,
  uploadKnowledgeDocument,
} from "./copilot.server";
import { persistChatSuggestionArtifact, persistTicketDraftArtifact } from "../support.server";

type KnowledgeListInput = {
  sourceType?: string;
  category?: string;
  limit?: number;
  offset?: number;
};

type KnowledgeSearchInput = {
  query: string;
  topK?: number;
  filters?: Record<string, unknown>;
};

type ReindexInput = {
  docId?: string;
  force?: boolean;
};

type TicketCopilotInput = {
  ticketId: string;
  trackingCode: string;
  subject: string;
  conversationHistory: SupportMessage[];
  ticketStatus: BackendTicketStatus;
  channel?: string;
  customerPlan?: string;
  createdAt?: string;
};

type ChatCopilotInput = {
  conversationId: string;
  conversationHistory: SupportMessage[];
  knownDetails?: Record<string, unknown>;
  missingDetails?: string[];
  customerPlan?: string;
};

function inferCitationType(title: string, citation: string) {
  const haystack = `${title} ${citation}`.toLowerCase();
  if (haystack.includes("ticket")) return "past_ticket";
  if (haystack.includes("guide") || haystack.includes("faq") || haystack.includes("troubleshoot")) {
    return "guide";
  }
  return "policy";
}

function toCitationSource(result: {
  chunkId: string;
  title: string;
  text: string;
  score: number;
  citation: string;
}): CitationSource & { relevance: number; citation: string } {
  return {
    id: result.chunkId,
    title: result.title,
    type: inferCitationType(result.title, result.citation),
    excerpt: result.text,
    updatedAt: "live search",
    relevance: result.score,
    citation: result.citation,
  };
}

function buildKnowledgeQuery(category: string, segments: string[]) {
  const uniqueSegments = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment, index, all) => all.indexOf(segment) === index);

  if (!uniqueSegments.length) {
    return category;
  }

  return uniqueSegments.join("\n\n");
}

function toMember3History(messages: SupportMessage[]): Member3HistoryItem[] {
  return messages
    .filter(
      (message): message is SupportMessage & { from: "customer" | "agent" } =>
        message.from === "customer" || message.from === "agent",
    )
    .map((message) => ({
      sender: message.from,
      message: message.text,
      timestamp: message.at || undefined,
      message_id: message.id || undefined,
    }));
}

function getLatestCustomerHistoryItem(messages: SupportMessage[]) {
  const history = toMember3History(messages);
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry.sender === "customer") return entry;
  }
  return null;
}

function getRetrievalMinScore() {
  const configuredValue = Number(getServerConfig().copilotRetrievalMinScore ?? 0.75);
  if (!Number.isFinite(configuredValue)) return 0.75;
  return Math.min(Math.max(configuredValue, 0), 1);
}

function selectRetrievedResults(results: KnowledgeSearchResult[]) {
  const filteredResults = results.filter((result) => result.score >= getRetrievalMinScore());
  return filteredResults;
}

function logMember3Payload(endpoint: string, payload: Record<string, unknown>) {
  console.info(`[member3] ${endpoint} payload\n${JSON.stringify(payload, null, 2)}`);
}

export const getKnowledgeDocuments = createServerFn({ method: "GET" })
  .validator((input: KnowledgeListInput) => input)
  .handler(async ({ data }) => {
    return listKnowledgeDocuments(data);
  });

export const getKnowledgeStatus = createServerFn({ method: "GET" })
  .validator((input: { docId: string }) => input)
  .handler(async ({ data }) => {
    return getKnowledgeDocumentStatus(data.docId);
  });

export const runKnowledgeSearch = createServerFn({ method: "POST" })
  .validator((input: KnowledgeSearchInput) => input)
  .handler(async ({ data }) => {
    const response = await searchKnowledge(data);
    return {
      query: response.query,
      results: response.results.map(toCitationSource),
    };
  });

export const uploadKnowledgeSource = createServerFn({ method: "POST" })
  .validator((input: FormData) => input)
  .handler(async ({ data }) => {
    return uploadKnowledgeDocument(data);
  });

export const reindexKnowledgeSource = createServerFn({ method: "POST" })
  .validator((input: ReindexInput) => input)
  .handler(async ({ data }) => {
    return reindexKnowledgeDocument(data);
  });

export const removeKnowledgeSource = createServerFn({ method: "POST" })
  .validator((input: { docId: string }) => input)
  .handler(async ({ data }) => {
    return deleteKnowledgeDocument(data.docId);
  });

export const generateTicketCopilot = createServerFn({ method: "POST" })
  .validator((input: TicketCopilotInput) => input)
  .handler(async ({ data }) => {
    const conversationHistory = toMember3History(data.conversationHistory);
    const latestCustomerEntry = getLatestCustomerHistoryItem(data.conversationHistory);

    if (!latestCustomerEntry) {
      throw new Error("Ticket conversation does not contain a customer-authored message.");
    }

    const analysis = await analyzeSupportText({
      message: latestCustomerEntry.message,
      ticketId: data.ticketId,
    });

    const searchQuery = buildKnowledgeQuery(analysis.category, [
      data.subject,
      latestCustomerEntry.message,
      analysis.sentiment,
    ]);

    const retrieval = await searchKnowledge({
      query: searchQuery,
      topK: 4,
      filters: analysis.category ? { category: analysis.category.toLowerCase() } : undefined,
    });

    const selectedResults = selectRetrievedResults(retrieval.results);

    const retrievedContext = selectedResults.map((result) => ({
      source: result.title,
      section: result.section ?? undefined,
      text: result.text,
      score: result.score,
    }));

    const member3Payload = {
      conversation_history: conversationHistory,
      latest_customer_message: latestCustomerEntry.message,
      subject: data.subject,
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      classification_confidence: analysis.confidence,
      entities: analysis.entities,
      channel: data.channel ?? "email",
      customer_plan: data.customerPlan ?? "standard",
      created_at: data.createdAt,
      ticket_status: data.ticketStatus,
      retrieved_context: retrievedContext,
    };

    logMember3Payload(`/tickets/${data.ticketId}/draft`, member3Payload);

    const draft = await createTicketDraft(data.ticketId, member3Payload);

    const persistedDraft = await persistTicketDraftArtifact({
      ticketId: data.ticketId,
      trackingCode: data.trackingCode,
      generatedReply: draft.replyDraft,
      agentNotes: draft.agentNotes,
      citations: draft.citations,
      missingInfo: draft.missingInfo,
      confidence: draft.confidence,
      suggestedStatus: draft.suggestedStatus,
      resolutionLikely: draft.resolutionLikely,
      escalationRequired: draft.escalationRequired,
      escalationReason: draft.escalationReason,
      sourceQuery: searchQuery,
      sourceSnapshot: selectedResults.map(toCitationSource),
      analysisSnapshot: analysis,
    });

    const result: TicketCopilotResult = {
      analysis,
      searchQuery,
      sources: selectedResults.map(toCitationSource),
      draftId: persistedDraft.id,
      draftStatus: persistedDraft.status,
      draft,
    };

    return result;
  });

export const generateChatCopilot = createServerFn({ method: "POST" })
  .validator((input: ChatCopilotInput) => input)
  .handler(async ({ data }) => {
    const conversationHistory = toMember3History(data.conversationHistory);
    const latestCustomerEntry = getLatestCustomerHistoryItem(data.conversationHistory);

    if (!latestCustomerEntry) {
      throw new Error("Chat conversation does not contain a customer-authored message.");
    }

    const analysis = await analyzeSupportText({
      message: latestCustomerEntry.message,
      ticketId: data.conversationId,
    });

    const searchQuery = buildKnowledgeQuery(analysis.category, [
      latestCustomerEntry.message,
      analysis.sentiment,
    ]);

    const retrieval = await searchKnowledge({
      query: searchQuery,
      topK: 4,
      filters: analysis.category ? { category: analysis.category.toLowerCase() } : undefined,
    });

    const selectedResults = selectRetrievedResults(retrieval.results);

    const retrievedContext = selectedResults.map((result) => ({
      source: result.title,
      section: result.section ?? undefined,
      text: result.text,
      score: result.score,
    }));

    const member3Payload = {
      conversation_history: conversationHistory,
      latest_message: latestCustomerEntry.message,
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      classification_confidence: analysis.confidence,
      known_details: data.knownDetails ?? {},
      missing_details: data.missingDetails ?? [],
      customer_plan: data.customerPlan ?? "standard",
      retrieved_context: retrievedContext,
    };

    logMember3Payload(`/chat/conversations/${data.conversationId}/suggest`, member3Payload);

    const suggestion = await createChatSuggestion(data.conversationId, member3Payload);

    const persistedSuggestion = await persistChatSuggestionArtifact({
      sessionId: data.conversationId,
      generatedReply: suggestion.suggestedReply,
      agentNotes: suggestion.agentNotes,
      citations: suggestion.citations,
      missingInfo: suggestion.missingInfo,
      confidence: suggestion.confidence,
      suggestedStatus: suggestion.suggestedStatus,
      resolutionLikely: suggestion.resolutionLikely,
      escalationRequired: suggestion.escalationRequired,
      escalationReason: suggestion.escalationReason,
      sourceQuery: searchQuery,
      sourceSnapshot: selectedResults.map(toCitationSource),
      analysisSnapshot: analysis,
    });

    const result: ChatCopilotResult = {
      analysis,
      searchQuery,
      sources: selectedResults.map(toCitationSource),
      suggestionId: persistedSuggestion.id,
      suggestionStatus: persistedSuggestion.status,
      suggestion,
    };

    return result;
  });
