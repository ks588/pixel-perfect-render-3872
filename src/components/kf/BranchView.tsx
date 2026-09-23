import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, MinusCircle, PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LKR, useKF } from "@/lib/kf/store";
import { STATUS_META, daysOfCover, itemStatus } from "@/lib/kf/engine";
import type { InventoryItem } from "@/lib/kf/types";

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Boxes;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "warn" | "info";
}) {
  const toneClass = {
    default: "text-foreground",
    danger: "text-destructive",
    warn: "text-warning",
    info: "text-info",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function BranchView({ branchId }: { branchId: string }) {
  const { inventory, warehouse, policy, requests, simulateSale, manualReorder, branches } = useKF();
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState(10);

  const items = useMemo(
    () => inventory.filter((i) => i.branchId === branchId),
    [inventory, branchId],
  );
  const branch = branches.find((b) => b.branchId === branchId);

  const stockouts = items.filter((i) => i.currentStock <= 0).length;
  const lowCover = items.filter((i) => i.currentStock + i.inTransitStock <= i.reorderThreshold).length;
  const openReq = requests.filter(
    (r) => r.branchId === branchId && (r.approvalStatus === "needs_approval" || r.approvalStatus === "approved" || r.approvalStatus === "auto_approved"),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{branch?.name}</h2>
        <p className="text-sm text-muted-foreground">
          Store-scoped replenishment view — you only see inventory assigned to this branch.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Boxes} label="Total SKUs managed" value={items.length} />
        <Kpi icon={AlertTriangle} label="Critical stockouts" value={stockouts} tone="danger" hint="Stock ≤ 0" />
        <Kpi icon={PackageCheck} label="Low cover items" value={lowCover} tone="warn" hint="At or below reorder point" />
        <Kpi icon={Truck} label="Reorders in-flight" value={openReq} tone="info" hint="Pending, approved or in-transit" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">SKU & Variant</th>
                <th className="px-3 py-3 text-left font-medium">Category</th>
                <th className="px-3 py-3 text-right font-medium">Stock</th>
                <th className="px-3 py-3 text-right font-medium">In-transit</th>
                <th className="px-3 py-3 text-right font-medium">ROP / Target</th>
                <th className="px-3 py-3 text-right font-medium">Velocity (30d / 180d)</th>
                <th className="px-3 py-3 text-right font-medium">Cover</th>
                <th className="px-3 py-3 text-right font-medium">DC stock</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = itemStatus(item, policy, requests);
                const meta = STATUS_META[status];
                const cover = daysOfCover(item);
                const wh = warehouse.find((w) => w.sku === item.sku);
                return (
                  <tr key={item.sku} className="border-t border-border transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-foreground">{item.sku}</div>
                      <div className="text-xs text-muted-foreground">{item.itemName}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{item.category}</td>
                    <td className={`px-3 py-3 text-right font-semibold tabular-nums ${item.currentStock <= 0 ? "text-destructive" : ""}`}>
                      {item.currentStock}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-info">{item.inTransitStock}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {item.reorderThreshold} / {item.targetCoverUnits}u
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {(item.dailyRunRate * 30).toFixed(0)} / {item.unitsSoldLast180Days}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {Number.isFinite(cover) ? `${cover.toFixed(1)}d` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {wh?.centralStockAvailable ?? 0}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setModalItem(item);
                            setQty(Math.max(policy.minOrderQuantity, item.targetCoverUnits - item.currentStock - item.inTransitStock));
                          }}
                        >
                          Manual reorder
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => simulateSale(item.branchId, item.sku, 1)}
                          disabled={item.currentStock <= 0}
                        >
                          <MinusCircle className="size-3.5" />
                          Sale
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!modalItem} onOpenChange={(o) => !o && setModalItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual replenishment request</DialogTitle>
            <DialogDescription>
              {modalItem?.sku} — {modalItem?.itemName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="qty">Requested quantity (units)</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Line cap {policy.minOrderQuantity}–{policy.maxOrderQuantity} units · Estimated value{" "}
              {LKR(qty * (modalItem?.unitCost ?? 0))} · Branch cap {LKR(policy.branchBudgetCap)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!modalItem || qty <= 0) return;
                manualReorder(modalItem, qty);
                toast.success(`Request submitted for ${qty} × ${modalItem.sku}`);
                setModalItem(null);
              }}
            >
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
