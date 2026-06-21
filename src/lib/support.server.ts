import type { PostgrestError } from "@supabase/supabase-js";

import type { CitationSource, IntelligenceAnalysis } from "./copilot-types";
import {
  acceptChatAssignment,
  acceptTicketAssignment,
  closeChatSessionViaBackend,
  sendChatReplyViaBackendSocket,
  sendTicketReplyViaBackend,
} from "./customer-backend.server";
import type {
  AuditEvent,
  BackendTicketStatus,
  ChatDetailData,
  ChatListItem,
  EscalationRecord,
  PersistedChatSuggestion,
  PersistedTicketDraft,
  Priority,
  Sentiment,
  SupportMessage,
  SupportOverview,
  TicketDetailData,
  TicketListItem,
  TicketStatus,
} from "./support-models";
import { getDefaultAgent, getSupabaseAdmin } from "./supabase.server";

type JsonRecord = Record<string, unknown>;
type Member3ResponseMetadata = {
  suggested_status?: string | null;
  resolution_likely?: boolean;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function member3MetadataFromSnapshot(value: unknown): Member3ResponseMetadata {
  const snapshot = asRecord(value);
  const metadata = asRecord(snapshot.member3_response);

  return {
    suggested_status:
      typeof metadata.suggested_status === "string" || metadata.suggested_status == null
        ? (metadata.suggested_status as string | null | undefined)
        : undefined,
    resolution_likely:
      typeof metadata.resolution_likely === "boolean" ? metadata.resolution_likely : undefined,
  };
}

function titleCase(value: string | null | undefined) {
  if (!value) return "";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function normalizePriority(value: string | null | undefined): Priority {
  const normalized = value?.toLowerCase();
  if (normalized === "urgent") return "Urgent";
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

function normalizeSentiment(value: string | null | undefined): Sentiment {
  const normalized = value?.toLowerCase();
  if (normalized === "angry") return "Angry";
  if (normalized === "frustrated") return "Frustrated";
  if (normalized === "confused") return "Confused";
  return "Neutral";
}

function isOpenEscalation(status: string | null | undefined) {
  return status != null && !["resolved", "closed"].includes(status);
}

function mapTicketStatus(
  dbStatus: string | null | undefined,
  openEscalation: boolean,
  latestDraftStatus?: string | null,
): TicketStatus {
  if (openEscalation) return "Escalated";
  if (dbStatus === "resolved" || dbStatus === "closed") return "Resolved";
  if (latestDraftStatus && latestDraftStatus !== "rejected") return "Drafted";
  if (dbStatus === "accepted" || dbStatus === "in_progress") return "Waiting";
  return "New";
}

function mapChatStatus(
  dbStatus: string | null | undefined,
  openEscalation: boolean,
): "active" | "waiting" | "ended" {
  if (dbStatus === "closed") return "ended";
  if (openEscalation) return "active";
  if (dbStatus === "accepted" || dbStatus === "in_progress") return "active";
  return "waiting";
}

function deriveFlags(input: {
  category?: string | null;
  sentiment?: string | null;
  confidence?: number | null;
  openEscalation?: boolean;
  escalationReason?: string | null;
}) {
  const flags = new Set<string>();
  const category = input.category?.toLowerCase() ?? "";
  const sentiment = input.sentiment?.toLowerCase() ?? "";

  if (category === "security") flags.add("security_issue");
  if (category === "outage") flags.add("possible_outage");
  if (category === "billing" || category === "refund") flags.add("payment_dispute");
  if (sentiment === "angry") flags.add("angry_customer");
  if ((input.confidence ?? 0) > 0 && (input.confidence ?? 0) < 0.7) flags.add("low_confidence");
  if (input.openEscalation) flags.add("security_issue");
  if ((input.escalationReason ?? "").toLowerCase().includes("vip")) flags.add("vip_customer");

  return Array.from(flags);
}

function serializeSupportMessage(row: Record<string, unknown>): SupportMessage {
  return {
    id: String(row.id),
    from: (row.sender_type as "customer" | "agent" | "system") ?? "system",
    senderName: String(
      row.sender_name ??
        (row.sender_type === "customer"
          ? "Customer"
          : row.sender_type === "agent"
            ? "Agent"
            : "System"),
    ),
    at: String(row.created_at ?? ""),
    text: String(row.message ?? ""),
  };
}

function serializeTicketDraft(row: Record<string, unknown>): PersistedTicketDraft {
  const metadata = member3MetadataFromSnapshot(row.analysis_snapshot);

  return {
    id: String(row.id),
    generatedReply: String(row.generated_reply ?? ""),
    editedReply: (row.edited_reply as string | null) ?? null,
    agentNotes: String(row.agent_notes ?? ""),
    citations: asArray<string>(row.citations),
    missingInfo: asArray<string>(row.missing_info),
    confidence: Number(row.confidence ?? 0),
    suggestedStatus:
      (row.suggested_status as string | null | undefined) ?? metadata.suggested_status ?? null,
    resolutionLikely:
      (row.resolution_likely as boolean | null | undefined) ?? metadata.resolution_likely ?? false,
    escalationRequired: Boolean(row.escalation_required),
    escalationReason: (row.escalation_reason as string | null) ?? null,
    sourceQuery: (row.source_query as string | null) ?? null,
    sourceSnapshot: asArray<CitationSource & { relevance: number; citation: string }>(
      row.source_snapshot,
    ),
    analysisSnapshot: (row.analysis_snapshot as IntelligenceAnalysis | null) ?? null,
    status: String(row.status ?? "generated"),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function serializeChatSuggestion(row: Record<string, unknown>): PersistedChatSuggestion {
  const metadata = member3MetadataFromSnapshot(row.analysis_snapshot);

  return {
    id: String(row.id),
    generatedReply: String(row.generated_reply ?? ""),
    editedReply: (row.edited_reply as string | null) ?? null,
    agentNotes: String(row.agent_notes ?? ""),
    citations: asArray<string>(row.citations),
    missingInfo: asArray<string>(row.missing_info),
    confidence: Number(row.confidence ?? 0),
    suggestedStatus:
      (row.suggested_status as string | null | undefined) ?? metadata.suggested_status ?? null,
    resolutionLikely:
      (row.resolution_likely as boolean | null | undefined) ?? metadata.resolution_likely ?? false,
    escalationRequired: Boolean(row.escalation_required),
    escalationReason: (row.escalation_reason as string | null) ?? null,
    sourceQuery: (row.source_query as string | null) ?? null,
    sourceSnapshot: asArray<CitationSource & { relevance: number; citation: string }>(
      row.source_snapshot,
    ),
    analysisSnapshot: (row.analysis_snapshot as IntelligenceAnalysis | null) ?? null,
    status: String(row.status ?? "generated"),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function serializeEscalation(row: Record<string, unknown>): EscalationRecord {
  return {
    id: String(row.id),
    sourceType: String(row.source_type ?? "ticket") as "ticket" | "chat",
    reason: String(row.reason ?? ""),
    targetTeam: (row.target_team as string | null) ?? null,
    status: String(row.status ?? "open"),
    createdAt: String(row.created_at ?? ""),
  };
}

function unwrapError(error: PostgrestError | null, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

async function fetchLatestTicketDrafts(ticketIds: string[]) {
  if (!ticketIds.length) return new Map<string, PersistedTicketDraft>();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_ticket_drafts")
    .select("*")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: false });

  unwrapError(error, "Failed to load AI ticket drafts");

  const byTicketId = new Map<string, PersistedTicketDraft>();
  for (const row of data ?? []) {
    const key = String((row as Record<string, unknown>).ticket_id);
    if (!byTicketId.has(key)) {
      byTicketId.set(key, serializeTicketDraft(row as Record<string, unknown>));
    }
  }
  return byTicketId;
}

async function fetchLatestChatSuggestions(sessionIds: string[]) {
  if (!sessionIds.length) return new Map<string, PersistedChatSuggestion>();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_chat_suggestions")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  unwrapError(error, "Failed to load AI chat suggestions");

  const bySessionId = new Map<string, PersistedChatSuggestion>();
  for (const row of data ?? []) {
    const key = String((row as Record<string, unknown>).session_id);
    if (!bySessionId.has(key)) {
      bySessionId.set(key, serializeChatSuggestion(row as Record<string, unknown>));
    }
  }
  return bySessionId;
}

async function fetchOpenEscalationsByTarget(column: "ticket_id" | "session_id", ids: string[]) {
  if (!ids.length) return new Map<string, EscalationRecord[]>();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("escalations")
    .select("*")
    .in(column, ids)
    .order("created_at", { ascending: false });

  unwrapError(error, "Failed to load escalations");

  const grouped = new Map<string, EscalationRecord[]>();
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const targetId = String(record[column]);
    const escalation = serializeEscalation(record);
    if (!grouped.has(targetId)) grouped.set(targetId, []);
    grouped.get(targetId)?.push(escalation);
  }
  return grouped;
}

function mapTicketRow(
  row: Record<string, unknown>,
  latestDraft: PersistedTicketDraft | null,
  escalations: EscalationRecord[],
): TicketListItem {
  const analysis = latestDraft?.analysisSnapshot;
  const openEscalation = escalations.some((entry) => isOpenEscalation(entry.status));
  const confidence = latestDraft?.confidence ?? analysis?.confidence ?? 0;
  const sentiment = normalizeSentiment(analysis?.sentiment);
  const flags = deriveFlags({
    category: analysis?.category ?? String(row.category ?? ""),
    sentiment: sentiment,
    confidence,
    openEscalation,
    escalationReason: escalations[0]?.reason ?? latestDraft?.escalationReason ?? null,
  });

  const dbStatus = String(row.status ?? "");

  return {
    id: String(row.id),
    trackingCode: String(row.tracking_code ?? ""),
    customerName: String(row.customer_full_name ?? ""),
    category: titleCase(String(row.category ?? "")),
    priority: normalizePriority(
      latestDraft?.analysisSnapshot?.priority ?? String(row.priority ?? ""),
    ),
    sentiment,
    status: mapTicketStatus(dbStatus, openEscalation, latestDraft?.status ?? null),
    backendStatus: dbStatus as BackendTicketStatus,
    subject: String(row.subject ?? ""),
    description: String(row.description ?? ""),
    createdAt: String(row.created_at ?? ""),
    confidence,
    flags,
    assignedAgentId: (row.assigned_agent_id as string | null) ?? null,
    latestDraftId: latestDraft?.id ?? null,
  };
}

function mapChatRow(
  row: Record<string, unknown>,
  latestSuggestion: PersistedChatSuggestion | null,
  escalations: EscalationRecord[],
  messagesCount: number,
): ChatListItem {
  const analysis = latestSuggestion?.analysisSnapshot;
  const openEscalation = escalations.some((entry) => isOpenEscalation(entry.status));
  const confidence = latestSuggestion?.confidence ?? analysis?.confidence ?? 0;
  const sentiment = normalizeSentiment(analysis?.sentiment);
  const flags = deriveFlags({
    category: analysis?.category ?? String(row.category ?? ""),
    sentiment,
    confidence,
    openEscalation,
    escalationReason: escalations[0]?.reason ?? latestSuggestion?.escalationReason ?? null,
  });

  return {
    id: String(row.id),
    customerName: String(row.customer_full_name ?? ""),
    category: titleCase(String(row.category ?? "")),
    briefDescription: String(row.brief_description ?? ""),
    priority: normalizePriority(analysis?.priority ?? "medium"),
    sentiment,
    status: mapChatStatus(String(row.status ?? ""), openEscalation),
    createdAt: String(row.created_at ?? ""),
    confidence,
    flags,
    assignedAgentId: (row.assigned_agent_id as string | null) ?? null,
    unread: 0,
    messagesCount,
    latestSuggestionId: latestSuggestion?.id ?? null,
  };
}

export async function listSupportTickets(limit = 50) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  unwrapError(error, "Failed to load support tickets");

  const rows = (data ?? []) as Record<string, unknown>[];
  const ids = rows.map((row) => String(row.id));
  const [draftsByTicket, escalationsByTicket] = await Promise.all([
    fetchLatestTicketDrafts(ids),
    fetchOpenEscalationsByTarget("ticket_id", ids),
  ]);

  return rows.map((row) =>
    mapTicketRow(
      row,
      draftsByTicket.get(String(row.id)) ?? null,
      escalationsByTicket.get(String(row.id)) ?? [],
    ),
  );
}

export async function listChatSessions(limit = 50) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  unwrapError(error, "Failed to load chat sessions");

  const rows = (data ?? []) as Record<string, unknown>[];
  const ids = rows.map((row) => String(row.id));

  const [suggestionsBySession, escalationsBySession, messagesRows] = await Promise.all([
    fetchLatestChatSuggestions(ids),
    fetchOpenEscalationsByTarget("session_id", ids),
    ids.length
      ? supabase.from("chat_messages").select("session_id").in("session_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  unwrapError(messagesRows.error, "Failed to load chat message counts");

  const messageCounts = new Map<string, number>();
  for (const row of (messagesRows.data ?? []) as Record<string, unknown>[]) {
    const sessionId = String(row.session_id);
    messageCounts.set(sessionId, (messageCounts.get(sessionId) ?? 0) + 1);
  }

  return rows.map((row) =>
    mapChatRow(
      row,
      suggestionsBySession.get(String(row.id)) ?? null,
      escalationsBySession.get(String(row.id)) ?? [],
      messageCounts.get(String(row.id)) ?? 0,
    ),
  );
}

export async function getSupportOverviewData(): Promise<SupportOverview> {
  const supabase = getSupabaseAdmin();
  const [
    tickets,
    chats,
    recentDrafts,
    recentSuggestions,
    recentFeedback,
    recentEscalations,
    resolutionRows,
    draftedTicketRows,
    openEscalationRows,
  ] = await Promise.all([
    listSupportTickets(4),
    listChatSessions(4),
    supabase
      .from("ai_ticket_drafts")
      .select("id, tracking_code, created_at, confidence")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("ai_chat_suggestions")
      .select("id, session_id, created_at, confidence")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("agent_feedback").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("escalations").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("support_tickets").select("created_at, resolved_at, status"),
    supabase.from("ai_ticket_drafts").select("ticket_id"),
    supabase.from("escalations").select("id, status"),
  ]);

  unwrapError(recentDrafts.error, "Failed to load recent ticket drafts");
  unwrapError(recentSuggestions.error, "Failed to load recent chat suggestions");
  unwrapError(recentFeedback.error, "Failed to load feedback events");
  unwrapError(recentEscalations.error, "Failed to load escalation events");
  unwrapError(resolutionRows.error, "Failed to load resolution metrics");
  unwrapError(draftedTicketRows.error, "Failed to load drafted ticket metrics");
  unwrapError(openEscalationRows.error, "Failed to load escalation metrics");

  const openTickets = (resolutionRows.data ?? []).filter((row) => {
    const status = String((row as Record<string, unknown>).status ?? "");
    return status !== "resolved" && status !== "closed";
  }).length;

  const aiDraftedCount = new Set(
    (draftedTicketRows.data ?? []).map((row) =>
      String((row as Record<string, unknown>).ticket_id ?? ""),
    ),
  ).size;

  const escalationsCount = (openEscalationRows.data ?? []).filter((row) =>
    isOpenEscalation(String((row as Record<string, unknown>).status ?? "")),
  ).length;

  const resolvedDurations = (resolutionRows.data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const createdAt = record.created_at ? Date.parse(String(record.created_at)) : NaN;
      const resolvedAt = record.resolved_at ? Date.parse(String(record.resolved_at)) : NaN;
      return Number.isNaN(createdAt) || Number.isNaN(resolvedAt)
        ? null
        : Math.round((resolvedAt - createdAt) / 60000);
    })
    .filter((value): value is number => value != null && value >= 0);

  const avgResolutionMinutes = resolvedDurations.length
    ? Math.round(
        resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length,
      )
    : null;

  const events: AuditEvent[] = [];

  for (const row of (recentDrafts.data ?? []) as Record<string, unknown>[]) {
    events.push({
      id: String(row.id),
      at: String(row.created_at ?? ""),
      actor: "AI",
      action: "Drafted reply",
      target: String(row.tracking_code ?? ""),
      detail: `Ticket draft generated (${Math.round(Number(row.confidence ?? 0) * 100)}% confidence)`,
      risk: Number(row.confidence ?? 0) < 0.7 ? "medium" : "low",
    });
  }

  for (const row of (recentSuggestions.data ?? []) as Record<string, unknown>[]) {
    events.push({
      id: String(row.id),
      at: String(row.created_at ?? ""),
      actor: "AI",
      action: "Suggested reply",
      target: String(row.session_id ?? ""),
      detail: `Chat suggestion generated (${Math.round(Number(row.confidence ?? 0) * 100)}% confidence)`,
      risk: Number(row.confidence ?? 0) < 0.7 ? "medium" : "low",
    });
  }

  for (const row of (recentFeedback.data ?? []) as Record<string, unknown>[]) {
    events.push({
      id: String(row.id),
      at: String(row.created_at ?? ""),
      actor: "Agent",
      action: titleCase(String(row.action ?? "")),
      target: String(row.object_id ?? ""),
      detail: `${titleCase(String(row.object_type ?? ""))} feedback recorded`,
      risk: row.action === "rejected" ? "medium" : "low",
    });
  }

  for (const row of (recentEscalations.data ?? []) as Record<string, unknown>[]) {
    events.push({
      id: String(row.id),
      at: String(row.created_at ?? ""),
      actor: "System",
      action: "Escalated",
      target: String(row.ticket_id ?? row.session_id ?? ""),
      detail: String(row.reason ?? "Escalation created"),
      risk: "high",
    });
  }

  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return {
    openTickets,
    aiDraftedCount,
    escalationsCount,
    avgResolutionMinutes,
    tickets,
    chats,
    events: events.slice(0, 6),
  };
}

export async function getSupportTicketDetail(ticketId: string): Promise<TicketDetailData | null> {
  const supabase = getSupabaseAdmin();
  const { data: ticketRow, error: ticketError } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  unwrapError(ticketError, "Failed to load ticket");
  if (!ticketRow) return null;

  const [replyRows, draftsByTicket, escalationsByTicket] = await Promise.all([
    supabase
      .from("support_ticket_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    fetchLatestTicketDrafts([ticketId]),
    fetchOpenEscalationsByTarget("ticket_id", [ticketId]),
  ]);

  unwrapError(replyRows.error, "Failed to load ticket replies");

  const latestDraft = draftsByTicket.get(ticketId) ?? null;
  const escalations = escalationsByTicket.get(ticketId) ?? [];
  const ticket = mapTicketRow(ticketRow as Record<string, unknown>, latestDraft, escalations);

  const initialMessage: SupportMessage = {
    id: `${ticketId}-initial`,
    from: "customer",
    senderName: ticket.customerName,
    at: String(ticketRow.created_at ?? ""),
    text: String(ticketRow.description ?? ""),
  };

  const replies = [
    initialMessage,
    ...((replyRows.data ?? []) as Record<string, unknown>[]).map(serializeSupportMessage),
  ];

  return {
    ticket: {
      ...ticket,
      acceptedAt: (ticketRow.accepted_at as string | null) ?? null,
      updatedAt: String(ticketRow.updated_at ?? ticketRow.created_at ?? ""),
      resolvedAt: (ticketRow.resolved_at as string | null) ?? null,
      closedAt: (ticketRow.closed_at as string | null) ?? null,
    },
    replies,
    latestDraft,
    escalations,
  };
}

export async function getChatSessionDetail(sessionId: string): Promise<ChatDetailData | null> {
  const supabase = getSupabaseAdmin();
  const { data: sessionRow, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  unwrapError(sessionError, "Failed to load chat session");
  if (!sessionRow) return null;

  const [messageRows, suggestionsBySession, escalationsBySession] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    fetchLatestChatSuggestions([sessionId]),
    fetchOpenEscalationsByTarget("session_id", [sessionId]),
  ]);

  unwrapError(messageRows.error, "Failed to load chat messages");

  const latestSuggestion = suggestionsBySession.get(sessionId) ?? null;
  const escalations = escalationsBySession.get(sessionId) ?? [];
  const session = mapChatRow(
    sessionRow as Record<string, unknown>,
    latestSuggestion,
    escalations,
    (messageRows.data ?? []).length,
  );

  return {
    session: {
      ...session,
      acceptedAt: (sessionRow.accepted_at as string | null) ?? null,
      updatedAt: (sessionRow.updated_at as string | null) ?? null,
      closedAt: (sessionRow.closed_at as string | null) ?? null,
    },
    messages: ((messageRows.data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      from: (row.sender_type as "customer" | "agent" | "system") ?? "system",
      senderName:
        row.sender_type === "customer"
          ? session.customerName
          : row.sender_type === "agent"
            ? "Agent"
            : "System",
      at: String(row.created_at ?? ""),
      text: String(row.message ?? ""),
    })),
    latestSuggestion,
    escalations,
  };
}

export async function persistTicketDraftArtifact(input: {
  ticketId: string;
  trackingCode: string;
  generatedReply: string;
  agentNotes: string;
  citations: string[];
  missingInfo: string[];
  confidence: number;
  suggestedStatus: string | null;
  resolutionLikely: boolean;
  escalationRequired: boolean;
  escalationReason: string | null;
  sourceQuery: string;
  sourceSnapshot: Array<CitationSource & { relevance: number; citation: string }>;
  analysisSnapshot: IntelligenceAnalysis;
}) {
  const supabase = getSupabaseAdmin();
  const agent = getDefaultAgent();

  const { data, error } = await supabase
    .from("ai_ticket_drafts")
    .insert({
      ticket_id: input.ticketId,
      tracking_code: input.trackingCode,
      generated_reply: input.generatedReply,
      agent_notes: input.agentNotes,
      citations: input.citations,
      missing_info: input.missingInfo,
      confidence: input.confidence,
      confidence_breakdown: input.analysisSnapshot.confidenceBreakdown,
      escalation_required: input.escalationRequired,
      escalation_reason: input.escalationReason,
      source_query: input.sourceQuery,
      source_snapshot: input.sourceSnapshot,
      analysis_snapshot: {
        ...input.analysisSnapshot,
        member3_response: {
          suggested_status: input.suggestedStatus,
          resolution_likely: input.resolutionLikely,
        },
      },
      status: "generated",
      created_by_agent_id: agent.id,
      created_by_agent_name: agent.name,
    })
    .select("*")
    .single();

  unwrapError(error, "Failed to persist ticket draft");
  return serializeTicketDraft(data as Record<string, unknown>);
}

export async function persistChatSuggestionArtifact(input: {
  sessionId: string;
  generatedReply: string;
  agentNotes: string;
  citations: string[];
  missingInfo: string[];
  confidence: number;
  suggestedStatus: string | null;
  resolutionLikely: boolean;
  escalationRequired: boolean;
  escalationReason: string | null;
  sourceQuery: string;
  sourceSnapshot: Array<CitationSource & { relevance: number; citation: string }>;
  analysisSnapshot: IntelligenceAnalysis;
}) {
  const supabase = getSupabaseAdmin();
  const agent = getDefaultAgent();

  const { data, error } = await supabase
    .from("ai_chat_suggestions")
    .insert({
      session_id: input.sessionId,
      generated_reply: input.generatedReply,
      agent_notes: input.agentNotes,
      citations: input.citations,
      missing_info: input.missingInfo,
      confidence: input.confidence,
      confidence_breakdown: input.analysisSnapshot.confidenceBreakdown,
      escalation_required: input.escalationRequired,
      escalation_reason: input.escalationReason,
      source_query: input.sourceQuery,
      source_snapshot: input.sourceSnapshot,
      analysis_snapshot: {
        ...input.analysisSnapshot,
        member3_response: {
          suggested_status: input.suggestedStatus,
          resolution_likely: input.resolutionLikely,
        },
      },
      status: "generated",
      created_by_agent_id: agent.id,
      created_by_agent_name: agent.name,
    })
    .select("*")
    .single();

  unwrapError(error, "Failed to persist chat suggestion");
  return serializeChatSuggestion(data as Record<string, unknown>);
}

async function createFeedback(input: {
  objectType: "ticket_draft" | "chat_suggestion";
  objectId: string;
  action: string;
  feedbackNote?: string | null;
  editedText?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const agent = getDefaultAgent();

  const { error } = await supabase.from("agent_feedback").insert({
    object_type: input.objectType,
    object_id: input.objectId,
    action: input.action,
    feedback_note: input.feedbackNote ?? null,
    edited_text: input.editedText ?? null,
    agent_id: agent.id,
    agent_name: agent.name,
  });

  unwrapError(error, "Failed to record feedback");
}

export async function saveTicketDraft(input: { draftId: string; editedReply: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_ticket_drafts")
    .update({
      edited_reply: input.editedReply,
      status: "saved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.draftId)
    .select("*")
    .single();

  unwrapError(error, "Failed to save ticket draft");
  await createFeedback({
    objectType: "ticket_draft",
    objectId: input.draftId,
    action: "edited",
    editedText: input.editedReply,
  });
  return serializeTicketDraft(data as Record<string, unknown>);
}

export async function approveTicketDraft(input: { draftId: string; editedReply: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_ticket_drafts")
    .update({
      edited_reply: input.editedReply,
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.draftId)
    .select("*")
    .single();

  unwrapError(error, "Failed to approve ticket draft");
  await createFeedback({
    objectType: "ticket_draft",
    objectId: input.draftId,
    action: "accepted",
    editedText: input.editedReply,
  });
  return serializeTicketDraft(data as Record<string, unknown>);
}

export async function rejectTicketDraft(input: { draftId: string; note?: string | null }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_ticket_drafts")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.draftId)
    .select("*")
    .single();

  unwrapError(error, "Failed to reject ticket draft");
  await createFeedback({
    objectType: "ticket_draft",
    objectId: input.draftId,
    action: "rejected",
    feedbackNote: input.note ?? null,
  });
  return serializeTicketDraft(data as Record<string, unknown>);
}

export async function sendTicketReply(input: {
  draftId: string;
  ticketId: string;
  trackingCode: string;
  message: string;
}) {
  const supabase = getSupabaseAdmin();
  const agent = getDefaultAgent();
  const { data: ticketRow, error: ticketError } = await supabase
    .from("support_tickets")
    .select("status, assigned_agent_id")
    .eq("id", input.ticketId)
    .maybeSingle();

  unwrapError(ticketError, "Failed to load ticket state before sending");
  if (!ticketRow) {
    throw new Error("Ticket not found");
  }

  const { data: draftSnapshotRow, error: draftSnapshotError } = await supabase
    .from("ai_ticket_drafts")
    .select("*")
    .eq("id", input.draftId)
    .maybeSingle();

  unwrapError(draftSnapshotError, "Failed to load ticket draft state before sending");
  if (!draftSnapshotRow) {
    throw new Error("Ticket draft not found");
  }

  const draftSnapshot = serializeTicketDraft(draftSnapshotRow as Record<string, unknown>);
  const shouldResolve =
    draftSnapshot.suggestedStatus?.toUpperCase() === "RESOLVED" || draftSnapshot.resolutionLikely;

  const ticketStatus = String((ticketRow as Record<string, unknown>).status ?? "");
  if (ticketStatus === "submitted") {
    await acceptTicketAssignment({
      trackingCode: input.trackingCode,
      agentId: agent.id,
    });
  }

  await sendTicketReplyViaBackend({
    trackingCode: input.trackingCode,
    agentId: agent.id,
    agentName: agent.name,
    message: input.message,
    status: shouldResolve ? "resolved" : undefined,
  });

  const { data: draftRow, error: draftError } = await supabase
    .from("ai_ticket_drafts")
    .update({
      edited_reply: input.message,
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.draftId)
    .select("*")
    .single();

  unwrapError(draftError, "Failed to update ticket draft status");

  await createFeedback({
    objectType: "ticket_draft",
    objectId: input.draftId,
    action: "sent",
    editedText: input.message,
  });

  return serializeTicketDraft(draftRow as Record<string, unknown>);
}

export async function acceptTicketCase(input: { ticketId: string; trackingCode: string }) {
  const agent = getDefaultAgent();
  return acceptTicketAssignment({
    trackingCode: input.trackingCode,
    agentId: agent.id,
  });
}

export async function escalateTicketCase(input: {
  draftId: string;
  ticketId: string;
  reason: string;
  targetTeam?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const agent = getDefaultAgent();

  const [{ data: escalationRow, error: escalationError }, { data: draftRow, error: draftError }] =
    await Promise.all([
      supabase
        .from("escalations")
        .insert({
          ticket_id: input.ticketId,
          source_type: "ticket",
          reason: input.reason,
          target_team: input.targetTeam ?? null,
          status: "open",
          created_by_agent_id: agent.id,
          created_by_agent_name: agent.name,
        })
        .select("*")
        .single(),
      supabase
        .from("ai_ticket_drafts")
        .update({
          status: "escalated",
          escalation_required: true,
          escalation_reason: input.reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.draftId)
        .select("*")
        .single(),
    ]);

  unwrapError(escalationError, "Failed to create escalation");
  unwrapError(draftError, "Failed to update draft escalation state");

  await createFeedback({
    objectType: "ticket_draft",
    objectId: input.draftId,
    action: "escalated",
    feedbackNote: input.reason,
  });

  return {
    draft: serializeTicketDraft(draftRow as Record<string, unknown>),
    escalation: serializeEscalation(escalationRow as Record<string, unknown>),
  };
}

export async function saveChatSuggestion(input: { suggestionId: string; editedReply: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_chat_suggestions")
    .update({
      edited_reply: input.editedReply,
      status: "saved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.suggestionId)
    .select("*")
    .single();

  unwrapError(error, "Failed to save chat suggestion");
  await createFeedback({
    objectType: "chat_suggestion",
    objectId: input.suggestionId,
    action: "edited",
    editedText: input.editedReply,
  });
  return serializeChatSuggestion(data as Record<string, unknown>);
}

export async function approveChatSuggestion(input: { suggestionId: string; editedReply: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_chat_suggestions")
    .update({
      edited_reply: input.editedReply,
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.suggestionId)
    .select("*")
    .single();

  unwrapError(error, "Failed to approve chat suggestion");
  await createFeedback({
    objectType: "chat_suggestion",
    objectId: input.suggestionId,
    action: "accepted",
    editedText: input.editedReply,
  });
  return serializeChatSuggestion(data as Record<string, unknown>);
}

export async function rejectChatSuggestion(input: { suggestionId: string; note?: string | null }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_chat_suggestions")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.suggestionId)
    .select("*")
    .single();

  unwrapError(error, "Failed to reject chat suggestion");
  await createFeedback({
    objectType: "chat_suggestion",
    objectId: input.suggestionId,
    action: "rejected",
    feedbackNote: input.note ?? null,
  });
  return serializeChatSuggestion(data as Record<string, unknown>);
}

export async function sendChatReply(input: {
  suggestionId: string;
  sessionId: string;
  message: string;
}) {
  const supabase = getSupabaseAdmin();
  const agent = getDefaultAgent();
  const { data: sessionRow, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("status")
    .eq("id", input.sessionId)
    .maybeSingle();

  unwrapError(sessionError, "Failed to load chat session before sending");
  if (!sessionRow) {
    throw new Error("Chat session not found");
  }

  const chatStatus = String((sessionRow as Record<string, unknown>).status ?? "");
  if (chatStatus === "waiting") {
    await acceptChatAssignment({
      sessionId: input.sessionId,
      agentId: agent.id,
    });
  }

  await sendChatReplyViaBackendSocket({
    sessionId: input.sessionId,
    agentId: agent.id,
    message: input.message,
  });

  const { data: suggestionRow, error: suggestionError } = await supabase
    .from("ai_chat_suggestions")
    .update({
      edited_reply: input.message,
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.suggestionId)
    .select("*")
    .single();

  unwrapError(suggestionError, "Failed to update chat suggestion status");

  await createFeedback({
    objectType: "chat_suggestion",
    objectId: input.suggestionId,
    action: "sent",
    editedText: input.message,
  });

  return serializeChatSuggestion(suggestionRow as Record<string, unknown>);
}

export async function acceptChatCase(input: { sessionId: string }) {
  const agent = getDefaultAgent();
  return acceptChatAssignment({
    sessionId: input.sessionId,
    agentId: agent.id,
  });
}

export async function closeChatCase(input: { sessionId: string }) {
  return closeChatSessionViaBackend({
    sessionId: input.sessionId,
  });
}

export async function escalateChatCase(input: {
  suggestionId: string;
  sessionId: string;
  reason: string;
  targetTeam?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const agent = getDefaultAgent();

  const [
    { data: escalationRow, error: escalationError },
    { data: suggestionRow, error: suggestionError },
  ] = await Promise.all([
    supabase
      .from("escalations")
      .insert({
        session_id: input.sessionId,
        source_type: "chat",
        reason: input.reason,
        target_team: input.targetTeam ?? null,
        status: "open",
        created_by_agent_id: agent.id,
        created_by_agent_name: agent.name,
      })
      .select("*")
      .single(),
    supabase
      .from("ai_chat_suggestions")
      .update({
        status: "escalated",
        escalation_required: true,
        escalation_reason: input.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.suggestionId)
      .select("*")
      .single(),
  ]);

  unwrapError(escalationError, "Failed to create chat escalation");
  unwrapError(suggestionError, "Failed to update chat suggestion escalation state");

  await createFeedback({
    objectType: "chat_suggestion",
    objectId: input.suggestionId,
    action: "escalated",
    feedbackNote: input.reason,
  });

  return {
    suggestion: serializeChatSuggestion(suggestionRow as Record<string, unknown>),
    escalation: serializeEscalation(escalationRow as Record<string, unknown>),
  };
}
