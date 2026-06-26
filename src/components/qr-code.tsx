"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * Client-side QR code renderer using the proven `qrcode` package.
 * Renders to a canvas (fast, scans correctly) and exposes the data URL for
 * download/print.
 */
export function QRCodeSVG({ value, size = 120, className }: { value: string; size?: number; className?: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      margin: 1,
      width: size * 2, // 2x for crisp printing
      errorCorrectionLevel: "M",
      color: { dark: "#0f1a17", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={cn("flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 bg-muted/20", className)}
        style={{ width: size, height: size }}
        aria-label={`Generating QR for ${value}`}
      />
    );
  }

  return (
     
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={`QR code ${value}`}
      className={cn("block rounded", className)}
      style={{ width: size, height: size }}
    />
  );
}
