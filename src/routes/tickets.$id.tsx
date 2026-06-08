import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PriorityBadge, SentimentBadge, StatusBadge, FlagBadge, ConfidenceBadge,
  AINotice, HumanReviewLabel,
} from "@/components/badges";
import { CitationCard } from "@/components/citation-card";
import { tickets, knowledgeSources } from "@/lib/mock-data";
import { maskEmail, maskPhone, maskCard } from "@/lib/mask";
import {
  ArrowLeft, Send, ShieldAlert, Sparkles, RotateCw, Check, X, ChevronDown,
  User, Tag, Clock, Workflow,
} from "lucide-react";

export const Route = createFileRoute("/tickets/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — Sentinel Copilot` }] }),
  loader: ({ params }) => {
    const t = tickets.find((x) => x.id === params.id);
    if (!t) throw notFound();
    return { ticket: t };
  },
  component: TicketDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="p-10 text-center text-sm text-muted-foreground">Ticket not found.</div>
    </AppShell>
  ),
});

const DRAFTS: Record<string, string> = {
  "TCK-001": `Hi John,

Thanks for flagging the duplicate $129 charge on May 14th — I can see two identical authorizations on the card ending 4242. Per our duplicate-charge policy [KB-01], you're eligible for an immediate refund of the second charge.

I've issued the refund — you'll see it on your statement in 3–5 business days. I've also added a one-time credit of $10 for the inconvenience. Reference: REF-58210.

If anything else looks off, just reply to this thread and I'll jump back in.

— Sentinel Support`,
  "TCK-002": `Hi Maya,

Sorry about the lockout — I'm unlocking your account now. Per our login troubleshooting guide [KB-02], the issue is likely a cached credential from the old reset link.

Please:
1. Close all browser windows for our app
2. Use the new reset link I just sent (valid 30 minutes)
3. Set a fresh password

If you still can't get in after that, reply here and I'll escalate to manual verification.

— Sentinel Support`,
  "TCK-003": `Hi Aung,

Thanks for the detailed report on the empty analytics chart in Safari 17. I've filed this as BUG-2241 and tagged it for the data viz team.

Workaround while we ship a fix: toggle the chart's "Aggregate by day" filter off and back on, or use Chrome/Firefox. I'll update this ticket the moment we have a build.

— Sentinel Support`,
  "TCK-004": `[HUMAN-ONLY] Draft suppressed.

This ticket combines a security_issue with a VIP enterprise customer. Per SLA policy [KB-04], AI drafting is disabled. Please respond directly and follow the account-takeover runbook.`,
};

function CITATIONS_FOR(id: string) {
  if (id === "TCK-001") return [{ s: knowledgeSources[0], r: 0.94 }, { s: knowledgeSources[5], r: 0.81 }, { s: knowledgeSources[4], r: 0.62 }];
  if (id === "TCK-002") return [{ s: knowledgeSources[1], r: 0.91 }, { s: knowledgeSources[2], r: 0.76 }];
  if (id === "TCK-003") return [{ s: knowledgeSources[1], r: 0.42 }];
  if (id === "TCK-004") return [{ s: knowledgeSources[3], r: 0.88 }, { s: knowledgeSources[2], r: 0.74 }];
  return [];
}

