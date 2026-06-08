import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PriorityBadge, SentimentBadge, FlagBadge, AINotice, HumanReviewLabel, ConfidenceBadge,
} from "@/components/badges";
import { CitationCard } from "@/components/citation-card";
import { liveChats, knowledgeSources } from "@/lib/mock-data";
import { maskEmail } from "@/lib/mask";
import {
  ArrowLeft, Send, Sparkles, ShieldAlert, RotateCw, Zap, ThumbsUp, ThumbsDown,
  Wand2, Languages, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/chat/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — Live chat` }] }),
  loader: ({ params }) => {
    const chat = liveChats.find((c) => c.id === params.id);
    if (!chat) throw notFound();
    return { chat };
  },
  component: ChatDetail,
  notFoundComponent: () => (
    <AppShell><div className="p-10 text-center text-sm text-muted-foreground">Chat not found.</div></AppShell>
  ),
});

const AI_SUGGESTIONS: Record<string, { reply: string; confidence: number; citations: typeof knowledgeSources }> = {
  "CHAT-101": {
    reply: `I completely understand the urgency, Priya — I'm pulling your admin account now. Per our enterprise SLA [KB-04], I'm engaging on-call security and unlocking the team. Can you confirm the admin email so I can verify? I'll have you back in within 5 minutes.`,
    confidence: 0.62,
    citations: [knowledgeSources[3], knowledgeSources[2]],
  },
  "CHAT-102": {
    reply: `Hi John — yes, I see the refund is being processed now (ref: REF-58210). It will hit your card ending 4242 in 3–5 business days. I've also applied a $10 credit for the inconvenience. Anything else I can confirm for you?`,
    confidence: 0.93,
    citations: [knowledgeSources[0], knowledgeSources[5]],
  },
  "CHAT-103": {
    reply: `Thanks, Devon — based on the prefix you shared, that key was rotated this morning during a scheduled secret rotation. Please regenerate from Settings → API Keys and re-deploy. Let me know if the new key also fails.`,
    confidence: 0.84,
    citations: [knowledgeSources[1]],
  },
  "CHAT-104": {
    reply: `Sasha, I'm sorry for the delay — that's not the experience we want for you. I'm taking ownership now. Could you share the original ticket number, or describe the issue in one line? I'll personally see it through.`,
    confidence: 0.71,
    citations: [knowledgeSources[3]],
  },
};

const QUICK_INTENTS = [
  { icon: Zap, label: "Acknowledge & buy time" },
  { icon: Wand2, label: "Ask clarifying question" },
  { icon: Languages, label: "Translate response" },
];

function ChatDetail() {
  const { chat } = Route.useLoaderData();
  const ai = AI_SUGGESTIONS[chat.id] ?? AI_SUGGESTIONS["CHAT-102"];
  const [composer, setComposer] = useState("");
  const [draft, setDraft] = useState(ai.reply);
  const humanOnly = chat.flags.includes("security_issue") || chat.flags.includes("vip_customer");

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-57px)] grid-cols-[1fr_420px]">
        {/* Chat pane */}
        <div className="flex min-h-0 flex-col border-r border-border bg-surface-elevated">
          <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
            <div className="flex items-center gap-3">
              <Link to="/chat" className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {chat.customer.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="text-sm font-semibold">{chat.customer}</div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{chat.id}</span>
                  <span className="font-mono">·</span>
                  <span className="font-mono">{maskEmail(chat.email)}</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />active
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <PriorityBadge value={chat.priority} />
              <SentimentBadge value={chat.sentiment} />
              {chat.flags.map((f) => <FlagBadge key={f} flag={f} />)}
            </div>
          </div>

          {humanOnly && (
            <div className="border-b border-danger/30 bg-danger/10 px-6 py-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldAlert className="h-4 w-4 text-danger" />
                <span className="font-semibold text-danger">High-risk conversation</span>
                <span className="text-muted-foreground">— AI assists only. Every reply requires your approval.</span>
                <HumanReviewLabel className="ml-auto" />
              </div>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {chat.messages.map((m, i) => {
              const isCustomer = m.from === "customer";
              return (
                <div key={i} className={`flex ${isCustomer ? "" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isCustomer
                      ? "bg-surface border border-border rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}>
                    <p className="whitespace-pre-line">{m.text}</p>
                    <div className={`mt-1 text-[10px] ${isCustomer ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                      {m.at}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span className="flex h-1.5 gap-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:240ms]" />
              </span>
              {chat.customer.split(" ")[0]} is typing…
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-surface p-4">
            <div className="rounded-xl border border-border bg-surface-elevated p-2 focus-within:border-primary/50">
              <Textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Reply to customer… (press / for AI macros)"
                className="min-h-[60px] resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setComposer(draft)}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-ai" /> Insert AI draft
                  </Button>
                  <Button size="sm" variant="ghost"><Wand2 className="mr-1.5 h-3.5 w-3.5" />Improve</Button>
                </div>
                <Button size="sm" disabled={!composer.trim()}>
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Send
                </Button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Shift+Enter for newline · Enter to send</span>
              <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> PII auto-masked in AI prompts</span>
            </div>
          </div>
        </div>

        {/* AI assist sidebar */}
        <aside className="flex min-h-0 flex-col bg-background">
          <div className="border-b border-border bg-surface px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-ai to-primary">
                  <Sparkles className="h-3.5 w-3.5 text-ai-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Live AI assist</div>
                  <div className="text-[11px] text-muted-foreground">Listening to conversation</div>
                </div>
              </div>
              <ConfidenceBadge value={ai.confidence} />
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid grid-cols-3 gap-2">
              {QUICK_INTENTS.map((q) => (
                <button key={q.label}
                  className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-2.5 text-[11px] font-medium transition hover:border-primary/40 hover:bg-muted/50">
                  <q.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-center leading-tight">{q.label}</span>
                </button>
              ))}
            </div>

            <Card className="border-2 border-ai/30 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border bg-ai-soft px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-ai" />
                    <span className="font-semibold text-ai">Suggested reply</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <RotateCw className="mr-1 h-3 w-3" /> Regen
                  </Button>
                </div>
                <div className="p-4">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[140px] border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AINotice />
                      <HumanReviewLabel />
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-muted" title="Helpful">
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-muted" title="Not helpful">
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <Button size="sm" className="mt-3 w-full" onClick={() => setComposer(draft)}>
                    Use this reply
                  </Button>
                </div>
              </CardContent>
            </Card>

            {ai.confidence < 0.7 && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                <div className="font-semibold text-warning-foreground">Low retrieval confidence</div>
                <p className="mt-0.5 text-muted-foreground">
                  Citations don't fully cover this question. Verify carefully or ask the customer for more detail before sending.
                </p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sources used</div>
                <button className="text-[11px] text-muted-foreground hover:text-foreground">
                  All sources <ChevronDown className="ml-0.5 inline h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                {ai.citations.map((s) => <CitationCard key={s.id} source={s} relevance={0.7 + Math.random() * 0.25} />)}
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Detected entities</div>
                <div className="space-y-1.5 text-xs">
                  <EntityRow label="Customer tier" value={chat.flags.includes("vip_customer") ? "Enterprise / VIP" : "Standard"} masked={false} />
                  <EntityRow label="Email" value={maskEmail(chat.email)} masked />
                  <EntityRow label="Ticket history" value="2 open · 14 resolved" masked={false} />
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function EntityRow({ label, value, masked }: { label: string; value: string; masked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-mono">
        {value}
        {masked && <span className="rounded bg-success/15 px-1 text-[9px] font-semibold text-success">MASKED</span>}
      </span>
    </div>
  );
}
