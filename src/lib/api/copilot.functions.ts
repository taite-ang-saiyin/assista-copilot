import { createServerFn } from "@tanstack/react-start";

import type {
  ChatCopilotResult,
  CitationSource,
  TicketCopilotResult,
} from "../copilot-types";
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
import {
  persistChatSuggestionArtifact,
  persistTicketDraftArtifact,
} from "../support.server";

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
  customerMessage: string;
  channel?: string;
  customerPlan?: string;
  createdAt?: string;
};

type ChatCopilotInput = {
  conversationId: string;
  conversationHistory: Array<{ sender: string; message: string }>;
  latestMessage: string;
  knownDetails?: Record<string, unknown>;
  missingDetails?: string[];
  customerPlan?: string;
};

function inferCitationType(title: string, citation: string) {
  const haystack = `${title} ${citation}`.toLowerCase();
  if (haystack.includes("ticket")) return "past_ticket";
  if (
    haystack.includes("guide") ||
    haystack.includes("faq") ||
    haystack.includes("troubleshoot")
  ) {
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
    const analysis = await analyzeSupportText({
      message: data.customerMessage,
      ticketId: data.ticketId,
    });

    const searchQuery = buildKnowledgeQuery(analysis.category, [
      data.subject,
      data.customerMessage,
      analysis.sentiment,
    ]);

    const retrieval = await searchKnowledge({
      query: searchQuery,
      topK: 4,
      filters: analysis.category
        ? { category: analysis.category.toLowerCase() }
        : undefined,
    });

    const retrievedContext = retrieval.results.map((result) => ({
      source: result.title,
      section: result.section ?? undefined,
      text: result.text,
      score: result.score,
    }));

    const draft = await createTicketDraft(data.ticketId, {
      customer_message: data.customerMessage,
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      classification_confidence: analysis.confidence,
      entities: analysis.entities,
      channel: data.channel ?? "email",
      customer_plan: data.customerPlan ?? "standard",
      created_at: data.createdAt,
      retrieved_context: retrievedContext,
    });

    const persistedDraft = await persistTicketDraftArtifact({
      ticketId: data.ticketId,
      trackingCode: data.trackingCode,
      generatedReply: draft.replyDraft,
      agentNotes: draft.agentNotes,
      citations: draft.citations,
      missingInfo: draft.missingInfo,
      confidence: draft.confidence,
      escalationRequired: draft.escalationRequired,
      escalationReason: draft.escalationReason,
      sourceQuery: searchQuery,
      sourceSnapshot: retrieval.results.map(toCitationSource),
      analysisSnapshot: analysis,
    });

    const result: TicketCopilotResult = {
      analysis,
      searchQuery,
      sources: retrieval.results.map(toCitationSource),
      draftId: persistedDraft.id,
      draftStatus: persistedDraft.status,
      draft,
    };

    return result;
  });

export const generateChatCopilot = createServerFn({ method: "POST" })
  .validator((input: ChatCopilotInput) => input)
  .handler(async ({ data }) => {
    const analysis = await analyzeSupportText({
      message: data.latestMessage,
      ticketId: data.conversationId,
    });

    const searchQuery = buildKnowledgeQuery(analysis.category, [
      data.latestMessage,
      analysis.sentiment,
      data.conversationHistory.slice(-3).map((entry) => entry.message).join("\n"),
    ]);

    const retrieval = await searchKnowledge({
      query: searchQuery,
      topK: 4,
      filters: analysis.category
        ? { category: analysis.category.toLowerCase() }
        : undefined,
    });

    const retrievedContext = retrieval.results.map((result) => ({
      source: result.title,
      section: result.section ?? undefined,
      text: result.text,
      score: result.score,
    }));

    const suggestion = await createChatSuggestion(data.conversationId, {
      conversation_history: data.conversationHistory,
      latest_message: data.latestMessage,
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      classification_confidence: analysis.confidence,
      known_details: data.knownDetails ?? {},
      missing_details: data.missingDetails ?? [],
      customer_plan: data.customerPlan ?? "standard",
      retrieved_context: retrievedContext,
    });

    const persistedSuggestion = await persistChatSuggestionArtifact({
      sessionId: data.conversationId,
      generatedReply: suggestion.suggestedReply,
      agentNotes: suggestion.agentNotes,
      citations: suggestion.citations,
      missingInfo: suggestion.missingInfo,
      confidence: suggestion.confidence,
      escalationRequired: suggestion.escalationRequired,
      escalationReason: suggestion.escalationReason,
      sourceQuery: searchQuery,
      sourceSnapshot: retrieval.results.map(toCitationSource),
      analysisSnapshot: analysis,
    });

    const result: ChatCopilotResult = {
      analysis,
      searchQuery,
      sources: retrieval.results.map(toCitationSource),
      suggestionId: persistedSuggestion.id,
      suggestionStatus: persistedSuggestion.status,
      suggestion,
    };

    return result;
  });
