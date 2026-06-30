"use client";

import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUI, type ViewKey } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ClipboardCheck, ArrowLeftRight, Package, MapPin,
  FolderKanban, BookOpen, BarChart3, ScanLine, Search, CornerDownLeft,
  Package as PackageIcon, FileText, MapPin as MapIcon, Shield,
} from "lucide-react";
import { BUBadge, TypeBadge, StatusBadge } from "@/components/badges";
import { relativeTime } from "@/lib/hooks";

interface SearchResult {
  items: { id: number; sku: string; name: string; unit: string; bu: string; trackingMode: string }[];
  txns: { id: number; type: string; status: string; itemName: string; itemSku: string; bu: string; createdAt: string }[];
  projects: { id: number; name: string; client: string | null; status: string; site: string | null }[];
  locations: { id: number; name: string; type: string }[];
}

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  action: () => void;
  badge?: React.ReactNode;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const setView = useUI((s) => s.setView);
  const openScanner = useUI((s) => s.openScanner);
  const toggleTheme = useUI((s) => s.toggleTheme);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    prevOpenRef.current = open;
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) { setQuery(""); setResults(null); setSelectedIndex(0); }
    setOpen(nextOpen);
  }

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) return;
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => { setResults(d); setLoading(false); })
        .catch(() => { setResults(null); setLoading(false); });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function close() { setOpen(false); }

  const navCommands: CommandItem[] = [
    { id: "nav-dashboard", label: "Dashboard", sublabel: "Live operations overview", icon: LayoutDashboard, group: "Navigate", action: () => { setView("dashboard"); close(); } },
    { id: "nav-approvals", label: "Approval Queue", sublabel: "Pending authorizations", icon: ClipboardCheck, group: "Navigate", action: () => { setView("approvals"); close(); } },
    { id: "nav-ledger", label: "Stock Ledger", sublabel: "All stock movements", icon: ArrowLeftRight, group: "Navigate", action: () => { setView("transactions"); close(); } },
    { id: "nav-items", label: "Item Master", sublabel: "SKU catalog & QR labels", icon: Package, group: "Navigate", action: () => { setView("items"); close(); } },
    { id: "nav-locations", label: "Locations", sublabel: "Warehouses & sites", icon: MapPin, group: "Navigate", action: () => { setView("locations"); close(); } },
    { id: "nav-projects", label: "Projects", sublabel: "Project site stock", icon: FolderKanban, group: "Navigate", action: () => { setView("projects"); close(); } },
    { id: "nav-guides", label: "Service Guides", sublabel: "Static reference", icon: BookOpen, group: "Navigate", action: () => { setView("guides"); close(); } },
    { id: "nav-reports", label: "Reports", sublabel: "Analytics & valuation", icon: BarChart3, group: "Navigate", action: () => { setView("reports"); close(); } },
    { id: "nav-audit", label: "Audit Log", sublabel: "Who did what, when", icon: Shield, group: "Navigate", action: () => { setView("audit"); close(); } },
  ];

  const actionCommands: CommandItem[] = [
    { id: "act-scan", label: "Open QR Scanner", sublabel: "Scan to verify items", icon: ScanLine, group: "Actions", action: () => { openScanner(); close(); } },
    { id: "act-theme", label: "Toggle Theme", sublabel: "Switch light/dark mode", icon: LayoutDashboard, group: "Actions", action: () => { toggleTheme(); close(); } },
  ];

  const allCommands = [...navCommands, ...actionCommands];
  const filteredNav = query.trim()
    ? allCommands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.sublabel?.toLowerCase().includes(query.toLowerCase()))
    : allCommands;

  const searchItems: CommandItem[] = [];
  if (results) {
    for (const it of results.items) {
      searchItems.push({ id: `item-${it.id}`, label: it.name, sublabel: `${it.sku} · ${it.trackingMode}`, icon: PackageIcon, group: "Items", action: () => { setView("items"); close(); }, badge: <BUBadge code={it.bu} /> });
    }
    for (const t of results.txns) {
      searchItems.push({ id: `txn-${t.id}`, label: `#${t.id} ${t.itemName}`, sublabel: `${t.itemSku} · ${relativeTime(t.createdAt)}`, icon: ArrowLeftRight, group: "Transactions", action: () => { setView("transactions"); close(); }, badge: <><TypeBadge type={t.type} /> <StatusBadge status={t.status} /></> });
    }
    for (const p of results.projects) {
      searchItems.push({ id: `proj-${p.id}`, label: p.name, sublabel: `${p.client ?? "—"} · ${p.site ?? "No site"}`, icon: FileText, group: "Projects", action: () => { setView("projects"); close(); }, badge: <StatusBadge status={p.status} /> });
    }
    for (const l of results.locations) {
      searchItems.push({ id: `loc-${l.id}`, label: l.name, sublabel: l.type.replace("_", " "), icon: MapIcon, group: "Locations", action: () => { setView("locations"); close(); } });
    }
  }

  const combined: CommandItem[] = query.trim() && results ? [...searchItems, ...filteredNav] : filteredNav;

  const groups: { name: string; items: CommandItem[] }[] = [];
  const groupMap = new Map<string, CommandItem[]>();
  for (const item of combined) {
    const arr = groupMap.get(item.group) ?? [];
    arr.push(item);
    groupMap.set(item.group, arr);
  }
  for (const [name, items] of groupMap) groups.push({ name, items });

  const flat: CommandItem[] = groups.flatMap((g) => g.items);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[selectedIndex]) flat[selectedIndex].action(); }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showCloseButton={false} aria-describedby={undefined}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }} onKeyDown={handleKeyDown} placeholder="Search items, transactions, projects, or type a command…" className="h-7 border-0 px-0 shadow-none focus-visible:ring-0 text-sm" />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">ESC</kbd>
        </div>
        <div ref={listRef} className="scroll-thin max-h-[60vh] overflow-y-auto p-2">
          {flat.length === 0 && !loading && (
            <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
              <Search className="h-8 w-8 opacity-30" />
              {query.trim() ? "No results found" : "Start typing to search…"}
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Searching…
            </div>
          )}
          {groups.map((group) => (
            <div key={group.name} className="mb-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.name}</div>
              {group.items.map((item) => {
                const idx = flat.indexOf(item);
                const Icon = item.icon;
                const active = idx === selectedIndex;
                return (
                  <button key={item.id} data-idx={idx} onClick={() => item.action()} onMouseEnter={() => setSelectedIndex(idx)} className={cn("flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors", active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/50")}>
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.label}</div>
                      {item.sublabel && <div className="truncate text-[11px] text-muted-foreground">{item.sublabel}</div>}
                    </div>
                    {item.badge && <div className="flex shrink-0 items-center gap-1">{item.badge}</div>}
                    {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 font-mono">↵</kbd> select</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1 font-mono">esc</kbd> close</span>
          </div>
          <span className="font-medium">LedgerStock Command Palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
