import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/meta/categories — item categories + business units for create-item dialog
export async function GET() {
  const [itemCategories, businessUnits] = await Promise.all([
    db.itemCategory.findMany({ orderBy: { name: "asc" } }),
    db.businessUnit.findMany({ orderBy: { code: "asc" } }),
  ]);
  return NextResponse.json({ itemCategories, businessUnits });
}
