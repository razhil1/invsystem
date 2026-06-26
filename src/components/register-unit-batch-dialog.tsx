"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { QrCode, PackagePlus, Boxes, Check, Copy } from "lucide-react";
import { useFetch } from "@/lib/hooks";
import type { ItemLite, LocationLite } from "@/lib/types";
import { QRCodeSVG } from "@/components/qr-code";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: ItemLite | null;
  onRegistered: () => void;
}

export function RegisterUnitBatchDialog({ open, onOpenChange, item, onRegistered }: Props) {
  const isSerialized = item?.category?.trackingMode === "SERIALIZED";

  const [serialNo, setSerialNo] = useState("");
  const [currentLocationId, setCurrentLocationId] = useState("");
  const [status, setStatus] = useState("AVAILABLE");

  const [batchNo, setBatchNo] = useState("");
  const [qtyReceived, setQtyReceived] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [toLocationId, setToLocationId] = useState("");

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ qrCode: string; id: number } | null>(null);

  const { data: locData } = useFetch<{ locations: LocationLite[] }>("/api/locations");
  const locations = locData?.locations ?? [];

  function reset() {
    setSerialNo(""); setCurrentLocationId(""); setStatus("AVAILABLE");
    setBatchNo(""); setQtyReceived(""); setExpiryDate(""); setSupplierRef(""); setToLocationId("");
    setResult(null);
  }

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = isSerialized
        ? { serialNo, currentLocationId: currentLocationId || undefined, status }
        : { batchNo, qtyReceived: Number(qtyReceived), expiryDate: expiryDate || undefined, supplierRef: supplierRef || undefined, toLocationId: toLocationId || undefined };

      const res = await fetch(`/api/items/${item.id}/${isSerialized ? "units" : "batches"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Failed (${res.status})`);
      }
      const data = await res.json();
      const qrCode = isSerialized ? data.unit.qrCode : data.batch.qrCode;
      const id = isSerialized ? data.unit.id : data.batch.id;
      setResult({ qrCode, id });
      toast.success(`${isSerialized ? "Unit" : "Batch"} registered`, { description: `QR: ${qrCode}` });
      onRegistered();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSerialized ? <QrCode className="h-5 w-5 text-primary" /> : <Boxes className="h-5 w-5 text-primary" />}
            Register {isSerialized ? "Serialized Unit" : "Batch"}
          </DialogTitle>
          <DialogDescription>
            {item.name} · <span className="font-mono">{item.sku}</span>
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Success state — show QR code
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-6 items-center gap-2 rounded-full bg-emerald-100 px-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-4 w-4" /> Registered successfully
            </div>
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
              <QRCodeSVG value={result.qrCode} size={140} />
            </div>
            <div className="text-center">
              <div className="font-mono text-sm font-semibold">{result.qrCode}</div>
              <div className="text-xs text-muted-foreground">#{result.id}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(result.qrCode);
                toast.success("QR code copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy QR code
            </Button>
          </div>
        ) : (
          // Form state
          <div className="space-y-4">
            {isSerialized ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="serial">Serial Number *</Label>
                  <Input id="serial" placeholder="e.g. INJ-2025-0004" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} className="font-mono" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Initial Location</Label>
                  <Select value={currentLocationId} onValueChange={setCurrentLocationId}>
                    <SelectTrigger><SelectValue placeholder="Where is this unit now?" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          <span className="text-[10px] uppercase text-muted-foreground">{l.type.replace("_", " ")}</span> · {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Initial Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="IN_USE">In Use</SelectItem>
                      <SelectItem value="UNDER_REPAIR">Under Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="batch">Batch Number *</Label>
                  <Input id="batch" placeholder="e.g. MEM-2025-C" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="font-mono" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="qty">Quantity Received *</Label>
                    <Input id="qty" type="number" min="0" step="0.5" placeholder="0" value={qtyReceived} onChange={(e) => setQtyReceived(e.target.value)} className="font-mono" />
                    <span className="text-[10px] text-muted-foreground">{item.unitOfMeasure}</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp">Expiry Date</Label>
                    <Input id="exp" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup">Supplier Reference</Label>
                  <Input id="sup" placeholder="e.g. Sika Singapore" value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Receiving Warehouse</Label>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger><SelectValue placeholder="Where was this received?" /></SelectTrigger>
                    <SelectContent>
                      {locations.filter((l) => l.type === "WAREHOUSE").map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Close</Button>
              <Button onClick={() => reset()} className="gap-1.5">
                <PackagePlus className="h-4 w-4" /> Register another
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={save}
                disabled={saving || (isSerialized ? !serialNo : !batchNo || !qtyReceived)}
                className="gap-1.5"
              >
                {saving ? "Registering…" : <><QrCode className="h-4 w-4" /> Generate QR & Register</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
