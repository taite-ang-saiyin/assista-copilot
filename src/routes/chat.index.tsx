import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/app-shell";
import { FlagBadge, PriorityBadge, SentimentBadge } from "@/components/badges";
import { getChatSessions } from "@/lib/api/support.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, LoaderCircle, MessageSquare, RefreshCw, Search } from "lucide-react";

export const Route = createFileRoute("/chat/")({
  head: () => ({ meta: [{ title: "Live chat - Sentinel" }] }),
  component: ChatList,
});

const FILTERS = ["All", "Active", "Waiting", "Ended", "Needs review"] as const;

function ChatList() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const sessionsQuery = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => getChatSessions({ data: { limit: 100 } }),
    refetchInterval: 10_000,
  });

  const filtered = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];

    return sessions.filter((session) => {
      if (filter === "Active" && session.status !== "active") return false;
      if (filter === "Waiting" && session.status !== "waiting") return false;
      if (filter === "Ended" && session.status !== "ended") return false;
      if (
        filter === "Needs review" &&
        !session.flags.some((flag) =>
          ["security_issue", "vip_customer", "low_confidence"].includes(flag),
        )
      ) {
        return false;
      }

      if (
        query &&
        !`${session.id} ${session.customerName} ${session.briefDescription} ${session.category}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [filter, query, sessionsQuery.data]);

  return (
    <AppShell>
      <PageHeader
        title="Live chat queue"
        subtitle="Supabase-backed chat sessions with persisted AI suggestions."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void sessionsQuery.refetch()}
            disabled={sessionsQuery.isFetching}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", sessionsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        {sessionsQuery.error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {sessionsQuery.error.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            {FILTERS.map((filterName) => (
              <button
                key={filterName}
                onClick={() => setFilter(filterName)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  filter === filterName
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filterName}
              </button>
            ))}
          </div>

          <div className="relative w-80 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by chat ID, customer, topic"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sessionsQuery.isLoading && (
            <Card className="md:col-span-2">
              <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading chat sessions...
              </CardContent>
            </Card>
          )}

          {!sessionsQuery.isLoading &&
            filtered.map((session) => (
              <Link key={session.id} to="/chat/$id" params={{ id: session.id }}>
                <Card className="transition hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                        {session.customerName
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{session.customerName}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {session.id} - {session.category}
                            </div>
                          </div>
                          <ChatStatusBadge status={session.status} />
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm">{session.briefDescription}</p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <PriorityBadge value={session.priority} />
                          <SentimentBadge value={session.sentiment} />
                          {session.flags.map((flag) => (
                            <FlagBadge key={flag} flag={flag} />
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {session.messagesCount} messages
                          </span>
                          <span className="flex items-center gap-1 font-medium text-primary">
                            Open chat <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

          {!sessionsQuery.isLoading && filtered.length === 0 && (
            <Card className="md:col-span-2">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No chat sessions match these filters.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ChatStatusBadge({ status }: { status: "active" | "waiting" | "ended" }) {
  const label = status[0].toUpperCase() + status.slice(1);
  const classes =
    status === "active"
      ? "border-success/40 bg-success/15 text-success"
      : status === "waiting"
        ? "border-warning/40 bg-warning/10 text-warning-foreground"
        : "border-border bg-muted text-muted-foreground";

  return <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", classes)}>{label}</span>;
}
