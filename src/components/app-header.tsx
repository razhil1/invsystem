"use client";

import { useUI } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Menu, Moon, Sun, Bell, ScanLine, Search } from "lucide-react";
import { ROLE_LABELS, type ViewKey } from "@/lib/types";
import { useFetch } from "@/lib/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const VIEW_TITLES: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: { title: "Operations Dashboard", subtitle: "Live stock overview across all business units" },
  approvals: { title: "Approval Queue", subtitle: "Authorize pending stock movements" },
  transactions: { title: "Stock Ledger", subtitle: "Single source of truth for every movement" },
  items: { title: "Item Master", subtitle: "SKU catalog & QR label generation" },
  locations: { title: "Locations", subtitle: "Warehouses, sites, vehicles, suppliers" },
  projects: { title: "Projects", subtitle: "Project site stock & progress" },
  guides: { title: "Service Guides", subtitle: "Static reference for service-to-item mapping" },
  reports: { title: "Reports & Analytics", subtitle: "Valuation, movement trends, project costing" },
  scanner: { title: "QR Scanner", subtitle: "Verify physical items by scanning" },
};

export function AppHeader() {
  const view = useUI((s) => s.view);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const theme = useUI((s) => s.theme);
  const toggleTheme = useUI((s) => s.toggleTheme);
  const users = useUI((s) => s.users);
  const currentUserId = useUI((s) => s.currentUserId);
  const currentUserName = useUI((s) => s.currentUserName);
  const setCurrentUser = useUI((s) => s.setCurrentUser);
  const openScanner = useUI((s) => s.openScanner);
  const setView = useUI((s) => s.setView);

  // Fetch pending count directly (local to header, avoids store contention)
  const { data: pendingData } = useFetch<{ txns: unknown[] }>("/api/transactions?status=PENDING&limit=200", []);
  const pendingCount = pendingData?.txns?.length ?? 0;

  const meta = VIEW_TITLES[view];
  const currentUser = users.find((u) => u.id === currentUserId);

  const initials = (currentUserName ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{meta.title}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.subtitle}</p>
      </div>

      {/* Quick search */}
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground md:inline-flex"
        onClick={() => setView("transactions")}
      >
        <Search className="h-4 w-4" />
        <span>Search ledger…</span>
        <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
      </Button>

      {/* Scanner quick-access */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => openScanner()}
      >
        <ScanLine className="h-4 w-4" />
        <span className="hidden sm:inline">Scan</span>
      </Button>

      {/* Pending bell */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setView("approvals")}
        aria-label={`${pendingCount} pending approvals`}
      >
        <Bell className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </Button>

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* User switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-muted" aria-label="Switch user">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-xs font-medium">{currentUserName ?? "Select user"}</span>
              <span className="text-[10px] text-muted-foreground">{currentUser ? ROLE_LABELS[currentUser.role] : "—"}</span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Acting as (demo session)</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {users.map((u) => (
            <DropdownMenuItem
              key={u.id}
              onClick={() => {
                setCurrentUser(u.id, u.fullName);
                toast.success(`Switched to ${u.fullName}`, { description: ROLE_LABELS[u.role] });
              }}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{u.fullName}</span>
                <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[u.role]}</span>
              </div>
              {u.id === currentUserId && <span className="h-2 w-2 rounded-full bg-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
