import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDashboard } from "@/lib/api/member4.functions";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  FlaskConical,
  LoaderCircle,
  RefreshCw,
  Scale,
  Sparkles,
  TestTube2,
  ThumbsUp,
} from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics - Sentinel" }] }),
  component: AnalyticsDashboard,
});

const MODULES = [
  { value: "generation", label: "Generation" },
  { value: "retrieval", label: "Retrieval" },
  { value: "classifier", label: "Classifier" },
  { value: "live_chat", label: "Live chat" },
] as const;

function AnalyticsDashboard() {
  const [selectedModule, setSelectedModule] = useState<(typeof MODULES)[number]["value"]>(
    "generation",
  );

  const analyticsQuery = useQuery({
    queryKey: ["member4-analytics", selectedModule],
    queryFn: () => getAnalyticsDashboard({ data: { module: selectedModule } }),
    refetchInterval: 15_000,
  });

  const dashboard = analyticsQuery.data;

  return (
    <AppShell>
      <PageHeader
        title="Analytics"
        subtitle="Evaluation, feedback, safety, and improvement metrics for the AI support system."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void analyticsQuery.refetch()}
            disabled={analyticsQuery.isFetching}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", analyticsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        {analyticsQuery.error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {analyticsQuery.error.message}
          </div>
        )}

        {dashboard?.warnings.length ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            Some analytics sources are unavailable right now. The dashboard is showing partial data.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-1">
          {MODULES.map((module) => (
            <button
              key={module.value}
              onClick={() => setSelectedModule(module.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                selectedModule === module.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {module.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Evaluation runs"
            value={dashboard ? String(dashboard.overview.totalRuns) : "-"}
            hint="Imported and manual benchmark runs"
            icon={BarChart3}
          />
          <StatCard
            label="Feedback rows"
            value={dashboard ? String(dashboard.overview.totalFeedback) : "-"}
            hint="Accepted, edited, and rejected agent actions"
            icon={ThumbsUp}
            tone="ai"
          />
          <StatCard
            label="Avg rating"
            value={dashboard ? formatRating(dashboard.overview.averageRating) : "-"}
            hint="Average human rating from feedback logs"
            icon={Sparkles}
            tone="success"
          />
          <StatCard
            label="Open errors"
            value={dashboard ? String(dashboard.overview.openErrors) : "-"}
            hint="Unresolved model, retrieval, or generation issues"
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard
            label="Approved examples"
            value={
              dashboard
                ? `${dashboard.overview.approvedExamples}/${dashboard.overview.totalExamples}`
                : "-"
            }
            hint="Fine-tuning examples ready for export"
            icon={FlaskConical}
            tone="default"
          />
        </div>

        {analyticsQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading analytics dashboard...
            </CardContent>
          </Card>
        )}

        {dashboard && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Module health snapshot</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {dashboard.moduleCards.map((card) => (
                    <div
                      key={card.module}
                      className="rounded-lg border border-border bg-surface/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {titleCase(card.module)}
                          </div>
                          <div className="mt-1 text-2xl font-semibold">{card.runCount}</div>
                          <div className="text-xs text-muted-foreground">runs tracked</div>
                        </div>
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-ai-soft text-ai">
                          <Bot className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Headline metric
                        </div>
                        <div className="mt-1 text-sm font-medium">
                          {card.headlineMetric
                            ? `${formatMetricLabel(card.headlineMetric.name)} · ${formatPercent(card.headlineMetric.avg)}`
                            : "No metrics yet"}
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {card.metrics.slice(0, 3).map((metric) => (
                          <MetricRow
                            key={metric.name}
                            label={formatMetricLabel(metric.name)}
                            value={metric.avg}
                          />
                        ))}
                        {card.metrics.length === 0 && (
                          <div className="text-xs text-muted-foreground">
                            No aggregated metrics available for this module.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-base">
                      {titleCase(selectedModule)} run comparison
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Side-by-side runs from Member 4 comparison analytics.
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted-foreground">
                    {dashboard.comparisons.length} runs
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {dashboard.comparisons.length > 0 ? (
                    <div className="overflow-x-auto">
                      <div
                        className="grid min-w-[900px] gap-3 border-b border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        style={{
                          gridTemplateColumns: `240px 120px 120px 120px repeat(${dashboard.comparisonMetricNames.length}, 120px)`,
                        }}
                      >
                        <div>Run</div>
                        <div>Model</div>
                        <div>Prompt</div>
                        <div>Dataset</div>
                        {dashboard.comparisonMetricNames.map((metric) => (
                          <div key={metric}>{formatMetricLabel(metric)}</div>
                        ))}
                      </div>
                      <div className="divide-y divide-border">
                        {dashboard.comparisons.map((row) => (
                          <div
                            key={row.id}
                            className="grid min-w-[900px] items-center gap-3 px-5 py-3.5 text-sm"
                            style={{
                              gridTemplateColumns: `240px 120px 120px 120px repeat(${dashboard.comparisonMetricNames.length}, 120px)`,
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{row.runName}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {titleCase(row.module)}
                                {row.createdAt ? ` · ${formatShortDate(row.createdAt)}` : ""}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.modelName ?? "--"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.promptVersion ?? "--"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.datasetName ?? "--"}
                            </div>
                            {dashboard.comparisonMetricNames.map((metric) => (
                              <div key={metric} className="font-mono text-xs">
                                {formatPercent(row.metrics[metric] ?? null)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      No comparison rows are available for this module yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Safety and error analysis</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4">
                    <SummaryTile
                      icon={AlertTriangle}
                      label="Unresolved errors"
                      value={formatCount(dashboard.errors.unresolved)}
                      tone="warning"
                    />
                    <SummaryTile
                      icon={CheckCircle2}
                      label="Resolved errors"
                      value={formatCount(dashboard.errors.resolved)}
                      tone="success"
                    />
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        By severity
                      </div>
                      {dashboard.errors.bySeverity.map((entry) => (
                        <BarRow
                          key={entry.label}
                          label={titleCase(entry.label)}
                          value={entry.count}
                          max={dashboard.errors.bySeverity[0]?.count ?? 1}
                          tone={
                            entry.label.toLowerCase() === "high"
                              ? "danger"
                              : entry.label.toLowerCase() === "medium"
                                ? "warning"
                                : "success"
                          }
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Top error types
                      </div>
                      {dashboard.errors.byType.slice(0, 4).map((entry) => (
                        <BarRow
                          key={entry.label}
                          label={formatMetricLabel(entry.label)}
                          value={entry.count}
                          max={dashboard.errors.byType[0]?.count ?? 1}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent cases
                    </div>
                    {dashboard.errors.recent.length > 0 ? (
                      dashboard.errors.recent.map((error) => (
                        <div
                          key={error.id}
                          className="rounded-lg border border-border bg-surface/70 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold">
                              {formatMetricLabel(error.errorType)}
                            </div>
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                                error.resolved
                                  ? "bg-success/15 text-success"
                                  : error.severity.toLowerCase() === "high"
                                    ? "bg-danger/10 text-danger"
                                    : "bg-warning/15 text-warning-foreground",
                              )}
                            >
                              {error.resolved ? "Resolved" : titleCase(error.severity)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {titleCase(error.module)}
                          </div>
                          <p className="mt-2 text-sm text-foreground/90">{error.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No error records available.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Agent feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SummaryTile
                    icon={ThumbsUp}
                    label="Average rating"
                    value={formatRating(dashboard.feedback.averageRating)}
                    tone="ai"
                  />
                  <div className="space-y-2">
                    {Object.entries(dashboard.feedback.actionCounts).map(([action, count]) => (
                      <BarRow
                        key={action}
                        label={titleCase(action)}
                        value={count}
                        max={Math.max(...Object.values(dashboard.feedback.actionCounts), 1)}
                        suffix={
                          dashboard.feedback.actionRates[action] != null
                            ? `${Math.round(dashboard.feedback.actionRates[action] * 100)}%`
                            : undefined
                        }
                      />
                    ))}
                    {Object.keys(dashboard.feedback.actionCounts).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No feedback summary is available yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Live chat impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricPair
                    icon={Sparkles}
                    label="Suggestion acceptance"
                    value={formatPercent(dashboard.liveChat.suggestionAcceptanceRate)}
                  />
                  <MetricPair
                    icon={Clock3}
                    label="Response time reduction"
                    value={formatPercent(dashboard.liveChat.avgResponseTimeReduction)}
                  />
                  <MetricPair
                    icon={Scale}
                    label="Thumbs-up rate"
                    value={formatPercent(dashboard.liveChat.thumbsUpRate)}
                  />
                  <MetricPair
                    icon={Bot}
                    label="Suggestion latency"
                    value={formatLatency(dashboard.liveChat.avgSuggestionLatencyMs)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Fine-tuning pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStat label="Approved" value={String(dashboard.fineTuning.approved)} />
                    <MiniStat label="Pending" value={String(dashboard.fineTuning.pending)} />
                    <MiniStat
                      label="Avg quality"
                      value={formatRating(dashboard.fineTuning.averageQuality)}
                    />
                  </div>
                  <div className="space-y-2">
                    {dashboard.fineTuning.recent.length > 0 ? (
                      dashboard.fineTuning.recent.map((example) => (
                        <div
                          key={example.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/70 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {formatMetricLabel(example.taskType)}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {example.sourceMember ? titleCase(example.sourceMember) : "Unknown source"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium">
                              {titleCase(example.approvalStatus)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {example.qualityScore != null ? `${example.qualityScore}/5` : "--"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No fine-tuning examples have been logged yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">A/B assignments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat
                      label="Assignments"
                      value={String(dashboard.experiments.totalAssignments)}
                    />
                    <MiniStat
                      label="Experiments"
                      value={String(dashboard.experiments.experimentCount)}
                    />
                  </div>
                  <div className="space-y-2">
                    {dashboard.experiments.variants.map((entry) => (
                      <BarRow
                        key={entry.label}
                        label={titleCase(entry.label)}
                        value={entry.count}
                        max={dashboard.experiments.variants[0]?.count ?? 1}
                        tone="ai"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {dashboard.experiments.recent.length > 0 ? (
                      dashboard.experiments.recent.slice(0, 4).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-border bg-surface/70 px-3 py-2.5"
                        >
                          <div className="text-sm font-semibold">{entry.experimentName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {titleCase(entry.module)} · {titleCase(entry.variant)} · {entry.subjectId}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No A/B assignment records available.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {dashboard.warnings.length > 0 && (
                <Card className="border-warning/40 bg-warning/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Data source warnings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.warnings.map((warning) => (
                      <div key={warning} className="text-sm text-muted-foreground">
                        {warning}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        <Card className="border-ai/30 bg-ai-soft/40">
          <CardContent className="flex items-start gap-3 p-4">
            <TestTube2 className="mt-0.5 h-5 w-5 text-ai" />
            <div className="text-sm">
              <div className="font-semibold">Member 4 analytics are manager-facing system health indicators.</div>
              <div className="text-muted-foreground">
                This view tracks evaluation quality, human feedback, unresolved failure modes, and fine-tuning readiness in one place.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof BarChart3;
  tone?: "default" | "warning" | "success" | "ai";
}) {
  const toneCls = {
    default: "bg-muted text-foreground",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    ai: "bg-ai-soft text-ai",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
            {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
          </div>
          <div className={cn("grid h-9 w-9 place-items-center rounded-md", toneCls)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/70 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  tone?: "default" | "warning" | "success" | "ai";
}) {
  const toneCls = {
    default: "bg-muted text-foreground",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    ai: "bg-ai-soft text-ai",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/70 p-3">
      <div className={cn("grid h-10 w-10 place-items-center rounded-md", toneCls)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}

function MetricPair({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/70 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{formatPercent(value)}</span>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  tone = "default",
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  tone?: "default" | "warning" | "success" | "danger" | "ai";
  suffix?: string;
}) {
  const width = max > 0 ? `${Math.max((value / max) * 100, 6)}%` : "0%";
  const barTone = {
    default: "bg-primary/70",
    warning: "bg-warning/70",
    success: "bg-success/70",
    danger: "bg-danger/70",
    ai: "bg-ai/70",
  }[tone];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-mono">
          {value}
          {suffix ? ` · ${suffix}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={cn("h-2 rounded-full", barTone)} style={{ width }} />
      </div>
    </div>
  );
}

function formatMetricLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function formatPercent(value: number | null) {
  if (value == null) return "--";
  if (value > 1) return `${value.toFixed(2)}`;
  return `${Math.round(value * 100)}%`;
}

function formatRating(value: number | null) {
  if (value == null) return "--";
  return value.toFixed(2);
}

function formatLatency(value: number | null) {
  if (value == null) return "--";
  return `${Math.round(value)}ms`;
}

function formatCount(value: number | null) {
  if (value == null) return "--";
  return String(value);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
