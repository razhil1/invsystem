import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { txnInclude } from "@/lib/stock";

// GET /api/locations/[id]/stock — current stock at a location (the "mini system per site page")
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locId = Number(id);
  const location = await db.location.findUnique({ where: { id: locId }, include: { businessUnit: true } });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Serialized units currently at this location
  const units = await db.itemUnit.findMany({
    where: { currentLocationId: locId },
    include: { item: { include: { category: true, businessUnit: true } } },
    orderBy: { qrCode: "asc" },
  });

  // Batch stock at this location — derived from completed transactions touching this location
  const txns = await db.stockTransaction.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ fromLocationId: locId }, { toLocationId: locId }],
    },
    include: txnInclude,
  });

  // Aggregate batch on-hand per (item, batch)
  type BatchRow = {
    itemId: number; sku: string; itemName: string; batchNo: string; qrCode: string; qty: number; unit: string; expiryDate: string | null;
  };
  const map = new Map<string, BatchRow>();
  for (const t of txns) {
    if (!t.itemBatch || !t.item) continue;
    const key = `${t.itemBatch.itemId}-${t.itemBatch.id}`;
    const row = map.get(key) ?? {
      itemId: t.item.id,
      sku: t.item.sku,
      itemName: t.item.name,
      batchNo: t.itemBatch.batchNo,
      qrCode: t.itemBatch.qrCode,
      qty: 0,
      unit: t.item.unitOfMeasure,
      expiryDate: t.itemBatch.expiryDate ? t.itemBatch.expiryDate.toISOString().slice(0, 10) : null,
    };
    // DELIVERY/TRANSFER/CONSUMPTION into this loc = +qty at toLocation (already moved in); from this loc = -qty
    if (t.toLocationId === locId && ["DELIVERY", "TRANSFER", "RECEIPT"].includes(t.transactionType)) row.qty += Math.abs(t.quantity ?? 1);
    if (t.fromLocationId === locId && ["DELIVERY", "TRANSFER", "CONSUMPTION"].includes(t.transactionType)) row.qty -= Math.abs(t.quantity ?? 1);
    if (t.transactionType === "ADJUSTMENT" && t.fromLocationId === locId) row.qty += t.quantity ?? 0;
    map.set(key, row);
  }

  const batchStock = Array.from(map.values()).filter((r) => Math.abs(r.qty) > 0.001);

  // Group movements by source for the "Stock by source" split
  const byType: Record<string, number> = {};
  for (const t of txns) {
    if (t.toLocationId === locId) {
      byType[t.transactionType] = (byType[t.transactionType] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    location,
    serializedUnits: units,
    batchStock,
    movementSummary: byType,
    totalMovements: txns.length,
  });
}
