import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/search?q=query — global search across items, transactions, projects, locations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ items: [], txns: [], projects: [], locations: [] });
  }

  const [items, txns, projects, locations] = await Promise.all([
    db.item.findMany({
      where: { OR: [{ name: { contains: q } }, { sku: { contains: q } }] },
      include: { category: true, businessUnit: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    db.stockTransaction.findMany({
      where: {
        OR: [
          { notes: { contains: q } },
          { item: { name: { contains: q } } },
          { item: { sku: { contains: q } } },
          { itemUnit: { serialNo: { contains: q } } },
          { itemUnit: { qrCode: { contains: q } } },
          { itemBatch: { batchNo: { contains: q } } },
          { itemBatch: { qrCode: { contains: q } } },
        ],
      },
      include: { item: { include: { businessUnit: true } } },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      where: { OR: [{ name: { contains: q } }, { clientName: { contains: q } }, { serviceType: { contains: q } }] },
      include: { siteLocation: true },
      take: 3,
      orderBy: { name: "asc" },
    }),
    db.location.findMany({
      where: { OR: [{ name: { contains: q } }, { address: { contains: q } }] },
      take: 3,
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    items: items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, unit: i.unitOfMeasure, bu: i.businessUnit?.code ?? "—", trackingMode: i.category.trackingMode })),
    txns: txns.map((t) => ({ id: t.id, type: t.transactionType, status: t.status, itemName: t.item?.name ?? "—", itemSku: t.item?.sku ?? "—", bu: t.item?.businessUnit?.code ?? "—", createdAt: t.createdAt.toISOString() })),
    projects: projects.map((p) => ({ id: p.id, name: p.name, client: p.clientName, status: p.status, site: p.siteLocation?.name ?? null })),
    locations: locations.map((l) => ({ id: l.id, name: l.name, type: l.type })),
  });
}
