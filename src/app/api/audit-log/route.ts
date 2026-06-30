import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/audit-log — all approval/rejection/scan events with user + transaction context
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 100);
  const action = searchParams.get("action"); // APPROVED | REJECTED | SCANNED | CREATED

  // Fetch transactions that have been acted upon (approved/rejected/scanned)
  const where: Record<string, unknown> = {
    OR: [
      { approvedAt: { not: null } },
      { qrScannedAt: { not: null } },
    ],
  };

  const txns = await db.stockTransaction.findMany({
    where,
    include: {
      item: { include: { businessUnit: true } },
      itemUnit: true,
      itemBatch: true,
      fromLocation: true,
      toLocation: true,
      project: true,
      requestedBy: true,
      approvedBy: true,
      scannedBy: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  // Build audit entries
  const entries = txns.flatMap((t) => {
    const result: Array<{
      txnId: number;
      action: string;
      timestamp: string;
      actorName: string | null;
      actorRole: string | null;
      transactionType: string;
      itemName: string;
      itemSku: string;
      bu: string;
      fromLocation: string | null;
      toLocation: string | null;
      projectName: string | null;
      requestedByName: string | null;
      notes: string | null;
      reasonCode: string | null;
    }> = [];

    // CREATED event
    result.push({
      txnId: t.id,
      action: "CREATED",
      timestamp: t.createdAt.toISOString(),
      actorName: t.requestedBy?.fullName ?? "—",
      actorRole: t.requestedBy?.role ?? "—",
      transactionType: t.transactionType,
      itemName: t.item?.name ?? "—",
      itemSku: t.item?.sku ?? "—",
      bu: t.item?.businessUnit?.code ?? "—",
      fromLocation: t.fromLocation?.name ?? null,
      toLocation: t.toLocation?.name ?? null,
      projectName: t.project?.name ?? null,
      requestedByName: t.requestedBy?.fullName ?? null,
      notes: t.notes,
      reasonCode: t.reasonCode,
    });

    // APPROVED/REJECTED event
    if (t.approvedAt) {
      result.push({
        txnId: t.id,
        action: t.status === "REJECTED" ? "REJECTED" : "APPROVED",
        timestamp: t.approvedAt.toISOString(),
        actorName: t.approvedBy?.fullName ?? "—",
        actorRole: t.approvedBy?.role ?? "—",
        transactionType: t.transactionType,
        itemName: t.item?.name ?? "—",
        itemSku: t.item?.sku ?? "—",
        bu: t.item?.businessUnit?.code ?? "—",
        fromLocation: t.fromLocation?.name ?? null,
        toLocation: t.toLocation?.name ?? null,
        projectName: t.project?.name ?? null,
        requestedByName: t.requestedBy?.fullName ?? null,
        notes: t.notes,
        reasonCode: t.reasonCode,
      });
    }

    // SCANNED event
    if (t.qrScannedAt) {
      result.push({
        txnId: t.id,
        action: "SCANNED",
        timestamp: t.qrScannedAt.toISOString(),
        actorName: t.scannedBy?.fullName ?? "—",
        actorRole: t.scannedBy?.role ?? "—",
        transactionType: t.transactionType,
        itemName: t.item?.name ?? "—",
        itemSku: t.item?.sku ?? "—",
        bu: t.item?.businessUnit?.code ?? "—",
        fromLocation: t.fromLocation?.name ?? null,
        toLocation: t.toLocation?.name ?? null,
        projectName: t.project?.name ?? null,
        requestedByName: t.requestedBy?.fullName ?? null,
        notes: t.notes,
        reasonCode: t.reasonCode,
      });
    }

    return result;
  });

  // Sort all entries by timestamp desc
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter by action if specified
  const filtered = action ? entries.filter((e) => e.action === action) : entries;

  return NextResponse.json({ entries: filtered.slice(0, limit), total: entries.length });
}
