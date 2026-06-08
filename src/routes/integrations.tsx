import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Plug } from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Integrations — Sentinel" }] }),
  component: Integrations,
});

const INTEGRATIONS = [
  { name: "Zendesk", desc: "Sync tickets and AI drafts bi-directionally.", connected: true, hue: "oklch(0.65 0.14 158)" },
  { name: "Freshdesk", desc: "Mirror queues and SLA timers in real time.", connected: false, hue: "oklch(0.62 0.14 232)" },
  { name: "Intercom", desc: "Co-pilot replies inside Intercom conversations.", connected: true, hue: "oklch(0.55 0.18 285)" },
  { name: "Gmail", desc: "Triage shared-inbox emails into tickets.", connected: false, hue: "oklch(0.6 0.22 25)" },
  { name: "Slack", desc: "Notify channels on escalations and outages.", connected: true, hue: "oklch(0.78 0.16 78)" },
];

function Integrations() {
  return (
    <AppShell>
      <PageHeader
        title="Integrations"
        subtitle="Connect Sentinel to where your support already lives."
      />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {INTEGRATIONS.map((i) => (
            <Card key={i.name}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg text-white"
                       style={{ background: i.hue }}>
                    <Plug className="h-5 w-5" />
                  </div>
                  {i.connected ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Not connected</span>
                  )}
                </div>
                <div className="mt-4 text-base font-semibold">{i.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{i.desc}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Placeholder · demo only</span>
                  <Button size="sm" variant={i.connected ? "outline" : "default"}>
                    {i.connected ? "Manage" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
