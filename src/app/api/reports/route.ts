import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { txnInclude } from "@/lib/stock";

// GET /api/reports — cross-cutting analytics for the Reports view
export async function GET() {
  const [allTxns, items, units, projects, locations] = await Promise.all([
    db.stockTransaction.findMany({ include: txnInclude, orderBy: { createdAt: "desc" } }),
    db.item.findMany({ include: { category: true, businessUnit: true, units: true, batches: { include: { transactions: true } } } }),
    db.itemUnit.findMany({ include: { item: { include: { businessUnit: true } }, currentLocation: true } }),
    db.project.findMany({ include: { siteLocation: true, transactions: true } }),
    db.location.findMany({ where: { isActive: true }, include: { businessUnit: true } }),
  ]);

  // Movement volume by type
  const byType: Record<string, { count: number; qty: number }> = {};
  for (const t of allTxns) {
    byType[t.transactionType] = byType[t.transactionType] ?? { count: 0, qty: 0 };
    byType[t.transactionType].count++;
    byType[t.transactionType].qty += Math.abs(t.quantity ?? 1);
  }

  // Approval cycle time (avg hours from created_at → approved_at for COMPLETED/APPROVED)
  const closed = allTxns.filter((t) => t.approvedAt);
  const avgCycleHours = closed.length
    ? Math.round((closed.reduce((s, t) => s + (t.approvedAt!.getTime() - t.createdAt.getTime()), 0) / closed.length / 3_600_000) * 10) / 10
    : 0;

  // Inventory valuation by business unit
  const valuationByBU: Record<string, number> = {};
  for (const it of items) {
    const bu = it.businessUnit?.code ?? "UNASSIGNED";
    let qty = 0;
    if (it.category.trackingMode === "SERIALIZED") {
      qty = it.units.filter((u) => u.status !== "RETIRED" && u.status !== "LOST").length;
    } else {
      for (const b of it.batches) {
        qty += b.qtyReceived;
        for (const t of b.transactions) {
          if (t.status !== "COMPLETED") continue;
          if (t.transactionType === "CONSUMPTION") qty -= Math.abs(t.quantity ?? 0);
          else if (t.transactionType === "ADJUSTMENT") qty += t.quantity ?? 0;
          else if (t.transactionType === "DELIVERY" && t.fromLocationId) qty -= Math.abs(t.quantity ?? 0);
        }
      }
    }
    valuationByBU[bu] = (valuationByBU[bu] ?? 0) + qty * it.unitCost;
  }

  // Unit status distribution
  const unitStatus: Record<string, number> = {};
  for (const u of units) unitStatus[u.status] = (unitStatus[u.status] ?? 0) + 1;

  // Top movers (items with most transactions)
  const itemCounts = new Map<number, { sku: string; name: string; count: number }>();
  for (const t of allTxns) {
    if (!t.item) continue;
    const cur = itemCounts.get(t.item.id) ?? { sku: t.item.sku, name: t.item.name, count: 0 };
    cur.count++;
    itemCounts.set(t.item.id, cur);
  }
  const topMovers = Array.from(itemCounts.values()).sort((a, b) => b.count - a.count).slice(0, 8);

  // Project cost summary
  const projectSummary = projects.map((p) => {
    const txnCount = p.transactions.length;
    const consumed = p.transactions
      .filter((t) => t.transactionType === "CONSUMPTION" && t.status === "COMPLETED")
      .reduce((s, t) => s + Math.abs(t.quantity ?? 1) * (t.item?.unitCost ?? 0), 0);
    return {
      id: p.id,
      name: p.name,
      client: p.clientName,
      status: p.status,
      percentComplete: p.percentComplete,
      budget: p.budget,
      consumedCost: Math.round(consumed),
      txnCount,
    };
  });

  return NextResponse.json({
    totalTransactions: allTxns.length,
    byType,
    avgCycleHours,
    valuationByBU,
    unitStatus,
    topMovers,
    projectSummary,
    locations: locations.map((l) => ({ id: l.id, name: l.name, type: l.type, businessUnit: l.businessUnit?.code ?? "—" })),
  });
}
