import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { txnInclude } from "@/lib/stock";

// GET /api/dashboard — KPIs + recent activity for the dashboard
export async function GET() {
  const [pendingTxns, totalItems, totalLocations, totalProjects, units, recentTxns, txnsByType, projectList] = await Promise.all([
    db.stockTransaction.count({ where: { status: "PENDING" } }),
    db.item.count({ where: { isActive: true } }),
    db.location.count({ where: { isActive: true, type: "WAREHOUSE" } }),
    db.project.count({ where: { status: { in: ["ONGOING", "PLANNING"] } } }),
    db.itemUnit.findMany({ select: { status: true } }),
    db.stockTransaction.findMany({ include: txnInclude, orderBy: { createdAt: "desc" }, take: 6 }),
    db.stockTransaction.groupBy({ by: ["transactionType"], _count: true }),
    db.project.findMany({ include: { siteLocation: true, milestones: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const statusCounts = units.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1;
    return acc;
  }, {});

  const items = await db.item.findMany({
    where: { isActive: true },
    include: { category: true, businessUnit: true, batches: { include: { transactions: true } } },
  });

  const lowStock: Array<{ id: number; sku: string; name: string; onHand: number; reorderLevel: number; unit: string }> = [];
  for (const it of items) {
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
      if (onHand <= it.reorderLevel) {
        lowStock.push({ id: it.id, sku: it.sku, name: it.name, onHand: Math.round(onHand * 100) / 100, reorderLevel: it.reorderLevel, unit: it.unitOfMeasure });
      }
    }
  }

  const projects = projectList.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.clientName,
    status: p.status,
    percentComplete: p.percentComplete,
    siteLocation: p.siteLocation?.name ?? null,
    milestoneCount: p.milestones.length,
    completedMilestones: p.milestones.filter((m) => m.completedAt).length,
  }));

  return NextResponse.json({
    kpis: {
      pendingApprovals: pendingTxns,
      activeItems: totalItems,
      warehouses: totalLocations,
      activeProjects: totalProjects,
    },
    unitStatus: statusCounts,
    txnsByType: txnsByType.map((t) => ({ type: t.transactionType, count: t._count })),
    recentTxns,
    lowStock,
    projects,
  });
}
