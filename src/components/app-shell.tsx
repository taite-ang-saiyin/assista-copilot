import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getKnowledgeDocuments } from "@/lib/api/copilot.functions";
import {
  getSupportOverview,
  getSupportTickets,
  getChatSessions,
} from "@/lib/api/support.functions";
import { getWorkspaceHealth } from "@/lib/api/workspace.functions";
import { cn } from "@/lib/utils";

const nav: {
  to: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  keywords: string[];
}[] = [
  {
    to: "/",
    label: "Overview",
    description: "Support operations dashboard",
    icon: LayoutDashboard,
    exact: true,
    keywords: ["dashboard", "home", "overview"],
  },
  {
    to: "/tickets",
    label: "Tickets",
    description: "Browse and manage ticket queue",
    icon: Ticket,
    keywords: ["support", "cases", "queue"],
  },
  {
    to: "/chat",
    label: "Live chat",
    description: "Monitor active customer chats",
    icon: MessageSquare,
    keywords: ["chat", "conversation", "live"],
  },
  {
    to: "/knowledge",
    label: "Knowledge",
    description: "Search and manage retrieval sources",
    icon: BookOpen,
    keywords: ["docs", "rag", "knowledge base", "retrieval"],
  },
  {
    to: "/analytics",
    label: "Analytics",
    description: "AI quality monitoring and benchmarks",
    icon: BarChart3,
    keywords: ["metrics", "quality", "monitoring"],
  },
  {
    to: "/audit",
    label: "Audit log",
    description: "Review audit events and system traceability",
    icon: ShieldCheck,
    keywords: ["audit", "events", "history"],
  },
];

