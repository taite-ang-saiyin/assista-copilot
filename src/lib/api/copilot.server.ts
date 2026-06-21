import { getServerConfig } from "../config.server";
import type {
  IntelligenceAnalysis,
  ChatSuggestionResult,
  KnowledgeDocument,
  KnowledgeSearchResult,
  TicketDraftResult,
} from "../copilot-types";

type JsonRecord = Record<string, unknown>;

type KnowledgeDocsResponse = {
  items?: Array<{
    doc_id: string;
    title: string;
    source_type: string;
    file_name: string;
    version: number;
    indexing_status: "pending" | "processing" | "indexed" | "failed";
    indexing_error: string | null;
    chunk_count?: number;
    created_at: string;
    updated_at: string;
  }>;
  total?: number;
};

type KnowledgeStatusResponse = {
  doc_id: string;
  indexing_status: "pending" | "processing" | "indexed" | "failed";
  indexing_error: string | null;
  chunk_count?: number;
  updated_at: string;
};

type KnowledgeSearchResponse = {
  query?: string;
  results?: Array<{
    chunk_id: string;
    doc_id: string;
    title: string;
    section?: string | null;
    score: number;
    text: string;
    citation: string;
  }>;
};

type Member1AnalyzeResponse = {
  status?: string;
  message?: string;
  predictions?: {
    category?: string;
    priority?: string;
    sentiment?: string;
    confidence?: number;
    confidence_breakdown?: {
      category?: number;
      priority?: number;
      sentiment?: number;
      entity?: number;
    };
  };
  entities?: {
    extracted_entities?: Record<string, string>;
    entity_count?: number;
    has_order_info?: boolean;
    has_error_info?: boolean;
    has_amount_info?: boolean;
    has_customer_info?: boolean;
    priority_entities_found?: boolean;
  };
  timestamp?: string;
};

type TicketDraftResponse = {
  reply_draft?: string;
  agent_notes?: string;
  citations?: string[];
  confidence?: number;
  missing_info?: string[];
  suggested_status?: string | null;
  resolution_likely?: boolean;
  escalation_required?: boolean;
  escalation_reason?: string | null;
};

type ChatSuggestionResponse = {
  suggested_reply?: string;
  agent_notes?: string;
  citations?: string[];
  confidence?: number;
  missing_info?: string[];
  suggested_status?: string | null;
  resolution_likely?: boolean;
  escalation_required?: boolean;
  escalation_reason?: string | null;
};

const MEMBER3_TIMEOUT_MS = 360_000;

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function requireConfigValue(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildUrl(baseUrl: string, path: string) {
  return `${trimTrailingSlash(baseUrl)}${path}`;
}

async function fetchJson<T>(url: string, init: RequestInit, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${body || "Request failed"}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function knowledgeHeaders() {
  const config = getServerConfig();
  return {
    baseUrl: requireConfigValue(config.member2ApiBaseUrl, "MEMBER2_API_BASE_URL"),
    apiKey: requireConfigValue(config.member2ApiKey, "MEMBER2_API_KEY"),
  };
}

function member1BaseUrl() {
  const config = getServerConfig();
  return requireConfigValue(config.member1ApiBaseUrl, "MEMBER1_API_BASE_URL");
}

function member3BaseUrl() {
  const config = getServerConfig();
  return requireConfigValue(config.member3ApiBaseUrl, "MEMBER3_API_BASE_URL");
}

function normalizeKnowledgeDocument(
  item: NonNullable<KnowledgeDocsResponse["items"]>[number],
): KnowledgeDocument {
  return {
    docId: item.doc_id,
    title: item.title,
    sourceType: item.source_type,
    fileName: item.file_name,
    version: item.version,
    indexingStatus: item.indexing_status,
    indexingError: item.indexing_error,
    chunkCount: item.chunk_count,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function listKnowledgeDocuments(input: {
  sourceType?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const { baseUrl, apiKey } = knowledgeHeaders();
  const search = new URLSearchParams();

  if (input.sourceType) search.set("source_type", input.sourceType);
  if (input.category) search.set("category", input.category);
  if (input.limit != null) search.set("limit", String(input.limit));
  if (input.offset != null) search.set("offset", String(input.offset));

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetchJson<KnowledgeDocsResponse>(
    buildUrl(baseUrl, `/knowledge/docs${suffix}`),
    {
      headers: {
        "X-API-Key": apiKey,
      },
    },
  );

  return {
    items: (response.items ?? []).map(normalizeKnowledgeDocument),
    total: response.total ?? 0,
  };
}

export async function getKnowledgeDocumentStatus(docId: string) {
  const { baseUrl, apiKey } = knowledgeHeaders();
  const response = await fetchJson<KnowledgeStatusResponse>(
    buildUrl(baseUrl, `/knowledge/docs/${encodeURIComponent(docId)}/status`),
    {
      headers: {
        "X-API-Key": apiKey,
      },
    },
  );

  return {
    docId: response.doc_id,
    indexingStatus: response.indexing_status,
    indexingError: response.indexing_error,
    chunkCount: response.chunk_count,
    updatedAt: response.updated_at,
  };
}

export async function uploadKnowledgeDocument(formData: FormData) {
  const { baseUrl, apiKey } = knowledgeHeaders();
  const response = await fetchJson<{
    doc_id: string;
    title: string;
    source_type: string;
    file_name: string;
    version: number;
    status: "pending" | "processing" | "indexed" | "failed";
    chunk_count: number;
    indexing_error: string | null;
  }>(buildUrl(baseUrl, "/knowledge/upload"), {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
    },
    body: formData,
  });

  return {
    docId: response.doc_id,
    title: response.title,
    sourceType: response.source_type,
    fileName: response.file_name,
    version: response.version,
    indexingStatus: response.status,
    chunkCount: response.chunk_count,
    indexingError: response.indexing_error,
  };
}

export async function reindexKnowledgeDocument(input: { docId?: string; force?: boolean }) {
  const { baseUrl, apiKey } = knowledgeHeaders();
  return fetchJson<{ status: string; indexed_documents: number }>(
    buildUrl(baseUrl, "/knowledge/reindex"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        doc_id: input.docId,
        force: input.force ?? true,
      }),
    },
  );
}

export async function deleteKnowledgeDocument(docId: string) {
  const { baseUrl, apiKey } = knowledgeHeaders();
  return fetchJson<{ doc_id: string; status: string; deleted_chunks: number }>(
    buildUrl(baseUrl, `/knowledge/docs/${encodeURIComponent(docId)}`),
    {
      method: "DELETE",
      headers: {
        "X-API-Key": apiKey,
      },
    },
  );
}

export async function searchKnowledge(input: {
  query: string;
  topK?: number;
  filters?: JsonRecord;
}) {
  const { baseUrl, apiKey } = knowledgeHeaders();
  const response = await fetchJson<KnowledgeSearchResponse>(
    buildUrl(baseUrl, "/knowledge/search"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        query: input.query,
        top_k: input.topK ?? 4,
        filters: input.filters ?? {},
      }),
    },
  );

  return {
    query: response.query ?? input.query,
    results: (response.results ?? []).map<KnowledgeSearchResult>((result) => ({
      chunkId: result.chunk_id,
      docId: result.doc_id,
      title: result.title,
      section: result.section ?? null,
      score: result.score,
      text: result.text,
      citation: result.citation,
    })),
  };
}

