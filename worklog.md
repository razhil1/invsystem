# LedgerStock — Stock Control System Worklog

## Project Overview
A multi-business stock control & inventory management system built from the schema in the user's design document. Covers three business units: Waterproofing Services (WP), Chemical Trading (CHEM), and LPG Management (LPG). The core principle is a **ledger-based architecture** where current stock is NEVER stored — it's always derived from `stock_transactions`.

---

## Current Status: Phase 2 Complete & Stable (Cron Review #1)

### Assessment
The system is now **fully stable** with zero console errors. The previous React setState-during-render warning has been completely resolved. Three major new features have been added: multi-step New Transaction wizard, Item Unit/Batch registration with QR generation, and Location management. Global keyboard shortcuts and view transition animations have been implemented for power-user UX.

### Completed in This Round (Cron Review #1)

#### 1. Bug Fix: React setState-during-render warning (RESOLVED)
- **Root cause**: The `useFetch` hook's async resolution could trigger state updates in `AppSidebar` while `DashboardView` was rendering. Also, `page.tsx` called `useUI.getState().setCurrentUser()` inside a `.then()` callback, updating the Zustand store during another component's render phase.
- **Fix**: 
  - Rewrote `useFetch` hook to defer state updates via `queueMicrotask` + `mountedRef` guard, preventing render-during-render conflicts
  - Replaced inline store mutations in `page.tsx` with `useUI.setState()` batched call inside the effect
  - Created `usePendingCount` hook using `useSyncExternalStore` (React 18 proper pattern) — shared module-level cache with single network request for both sidebar + header
  - Added `refreshPendingCount()` export so approvals view can trigger sidebar badge update after actions

#### 2. New Feature: Multi-step New Transaction Wizard
- **3-step wizard**: Type selection → Details → Review & submit
- **6 transaction types**: Receipt, Request, Delivery, Transfer, Consumption, Adjustment
- **Contextual fields**: Each type shows only relevant fields (e.g. supplier for Receipt, reason code for Adjustment, project link for Request/Delivery/Consumption)
- **Quantity stepper**: +/- buttons with unit display
- **Review step**: Summary of all fields before submission with "pending approval" notice
- **Accessible from**: Header "New" button, Dashboard quick actions, Ledger view

#### 3. New Feature: Item Unit/Batch Registration with QR Generation
- **API endpoints**: `POST /api/items/[id]/units` and `POST /api/items/[id]/batches`
- **Auto QR code generation**: Format `BU-ITEMCODE-NNNNN` for units, `BU-BAT-PREFIX-NNNN` for batches
- **Auto ledger entry**: Registration automatically creates a COMPLETED RECEIPT transaction
- **Success state**: Shows generated QR code with copy-to-clipboard button
- **Register another**: Quick flow for bulk registration

#### 4. New Feature: Location Management
- **API endpoint**: `POST /api/locations/create`
- **Create dialog**: Name, type (warehouse/site/vehicle/supplier/customer), business unit, address
- **Integrated into Locations view** with "New Location" button

#### 5. UX Improvements: Keyboard Shortcuts & Animations
- **Global keyboard shortcuts**: 
  - `g+d` Dashboard, `g+a` Approvals, `g+t` Ledger, `g+i` Items
  - `g+l` Locations, `g+p` Projects, `g+r` Reports, `g+s` Scanner
  - `/` Search ledger, `s` Open scanner, `?` Show shortcuts help
- **View transition animations**: `animate-fade-in-up` on view change
- **CSS additions**: fade-in-up, shimmer skeleton, pulse-glow, card-lift, smooth focus ring, selection color
- **Button shadows**: Added `shadow-sm` to primary action buttons

### Verification Results (agent-browser)
- ✅ Dashboard renders "Operations Dashboard" with "New Transaction" button
- ✅ Keyboard `g+a` → Approval Queue ✓
- ✅ Keyboard `g+t` → Stock Ledger ✓
- ✅ New Transaction dialog opens with all 6 types ✓
- ✅ Escape closes dialog ✓
- ✅ Keyboard `g+i` → Item Master ✓
- ✅ Keyboard `g+l` → Locations with "New Location" button ✓
- ✅ Keyboard `g+r` → Reports & Analytics ✓
- ✅ **ZERO console errors** (previous setState warning fully resolved)
- ✅ Lint passes with 0 errors

### API Endpoints (now 12 route groups)
- All previous 9 endpoints still return 200
- **NEW** `POST /api/items/[id]/units` — register serialized unit + generate QR
- **NEW** `POST /api/items/[id]/batches` — register batch + generate QR  
- **NEW** `POST /api/locations/create` — create new location

---

## Previous Status: Phase 1 Complete (Baseline)

### What Was Built (Phase 1)
1. **Database (Prisma/SQLite)** — Full schema with seed data: 3 BUs, 5 users, 10 locations, 8 items, 24 units, 6 batches, 3 projects, 11 transactions, 4 guides
2. **API Layer** — 9 route groups all returning 200
3. **Frontend (9 views)** — Dashboard, Approval Queue, Ledger, Items, Locations, Projects, Service Guides, Reports, QR Scanner
4. **UI/UX** — Industrial emerald-teal theme, dark mode, responsive, sticky footer, toasts, skeletons

### Architecture Decisions
- **Ledger-based stock**: Current stock derived from `stock_transactions`, never stored as a column
- **QR codes as opaque pointers**: Each unit/batch has a unique `qr_code`; scanning verifies physical item
- **Single-level approval**: `approved_by`/`approved_at` on transaction; approve+scan = COMPLETED
- **Dynamic view loading**: `next/dynamic` with `ssr: false` splits views into separate chunks
- **Shared pending count**: `useSyncExternalStore`-based hook with module-level cache (single fetch for sidebar + header)
- **Deferred state updates**: `useFetch` uses `queueMicrotask` to prevent render-during-render conflicts

---

## Unresolved Issues / Risks
1. **None critical** — the app is stable with zero console errors
2. **Minor**: The `useFetch` hook's `queueMicrotask` deferral adds ~1 frame of latency to state updates. This is imperceptible but worth noting if ultra-fast updates are needed.
3. **Dev server memory**: Still requires `NODE_OPTIONS='--max-old-space-size=2048'` to avoid OOM during Turbopack compilation. This is a container constraint, not a code issue.

## Priority Recommendations for Next Phase
1. **Role-based UI restrictions** — Hide admin actions (approve/reject, create) for VIEWER role users
2. **Photo evidence upload** — Allow photo attachment to scan events (currently `photoEvidenceUrl` field exists but no upload UI)
3. **Bulk operations** — Bulk approve/reject in the approval queue; bulk QR label printing
4. **Dashboard activity timeline** — A visual timeline/chart showing stock movements over time (last 7/30 days)
5. **Expiry tracking alerts** — Proactive alerts for batch items nearing expiry (chemicals especially)
6. **Advanced search** — Global search across items, transactions, projects with a command palette (Cmd+K)
7. **Export enhancements** — PDF reports, project cost breakdowns, stock valuation reports
