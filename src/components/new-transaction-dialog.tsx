"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeftRight, Package, MapPin, FileText, AlertTriangle, ShoppingCart, Send, Truck, Wrench,
  ChevronRight, ChevronLeft, Check, Plus, Minus,
} from "lucide-react";
import { useFetch } from "@/lib/hooks";
import type { ItemLite, LocationLite, ProjectLite } from "@/lib/types";
import { BUBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { refreshPendingCount } from "@/lib/use-pending-count";

type TxnType = "RECEIPT" | "REQUEST" | "DELIVERY" | "TRANSFER" | "CONSUMPTION" | "ADJUSTMENT";

const TXN_TYPES: { value: TxnType; label: string; icon: React.ComponentType<{ className?: string }>; description: string; color: string }[] = [
  { value: "RECEIPT", label: "Receipt", icon: ShoppingCart, description: "Receive stock from a supplier into a warehouse", color: "emerald" },
  { value: "REQUEST", label: "Request", icon: Send, description: "Request stock for a project site (pending approval)", color: "violet" },
  { value: "DELIVERY", label: "Delivery", icon: Truck, description: "Deliver stock from warehouse to a site/vehicle", color: "sky" },
  { value: "TRANSFER", label: "Transfer", icon: ArrowLeftRight, description: "Move stock between locations", color: "cyan" },
  { value: "CONSUMPTION", label: "Consumption", icon: Wrench, description: "Record stock consumed on a project", color: "fuchsia" },
  { value: "ADJUSTMENT", label: "Adjustment", icon: AlertTriangle, description: "Adjust quantity (damaged, lost, count fix)", color: "rose" },
];

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/40", ring: "ring-emerald-500/20" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/40", ring: "ring-violet-500/20" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/40", ring: "ring-sky-500/20" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/40", ring: "ring-cyan-500/20" },
  fuchsia: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400", border: "border-fuchsia-500/40", ring: "ring-fuchsia-500/20" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/40", ring: "ring-rose-500/20" },
};

const REASON_CODES = ["DAMAGED", "LOST", "COUNT_FIX", "EXPIRED", "THEFT", "OTHER"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
  defaultType?: TxnType;
  /** When false, no trigger button is rendered (parent controls open state). */
  showTrigger?: boolean;
}