export async function analyzeSupportText(input: { message: string; ticketId?: string }) {
  const baseUrl = member1BaseUrl();
  const response = await fetchJson<Member1AnalyzeResponse>(
    buildUrl(baseUrl, "/tickets/analyze"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: input.message,
        ticket_id: input.ticketId,
      }),
    },
    30_000,
  );

  return normalizeIntelligenceAnalysis(response);
}

export async function createTicketDraft(ticketId: string, payload: JsonRecord) {
  const baseUrl = member3BaseUrl();
  const response = await fetchJson<TicketDraftResponse>(
    buildUrl(baseUrl, `/tickets/${encodeURIComponent(ticketId)}/draft`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    MEMBER3_TIMEOUT_MS,
  );

  return normalizeTicketDraft(response);
}

export async function createChatSuggestion(conversationId: string, payload: JsonRecord) {
  const baseUrl = member3BaseUrl();
  const response = await fetchJson<ChatSuggestionResponse>(
    buildUrl(baseUrl, `/chat/conversations/${encodeURIComponent(conversationId)}/suggest`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    MEMBER3_TIMEOUT_MS,
  );

  return normalizeChatSuggestion(response);
}

function normalizeTicketDraft(response: TicketDraftResponse): TicketDraftResult {
  return {
    replyDraft: response.reply_draft ?? "",
    agentNotes: response.agent_notes ?? "",
    citations: response.citations ?? [],
    confidence: response.confidence ?? 0,
    missingInfo: response.missing_info ?? [],
    suggestedStatus: response.suggested_status ?? null,
    resolutionLikely: response.resolution_likely ?? false,
    escalationRequired: response.escalation_required ?? false,
    escalationReason: response.escalation_reason ?? null,
  };
}

function normalizeIntelligenceAnalysis(response: Member1AnalyzeResponse): IntelligenceAnalysis {
  return {
    category: response.predictions?.category ?? "General",
    priority: response.predictions?.priority ?? "Medium",
    sentiment: response.predictions?.sentiment ?? "Neutral",
    confidence: response.predictions?.confidence ?? 0,
    confidenceBreakdown: {
      category: response.predictions?.confidence_breakdown?.category ?? 0,
      priority: response.predictions?.confidence_breakdown?.priority ?? 0,
      sentiment: response.predictions?.confidence_breakdown?.sentiment ?? 0,
      entity: response.predictions?.confidence_breakdown?.entity ?? 0,
    },
    entities: response.entities?.extracted_entities ?? {},
    entityCount: response.entities?.entity_count ?? 0,
    hasOrderInfo: response.entities?.has_order_info ?? false,
    hasErrorInfo: response.entities?.has_error_info ?? false,
    hasAmountInfo: response.entities?.has_amount_info ?? false,
    hasCustomerInfo: response.entities?.has_customer_info ?? false,
    priorityEntitiesFound: response.entities?.priority_entities_found ?? false,
    timestamp: response.timestamp,
  };
}

function normalizeChatSuggestion(response: ChatSuggestionResponse): ChatSuggestionResult {
  return {
    suggestedReply: response.suggested_reply ?? "",
    agentNotes: response.agent_notes ?? "",
    citations: response.citations ?? [],
    confidence: response.confidence ?? 0,
    missingInfo: response.missing_info ?? [],
    suggestedStatus: response.suggested_status ?? null,
    resolutionLikely: response.resolution_likely ?? false,
    escalationRequired: response.escalation_required ?? false,
    escalationReason: response.escalation_reason ?? null,
  };
}
