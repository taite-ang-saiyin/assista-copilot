import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { liveChats } from "@/lib/mock-data";
import { PriorityBadge, SentimentBadge, FlagBadge } from "@/components/badges";
import { ArrowRight, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/chat/")({
  head: () => ({ meta: [{ title: "Live chat — Sentinel" }] }),
  component: ChatList,
});

function ChatList() {
  return (
    <AppShell>
      <PageHeader
        title="Live chat queue"
        subtitle="Real-time conversations with AI assist in the sidebar."
      />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {liveChats.map((c) => (
            <Link key={c.id} to="/chat/$id" params={{ id: c.id }}>
              <Card className="transition hover:border-primary/40 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {c.customer.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">{c.customer}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{c.id} · {c.email.split("@")[1]}</div>
                        </div>
                        {c.unread > 0 && (
                          <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-danger-foreground">
                            {c.unread} new
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm">{c.topic}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <PriorityBadge value={c.priority} />
                        <SentimentBadge value={c.sentiment} />
                        {c.flags.map((f) => <FlagBadge key={f} flag={f} />)}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {c.messages.length} messages
                        </span>
                        <span className="flex items-center gap-1 font-medium text-primary">
                          Join chat <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