type HeaderNotification = {
  id: string;
  title: string;
  detail: string;
  tone: "high" | "medium" | "info";
  to: "/tickets" | "/chat" | "/knowledge" | "/analytics";
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => getSupportTickets({ data: { limit: 100 } }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const chatsQuery = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => getChatSessions({ data: { limit: 100 } }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const overviewQuery = useQuery({
    queryKey: ["support-overview"],
    queryFn: () => getSupportOverview({ data: {} }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const docsQuery = useQuery({
    queryKey: ["knowledge-docs", "header"],
    queryFn: () =>
      getKnowledgeDocuments({
        data: {
          limit: 50,
          offset: 0,
        },
      }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const healthQuery = useQuery({
    queryKey: ["workspace-health"],
    queryFn: () => getWorkspaceHealth({ data: undefined }),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const ticketRows = useMemo(() => ticketsQuery.data ?? [], [ticketsQuery.data]);
  const chatRows = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const knowledgeDocs = useMemo(() => docsQuery.data?.items ?? [], [docsQuery.data?.items]);

  const filteredShortcuts = useMemo(() => {
    if (!normalizedSearch) return nav;

    return nav.filter((item) =>
      [item.label, item.description, ...item.keywords]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const filteredTickets = useMemo(() => {
    const rows = normalizedSearch
      ? ticketRows.filter((ticket) =>
          [ticket.trackingCode, ticket.customerName, ticket.subject, ticket.category, ticket.status]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : ticketRows;

    return rows.slice(0, 6);
  }, [normalizedSearch, ticketRows]);

  const filteredChats = useMemo(() => {
    const rows = normalizedSearch
      ? chatRows.filter((chat) =>
          [chat.id, chat.customerName, chat.briefDescription, chat.category, chat.status]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : chatRows;

    return rows.slice(0, 6);
  }, [chatRows, normalizedSearch]);

  const filteredDocs = useMemo(() => {
    const rows = normalizedSearch
      ? knowledgeDocs.filter((doc) =>
          [doc.title, doc.docId, doc.fileName, doc.sourceType]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : knowledgeDocs;

    return rows.slice(0, 6);
  }, [knowledgeDocs, normalizedSearch]);

  const notifications = useMemo<HeaderNotification[]>(() => {
    const next: HeaderNotification[] = [];
    const health = healthQuery.data;
    const overview = overviewQuery.data;

    if (health && health.overallStatus !== "healthy") {
      const affected = health.services.find((service) => service.status !== "healthy");
      next.push({
        id: "health",
        title:
          health.overallStatus === "unconfigured"
            ? "AI services need setup"
            : "AI services degraded",
        detail: affected?.detail ?? "One or more AI services are not currently healthy.",
        tone: "high",
        to: "/analytics",
      });
    }

    if ((overview?.escalationsCount ?? 0) > 0) {
      next.push({
        id: "escalations",
        title: `${overview?.escalationsCount} open escalation${overview?.escalationsCount === 1 ? "" : "s"}`,
        detail: "High-risk support cases are waiting for follow-up.",
        tone: "high",
        to: "/tickets",
      });
    }

    const riskyTickets = ticketRows.filter(
      (ticket) =>
        ticket.priority === "Urgent" ||
        ticket.flags.some((flag) =>
          ["security_issue", "vip_customer", "low_confidence"].includes(flag),
        ),
    );
    if (riskyTickets.length > 0) {
      next.push({
        id: "risky-tickets",
        title: `${riskyTickets.length} ticket${riskyTickets.length === 1 ? "" : "s"} need review`,
        detail: `${riskyTickets[0]?.trackingCode} is one of the highest-risk cases in queue.`,
        tone: "medium",
        to: "/tickets",
      });
    }

    const waitingChats = chatRows.filter((chat) => chat.status === "waiting");
    if (waitingChats.length > 0) {
      next.push({
        id: "waiting-chats",
        title: `${waitingChats.length} live chat${waitingChats.length === 1 ? "" : "s"} waiting`,
        detail: "Customers are waiting for a human or AI-assisted response.",
        tone: "info",
        to: "/chat",
      });
    }

    const failedDocs = knowledgeDocs.filter((doc) => doc.indexingStatus === "failed");
    if (failedDocs.length > 0) {
      next.push({
        id: "failed-docs",
        title: `${failedDocs.length} knowledge document${failedDocs.length === 1 ? "" : "s"} failed indexing`,
        detail: failedDocs[0]?.title ?? "Knowledge indexing requires attention.",
        tone: "medium",
        to: "/knowledge",
      });
    }

    const pendingDocs = knowledgeDocs.filter((doc) =>
      ["pending", "processing"].includes(doc.indexingStatus),
    );
    if (pendingDocs.length > 0) {
      next.push({
        id: "pending-docs",
        title: `${pendingDocs.length} knowledge update${pendingDocs.length === 1 ? "" : "s"} in progress`,
        detail: "Retrieval sources are still being indexed.",
        tone: "info",
        to: "/knowledge",
      });
    }

    return next.slice(0, 6);
  }, [chatRows, healthQuery.data, knowledgeDocs, overviewQuery.data, ticketRows]);

  const healthSummary = healthQuery.data;
  const healthToneClass =
    healthSummary?.overallStatus === "healthy"
      ? "border-success/30 bg-success/10 text-success"
      : healthSummary?.overallStatus === "unconfigured"
        ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-danger/30 bg-danger/10 text-danger";

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const openRoute = (to: (typeof nav)[number]["to"]) => {
    closeSearch();
    void navigate({ to: to as "/" });
  };

  const openTicket = (ticketId: string) => {
    closeSearch();
    void navigate({ to: "/tickets/$id", params: { id: ticketId } });
  };

  const openChat = (chatId: string) => {
    closeSearch();
    void navigate({ to: "/chat/$id", params: { id: chatId } });
  };

  const openKnowledge = () => {
    closeSearch();
    void navigate({ to: "/knowledge" });
  };

  const openNotificationRoute = (to: HeaderNotification["to"]) => {
    void navigate({ to });
  };

  return (
    <>
      <div className="grid min-h-screen grid-cols-[260px_1fr] bg-background">
        <aside className="sticky top-0 flex h-screen flex-col bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-ai">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">Sentinel</div>
              <div className="text-[11px] text-sidebar-muted">Support Copilot</div>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as "/"}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-sidebar-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Safe mode active
            </div>
            <p className="text-sidebar-muted">
              PII masking, audit logging, and human-review gates are enforced.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface/80 px-6 py-3 backdrop-blur">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex h-10 w-full max-w-xl items-center gap-3 rounded-md border border-transparent bg-muted/50 px-3 text-left text-sm text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search tickets, chats, docs, or pages...</span>
              <span className="ml-auto hidden rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground md:inline-flex">
                Ctrl K
              </span>
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-surface hover:bg-muted"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {Math.min(notifications.length, 9)}
                    </span>
                  ) : null}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[360px] p-0">
                <div className="border-b border-border px-4 py-3">
                  <div className="text-sm font-semibold">Notifications</div>
                  <div className="text-xs text-muted-foreground">
                    Live operational alerts from tickets, chats, docs, and AI services.
                  </div>
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => openNotificationRoute(notification.to)}
                        className="flex w-full items-start gap-3 border-b border-border/70 px-4 py-3 text-left transition hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                            notification.tone === "high"
                              ? "bg-danger"
                              : notification.tone === "medium"
                                ? "bg-warning"
                                : "bg-success",
                          )}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{notification.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {notification.detail}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No active alerts right now.
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "hidden items-center gap-2 rounded-md border px-3 py-1.5 text-xs md:flex",
                    healthQuery.isLoading
                      ? "border-border bg-surface text-muted-foreground"
                      : healthQuery.error
                        ? "border-danger/30 bg-danger/10 text-danger"
                        : healthToneClass,
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      healthQuery.isLoading
                        ? "bg-muted-foreground"
                        : healthQuery.error
                          ? "bg-danger"
                          : healthSummary?.overallStatus === "healthy"
                            ? "bg-success"
                            : healthSummary?.overallStatus === "unconfigured"
                              ? "bg-warning"
                              : "bg-danger",
                    )}
                  />
                  <span className="font-medium">
                    {healthQuery.isLoading
                      ? "Checking AI services"
                      : healthQuery.error
                        ? "AI status unavailable"
                        : healthSummary?.overallStatus === "healthy"
                          ? "AI services healthy"
                          : healthSummary?.overallStatus === "unconfigured"
                            ? "AI setup incomplete"
                            : "AI services degraded"}
                  </span>
                  <span className="text-muted-foreground">
                    {healthQuery.isLoading
                      ? "..."
                      : healthQuery.error
                        ? "check logs"
                        : healthSummary?.averageResponseTimeMs != null
                          ? `avg ${healthSummary.averageResponseTimeMs}ms`
                          : `${healthSummary?.healthyCount ?? 0}/${healthSummary?.totalCount ?? 0} healthy`}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[360px] p-0">
                <div className="border-b border-border px-4 py-3">
                  <div className="text-sm font-semibold">AI service health</div>
                  <div className="text-xs text-muted-foreground">
                    Reachability checks for classifier, retrieval, generation, and monitoring
                    services.
                  </div>
                </div>
                {healthQuery.error ? (
                  <div className="px-4 py-4 text-sm text-danger">{healthQuery.error.message}</div>
                ) : (
                  <div className="space-y-1 px-2 py-2">
                    {(healthSummary?.services ?? []).map((service) => (
                      <div
                        key={service.key}
                        className="rounded-lg border border-border bg-surface/70 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                service.status === "healthy"
                                  ? "bg-success"
                                  : service.status === "unconfigured"
                                    ? "bg-warning"
                                    : "bg-danger",
                              )}
                            />
                            <span className="text-sm font-medium">{service.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {service.responseTimeMs != null ? `${service.responseTimeMs}ms` : "--"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{service.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>

      <CommandDialog
        open={isSearchOpen}
        onOpenChange={(open) => {
          setIsSearchOpen(open);
          if (!open) setSearchQuery("");
        }}
      >
        <CommandInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Search tickets, chats, docs, or pages..."
        />
        <CommandList>
          <CommandEmpty>No matching results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            {filteredShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.to}
                  value={`${item.label} ${item.description}`}
                  onSelect={() => openRoute(item.to)}
                >
                  <Icon className="h-4 w-4" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{item.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandGroup heading="Tickets">
            {filteredTickets.map((ticket) => (
              <CommandItem
                key={ticket.id}
                value={`${ticket.trackingCode} ${ticket.customerName} ${ticket.subject} ${ticket.category}`}
                onSelect={() => openTicket(ticket.id)}
              >
                <Ticket className="h-4 w-4" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">
                    {ticket.trackingCode} - {ticket.subject}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {ticket.customerName} - {ticket.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Live chat">
            {filteredChats.map((chat) => (
              <CommandItem
                key={chat.id}
                value={`${chat.id} ${chat.customerName} ${chat.briefDescription} ${chat.category}`}
                onSelect={() => openChat(chat.id)}
              >
                <MessageSquare className="h-4 w-4" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{chat.customerName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {chat.id} - {chat.category} - {chat.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Knowledge">
            {filteredDocs.map((doc) => (
              <CommandItem
                key={doc.docId}
                value={`${doc.title} ${doc.docId} ${doc.fileName} ${doc.sourceType}`}
                onSelect={openKnowledge}
              >
                <BookOpen className="h-4 w-4" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{doc.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {doc.sourceType} - {doc.indexingStatus}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-surface px-6 py-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
