"use client";

import { useFetch } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Plus, Wrench, FlaskConical, Flame } from "lucide-react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Roof Deck": Wrench,
  "Basement": FlaskConical,
  "LPG": Flame,
};

function pickIcon(serviceType: string) {
  const key = Object.keys(SERVICE_ICONS).find((k) => serviceType.includes(k));
  return key ? SERVICE_ICONS[key] : FileText;
}

export function GuidesView() {
  const { data, loading, refresh } = useFetch<{ guides: { id: number; serviceType: string; description: string | null; recommendedItems: string | null; createdAt: string }[] }>("/api/service-guides");
  const [selected, setSelected] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const guides = data?.guides ?? [];
  const active = guides.find((g) => g.id === selected) ?? guides[0] ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {guides.length} service guide{guides.length === 1 ? "" : "s"} · static reference for field teams
        </div>
        <CreateGuideDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Guide list */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4" /> Service Types</CardTitle>
              <CardDescription className="text-xs">Tap to view recommended items</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="scroll-thin max-h-[70vh] space-y-1 overflow-y-auto">
                {guides.map((g) => {
                  const Icon = pickIcon(g.serviceType);
                  const isActive = active?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelected(g.id)}
                      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                        isActive ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted/40"
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{g.serviceType}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{g.description?.slice(0, 60) ?? "No description"}</div>
                      </div>
                    </button>
                  );
                })}
                {guides.length === 0 && (
                  <div className="py-10 text-center text-sm text-muted-foreground">No guides yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Guide detail */}
          <Card className="lg:col-span-2">
            {active ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{active.serviceType}</CardTitle>
                      <CardDescription className="mt-1">Static reference · not an auto-generated BOM</CardDescription>
                    </div>
                    {(() => {
                      const Icon = pickIcon(active.serviceType);
                      return (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                      );
                    })()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {active.description && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</div>
                      <p className="text-sm leading-relaxed text-foreground/80">{active.description}</p>
                    </div>
                  )}
                  {active.recommendedItems && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recommended items &amp; PPE</div>
                      <div className="scroll-thin max-h-96 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-4">
                        <ReactMarkdown
                          components={{
                            // Render as a clean checklist style
                            p: ({ children }) => <div className="mb-1.5 flex items-start gap-2 text-sm"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />{children}</div>,
                          }}
                        >
                          {active.recommendedItems}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center gap-2 py-20 text-sm text-muted-foreground">
                <BookOpen className="h-8 w-8 opacity-40" />
                Select a service type to view its guide
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function CreateGuideDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({ serviceType: "", description: "", recommendedItems: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.serviceType) { toast.error("Service type is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/service-guides", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Guide created", { description: form.serviceType });
      onCreated();
      onOpenChange(false);
      setForm({ serviceType: "", description: "", recommendedItems: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New guide</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Service Guide</DialogTitle>
          <DialogDescription>A static reference for field teams. List recommended items as markdown bullets.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="st">Service type *</Label><Input id="st" placeholder="e.g. Roof Deck Waterproofing" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="desc">Description</Label><Textarea id="desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="items">Recommended items (markdown)</Label>
            <Textarea
              id="items" rows={6}
              placeholder={"- Sikaproof Membrane Roll (WP-MEM-001)\n- Sika Primer-3N 5L (WP-PRM-002)\n- PPE: heat-resistant gloves"}
              value={form.recommendedItems} onChange={(e) => setForm({ ...form, recommendedItems: e.target.value })}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create guide"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
