import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/projects
export async function GET() {
  const projects = await db.project.findMany({
    include: {
      siteLocation: true,
      milestones: { orderBy: { targetDate: "asc" } },
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ projects });
}

// POST /api/projects
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, clientName, serviceType, siteLocationId, budget, startDate, targetEndDate } = body ?? {};
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const project = await db.project.create({
    data: {
      name,
      clientName,
      serviceType,
      siteLocationId: siteLocationId ? Number(siteLocationId) : null,
      budget: budget ? Number(budget) : null,
      startDate: startDate ? new Date(startDate) : null,
      targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
      status: "PLANNING",
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
