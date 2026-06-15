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

type RecentError = {
  id: string;
  module: string;
  errorType: string;
  severity: string;
  description: string;
  resolved: boolean;
};

type FineTuningExample = {
  id: string;
  taskType: string;
  qualityScore: number | null;
  approvalStatus: string;
  sourceMember: string | null;
};

type AssignmentRow = {
  id: string;
  experimentName: string;
  module: string;
  variant: string;
  subjectId: string;
};

export type AnalyticsDashboardData = {
  selectedModule: string;
  comparisonMetricNames: string[];
  warnings: string[];
  overview: {
    totalRuns: number;
    totalFeedback: number;
    averageRating: number | null;
    openErrors: number;
    approvedExamples: number;
    totalExamples: number;
  };
  moduleCards: ModuleEvaluationCard[];
  comparisons: ComparisonRow[];
  feedback: {
    total: number;
    averageRating: number | null;
    actionCounts: Record<string, number>;
    actionRates: Record<string, number>;
  };
  liveChat: {
    suggestionAcceptanceRate: number | null;
    avgResponseTimeReduction: number | null;
    avgSuggestionLatencyMs: number | null;
    thumbsUpRate: number | null;
    totalRecords: number | null;
  };
  errors: {
    total: number;
    resolved: number | null;
    unresolved: number | null;
    bySeverity: Array<{ label: string; count: number }>;
    byType: Array<{ label: string; count: number }>;
    recent: RecentError[];
  };
  fineTuning: {
    total: number;
    approved: number;
    pending: number;
    averageQuality: number | null;
    recent: FineTuningExample[];
  };
  experiments: {
    totalAssignments: number;
    experimentCount: number;
    variants: Array<{ label: string; count: number }>;
    recent: AssignmentRow[];
  };
};

const MODULES = ["classifier", "retrieval", "generation", "live_chat"] as const;

const DEFAULT_METRICS: Record<string, string[]> = {
  classifier: ["category_accuracy", "priority_accuracy", "sentiment_accuracy"],
  retrieval: ["retrieval_hit_rate", "context_precision", "citation_coverage"],
  generation: ["json_validity_rate", "faithfulness_rate", "resolution_accuracy"],
  live_chat: ["suggestion_acceptance_rate", "avg_response_time_reduction", "thumbs_up_rate"],
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
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

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs = 20_000,
): Promise<T> {
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
  const entries = Object.entries(record)
    .map(([label, count]) => ({
      label,
      count: asNumber(count) ?? 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  return entries;
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
  const rows = asArray(record.comparisons ?? record.rows ?? record.items ?? record.runs ?? input)
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
    });

  return rows.slice(0, 6);
}

function normalizeFeedbackSummary(input: unknown) {
  const record = asRecord(input);
  const total = asNumber(record.total_feedback) ?? 0;

  return {
    total,
    averageRating: asNumber(record.average_rating),
    actionCounts: Object.fromEntries(
      toCountMap(record.action_counts).map((entry) => [entry.label, entry.count]),
    ),
    actionRates: Object.fromEntries(
      Object.entries(asRecord(record.action_rates)).map(([label, value]) => [
        label,
        asNumber(value) ?? 0,
      ]),
    ),
  };
}

function normalizeLiveChat(input: unknown) {
  const record = asRecord(input);
  return {
    suggestionAcceptanceRate: asNumber(
      record.suggestion_acceptance_rate ?? record.acceptance_rate,
    ),
    avgResponseTimeReduction: asNumber(
      record.avg_response_time_reduction ??
        record.average_response_time_reduction ??
        record.response_time_reduction,
    ),
    avgSuggestionLatencyMs: asNumber(
      record.avg_suggestion_latency_ms ??
        record.suggestion_latency_ms ??
        record.average_suggestion_latency_ms,
    ),
    thumbsUpRate: asNumber(record.thumbs_up_rate ?? record.helpfulness_rate),
    totalRecords: asNumber(
      record.total_feedback ?? record.total_chats ?? record.total_records ?? record.run_count,
    ),
  };
}

function normalizeErrorSummary(input: unknown) {
  const record = asRecord(input);
  return {
    total: asNumber(record.total_errors) ?? 0,
    resolved: asNumber(record.resolved_errors ?? record.resolved_count),
    unresolved: asNumber(record.unresolved_errors ?? record.open_errors),
    bySeverity: toCountMap(
      record.by_severity ?? record.severity_counts ?? record.error_counts_by_severity,
    ),
    byType: toCountMap(record.by_type ?? record.type_counts ?? record.error_counts_by_type),
  };
}

function normalizeRecentErrors(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.errors ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => {
      const resolvedValue = row.resolved ?? row.is_resolved ?? row.status;
      const resolved =
        typeof resolvedValue === "boolean"
          ? resolvedValue
          : asString(resolvedValue)?.toLowerCase() === "resolved";

      return {
        id: asString(row.id) ?? `error-${index}`,
        module: asString(row.module) ?? "unknown",
        errorType: asString(row.error_type) ?? "unknown",
        severity: asString(row.severity) ?? "unknown",
        description: asString(row.description) ?? "No description provided.",
        resolved,
      } satisfies RecentError;
    })
    .slice(0, 6);
}

function normalizeFineTuningExamples(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.examples ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => ({
      id: asString(row.id) ?? `example-${index}`,
      taskType: asString(row.task_type) ?? "unknown",
      qualityScore: asNumber(row.quality_score),
      approvalStatus: asString(row.approval_status) ?? (row.approved ? "approved" : "pending"),
      sourceMember: asString(row.source_member),
    }))
    .slice(0, 6);
}

