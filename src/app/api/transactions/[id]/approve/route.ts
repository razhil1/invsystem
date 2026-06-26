import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { txnInclude } from "@/lib/stock";

// PATCH /api/transactions/[id]/approve — single-level approval
// body: { action: "APPROVE" | "REJECT", approverId, scanned? (boolean), photoEvidenceUrl? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action, approverId, scanned, photoEvidenceUrl } = body ?? {};

  if (!approverId || (action !== "APPROVE" && action !== "REJECT")) {
    return NextResponse.json({ error: "action (APPROVE|REJECT) and approverId required" }, { status: 400 });
  }

  const txn = await db.stockTransaction.findUnique({ where: { id: Number(id) } });
  if (!txn) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (txn.status !== "PENDING") {
    return NextResponse.json({ error: `Transaction is already ${txn.status}` }, { status: 409 });
  }

  const now = new Date();
  const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  // On approve: mark approved; if scanned, set qrScannedAt and move toward COMPLETED
  // On approve+scan: transition directly to COMPLETED and physically move the unit/batch
  const data: Record<string, unknown> = {
    status: scanned && action === "APPROVE" ? "COMPLETED" : newStatus,
    approvedById: approverId,
    approvedAt: now,
  };
  if (scanned && action === "APPROVE") {
    data.qrScannedAt = now;
    data.scannedById = approverId;
  }
  if (photoEvidenceUrl) data.photoEvidenceUrl = photoEvidenceUrl;

  const updated = await db.stockTransaction.update({
    where: { id: Number(id) },
    data,
    include: txnInclude,
  });

  // Side-effects of COMPLETED: move serialized unit / update batch stock position
  if (updated.status === "COMPLETED") {
    if (updated.itemUnitId && updated.toLocationId) {
      const locId = updated.toLocationId;
      let status = updated.itemUnit?.status ?? "AVAILABLE";
      if (updated.transactionType === "PULL_OUT") status = "UNDER_REPAIR";
      else if (updated.transactionType === "CONSUMPTION") status = "IN_USE";
      else if (updated.transactionType === "DELIVERY" || updated.transactionType === "TRANSFER") status = "IN_USE";
      await db.itemUnit.update({ where: { id: updated.itemUnitId }, data: { currentLocationId: locId, status } });
    }
  }

  return NextResponse.json({ txn: updated });
}
