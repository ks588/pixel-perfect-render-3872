import type {
  Branch,
  InventoryItem,
  Persona,
  PolicySettings,
  WarehouseRow,
} from "./types";

export const STORAGE_KEYS = {
  branches: "kf_branches",
  inventory: "kf_inventory",
  warehouse: "kf_warehouse_stock",
  policy: "kf_policy_settings",
  requests: "kf_reorder_requests",
  logs: "kf_event_log",
  activeUser: "kf_active_persona_id",
} as const;

export const BRANCHES: Branch[] = [
  { branchId: "COL-03", name: "Colombo 03 (Flagship)", shortName: "Colombo 03", isFlagship: true },
  { branchId: "KCC-01", name: "Kandy City Centre", shortName: "Kandy", isFlagship: false },
  { branchId: "GAL-02", name: "Galle Fort Walk", shortName: "Galle", isFlagship: false },
];

export const PERSONAS: Persona[] = [
  {
    id: "bm-col",
    name: "Kavindu Perera",
    label: "Branch Stock Manager — Colombo 03",
    role: "branch",
    branchId: "COL-03",
    branchName: "Colombo 03 (Flagship)",
    department: "Retail Store Operations",
    initials: "KP",
    description: "Monitors stock levels, initiates branch replenishment, and triggers sales simulation for Colombo Flagship.",
  },
  {
    id: "bm-kcc",
    name: "Sachini Wickramasinghe",
    label: "Branch Stock Manager — Kandy",
    role: "branch",
    branchId: "KCC-01",
    branchName: "Kandy City Centre",
    department: "Retail Store Operations",
    initials: "SW",
    description: "Store-scoped inventory manager for the Kandy City Centre outlet. Manages local stock and cover days.",
  },
  {
    id: "admin",
    name: "Dinith Wickramanayake",
    label: "Admin / Retail LOB Lead",
    role: "admin",
    department: "Group Merchandising & Supply Chain",
    initials: "DW",
    description: "Group-wide governance authority. Reviews out-of-policy escalations, enforces budget caps, and controls global rules.",
  },
  {
    id: "dc-manager",
    name: "Nuwan Jayasuriya",
    label: "Distribution Center Manager",
    role: "warehouse",
    department: "Merchandising & Supply Chain",
    initials: "NJ",
    description: "Monitors central warehouse availability and dispatches approved replenishment requests to branches.",
  },
  {
    id: "board",
    name: "Anushka Fernando",
    label: "Board / Executive",
    role: "executive",
    department: "Group Board & Executive Office",
    initials: "AF",
    description: "Sees the group-wide daily exception and performance rollup with the AI morning brief.",
  },
];

export const DEFAULT_POLICY: PolicySettings = {
  autoApproveInPolicyOrders: false,
  minOrderQuantity: 5,
  maxOrderQuantity: 30,
  branchBudgetCap: 250000,
  deadStockThresholdDays: 60,
  min180DayVelocity: 10,
};

type CatalogRow = {
  sku: string;
  itemName: string;
  category: string;
  unitCost: number;
};

const CATALOG: CatalogRow[] = [
  { sku: "DRS-FLR-01-M", itemName: "Floral Print Summer Midi Dress", category: "Dresses", unitCost: 4200 },
  { sku: "DRS-SLK-02-M", itemName: "Satin Slip Evening Dress", category: "Dresses", unitCost: 6800 },
  { sku: "SHIRT-LIN-01-L", itemName: "Relaxed Linen Resort Shirt", category: "Linen Shirts", unitCost: 3900 },
  { sku: "SHIRT-FLR-01-L", itemName: "Floral Camp Collar Shirt", category: "Linen Shirts", unitCost: 3600 },
  { sku: "DNM-SKN-03-32", itemName: "High-Rise Skinny Denim", category: "Denim", unitCost: 5400 },
  { sku: "DNM-WID-04-30", itemName: "Wide Leg Vintage Denim", category: "Denim", unitCost: 5900 },
  { sku: "JCK-LTH-01-L", itemName: "Cropped Faux Leather Jacket", category: "Outerwear", unitCost: 11500 },
  { sku: "JCK-BMB-02-M", itemName: "Utility Bomber Jacket", category: "Outerwear", unitCost: 8900 },
];

function seededItem(row: CatalogRow, branchId: string, i: number, b: number): InventoryItem {
  const base = [46, 18, 9, 31, 14, 7, 22, 4][(i + b * 3) % 8]!;
  const rate = [2.4, 1.1, 0.6, 1.8, 0.9, 0.3, 1.4, 0.2][(i + b) % 8]!;
  const flagship = branchId === "COL-03";
  const dailyRunRate = Number((rate * (flagship ? 1.35 : 1)).toFixed(2));
  return {
    sku: row.sku,
    itemName: row.itemName,
    category: row.category,
    branchId,
    currentStock: Math.round(base * (flagship ? 1.2 : 0.85)),
    inTransitStock: i % 4 === 0 ? 10 : 0,
    reorderThreshold: 12,
    targetCoverUnits: Math.max(24, Math.round(dailyRunRate * 30)),
    dailyRunRate,
    unitsSoldLast180Days: Math.round(dailyRunRate * 180 * (i === 5 ? 0.04 : 0.8)),
    unitCost: row.unitCost,
    lastReorderDate: new Date(Date.now() - (i + 3) * 86400000).toISOString(),
  };
}

export function seedInventory(): InventoryItem[] {
  return BRANCHES.flatMap((branch, b) =>
    CATALOG.map((row, i) => seededItem(row, branch.branchId, i, b)),
  );
}

export function seedWarehouse(): WarehouseRow[] {
  return CATALOG.map((row, i) => ({
    sku: row.sku,
    centralStockAvailable: [140, 96, 62, 210, 18, 74, 41, 130][i] ?? 80,
    reservedQty: [10, 0, 4, 20, 0, 6, 2, 12][i] ?? 0,
  }));
}