function normalizeAssignments(input: unknown) {
  const record = asRecord(input);
  return asArray(record.items ?? record.assignments ?? record.data ?? input)
    .map(asRecord)
    .map((row, index) => ({
      id: asString(row.id) ?? `assignment-${index}`,
      experimentName: asString(row.experiment_name) ?? "Unnamed experiment",
      module: asString(row.module) ?? "unknown",
      variant: asString(row.variant) ?? "unknown",
      subjectId: asString(row.subject_id) ?? "unknown",
    }))
    .slice(0, 6);
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
  selectedModule = "generation",
): Promise<AnalyticsDashboardData> {
  const comparisonMetricNames = metricNamesForModule(selectedModule);
  const comparisonParams = new URLSearchParams();
  comparisonParams.set("module", selectedModule);
  for (const metricName of comparisonMetricNames) {
    comparisonParams.append("metric_names", metricName);
  }

  const evaluationParams = (module: string) => {
    const params = new URLSearchParams();
    params.set("module", module);
    return params;
  };

  const [
    overviewResult,
    feedbackResult,
    liveChatResult,
    errorSummaryResult,
    recentErrorsResult,
    fineTuningResult,
    assignmentsResult,
    comparisonsResult,
    ...evaluationResults
  ] = await Promise.all([
    settle("Overview", () => fetchMember4("/api/member4/analytics/overview")),
    settle("Feedback summary", () => fetchMember4("/api/member4/feedback-summary")),
    settle("Live chat summary", () => fetchMember4("/api/member4/analytics/live-chat")),
    settle("Error summary", () => fetchMember4("/api/member4/error-summary")),
    settle("Error list", () => fetchMember4("/api/member4/errors")),
    settle("Fine-tuning examples", () => fetchMember4("/api/member4/fine-tuning-examples")),
    settle("A/B assignments", () => fetchMember4("/api/member4/ab-test-assignments")),
    settle("Run comparisons", () =>
      fetchMember4("/api/member4/analytics/comparisons", comparisonParams),
    ),
    ...MODULES.map((module) =>
      settle(`${titleCase(module)} evaluation`, () =>
        fetchMember4("/api/member4/analytics/evaluation", evaluationParams(module)),
      ),
    ),
  ]);

  const warnings = [
    overviewResult.warning,
    feedbackResult.warning,
    liveChatResult.warning,
    errorSummaryResult.warning,
    recentErrorsResult.warning,
    fineTuningResult.warning,
    assignmentsResult.warning,
    comparisonsResult.warning,
    ...evaluationResults.map((result) => result.warning),
  ].filter((warning): warning is string => Boolean(warning));

  const feedback = normalizeFeedbackSummary(feedbackResult.data);
  const liveChat = normalizeLiveChat(liveChatResult.data);
  const errorSummary = normalizeErrorSummary(errorSummaryResult.data);
  const recentErrors = normalizeRecentErrors(recentErrorsResult.data);
  const examples = normalizeFineTuningExamples(fineTuningResult.data);
  const assignments = normalizeAssignments(assignmentsResult.data);
  const comparisons = normalizeComparisons(comparisonsResult.data, comparisonMetricNames);

  const moduleCards = MODULES.map((module, index) =>
    normalizeEvaluationCard(module, evaluationResults[index]?.data),
  );

  const approvedExamples = examples.filter((entry) =>
    entry.approvalStatus.toLowerCase() === "approved",
  ).length;
  const averageQualityScores = examples
    .map((entry) => entry.qualityScore)
    .filter((value): value is number => value != null);
  const averageQuality = averageQualityScores.length
    ? averageQualityScores.reduce((sum, value) => sum + value, 0) / averageQualityScores.length
    : null;

  const experimentVariants = assignments.reduce<Record<string, number>>((acc, assignment) => {
    acc[assignment.variant] = (acc[assignment.variant] ?? 0) + 1;
    return acc;
  }, {});

  const uniqueExperiments = new Set(assignments.map((entry) => entry.experimentName));
  const overviewRecord = asRecord(overviewResult.data);
  const totalRuns =
    asNumber(overviewRecord.total_runs ?? overviewRecord.run_count) ??
    moduleCards.reduce((sum, card) => sum + card.runCount, 0);
  const totalFeedback =
    asNumber(overviewRecord.total_feedback ?? overviewRecord.feedback_count) ?? feedback.total;
  const openErrors =
    asNumber(overviewRecord.open_errors ?? overviewRecord.unresolved_errors) ??
    errorSummary.unresolved ??
    recentErrors.filter((entry) => !entry.resolved).length;
  const totalExamples =
    asNumber(overviewRecord.total_fine_tuning_examples ?? overviewRecord.total_examples) ??
    examples.length;

  return {
    selectedModule,
    comparisonMetricNames:
      comparisonMetricNames.length > 0
        ? comparisonMetricNames
        : Object.keys(comparisons[0]?.metrics ?? {}),
    warnings,
    overview: {
      totalRuns,
      totalFeedback,
      averageRating: feedback.averageRating,
      openErrors,
      approvedExamples:
        asNumber(overviewRecord.approved_examples ?? overviewRecord.approved_fine_tuning_examples) ??
        approvedExamples,
      totalExamples,
    },
    moduleCards,
    comparisons,
    feedback,
    liveChat,
    errors: {
      total: errorSummary.total,
      resolved: errorSummary.resolved,
      unresolved: errorSummary.unresolved,
      bySeverity: errorSummary.bySeverity,
      byType: errorSummary.byType,
      recent: recentErrors,
    },
    fineTuning: {
      total: totalExamples,
      approved: approvedExamples,
      pending: Math.max(totalExamples - approvedExamples, 0),
      averageQuality,
      recent: examples,
    },
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

export { prettifyMetricName, titleCase };
