import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriorityBadge, SentimentBadge, StatusBadge, FlagBadge, ConfidenceBadge } from "@/components/badges";
import { tickets } from "@/lib/mock-data";
import { maskEmail } from "@/lib/mask";
import { Filter, Sparkles, ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/tickets/")({
  head: () => ({ meta: [{ title: "Tickets — Sentinel" }] }),
  component: TicketList,
});

const TABS = ["All", "AI drafted", "Needs human", "Escalated", "Resolved"] as const;

function TicketList() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");

  const filtered = tickets.filter((t) => {
    if (tab === "AI drafted" && t.status !== "Drafted") return false;
    if (tab === "Needs human" && !t.flags.some((f) => ["security_issue", "vip_customer", "low_confidence"].includes(f))) return false;
    if (tab === "Escalated" && t.status !== "Escalated") return false;
    if (tab === "Resolved" && t.status !== "Resolved") return false;
    if (q && !`${t.id} ${t.customer} ${t.subject}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <PageHeader
        title="Tickets"
        subtitle="AI triages and drafts. You decide."
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="mr-1.5 h-4 w-4" />Filters</Button>
            <Button size="sm"><Sparkles className="mr-1.5 h-4 w-4" />Run AI triage</Button>
          </>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative w-72 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by id, customer, subject" className="pl-9" />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[110px_1fr_140px_140px_120px_24px] gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div>Ticket</div>
                <div>Subject</div>
                <div>Priority</div>
                <div>Sentiment</div>
                <div>Status</div>
                <div />
              </div>
              {filtered.map((t) => (
                <Link
                  key={t.id}
                  to="/tickets/$id"
                  params={{ id: t.id }}
                  className="grid grid-cols-[110px_1fr_140px_140px_120px_24px] items-center gap-3 px-5 py-3.5 transition hover:bg-muted/50"
                >
                  <div>
                    <div className="font-mono text-xs">{t.id}</div>
                    <div className="text-[11px] text-muted-foreground">{t.category}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.subject}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.customer} · <span className="font-mono">{maskEmail(t.email)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <ConfidenceBadge value={t.confidence} />
                      {t.flags.map((f) => <FlagBadge key={f} flag={f} />)}
                    </div>
                  </div>
                  <div><PriorityBadge value={t.priority} /></div>
                  <div><SentimentBadge value={t.sentiment} /></div>
                  <div><StatusBadge value={t.status} /></div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
              {filtered.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">No tickets match these filters.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
