import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auditLog } from "@/lib/mock-data";
import { Download, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit log — Sentinel" }] }),
  component: Audit,
});

const ROWS = [...auditLog,
  { id: "A-9816", at: "10:01:18", actor: "AI" as const, action: "Suggested reply", target: "CHAT-101", detail: "Low confidence (0.62) — flagged for human review", risk: "medium" as const },
  { id: "A-9815", at: "09:58:02", actor: "System" as const, action: "Masked PII", target: "TCK-001", detail: "Masked card and email before prompt construction", risk: "low" as const },
  { id: "A-9814", at: "09:52:40", actor: "Agent" as const, action: "Approved & sent", target: "TCK-002", detail: "AI draft sent with 2 edits", risk: "low" as const },
];

function Audit() {
  return (
    <AppShell>
      <PageHeader
        title="Audit log"
        subtitle="Every AI action is logged. Immutable and exportable for compliance."
        actions={
          <>
            <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>
            <Button size="sm"><ShieldCheck className="mr-1.5 h-4 w-4" />Compliance report</Button>
          </>
        }
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-[100px_90px_90px_180px_1fr_90px] gap-3 border-b border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>Time</div><div>Actor</div><div>Risk</div><div>Action</div><div>Detail</div><div>Target</div>
            </div>
            <div className="divide-y divide-border">
              {ROWS.map((r) => (
                <div key={r.id} className="grid grid-cols-[100px_90px_90px_180px_1fr_90px] items-center gap-3 px-5 py-3 text-sm">
                  <div className="font-mono text-xs text-muted-foreground">{r.at}</div>
                  <div>
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      r.actor === "AI" ? "bg-ai-soft text-ai" : r.actor === "Agent" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
                    }`}>{r.actor}</span>
                  </div>
                  <div>
                    <span className={`inline-flex h-2 w-2 rounded-full ${
                      r.risk === "high" ? "bg-danger" : r.risk === "medium" ? "bg-warning" : "bg-success"
                    }`} />
                    <span className="ml-1.5 text-xs capitalize">{r.risk}</span>
                  </div>
                  <div className="font-medium">{r.action}</div>
                  <div className="text-muted-foreground">{r.detail}</div>
                  <div className="font-mono text-xs">{r.target}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
