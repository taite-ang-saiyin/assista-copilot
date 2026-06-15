import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/app-shell";
import {
  FlagBadge,
  HumanReviewLabel,
  PriorityBadge,
  SentimentBadge,
  StatusBadge,
} from "@/components/badges";
import { getSupportOverview } from "@/lib/api/support.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Inbox,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel - AI Support Copilot" },
      { name: "description", content: "AI-powered, human-supervised support operations dashboard." },
    ],
  }),
  component: Overview,
});

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Inbox;
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
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className={`grid h-9 w-9 place-items-center rounded-md ${toneCls}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Overview() {
  const overviewQuery = useQuery({
    queryKey: ["support-overview"],
    queryFn: () => getSupportOverview({ data: {} }),
    refetchInterval: 10_000,
  });

  const overview = overviewQuery.data;

  return (
    <AppShell>
      <PageHeader
        title="Support operations"
        subtitle={`Live dashboard snapshot - ${formatLongDate(new Date().toISOString())}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void overviewQuery.refetch()}
            disabled={overviewQuery.isFetching}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", overviewQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        {overviewQuery.error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {overviewQuery.error.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Open tickets"
            value={overview ? String(overview.openTickets) : "-"}
            hint="Current unresolved support tickets"
            icon={Inbox}
          />
          <Stat
            label="AI drafted"
            value={overview ? String(overview.aiDraftedCount) : "-"}
            hint="Tickets with persisted AI drafts"
            icon={Sparkles}
            tone="ai"
          />
          <Stat
            label="Escalations"
            value={overview ? String(overview.escalationsCount) : "-"}
            hint="Open escalations across tickets and chats"
            icon={AlertTriangle}
            tone="warning"
          />
          <Stat
            label="Avg. resolution"
            value={overview ? formatDuration(overview.avgResolutionMinutes) : "-"}
            hint="Based on resolved tickets in Supabase"
            icon={TrendingUp}
            tone="success"
          />
        </div>

        {overviewQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading dashboard data...
            </CardContent>
          </Card>
        )}

        {overview && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Recent tickets</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Latest ticket activity with persisted AI state
                  </p>
                </div>
                <Link to="/tickets" className="text-xs font-medium text-primary hover:underline">
                  View all {"->"}
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {overview.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to="/tickets/$id"
                      params={{ id: ticket.id }}
                      className="block px-5 py-3.5 transition hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex w-32 shrink-0 flex-col">
                          <span className="font-mono text-xs text-muted-foreground">{ticket.trackingCode}</span>
                          <span className="mt-0.5 text-[11px] text-muted-foreground">{ticket.category}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{ticket.subject}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{ticket.customerName}</div>
                          {ticket.flags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {ticket.flags.map((flag) => (
                                <FlagBadge key={flag} flag={flag} />
                              ))}
                              {ticket.flags.some((flag) =>
                                ["security_issue", "vip_customer", "low_confidence"].includes(flag),
                              ) && <HumanReviewLabel />}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          <PriorityBadge value={ticket.priority} />
                          <SentimentBadge value={ticket.sentiment} />
                          <StatusBadge value={ticket.status} />
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base">Live chats</CardTitle>
                  <Link to="/chat" className="text-xs font-medium text-primary hover:underline">
                    Open {"->"}
                  </Link>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {overview.chats.map((chat) => (
                    <Link
                      key={chat.id}
                      to="/chat/$id"
                      params={{ id: chat.id }}
                      className="flex items-start gap-3 rounded-md p-2 transition hover:bg-muted/50"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {chat.customerName
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{chat.customerName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{chat.messagesCount}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{chat.briefDescription}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <PriorityBadge value={chat.priority} />
                          <SentimentBadge value={chat.sentiment} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-ai" /> AI activity stream
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                  {overview.events.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 text-xs">
                      <div
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          event.risk === "high"
                            ? "bg-danger"
                            : event.risk === "medium"
                              ? "bg-warning"
                              : "bg-success"
                        }`}
                      />
                      <div className="flex-1">
                        <div>
                          <span className="font-semibold text-foreground">{event.actor}</span>{" "}
                          <span className="text-muted-foreground">{event.action.toLowerCase()}</span>{" "}
                          <span className="font-mono text-foreground">{event.target}</span>
                        </div>
                        <div className="text-muted-foreground">{event.detail}</div>
                      </div>
                      <span className="font-mono text-muted-foreground">{formatShortDate(event.at)}</span>
                    </div>
                  ))}
                  <Link to="/audit" className="block pt-2 text-xs font-medium text-primary hover:underline">
                    Open audit snapshot {"->"}
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <MessageSquare className="mt-0.5 h-5 w-5 text-warning-foreground" />
            <div className="text-sm">
              <div className="font-semibold">Human review stays in the loop for risky replies.</div>
              <div className="text-muted-foreground">
                Security, VIP, and low-confidence cases can now be escalated and tracked directly from the UI.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return "N/A";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
