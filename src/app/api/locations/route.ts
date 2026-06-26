import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/locations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const where: Record<string, unknown> = { isActive: true };
  if (type) where.type = type;

  const locations = await db.location.findMany({
    where,
    include: { businessUnit: true, _count: { select: { itemUnits: true, txnFrom: true, txnTo: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ locations });
}
