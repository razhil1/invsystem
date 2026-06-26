import { Prisma } from "@prisma/client";

// Shared Prisma include snippets so every API returns consistent shape
export const txnInclude = {
  item: { include: { category: true, businessUnit: true } },
  itemUnit: true,
  itemBatch: true,
  fromLocation: true,
  toLocation: true,
  project: true,
  requestedBy: true,
  approvedBy: true,
  scannedBy: true,
} satisfies Prisma.StockTransactionInclude;

export const itemInclude = {
  category: true,
  businessUnit: true,
  units: true,
  batches: true,
} satisfies Prisma.ItemInclude;

export type TxnWithRelations = Prisma.StockTransactionGetPayload<{ include: typeof txnInclude }>;
export type ItemWithRelations = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

// Map a stock transaction + its item to a human-readable label & qty
export function txnLabel(t: TxnWithRelations): { label: string; qty: number | null; itemSku: string; itemName: string } {
  const item = t.item;
  return {
    label: t.itemUnit ? `Unit ${t.itemUnit.serialNo}` : t.itemBatch ? `Batch ${t.itemBatch.batchNo}` : "—",
    qty: t.quantity,
    itemSku: item?.sku ?? "—",
    itemName: item?.name ?? "—",
  };
}

// Status colours / type colours used by both server-rendered badges and client
export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  COMPLETED: "bg-sky-100 text-sky-800 border-sky-200",
  CANCELLED: "bg-zinc-200 text-zinc-600 border-zinc-300",
};

export const TYPE_COLORS: Record<string, string> = {
  RECEIPT: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REQUEST: "bg-violet-100 text-violet-800 border-violet-200",
  DELIVERY: "bg-sky-100 text-sky-800 border-sky-200",
  PULL_OUT: "bg-orange-100 text-orange-800 border-orange-200",
  TRANSFER: "bg-cyan-100 text-cyan-800 border-cyan-200",
  CONSUMPTION: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  ADJUSTMENT: "bg-rose-100 text-rose-800 border-rose-200",
};

export const BUSINESS_UNITS = ["WP", "CHEM", "LPG"] as const;
