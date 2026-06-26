"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  COMPLETED: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  CANCELLED: "bg-zinc-200 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const TYPE_STYLES: Record<string, string> = {
  RECEIPT: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  REQUEST: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
  DELIVERY: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  PULL_OUT: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  TRANSFER: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900",
  CONSUMPTION: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900",
  ADJUSTMENT: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};

const UNIT_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  IN_USE: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  UNDER_REPAIR: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  RETIRED: "bg-zinc-200 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  LOST: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};

const PROJECT_STATUS_STYLES: Record<string, string> = {
  PLANNING: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  ONGOING: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  ON_HOLD: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  COMPLETED: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-300",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        TYPE_STYLES[type] ?? "bg-zinc-100 text-zinc-700 border-zinc-300",
        className
      )}
    >
      {type.replace("_", " ")}
    </span>
  );
}

export function UnitStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        UNIT_STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-300",
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function ProjectStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        PROJECT_STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-300",
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function BUBadge({ code, className }: { code: string; className?: string }) {
  const styles: Record<string, string> = {
    WP: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
    CHEM: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    LPG: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        styles[code] ?? "bg-zinc-100 text-zinc-700 border-zinc-300",
        className
      )}
    >
      {code}
    </span>
  );
}
