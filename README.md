# LedgerStock — Multi-Business Stock Control System

A QR-scanned, ledger-based inventory control system for Waterproofing Services, Chemical Trading, and LPG Management. Built with Next.js 16, TypeScript, Prisma, and Tailwind CSS.

## Core Principle

**Current stock is NEVER stored** — it's always derived from `stock_transactions`. This is the hard rule that prevents the silent Excel drift this system was designed to fix.

## Features

### Operations
- **Dashboard** — KPI cards, movement-volume charts, activity timeline (7/30/90d), expiry tracker, low-stock alerts, recent activity feed, project status grid
- **Approval Queue** — Single-level approve/reject workflow with bulk actions and scan-to-complete
- **Stock Ledger** — Full transaction history with filters, search, CSV export, and detail drawer
- **QR Scanner** — Camera-based scanning (BarcodeDetector API) with manual-entry fallback

### Master Data
- **Item Master** — SKU catalog with QR label generation, unit/batch registration, create dialog
- **Locations** — Warehouses, project sites, vehicles, suppliers with per-location stock view
- **Projects** — Progress tracking, milestones, cost vs budget, site stock
- **Service Guides** — Static reference for service-to-item mapping

### Analytics
- **Reports** — Valuation by business unit, movement trends, top movers, project cost summary
- **Audit Log** — Full accountability trail: who created/approved/rejected/scanned what, when

### Power-User UX
- **Command Palette** (Cmd+K / Ctrl+K) — Global search across items, transactions, projects, locations + quick navigation
- **Keyboard Shortcuts** — `g+d/a/t/i/l/p/g/r/u/s` for navigation, `/` search, `s` scan, `?` help
- **Dark Mode** — Full dark theme support
- **Responsive** — Mobile sidebar drawer, touch-friendly targets

## Tech Stack

- **Framework**: Next.js 16 with App Router + Turbopack
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM (SQLite)
- **Charts**: Recharts
- **QR Codes**: `qrcode` package
- **State**: Zustand (client) + `useSyncExternalStore` for shared cache
- **Icons**: Lucide React

## Getting Started

```bash
# Install dependencies
bun install

# Set up the database
bun run db:push
bun run prisma/seed.ts

# Start the dev server
bun run dev
```

The app runs on `http://localhost:3000`.

## Database Schema

The schema follows a ledger-based architecture:
- `stock_transactions` is the single source of truth for ALL stock movement
- Serialized items use `item_units` (one row per physical tool/cylinder)
- Batch/lot items use `item_batches` (consumables, materials, chemicals)
- Each transaction has `requested_by`, `approved_by`, `scanned_by` for full accountability
- `qr_scanned_at` distinguishes "typed into app" from "physically scanned at the item"

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `g+d` | Dashboard |
| `g+a` | Approval Queue |
| `g+t` | Stock Ledger |
| `g+i` | Item Master |
| `g+l` | Locations |
| `g+p` | Projects |
| `g+g` | Service Guides |
| `g+r` | Reports |
| `g+u` | Audit Log |
| `g+s` | QR Scanner |
| `s` | Open Scanner |
| `/` | Search |
| `⌘K` | Command Palette |
| `?` | Show shortcuts help |
