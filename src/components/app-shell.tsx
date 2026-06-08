import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Ticket, MessageSquare, BookOpen, ShieldCheck, Plug,
  Search, Bell, Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/chat", label: "Live chat", icon: MessageSquare },
  { to: "/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/audit", label: "Audit log", icon: ShieldCheck },
  { to: "/integrations", label: "Integrations", icon: Plug },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
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
          {nav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-sidebar-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> Safe mode active
          </div>
          <p className="text-sidebar-muted">PII masking, audit logging, and human-review gates are enforced.</p>
        </div>

        <div className="border-t border-sidebar-border px-5 py-3 text-xs text-sidebar-muted">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-foreground">RM</div>
            <div>
              <div className="font-medium text-sidebar-foreground">Ravi Mehta</div>
              <div>Senior Support Engineer</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface/80 px-6 py-3 backdrop-blur">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tickets, customers, knowledge…" className="pl-9 bg-muted/50 border-transparent focus-visible:bg-surface" />
          </div>
          <button className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-surface hover:bg-muted">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          </button>
          <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="font-medium">Models healthy</span>
            <span className="text-muted-foreground">· avg 412ms</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-surface px-6 py-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
