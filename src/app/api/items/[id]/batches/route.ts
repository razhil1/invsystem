import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/items/[id]/batches — register a new batch/lot (generates QR code)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  const body = await req.json();
  const { batchNo, qtyReceived, expiryDate, supplierRef, fromLocationId, toLocationId } = body ?? {};

  if (!batchNo || qtyReceived == null) {
    return NextResponse.json({ error: "batchNo and qtyReceived are required" }, { status: 400 });
  }

  const item = await db.item.findUnique({
    where: { id: itemId },
    include: { category: true, businessUnit: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.category.trackingMode !== "BATCH") {
    return NextResponse.json({ error: "Item is not batch-tracked — use units instead" }, { status: 400 });
  }

  // Check batch uniqueness for this item
  const existing = await db.itemBatch.findUnique({
    where: { itemId_batchNo: { itemId, batchNo } },
  });
  if (existing) {
    return NextResponse.json({ error: `Batch ${batchNo} already exists for this item` }, { status: 409 });
  }

  // Generate QR code
  const count = await db.itemBatch.count({ where: { itemId } });
  const buCode = item.businessUnit?.code ?? "GEN";
  const itemPrefix = item.sku.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
  const qrCode = `${buCode}-BAT-${itemPrefix}-${String(count + 1).padStart(4, "0")}`;

  const batch = await db.itemBatch.create({
    data: {
      itemId,
      batchNo,
      qrCode,
      qtyReceived: Number(qtyReceived),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      supplierRef: supplierRef ?? null,
      receivedAt: new Date(),
    },
  });

  // Create a RECEIPT transaction in the ledger
  await db.stockTransaction.create({
    data: {
      transactionType: "RECEIPT",
      itemId,
      itemBatchId: batch.id,
      quantity: Number(qtyReceived),
      fromLocationId: fromLocationId ? Number(fromLocationId) : null,
      toLocationId: toLocationId ? Number(toLocationId) : null,
      status: "COMPLETED",
      notes: `Batch registered: ${batchNo}`,
    },
  });

  return NextResponse.json({ batch, qrCode }, { status: 201 });
}
