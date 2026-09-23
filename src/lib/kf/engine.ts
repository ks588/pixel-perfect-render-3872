import type {
  InventoryItem,
  ItemStatus,
  PolicySettings,
  ReorderRequest,
  WarehouseRow,
} from "./types";

export type EngineResult =
  | { outcome: "blocked"; reason: string }
  | { outcome: "none" }
  | { outcome: "request"; request: ReorderRequest };

let counter = 1000;
export function nextRequestId() {
  counter += 1;
  return `REQ-${counter}`;
}

export function daysOfCover(item: InventoryItem) {
  if (item.dailyRunRate <= 0) return Infinity;
  return (item.currentStock + item.inTransitStock) / item.dailyRunRate;
}

export function evaluateReorder(
  item: InventoryItem,
  policy: PolicySettings,
  warehouse: WarehouseRow | undefined,
  openRequest: boolean,
): EngineResult {
  if (item.currentStock + item.inTransitStock > item.reorderThreshold) return { outcome: "none" };
  if (openRequest) return { outcome: "none" };

  if (item.unitsSoldLast180Days < policy.min180DayVelocity) {
    return { outcome: "blocked", reason: "Dead Stock: Insufficient sales velocity" };
  }

  const needed = item.targetCoverUnits - (item.currentStock + item.inTransitStock);
  const orderQty = Math.max(needed, policy.minOrderQuantity);
  const reasons: string[] = [];
  const available = warehouse?.centralStockAvailable ?? 0;

  if (available < orderQty) {
    reasons.push(`Central warehouse insufficient stock (${available} available vs ${orderQty} requested)`);
  }
  if (orderQty > policy.maxOrderQuantity) {
    reasons.push(`Quantity (${orderQty}) breaches Max Line Cap (${policy.maxOrderQuantity})`);
  }
  const totalValue = orderQty * item.unitCost;
  if (totalValue > policy.branchBudgetCap) {
    reasons.push(`Branch budget ceiling exceeded (LKR ${totalValue.toLocaleString()})`);
  }

  let approvalStatus: ReorderRequest["approvalStatus"];
  if (reasons.length > 0) {
    approvalStatus = "needs_approval";
  } else if (policy.autoApproveInPolicyOrders) {
    approvalStatus = "auto_approved";
  } else {
    approvalStatus = "needs_approval";
    reasons.push("Human sign-off required by enterprise policy");
  }

  return {
    outcome: "request",
    request: {
      requestId: nextRequestId(),
      branchId: item.branchId,
      sku: item.sku,
      itemName: item.itemName,
      requestedQty: orderQty,
      unitCost: item.unitCost,
      totalValue,
      policyStatus: approvalStatus === "auto_approved" ? "in_policy" : "outside_policy",
      approvalStatus,
      escalationReasons: reasons,
      origin: "auto",
      createdAt: new Date().toISOString(),
    },
  };
}

export function itemStatus(
  item: InventoryItem,
  policy: PolicySettings,
  requests: ReorderRequest[],
): ItemStatus {
  const open = requests.find(
    (r) =>
      r.sku === item.sku &&
      r.branchId === item.branchId &&
      (r.approvalStatus === "needs_approval" || r.approvalStatus === "auto_approved"),
  );
  if (open) return open.approvalStatus === "auto_approved" ? "auto_reordered" : "escalated";
  if (item.unitsSoldLast180Days < policy.min180DayVelocity) return "blocked";
  if (item.currentStock + item.inTransitStock <= item.reorderThreshold) return "low";
  return "normal";
}

export const STATUS_META: Record<ItemStatus, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-success/12 text-success border-success/30" },
  low: { label: "Low Stock / Trigger Reorder", className: "bg-warning/15 text-warning border-warning/30" },
  auto_reordered: { label: "Auto-Reordered", className: "bg-info/12 text-info border-info/30" },
  escalated: { label: "Escalated to Admin", className: "bg-destructive/12 text-destructive border-destructive/30" },
  blocked: { label: "Blocked / Dead Stock", className: "bg-muted text-muted-foreground border-border" },
};
