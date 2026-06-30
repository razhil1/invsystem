import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard/expiry — batches nearing expiry (within 90 days) or expired
export async function GET() {
  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 86400000);

  const batches = await db.itemBatch.findMany({
    where: { expiryDate: { lte: ninetyDays, not: null } },
    include: { item: { include: { businessUnit: true, category: true } } },
    orderBy: { expiryDate: "asc" },
    take: 20,
  });

  const result = batches.map((b) => {
    const expiry = b.expiryDate!;
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
    return {
      id: b.id, batchNo: b.batchNo, qrCode: b.qrCode,
      itemName: b.item.name, sku: b.item.sku,
      bu: b.item.businessUnit?.code ?? "—",
      qtyReceived: b.qtyReceived, unit: b.item.unitOfMeasure,
      expiryDate: expiry.toISOString().slice(0, 10),
      daysLeft,
      status: daysLeft < 0 ? "EXPIRED" : daysLeft <= 30 ? "CRITICAL" : "WARNING",
    };
  });

  return NextResponse.json({ batches: result });
}
