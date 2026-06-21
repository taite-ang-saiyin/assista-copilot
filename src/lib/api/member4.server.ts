import { getServerConfig } from "../config.server";

type JsonRecord = Record<string, unknown>;

type MetricSummaryItem = {
  name: string;
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
};

type ModuleEvaluationCard = {
  module: string;
  runCount: number;
  metrics: MetricSummaryItem[];
  headlineMetric: MetricSummaryItem | null;
};

type BenchmarkCard = {
  module: string;
  label: string;
  metricName: string;
  metricValue: number | null;
  memberName: string | null;
  runName: string | null;
  versionLabel: string | null;
  datasetName: string | null;
};

type BenchmarkRunMetric = {
  name: string;
  value: number | null;
  unit: string | null;
};

export type BenchmarkRun = {
  id: string;
  memberName: string | null;
  module: string;
  runName: string;
  modelName: string | null;
  modelVersion: string | null;
  promptVersion: string | null;
  retrievalVersion: string | null;
  datasetName: string | null;
  datasetVersion: string | null;
  datasetSize: number | null;
  mlflowRunId: string | null;
  notes: string | null;
  createdAt: string | null;
  metrics: BenchmarkRunMetric[];
};

type ComparisonRow = {
  id: string;
  runName: string;
  module: string;
  modelName: string | null;
  promptVersion: string | null;
  datasetName: string | null;
  createdAt: string | null;
  metrics: Record<string, number | null>;
};

type InteractionRow = {
  id: string;
  ticketId: string | null;
  conversationId: string | null;
  mode: string;
  module: string;
  category: string | null;
  intent: string | null;
  priority: string | null;
  confidence: number | null;
  latencyMs: number | null;
  escalationRequired: boolean;
  createdAt: string | null;
};

type FeedbackRow = {
  id: string;
  interactionId: string | null;
  ticketId: string | null;
  conversationId: string | null;
  action: string;
  rating: number | null;
  failureReason: string | null;
  originalReply: string | null;
  editedReply: string | null;
  feedbackNotes: string | null;
  createdAt: string | null;
};

type TrendPoint = {
  date: string;
  count: number;
};

type FeedbackTrendPoint = {
  date: string;
  accepted: number;
  edited: number;
  rejected: number;
  ignored: number;
  regenerated: number;
  averageRating: number | null;
};

type CategoryPerformanceRow = {
  label: string;
  count: number;
  averageConfidence: number | null;
  acceptanceRate: number | null;
  editRate: number | null;
  rejectionRate: number | null;
  escalationRate: number | null;
  averageRating: number | null;
};

type IntentPerformanceRow = {
  label: string;
  count: number;
  acceptanceRate: number | null;
  averageConfidence: number | null;
  mostCommonFailure: string | null;
};

type ConfidenceBucket = {
  label: string;
  count: number;
  averageConfidence: number | null;
};

type FailureReasonRow = {
  label: string;
  count: number;
  rate: number | null;
};

type LowConfidenceRow = {
  id: string;
  mode: string;
  category: string | null;
  intent: string | null;
  priority: string | null;
  confidence: number | null;
  action: string | null;
  createdAt: string | null;
};

export type ErrorCase = {
  id: string;
  sourceType: string;
  module: string;
  errorType: string;
  severity: string;
  description: string;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  resolved: boolean;
  createdAt: string | null;
  ticketId: string | null;
  interactionId: string | null;
};

export type DatasetExample = {
  id: string;
  taskType: string;
  qualityScore: number | null;
  approved: boolean | null;
  approvalStatus: string;
  sourceFeedbackId: string | null;
  sourceInteractionId: string | null;
  category: string | null;
  intent: string | null;
  createdAt: string | null;
  inputJson: JsonRecord | null;
  targetJson: JsonRecord | null;
};

type AssignmentRow = {
  id: string;
  experimentName: string;
  module: string;
  variant: string;
  subjectId: string;
};

export type AnalyticsDashboardFilters = {
  action?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  intent?: string;
  lowConfidenceThreshold?: number;
  mode?: string;
  modelVersion?: string;
  module?: string;
  priority?: string;
  promptVersion?: string;
  retrievalVersion?: string;
};

