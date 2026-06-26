"use client";

import { useFetch } from "@/lib/hooks";
import type { TxnLite, LocationLite, ProjectLite } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, TypeBadge, BUBadge } from "@/components/badges";
import { useUI } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatNumber, relativeTime } from "@/lib/hooks";
import {
  Search, Filter, X, ArrowRight, Download, RefreshCw, Eye, FileText, MapPin, User, ScanLine,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROLE_LABELS } from "@/lib/types";
import { NewTransactionDialog } from "@/components/new-transaction-dialog";

const TYPE_OPTIONS = ["RECEIPT", "REQUEST", "DELIVERY", "PULL_OUT", "TRANSFER", "CONSUMPTION", "ADJUSTMENT"];
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];

export function TransactionsView() {
  const [status, setStatus] = useState<string>("ALL");
  const [type, setType] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const pageSize = 25;

  // Build query
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (type !== "ALL") params.set("type", type);
  if (q.trim()) params.set("q", q.trim());
  params.set("limit", "500");
  const url = `/api/transactions?${params.toString()}`;

  const { data, loading, refresh } = useFetch<{ txns: TxnLite[] }>(url, [status, type, q]);
  const { data: locData } = useFetch<{ locations: LocationLite[] }>("/api/locations");
  const { data: projData } = useFetch<{ projects: ProjectLite[] }>("/api/projects");

  const txns = data?.txns ?? [];
  const paged = useMemo(() => {
    const start = page * pageSize;
    return txns.slice(start, start + pageSize);
  }, [txns, page]);
  const totalPages = Math.max(1, Math.ceil(txns.length / pageSize));

  const selected = txns.find((t) => t.id === selectedId) ?? null;

  function reset() {
    setStatus("ALL"); setType("ALL"); setQ(""); setPage(0);
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by item name, SKU, serial, batch, notes…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {(status !== "ALL" || type !== "ALL" || q) && (
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <NewTransactionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
          </div>
        </CardContent>
      </Card>

      {/* Result count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5" />
          <span>{txns.length} transaction{txns.length === 1 ? "" : "s"} match</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => exportCsv(txns)}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Search className="h-8 w-8 opacity-40" />
              <div>No transactions match these filters</div>
              <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[160px]">From → To</TableHead>
                    <TableHead className="w-[90px] text-right">Qty</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[130px]">Created</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((t) => (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedId(t.id)}>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{t.id}</TableCell>
                      <TableCell><TypeBadge type={t.transactionType} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{t.item?.name ?? "—"}</div>
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                              {t.item?.businessUnit && <BUBadge code={t.item.businessUnit.code} />}
                              {t.item?.sku}
                              {t.itemUnit && ` · ${t.itemUnit.serialNo}`}
                              {t.itemBatch && ` · ${t.itemBatch.batchNo}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="truncate max-w-[70px]" title={t.fromLocation?.name ?? ""}>{t.fromLocation?.name?.split(" ")[0] ?? "—"}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate max-w-[70px]" title={t.toLocation?.name ?? ""}>{t.toLocation?.name?.split(" ")[0] ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tnum">{t.quantity != null ? formatNumber(t.quantity, 1) : "—"}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{relativeTime(t.createdAt)}</TableCell>
                      <TableCell>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span>Transaction #{selected?.id}</span>
              {selected && <TypeBadge type={selected.transactionType} />}
            </SheetTitle>
            <SheetDescription>
              Created {selected && formatDateTime(selected.createdAt)}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-4 px-1 pb-6">
                <DetailRow label="Status"><StatusBadge status={selected.status} /></DetailRow>

                <div className="rounded-lg border border-border/60 p-3">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Item</div>
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="font-medium">{selected.item?.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {selected.item?.sku} · {selected.item?.unitOfMeasure}
                      </div>
                      {selected.item?.businessUnit && (
                        <div className="mt-1"><BUBadge code={selected.item.businessUnit.code} /></div>
                      )}
                    </div>
                  </div>
                  {selected.itemUnit && (
                    <div className="mt-2 rounded-md bg-muted/40 p-2 font-mono text-[11px]">
                      Serial: {selected.itemUnit.serialNo} · QR: {selected.itemUnit.qrCode}
                    </div>
                  )}
                  {selected.itemBatch && (
                    <div className="mt-2 rounded-md bg-muted/40 p-2 font-mono text-[11px]">
                      Batch: {selected.itemBatch.batchNo} · QR: {selected.itemBatch.qrCode}
                      {selected.itemBatch.expiryDate && ` · Exp ${selected.itemBatch.expiryDate.slice(0, 10)}`}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border/60 p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Movement</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md bg-muted/40 p-2 text-xs">
                      <MapPin className="mb-1 h-3 w-3 text-muted-foreground" />
                      <div className="font-medium">{selected.fromLocation?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{selected.fromLocation?.type}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 rounded-md bg-muted/40 p-2 text-xs">
                      <MapPin className="mb-1 h-3 w-3 text-muted-foreground" />
                      <div className="font-medium">{selected.toLocation?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{selected.toLocation?.type}</div>
                    </div>
                  </div>
                  {selected.quantity != null && (
                    <div className="mt-2 text-center text-sm">
                      <span className="font-mono font-semibold tnum">{formatNumber(selected.quantity, 2)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{selected.item?.unitOfMeasure}</span>
                    </div>
                  )}
                </div>

                {selected.project && (
                  <div className="rounded-lg border border-sky-200/50 bg-sky-50/30 p-3 dark:border-sky-900/40 dark:bg-sky-950/10">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Project</div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-600" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{selected.project.name}</div>
                        <div className="text-[11px] text-muted-foreground">{selected.project.clientName}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <DetailMini label="Requested by" icon={User}>
                    {selected.requestedBy?.fullName ?? "—"}
                    {selected.requestedBy && <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[selected.requestedBy.role]}</div>}
                  </DetailMini>
                  <DetailMini label="Approved by" icon={User}>
                    {selected.approvedBy?.fullName ?? "—"}
                    {selected.approvedAt && <div className="text-[10px] text-muted-foreground">{formatDateTime(selected.approvedAt)}</div>}
                  </DetailMini>
                </div>

                {selected.qrScannedAt && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200/50 bg-emerald-50/40 p-3 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/15">
                    <ScanLine className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-medium text-emerald-800 dark:text-emerald-300">QR scanned & verified</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDateTime(selected.qrScannedAt)} · by {selected.scannedBy?.fullName ?? "—"}
                      </div>
                    </div>
                  </div>
                )}

                {selected.reasonCode && (
                  <DetailRow label="Reason code">
                    <span className="rounded bg-rose-100 px-2 py-0.5 font-mono text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      {selected.reasonCode}
                    </span>
                  </DetailRow>
                )}

                {selected.notes && (
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</div>
                    <p className="text-sm text-foreground/80">{selected.notes}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function DetailMini({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function exportCsv(txns: TxnLite[]) {
  const rows = [
    ["ID", "Type", "Status", "Item SKU", "Item Name", "Unit Serial", "Batch No", "Quantity", "From", "To", "Project", "Requested By", "Approved By", "Scanned At", "Created At", "Notes"],
    ...txns.map((t) => [
      t.id, t.transactionType, t.status,
      t.item?.sku ?? "", t.item?.name ?? "",
      t.itemUnit?.serialNo ?? "", t.itemBatch?.batchNo ?? "",
      t.quantity ?? "",
      t.fromLocation?.name ?? "", t.toLocation?.name ?? "",
      t.project?.name ?? "",
      t.requestedBy?.fullName ?? "", t.approvedBy?.fullName ?? "",
      t.qrScannedAt ?? "", t.createdAt, (t.notes ?? "").replace(/[\n,]/g, " "),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
