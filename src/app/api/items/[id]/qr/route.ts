import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";

// GET /api/items/[id]/qr — generate a QR PNG for the item's label sheet
// Returns PNG so it can be embedded directly in <img> and printed
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.item.findUnique({
    where: { id: Number(id) },
    include: { category: true, businessUnit: true, units: true, batches: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const labels: { code: string; subtitle: string }[] = [];
  if (item.category.trackingMode === "SERIALIZED") {
    for (const u of item.units) labels.push({ code: u.qrCode, subtitle: `${item.sku} • S/N ${u.serialNo}` });
  } else {
    for (const b of item.batches) labels.push({ code: b.qrCode, subtitle: `${item.sku} • Batch ${b.batchNo}` });
  }

  // Compose a single PNG: white canvas with multiple QR tiles
  const tileSize = 200;
  const padding = 24;
  const cols = Math.min(3, labels.length || 1);
  const rows = Math.ceil(labels.length / cols) || 1;
  const width = cols * tileSize + (cols + 1) * padding;
  const height = rows * (tileSize + 40) + padding;

  // Build SVG then convert — simpler than stitching PNGs without canvas dep
  const tiles: string[] = [];
  for (let i = 0; i < labels.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (tileSize + padding);
    const y = padding + row * (tileSize + 40);
    const qrDataUrl = await QRCode.toDataURL(labels[i].code, { margin: 0, width: tileSize, errorCorrectionLevel: "M" });
    const base64 = qrDataUrl.split(",")[1];
    tiles.push(
      `<g transform="translate(${x},${y})">
        <image href="data:image/png;base64,${base64}" width="${tileSize}" height="${tileSize}"/>
        <text x="${tileSize / 2}" y="${tileSize + 20}" font-family="monospace" font-size="12" text-anchor="middle" fill="#111">${labels[i].code}</text>
        <text x="${tileSize / 2}" y="${tileSize + 34}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#555">${labels[i].subtitle}</text>
      </g>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="white"/>
    ${tiles.join("\n")}
  </svg>`;

  if (req.nextUrl.searchParams.get("format") === "svg") {
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" } });
  }

  // Return a JSON describing available codes (frontend will render the QR client-side from the code)
  return NextResponse.json({
    item: { id: item.id, sku: item.sku, name: item.name },
    trackingMode: item.category.trackingMode,
    labels,
  });
}
