import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/items/[id]/units — register a new serialized unit (generates QR code)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  const body = await req.json();
  const { serialNo, currentLocationId, status, attributes } = body ?? {};

  if (!serialNo) {
    return NextResponse.json({ error: "serialNo is required" }, { status: 400 });
  }

  const item = await db.item.findUnique({
    where: { id: itemId },
    include: { category: true, businessUnit: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.category.trackingMode !== "SERIALIZED") {
    return NextResponse.json({ error: "Item is not serialized — use batches instead" }, { status: 400 });
  }

  // Check serial uniqueness
  const existing = await db.itemUnit.findUnique({ where: { serialNo } });
  if (existing) {
    return NextResponse.json({ error: `Serial number ${serialNo} already exists` }, { status: 409 });
  }

  // Generate QR code: BU-ITEMCODE-NNNNN
  const count = await db.itemUnit.count({ where: { itemId } });
  const buCode = item.businessUnit?.code ?? "GEN";
  const itemPrefix = item.sku.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();
  const qrCode = `${buCode}-${itemPrefix}-${String(count + 1).padStart(5, "0")}`;

  const unit = await db.itemUnit.create({
    data: {
      itemId,
      serialNo,
      qrCode,
      currentLocationId: currentLocationId ? Number(currentLocationId) : null,
      status: status ?? "AVAILABLE",
      receivedAt: new Date(),
      attributes: attributes ? JSON.stringify(attributes) : "{}",
    },
  });

  // Also create a RECEIPT transaction in the ledger for this unit
  await db.stockTransaction.create({
    data: {
      transactionType: "RECEIPT",
      itemId,
      itemUnitId: unit.id,
      fromLocationId: currentLocationId ? undefined : undefined,
      toLocationId: currentLocationId ? Number(currentLocationId) : undefined,
      status: "COMPLETED",
      notes: `Unit registered: ${serialNo}`,
    },
  });

  return NextResponse.json({ unit, qrCode }, { status: 201 });
}
