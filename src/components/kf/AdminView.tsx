import { useMemo, useState } from "react";
import { Check, Edit2, Inbox, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { PolicySettings, ReorderRequest } from "@/lib/kf/types";

export function AdminView() {
  const { branches, inventory, requests, policy, savePolicy, approve, editAndApprove, reject } = useKF();

  const [branchFilter, setBranchFilter] = useState("all");
  const [draft, setDraft] = useState<PolicySettings>(policy);
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  // State for Edit & Approve Modal
  const [editModal, setEditModal] = useState<ReorderRequest | null>(null);
  const [editQty, setEditQty] = useState(0);

  const pending = requests.filter((r) => r.approvalStatus === "needs_approval");

  const rows = useMemo(
    () => (branchFilter === "all" ? inventory : inventory.filter((i) => i.branchId === branchFilter)),
    [inventory, branchFilter],
  );

  const branchName = (id: string) => branches.find((b) => b.branchId === id)?.shortName ?? id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Central Admin | Retail LOB Lead</h2>
        <p className="text-sm text-muted-foreground">
          Group-level visibility across all branches, escalation approvals and guardrail configuration.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Inbox className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Escalation inbox</h3>
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
              {pending.length} awaiting sign-off
            </span>
          </div>

          <div className="divide-y divide-border">
            {pending.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No replenishment requests awaiting approval.
              </p>
            )}

            {pending.map((r) => (
              <div key={r.requestId} className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{r.requestId}</span>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {branchName(r.branchId)}
                      </span>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {r.origin === "auto" ? "Engine" : "Manual"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium">
                      {r.sku} · {r.itemName}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold tabular-nums">{r.requestedQty} units</div>
                    <div className="text-xs text-muted-foreground">
                      {LKR(r.unitCost)} ea · {LKR(r.totalValue)} total
                    </div>
                  </div>
                </div>

                <ul className="space-y-1">
                  {r.escalationReasons.map((reason) => (
                    <li key={reason} className="rounded-md bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
                      {reason}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Button size="sm" onClick={() => { approve(r.requestId); toast.success(`${r.requestId} approved`); }}>
                    <Check className="size-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditModal(r);
                      setEditQty(r.requestedQty);
                    }}
                  >
                    <Edit2 className="size-3.5 mr-1" /> Edit & Approve
                  </Button>
                  
                  <div className="flex-1" />
                  
                  <Input
                    className="h-9 w-[220px]"
                    placeholder="Rejection note (required)"
                    value={notes[r.requestId] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.requestId]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const note = (notes[r.requestId] ?? "").trim();
                      if (!note) {
                        toast.error("A short rejection note is required.");
                        return;
                      }
                      reject(r.requestId, note);
                      toast.success(`${r.requestId} rejected`);
                    }}
                  >
                    <X className="size-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Global policy & guardrails</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Auto-approve in-policy reorders</Label>
                <p className="text-xs text-muted-foreground">Enterprise default: off</p>
              </div>
              <Switch
                checked={draft.autoApproveInPolicyOrders}
                onCheckedChange={(v) => setDraft({ ...draft, autoApproveInPolicyOrders: v })}
              />
            </div>
            {(
              [
                ["minOrderQuantity", "Min order qty per line"],
                ["maxOrderQuantity", "Max order qty per line"],
                ["branchBudgetCap", "Branch budget cap (LKR)"],
                ["min180DayVelocity", "Min 180-day velocity (units)"],
                ["deadStockThresholdDays", "Dead stock threshold (days)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-xs text-muted-foreground">
                  {label}
                </Label>
                <Input
                  id={key}
                  type="number"
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                />
              </div>
            ))}
            <Button
              className="w-full"
              onClick={() => {
                savePolicy(draft);
                toast.success("Policy saved");
              }}
            >
              Save policy
            </Button>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Multi-branch inventory</h3>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.branchId} value={b.branchId}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Branch</th>
                <th className="px-3 py-3 text-left font-medium">SKU</th>
                <th className="px-3 py-3 text-right font-medium">Stock</th>
                <th className="px-3 py-3 text-right font-medium">In-transit</th>
                <th className="px-3 py-3 text-right font-medium">ROP</th>
                <th className="px-3 py-3 text-right font-medium">Cover</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const meta = STATUS_META[itemStatus(item, policy, requests)];
                const cover = daysOfCover(item);
                return (
                  <tr key={`${item.branchId}-${item.sku}`} className="border-t border-border hover:bg-muted/40">
                    <td className="px-4 py-2.5 text-muted-foreground">{branchName(item.branchId)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.sku}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{item.currentStock}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-info">{item.inTransitStock}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{item.reorderThreshold}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {Number.isFinite(cover) ? `${cover.toFixed(1)}d` : "∞"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* EDIT MODAL */}
      <Dialog open={!!editModal} onOpenChange={(o) => !o && setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit & Approve Request {editModal?.requestId}</DialogTitle>
            <DialogDescription>
              Adjust the requested quantity to bring this order back within policy limits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="edit-qty">Approved quantity (units)</Label>
            <Input
              id="edit-qty"
              type="number"
              min={1}
              value={editQty}
              onChange={(e) => setEditQty(Number(e.target.value))}
            />
            <div className="rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p>Original request: <span className="font-semibold text-foreground">{editModal?.requestedQty} units</span></p>
              <p>Line limit cap: <span className="font-semibold text-foreground">{policy.maxOrderQuantity} units</span></p>
              <p>Revised total value: <span className="font-semibold text-foreground">{LKR(editQty * (editModal?.unitCost ?? 0))}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editModal || editQty <= 0) return;
                editAndApprove(editModal.requestId, editQty);
                toast.success(`Request ${editModal.requestId} updated to ${editQty} units and approved`);
                setEditModal(null);
              }}
            >
              Confirm & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}