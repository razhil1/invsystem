"use client";

import { useFetch } from "@/lib/hooks";
import type { ReportsData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatNumber } from "@/lib/hooks";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { TrendingUp, DollarSign, Clock, Package, Activity, ArrowLeftRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const TYPE_COLORS: Record<string, string> = {
  RECEIPT: "#10b981", REQUEST: "#8b5cf6", DELIVERY: "#0ea5e9", PULL_OUT: "#f97316",
  TRANSFER: "#06b6d4", CONSUMPTION: "#d946ef", ADJUSTMENT: "#e11d48",
};
const UNIT_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "#10b981", IN_USE: "#0ea5e9", UNDER_REPAIR: "#f97316", RETIRED: "#71717a", LOST: "#e11d48",
};
const BU_COLORS: Record<string, string> = { WP: "#14b8a6", CHEM: "#f59e0b", LPG: "#f43f5e", UNASSIGNED: "#71717a" };

export function ReportsView() {
  const { data, loading } = useFetch<ReportsData>("/api/reports");

  if (loading || !data) return <ReportsSkeleton />;

  const byTypeData = Object.entries(data.byType).map(([k, v]) => ({ name: k, count: v.count, qty: v.qty, color: TYPE_COLORS[k] ?? "#71717a" }));
  const unitStatusData = Object.entries(data.unitStatus).map(([k, v]) => ({ name: k.replace("_", " "), value: v, color: UNIT_STATUS_COLORS[k] ?? "#71717a" }));
  const valuationData = Object.entries(data.valuationByBU).map(([k, v]) => ({ name: k, value: Math.round(v), color: BU_COLORS[k] ?? "#71717a" }));
  const totalValuation = Object.values(data.valuationByBU).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Total transactions" value={formatNumber(data.totalTransactions)} icon={ArrowLeftRight} accent="teal" />
        <KpiCard label="Avg approval cycle" value={`${formatNumber(data.avgCycleHours, 1)}h`} icon={Clock} accent="amber" />
        <KpiCard label="Inventory valuation" value={formatMoney(totalValuation)} icon={DollarSign} accent="emerald" />
        <KpiCard label="Active projects" value={formatNumber(data.projectSummary.filter((p) => p.status === "ONGOING" || p.status === "PLANNING").length)} icon={TrendingUp} accent="sky" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Movement Count by Type</CardTitle>
            <CardDescription className="text-xs">Volume distribution across transaction kinds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTypeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} stroke="currentColor" className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="currentColor" className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {byTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Inventory Valuation by Business Unit</CardTitle>
            <CardDescription className="text-xs">On-hand qty × unit cost (SGD)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valuationData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="currentColor" className="fill-muted-foreground" width={70} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--muted)" }} formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {valuationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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
                    {unitStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Movers</CardTitle>
            <CardDescription className="text-xs">Items with most ledger activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topMovers} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} stroke="currentColor" className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="sku" tick={{ fontSize: 10 }} stroke="currentColor" className="fill-muted-foreground" width={90} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--muted)" }} formatter={(_v: number, _n, p) => [(p?.payload as { count: number }).count, "Moves"]} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project cost summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Project Cost Summary</CardTitle>
          <CardDescription className="text-xs">Consumed material cost vs. budget</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Project</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[90px] text-right">Progress</TableHead>
                  <TableHead className="w-[120px] text-right">Consumed</TableHead>
                  <TableHead className="w-[120px] text-right">Budget</TableHead>
                  <TableHead className="w-[180px]">Utilization</TableHead>
                  <TableHead className="w-[70px] text-right">Moves</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projectSummary.map((p) => {
                  const utilization = p.budget ? (p.consumedCost / p.budget) * 100 : 0;
                  const overBudget = utilization > 90;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.client ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${p.status === "ONGOING" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : p.status === "PLANNING" ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" : "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"}`}>
                          {p.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tnum">{formatNumber(p.percentComplete, 0)}%</TableCell>
                      <TableCell className={`text-right font-mono tnum ${overBudget ? "font-bold text-rose-600" : ""}`}>{formatMoney(p.consumedCost)}</TableCell>
                      <TableCell className="text-right font-mono tnum text-muted-foreground">{p.budget ? formatMoney(p.budget) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(utilization, 100)} className={`h-1.5 ${overBudget ? "[&>*]:bg-rose-500" : ""}`} />
                          <span className={`text-[10px] tnum ${overBudget ? "font-bold text-rose-600" : "text-muted-foreground"}`}>{formatNumber(utilization, 0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tnum text-muted-foreground">{p.txnCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; accent: string }) {
  const styles: Record<string, string> = {
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${styles[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight tnum">{value}</div>
      </CardContent>
    </Card>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
