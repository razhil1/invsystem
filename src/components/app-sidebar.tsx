"use client";

import { useUI, type ViewKey } from "@/lib/store";
import { usePendingCount } from "@/lib/use-pending-count";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  ArrowLeftRight,
  Package,
  MapPin,
  FolderKanban,
  BookOpen,
  BarChart3,
  ScanLine,
  Boxes,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  group: "core" | "master" | "analytics";
}

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Live overview", group: "core" },
  { key: "approvals", label: "Approval Queue", icon: ClipboardCheck, description: "Pending authorizations", group: "core" },
  { key: "transactions", label: "Ledger", icon: ArrowLeftRight, description: "All stock movements", group: "core" },
  { key: "scanner", label: "QR Scanner", icon: ScanLine, description: "Scan to verify", group: "core" },
  { key: "items", label: "Item Master", icon: Package, description: "Items & QR labels", group: "master" },
  { key: "locations", label: "Locations", icon: MapPin, description: "Warehouses & sites", group: "master" },
  { key: "projects", label: "Projects", icon: FolderKanban, description: "Project site stock", group: "master" },
  { key: "guides", label: "Service Guides", icon: BookOpen, description: "Static reference", group: "master" },
  { key: "reports", label: "Reports", icon: BarChart3, description: "Analytics & valuation", group: "analytics" },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  core: "Operations",
  master: "Master Data",
  analytics: "Insights",
};

export function AppSidebar() {
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);

  // Shared pending-count cache (single fetch for sidebar + header)
  const pendingCount = usePendingCount();

  const grouped = (["core", "master", "analytics"] as const).map((g) => ({
    group: g,
    items: NAV.filter((n) => n.group === g),
  }));

  return (
    <>
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
          sidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">LedgerStock</span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Stock Control</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            onClick={toggleSidebar}
            aria-label="Close menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {GROUP_LABELS[group]}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.key;
                  const showBadge = item.key === "approvals" && pendingCount > 0;
                  return (
                    <li key={item.key}>
                      <button
                        onClick={() => {
                          setView(item.key);
                          if (typeof window !== "undefined" && window.innerWidth < 1024) toggleSidebar();
                        }}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
                        <span className="flex-1 truncate font-medium">{item.label}</span>
                        {showBadge && (
                          <span className={cn(
                            "ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                            active ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground" : "bg-amber-500 text-white"
                          )}>
                            {pendingCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-3 py-2 text-[11px] text-sidebar-foreground/70">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="leading-tight">
              Every stock move is QR-verified &amp; approval-logged.
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
