# LedgerStock — Stock Control System Worklog

## Project Overview
A multi-business stock control & inventory management system built from the schema in the user's design document. Covers three business units: Waterproofing Services (WP), Chemical Trading (CHEM), and LPG Management (LPG). The core principle is a **ledger-based architecture** where current stock is NEVER stored — it's always derived from `stock_transactions`.

## Current Status: Phase 1 Complete & Functional

### What's Built
1. **Database (Prisma/SQLite)** — Full schema matching the design doc: business_units, users, locations, items, item_units (serialized), item_batches (lot), stock_transactions (the ledger), projects, project_milestones, service_guides. Seeded with realistic data: 3 BUs, 5 users, 10 locations, 8 items, 24 serialized units, 6 batches, 3 projects, 11 transactions, 4 service guides.

2. **API Layer (9 route groups)** — All returning 200:
   - `/api/dashboard` — KPIs, charts, low-stock, recent activity, projects
   - `/api/transactions` (GET with filters + POST create)
   - `/api/transactions/[id]/approve` (PATCH — single-level approve/reject, optional scan-to-complete)
   - `/api/items` (GET + POST) and `/api/items/[id]/qr` (QR label generation)
   - `/api/locations` and `/api/locations/[id]/stock` (the "mini system per site" view)
   - `/api/projects` (GET + POST)
   - `/api/scan` (GET lookup by QR code + POST record scan event)
   - `/api/service-guides` (GET + POST)
   - `/api/reports` — valuation by BU, movement volume, approval cycle time, top movers, project cost
   - `/api/users` and `/api/meta/categories`

3. **Frontend (9 views, all functional)**:
   - **Dashboard** — KPI cards, movement-volume bar chart, unit-status pie chart, low-stock alerts, recent activity feed, project status grid
   - **Approval Queue** — The core control loop: pending transaction cards with Approve / Approve & Scan / Reject / Scan only actions. Single-level approval workflow verified end-to-end.
   - **Ledger** — Full transaction table with type/status/search filters, pagination, CSV export, detail drawer (Sheet) showing movement path, project link, approval chain, scan proof
   - **Item Master** — Catalog table with on-hand/reorder, QR code label sheets (rendered client-side via `qrcode` package), create-item dialog
   - **Locations** — Grouped by type (warehouse/site/vehicle/supplier), click-through to location stock detail (serialized units + batch stock + movement summary)
   - **Projects** — Card grid with progress bars, milestone tracker, create-project dialog
   - **Service Guides** — Split-pane reference guide with markdown-rendered recommended items
   - **Reports** — Valuation by BU, movement count by type, unit status pie, top movers, project cost vs budget table
   - **QR Scanner** — Camera-based scanning (native BarcodeDetector API) with manual-entry fallback, pre-bound to transactions for scan-to-complete

4. **UI/UX** — Industrial emerald-teal theme, dark mode support, responsive (mobile sidebar drawer), sticky footer, toast notifications, loading skeletons, custom scrollbars, consistent badge system (status/type/BU/unit-status).

### Verification Results (agent-browser)
- ✅ Dashboard renders with "Operations Dashboard" heading
- ✅ All 9 sidebar views are navigable
- ✅ Approval Queue shows pending transactions with action buttons
- ✅ Approve action works end-to-end (pending count decremented 5→4)
- ✅ Ledger table renders with real transaction rows
- ✅ Reports view loads with charts
- ✅ Lint passes with 0 errors

### Known Issues
1. **Console warning**: "Cannot update AppSidebar while rendering DashboardView" — a React dev-mode warning about setState timing. Does NOT crash the app (dashboard, approvals, and navigation all work). Root cause appears to be the `useFetch` hook in AppSidebar resolving while DashboardView renders. Non-fatal; should be investigated in next phase.
2. **Dev server memory**: The container OOM-kills the Node process during heavy Turbopack compilation. Fixed by setting `NODE_OPTIONS='--max-old-space-size=2048'` in the dev script and using `next/dynamic` to lazy-load views.

## Architecture Decisions
- **Ledger-based stock**: Current stock is derived from `stock_transactions` (sum of receipts minus deliveries/consumption/adjustments), never stored as a column. This is the hard rule from the design doc.
- **QR codes as opaque pointers**: Each serialized unit and batch has a unique `qr_code` (e.g. `WP-TOL-00482`). Scanning verifies the physical item matches the transaction.
- **Single-level approval**: `approved_by`/`approved_at` on the transaction. Approve + scan = immediate COMPLETED status with physical item relocation.
- **Dynamic view loading**: `next/dynamic` with `ssr: false` splits each view into a separate chunk, keeping initial page compilation light.
- **Pending count**: Fetched directly by AppSidebar and AppHeader (not via global store) to avoid cross-component setState-during-render issues.

## Next Steps (Priority Order)
1. Fix the console setState warning (investigate useFetch timing in sidebar)
2. Add "New Transaction" creation dialog (REQUEST/DELIVERY/TRANSFER forms)
3. Add location management (create warehouse/site)
4. Implement item unit/batch registration (generate QR codes for new physical items)
5. Add photo evidence upload for scan events
6. Add role-based UI restrictions (hide admin actions for VIEWER role)
7. Polish: animations, empty states, keyboard shortcuts
