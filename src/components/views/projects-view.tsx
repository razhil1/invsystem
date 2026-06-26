"use client";

import { useFetch } from "@/lib/hooks";
import type { ProjectLite } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/badges";
import { useUI } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney, formatDate, formatNumber, relativeTime } from "@/lib/hooks";
import {
  Plus, FolderKanban, MapPin, Calendar, DollarSign, FileText, Milestone, ArrowRight, CheckCircle2, Clock,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export function ProjectsView() {
  const { data, loading, refresh } = useFetch<{ projects: ProjectLite[] }>("/api/projects");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const setView = useUI((s) => s.setView);

  const projects = data?.projects ?? [];
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{projects.length} project{projects.length === 1 ? "" : "s"}</div>
        <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} locations={[]} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer border-border/60 transition-all hover:border-primary/40 hover:shadow-md"
              onClick={() => setSelectedId(p.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{p.clientName ?? "No client"}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {p.siteLocation && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.siteLocation.name}
                  </div>
                )}
                {p.serviceType && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <FileText className="h-3 w-3" /> {p.serviceType}
                  </div>
                )}

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Progress</span>
                    <span className="tnum font-medium text-foreground">{formatNumber(p.percentComplete, 0)}%</span>
                  </div>
                  <Progress value={p.percentComplete} className="h-1.5" />
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{p.milestones?.filter((m) => m.completedAt).length ?? 0}/{p.milestones?.length ?? 0} milestones</span>
                  <span>{p._count?.transactions ?? 0} stock moves</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {projects.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
                <FolderKanban className="h-8 w-8 opacity-40" />
                No projects yet
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Project detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
            <SheetDescription>{selected?.clientName} · {selected?.serviceType}</SheetDescription>
          </SheetHeader>
          {selected && (
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-4 px-1 pb-6">
                <div className="flex items-center justify-between">
                  <StatusBadge status={selected.status} />
                  <span className="text-sm font-semibold tnum">{formatNumber(selected.percentComplete, 0)}% complete</span>
                </div>
                <Progress value={selected.percentComplete} className="h-2" />

                <div className="grid grid-cols-2 gap-2">
                  <InfoTile icon={Calendar} label="Start">{formatDate(selected.startDate)}</InfoTile>
                  <InfoTile icon={Calendar} label="Target end">{formatDate(selected.targetEndDate)}</InfoTile>
                  <InfoTile icon={DollarSign} label="Budget">{selected.budget ? formatMoney(selected.budget) : "—"}</InfoTile>
                  <InfoTile icon={MapPin} label="Site">{selected.siteLocation?.name ?? "—"}</InfoTile>
                </div>

                {/* Milestones */}
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Milestone className="h-4 w-4 text-primary" /> Milestones
                    <span className="text-xs font-normal text-muted-foreground">
                      ({selected.milestones?.filter((m) => m.completedAt).length ?? 0}/{selected.milestones?.length ?? 0})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selected.milestones?.map((m) => (
                      <div key={m.id} className="flex items-start gap-2.5 rounded-md border border-border/50 p-2">
                        {m.completedAt ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm ${m.completedAt ? "text-muted-foreground line-through" : "font-medium"}`}>{m.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Target {formatDate(m.targetDate)}
                            {m.completedAt && ` · completed ${relativeTime(m.completedAt)}`}
                            {` · ${formatNumber(m.percentWeight, 0)}% weight`}
                          </div>
                        </div>
                      </div>
                    ))}
                    {selected.milestones?.length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground">No milestones defined</div>
                    )}
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setView("transactions")}>
                  View this project&apos;s stock movements <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoTile({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="mb-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

function CreateProjectDialog({ open, onOpenChange, onCreated, locations }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void; locations: { id: number; name: string }[] }) {
  const [form, setForm] = useState({ name: "", clientName: "", serviceType: "", budget: "", startDate: "", targetEndDate: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name) { toast.error("Project name is required"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: form.name, clientName: form.clientName, serviceType: form.serviceType };
      if (form.budget) body.budget = Number(form.budget);
      if (form.startDate) body.startDate = form.startDate;
      if (form.targetEndDate) body.targetEndDate = form.targetEndDate;
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Project created", { description: form.name });
      onCreated();
      onOpenChange(false);
      setForm({ name: "", clientName: "", serviceType: "", budget: "", startDate: "", targetEndDate: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Register a new engagement. A project site location can be linked separately.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pname">Name *</Label><Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Client</Label><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Service type</Label><Input value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} placeholder="e.g. Roof Deck Waterproofing" /></div>
          <div className="space-y-1.5"><Label>Budget (SGD)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Target end</Label><Input type="date" value={form.targetEndDate} onChange={(e) => setForm({ ...form, targetEndDate: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Start date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create project"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
