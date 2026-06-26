import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { itemInclude } from "@/lib/stock";

// GET /api/items — list with optional filter ?businessUnit=&trackingMode=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessUnitId = searchParams.get("businessUnitId");
  const trackingMode = searchParams.get("trackingMode");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = { isActive: true };
  if (businessUnitId) where.businessUnitId = Number(businessUnitId);
  if (trackingMode) where.category = { trackingMode };
  if (q) {
    where.OR = [{ name: { contains: q } }, { sku: { contains: q } }];
  }

  const items = await db.item.findMany({
    include: { ...itemInclude, batches: { include: { transactions: true } } },
    where,
    orderBy: { sku: "asc" },
  });

  // Compute current on-hand for batch items
  const computed = items.map((it) => {
    if (it.category.trackingMode === "BATCH") {
      let onHand = 0;
      for (const b of it.batches) {
        onHand += b.qtyReceived;
        for (const t of b.transactions) {
          if (t.status !== "COMPLETED") continue;
          if (t.transactionType === "CONSUMPTION") onHand -= Math.abs(t.quantity ?? 0);
          else if (t.transactionType === "ADJUSTMENT") onHand += t.quantity ?? 0;
          else if (t.transactionType === "DELIVERY" && t.fromLocationId) onHand -= Math.abs(t.quantity ?? 0);
        }
      }
      return { ...it, onHand: Math.round(onHand * 100) / 100 };
    }
    // For serialized, on-hand = number of available units
    return { ...it, onHand: it.units.filter((u) => u.status === "AVAILABLE").length };
  });

  return NextResponse.json({ items: computed });
}

// POST /api/items — create a new item master record
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sku, name, unitOfMeasure, unitCost, reorderLevel, categoryId, businessUnitId, attributes } = body ?? {};
  if (!sku || !name || !categoryId) {
    return NextResponse.json({ error: "sku, name, categoryId required" }, { status: 400 });
  }
  const item = await db.item.create({
    data: {
      sku,
      name,
      unitOfMeasure: unitOfMeasure ?? "pcs",
      unitCost: Number(unitCost ?? 0),
      reorderLevel: Number(reorderLevel ?? 0),
      categoryId: Number(categoryId),
      businessUnitId: businessUnitId ? Number(businessUnitId) : null,
      attributes: attributes ? JSON.stringify(attributes) : "{}",
    },
    include: itemInclude,
  });
  return NextResponse.json({ item }, { status: 201 });
}
