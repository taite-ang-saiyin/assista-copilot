import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAnalyticsDashboard, getAnalyticsRunDetail } from "@/lib/api/member4.functions";
import type {
  AnalyticsDashboardData,
  AnalyticsDashboardFilters,
  BenchmarkRun,
  DatasetExample,
  ErrorCase,
} from "@/lib/api/member4.server";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Clock3,
  Database,
  DatabaseZap,
  FileSearch,
  Filter,
  FlaskConical,
  GitCompareArrows,
  Layers3,
  LoaderCircle,
  Radar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
} from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics - Sentinel" }] }),
  component: AnalyticsDashboard,
});

const MODULE_OPTIONS = [
  { value: "classifier", label: "Classifier" },
  { value: "retrieval", label: "Retrieval" },
  { value: "generation", label: "Generation" },
  { value: "live_chat", label: "Live Chat" },
  { value: "full_pipeline", label: "Full Pipeline" },
] as const;

const MODE_OPTIONS = [
  { value: "all", label: "All Modes" },
  { value: "ticket", label: "Ticket" },
  { value: "live_chat", label: "Live Chat" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Urgent", label: "Urgent" },
] as const;

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "accepted", label: "Accepted" },
  { value: "edited", label: "Edited" },
  { value: "rejected", label: "Rejected" },
  { value: "ignored", label: "Ignored" },
  { value: "regenerated", label: "Regenerated" },
] as const;

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

const TAB_OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "benchmarks", label: "Offline Benchmarks" },
  { value: "live", label: "Live Monitoring" },
  { value: "errors", label: "Error Analysis" },
  { value: "datasets", label: "Dataset Management" },
] as const;

