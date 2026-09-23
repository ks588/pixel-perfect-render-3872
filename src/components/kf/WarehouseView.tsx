import { Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useKF } from "@/lib/kf/store";

export function WarehouseView() {
  const { warehouse, requests, branches, dispatchOrder } = useKF();

  const pendingDispatch = requests.filter(
    (r) => r.approvalStatus === "approved" || r.approvalStatus === "auto_approved"
  );

  const branchName = (id: string) => branches.find((b) => b.branchId === id)?.shortName ?? id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Central Distribution Center</h2>
        <p className="text-sm text-muted-foreground">
          Fulfill and dispatch approved replenishment orders to branches.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Package className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Dispatch Queue</h3>
          <span className="rounded-full bg-info/10 px-2 py-0.5 text-xs font-semibold text-info">
            {pendingDispatch.length} orders to pack
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Request ID</th>
                <th className="px-3 py-3 text-left font-medium">Destination</th>
                <th className="px-3 py-3 text-left font-medium">SKU / Item</th>
                <th className="px-3 py-3 text-right font-medium">Req. Qty</th>
                <th className="px-3 py-3 text-right font-medium">DC Stock</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendingDispatch.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No approved orders waiting for dispatch.
                  </td>
                </tr>
              )}
              {pendingDispatch.map((r) => {
                const dcStock = warehouse.find((w) => w.sku === r.sku)?.centralStockAvailable ?? 0;
                const canFulfill = dcStock >= r.requestedQty;

                return (
                  <tr key={r.requestId} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{r.requestId}</td>
                    <td className="px-3 py-3 font-medium">{branchName(r.branchId)}</td>
                    <td className="px-3 py-3">
                      <div className="font-mono text-xs">{r.sku}</div>
                      <div className="text-xs text-muted-foreground">{r.itemName}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{r.requestedQty}</td>
                    <td className={`px-3 py-3 text-right ${canFulfill ? "text-success" : "text-destructive font-bold"}`}>
                      {dcStock}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        size="sm" 
                        disabled={!canFulfill}
                        onClick={() => {
                          dispatchOrder(r.requestId);
                          toast.success(`Order ${r.requestId} dispatched to ${branchName(r.branchId)}`);
                        }}
                      >
                        <Truck className="size-3.5 mr-2" /> Dispatch
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}