import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/app-shell";
import { getSupportOverview } from "@/lib/api/support.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit log - Sentinel" }] }),
  component: Audit,
});

function Audit() {
  const overviewQuery = useQuery({
    queryKey: ["support-overview"],
    queryFn: () => getSupportOverview({ data: {} }),
    refetchInterval: 10_000,
  });

  const events = overviewQuery.data?.events ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Audit log"
        subtitle="Latest persisted AI and agent actions from Supabase."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void overviewQuery.refetch()}
            disabled={overviewQuery.isFetching}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", overviewQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        {overviewQuery.error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {overviewQuery.error.message}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-[160px_90px_90px_180px_1fr_140px] gap-3 border-b border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Timestamp</div>
              <div>Actor</div>
              <div>Risk</div>
              <div>Action</div>
              <div>Detail</div>
              <div>Target</div>
            </div>

            {overviewQuery.isLoading && (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading audit events...
              </div>
            )}

            {!overviewQuery.isLoading && events.length > 0 && (
              <div className="divide-y divide-border">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-[160px_90px_90px_180px_1fr_140px] items-center gap-3 px-5 py-3 text-sm"
                  >
                    <div className="font-mono text-xs text-muted-foreground">{formatTimestamp(event.at)}</div>
                    <div>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          event.actor === "AI"
                            ? "bg-ai-soft text-ai"
                            : event.actor === "Agent"
                              ? "bg-info/10 text-info"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {event.actor}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          event.risk === "high"
                            ? "bg-danger"
                            : event.risk === "medium"
                              ? "bg-warning"
                              : "bg-success"
                        }`}
                      />
                      <span className="ml-1.5 text-xs capitalize">{event.risk}</span>
                    </div>
                    <div className="font-medium">{event.action}</div>
                    <div className="text-muted-foreground">{event.detail}</div>
                    <div className="font-mono text-xs">{event.target}</div>
                  </div>
                ))}
              </div>
            )}

            {!overviewQuery.isLoading && events.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No audit events are available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-success/10">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-success" />
            <div className="text-sm">
              <div className="font-semibold text-success">Audit coverage is active.</div>
              <div className="text-muted-foreground">
                Draft generation, approvals, sends, rejections, and escalations are now recorded through the UI flows.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