function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<(typeof TAB_OPTIONS)[number]["value"]>("overview");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<ErrorCase | null>(null);
  const [selectedExample, setSelectedExample] = useState<DatasetExample | null>(null);

  const deferredFilters = useDeferredValue(filters);

  const analyticsQuery = useQuery({
    queryKey: ["member4-analytics-workspace", deferredFilters],
    queryFn: () => getAnalyticsDashboard({ data: deferredFilters }),
    refetchInterval: 30_000,
  });

  const runDetailQuery = useQuery({
    queryKey: ["member4-analytics-run", selectedRunId],
    queryFn: () => getAnalyticsRunDetail({ data: { runId: selectedRunId ?? "" } }),
    enabled: Boolean(selectedRunId),
  });

  const dashboard = analyticsQuery.data;
  const comparisonChartMetrics = dashboard?.benchmark.comparisonMetricNames.slice(0, 3) ?? [];
  const comparisonChartData = useMemo(
    () =>
      (dashboard?.benchmark.comparisons ?? []).map((row) => ({
        name: truncate(row.runName, 18),
        ...row.metrics,
      })),
    [dashboard],
  );

  const updateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <AppShell>
      <PageHeader
        title="AI Quality Monitoring Dashboard"
        subtitle="Track offline benchmarks, live quality, error patterns, and dataset readiness for the support AI system."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void analyticsQuery.refetch()}
            disabled={analyticsQuery.isFetching}
          >
            <RefreshCw
              className={cn("mr-1.5 h-4 w-4", analyticsQuery.isFetching && "animate-spin")}
            />
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
            Some Member 4 data sources are unavailable right now. The dashboard is rendering the
            sections that could be loaded.
          </div>
        ) : null}

        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filter Bar
            </div>
            <CardTitle className="text-base">Live monitoring filters</CardTitle>
            <CardDescription>
              These filters drive the real-usage views and the selected module comparison.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FilterSelect
                label="Module"
                value={filters.module}
                onValueChange={(value) => updateFilter("module", value)}
                options={MODULE_OPTIONS}
              />
              <FilterSelect
                label="Mode"
                value={filters.mode}
                onValueChange={(value) => updateFilter("mode", value)}
                options={MODE_OPTIONS}
              />
              <FilterSelect
                label="Priority"
                value={filters.priority}
                onValueChange={(value) => updateFilter("priority", value)}
                options={PRIORITY_OPTIONS}
              />
              <FilterSelect
                label="Agent Action"
                value={filters.action}
                onValueChange={(value) => updateFilter("action", value)}
                options={ACTION_OPTIONS}
              />
              <FilterInput
                label="Date From"
                type="date"
                value={filters.dateFrom}
                onChange={(value) => updateFilter("dateFrom", value)}
              />
              <FilterInput
                label="Date To"
                type="date"
                value={filters.dateTo}
                onChange={(value) => updateFilter("dateTo", value)}
              />
              <FilterInput
                label="Category"
                placeholder="Billing"
                value={filters.category}
                onChange={(value) => updateFilter("category", value)}
              />
              <FilterInput
                label="Intent"
                placeholder="refund_request"
                value={filters.intent}
                onChange={(value) => updateFilter("intent", value)}
              />
              <FilterInput
                label="Model Version"
                placeholder="local_llm_ft_v1"
                value={filters.modelVersion}
                onChange={(value) => updateFilter("modelVersion", value)}
              />
              <FilterInput
                label="Prompt Version"
                placeholder="support_prompt_v3"
                value={filters.promptVersion}
                onChange={(value) => updateFilter("promptVersion", value)}
              />
              <FilterInput
                label="Retrieval Version"
                placeholder="hybrid_search_v1"
                value={filters.retrievalVersion}
                onChange={(value) => updateFilter("retrievalVersion", value)}
              />
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ConceptCard
            icon={BarChart3}
            eyebrow="Offline Benchmark"
            title="Fixed evaluation using test datasets."
            description="Use benchmark runs to compare model, retrieval, or prompt versions before release. These numbers do not move when new tickets arrive."
            tone="blue"
          />
          <ConceptCard
            icon={Radar}
            eyebrow="Dynamic Live Monitoring"
            title="Real usage metrics from tickets, chats, and agent feedback."
            description="Use this view to detect current AI quality problems. These numbers change as new support interactions are logged."
            tone="amber"
          />
        </div>

        {analyticsQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading analytics workspace...
            </CardContent>
          </Card>
        )}

        {dashboard && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          >
            <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-xl border border-border bg-surface p-1">
              {TAB_OPTIONS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg px-4 py-2">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OverviewTab dashboard={dashboard} />
            </TabsContent>

            <TabsContent value="benchmarks" className="space-y-6">
              <BenchmarksTab
                dashboard={dashboard}
                comparisonChartData={comparisonChartData}
                comparisonChartMetrics={comparisonChartMetrics}
                onRunSelect={setSelectedRunId}
              />
            </TabsContent>

            <TabsContent value="live" className="space-y-6">
              <LiveMonitoringTab dashboard={dashboard} />
            </TabsContent>

            <TabsContent value="errors" className="space-y-6">
              <ErrorsTab dashboard={dashboard} onErrorSelect={setSelectedError} />
            </TabsContent>

            <TabsContent value="datasets" className="space-y-6">
              <DatasetsTab dashboard={dashboard} onExampleSelect={setSelectedExample} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Drawer
        open={Boolean(selectedRunId)}
        onOpenChange={(open) => !open && setSelectedRunId(null)}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Evaluation run details</DrawerTitle>
            <DrawerDescription>
              Offline benchmark details for the selected Member 4 run.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {runDetailQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/70 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading run details...
              </div>
            ) : runDetailQuery.data ? (
              <RunDetailContent run={runDetailQuery.data} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                Run details are unavailable for this record.
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(selectedError)}
        onOpenChange={(open) => !open && setSelectedError(null)}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Error case details</DrawerTitle>
            <DrawerDescription>
              Inspect the failure mode before marking it resolved or converting it into a dataset
              example.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {selectedError ? <ErrorDetailContent error={selectedError} /> : null}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(selectedExample)}
        onOpenChange={(open) => !open && setSelectedExample(null)}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Dataset example details</DrawerTitle>
            <DrawerDescription>
              Review the source payload and target payload before approving it for future training
              or evaluation.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {selectedExample ? <DatasetExampleContent example={selectedExample} /> : null}
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}

