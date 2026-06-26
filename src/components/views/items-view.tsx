"use client";

import { useFetch } from "@/lib/hooks";
import type { ItemLite, ItemCategory, BusinessUnit } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BUBadge, UnitStatusBadge } from "@/components/badges";
import { useUI } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatNumber } from "@/lib/hooks";
import { Search, Plus, QrCode, Package, TrendingDown, Eye, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRCodeSVG } from "@/components/qr-code";
import { RegisterUnitBatchDialog } from "@/components/register-unit-batch-dialog";
import { toast } from "sonner";

export function ItemsView() {
  const [bu, setBu] = useState("ALL");
  const [tm, setTm] = useState("ALL");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const params = new URLSearchParams();
  if (bu !== "ALL") params.set("businessUnitId", bu);
  if (tm !== "ALL") params.set("trackingMode", tm);
  if (q.trim()) params.set("q", q.trim());

  const { data, loading, refresh } = useFetch<{ items: ItemLite[] }>(`/api/items?${params.toString()}`, [bu, tm, q]);

  const items = data?.items ?? [];
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Header bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by SKU or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={bu} onValueChange={setBu}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Business unit" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All units</SelectItem>
              <SelectItem value="1">Waterproofing (WP)</SelectItem>
              <SelectItem value="2">Chemical (CHEM)</SelectItem>
              <SelectItem value="3">LPG (LPG)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tm} onValueChange={setTm}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tracking" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All tracking</SelectItem>
              <SelectItem value="SERIALIZED">Serialized</SelectItem>
              <SelectItem value="BATCH">Batch / lot</SelectItem>
            </SelectContent>
          </Select>
          <CreateItemDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Total items" value={items.length} icon={Package} />
        <SummaryTile label="Serialized SKUs" value={items.filter((i) => i.category.trackingMode === "SERIALIZED").length} icon={QrCode} />
        <SummaryTile label="Batch SKUs" value={items.filter((i) => i.category.trackingMode === "BATCH").length} icon={Package} />
        <SummaryTile label="Low stock" value={items.filter((i) => (i.onHand ?? 0) <= i.reorderLevel).length} icon={TrendingDown} accent="amber" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Item Master Catalog</CardTitle>
          <CardDescription className="text-xs">{items.length} active SKU{items.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
              <Package className="h-8 w-8 opacity-40" />
              No items match these filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[90px]">Unit</TableHead>
                    <TableHead className="w-[80px]">BU</TableHead>
                    <TableHead className="w-[90px] text-right">On-hand</TableHead>
                    <TableHead className="w-[90px] text-right">Reorder</TableHead>
                    <TableHead className="w-[100px] text-right">Unit cost</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const low = (it.onHand ?? 0) <= it.reorderLevel;
                    return (
                      <TableRow key={it.id} className="cursor-pointer" onClick={() => setSelectedId(it.id)}>
                        <TableCell className="font-mono text-[11px]">{it.sku}</TableCell>
                        <TableCell>
                          <div className="font-medium">{it.name}</div>
                          <div className="text-[10px] text-muted-foreground">{it.category.name} · {it.category.trackingMode}</div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{it.unitOfMeasure}</TableCell>
                        <TableCell>{it.businessUnit && <BUBadge code={it.businessUnit.code} />}</TableCell>
                        <TableCell className={`text-right font-mono tnum ${low ? "font-bold text-amber-600 dark:text-amber-400" : ""}`}>
                          {formatNumber(it.onHand ?? 0, it.category.trackingMode === "BATCH" ? 1 : 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono tnum text-muted-foreground">{formatNumber(it.reorderLevel, 1)}</TableCell>
                        <TableCell className="text-right font-mono tnum">{formatMoney(it.unitCost)}</TableCell>
                        <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selected?.businessUnit && <BUBadge code={selected.businessUnit.code} />}
              {selected?.name}
            </SheetTitle>
            <SheetDescription className="font-mono">{selected?.sku}</SheetDescription>
          </SheetHeader>
          {selected && (
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-4 px-1 pb-6">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="On-hand" value={formatNumber(selected.onHand ?? 0, selected.category.trackingMode === "BATCH" ? 1 : 0)} />
                  <Stat label="Reorder level" value={formatNumber(selected.reorderLevel, 1)} />
                  <Stat label="Unit cost" value={formatMoney(selected.unitCost)} />
                </div>

                <div className="rounded-lg border border-border/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {selected.category.trackingMode === "SERIALIZED" ? "Serialized Units" : "Batches"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button variant="default" size="sm" className="h-7 gap-1 text-xs" onClick={() => setRegisterOpen(true)}>
                        <Plus className="h-3 w-3" /> Register {selected.category.trackingMode === "SERIALIZED" ? "Unit" : "Batch"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs no-print" onClick={() => window.print()}>
                        <Printer className="h-3 w-3" /> Print
                      </Button>
                    </div>
                  </div>
                  {selected.category.trackingMode === "SERIALIZED" ? (
                    <div className="grid grid-cols-2 gap-2 printable sm:grid-cols-3">
                      {selected.units?.map((u) => (
                        <div key={u.id} className="flex flex-col items-center rounded-md border border-border/60 p-2">
                          <QRCodeSVG value={u.qrCode} size={80} />
                          <div className="mt-1 text-center font-mono text-[9px]">{u.qrCode}</div>
                          <div className="text-[9px] text-muted-foreground">S/N {u.serialNo}</div>
                          <UnitStatusBadge status={u.status} className="mt-1" />
                        </div>
                      ))}
                      {selected.units?.length === 0 && <div className="col-span-full py-4 text-center text-xs text-muted-foreground">No serialized units registered</div>}
                    </div>
                  ) : (
                    <div className="space-y-2 printable">
                      {selected.batches?.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 rounded-md border border-border/60 p-2">
                          <QRCodeSVG value={b.qrCode} size={64} />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[11px] font-medium">{b.qrCode}</div>
                            <div className="text-[11px] text-muted-foreground">Batch {b.batchNo} · {formatNumber(b.qtyReceived, 1)} {selected.unitOfMeasure} received</div>
                            {b.expiryDate && <div className="text-[10px] text-amber-600">Expires {b.expiryDate.slice(0, 10)}</div>}
                            {b.supplierRef && <div className="text-[10px] text-muted-foreground">Supplier: {b.supplierRef}</div>}
                          </div>
                        </div>
                      ))}
                      {selected.batches?.length === 0 && <div className="py-4 text-center text-xs text-muted-foreground">No batches registered</div>}
                    </div>
                  )}
                </div>

                {selected.attributes && selected.attributes !== "{}" && (
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Attributes (extensible)</div>
                    <pre className="scroll-thin max-h-40 overflow-auto rounded bg-muted/40 p-2 font-mono text-[10px]">
                      {JSON.stringify(JSON.parse(selected.attributes), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Register unit/batch dialog */}
      <RegisterUnitBatchDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        item={selected}
        onRegistered={refresh}
      />
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon, accent }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; accent?: "amber" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${accent === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xl font-bold tnum">{formatNumber(value)}</div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tnum">{value}</div>
    </div>
  );
}

function CreateItemDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    sku: "", name: "", unitOfMeasure: "pcs", unitCost: "0", reorderLevel: "0",
    categoryId: "", businessUnitId: "", attributes: "",
  });
  const [saving, setSaving] = useState(false);
  const { data: catData } = useFetch<{ categories?: ItemCategory[]; itemCategories?: ItemCategory[] }>("/api/meta/categories");
  const { data: buData } = useFetch<{ businessUnits?: BusinessUnit[] }>(null);

  async function save() {
    if (!form.sku || !form.name || !form.categoryId) {
      toast.error("SKU, name and category are required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        sku: form.sku, name: form.name, unitOfMeasure: form.unitOfMeasure,
        unitCost: Number(form.unitCost), reorderLevel: Number(form.reorderLevel),
        categoryId: Number(form.categoryId),
      };
      if (form.businessUnitId) body.businessUnitId = Number(form.businessUnitId);
      if (form.attributes) {
        try { body.attributes = JSON.parse(form.attributes); } catch { /* ignore invalid JSON */ }
      }
      const res = await fetch("/api/items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed (${res.status})`);
      }
      toast.success("Item created", { description: form.name });
      onCreated();
      onOpenChange(false);
      setForm({ sku: "", name: "", unitOfMeasure: "pcs", unitCost: "0", reorderLevel: "0", categoryId: "", businessUnitId: "", attributes: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New item</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Item Master Record</DialogTitle>
          <DialogDescription>Add a new SKU to the catalog. QR codes are generated when you register units or batches.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" placeholder="e.g. WP-MEM-003" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="e.g. Membrane Roll (2m x 20m)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {(catData?.itemCategories ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.trackingMode})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Business unit</Label>
            <Select value={form.businessUnitId} onValueChange={(v) => setForm({ ...form, businessUnitId: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                <SelectItem value="1">Waterproofing (WP)</SelectItem>
                <SelectItem value="2">Chemical (CHEM)</SelectItem>
                <SelectItem value="3">LPG (LPG)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uom">Unit of measure</Label>
            <Input id="uom" placeholder="pcs, liters, kg, set…" value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reorder">Reorder level</Label>
            <Input id="reorder" type="number" min="0" step="0.5" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="cost">Unit cost (SGD)</Label>
            <Input id="cost" type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
