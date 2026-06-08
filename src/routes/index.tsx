import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge, SentimentBadge, StatusBadge, FlagBadge, HumanReviewLabel } from "@/components/badges";
import { tickets, liveChats, auditLog } from "@/lib/mock-data";
import { maskEmail } from "@/lib/mask";
import {
  ArrowRight, Sparkles, ShieldCheck, Activity, Inbox, MessageSquare,
  TrendingUp, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel — AI Support Copilot" },
      { name: "description", content: "AI-powered, human-supervised support operations dashboard." },
    ],
  }),
  component: Overview,
});

function Stat({ label, value, hint, icon: Icon, tone = "default" }: {
  label: string; value: string; hint?: string; icon: typeof Inbox;
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
  return (
    <AppShell>
      <PageHeader
        title="Support operations"
        subtitle="Today · Monday, June 8 · 4 humans on shift · 2 AI copilots running"
        actions={
          <>
            <Button variant="outline" size="sm"><ShieldCheck className="mr-1.5 h-4 w-4" />Policy</Button>
            <Button size="sm"><Sparkles className="mr-1.5 h-4 w-4" />New AI run</Button>
          </>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat label="Open tickets" value="184" hint="↑ 12 in last hour" icon={Inbox} />
          <Stat label="AI-drafted" value="71%" hint="129 of 184 with proposed reply" icon={Sparkles} tone="ai" />
          <Stat label="Escalations" value="6" hint="2 enterprise · 1 security" icon={AlertTriangle} tone="warning" />
          <Stat label="Avg. resolution" value="9m 42s" hint="↓ 38% vs last week" icon={TrendingUp} tone="success" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">High-priority queue</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Sorted by SLA risk · Human-only items marked</p>
              </div>
              <Link to="/tickets" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {tickets.map((t) => (
                  <Link
                    key={t.id}
                    to="/tickets/$id"
                    params={{ id: t.id }}
                    className="block px-5 py-3.5 transition hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex w-24 shrink-0 flex-col">
                        <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                        <span className="mt-0.5 text-[11px] text-muted-foreground">{t.category}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{t.subject}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{t.customer}</span>
                          <span>·</span>
                          <span className="font-mono">{maskEmail(t.email)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        <PriorityBadge value={t.priority} />
                        <SentimentBadge value={t.sentiment} />
                        <StatusBadge value={t.status} />
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
                    </div>
                    {t.flags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-28">
                        {t.flags.map((f) => <FlagBadge key={f} flag={f} />)}
                        {(t.flags.includes("security_issue") || t.flags.includes("vip_customer")) && <HumanReviewLabel />}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Live chats</CardTitle>
                <Link to="/chat" className="text-xs font-medium text-primary hover:underline">Open →</Link>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {liveChats.slice(0, 4).map((c) => (
                  <Link key={c.id} to="/chat/$id" params={{ id: c.id }}
                    className="flex items-start gap-3 rounded-md p-2 transition hover:bg-muted/50">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {c.customer.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{c.customer}</span>
                        {c.unread > 0 && (
                          <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-danger-foreground">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.topic}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <PriorityBadge value={c.priority} />
                        <SentimentBadge value={c.sentiment} />
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
                {auditLog.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-xs">
                    <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      a.risk === "high" ? "bg-danger" : a.risk === "medium" ? "bg-warning" : "bg-success"
                    }`} />
                    <div className="flex-1">
                      <div>
                        <span className="font-semibold text-foreground">{a.actor}</span>{" "}
                        <span className="text-muted-foreground">{a.action.toLowerCase()}</span>{" "}
                        <span className="font-mono text-foreground">{a.target}</span>
                      </div>
                      <div className="text-muted-foreground">{a.detail}</div>
                    </div>
                    <span className="font-mono text-muted-foreground">{a.at}</span>
                  </div>
                ))}
                <Link to="/audit" className="block pt-2 text-xs font-medium text-primary hover:underline">
                  Open full audit log →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <MessageSquare className="mt-0.5 h-5 w-5 text-warning-foreground" />
            <div className="text-sm">
              <div className="font-semibold">Reminder: AI never closes enterprise tickets autonomously.</div>
              <div className="text-muted-foreground">
                All drafts go through human review. Drafts flagged "security" or "VIP" are routed to senior agents only.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
