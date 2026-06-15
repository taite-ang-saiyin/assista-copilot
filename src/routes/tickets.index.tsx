import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/app-shell";
import {
  ConfidenceBadge,
  FlagBadge,
  PriorityBadge,
  SentimentBadge,
  StatusBadge,
} from "@/components/badges";
import { getSupportTickets } from "@/lib/api/support.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Filter, LoaderCircle, Search } from "lucide-react";

export const Route = createFileRoute("/tickets/")({
  head: () => ({ meta: [{ title: "Tickets - Sentinel" }] }),
  component: TicketList,
});

const TABS = ["All", "AI drafted", "Needs human", "Escalated", "Resolved"] as const;

function TicketList() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => getSupportTickets({ data: { limit: 100 } }),
    refetchInterval: 10_000,
  });

  const filtered = useMemo(() => {
    const rows = ticketsQuery.data ?? [];

    return rows.filter((ticket) => {
      if (tab === "AI drafted" && ticket.status !== "Drafted") return false;
      if (
        tab === "Needs human" &&
        !ticket.flags.some((flag) =>
          ["security_issue", "vip_customer", "low_confidence"].includes(flag),
        )
      ) {
        return false;
      }
      if (tab === "Escalated" && ticket.status !== "Escalated") return false;
      if (tab === "Resolved" && ticket.status !== "Resolved") return false;
      if (
        query &&
        !`${ticket.trackingCode} ${ticket.customerName} ${ticket.subject}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [query, tab, ticketsQuery.data]);

  return (
    <AppShell>
      <PageHeader
        title="Tickets"
        subtitle="Supabase-backed ticket queue with persisted AI drafts."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="mr-1.5 h-4 w-4" />
              Filters
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-6">
        {ticketsQuery.error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {ticketsQuery.error.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            {TABS.map((tabName) => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  tab === tabName
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tabName}
              </button>
            ))}
          </div>

          <div className="relative w-72 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code, customer, subject"
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[150px_1fr_140px_140px_120px_24px] gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div>Ticket</div>
                <div>Subject</div>
                <div>Priority</div>
                <div>Sentiment</div>
                <div>Status</div>
                <div />
              </div>

              {ticketsQuery.isLoading && (
                <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading tickets...
                </div>
              )}

              {!ticketsQuery.isLoading &&
                filtered.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to="/tickets/$id"
                    params={{ id: ticket.id }}
                    className="grid grid-cols-[150px_1fr_140px_140px_120px_24px] items-center gap-3 px-5 py-3.5 transition hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-mono text-xs">{ticket.trackingCode}</div>
                      <div className="text-[11px] text-muted-foreground">{ticket.category}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{ticket.subject}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {ticket.customerName}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <ConfidenceBadge value={ticket.confidence} />
                        {ticket.flags.map((flag) => (
                          <FlagBadge key={flag} flag={flag} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <PriorityBadge value={ticket.priority} />
                    </div>
                    <div>
                      <SentimentBadge value={ticket.sentiment} />
                    </div>
                    <div>
                      <StatusBadge value={ticket.status} />
                    </div>
                    <div className="text-muted-foreground">›</div>
                  </Link>
                ))}

              {!ticketsQuery.isLoading && filtered.length === 0 && (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No tickets match these filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
