import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/locations/create — create a new location
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, businessUnitId, address } = body ?? {};

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const validTypes = ["WAREHOUSE", "PROJECT_SITE", "VEHICLE", "SUPPLIER", "CUSTOMER"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const location = await db.location.create({
    data: {
      name,
      type,
      businessUnitId: businessUnitId ? Number(businessUnitId) : null,
      address: address ?? null,
      isActive: true,
    },
    include: { businessUnit: true },
  });

  return NextResponse.json({ location }, { status: 201 });
}
