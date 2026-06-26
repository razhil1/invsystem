"use client";

import { useFetch } from "@/lib/hooks";
import type { LocationLite } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BUBadge } from "@/components/badges";
import { useUI } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LOCATION_TYPES } from "@/lib/types";
import { Search, MapPin, Warehouse, Truck, Building2, Package, ArrowRight, Boxes } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/hooks";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  WAREHOUSE: Warehouse,
  PROJECT_SITE: Building2,
  VEHICLE: Truck,
  SUPPLIER: Package,
  CUSTOMER: Building2,
};

const TYPE_ACCENTS: Record<string, string> = {
  WAREHOUSE: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  PROJECT_SITE: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  VEHICLE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  SUPPLIER: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  CUSTOMER: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
};

export function LocationsView() {
  const [type, setType] = useState("ALL");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const setView = useUI((s) => s.setView);

  const params = new URLSearchParams();
  if (type !== "ALL") params.set("type", type);
  const { data, loading } = useFetch<{ locations: (LocationLite & { _count?: { itemUnits: number; txnFrom: number; txnTo: number } })[] }>(`/api/locations?${params.toString()}`, [type]);

  const locations = (data?.locations ?? []).filter((l) =>
    !q.trim() || l.name.toLowerCase().includes(q.toLowerCase()) || (l.address ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof locations>();
    for (const l of locations) {
      const arr = map.get(l.type) ?? [];
      arr.push(l);
      map.set(l.type, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [locations]);

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or address…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Location type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {Object.entries(LOCATION_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([grp, items]) => {
            const Icon = TYPE_ICONS[grp] ?? MapPin;
            return (
              <div key={grp}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{LOCATION_TYPES[grp] ?? grp}</h2>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((l) => {
                    const accent = TYPE_ACCENTS[l.type] ?? "bg-muted text-muted-foreground";
                    const Icon = TYPE_ICONS[l.type] ?? MapPin;
                    return (
                      <Card
                        key={l.id}
                        className="cursor-pointer border-border/60 transition-all hover:border-primary/40 hover:shadow-md"
                        onClick={() => setSelectedId(l.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${accent}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{l.name}</div>
                              <div className="truncate text-[11px] text-muted-foreground">{l.address ?? "No address on file"}</div>
                              <div className="mt-2 flex items-center gap-2">
                                {l.businessUnit && <BUBadge code={l.businessUnit.code} />}
                                <span className="text-[10px] text-muted-foreground">
                                  {l._count?.itemUnits ?? 0} units · {(l._count?.txnFrom ?? 0) + (l._count?.txnTo ?? 0)} movements
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {locations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
                <MapPin className="h-8 w-8 opacity-40" />
                No locations match these filters
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Location stock detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {selected?.name}
            </SheetTitle>
            <SheetDescription>
              {selected && (LOCATION_TYPES[selected.type] ?? selected.type)}
              {selected?.address ? ` · ${selected.address}` : ""}
            </SheetDescription>
          </SheetHeader>
          {selected && <LocationStockContent locationId={selected.id} onOpenProject={() => setView("projects")} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LocationStockContent({ locationId, onOpenProject }: { locationId: number; onOpenProject: () => void }) {
  const { data, loading } = useFetch<{
    serializedUnits: { id: number; serialNo: string; qrCode: string; status: string; item: { sku: string; name: string; unitOfMeasure: string; businessUnit?: { code: string } | null } }[];
    batchStock: { itemId: number; sku: string; itemName: string; batchNo: string; qrCode: string; qty: number; unit: string; expiryDate: string | null }[];
    movementSummary: Record<string, number>;
    totalMovements: number;
  }>(`/api/locations/${locationId}/stock`, [locationId]);

  if (loading || !data) return <div className="p-4"><Skeleton className="h-40 w-full" /></div>;

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="space-y-4 px-1 pb-6">
        {/* Movement summary */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-border/60 p-2">
            <div className="text-[10px] text-muted-foreground">Total movements</div>
            <div className="text-lg font-bold tnum">{formatNumber(data.totalMovements)}</div>
          </div>
          {Object.entries(data.movementSummary).slice(0, 3).map(([k, v]) => (
            <div key={k} className="rounded-md border border-border/60 p-2">
              <div className="text-[10px] text-muted-foreground">{k.replace("_", " ")}</div>
              <div className="text-lg font-bold tnum">{formatNumber(v)}</div>
            </div>
          ))}
        </div>

        {/* Serialized units */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Boxes className="h-4 w-4 text-primary" /> Serialized units on site
            <span className="text-xs font-normal text-muted-foreground">({data.serializedUnits.length})</span>
          </div>
          {data.serializedUnits.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">No serialized units currently here</div>
          ) : (
            <div className="scroll-thin max-h-64 overflow-y-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>QR / Serial</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.serializedUnits.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-[10px]">
                        <div>{u.qrCode}</div>
                        <div className="text-muted-foreground">{u.serialNo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {u.item.businessUnit && <BUBadge code={u.item.businessUnit.code} />}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium">{u.item.name}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{u.item.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${u.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : u.status === "IN_USE" ? "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300" : "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300"}`}>
                          {u.status.replace("_", " ")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Batch stock */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-primary" /> Batch / lot stock
            <span className="text-xs font-normal text-muted-foreground">({data.batchStock.length})</span>
          </div>
          {data.batchStock.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">No batch stock currently here</div>
          ) : (
            <div className="scroll-thin max-h-64 overflow-y-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Batch</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[90px] text-right">Qty</TableHead>
                    <TableHead className="w-[90px]">Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.batchStock.map((b) => (
                    <TableRow key={b.qrCode}>
                      <TableCell className="font-mono text-[10px]">
                        <div>{b.qrCode}</div>
                        <div className="text-muted-foreground">{b.batchNo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="truncate text-xs font-medium">{b.itemName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{b.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono tnum">{formatNumber(b.qty, 1)} {b.unit}</TableCell>
                      <TableCell className={b.expiryDate && new Date(b.expiryDate) < new Date(Date.now() + 90 * 86400000) ? "text-[10px] text-amber-600" : "text-[10px] text-muted-foreground"}>
                        {b.expiryDate ? b.expiryDate.slice(0, 10) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={onOpenProject}>
          View related projects <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </ScrollArea>
  );
}