function TicketDetail() {
  const { ticket } = Route.useLoaderData();
  const [draft, setDraft] = useState(DRAFTS[ticket.id] ?? "");
  const [edited, setEdited] = useState(false);
  const citations = useMemo(() => CITATIONS_FOR(ticket.id), [ticket.id]);
  const humanOnly = ticket.flags.includes("security_issue") || ticket.flags.includes("vip_customer");

  return (
    <AppShell>
      <div className="border-b border-border bg-surface px-6 py-4">
        <Link to="/tickets" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to tickets
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{ticket.id}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{ticket.category} / {ticket.intent}</span>
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{ticket.subject}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge value={ticket.priority} />
            <SentimentBadge value={ticket.sentiment} />
            <StatusBadge value={ticket.status} />
            <ConfidenceBadge value={ticket.confidence} />
          </div>
        </div>
        {ticket.flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ticket.flags.map((f) => <FlagBadge key={f} flag={f} />)}
            {humanOnly && <HumanReviewLabel />}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {humanOnly && (
            <Card className="border-danger/40 bg-danger/5">
              <CardContent className="flex items-start gap-3 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-danger" />
                <div className="text-sm">
                  <div className="font-semibold text-danger">High-risk escalation — human response required</div>
                  <div className="text-muted-foreground">
                    AI drafting is suppressed. Follow the {ticket.intent.replace("_", " ")} runbook and engage on-call security.
                  </div>
                </div>
                <Button size="sm" variant="destructive" className="ml-auto">Open runbook</Button>
              </CardContent>
            </Card>
          )}

          {/* Conversation */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conversation
              </div>
              <div className="divide-y divide-border">
                <Message from="customer" name={ticket.customer} at={ticket.createdAt.slice(11, 16)} text={ticket.body} />
                {ticket.conversation.slice(1).map((m, i) => (
                  <Message key={i} from={m.from} name={m.from === "system" ? "System" : ticket.customer} at={m.at} text={m.text} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI analysis */}
          <Card className="ai-gradient border-ai/30">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-md bg-ai text-ai-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">AI analysis</div>
                    <div className="text-[11px] text-muted-foreground">Triaged 4s ago · gpt-sentinel-1</div>
                  </div>
                </div>
                <ConfidenceBadge value={ticket.confidence} />
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <Field icon={Tag} label="Detected intent" value={ticket.intent.replace("_", " ")} />
                <Field icon={Workflow} label="Suggested workflow" value={
                  ticket.intent === "refund_request" ? "Verify charge → Issue refund → Notify customer" :
                  ticket.intent === "login_issue" ? "Unlock account → Send reset → Confirm access" :
                  ticket.intent === "bug_report" ? "Reproduce → File bug → Reply with ETA" :
                  "Escalate to security on-call"
                } />
                <Field icon={Clock} label="SLA target" value={ticket.priority === "Urgent" ? "15 min (enterprise)" : "4 hours"} />
                <Field icon={User} label="Customer history" value={
                  ticket.customer.includes("Enterprise") ? "Enterprise · since 2022 · 47 tickets" : "Standard · since 2024 · 3 tickets"
                } />
              </dl>
            </CardContent>
          </Card>

          {/* Draft editor */}
          <Card className="border-2 border-primary/30 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-5 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-ai" />
                  <span className="text-sm font-semibold">Proposed reply</span>
                  {!humanOnly && <AINotice />}
                  <HumanReviewLabel />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" disabled={humanOnly}><RotateCw className="mr-1.5 h-3.5 w-3.5" />Regenerate</Button>
                  <Button variant="outline" size="sm">
                    Tone <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-5">
                <Textarea
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setEdited(true); }}
                  disabled={humanOnly}
                  className="min-h-[260px] font-sans text-sm leading-relaxed"
                />
                {edited && !humanOnly && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Your edits will be logged in the audit trail.
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-elevated px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
                    <X className="mr-1.5 h-3.5 w-3.5" /> Reject draft
                  </Button>
                  <Button variant="outline" size="sm">
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Save as-is
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Sends from <span className="font-mono">support@sentinel.app</span></span>
                  <Button size="sm" disabled={humanOnly}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Approve & send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {ticket.customer.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{ticket.customer}</div>
                  <div className="font-mono text-xs text-muted-foreground">{maskEmail(ticket.email)}</div>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-xs">
                {ticket.phone && (
                  <Row label="Phone"><span className="font-mono">{maskPhone(ticket.phone)}</span></Row>
                )}
                <Row label="Card on file"><span className="font-mono">{maskCard("4242 4242 4242 4242")}</span></Row>
                <Row label="Plan">{ticket.customer.includes("Enterprise") ? "Enterprise" : "Pro"}</Row>
                <Row label="Lifetime value">${ticket.customer.includes("Enterprise") ? "184,200" : "1,288"}</Row>
              </dl>
              <div className="mt-3 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-[11px] text-success">
                ✓ All PII masked in AI prompts and logs
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Citations</div>
                <span className="text-[11px] text-muted-foreground">{citations.length} sources</span>
              </div>
              <div className="space-y-2">
                {citations.map(({ s, r }) => <CitationCard key={s.id} source={s} relevance={r} />)}
                {citations.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No knowledge sources matched with sufficient confidence.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested actions</div>
              <div className="space-y-1.5">
                <ActionBtn label="Issue refund of $129" />
                <ActionBtn label="Apply $10 goodwill credit" />
                <ActionBtn label="Tag account: payment_retry_disabled" />
                <ActionBtn label="Schedule 24h follow-up" />
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground">
                Actions require approval. Nothing executes without your click.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Message({ from, name, at, text }: { from: "customer" | "agent" | "system" | "ai"; name: string; at: string; text: string }) {
  const isSystem = from === "system";
  return (
    <div className={`flex gap-3 px-5 py-4 ${isSystem ? "bg-muted/40" : ""}`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
        isSystem ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"
      }`}>
        {isSystem ? "SYS" : name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-[11px] text-muted-foreground">{at}</span>
        </div>
        <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{text}</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface/70 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium capitalize">{value}</dd>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ActionBtn({ label }: { label: string }) {
  return (
    <button className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left text-xs font-medium transition hover:border-primary/40 hover:bg-muted/50">
      {label}
      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground" />
    </button>
  );
}
