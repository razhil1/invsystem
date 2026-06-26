import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/users — list users (no password hashes exposed)
export async function GET() {
  const users = await db.user.findMany({
    select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json({ users });
}
