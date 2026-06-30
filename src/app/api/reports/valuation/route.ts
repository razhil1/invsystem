import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/reports/valuation — stock valuation broken down by warehouse + business unit
export async function GET() {
  const [locations, items] = await Promise.all([
    db.location.findMany({
      where: { isActive: true, type: "WAREHOUSE" },
      include: { businessUnit: true },
      orderBy: { name: "asc" },
    }),
    db.item.findMany({
      include: {
        category: true,
        businessUnit: true,
        units: { where: { status: { notIn: ["RETIRED", "LOST"] } } },
        batches: { include: { transactions: true } },
      },
    }),
  ]);

  // For each warehouse, compute stock value
  const warehouseValuation = locations.map((loc) => {
    let totalValue = 0;
    let totalUnits = 0;
    const itemBreakdown: { sku: string; name: string; qty: number; unit: string; unitCost: number; totalValue: number; bu: string }[] = [];

    // Get all transactions touching this location
    // For simplicity, use the item-level calculation: serialized units at this loc + batch stock derived
    // We'll fetch units at this location and batch movements
    return {
      id: loc.id,
      name: loc.name,
      type: loc.type,
      bu: loc.businessUnit?.code ?? "—",
      // placeholder, filled below
      totalValue: 0,
      totalUnits: 0,
      items: [] as typeof itemBreakdown,
    };
  });

  // Actually compute properly — fetch units per warehouse + batch stock
  const unitsByLoc = await db.itemUnit.groupBy({
    by: ["currentLocationId"],
    where: { currentLocationId: { not: null }, status: { notIn: ["RETIRED", "LOST"] } },
    _count: true,
  });

  // Get units with item info for valuation
  const allUnits = await db.itemUnit.findMany({
    where: { currentLocationId: { not: null }, status: { notIn: ["RETIRED", "LOST"] } },
    include: { item: { include: { businessUnit: true } } },
  });

  for (const wh of warehouseValuation) {
    const unitsHere = allUnits.filter((u) => u.currentLocationId === wh.id);
    for (const u of unitsHere) {
      const val = u.item.unitCost;
      wh.totalValue += val;
      wh.totalUnits += 1;
      const existing = wh.items.find((i) => i.sku === u.item.sku);
      if (existing) {
        existing.qty += 1;
        existing.totalValue += val;
      } else {
        wh.items.push({ sku: u.item.sku, name: u.item.name, qty: 1, unit: u.item.unitOfMeasure, unitCost: u.item.unitCost, totalValue: val, bu: u.item.businessUnit?.code ?? "—" });
      }
    }
  }

  // Batch stock — derive per warehouse from transactions
  const batchTxns = await db.stockTransaction.findMany({
    where: { status: "COMPLETED", itemBatchId: { not: null } },
    include: { item: { include: { businessUnit: true } }, itemBatch: true },
  });

  for (const wh of warehouseValuation) {
    const batchMap = new Map<number, number>();
    for (const t of batchTxns) {
      if (!t.itemBatch || !t.item) continue;
      const key = t.itemBatch.id;
      const cur = batchMap.get(key) ?? 0;
      if (t.toLocationId === wh.id && ["DELIVERY", "TRANSFER", "RECEIPT"].includes(t.transactionType)) {
        batchMap.set(key, cur + Math.abs(t.quantity ?? 1));
      }
      if (t.fromLocationId === wh.id && ["DELIVERY", "TRANSFER", "CONSUMPTION"].includes(t.transactionType)) {
        batchMap.set(key, cur - Math.abs(t.quantity ?? 1));
      }
      if (t.transactionType === "ADJUSTMENT" && t.fromLocationId === wh.id) {
        batchMap.set(key, cur + (t.quantity ?? 0));
      }
    }
    for (const [batchId, qty] of batchMap) {
      if (qty <= 0.001) continue;
      const t = batchTxns.find((x) => x.itemBatchId === batchId);
      if (!t?.item) continue;
      const val = qty * t.item.unitCost;
      wh.totalValue += val;
      const existing = wh.items.find((i) => i.sku === t.item!.sku);
      if (existing) {
        existing.qty += qty;
        existing.totalValue += val;
      } else {
        wh.items.push({ sku: t.item.sku, name: t.item.name, qty, unit: t.item.unitOfMeasure, unitCost: t.item.unitCost, totalValue: val, bu: t.item.businessUnit?.code ?? "—" });
      }
    }
  }

  // Round values
  for (const wh of warehouseValuation) {
    wh.totalValue = Math.round(wh.totalValue);
    wh.items = wh.items.map((i) => ({ ...i, totalValue: Math.round(i.totalValue) }));
  }

  const grandTotal = warehouseValuation.reduce((s, w) => s + w.totalValue, 0);

  return NextResponse.json({
    warehouses: warehouseValuation,
    grandTotal,
    warehouseCount: locations.length,
  });
}
