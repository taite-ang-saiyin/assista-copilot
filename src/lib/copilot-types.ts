export type CitationSource = {
  id: string;
  title: string;
  type: string;
  excerpt: string;
  updatedAt: string;
};

export type AnalysisConfidenceBreakdown = {
  category: number;
  priority: number;
  sentiment: number;
  entity: number;
};

export type IntelligenceAnalysis = {
  category: string;
  priority: string;
  sentiment: string;
  confidence: number;
  confidenceBreakdown: AnalysisConfidenceBreakdown;
  entities: Record<string, string>;
  entityCount: number;
  hasOrderInfo: boolean;
  hasErrorInfo: boolean;
  hasAmountInfo: boolean;
  hasCustomerInfo: boolean;
  priorityEntitiesFound: boolean;
  timestamp?: string;
};

export type KnowledgeDocument = {
  docId: string;
  title: string;
  sourceType: string;
  fileName: string;
  version: number;
  indexingStatus: "pending" | "processing" | "indexed" | "failed";
  indexingError: string | null;
  chunkCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSearchResult = {
  chunkId: string;
  docId: string;
  title: string;
  section?: string | null;
  score: number;
  text: string;
  citation: string;
};

export type TicketDraftResult = {
  replyDraft: string;
  agentNotes: string;
  citations: string[];
  confidence: number;
  missingInfo: string[];
  suggestedStatus: string | null;
  resolutionLikely: boolean;
  escalationRequired: boolean;
  escalationReason: string | null;
};

export type ChatSuggestionResult = {
  suggestedReply: string;
  agentNotes: string;
  citations: string[];
  confidence: number;
  missingInfo: string[];
  suggestedStatus: string | null;
  resolutionLikely: boolean;
  escalationRequired: boolean;
  escalationReason: string | null;
};

export type TicketCopilotResult = {
  analysis: IntelligenceAnalysis;
  searchQuery: string;
  sources: Array<CitationSource & { relevance: number; citation: string }>;
  draftId: string;
  draftStatus: string;
  draft: TicketDraftResult;
};

export type ChatCopilotResult = {
  analysis: IntelligenceAnalysis;
  searchQuery: string;
  sources: Array<CitationSource & { relevance: number; citation: string }>;
  suggestionId: string;
  suggestionStatus: string;
  suggestion: ChatSuggestionResult;
};
