import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard/timeline?days=30 — movement counts per day by type
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? 30);
  const since = new Date(Date.now() - days * 86400000);

  const txns = await db.stockTransaction.findMany({
    where: { createdAt: { gte: since } },
    select: { transactionType: true, status: true, createdAt: true },
  });

  const byDate = new Map<string, Record<string, number>>();
  const types = new Set<string>();

  for (const t of txns) {
    const dateKey = t.createdAt.toISOString().slice(0, 10);
    const entry = byDate.get(dateKey) ?? {};
    entry[t.transactionType] = (entry[t.transactionType] ?? 0) + 1;
    byDate.set(dateKey, entry);
    types.add(t.transactionType);
  }

  const result: { date: string; [type: string]: number | string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateKey = d.toISOString().slice(0, 10);
    const entry = byDate.get(dateKey) ?? {};
    const row: { date: string; [type: string]: number | string } = { date: dateKey };
    for (const t of types) row[t] = entry[t] ?? 0;
    result.push(row);
  }

  return NextResponse.json({ days, types: Array.from(types).sort(), data: result, total: txns.length });
}
