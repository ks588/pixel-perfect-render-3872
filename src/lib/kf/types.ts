export type Branch = {
  branchId: string;
  name: string;
  shortName: string;
  isFlagship: boolean;
};

export type InventoryItem = {
  sku: string;
  itemName: string;
  category: string;
  branchId: string;
  currentStock: number;
  inTransitStock: number;
  reorderThreshold: number;
  targetCoverUnits: number;
  dailyRunRate: number;
  unitsSoldLast180Days: number;
  unitCost: number;
  lastReorderDate: string;
};

export type WarehouseRow = {
  sku: string;
  centralStockAvailable: number;
  reservedQty: number;
};

export type PolicySettings = {
  autoApproveInPolicyOrders: boolean;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  branchBudgetCap: number;
  deadStockThresholdDays: number;
  min180DayVelocity: number;
};

export type ApprovalStatus = "auto_approved" | "needs_approval" | "approved" | "rejected" | "dispatched";

export type ReorderRequest = {
  requestId: string;
  branchId: string;
  sku: string;
  itemName: string;
  requestedQty: number;
  unitCost: number;
  totalValue: number;
  policyStatus: "in_policy" | "outside_policy";
  approvalStatus: ApprovalStatus;
  escalationReasons: string[];
  rejectionNote?: string;
  origin: "auto" | "manual";
  createdAt: string;
};

export type LogEntry = {
  id: string;
  at: string;
  kind: "SALE" | "TRIGGER" | "POLICY CHECK" | "APPROVAL" | "REJECTION" | "BLOCKED" | "SYSTEM";
  message: string;
};

export type Persona = {
  id: string;
  name: string;
  label: string;
  role: "branch" | "admin" | "warehouse";
  branchId?: string;
  branchName?: string;
  department: string;
  initials: string;
  description: string;
};

export type ItemStatus = "normal" | "low" | "auto_reordered" | "escalated" | "blocked";