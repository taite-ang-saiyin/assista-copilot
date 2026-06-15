import type { CitationSource, IntelligenceAnalysis } from "./copilot-types";

export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type Sentiment = "Neutral" | "Confused" | "Frustrated" | "Angry";
export type TicketStatus = "New" | "Analyzed" | "Drafted" | "Waiting" | "Escalated" | "Resolved";

export type SupportMessage = {
  id: string;
  from: "customer" | "agent" | "system";
  senderName: string;
  at: string;
  text: string;
};

export type PersistedTicketDraft = {
  id: string;
  generatedReply: string;
  editedReply: string | null;
  agentNotes: string;
  citations: string[];
  missingInfo: string[];
  confidence: number;
  escalationRequired: boolean;
  escalationReason: string | null;
  sourceQuery: string | null;
  sourceSnapshot: Array<CitationSource & { relevance: number; citation: string }>;
  analysisSnapshot: IntelligenceAnalysis | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PersistedChatSuggestion = {
  id: string;
  generatedReply: string;
  editedReply: string | null;
  agentNotes: string;
  citations: string[];
  missingInfo: string[];
  confidence: number;
  escalationRequired: boolean;
  escalationReason: string | null;
  sourceQuery: string | null;
  sourceSnapshot: Array<CitationSource & { relevance: number; citation: string }>;
  analysisSnapshot: IntelligenceAnalysis | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type EscalationRecord = {
  id: string;
  sourceType: "ticket" | "chat";
  reason: string;
  targetTeam: string | null;
  status: string;
  createdAt: string;
};

export type TicketListItem = {
  id: string;
  trackingCode: string;
  customerName: string;
  category: string;
  priority: Priority;
  sentiment: Sentiment;
  status: TicketStatus;
  subject: string;
  description: string;
  createdAt: string;
  confidence: number;
  flags: string[];
  assignedAgentId: string | null;
  latestDraftId: string | null;
};

export type TicketDetailData = {
  ticket: TicketListItem & {
    acceptedAt: string | null;
    updatedAt: string;
    resolvedAt: string | null;
    closedAt: string | null;
  };
  replies: SupportMessage[];
  latestDraft: PersistedTicketDraft | null;
  escalations: EscalationRecord[];
};

export type ChatListItem = {
  id: string;
  customerName: string;
  category: string;
  briefDescription: string;
  priority: Priority;
  sentiment: Sentiment;
  status: "active" | "waiting" | "ended";
  createdAt: string;
  confidence: number;
  flags: string[];
  assignedAgentId: string | null;
  unread: number;
  messagesCount: number;
  latestSuggestionId: string | null;
};

export type ChatDetailData = {
  session: ChatListItem & {
    acceptedAt: string | null;
    updatedAt: string | null;
    closedAt: string | null;
  };
  messages: SupportMessage[];
  latestSuggestion: PersistedChatSuggestion | null;
  escalations: EscalationRecord[];
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: "AI" | "Agent" | "System";
  action: string;
  target: string;
  detail: string;
  risk: "low" | "medium" | "high";
};

export type SupportOverview = {
  openTickets: number;
  aiDraftedCount: number;
  escalationsCount: number;
  avgResolutionMinutes: number | null;
  tickets: TicketListItem[];
  chats: ChatListItem[];
  events: AuditEvent[];
};
