import { BookOpen, FileText, History } from "lucide-react";
import type { KnowledgeSource } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function CitationCard({ source, relevance, className }: { source: KnowledgeSource; relevance?: number; className?: string }) {
  const Icon = source.type === "past_ticket" ? History : source.type === "guide" ? BookOpen : FileText;
  return (
    <div className={cn("group rounded-lg border border-border bg-surface p-3 transition hover:border-primary/40 hover:shadow-sm", className)}>
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold">{source.title}</div>
            {relevance != null && (
              <span className="shrink-0 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                {Math.round(relevance * 100)}% match
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{source.excerpt}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{source.id}</span>
            <span>·</span>
            <span className="capitalize">{source.type.replace("_", " ")}</span>
            <span>·</span>
            <span>updated {source.updatedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
