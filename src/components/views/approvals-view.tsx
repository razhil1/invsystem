"use client";

import { useFetch } from "@/lib/hooks";
import { refreshPendingCount } from "@/lib/use-pending-count";
import type { TxnLite } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, TypeBadge, BUBadge } from "@/components/badges";
import { useUI } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatNumber, relativeTime } from "@/lib/hooks";
import { ROLE_LABELS } from "@/lib/types";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  ScanLine,
  Inbox,
  Clock,
  User,
  MapPin,
  ArrowRight,
  Package,
  FileText,
  Camera,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export function ApprovalsView() {
  const { data, loading, refresh } = useFetch<{ txns: TxnLite[] }>("/api/transactions?status=PENDING");
  const currentUserId = useUI((s) => s.currentUserId);
  const currentUserName = useUI((s) => s.currentUserName);
  const openScanner = useUI((s) => s.openScanner);
  const [rejecting, setRejecting] = useState<TxnLite | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const txns = data?.txns ?? [];

  async function act(t: TxnLite, action: "APPROVE" | "REJECT", scanned = false, note?: string) {
    if (!currentUserId) {
      toast.error("Select an acting user first");
      return;
    }
    setBusy(t.id);
    try {
      const res = await fetch(`/api/transactions/${t.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, approverId: currentUserId, scanned, notes: note }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed (${res.status})`);
      }
      toast.success(
        action === "APPROVE"
          ? `Approved #${t.id} — ${scanned ? "scanned & completed" : "awaiting scan"}`
          : `Rejected #${t.id}`,
        { description: t.item?.name }
      );
      refresh();
      refreshPendingCount();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
      setRejecting(null);
      setRejectNote("");
    }
  }

  if (loading) return <ApprovalsSkeleton />;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Summary banner */}
      <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/40 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold">{txns.length} pending approval{txns.length === 1 ? "" : "s"}</div>
            <div className="text-xs text-muted-foreground">
              Acting as <span className="font-medium text-foreground">{currentUserName ?? "—"}</span>
              {currentUserId && <> · {ROLE_LABELS["ADMIN"]}</>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Single-level approval · approve-then-scan workflow
          </div>
        </CardContent>
      </Card>

      {txns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="text-lg font-medium">Queue is clear</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Every pending stock movement has been reviewed. New requests from field engineers or stock clerks will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {txns.map((t) => {
            const isBusy = busy === t.id;
            return (
              <Card key={t.id} className="overflow-hidden border-border/60 transition-shadow hover:shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch">
                    {/* Left: identity */}
                    <div className="flex flex-1 flex-col gap-3 lg:border-r lg:border-border/60 lg:pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeBadge type={t.transactionType} />
                        <StatusBadge status={t.status} />
                        {t.item?.businessUnit && <BUBadge code={t.item.businessUnit.code} />}
                        <span className="font-mono text-[11px] text-muted-foreground">#{t.id}</span>
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {relativeTime(t.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{t.item?.name ?? "—"}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {t.item?.sku}
                            {t.itemUnit && ` · S/N ${t.itemUnit.serialNo}`}
                            {t.itemBatch && ` · Batch ${t.itemBatch.batchNo}`}
                            {t.quantity != null && ` · Qty ${formatNumber(t.quantity, 1)} ${t.item?.unitOfMeasure ?? ""}`}
                          </div>
                        </div>
                      </div>

                      {/* Movement path */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[160px]">{t.fromLocation?.name ?? "—"}</span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[160px]">{t.toLocation?.name ?? "—"}</span>
                        </div>
                        {t.project && (
                          <div className="flex items-center gap-1.5 rounded-md border border-sky-200/60 bg-sky-50/50 px-2 py-1 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300">
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-[160px]">{t.project.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Requested by + notes */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          Requested by <span className="font-medium text-foreground">{t.requestedBy?.fullName ?? "—"}</span>
                          <span className="text-muted-foreground/60">·</span>
                          {formatDateTime(t.createdAt)}
                        </div>
                        {t.notes && (
                          <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1.5 text-foreground/80">
                            “{t.notes}”
                          </div>
                        )}
                        {t.reasonCode && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono rounded bg-rose-100 px-1 text-[10px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              {t.reasonCode}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-row gap-2 lg:w-56 lg:flex-col">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        disabled={isBusy}
                        onClick={() => act(t, "APPROVE", false)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        disabled={isBusy}
                        onClick={() => act(t, "APPROVE", true)}
                        title="Approve and immediately record a physical scan — completes the transaction"
                      >
                        <ScanLine className="h-4 w-4" />
                        Approve &amp; Scan
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                        disabled={isBusy}
                        onClick={() => setRejecting(t)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs"
                        disabled={isBusy}
                        onClick={() => openScanner(t.id)}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Scan only
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject transaction #{rejecting?.id}?</DialogTitle>
            <DialogDescription>
              This will mark the {rejecting?.transactionType} for {rejecting?.item?.name} as rejected. The requester will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Reason (optional)</Label>
            <Textarea
              id="reject-note"
              placeholder="e.g. Wrong item scanned, please re-request with correct QR code"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejecting && act(rejecting, "REJECT", false, rejectNote)}>
              <XCircle className="mr-1.5 h-4 w-4" /> Reject transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalsSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Skeleton className="h-24 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}
