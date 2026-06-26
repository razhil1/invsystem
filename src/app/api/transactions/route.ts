import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { txnInclude } from "@/lib/stock";

// GET /api/transactions — list with filters: ?status=&type=&locationId=&projectId=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const locationId = searchParams.get("locationId");
  const projectId = searchParams.get("projectId");
  const q = searchParams.get("q");
  const limit = Number(searchParams.get("limit") ?? 100);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.transactionType = type;
  if (projectId) where.projectId = Number(projectId);
  if (locationId) {
    where.OR = [
      { fromLocationId: Number(locationId) },
      { toLocationId: Number(locationId) },
    ];
  }
  if (q) {
    where.OR = [
      { notes: { contains: q } },
      { reasonCode: { contains: q } },
      { item: { name: { contains: q } } },
      { item: { sku: { contains: q } } },
      { itemUnit: { serialNo: { contains: q } } },
      { itemUnit: { qrCode: { contains: q } } },
      { itemBatch: { batchNo: { contains: q } } },
    ];
  }

  const txns = await db.stockTransaction.findMany({
    include: txnInclude,
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ txns });
}

// POST /api/transactions — create a new transaction (always starts PENDING unless RECEIPT)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    transactionType,
    itemId,
    itemUnitId,
    itemBatchId,
    quantity,
    fromLocationId,
    toLocationId,
    projectId,
    requestedById,
    notes,
    reasonCode,
  } = body ?? {};

  if (!transactionType || !itemId) {
    return NextResponse.json({ error: "transactionType and itemId are required" }, { status: 400 });
  }

  // Auto-assign a QR-friendly id reference at creation (not stored separately — derived from id)
  const txn = await db.stockTransaction.create({
    data: {
      transactionType,
      itemId: Number(itemId),
      itemUnitId: itemUnitId ? Number(itemUnitId) : null,
      itemBatchId: itemBatchId ? Number(itemBatchId) : null,
      quantity: quantity != null ? Number(quantity) : null,
      fromLocationId: fromLocationId ? Number(fromLocationId) : null,
      toLocationId: toLocationId ? Number(toLocationId) : null,
      projectId: projectId ? Number(projectId) : null,
      requestedById: requestedById ?? null,
      notes: notes ?? null,
      reasonCode: reasonCode ?? null,
      status: "PENDING",
    },
    include: txnInclude,
  });

  return NextResponse.json({ txn }, { status: 201 });
}
