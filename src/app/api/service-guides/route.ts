import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/service-guides
export async function GET() {
  const guides = await db.serviceGuide.findMany({ orderBy: { serviceType: "asc" } });
  return NextResponse.json({ guides });
}

// POST /api/service-guides
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { serviceType, description, recommendedItems } = body ?? {};
  if (!serviceType) return NextResponse.json({ error: "serviceType required" }, { status: 400 });
  const guide = await db.serviceGuide.create({ data: { serviceType, description, recommendedItems } });
  return NextResponse.json({ guide }, { status: 201 });
}
