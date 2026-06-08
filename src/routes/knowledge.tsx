import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { knowledgeSources } from "@/lib/mock-data";
import { CitationCard } from "@/components/citation-card";
import { BookOpen, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge — Sentinel" }] }),
  component: Knowledge,
});

function Knowledge() {
  return (
    <AppShell>
      <PageHeader
        title="Knowledge"
        subtitle="Policies, guides, and past tickets the AI retrieves from."
        actions={<Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Add source</Button>}
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-80 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search knowledge…" className="pl-9" />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 text-xs">
            {["All", "Policies", "Guides", "Past tickets"].map((t, i) => (
              <button key={t} className={`rounded px-2.5 py-1 ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
            ))}
          </div>
          <div className="ml-auto inline-flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs text-success">
            <BookOpen className="h-3.5 w-3.5" /> Index healthy · re-embedded 2h ago
          </div>
        </div>

        <Card>
          <CardContent className="space-y-2 p-4">
            {knowledgeSources.map((s) => <CitationCard key={s.id} source={s} />)}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
