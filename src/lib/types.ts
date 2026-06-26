// Shared client-side types mirroring server include shapes

export interface BusinessUnit { id: number; name: string; code: string }
export interface ItemCategory { id: number; name: string; trackingMode: "SERIALIZED" | "BATCH" }
export interface LocationLite {
  id: number; name: string; type: string; address?: string | null;
  businessUnitId?: number | null; businessUnit?: BusinessUnit | null; isActive: boolean;
}
export interface UserLite {
  id: string; fullName: string; email?: string | null; phone?: string | null;
  role: string; isActive: boolean;
}
export interface ItemUnitLite {
  id: number; serialNo: string; qrCode: string; status: string;
  currentLocationId?: number | null; receivedAt?: string | null; attributes?: string;
}
export interface ItemBatchLite {
  id: number; batchNo: string; qrCode: string; qtyReceived: number;
  expiryDate?: string | null; supplierRef?: string | null; receivedAt?: string;
}
export interface ItemLite {
  id: number; sku: string; name: string; unitOfMeasure: string; unitCost: number;
  reorderLevel: number; isActive: boolean; attributes?: string;
  businessUnitId?: number | null; businessUnit?: BusinessUnit | null;
  categoryId: number; category: ItemCategory;
  units?: ItemUnitLite[]; batches?: ItemBatchLite[];
  onHand?: number;
}
export interface ProjectLite {
  id: number; name: string; clientName?: string | null;
  siteLocationId?: number | null; siteLocation?: LocationLite | null;
  serviceType?: string | null; status: string; percentComplete: number;
  startDate?: string | null; targetEndDate?: string | null; actualEndDate?: string | null;
  budget?: number | null; milestones?: { id: number; title: string; targetDate: string | null; completedAt: string | null; percentWeight: number }[];
  _count?: { transactions: number };
}
export interface TxnLite {
  id: number; transactionType: string; status: string;
  itemUnitId?: number | null; itemBatchId?: number | null; itemId?: number | null;
  quantity?: number | null;
  fromLocationId?: number | null; toLocationId?: number | null;
  projectId?: number | null;
  requestedById?: string | null; approvedById?: string | null; approvedAt?: string | null;
  qrScannedAt?: string | null; scannedById?: string | null;
  photoEvidenceUrl?: string | null; reasonCode?: string | null; notes?: string | null;
  createdAt: string; updatedAt: string;
  item?: ItemLite | null; itemUnit?: ItemUnitLite | null; itemBatch?: ItemBatchLite | null;
  fromLocation?: LocationLite | null; toLocation?: LocationLite | null;
  project?: ProjectLite | null;
  requestedBy?: UserLite | null; approvedBy?: UserLite | null; scannedBy?: UserLite | null;
}

export interface DashboardData {
  kpis: { pendingApprovals: number; activeItems: number; warehouses: number; activeProjects: number };
  unitStatus: Record<string, number>;
  txnsByType: { type: string; count: number }[];
  recentTxns: TxnLite[];
  lowStock: { id: number; sku: string; name: string; onHand: number; reorderLevel: number; unit: string }[];
  projects: { id: number; name: string; clientName: string | null; status: string; percentComplete: number; siteLocation: string | null; milestoneCount: number; completedMilestones: number }[];
}

export interface ScanResult {
  kind: "unit" | "batch";
  id: number; qrCode: string;
  serialNo?: string; batchNo?: string; status?: string;
  qtyReceived?: number; expiryDate?: string | null; supplierRef?: string | null;
  item: ItemLite; currentLocation?: LocationLite | null;
  history: TxnLite[];
}

export interface LocationStock {
  location: LocationLite & { businessUnit?: BusinessUnit | null };
  serializedUnits: (ItemUnitLite & { item: ItemLite })[];
  batchStock: { itemId: number; sku: string; itemName: string; batchNo: string; qrCode: string; qty: number; unit: string; expiryDate: string | null }[];
  movementSummary: Record<string, number>;
  totalMovements: number;
}

export interface ReportsData {
  totalTransactions: number;
  byType: Record<string, { count: number; qty: number }>;
  avgCycleHours: number;
  valuationByBU: Record<string, number>;
  unitStatus: Record<string, number>;
  topMovers: { sku: string; name: string; count: number }[];
  projectSummary: { id: number; name: string; client: string | null; status: string; percentComplete: number; budget: number | null; consumedCost: number; txnCount: number }[];
  locations: { id: number; name: string; type: string; businessUnit: string }[];
}

// Convenience label helpers
export const TYPE_LABELS: Record<string, string> = {
  RECEIPT: "Receipt",
  REQUEST: "Request",
  DELIVERY: "Delivery",
  PULL_OUT: "Pull-Out",
  TRANSFER: "Transfer",
  CONSUMPTION: "Consumption",
  ADJUSTMENT: "Adjustment",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const LOCATION_TYPES: Record<string, string> = {
  WAREHOUSE: "Warehouse",
  PROJECT_SITE: "Project Site",
  VEHICLE: "Vehicle",
  SUPPLIER: "Supplier",
  CUSTOMER: "Customer",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  WAREHOUSE_SUPERVISOR: "Warehouse Supervisor",
  STOCK_CLERK: "Stock Clerk",
  PROJECT_ENGINEER: "Project Engineer",
  VIEWER: "Viewer",
};

// Current acting user — in a real app this would be NextAuth session.
// For this single-org demo we default to the ADMIN seeded user.
export const ACTING_USER_ID_FALLBACK = "admin-session";