export type AnalyticsDashboardData = {
  selectedModule: string;
  warnings: string[];
  filters: Required<AnalyticsDashboardFilters>;
  overview: {
    totalRuns: number;
    totalInteractions: number;
    totalFeedback: number;
    averageRating: number | null;
    openErrors: number;
    approvedExamples: number;
    totalExamples: number;
    benchmarkCards: BenchmarkCard[];
    liveCards: {
      acceptanceRate: number | null;
      editRate: number | null;
      rejectionRate: number | null;
      averageConfidence: number | null;
      escalationRate: number | null;
      averageLatency: number | null;
      lowConfidenceCount: number | null;
      criticalUnresolvedErrors: number | null;
    };
    insights: Array<{
      label: string;
      value: string;
      detail: string;
      tone: "default" | "warning" | "success" | "ai";
    }>;
  };
  moduleCards: ModuleEvaluationCard[];
  benchmark: {
    cards: BenchmarkCard[];
    runs: BenchmarkRun[];
    comparisons: ComparisonRow[];
    comparisonMetricNames: string[];
  };
  liveMonitoring: {
    summary: {
      totalAiInteractions: number;
      acceptanceRate: number | null;
      editRate: number | null;
      rejectionRate: number | null;
      ignoreRate: number | null;
      regenerationRate: number | null;
      escalationRate: number | null;
      averageConfidence: number | null;
      averageRating: number | null;
      averageLatency: number | null;
      lowConfidenceCount: number | null;
      criticalUnresolvedErrors: number | null;
      liveChatSuggestionAcceptanceRate: number | null;
      liveChatIgnoreRate: number | null;
      liveChatAverageLatency: number | null;
      liveChatEscalationRate: number | null;
      liveChatRepeatedQuestionCount: number | null;
    };
    interactionTrend: TrendPoint[];
    feedbackTrend: FeedbackTrendPoint[];
    performanceByCategory: CategoryPerformanceRow[];
    performanceByIntent: IntentPerformanceRow[];
    confidenceDistribution: ConfidenceBucket[];
    failureReasons: FailureReasonRow[];
    lowConfidenceQueue: LowConfidenceRow[];
    feedbackSummary: {
      total: number;
      averageRating: number | null;
      actionCounts: Record<string, number>;
      actionRates: Record<string, number>;
    };
  };
  errors: {
    total: number;
    critical: number;
    highSeverity: number;
    resolved: number;
    unresolved: number;
    mostCommonType: string | null;
    mostAffectedModule: string | null;
    bySeverity: Array<{ label: string; count: number }>;
    byType: Array<{ label: string; count: number }>;
    byModule: Array<{ label: string; count: number }>;
    recent: ErrorCase[];
  };
  dataset: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    averageQuality: number | null;
    examples: DatasetExample[];
  };
  experiments: {
    totalAssignments: number;
    experimentCount: number;
    variants: Array<{ label: string; count: number }>;
    recent: AssignmentRow[];
  };
};

const MODULES = ["classifier", "retrieval", "generation", "live_chat", "full_pipeline"] as const;
const OVERVIEW_BENCHMARK_MODULES = ["classifier", "retrieval", "generation", "full_pipeline"];

const DEFAULT_FILTERS: Required<AnalyticsDashboardFilters> = {
  action: "all",
  category: "",
  dateFrom: "",
  dateTo: "",
  intent: "",
  lowConfidenceThreshold: 0.6,
  mode: "all",
  modelVersion: "",
  module: "generation",
  priority: "all",
  promptVersion: "",
  retrievalVersion: "",
};

const DEFAULT_METRICS: Record<string, string[]> = {
  classifier: ["intent_accuracy", "category_accuracy", "priority_f1", "sentiment_accuracy"],
  retrieval: ["retrieval_hit_rate", "citation_coverage", "context_precision", "mrr"],
  generation: [
    "faithfulness_rate",
    "json_validity_rate",
    "reply_quality_avg",
    "escalation_accuracy",
  ],
  live_chat: [
    "suggestion_acceptance_rate",
    "avg_response_time_reduction",
    "thumbs_up_rate",
    "avg_suggestion_latency_ms",
  ],
  full_pipeline: ["escalation_accuracy", "resolution_accuracy", "faithfulness_rate"],
};

const BENCHMARK_CARD_META: Record<
  string,
  {
    label: string;
    metrics: string[];
  }