function OverviewTab({ dashboard }: { dashboard: AnalyticsDashboardData }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionHeader
          title="Fixed Benchmark Results From Test Datasets"
          description="Latest benchmark highlights across Members 1, 2, and 3 style evaluation modules."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.overview.benchmarkCards.map((card) => (
            <BenchmarkHeadlineCard key={card.module} card={card} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Dynamic Metrics From Real Tickets And Live Chats"
          description="Current quality indicators computed from stored interactions and feedback."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Activity}
            label="Total AI Interactions"
            value={formatCount(dashboard.overview.totalInteractions)}
            tone="default"
          />
          <MetricCard
            icon={ThumbsUp}
            label="Acceptance Rate"
            value={formatPercent(dashboard.overview.liveCards.acceptanceRate)}
            tone="success"
          />
          <MetricCard
            icon={Sparkles}
            label="Edit Rate"
            value={formatPercent(dashboard.overview.liveCards.editRate)}
            tone="warning"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Reject Rate"
            value={formatPercent(dashboard.overview.liveCards.rejectionRate)}
            tone="danger"
          />
          <MetricCard
            icon={Bot}
            label="Average Confidence"
            value={formatRatio(dashboard.overview.liveCards.averageConfidence)}
            tone="ai"
          />
          <MetricCard
            icon={Sparkles}
            label="Average Rating"
            value={formatRating(dashboard.overview.averageRating)}
            tone="default"
          />
          <MetricCard
            icon={ShieldAlert}
            label="Escalation Rate"
            value={formatPercent(dashboard.overview.liveCards.escalationRate)}
            tone="warning"
          />
          <MetricCard
            icon={FileSearch}
            label="Critical Unresolved Errors"
            value={formatCount(dashboard.overview.liveCards.criticalUnresolvedErrors)}
            tone="danger"
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Insight Cards"
          description="Fast readouts that help frame the demo and direct investigation."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.overview.insights.map((insight) => (
            <InsightCard key={insight.label} insight={insight} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Module health snapshot</CardTitle>
            <CardDescription>Aggregate evaluation coverage by module.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.moduleCards.map((card) => (
              <div key={card.module} className="rounded-xl border border-border bg-surface/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {titleCase(card.module)}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{card.runCount}</div>
                    <div className="text-xs text-muted-foreground">evaluation runs tracked</div>
                  </div>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-ai-soft text-ai">
                    <Layers3 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 text-sm font-medium">
                  {card.headlineMetric
                    ? `${formatMetricLabel(card.headlineMetric.name)} · ${formatPercent(card.headlineMetric.avg)}`
                    : "No aggregated metrics yet"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Improvement loop status</CardTitle>
            <CardDescription>
              Member 4 does not stop at monitoring. It turns feedback into future data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MiniSummaryRow
              label="Feedback Rows"
              value={formatCount(dashboard.liveMonitoring.feedbackSummary.total)}
            />
            <MiniSummaryRow label="Open Errors" value={formatCount(dashboard.errors.unresolved)} />
            <MiniSummaryRow
              label="Approved Examples"
              value={`${dashboard.dataset.approved}/${dashboard.dataset.total}`}
            />
            <MiniSummaryRow
              label="Active Experiments"
              value={formatCount(dashboard.experiments.experimentCount)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BenchmarksTab({
  dashboard,
  comparisonChartData,
  comparisonChartMetrics,
  onRunSelect,
}: {
  dashboard: AnalyticsDashboardData;
  comparisonChartData: Array<Record<string, string | number | null>>;
  comparisonChartMetrics: string[];
  onRunSelect: (runId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.benchmark.cards.map((card) => (
          <BenchmarkHeadlineCard key={`benchmark-${card.module}`} card={card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {titleCase(dashboard.selectedModule)} version comparison
            </CardTitle>
            <CardDescription>
              Side-by-side benchmark comparison for the selected module.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {comparisonChartData.length > 0 && comparisonChartMetrics.length > 0 ? (
              <ChartContainer
                config={buildMetricChartConfig(comparisonChartMetrics)}
                className="h-[300px] w-full"
              >
                <BarChart data={comparisonChartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {comparisonChartMetrics.map((metric, index) => (
                    <Bar
                      key={metric}
                      dataKey={metric}
                      radius={[4, 4, 0, 0]}
                      fill={`var(--color-${metric})`}
                      barSize={18}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No benchmark comparison rows are available for this module yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benchmark explanation</CardTitle>
            <CardDescription>
              Offline benchmark results do not change whenever a new ticket arrives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use this page to compare model versions before release. These runs are fixed
              evaluations against curated datasets.
            </p>
            <p>
              The selected module currently focuses the run table and comparison chart. Switch the
              module filter above to move between classifier, retrieval, generation, live chat, and
              full pipeline views.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluation runs</CardTitle>
          <CardDescription>
            Click a row to inspect run details and attached metrics.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Run Name</TableHead>
                <TableHead>Model / Version</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Key Metric</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.benchmark.runs.length > 0 ? (
                dashboard.benchmark.runs.map((run) => {
                  const metric = pickRunHeadlineMetric(run);
                  return (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer"
                      onClick={() => onRunSelect(run.id)}
                    >
                      <TableCell>{run.memberName ?? "--"}</TableCell>
                      <TableCell>{titleCase(run.module)}</TableCell>
                      <TableCell className="font-medium">{run.runName}</TableCell>
                      <TableCell>
                        {run.modelVersion ?? run.modelName ?? run.promptVersion ?? "--"}
                      </TableCell>
                      <TableCell>{run.datasetName ?? "--"}</TableCell>
                      <TableCell>{run.datasetSize ?? "--"}</TableCell>
                      <TableCell>
                        {metric
                          ? `${formatMetricLabel(metric.name)} · ${formatMetricValue(metric.value)}`
                          : "--"}
                      </TableCell>
                      <TableCell>{formatShortDate(run.createdAt)}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState text="No evaluation runs were returned for the current module." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LiveMonitoringTab({ dashboard }: { dashboard: AnalyticsDashboardData }) {
  const live = dashboard.liveMonitoring;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Activity}
          label="Total Interactions"
          value={formatCount(live.summary.totalAiInteractions)}
        />
        <MetricCard
          icon={ThumbsUp}
          label="Acceptance Rate"
          value={formatPercent(live.summary.acceptanceRate)}
          tone="success"
        />
        <MetricCard
          icon={Sparkles}
          label="Edit Rate"
          value={formatPercent(live.summary.editRate)}
          tone="warning"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Ignore Rate"
          value={formatPercent(live.summary.ignoreRate)}
          tone="default"
        />
        <MetricCard
          icon={Radar}
          label="Regeneration Rate"
          value={formatPercent(live.summary.regenerationRate)}
          tone="ai"
        />
        <MetricCard
          icon={Bot}
          label="Average Confidence"
          value={formatRatio(live.summary.averageConfidence)}
          tone="ai"
        />
        <MetricCard
          icon={Clock3}
          label="Average Latency"
          value={formatLatency(live.summary.averageLatency)}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Escalation Rate"
          value={formatPercent(live.summary.escalationRate)}
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interaction volume over time</CardTitle>
            <CardDescription>AI interaction count by day.</CardDescription>
          </CardHeader>
          <CardContent>
            {live.interactionTrend.length > 0 ? (
              <ChartContainer
                config={{ count: { label: "Interactions", color: "var(--chart-1)" } }}
                className="h-[280px] w-full"
              >
                <LineChart data={live.interactionTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No interaction trend data is available yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback trend over time</CardTitle>
            <CardDescription>
              Accepted, edited, rejected, and ignored actions by day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {live.feedbackTrend.length > 0 ? (
              <ChartContainer
                config={{
                  accepted: { label: "Accepted", color: "var(--chart-2)" },
                  edited: { label: "Edited", color: "var(--chart-3)" },
                  rejected: { label: "Rejected", color: "var(--chart-4)" },
                  ignored: { label: "Ignored", color: "var(--chart-5)" },
                }}
                className="h-[280px] w-full"
              >
                <LineChart data={live.feedbackTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="accepted"
                    stroke="var(--color-accepted)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="edited"
                    stroke="var(--color-edited)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rejected"
                    stroke="var(--color-rejected)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ignored"
                    stroke="var(--color-ignored)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No feedback trend data is available yet." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by category</CardTitle>
            <CardDescription>
              Category-level quality view based on filtered interactions and linked feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Avg Confidence</TableHead>
                  <TableHead>Accept Rate</TableHead>
                  <TableHead>Edit Rate</TableHead>
                  <TableHead>Reject Rate</TableHead>
                  <TableHead>Escalation Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.performanceByCategory.length > 0 ? (
                  live.performanceByCategory.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{formatRatio(row.averageConfidence)}</TableCell>
                      <TableCell>{formatPercent(row.acceptanceRate)}</TableCell>
                      <TableCell>{formatPercent(row.editRate)}</TableCell>
                      <TableCell>{formatPercent(row.rejectionRate)}</TableCell>
                      <TableCell>{formatPercent(row.escalationRate)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState text="No category performance data is available." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by intent</CardTitle>
            <CardDescription>Intent-level acceptance and failure profile.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intent</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Accept Rate</TableHead>
                  <TableHead>Avg Confidence</TableHead>
                  <TableHead>Common Failure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.performanceByIntent.length > 0 ? (
                  live.performanceByIntent.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{formatPercent(row.acceptanceRate)}</TableCell>
                      <TableCell>{formatRatio(row.averageConfidence)}</TableCell>
                      <TableCell>
                        {row.mostCommonFailure ? formatMetricLabel(row.mostCommonFailure) : "--"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState text="No intent performance data is available." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confidence distribution</CardTitle>
            <CardDescription>Low, medium, and high confidence interaction buckets.</CardDescription>
          </CardHeader>
          <CardContent>
            {live.confidenceDistribution.length > 0 ? (
              <ChartContainer
                config={{ count: { label: "Count", color: "var(--chart-1)" } }}
                className="h-[260px] w-full"
              >
                <BarChart data={live.confidenceDistribution}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No confidence distribution data is available." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Failure reason distribution</CardTitle>
            <CardDescription>Most common agent-reported quality problems.</CardDescription>
          </CardHeader>
          <CardContent>
            {live.failureReasons.length > 0 ? (
              <ChartContainer
                config={{ count: { label: "Count", color: "var(--chart-4)" } }}
                className="h-[260px] w-full"
              >
                <BarChart data={live.failureReasons}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState text="No failure reason data is available." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Low confidence queue</CardTitle>
          <CardDescription>
            Interactions that deserve review or conversion into error cases.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interaction ID</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Agent Action</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {live.lowConfidenceQueue.length > 0 ? (
                live.lowConfidenceQueue.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{titleCase(row.mode)}</TableCell>
                    <TableCell>{row.category ?? "--"}</TableCell>
                    <TableCell>{row.intent ?? "--"}</TableCell>
                    <TableCell>{row.priority ?? "--"}</TableCell>
                    <TableCell>{formatRatio(row.confidence)}</TableCell>
                    <TableCell>{row.action ? titleCase(row.action) : "--"}</TableCell>
                    <TableCell>{formatShortDate(row.createdAt)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState text="No low-confidence interactions are queued for review." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorsTab({
  dashboard,
  onErrorSelect,
}: {
  dashboard: AnalyticsDashboardData;
  onErrorSelect: (error: ErrorCase) => void;
}) {
  const errors = dashboard.errors;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={AlertTriangle}
          label="Total Errors"
          value={formatCount(errors.total)}
          tone="danger"
        />
        <MetricCard
          icon={ShieldAlert}
          label="Critical Errors"
          value={formatCount(errors.critical)}
          tone="danger"
        />
        <MetricCard
          icon={Radar}
          label="High Severity Errors"
          value={formatCount(errors.highSeverity)}
          tone="warning"
        />
        <MetricCard
          icon={Sparkles}
          label="Unresolved Errors"
          value={formatCount(errors.unresolved)}
          tone="warning"
        />
        <MetricCard
          icon={BarChart3}
          label="Most Common Type"
          value={errors.mostCommonType ? formatMetricLabel(errors.mostCommonType) : "--"}
        />
        <MetricCard
          icon={Layers3}
          label="Most Affected Module"
          value={errors.mostAffectedModule ? titleCase(errors.mostAffectedModule) : "--"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SummaryBarChartCard
          title="Error count by severity"
          description="Critical, high, medium, and low error volumes."
          rows={errors.bySeverity}
          color="var(--chart-4)"
        />
        <SummaryBarChartCard
          title="Error count by type"
          description="Most common failure modes."
          rows={errors.byType.slice(0, 8)}
          color="var(--chart-1)"
        />
        <SummaryBarChartCard
          title="Error count by module"
          description="Which subsystem is most affected."
          rows={errors.byModule}
          color="var(--chart-3)"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Error case table</CardTitle>
          <CardDescription>
            Open a record to inspect expected behavior, actual behavior, and resolution status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Error Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Resolved</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.recent.length > 0 ? (
                errors.recent.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell>{titleCase(error.sourceType)}</TableCell>
                    <TableCell>{titleCase(error.module)}</TableCell>
                    <TableCell>{formatMetricLabel(error.errorType)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          error.severity.toLowerCase() === "critical" ? "destructive" : "secondary"
                        }
                        className="capitalize"
                      >
                        {error.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate">{error.description}</TableCell>
                    <TableCell>{error.resolved ? "Yes" : "No"}</TableCell>
                    <TableCell>{formatShortDate(error.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => onErrorSelect(error)}>
                        View details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState text="No error analysis rows are available." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DatasetsTab({
  dashboard,
  onExampleSelect,
}: {
  dashboard: AnalyticsDashboardData;
  onExampleSelect: (example: DatasetExample) => void;
}) {
  const dataset = dashboard.dataset;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Database} label="Candidate Examples" value={formatCount(dataset.total)} />
        <MetricCard
          icon={FlaskConical}
          label="Approved Examples"
          value={formatCount(dataset.approved)}
          tone="success"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Rejected Examples"
          value={formatCount(dataset.rejected)}
          tone="danger"
        />
        <MetricCard
          icon={DatabaseZap}
          label="Pending Review"
          value={formatCount(dataset.pending)}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate dataset examples</CardTitle>
            <CardDescription>
              Open an example to review the source payload and the target payload.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Example ID</TableHead>
                  <TableHead>Task Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataset.examples.length > 0 ? (
                  dataset.examples.map((example) => (
                    <TableRow key={example.id}>
                      <TableCell className="font-medium">{example.id}</TableCell>
                      <TableCell>{formatMetricLabel(example.taskType)}</TableCell>
                      <TableCell>{example.category ?? "--"}</TableCell>
                      <TableCell>{example.intent ?? "--"}</TableCell>
                      <TableCell>
                        {example.qualityScore != null ? `${example.qualityScore}/5` : "--"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            example.approvalStatus.toLowerCase() === "approved"
                              ? "default"
                              : example.approvalStatus.toLowerCase() === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {titleCase(example.approvalStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatShortDate(example.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onExampleSelect(example)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState text="No fine-tuning examples are available." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export and approval flow</CardTitle>
            <CardDescription>
              Use this page to turn production feedback into future datasets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-surface/70 p-4">
              <div className="font-medium text-foreground">Approval checklist</div>
              <ul className="mt-3 space-y-2">
                <li>PII masked before export.</li>
                <li>Target output is safe and policy-aligned.</li>
                <li>No unsupported claim or hallucinated promise.</li>
                <li>Example is useful for training, evaluation, or regression coverage.</li>
                <li>Duplicate examples are removed before export.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface/70 p-4">
              <div className="font-medium text-foreground">Average quality score</div>
              <div className="mt-1 text-3xl font-semibold text-foreground">
                {formatRating(dataset.averageQuality)}
              </div>
              <div className="mt-1 text-xs">
                This score reflects current candidate quality before final approval.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.ComponentProps<typeof Input>["type"];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ConceptCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  tone,
}: {
  icon: typeof BarChart3;
  eyebrow: string;
  title: string;
  description: string;
  tone: "blue" | "amber";
}) {
  const toneClasses =
    tone === "blue" ? "border-primary/25 bg-primary/5" : "border-warning/30 bg-warning/10";

  return (
    <Card className={toneClasses}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-background/80">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="text-base font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  );
}

function BenchmarkHeadlineCard({
  card,
}: {
  card: AnalyticsDashboardData["overview"]["benchmarkCards"][number];
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {card.label}
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">
          {formatMetricValue(card.metricValue)}
        </div>
        <div className="mt-2 text-sm font-medium">{formatMetricLabel(card.metricName)}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {card.memberName ?? "Member"} {card.versionLabel ? `· ${card.versionLabel}` : ""}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger" | "ai";
}) {
  const toneClass = {
    default: "bg-muted text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    danger: "bg-danger/10 text-danger",
    ai: "bg-ai-soft text-ai",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
          </div>
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  insight,
}: {
  insight: AnalyticsDashboardData["overview"]["insights"][number];
}) {
  const toneClass = {
    default: "border-border bg-surface/70",
    success: "border-success/25 bg-success/8",
    warning: "border-warning/25 bg-warning/8",
    ai: "border-ai/25 bg-ai-soft/30",
  }[insight.tone];

  return (
    <Card className={toneClass}>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {insight.label}
        </div>
        <div className="mt-2 text-xl font-semibold">{insight.value}</div>
        <div className="mt-2 text-sm text-muted-foreground">{insight.detail}</div>
      </CardContent>
    </Card>
  );
}

function MiniSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/70 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

function SummaryBarChartCard({
  title,
  description,
  rows,
  color,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; count: number }>;
  color: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <ChartContainer
            config={{ count: { label: "Count", color } }}
            className="h-[250px] w-full"
          >
            <BarChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={36} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]}>
                {rows.map((row) => (
                  <Cell key={row.label} fill="var(--color-count)" />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyState text="No data is available for this chart." />
        )}
      </CardContent>
    </Card>
  );
}

function RunDetailContent({ run }: { run: BenchmarkRun | null }) {
  if (!run) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailCard label="Run Name" value={run.runName} />
        <DetailCard label="Member" value={run.memberName ?? "--"} />
        <DetailCard label="Module" value={titleCase(run.module)} />
        <DetailCard label="Model" value={run.modelVersion ?? run.modelName ?? "--"} />
        <DetailCard label="Dataset" value={run.datasetName ?? "--"} />
        <DetailCard
          label="Dataset Size"
          value={run.datasetSize != null ? String(run.datasetSize) : "--"}
        />
        <DetailCard label="Prompt Version" value={run.promptVersion ?? "--"} />
        <DetailCard label="Retrieval Version" value={run.retrievalVersion ?? "--"} />
        <DetailCard label="MLflow Run ID" value={run.mlflowRunId ?? "--"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.metrics.length > 0 ? (
                run.metrics.map((metric) => (
                  <TableRow key={metric.name}>
                    <TableCell className="font-medium">{formatMetricLabel(metric.name)}</TableCell>
                    <TableCell>{formatMetricValue(metric.value)}</TableCell>
                    <TableCell>{metric.unit ?? "--"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>
                    <EmptyState text="No metric rows were returned for this run." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {run.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{run.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ErrorDetailContent({ error }: { error: ErrorCase }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailCard label="Error ID" value={error.id} />
        <DetailCard label="Source Type" value={titleCase(error.sourceType)} />
        <DetailCard label="Module" value={titleCase(error.module)} />
        <DetailCard label="Error Type" value={formatMetricLabel(error.errorType)} />
        <DetailCard label="Severity" value={titleCase(error.severity)} />
        <DetailCard label="Resolved" value={error.resolved ? "Yes" : "No"} />
        <DetailCard label="Ticket ID" value={error.ticketId ?? "--"} />
        <DetailCard label="Interaction ID" value={error.interactionId ?? "--"} />
        <DetailCard label="Created" value={formatFullDate(error.createdAt)} />
      </div>

      <DetailBlock title="Description" value={error.description} />
      <DetailBlock
        title="Expected Behavior"
        value={error.expectedBehavior ?? "No expected behavior supplied."}
      />
      <DetailBlock
        title="Actual Behavior"
        value={error.actualBehavior ?? "No actual behavior supplied."}
      />
    </div>
  );
}

function DatasetExampleContent({ example }: { example: DatasetExample }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailCard label="Example ID" value={example.id} />
        <DetailCard label="Task Type" value={formatMetricLabel(example.taskType)} />
        <DetailCard label="Approval Status" value={titleCase(example.approvalStatus)} />
        <DetailCard
          label="Quality Score"
          value={example.qualityScore != null ? `${example.qualityScore}/5` : "--"}
        />
        <DetailCard label="Category" value={example.category ?? "--"} />
        <DetailCard label="Intent" value={example.intent ?? "--"} />
        <DetailCard label="Source Feedback ID" value={example.sourceFeedbackId ?? "--"} />
        <DetailCard label="Source Interaction ID" value={example.sourceInteractionId ?? "--"} />
        <DetailCard label="Created" value={formatFullDate(example.createdAt)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <JsonCard title="Input JSON" value={example.inputJson} />
        <JsonCard title="Target JSON" value={example.targetJson} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>PII masked before export.</div>
          <div>Target answer is safe and policy-aligned.</div>
          <div>No unsupported policy claim or hallucinated promise.</div>
          <div>Example adds useful training, evaluation, or regression coverage.</div>
          <div>Duplicate examples removed.</div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function DetailBlock({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{value}</CardContent>
    </Card>
  );
}

function JsonCard({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 text-xs">
          {value ? JSON.stringify(value, null, 2) : "No JSON payload available."}
        </pre>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function pickRunHeadlineMetric(run: BenchmarkRun) {
  return run.metrics[0] ?? null;
}

function buildMetricChartConfig(metricNames: string[]) {
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
  return Object.fromEntries(
    metricNames.map((metric, index) => [
      metric,
      { label: formatMetricLabel(metric), color: colors[index] },
    ]),
  );
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
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
  return `${Math.round(value * 100)}%`;
}

function formatRatio(value: number | null) {
  if (value == null) return "--";
  return value.toFixed(2);
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

function formatMetricValue(value: number | null) {
  if (value == null) return "--";
  if (value >= 0 && value <= 1) return `${Math.round(value * 100)}%`;
  return value.toFixed(2);
}

function formatShortDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatFullDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
