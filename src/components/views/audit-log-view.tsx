"use client";

import { useFetch } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BUBadge, TypeBadge } from "@/components/badges";
import { useUI } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, relativeTime } from "@/lib/hooks";
import {
  Shield, CheckCircle2, XCircle, ScanLine, FileText, Filter, User, MapPin, ArrowRight, Clock,
} from "lucide-react";
import { useState } from "react";

interface AuditEntry {
  txnId: number;
  action: string;
  timestamp: string;
  actorName: string | null;
  actorRole: string | null;
  transactionType: string;
  itemName: string;
  itemSku: string;
  bu: string;
  fromLocation: string | null;
  toLocation: string | null;
  projectName: string | null;
  requestedByName: string | null;
  notes: string | null;
  reasonCode: string | null;
}

const ACTION_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  CREATED: { icon: FileText, color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800", label: "Created" },
  APPROVED: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/40", label: "Approved" },
  REJECTED: { icon: XCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/40", label: "Rejected" },
  SCANNED: { icon: ScanLine, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950/40", label: "Scanned" },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  WAREHOUSE_SUPERVISOR: "Warehouse Supervisor",
  STOCK_CLERK: "Stock Clerk",
  PROJECT_ENGINEER: "Project Engineer",
  VIEWER: "Viewer",
};

export function AuditLogView() {
  const [action, setAction] = useState("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const params = new URLSearchParams({ limit: "200" });
  if (action !== "ALL") params.set("action", action);

  const { data, loading } = useFetch<{ entries: AuditEntry[]; total: number }>(`/api/audit-log?${params.toString()}`, [action]);
  const entries = data?.entries ?? [];
  const paged = entries.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));

  // Stats
  const stats = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.action] = (acc[e.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["CREATED", "APPROVED", "REJECTED", "SCANNED"] as const).map((act) => {
          const config = ACTION_CONFIG[act];
          const Icon = config.icon;
          const count = stats[act] ?? 0;
          return (
            <Card key={act}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-md ${config.bg} ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xl font-bold tnum">{count}</div>
                  <div className="text-[10px] text-muted-foreground">{config.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>{entries.length} audit entries</span>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              <SelectItem value="CREATED">Created</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="SCANNED">Scanned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Shield className="h-8 w-8 opacity-40" />
              No audit entries match this filter
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[100px]">Action</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[140px]">Actor</TableHead>
                    <TableHead className="w-[160px]">From → To</TableHead>
                    <TableHead className="w-[120px]">Txn #</TableHead>
                    <TableHead className="w-[130px]">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((e, i) => {
                    const config = ACTION_CONFIG[e.action] ?? ACTION_CONFIG.CREATED;
                    const Icon = config.icon;
                    return (
                      <TableRow key={`${e.txnId}-${e.action}-${i}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`flex h-6 w-6 items-center justify-center rounded ${config.bg} ${config.color}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-medium">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {e.bu !== "—" && <BUBadge code={e.bu} />}
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{e.itemName}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{e.itemSku}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{e.actorName}</div>
                              <div className="text-[10px] text-muted-foreground">{e.actorRole ? ROLE_LABELS[e.actorRole] ?? e.actorRole : "—"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="truncate max-w-[60px]" title={e.fromLocation ?? ""}>{e.fromLocation?.split(" ")[0] ?? "—"}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate max-w-[60px]" title={e.toLocation ?? ""}>{e.toLocation?.split(" ")[0] ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TypeBadge type={e.transactionType} />
                            <span className="font-mono text-[10px] text-muted-foreground">#{e.txnId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-[11px]">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />{relativeTime(e.timestamp)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70">{formatDateTime(e.timestamp).split(",")[0]}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
    </div>
  );
}
