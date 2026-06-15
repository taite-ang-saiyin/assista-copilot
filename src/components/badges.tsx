import { cn } from "@/lib/utils";
import type { Priority, Sentiment, TicketStatus } from "@/lib/support-models";
import {
  ShieldAlert, AlertTriangle, Activity, CheckCircle2, Clock, Sparkles,
  Frown, Meh, AlertCircle, Flame,
} from "lucide-react";

const base = "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold";

export function PriorityBadge({ value, className }: { value: Priority; className?: string }) {
  const map: Record<Priority, string> = {
    Low: "bg-muted text-muted-foreground border-border",
    Medium: "bg-info/10 text-info border-info/30",
    High: "bg-warning/15 text-warning-foreground border-warning/40",
    Urgent: "bg-danger/10 text-danger border-danger/40",
  };
  const Icon = value === "Urgent" ? Flame : value === "High" ? AlertTriangle : value === "Medium" ? Activity : Clock;
  return <span className={cn(base, map[value], className)}><Icon className="h-3 w-3" />{value}</span>;
}

export function SentimentBadge({ value, className }: { value: Sentiment; className?: string }) {
  const map: Record<Sentiment, string> = {
    Neutral: "bg-muted text-muted-foreground border-border",
    Confused: "bg-info/10 text-info border-info/30",
    Frustrated: "bg-warning/15 text-warning-foreground border-warning/40",
    Angry: "bg-danger/10 text-danger border-danger/40",
  };
  const Icon = value === "Angry" ? Flame : value === "Frustrated" ? Frown : value === "Confused" ? AlertCircle : Meh;
  return <span className={cn(base, map[value], className)}><Icon className="h-3 w-3" />{value}</span>;
}

export function StatusBadge({ value, className }: { value: TicketStatus; className?: string }) {
  const map: Record<TicketStatus, string> = {
    New: "bg-secondary text-secondary-foreground border-border",
    Analyzed: "bg-info/10 text-info border-info/30",
    Drafted: "bg-ai-soft text-ai border-ai/30",
    Waiting: "bg-muted text-muted-foreground border-border",
    Escalated: "bg-danger/10 text-danger border-danger/40",
    Resolved: "bg-success/15 text-success border-success/40",
  };
  const Icon =
    value === "Resolved" ? CheckCircle2 :
    value === "Escalated" ? ShieldAlert :
    value === "Drafted" ? Sparkles :
    value === "Analyzed" ? Activity :
    value === "Waiting" ? Clock : Clock;
  return <span className={cn(base, map[value], className)}><Icon className="h-3 w-3" />{value}</span>;
}

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const low = value < 0.7;
  return (
    <span className={cn(base,
      low ? "bg-warning/15 text-warning-foreground border-warning/40" : "bg-success/15 text-success border-success/40"
    )}>
      <Sparkles className="h-3 w-3" />
      {pct}% {low ? "low" : "confidence"}
    </span>
  );
}

export function FlagBadge({ flag }: { flag: string }) {
  const labels: Record<string, string> = {
    security_issue: "Security",
    privacy_issue: "Privacy",
    payment_dispute: "Payment dispute",
    vip_customer: "VIP",
    angry_customer: "Angry",
    possible_outage: "Possible outage",
    low_confidence: "Low confidence",
  };
  const danger = ["security_issue", "vip_customer", "angry_customer", "possible_outage", "privacy_issue"].includes(flag);
  return (
    <span className={cn(base,
      danger ? "bg-danger/10 text-danger border-danger/40" : "bg-warning/15 text-warning-foreground border-warning/40"
    )}>
      <ShieldAlert className="h-3 w-3" />
      {labels[flag] ?? flag}
    </span>
  );
}

export function AINotice({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-md bg-ai-soft px-2 py-1 text-[11px] font-medium text-ai", className)}>
      <Sparkles className="h-3 w-3" />
      AI generated — verify before sending
    </div>
  );
}

export function HumanReviewLabel({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning-foreground", className)}>
      <ShieldAlert className="h-3 w-3" />
      Human review required
    </div>
  );
}
