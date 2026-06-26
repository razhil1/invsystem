"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useUI, type ViewKey } from "@/lib/store";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
// Lazy-load each view so Turbopack compiles them on-demand,
// keeping the initial page compilation light.
const DashboardView = dynamic(() => import("@/components/views/dashboard-view").then((m) => m.DashboardView), { ssr: false, loading: () => <ViewSkeleton /> });
const ApprovalsView = dynamic(() => import("@/components/views/approvals-view").then((m) => m.ApprovalsView), { ssr: false, loading: () => <ViewSkeleton /> });
const TransactionsView = dynamic(() => import("@/components/views/transactions-view").then((m) => m.TransactionsView), { ssr: false, loading: () => <ViewSkeleton /> });
const ItemsView = dynamic(() => import("@/components/views/items-view").then((m) => m.ItemsView), { ssr: false, loading: () => <ViewSkeleton /> });
const LocationsView = dynamic(() => import("@/components/views/locations-view").then((m) => m.LocationsView), { ssr: false, loading: () => <ViewSkeleton /> });
const ProjectsView = dynamic(() => import("@/components/views/projects-view").then((m) => m.ProjectsView), { ssr: false, loading: () => <ViewSkeleton /> });
const GuidesView = dynamic(() => import("@/components/views/guides-view").then((m) => m.GuidesView), { ssr: false, loading: () => <ViewSkeleton /> });
const ReportsView = dynamic(() => import("@/components/views/reports-view").then((m) => m.ReportsView), { ssr: false, loading: () => <ViewSkeleton /> });

function ViewSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function Page() {
  const view = useUI((s) => s.view);
  const theme = useUI((s) => s.theme);
  const openScanner = useUI((s) => s.openScanner);
  const setView = useUI((s) => s.setView);
  const { setTheme: setNextTheme } = useTheme();

  useEffect(() => {
    setNextTheme(theme);
  }, [theme, setNextTheme]);

  // Global keyboard shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function handler(e: KeyboardEvent) {
      // Skip if typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) {
        return;
      }
      // Skip if modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const state = useUI.getState();

      // 'g' prefix for goto shortcuts
      if (e.key === "g" && !gPressed) {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }
      if (gPressed) {
        const map: Record<string, ViewKey> = {
          d: "dashboard", a: "approvals", t: "transactions", i: "items",
          l: "locations", p: "projects", r: "reports", s: "scanner",
        };
        if (map[e.key]) {
          state.setView(map[e.key]);
          e.preventDefault();
        }
        gPressed = false;
        return;
      }

      // Single-key shortcuts
      if (e.key === "/") {
        state.setView("transactions");
        e.preventDefault();
      } else if (e.key === "s") {
        state.openScanner();
        e.preventDefault();
      } else if (e.key === "?") {
        // Show shortcuts help via toast
        import("sonner").then(({ toast }) => {
          toast.info("Keyboard shortcuts", {
            description: "g+d Dashboard · g+a Approvals · g+t Ledger · g+i Items · g+l Locations · g+p Projects · g+r Reports · s Scan · / Search",
            duration: 6000,
          });
        });
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const users = d.users ?? [];
        // Auto-select admin if no user is currently chosen.
        // Use a separate effect (not inline store mutation) to avoid
        // setState-during-render warnings.
        const current = useUI.getState().currentUserId;
        const admin = users.find((u: { role: string }) => u.role === "ADMIN") ?? users[0];
        if (!current && admin) {
          useUI.setState({ users, currentUserId: admin.id, currentUserName: admin.fullName });
        } else {
          useUI.setState({ users });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <AppHeader />
        <main className="flex-1 overflow-x-hidden">
          <div key={view} className="animate-fade-in-up">
          {view === "dashboard" && <DashboardView />}
          {view === "approvals" && <ApprovalsView />}
          {view === "transactions" && <TransactionsView />}
          {view === "items" && <ItemsView />}
          {view === "locations" && <LocationsView />}
          {view === "projects" && <ProjectsView />}
          {view === "guides" && <GuidesView />}
          {view === "reports" && <ReportsView />}
          {view === "scanner" && <ScannerRedirect onOpen={() => openScanner()} onDone={() => setView("dashboard")} />}
          </div>
        </main>
        <footer className="mt-auto border-t border-border bg-card/50 px-6 py-4 text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground">LedgerStock</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Single-source-of-truth ledger · v1.0 Phase 1/2</span>
            </div>
            <div className="flex items-center gap-4">
              <span>QR-scanned · Single-level approval</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">Stock is derived from <code className="rounded bg-muted px-1 py-0.5 font-mono">stock_transactions</code></span>
            </div>
          </div>
        </footer>
      </div>
      <QRScannerModal />
    </div>
  );
}

function ScannerRedirect({ onOpen, onDone }: { onOpen: () => void; onDone: () => void }) {
  useEffect(() => {
    onOpen();
    onDone();
  }, [onOpen, onDone]);
  return <ViewSkeleton />;
}