export function NewTransactionDialog({ open, onOpenChange, onCreated, defaultType, showTrigger = true }: Props) {
  const [step, setStep] = useState(0); // 0=type, 1=details, 2=review
  const [type, setType] = useState<TxnType | null>(defaultType ?? null);
  const [itemId, setItemId] = useState<string>("");
  const [itemUnitId, setItemUnitId] = useState<string>("");
  const [itemBatchId, setItemBatchId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [fromLocationId, setFromLocationId] = useState<string>("");
  const [toLocationId, setToLocationId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [reasonCode, setReasonCode] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: itemsData } = useFetch<{ items: ItemLite[] }>("/api/items");
  const { data: locData } = useFetch<{ locations: LocationLite[] }>("/api/locations");
  const { data: projData } = useFetch<{ projects: ProjectLite[] }>("/api/projects");

  const items = itemsData?.items ?? [];
  const locations = locData?.locations ?? [];
  const projects = projData?.projects ?? [];

  const selectedItem = items.find((i) => i.id === Number(itemId));
  const trackingMode = selectedItem?.category?.trackingMode;

  // Reset form when dialog opens/closes or defaultType changes
  useEffect(() => {
    if (open) {
      setStep(0);
      setType(defaultType ?? null);
      setItemId(""); setItemUnitId(""); setItemBatchId(""); setQuantity("");
      setFromLocationId(""); setToLocationId(""); setProjectId("");
      setReasonCode(""); setNotes("");
    }
  }, [open, defaultType]);

  function canProceedFromDetails(): boolean {
    if (!type || !itemId) return false;
    if (trackingMode === "SERIALIZED" && !itemUnitId) return false;
    if (trackingMode === "BATCH" && !itemBatchId && type !== "RECEIPT") return false;
    if (trackingMode === "BATCH" && !quantity && type !== "RECEIPT") return false;
    if (type === "RECEIPT" && !quantity) return false;
    if (type === "ADJUSTMENT" && !reasonCode) return false;
    // Location requirements vary by type
    if (["DELIVERY", "TRANSFER", "CONSUMPTION"].includes(type) && !fromLocationId) return false;
    if (["RECEIPT", "DELIVERY", "TRANSFER", "REQUEST"].includes(type) && !toLocationId) return false;
    return true;
  }

  async function save() {
    if (!type || !itemId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        transactionType: type,
        itemId: Number(itemId),
      };
      if (itemUnitId) body.itemUnitId = Number(itemUnitId);
      if (itemBatchId) body.itemBatchId = Number(itemBatchId);
      if (quantity) body.quantity = Number(quantity);
      if (fromLocationId) body.fromLocationId = Number(fromLocationId);
      if (toLocationId) body.toLocationId = Number(toLocationId);
      if (projectId) body.projectId = Number(projectId);
      if (reasonCode) body.reasonCode = reasonCode;
      if (notes) body.notes = notes;

      const res = await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed (${res.status})`);
      }
      const result = await res.json();
      toast.success(`${type} created`, { description: `#${result.txn.id} — ${selectedItem?.name}` });
      refreshPendingCount();
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const typeConfig = type ? TXN_TYPES.find((t) => t.value === type) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" /> New Transaction
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {typeConfig ? (
              <>
                <typeConfig.icon className={cn("h-5 w-5", COLOR_CLASSES[typeConfig.color].text)} />
                New {typeConfig.label}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" /> New Transaction
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 0 && "Select the type of stock movement to record in the ledger."}
            {step === 1 && "Fill in the transaction details. All entries create a PENDING record for approval."}
            {step === 2 && "Review the transaction before submitting."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          {["Type", "Details", "Review"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                i < step && "bg-primary text-primary-foreground",
                i === step && "bg-primary/15 text-primary ring-2 ring-primary/30",
                i > step && "bg-muted text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="scroll-thin flex-1 overflow-y-auto">
          {/* Step 0: Type selection */}
          {step === 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TXN_TYPES.map((t) => {
                const Icon = t.icon;
                const colors = COLOR_CLASSES[t.color];
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => { setType(t.value); setStep(1); }}
                    className={cn(
                      "group flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all hover:shadow-md",
                      active ? cn(colors.border, colors.bg) : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors", colors.bg, colors.text)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{t.label}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && typeConfig && (
            <div className="space-y-4">
              {/* Item selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="mr-1 inline h-3 w-3" /> Item *
                </Label>
                <Select value={itemId} onValueChange={(v) => { setItemId(v); setItemUnitId(""); setItemBatchId(""); setQuantity(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {items.map((it) => (
                      <SelectItem key={it.id} value={String(it.id)}>
                        <div className="flex items-center gap-2">
                          {it.businessUnit && <BUBadge code={it.businessUnit.code} />}
                          <span className="font-medium">{it.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{it.sku}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Serialized unit selection */}
              {trackingMode === "SERIALIZED" && selectedItem && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Serialized Unit *
                  </Label>
                  <Select value={itemUnitId} onValueChange={setItemUnitId}>
                    <SelectTrigger><SelectValue placeholder="Select specific unit…" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {selectedItem.units?.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px]">{u.serialNo}</span>
                            <span className="text-[10px] text-muted-foreground">· {u.qrCode}</span>
                            <span className={cn("rounded px-1 text-[10px]", u.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300")}>{u.status}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Batch selection */}
              {trackingMode === "BATCH" && selectedItem && type !== "RECEIPT" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Batch *
                  </Label>
                  <Select value={itemBatchId} onValueChange={setItemBatchId}>
                    <SelectTrigger><SelectValue placeholder="Select batch…" /></SelectTrigger>
                    <SelectContent>
                      {selectedItem.batches?.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px]">{b.batchNo}</span>
                            <span className="text-[10px] text-muted-foreground">· {b.qtyReceived} {selectedItem.unitOfMeasure} received</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quantity */}
              {(trackingMode === "BATCH" || type === "RECEIPT") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quantity {type === "ADJUSTMENT" ? "(negative = reduce)" : ""} *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(String(Math.max(0, Number(quantity || "0") - 1)))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input type="number" step="0.5" min={type === "ADJUSTMENT" ? undefined : "0"} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="text-center font-mono" placeholder="0" />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setQuantity(String(Number(quantity || "0") + 1))}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="ml-1 text-xs text-muted-foreground">{selectedItem?.unitOfMeasure}</span>
                  </div>
                </div>
              )}

              {/* From location */}
              {["DELIVERY", "TRANSFER", "CONSUMPTION", "ADJUSTMENT"].includes(type) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" /> From Location *
                  </Label>
                  <Select value={fromLocationId} onValueChange={setFromLocationId}>
                    <SelectTrigger><SelectValue placeholder="Source location…" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          <span className="text-[10px] uppercase text-muted-foreground">{l.type.replace("_", " ")}</span> · {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* To location */}
              {["RECEIPT", "REQUEST", "DELIVERY", "TRANSFER"].includes(type) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" /> {type === "RECEIPT" ? "Receiving Warehouse *" : "To Location *"}
                  </Label>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger><SelectValue placeholder="Destination…" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {locations.filter((l) => type === "RECEIPT" ? l.type === "WAREHOUSE" : true).map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          <span className="text-[10px] uppercase text-muted-foreground">{l.type.replace("_", " ")}</span> · {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* For RECEIPT, also need a supplier (fromLocation) */}
              {type === "RECEIPT" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" /> Supplier
                  </Label>
                  <Select value={fromLocationId} onValueChange={setFromLocationId}>
                    <SelectTrigger><SelectValue placeholder="Select supplier…" /></SelectTrigger>
                    <SelectContent>
                      {locations.filter((l) => l.type === "SUPPLIER").map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Project link */}
              {["REQUEST", "DELIVERY", "CONSUMPTION"].includes(type) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="mr-1 inline h-3 w-3" /> Project (optional)
                  </Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue placeholder="Link to project…" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="text-[10px] uppercase text-muted-foreground">{p.status}</span> · {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reason code for ADJUSTMENT */}
              {type === "ADJUSTMENT" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <AlertTriangle className="mr-1 inline h-3 w-3" /> Reason Code *
                  </Label>
                  <Select value={reasonCode} onValueChange={setReasonCode}>
                    <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                    <SelectContent>
                      {REASON_CODES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
                <Textarea
                  placeholder="Optional context for the approver…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && typeConfig && (
            <div className="space-y-3">
              <div className={cn("rounded-lg border-2 p-4", COLOR_CLASSES[typeConfig.color].border, COLOR_CLASSES[typeConfig.color].bg)}>
                <div className="flex items-center gap-3">
                  <typeConfig.icon className={cn("h-8 w-8", COLOR_CLASSES[typeConfig.color].text)} />
                  <div>
                    <div className="text-base font-semibold">{typeConfig.label} Transaction</div>
                    <div className="text-xs text-muted-foreground">{typeConfig.description}</div>
                  </div>
                </div>
              </div>

              <ReviewRow label="Item" value={selectedItem?.name ?? "—"} sub={selectedItem?.sku} />
              {itemUnitId && <ReviewRow label="Unit" value={selectedItem?.units?.find((u) => u.id === Number(itemUnitId))?.serialNo ?? "—"} />}
              {itemBatchId && <ReviewRow label="Batch" value={selectedItem?.batches?.find((b) => b.id === Number(itemBatchId))?.batchNo ?? "—"} />}
              {quantity && <ReviewRow label="Quantity" value={`${quantity} ${selectedItem?.unitOfMeasure ?? ""}`} />}
              {fromLocationId && <ReviewRow label="From" value={locations.find((l) => l.id === Number(fromLocationId))?.name ?? "—"} />}
              {toLocationId && <ReviewRow label="To" value={locations.find((l) => l.id === Number(toLocationId))?.name ?? "—"} />}
              {projectId && <ReviewRow label="Project" value={projects.find((p) => p.id === Number(projectId))?.name ?? "—"} />}
              {reasonCode && <ReviewRow label="Reason" value={reasonCode.replace("_", " ")} />}
              {notes && <ReviewRow label="Notes" value={notes} />}

              <div className="rounded-md border border-amber-200/60 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                This will create a <strong>PENDING</strong> transaction in the ledger. An approver must authorize it before stock moves.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step === 0 && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={!canProceedFromDetails()} className="gap-1.5">
              Review <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? "Creating…" : <><Check className="h-4 w-4" /> Create Transaction</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 py-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className="text-sm font-medium">{value}</div>
        {sub && <div className="font-mono text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
