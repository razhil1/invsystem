"use client";

import { useFetch } from "@/lib/hooks";
import type { DashboardData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, TypeBadge, BUBadge } from "@/components/badges";
import { useUI } from "@/lib/store";
import {
  ClipboardCheck,
  Package,
  Warehouse,
  FolderKanban,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ScanLine,
  Activity,
  Clock,
  Plus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatNumber, relativeTime } from "@/lib/hooks";
import { NewTransactionDialog } from "@/components/new-transaction-dialog";
import { useState } from "react";

const UNIT_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#10b981",
  IN_USE: "#0ea5e9",
  UNDER_REPAIR: "#f97316",
  RETIRED: "#71717a",
  LOST: "#e11d48",
};

const TYPE_COLORS: Record<string, string> = {
  RECEIPT: "#10b981", REQUEST: "#8b5cf6", DELIVERY: "#0ea5e9", PULL_OUT: "#f97316",
  TRANSFER: "#06b6d4", CONSUMPTION: "#d946ef", ADJUSTMENT: "#e11d48",
};

const ACCENT_CLASSES: Record<string, { bg: string; text: string; bar: string }> = {
  amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500/40" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500/40" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-500/40" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500/40" },
};

export function DashboardView() {
  const { data, loading } = useFetch<DashboardData>("/api/dashboard");
  const setView = useUI((s) => s.setView);
  const openScanner = useUI((s) => s.openScanner);

  if (loading || !data) return <DashboardSkeleton />;

  const kpis = [
    { label: "Pending Approvals", value: data.kpis.pendingApprovals, icon: ClipboardCheck, accent: "amber", onClick: () => setView("approvals") },
    { label: "Active Items", value: data.kpis.activeItems, icon: Package, accent: "emerald" },
    { label: "Warehouses", value: data.kpis.warehouses, icon: Warehouse, accent: "teal" },
    { label: "Active Projects", value: data.kpis.activeProjects, icon: FolderKanban, accent: "sky" },
  ];

  const unitStatusData = Object.entries(data.unitStatus).map(([k, v]) => ({ name: k.replace("_", " "), value: v, color: UNIT_STATUS_COLORS[k] ?? "#71717a" }));
  const typeData = data.txnsByType.map((t) => ({ name: t.type, count: t.count, color: TYPE_COLORS[t.type] ?? "#71717a" }));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const accent = ACCENT_CLASSES[k.accent];
          return (
            <Card
              key={k.label}
              className={`group relative overflow-hidden border-border/60 transition-shadow hover:shadow-md ${k.onClick ? "cursor-pointer" : ""}`}
              onClick={k.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-md ${accent.bg} ${accent.text}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight tnum">{formatNumber(k.value)}</div>
                {k.onClick && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    Open <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </CardContent>
              <div className={`absolute inset-x-0 bottom-0 h-0.5 ${accent.bar}`} />
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setView("approvals")} className="gap-2 shadow-sm">
          <ClipboardCheck className="h-4 w-4" /> Review {data.kpis.pendingApprovals} pending
        </Button>
        <DashboardNewTransaction />
        <Button size="sm" variant="outline" onClick={() => openScanner()} className="gap-2">
          <ScanLine className="h-4 w-4" /> Scan QR
        </Button>
        <Button size="sm" variant="outline" onClick={() => setView("transactions")} className="gap-2">
          <Activity className="h-4 w-4" /> View ledger
        </Button>
        <Button size="sm" variant="outline" onClick={() => setView("reports")} className="gap-2">
          <TrendingUp className="h-4 w-4" /> Reports
        </Button>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Movement Volume by Type</CardTitle>
            <CardDescription className="text-xs">Transaction counts across the ledger</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} stroke="currentColor" className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="currentColor" className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {typeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Serialized Unit Status</CardTitle>
            <CardDescription className="text-xs">Tools, equipment &amp; cylinders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={unitStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {unitStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm">Low Stock Alerts</CardTitle>
              <CardDescription className="text-xs">At or below reorder level</CardDescription>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                All items above reorder level
              </div>
            ) : (
              <ul className="scroll-thin max-h-72 space-y-2 overflow-y-auto pr-1">
                {data.lowStock.map((it) => (
                  <li key={it.id} className="rounded-md border border-amber-200/60 bg-amber-50/50 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{it.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{it.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-700 dark:text-amber-400 tnum">{formatNumber(it.onHand, 1)}</div>
                        <div className="text-[10px] text-muted-foreground">/ {it.reorderLevel} {it.unit}</div>
                      </div>
                    </div>
                    <Progress value={(it.onHand / Math.max(it.reorderLevel, 1)) * 100} className="mt-2 h-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <CardDescription className="text-xs">Latest ledger entries</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setView("transactions")}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.recentTxns.length === 0 && (
                <li className="py-8 text-center text-xs text-muted-foreground">No transactions yet</li>
              )}
              {data.recentTxns.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: (TYPE_COLORS[t.transactionType] ?? "#71717a") + "20" }}>
                    <Activity className="h-4 w-4" style={{ color: TYPE_COLORS[t.transactionType] ?? "#71717a" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={t.transactionType} />
                      <StatusBadge status={t.status} />
                      {t.item?.businessUnit && <BUBadge code={t.item.businessUnit.code} />}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.item?.name} · {t.itemUnit ? `S/N ${t.itemUnit.serialNo}` : t.itemBatch ? `Batch ${t.itemBatch.batchNo}` : ""}
                      {t.quantity != null && ` · ${formatNumber(t.quantity, 1)} ${t.item?.unitOfMeasure ?? ""}`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{relativeTime(t.createdAt)}</span>
                    <span>#{t.id}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm">Project Status</CardTitle>
            <CardDescription className="text-xs">Live progress across active engagements</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setView("projects")}>
            All projects <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((p) => (
              <div key={p.id} className="rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{p.clientName ?? "—"} · {p.siteLocation ?? "No site"}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-2.5">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Progress</span>
                    <span className="tnum">{formatNumber(p.percentComplete, 0)}%</span>
                  </div>
                  <Progress value={p.percentComplete} className="h-1.5" />
                  <div className="mt-1.5 text-[10px] text-muted-foreground">
                    {p.completedMilestones}/{p.milestoneCount} milestones
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-3 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function DashboardNewTransaction() {
  const [open, setOpen] = useState(false);
  const setView = useUI((s) => s.setView);
  return (
    <>
      <Button size="sm" variant="default" onClick={() => setOpen(true)} className="gap-2 shadow-sm">
        <Plus className="h-4 w-4" /> New Transaction
      </Button>
      <NewTransactionDialog open={open} onOpenChange={setOpen} onCreated={() => setView("transactions")} showTrigger={false} />
    </>
  );
}