> = {
  classifier: {
    label: "Latest Classifier Accuracy",
    metrics: ["intent_accuracy", "category_accuracy", "priority_f1", "sentiment_accuracy"],
  },
  retrieval: {
    label: "Latest Retrieval Hit Rate",
    metrics: ["retrieval_hit_rate", "citation_coverage", "context_precision", "mrr"],
  },
  generation: {
    label: "Latest LLM Faithfulness",
    metrics: ["faithfulness_rate", "reply_quality_avg", "json_validity_rate"],
  },
  full_pipeline: {
    label: "Latest Escalation Accuracy",
    metrics: ["escalation_accuracy", "resolution_accuracy", "faithfulness_rate"],
  },
  live_chat: {
    label: "Latest Live Chat Acceptance",
    metrics: ["suggestion_acceptance_rate", "thumbs_up_rate"],
  },
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  const text = asString(value)?.toLowerCase();
  if (text === "true" || text === "yes" || text === "resolved") return true;
  if (text === "false" || text === "no" || text === "open") return false;
  return null;
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function requireConfigValue(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildUrl(baseUrl: string, path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${trimTrailingSlash(baseUrl)}${path}${query ? `?${query}` : ""}`;
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

function member4BaseUrl() {
  const config = getServerConfig();
  return requireConfigValue(config.member4ApiBaseUrl, "MEMBER4_API_BASE_URL");
}

async function fetchMember4(path: string, params?: URLSearchParams) {
  return fetchJson<unknown>(buildUrl(member4BaseUrl(), path, params), {
    headers: {
      Accept: "application/json",
    },
  });
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function prettifyMetricName(value: string) {
  const name = titleCase(value);
  return name.endsWith("Ms") ? name.replace(/Ms$/, "ms") : name;
}

function metricNamesForModule(module: string) {
  return DEFAULT_METRICS[module] ?? [];
}

function toCountMap(value: unknown) {
  const record = asRecord(value);
  return Object.entries(record)
    .map(([label, count]) => ({
      label,
      count: asNumber(count) ?? 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function normalizeMetricSummary(input: unknown) {
  const record = asRecord(input);
  return Object.entries(record)
    .map(([name, stats]) => {
      const statRecord = asRecord(stats);
      return {
        name,
        count: asNumber(statRecord.count) ?? 0,
        avg: asNumber(statRecord.avg),
        min: asNumber(statRecord.min),
        max: asNumber(statRecord.max),
      } satisfies MetricSummaryItem;
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function normalizeEvaluationCard(module: string, input: unknown): ModuleEvaluationCard {
  const record = asRecord(input);
  const metrics = normalizeMetricSummary(record.metric_summary);
  const headlineMetric = metrics[0] ?? null;

  return {
    module,
    runCount: asNumber(record.run_count) ?? 0,
    metrics,
    headlineMetric,
  };
}

function extractMetrics(row: JsonRecord) {
  const metricsRecord = asRecord(row.metrics);
  if (Object.keys(metricsRecord).length > 0) {
    return Object.fromEntries(
      Object.entries(metricsRecord).map(([key, value]) => [key, asNumber(value)]),
    );
  }

  const metricItems = asArray(row.metric_values ?? row.metric_summary ?? row.metrics_list);
  if (metricItems.length > 0) {
    return Object.fromEntries(
      metricItems.flatMap((entry) => {
        const metric = asRecord(entry);
        const name = asString(metric.metric_name ?? metric.name);
        if (!name) return [];
        return [[name, asNumber(metric.metric_value ?? metric.value)]];
      }),
    );
  }

  return {};
}

function normalizeComparisons(input: unknown, metricNames: string[]) {
  const record = asRecord(input);
  return asArray(record.comparisons ?? record.rows ?? record.items ?? record.runs ?? input)
    .map(asRecord)
    .map((row, index) => {
      const metrics = extractMetrics(row);
      const filteredMetricNames =
        metricNames.length > 0 ? metricNames : Object.keys(metrics).slice(0, 3);

      return {
        id:
          asString(row.id ?? row.run_id ?? row.mlflow_run_id ?? row.run_name) ??
          `comparison-${index}`,
        runName: asString(row.run_name ?? row.name) ?? `Run ${index + 1}`,
        module: asString(row.module) ?? "unknown",
        modelName: asString(row.model_name),
        promptVersion: asString(row.prompt_version),
        datasetName: asString(row.dataset_name),
        createdAt: asString(row.created_at),
        metrics: Object.fromEntries(
          filteredMetricNames.map((name) => [name, metrics[name] ?? null]),
        ),
      } satisfies ComparisonRow;
    })
    .slice(0, 8);
}

function normalizeBenchmarkRunMetrics(row: JsonRecord) {
  const metricMap = extractMetrics(row);
  const inlineMetrics = Object.entries(metricMap).map(([name, value]) => ({
    name,
    value,
    unit: null,
  }));

  const listedMetrics = asArray(row.metrics).map((entry) => {
    const metric = asRecord(entry);
    return {
      name: asString(metric.metric_name ?? metric.name) ?? "unknown_metric",
      value: asNumber(metric.metric_value ?? metric.value),
      unit: asString(metric.metric_unit ?? metric.unit),
    } satisfies BenchmarkRunMetric;
  });

  const deduped = new Map<string, BenchmarkRunMetric>();
  for (const metric of [...listedMetrics, ...inlineMetrics]) {
    deduped.set(metric.name, metric);
  }

  return Array.from(deduped.values());
}

function normalizeEvaluationRuns(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.runs ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => ({
      id: asString(row.run_id ?? row.id) ?? `run-${index}`,
      memberName: asString(row.member_name),
      module: asString(row.module) ?? "unknown",
      runName: asString(row.run_name) ?? `Run ${index + 1}`,
      modelName: asString(row.model_name),
      modelVersion: asString(row.model_version),
      promptVersion: asString(row.prompt_version),
      retrievalVersion: asString(row.retrieval_version),
      datasetName: asString(row.dataset_name),
      datasetVersion: asString(row.dataset_version),
      datasetSize: asNumber(row.dataset_size),
      mlflowRunId: asString(row.mlflow_run_id),
      notes: asString(row.notes),
      createdAt: asString(row.created_at),
      metrics: normalizeBenchmarkRunMetrics(row),
    }))
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

function normalizeInteractionRows(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.interactions ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => ({
      id: asString(row.interaction_id ?? row.id) ?? `interaction-${index}`,
      ticketId: asString(row.ticket_id),
      conversationId: asString(row.conversation_id),
      mode: asString(row.mode) ?? "unknown",
      module: asString(row.module) ?? "unknown",
      category: asString(row.category),
      intent: asString(row.intent),
      priority: asString(row.priority),
      confidence: asNumber(row.confidence),
      latencyMs: asNumber(row.latency_ms),
      escalationRequired: asBoolean(row.escalation_required) ?? false,
      createdAt: asString(row.created_at),
    }))
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

function normalizeFeedbackRows(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.feedback ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => ({
      id: asString(row.feedback_id ?? row.id) ?? `feedback-${index}`,
      interactionId: asString(row.interaction_id),
      ticketId: asString(row.ticket_id),
      conversationId: asString(row.conversation_id),
      action: asString(row.action) ?? "unknown",
      rating: asNumber(row.rating),
      failureReason: asString(row.failure_reason),
      originalReply: asString(row.original_reply),
      editedReply: asString(row.edited_reply),
      feedbackNotes: asString(row.feedback_notes),
      createdAt: asString(row.created_at),
    }))
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

function normalizeLiveSummary(input: unknown) {
  const record = asRecord(input);
  const liveChatMetrics = asRecord(record.live_chat_metrics);

  return {
    totalAiInteractions: asNumber(record.total_ai_interactions) ?? 0,
    acceptanceRate: asNumber(record.acceptance_rate),
    editRate: asNumber(record.edit_rate),
    rejectionRate: asNumber(record.rejection_rate),
    ignoreRate: asNumber(record.ignore_rate),
    regenerationRate: asNumber(record.regeneration_rate),
    escalationRate: asNumber(record.escalation_rate),
    averageConfidence: asNumber(record.average_confidence),
    averageRating: asNumber(record.average_rating),
    averageLatency: asNumber(record.average_latency),
    lowConfidenceCount: asNumber(record.low_confidence_count),
    criticalUnresolvedErrors: asNumber(record.critical_unresolved_errors),
    liveChatSuggestionAcceptanceRate: asNumber(
      liveChatMetrics.live_chat_suggestion_acceptance_rate,
    ),
    liveChatIgnoreRate: asNumber(liveChatMetrics.live_chat_ignore_rate),
    liveChatAverageLatency: asNumber(liveChatMetrics.live_chat_average_latency),
    liveChatEscalationRate: asNumber(liveChatMetrics.live_chat_escalation_rate),
    liveChatRepeatedQuestionCount: asNumber(liveChatMetrics.live_chat_repeated_question_count),
  };
}

function normalizeErrorCases(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.errors ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => ({
      id: asString(row.error_id ?? row.id) ?? `error-${index}`,
      sourceType: asString(row.source_type) ?? "unknown",
      module: asString(row.module) ?? "unknown",
      errorType: asString(row.error_type) ?? "unknown",
      severity: asString(row.severity) ?? "unknown",
      description: asString(row.description) ?? "No description provided.",
      expectedBehavior: asString(row.expected_behavior),
      actualBehavior: asString(row.actual_behavior),
      resolved: asBoolean(row.resolved ?? row.is_resolved ?? row.status) ?? false,
      createdAt: asString(row.created_at),
      ticketId: asString(row.ticket_id),
      interactionId: asString(row.interaction_id),
    }))
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

function normalizeFineTuningExamples(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.examples ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => {
      const inputJson = asRecord(row.input_json);
      const targetJson = asRecord(row.target_json);
      const approved = asBoolean(row.approved);

      return {
        id: asString(row.example_id ?? row.id) ?? `example-${index}`,
        taskType: asString(row.task_type) ?? "unknown",
        qualityScore: asNumber(row.quality_score),
        approved,
        approvalStatus:
          asString(row.approval_status) ??
          (approved === true ? "approved" : approved === false ? "rejected" : "pending"),
        sourceFeedbackId: asString(row.source_feedback_id),
        sourceInteractionId: asString(row.source_interaction_id),
        category: asString(inputJson.category),
        intent: asString(inputJson.intent),
        createdAt: asString(row.created_at),
        inputJson: Object.keys(inputJson).length > 0 ? inputJson : null,
        targetJson: Object.keys(targetJson).length > 0 ? targetJson : null,
      } satisfies DatasetExample;
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
}

function normalizeAssignments(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.assignments ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => ({
      id: asString(row.assignment_id ?? row.id) ?? `assignment-${index}`,
      experimentName: asString(row.experiment_name) ?? "Unnamed experiment",
      module: asString(row.module ?? row.entity_type) ?? "unknown",
      variant: asString(row.variant ?? row.variant_name) ?? "unknown",
      subjectId: asString(row.subject_id ?? row.entity_id) ?? "unknown",
    }))
    .sort((a, b) => a.experimentName.localeCompare(b.experimentName))
    .slice(0, 8);
}

function normalizeFilters(filters: AnalyticsDashboardFilters | undefined) {
  return {
    ...DEFAULT_FILTERS,
    ...filters,
    action: filters?.action || DEFAULT_FILTERS.action,
    category: filters?.category?.trim() ?? DEFAULT_FILTERS.category,
    dateFrom: filters?.dateFrom ?? DEFAULT_FILTERS.dateFrom,
    dateTo: filters?.dateTo ?? DEFAULT_FILTERS.dateTo,
    intent: filters?.intent?.trim() ?? DEFAULT_FILTERS.intent,
    lowConfidenceThreshold:
      filters?.lowConfidenceThreshold ?? DEFAULT_FILTERS.lowConfidenceThreshold,
    mode: filters?.mode || DEFAULT_FILTERS.mode,
    modelVersion: filters?.modelVersion?.trim() ?? DEFAULT_FILTERS.modelVersion,
    module: filters?.module || DEFAULT_FILTERS.module,
    priority: filters?.priority || DEFAULT_FILTERS.priority,
    promptVersion: filters?.promptVersion?.trim() ?? DEFAULT_FILTERS.promptVersion,
    retrievalVersion: filters?.retrievalVersion?.trim() ?? DEFAULT_FILTERS.retrievalVersion,
  };
}

function setIfPresent(params: URLSearchParams, key: string, value: string) {
  if (value && value !== "all") {
    params.set(key, value);
  }
}

function buildInteractionParams(filters: Required<AnalyticsDashboardFilters>) {
  const params = new URLSearchParams();
  setIfPresent(params, "mode", filters.mode);
  setIfPresent(params, "module", filters.module);
  setIfPresent(params, "category", filters.category);
  setIfPresent(params, "intent", filters.intent);
  setIfPresent(params, "priority", filters.priority);
  setIfPresent(params, "model_version", filters.modelVersion);
  setIfPresent(params, "prompt_version", filters.promptVersion);
  setIfPresent(params, "retrieval_version", filters.retrievalVersion);
  setIfPresent(params, "date_from", filters.dateFrom);
  setIfPresent(params, "date_to", filters.dateTo);
  return params;
}

function buildFeedbackParams(filters: Required<AnalyticsDashboardFilters>) {
  const params = new URLSearchParams();
  setIfPresent(params, "action", filters.action);
  setIfPresent(params, "date_from", filters.dateFrom);
  setIfPresent(params, "date_to", filters.dateTo);
  return params;
}

function buildErrorParams(filters: Required<AnalyticsDashboardFilters>) {
  const params = new URLSearchParams();
  setIfPresent(params, "module", filters.module);
  setIfPresent(params, "date_from", filters.dateFrom);
  setIfPresent(params, "date_to", filters.dateTo);
  return params;
}

function buildComparisonParams(module: string) {
  const metricNames = metricNamesForModule(module);
  const params = new URLSearchParams();
  params.set("module", module);
  for (const metricName of metricNames) {
    params.append("metric_names", metricName);
  }
  return { params, metricNames };
}

function evaluationParams(module: string) {
  const params = new URLSearchParams();
  params.set("module", module);
  return params;
}

function normalizeDateKey(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().slice(0, 10);
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => value != null);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function buildInteractionLookup(interactions: InteractionRow[]) {
  const byId = new Map<string, InteractionRow>();
  const byTicketId = new Map<string, InteractionRow>();
  const byConversationId = new Map<string, InteractionRow>();

  for (const interaction of interactions) {
    byId.set(interaction.id, interaction);
    if (interaction.ticketId) byTicketId.set(interaction.ticketId, interaction);
    if (interaction.conversationId) byConversationId.set(interaction.conversationId, interaction);
  }

  return { byId, byTicketId, byConversationId };
}

function filterFeedbackRows(
  feedbackRows: FeedbackRow[],
  interactions: InteractionRow[],
  filters: Required<AnalyticsDashboardFilters>,
) {
  const lookup = buildInteractionLookup(interactions);
  const usesInteractionFilters = Boolean(
    filters.mode !== "all" ||
    filters.module ||
    filters.category ||
    filters.intent ||
    filters.priority !== "all" ||
    filters.modelVersion ||
    filters.promptVersion ||
    filters.retrievalVersion,
  );

  return feedbackRows.filter((feedback) => {
    const actionMatches =
      filters.action === "all" || feedback.action.toLowerCase() === filters.action.toLowerCase();
    if (!actionMatches) return false;

    if (!usesInteractionFilters) return true;

    const interaction =
      (feedback.interactionId ? lookup.byId.get(feedback.interactionId) : undefined) ??
      (feedback.ticketId ? lookup.byTicketId.get(feedback.ticketId) : undefined) ??
      (feedback.conversationId ? lookup.byConversationId.get(feedback.conversationId) : undefined);

    return Boolean(interaction);
  });
}

function summarizeFeedback(feedbackRows: FeedbackRow[], totalInteractions: number) {
  const actionCounts = feedbackRows.reduce<Record<string, number>>((acc, row) => {
    const action = row.action.toLowerCase();
    acc[action] = (acc[action] ?? 0) + 1;
    return acc;
  }, {});

  const actionRates = Object.fromEntries(
    Object.entries(actionCounts).map(([action, count]) => [
      action,
      totalInteractions > 0 ? count / totalInteractions : 0,
    ]),
  );

  return {
    total: feedbackRows.length,
    averageRating: average(feedbackRows.map((row) => row.rating)),
    actionCounts,
    actionRates,
  };
}

function buildInteractionTrend(interactions: InteractionRow[]) {
  const counts = new Map<string, number>();
  for (const interaction of interactions) {
    const key = normalizeDateKey(interaction.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function buildFeedbackTrend(feedbackRows: FeedbackRow[]) {
  const grouped = new Map<
    string,
    {
      accepted: number;
      edited: number;
      rejected: number;
      ignored: number;
      regenerated: number;
      ratings: number[];
    }
  >();

  for (const row of feedbackRows) {
    const key = normalizeDateKey(row.createdAt);
    const current = grouped.get(key) ?? {
      accepted: 0,
      edited: 0,
      rejected: 0,
      ignored: 0,
      regenerated: 0,
      ratings: [],
    };

    const action = row.action.toLowerCase();
    if (action === "accepted" || action === "accept") current.accepted += 1;
    else if (action === "edited" || action === "edit") current.edited += 1;
    else if (action === "rejected" || action === "reject") current.rejected += 1;
    else if (action === "ignored" || action === "ignore") current.ignored += 1;
    else if (action === "regenerated" || action === "regenerate") current.regenerated += 1;

    if (row.rating != null) current.ratings.push(row.rating);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      accepted: values.accepted,
      edited: values.edited,
      rejected: values.rejected,
      ignored: values.ignored,
      regenerated: values.regenerated,
      averageRating: average(values.ratings),
    }));
}

function latestFeedbackByInteraction(feedbackRows: FeedbackRow[]) {
  const map = new Map<string, FeedbackRow>();
  for (const row of feedbackRows) {
    if (!row.interactionId) continue;
    if (!map.has(row.interactionId)) {
      map.set(row.interactionId, row);
    }
  }
  return map;
}

function buildPerformanceByCategory(interactions: InteractionRow[], feedbackRows: FeedbackRow[]) {
  const feedbackByInteraction = latestFeedbackByInteraction(feedbackRows);
  const grouped = new Map<
    string,
    {
      count: number;
      confidences: number[];
      escalations: number;
      ratings: number[];
      actions: Record<string, number>;
    }
  >();

  for (const interaction of interactions) {
    const key = interaction.category || "Uncategorized";
    const current = grouped.get(key) ?? {
      count: 0,
      confidences: [],
      escalations: 0,
      ratings: [],
      actions: {},
    };
    current.count += 1;
    if (interaction.confidence != null) current.confidences.push(interaction.confidence);
    if (interaction.escalationRequired) current.escalations += 1;

    const feedback = feedbackByInteraction.get(interaction.id);
    if (feedback?.rating != null) current.ratings.push(feedback.rating);
    if (feedback) {
      const action = feedback.action.toLowerCase();
      current.actions[action] = (current.actions[action] ?? 0) + 1;
    }
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([label, entry]) => ({
      label,
      count: entry.count,
      averageConfidence: average(entry.confidences),
      acceptanceRate: entry.count > 0 ? (entry.actions.accepted ?? 0) / entry.count : null,
      editRate: entry.count > 0 ? (entry.actions.edited ?? 0) / entry.count : null,
      rejectionRate: entry.count > 0 ? (entry.actions.rejected ?? 0) / entry.count : null,
      escalationRate: entry.count > 0 ? entry.escalations / entry.count : null,
      averageRating: average(entry.ratings),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildPerformanceByIntent(interactions: InteractionRow[], feedbackRows: FeedbackRow[]) {
  const feedbackByInteraction = latestFeedbackByInteraction(feedbackRows);
  const grouped = new Map<
    string,
    {
      count: number;
      acceptCount: number;
      confidences: number[];
      failureReasons: Record<string, number>;
    }
  >();

  for (const interaction of interactions) {
    const key = interaction.intent || "Unknown intent";
    const current = grouped.get(key) ?? {
      count: 0,
      acceptCount: 0,
      confidences: [],
      failureReasons: {},
    };

    current.count += 1;
    if (interaction.confidence != null) current.confidences.push(interaction.confidence);

    const feedback = feedbackByInteraction.get(interaction.id);
    if (feedback?.action.toLowerCase() === "accepted") current.acceptCount += 1;
    if (feedback?.failureReason) {
      current.failureReasons[feedback.failureReason] =
        (current.failureReasons[feedback.failureReason] ?? 0) + 1;
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([label, entry]) => ({
      label,
      count: entry.count,
      acceptanceRate: entry.count > 0 ? entry.acceptCount / entry.count : null,
      averageConfidence: average(entry.confidences),
      mostCommonFailure:
        Object.entries(entry.failureReasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildConfidenceDistribution(interactions: InteractionRow[]) {
  const buckets = new Map<
    string,
    {
      count: number;
      confidences: number[];
    }
  >([
    ["Low (<0.60)", { count: 0, confidences: [] }],
    ["Medium (0.60-0.80)", { count: 0, confidences: [] }],
    ["High (>0.80)", { count: 0, confidences: [] }],
  ]);

  for (const interaction of interactions) {
    if (interaction.confidence == null) continue;
    const label =
      interaction.confidence < 0.6
        ? "Low (<0.60)"
        : interaction.confidence <= 0.8
          ? "Medium (0.60-0.80)"
          : "High (>0.80)";
    const bucket = buckets.get(label);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.confidences.push(interaction.confidence);
  }

  return Array.from(buckets.entries()).map(([label, entry]) => ({
    label,
    count: entry.count,
    averageConfidence: average(entry.confidences),
  }));
}

function buildFailureReasons(feedbackRows: FeedbackRow[]) {
  const counts = feedbackRows.reduce<Record<string, number>>((acc, row) => {
    if (!row.failureReason) return acc;
    acc[row.failureReason] = (acc[row.failureReason] ?? 0) + 1;
    return acc;
  }, {});

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      rate: total > 0 ? count / total : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildLowConfidenceQueue(interactions: InteractionRow[], feedbackRows: FeedbackRow[]) {
  const feedbackByInteraction = latestFeedbackByInteraction(feedbackRows);
  return interactions
    .slice()
    .sort((a, b) => (a.confidence ?? 99) - (b.confidence ?? 99))
    .slice(0, 8)
    .map((interaction) => ({
      id: interaction.id,
      mode: interaction.mode,
      category: interaction.category,
      intent: interaction.intent,
      priority: interaction.priority,
      confidence: interaction.confidence,
      action: feedbackByInteraction.get(interaction.id)?.action ?? null,
      createdAt: interaction.createdAt,
    }));
}

function summarizeErrors(errors: ErrorCase[]) {
  const bySeverity = new Map<string, number>();
  const byType = new Map<string, number>();
  const byModule = new Map<string, number>();
  let critical = 0;
  let highSeverity = 0;
  let resolved = 0;
  let unresolved = 0;

  for (const error of errors) {
    bySeverity.set(error.severity, (bySeverity.get(error.severity) ?? 0) + 1);
    byType.set(error.errorType, (byType.get(error.errorType) ?? 0) + 1);
    byModule.set(error.module, (byModule.get(error.module) ?? 0) + 1);

    const severity = error.severity.toLowerCase();
    if (severity === "critical") critical += 1;
    if (severity === "critical" || severity === "high") highSeverity += 1;
    if (error.resolved) resolved += 1;
    else unresolved += 1;
  }

  const toSortedArray = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  const byTypeArray = toSortedArray(byType);
  const byModuleArray = toSortedArray(byModule);

  return {
    total: errors.length,
    critical,
    highSeverity,
    resolved,
    unresolved,
    mostCommonType: byTypeArray[0]?.label ?? null,
    mostAffectedModule: byModuleArray[0]?.label ?? null,
    bySeverity: toSortedArray(bySeverity),
    byType: byTypeArray,
    byModule: byModuleArray,
    recent: errors.slice(0, 10),
  };
}

function summarizeDataset(examples: DatasetExample[]) {
  const approved = examples.filter(
    (example) => example.approvalStatus.toLowerCase() === "approved",
  ).length;
  const rejected = examples.filter(
    (example) => example.approvalStatus.toLowerCase() === "rejected",
  ).length;
  const pending = Math.max(examples.length - approved - rejected, 0);

  return {
    total: examples.length,
    approved,
    rejected,
    pending,
    averageQuality: average(examples.map((example) => example.qualityScore)),
    examples: examples.slice(0, 50),
  };
}

function deriveBenchmarkCards(runs: BenchmarkRun[]) {
  const cards: BenchmarkCard[] = [];

  for (const module of OVERVIEW_BENCHMARK_MODULES) {
    const meta = BENCHMARK_CARD_META[module];
    const run = runs.find((entry) => entry.module === module);
    if (!meta) continue;

    const metric =
      run?.metrics.find((item) => meta.metrics.includes(item.name)) ?? run?.metrics[0] ?? null;

    cards.push({
      module,
      label: meta.label,
      metricName: metric?.name ?? meta.metrics[0] ?? "metric",
      metricValue: metric?.value ?? null,
      memberName: run?.memberName ?? null,
      runName: run?.runName ?? null,
      versionLabel:
        run?.modelVersion ?? run?.promptVersion ?? run?.retrievalVersion ?? run?.modelName ?? null,
      datasetName: run?.datasetName ?? null,
    });
  }

  return cards;
}

function normalizeBenchmarkSummary(input: unknown, runs: BenchmarkRun[]) {
  const record = asRecord(input);
  const rows = asArray(record.cards ?? record.benchmark_cards ?? record.latest_by_module);
  if (rows.length === 0) return deriveBenchmarkCards(runs);

  const normalized = rows.map(asRecord).map((row, index) => {
    const module = asString(row.module) ?? OVERVIEW_BENCHMARK_MODULES[index] ?? "unknown";
    const meta = BENCHMARK_CARD_META[module] ?? {
      label: `${titleCase(module)} benchmark`,
      metrics: [asString(row.metric_name) ?? "metric"],
    };

    return {
      module,
      label: asString(row.label) ?? meta.label,
      metricName: asString(row.metric_name) ?? meta.metrics[0] ?? "metric",
      metricValue: asNumber(row.metric_value ?? row.value),
      memberName: asString(row.member_name),
      runName: asString(row.run_name),
      versionLabel:
        asString(
          row.model_version ??
            row.prompt_version ??
            row.retrieval_version ??
            row.model_name ??
            row.version,
        ) ?? null,
      datasetName: asString(row.dataset_name),
    } satisfies BenchmarkCard;
  });

  return normalized.length > 0 ? normalized : deriveBenchmarkCards(runs);
}

function buildOverviewInsights(
  categoryPerformance: CategoryPerformanceRow[],
  failureReasons: FailureReasonRow[],
  lowConfidenceQueue: LowConfidenceRow[],
) {
  const bestCategory = categoryPerformance
    .filter((entry) => entry.acceptanceRate != null)
    .sort((a, b) => (b.acceptanceRate ?? 0) - (a.acceptanceRate ?? 0))[0];
  const weakestCategory = categoryPerformance
    .filter((entry) => entry.acceptanceRate != null)
    .sort((a, b) => (a.acceptanceRate ?? 0) - (b.acceptanceRate ?? 0))[0];
  const topFailure = failureReasons[0];
  const lowestConfidence = lowConfidenceQueue[0];

  return [
    {
      label: "Best Performing Category",
      value: bestCategory?.label ?? "Not enough data",
      detail:
        bestCategory?.acceptanceRate != null
          ? `${Math.round(bestCategory.acceptanceRate * 100)}% acceptance rate`
          : "Waiting for accepted interaction data.",
      tone: "success" as const,
    },
    {
      label: "Weakest Category",
      value: weakestCategory?.label ?? "Not enough data",
      detail:
        weakestCategory?.acceptanceRate != null
          ? `${Math.round(weakestCategory.acceptanceRate * 100)}% acceptance rate`
          : "Waiting for category-level monitoring data.",
      tone: "warning" as const,
    },
    {
      label: "Most Common Failure",
      value: topFailure ? prettifyMetricName(topFailure.label) : "Not enough data",
      detail: topFailure ? `${topFailure.count} flagged cases` : "No failure reasons logged yet.",
      tone: "ai" as const,
    },
    {
      label: "Review Queue",
      value: lowestConfidence?.id ?? "No queued cases",
      detail:
        lowestConfidence?.confidence != null
          ? `Lowest confidence at ${Math.round(lowestConfidence.confidence * 100)}%`
          : "No low-confidence interactions found.",
      tone: "default" as const,
    },
  ];
}

async function settle<T>(label: string, load: () => Promise<T>) {
  try {
    return {
      data: await load(),
      warning: null,
    };
  } catch (error) {
    return {
      data: null as T | null,
      warning: `${label}: ${error instanceof Error ? error.message : "Request failed"}`,
    };
  }
}

export async function getAnalyticsDashboardData(
  rawFilters?: AnalyticsDashboardFilters,
): Promise<AnalyticsDashboardData> {
  const filters = normalizeFilters(rawFilters);
  const interactionParams = buildInteractionParams(filters);
  const feedbackParams = buildFeedbackParams(filters);
  const errorParams = buildErrorParams(filters);
  const { params: comparisonParams, metricNames } = buildComparisonParams(filters.module);

  const [
    benchmarkSummaryResult,
    evaluationRunsResult,
    comparisonsResult,
    interactionsResult,
    liveSummaryResult,
    feedbackResult,
    errorsResult,
    fineTuningResult,
    assignmentsResult,
    ...evaluationResults
  ] = await Promise.all([
    settle("Benchmark summary", () => fetchMember4("/api/member4/benchmark-summary")),
    settle("Evaluation runs", () => fetchMember4("/api/member4/evaluation-runs")),
    settle("Run comparisons", () =>
      fetchMember4("/api/member4/analytics/comparisons", comparisonParams),
    ),
    settle("Interactions", () => fetchMember4("/api/member4/interactions", interactionParams)),
    settle("Live summary", () => fetchMember4("/api/member4/live-summary", interactionParams)),
    settle("Feedback", () => fetchMember4("/api/member4/feedback", feedbackParams)),
    settle("Errors", () => fetchMember4("/api/member4/errors", errorParams)),
    settle("Fine-tuning examples", () => fetchMember4("/api/member4/fine-tuning-examples")),
    settle("A/B assignments", () => fetchMember4("/api/member4/ab-test-assignments")),
    ...MODULES.map((module) =>
      settle(`${titleCase(module)} evaluation`, () =>
        fetchMember4("/api/member4/analytics/evaluation", evaluationParams(module)),
      ),
    ),
  ]);

  const warnings = [
    benchmarkSummaryResult.warning,
    evaluationRunsResult.warning,
    comparisonsResult.warning,
    interactionsResult.warning,
    liveSummaryResult.warning,
    feedbackResult.warning,
    errorsResult.warning,
    fineTuningResult.warning,
    assignmentsResult.warning,
    ...evaluationResults.map((result) => result.warning),
  ].filter((warning): warning is string => Boolean(warning));

  const runs = normalizeEvaluationRuns(evaluationRunsResult.data);
  const filteredRuns = runs.filter((run) =>
    filters.module ? run.module === filters.module : true,
  );
  const benchmarkCards = normalizeBenchmarkSummary(benchmarkSummaryResult.data, runs);
  const moduleCards = MODULES.map((module, index) =>
    normalizeEvaluationCard(module, evaluationResults[index]?.data),
  );
  const comparisons = normalizeComparisons(comparisonsResult.data, metricNames);
  const interactions = normalizeInteractionRows(interactionsResult.data);
  const feedbackRows = filterFeedbackRows(
    normalizeFeedbackRows(feedbackResult.data),
    interactions,
    filters,
  );
  const liveSummary = normalizeLiveSummary(liveSummaryResult.data);
  const errors = normalizeErrorCases(errorsResult.data);
  const errorSummary = summarizeErrors(errors);
  const dataset = summarizeDataset(normalizeFineTuningExamples(fineTuningResult.data));
  const assignments = normalizeAssignments(assignmentsResult.data);

  const feedbackSummary = summarizeFeedback(
    feedbackRows,
    liveSummary.totalAiInteractions || interactions.length,
  );
  const interactionTrend = buildInteractionTrend(interactions);
  const feedbackTrend = buildFeedbackTrend(feedbackRows);
  const performanceByCategory = buildPerformanceByCategory(interactions, feedbackRows);
  const performanceByIntent = buildPerformanceByIntent(interactions, feedbackRows);
  const confidenceDistribution = buildConfidenceDistribution(interactions);
  const failureReasons = buildFailureReasons(feedbackRows);
  const lowConfidenceQueue = buildLowConfidenceQueue(interactions, feedbackRows).filter(
    (entry) => entry.confidence == null || entry.confidence <= filters.lowConfidenceThreshold,
  );

  const experimentVariants = assignments.reduce<Record<string, number>>((acc, assignment) => {
    acc[assignment.variant] = (acc[assignment.variant] ?? 0) + 1;
    return acc;
  }, {});
  const uniqueExperiments = new Set(assignments.map((entry) => entry.experimentName));

  return {
    selectedModule: filters.module,
    warnings,
    filters,
    overview: {
      totalRuns: runs.length,
      totalInteractions: liveSummary.totalAiInteractions || interactions.length,
      totalFeedback: feedbackSummary.total,
      averageRating: liveSummary.averageRating ?? feedbackSummary.averageRating,
      openErrors: errorSummary.unresolved,
      approvedExamples: dataset.approved,
      totalExamples: dataset.total,
      benchmarkCards,
      liveCards: {
        acceptanceRate: liveSummary.acceptanceRate,
        editRate: liveSummary.editRate,
        rejectionRate: liveSummary.rejectionRate,
        averageConfidence: liveSummary.averageConfidence,
        escalationRate: liveSummary.escalationRate,
        averageLatency: liveSummary.averageLatency,
        lowConfidenceCount: liveSummary.lowConfidenceCount,
        criticalUnresolvedErrors: liveSummary.criticalUnresolvedErrors ?? errorSummary.critical,
      },
      insights: buildOverviewInsights(performanceByCategory, failureReasons, lowConfidenceQueue),
    },
    moduleCards,
    benchmark: {
      cards: benchmarkCards,
      runs: filteredRuns.length > 0 ? filteredRuns : runs,
      comparisons,
      comparisonMetricNames:
        metricNames.length > 0 ? metricNames : Object.keys(comparisons[0]?.metrics ?? {}),
    },
    liveMonitoring: {
      summary: liveSummary,
      interactionTrend,
      feedbackTrend,
      performanceByCategory,
      performanceByIntent,
      confidenceDistribution,
      failureReasons,
      lowConfidenceQueue,
      feedbackSummary,
    },
    errors: errorSummary,
    dataset,
    experiments: {
      totalAssignments: assignments.length,
      experimentCount: uniqueExperiments.size,
      variants: Object.entries(experimentVariants)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      recent: assignments,
    },
  };
}

export async function getEvaluationRunDetail(runId: string): Promise<BenchmarkRun | null> {
  const run = await fetchMember4(`/api/member4/evaluation-runs/${runId}`);
  return normalizeEvaluationRuns([run])[0] ?? null;
}

export { prettifyMetricName, titleCase };
