"use client";

import { useEffect, useRef, useState } from "react";
import { useUI } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ScanLine, Camera, CameraOff, CheckCircle2, AlertCircle, X, Zap, Keyboard } from "lucide-react";
import type { ScanResult, TxnLite } from "@/lib/types";
import { toast } from "sonner";
import { StatusBadge, TypeBadge, BUBadge } from "@/components/badges";
import { formatNumber, relativeTime } from "@/lib/hooks";

type ScanMode = "camera" | "manual";

export function QRScannerModal() {
  const open = useUI((s) => s.scannerOpen);
  const close = useUI((s) => s.closeScanner);
  const txnId = useUI((s) => s.scannerTransactionId);
  const currentUserId = useUI((s) => s.currentUserId);
  const setView = useUI((s) => s.setView);

  const [mode, setMode] = useState<ScanMode>("camera");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [linkedTxn, setLinkedTxn] = useState<TxnLite | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
      setManualCode("");
      setLinkedTxn(null);
      setMode("camera");
    } else {
      stopCamera();
    }
  }, [open]);

  // If opened with a transactionId, fetch that txn to display context
  useEffect(() => {
    if (!open || !txnId) return;
    let cancelled = false;
    fetch(`/api/transactions?limit=500`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const t = (d.txns as TxnLite[]).find((x) => x.id === txnId);
        setLinkedTxn(t ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, txnId]);

  // Camera setup
  useEffect(() => {
    if (!open || mode !== "camera") {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
     
  }, [open, mode]);

  async function startCamera() {
    setError(null);
    setScanning(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      detectLoop();
    } catch (e) {
      setScanning(false);
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        setError("Camera permission denied. Use manual entry below.");
      } else if (e instanceof DOMException && e.name === "NotFoundError") {
        setError("No camera found. Use manual entry below.");
      } else {
        setError(e instanceof Error ? e.message : "Camera unavailable. Use manual entry.");
      }
      setMode("manual");
    }
  }

  function stopCamera() {
    setScanning(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // Detection loop — uses native BarcodeDetector where available, else just shows live preview
  async function detectLoop() {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (video.readyState >= 2) {
      // @ts-expect-error - BarcodeDetector is not in standard TS types
      if ("BarcodeDetector" in window) {
        try {
          // @ts-expect-error - construct
          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          const codes = await detector.detect(video);
          if (codes && codes.length > 0) {
            const value = codes[0].rawValue as string;
            const now = Date.now();
            // Debounce: same code within 2.5s is ignored
            if (value !== lastScanRef.current.code || now - lastScanRef.current.time > 2500) {
              lastScanRef.current = { code: value, time: now };
              await lookupCode(value);
            }
          }
        } catch {
          // detection failed this frame; continue
        }
      }
    }
    rafRef.current = requestAnimationFrame(detectLoop);
  }

  async function lookupCode(code: string) {
    if (!code.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/scan?q=${encodeURIComponent(code.trim())}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `Lookup failed (${res.status})`);
      }
      const data: ScanResult = await res.json();
      setResult(data);
      stopCamera();
      toast.success(`Scanned: ${data.item.name}`, { description: data.kind === "unit" ? `Serial ${data.serialNo}` : `Batch ${data.batchNo}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
      setResult(null);
    }
  }

  async function confirmScan() {
    if (!result || !currentUserId) {
      if (!currentUserId) toast.error("Select an acting user first");
      return;
    }
    // If a transaction was pre-bound, record the scan against it
    if (txnId) {
      setSubmitting(true);
      try {
        const res = await fetch("/api/scan", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCode: result.qrCode, transactionId: txnId, scannedById: currentUserId }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error ?? `Failed (${res.status})`);
        }
        toast.success("Scan recorded & transaction completed", { description: `#${txnId}` });
        close();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Submit failed");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Standalone scan — just acknowledge the verification
      toast.success("Item verified", { description: `${result.qrCode} confirmed at ${new Date().toLocaleTimeString()}` });
      close();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> QR Scanner
          </DialogTitle>
          <DialogDescription>
            {txnId
              ? `Verify the physical item for transaction #${txnId} by scanning its QR code.`
              : "Scan any item's QR code to look it up and verify its location."}
          </DialogDescription>
        </DialogHeader>

        {/* Linked transaction context */}
        {linkedTxn && (
          <div className="rounded-md border border-sky-200/50 bg-sky-50/40 p-3 dark:border-sky-900/40 dark:bg-sky-950/15">
            <div className="mb-1 flex items-center gap-2">
              <TypeBadge type={linkedTxn.transactionType} />
              <StatusBadge status={linkedTxn.status} />
              <span className="font-mono text-[11px] text-muted-foreground">#{linkedTxn.id}</span>
            </div>
            <div className="text-sm font-medium">{linkedTxn.item?.name}</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {linkedTxn.item?.sku}
              {linkedTxn.itemUnit && ` · expected ${linkedTxn.itemUnit.qrCode}`}
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            size="sm" className="flex-1 gap-1.5"
            onClick={() => setMode("camera")}
          >
            <Camera className="h-4 w-4" /> Camera
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm" className="flex-1 gap-1.5"
            onClick={() => { setMode("manual"); stopCamera(); }}
          >
            <Keyboard className="h-4 w-4" /> Manual entry
          </Button>
        </div>

        {/* Camera view */}
        {mode === "camera" && (
          <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-56 w-full object-cover"
            />
            {/* Reticle overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-40 w-40">
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-primary" />
                <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-primary" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-primary" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-primary" />
                {scanning && (
                  <div className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-primary/70" />
                )}
              </div>
            </div>
            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Button size="sm" onClick={startCamera} className="gap-1.5">
                  <Camera className="h-4 w-4" /> Start camera
                </Button>
              </div>
            )}
            {error && (
              <div className="absolute inset-x-0 bottom-0 bg-amber-950/90 px-3 py-2 text-xs text-amber-200">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Manual entry */}
        {mode === "manual" && (
          <div className="space-y-2">
            <Input
              placeholder="Enter QR code (e.g. WP-TOL-00482)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && manualCode.trim()) lookupCode(manualCode); }}
              className="font-mono"
              autoFocus
            />
            <Button className="w-full gap-1.5" onClick={() => lookupCode(manualCode)} disabled={!manualCode.trim()}>
              <Zap className="h-4 w-4" /> Look up code
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3 rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/15">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {result.kind === "unit" ? "Serialized unit found" : "Batch found"}
            </div>
            <div className="rounded-md bg-background/60 p-3">
              <div className="flex items-center gap-2">
                {result.item.businessUnit && <BUBadge code={result.item.businessUnit.code} />}
                <span className="font-medium">{result.item.name}</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {result.item.sku} · {result.qrCode}
              </div>
              {result.kind === "unit" && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span>Serial: <span className="font-mono">{result.serialNo}</span></span>
                  <StatusBadge status={result.status ?? "—"} />
                </div>
              )}
              {result.kind === "batch" && (
                <div className="mt-2 text-xs">
                  Batch <span className="font-mono">{result.batchNo}</span> · {formatNumber(result.qtyReceived ?? 0, 1)} {result.item.unitOfMeasure} received
                  {result.expiryDate && ` · expires ${result.expiryDate.slice(0, 10)}`}
                </div>
              )}
              {result.currentLocation && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Currently at: <span className="font-medium text-foreground">{result.currentLocation.name}</span>
                </div>
              )}
            </div>
            {result.history.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                Last movement: {relativeTime(result.history[0].createdAt)}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close} className="gap-1.5">
            <X className="h-4 w-4" /> Close
          </Button>
          {result && (
            <Button onClick={confirmScan} disabled={submitting} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "Recording…" : txnId ? "Confirm & complete" : "Confirm scan"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
