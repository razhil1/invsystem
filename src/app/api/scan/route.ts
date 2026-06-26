import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { txnInclude } from "@/lib/stock";

// GET /api/scan?q=QR-CODE — lookup any item unit or batch by its QR code
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q (qr code) required" }, { status: 400 });

  const [unit, batch] = await Promise.all([
    db.itemUnit.findFirst({
      where: { OR: [{ qrCode: q }, { serialNo: q }] },
      include: { item: { include: { category: true, businessUnit: true } }, currentLocation: true, transactions: { include: txnInclude, take: 5, orderBy: { createdAt: "desc" } } },
    }),
    db.itemBatch.findFirst({
      where: { OR: [{ qrCode: q }, { batchNo: q }] },
      include: { item: { include: { category: true, businessUnit: true } }, transactions: { include: txnInclude, take: 5, orderBy: { createdAt: "desc" } } },
    }),
  ]);

  if (unit) {
    return NextResponse.json({
      kind: "unit",
      id: unit.id,
      qrCode: unit.qrCode,
      serialNo: unit.serialNo,
      status: unit.status,
      item: unit.item,
      currentLocation: unit.currentLocation,
      history: unit.transactions,
    });
  }
  if (batch) {
    return NextResponse.json({
      kind: "batch",
      id: batch.id,
      qrCode: batch.qrCode,
      batchNo: batch.batchNo,
      qtyReceived: batch.qtyReceived,
      expiryDate: batch.expiryDate,
      supplierRef: batch.supplierRef,
      item: batch.item,
      history: batch.transactions,
    });
  }
  return NextResponse.json({ error: "No item unit or batch matches that code" }, { status: 404 });
}

// POST /api/scan — record a physical scan event on an existing transaction
// body: { qrCode, transactionId, scannedById, photoEvidenceUrl? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { qrCode, transactionId, scannedById, photoEvidenceUrl } = body ?? {};
  if (!qrCode || !transactionId || !scannedById) {
    return NextResponse.json({ error: "qrCode, transactionId, scannedById required" }, { status: 400 });
  }

  const txn = await db.stockTransaction.findUnique({ where: { id: Number(transactionId) }, include: txnInclude });
  if (!txn) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (txn.status !== "APPROVED" && txn.status !== "PENDING") {
    return NextResponse.json({ error: `Cannot scan a ${txn.status} transaction` }, { status: 409 });
  }

  // Verify the scanned code actually belongs to this transaction's item
  const expectedCode = txn.itemUnit?.qrCode ?? txn.itemBatch?.qrCode;
  if (expectedCode && expectedCode !== qrCode) {
    return NextResponse.json({ error: `Scanned code (${qrCode}) does not match this transaction's item (${expectedCode})` }, { status: 422 });
  }

  const now = new Date();
  const updated = await db.stockTransaction.update({
    where: { id: Number(transactionId) },
    data: {
      qrScannedAt: now,
      scannedById,
      photoEvidenceUrl: photoEvidenceUrl ?? null,
      status: "COMPLETED",
      approvedById: txn.approvedById ?? scannedById,
      approvedAt: txn.approvedAt ?? now,
    },
    include: txnInclude,
  });

  // Physically move the serialized unit
  if (updated.itemUnitId && updated.toLocationId) {
    let status = updated.itemUnit?.status ?? "AVAILABLE";
    if (updated.transactionType === "PULL_OUT") status = "UNDER_REPAIR";
    else if (["DELIVERY", "TRANSFER", "CONSUMPTION"].includes(updated.transactionType)) status = "IN_USE";
    await db.itemUnit.update({ where: { id: updated.itemUnitId }, data: { currentLocationId: updated.toLocationId, status } });
  }

  return NextResponse.json({ txn: updated });
}
