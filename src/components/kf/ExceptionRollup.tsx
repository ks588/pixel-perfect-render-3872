import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles, TrendingDown, Wallet, BarChart3, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BRANCHES } from "@/lib/kf/seed";
import { LKR, useKF } from "@/lib/kf/store";
import type { InventoryItem } from "@/lib/kf/types";

type ExType = "stockout" | "negative_margin" | "dead_stock" | "variance";
type DailyException = {
  id: string;
  branchId: string;
  sku: string;
  type: ExType;
  revenueImpact: number;
  aiSummary: string;
  status: "open" | "resolved";
};

const EX_KEY = "kf_daily_exceptions";
const SYNC_KEY = "kf_last_nightly_sync";

const TYPE_META: Record<ExType, { label: string; cls: string; action: string }> = {
  stockout: { label: "Stockout", cls: "border-destructive/30 bg-destructive/10 text-destructive", action: "Request LOB transfer" },
  negative_margin: { label: "Negative Margin", cls: "border-warning/30 bg-warning/10 text-warning", action: "Review pricing with LOB" },
  dead_stock: { label: "Dead Stock", cls: "border-border bg-secondary text-muted-foreground", action: "Mark down or transfer out" },
  variance: { label: "Variance", cls: "border-info/30 bg-info/10 text-info", action: "Run cycle count" },
};

// Deterministic derived retail fields layered on top of the shared inventory
function enrich(i: InventoryItem) {
  let sellingPrice = Math.round(i.unitCost * 2.6);
  if (i.sku === "JCK-LTH-01-L" && i.branchId === "GAL-02") sellingPrice = Math.round(i.unitCost * 0.85);
  if (i.sku === "SHIRT-FLR-01-L" && i.branchId === "KCC-01") sellingPrice = Math.round(i.unitCost * 0.92);
  const velocity180 = i.unitsSoldLast180Days / 180;
  const daysSinceLastSale = velocity180 < 0.1 ? 74 + (i.branchId.charCodeAt(0) % 20) : i.currentStock <= 0 ? 1 : 0;
  return { ...i, sellingPrice, daysSinceLastSale };
}

const bName = (id: string) => BRANCHES.find((b) => b.branchId === id)?.shortName ?? id;

function runRules(inventory: InventoryItem[]): DailyException[] {
  const out: DailyException[] = [];
  inventory.map(enrich).forEach((i) => {
    const base = `${i.branchId}-${i.sku}`;
    if (i.currentStock <= 0) {
      const impact = i.dailyRunRate * i.sellingPrice;
      out.push({ id: `${base}-so`, branchId: i.branchId, sku: i.sku, type: "stockout", revenueImpact: impact,
        aiSummary: `${i.itemName} is out of stock at ${bName(i.branchId)}; missing ~${i.dailyRunRate} sales/day.`, status: "open" });
    }
    if (i.sellingPrice < i.unitCost) {
      const impact = (i.unitCost - i.sellingPrice) * i.dailyRunRate;
      out.push({ id: `${base}-nm`, branchId: i.branchId, sku: i.sku, type: "negative_margin", revenueImpact: impact,
        aiSummary: `Selling at ${LKR(i.sellingPrice)} below cost ${LKR(i.unitCost)} — every sale loses money.`, status: "open" });
    }
    if (i.daysSinceLastSale > 60) {
      const impact = i.currentStock * i.unitCost;
      out.push({ id: `${base}-ds`, branchId: i.branchId, sku: i.sku, type: "dead_stock", revenueImpact: impact,
        aiSummary: `No sale in ${i.daysSinceLastSale} days; ${i.currentStock} units tie up cash on the shelf.`, status: "open" });
    }
  });
  return out.sort((a, b) => b.revenueImpact - a.revenueImpact);
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

export function ExceptionRollup() {
  const { persona, inventory } = useKF();
  const [exceptions, setExceptions] = useState<DailyException[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EX_KEY);
      if (raw) setExceptions(JSON.parse(raw));
      else {
        const seeded = runRules(inventory);
        setExceptions(seeded);
        localStorage.setItem(EX_KEY, JSON.stringify(seeded));
      }
      setLastSync(localStorage.getItem(SYNC_KEY));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (list: DailyException[]) => {
    setExceptions(list);
    localStorage.setItem(EX_KEY, JSON.stringify(list));
  };

  const runSync = () => {
    setSyncing(true);
    setTimeout(() => {
      const resolved = new Set(exceptions.filter((e) => e.status === "resolved").map((e) => e.id));
      const next = runRules(inventory).map((e) => (resolved.has(e.id) ? { ...e, status: "resolved" as const } : e));
      save(next);
      const at = new Date().toISOString();
      setLastSync(at);
      localStorage.setItem(SYNC_KEY, at);
      setSyncing(false);
      toast.success(`Nightly sync complete — ${next.filter((e) => e.status === "open").length} open exceptions`);
    }, 2000);
  };

  const scopeBranch = persona.role === "branch" ? persona.branchId : undefined;
  const scopedInv = useMemo(() => inventory.filter((i) => !scopeBranch || i.branchId === scopeBranch).map(enrich), [inventory, scopeBranch]);
  const open = exceptions.filter((e) => e.status === "open" && (!scopeBranch || e.branchId === scopeBranch));

  const day = new Date().getDate();
  const revenue = scopedInv.reduce((s, i) => s + i.dailyRunRate * i.sellingPrice * day, 0);
  const cogs = scopedInv.reduce((s, i) => s + i.dailyRunRate * i.unitCost * day, 0);
  const margin = revenue ? ((revenue - cogs) / revenue) * 100 : 0;
  const stockValue = scopedInv.reduce((s, i) => s + i.currentStock * i.unitCost, 0);

  const stockouts = open.filter((e) => e.type === "stockout");
  const worst = [...new Set(stockouts.map((e) => e.branchId))]
    .map((b) => ({ b, n: stockouts.filter((e) => e.branchId === b).length, cost: stockouts.filter((e) => e.branchId === b).reduce((s, e) => s + e.revenueImpact, 0) }))
    .sort((a, b) => b.cost - a.cost)[0];
  const dead = open.filter((e) => e.type === "dead_stock").reduce((s, e) => s + e.revenueImpact, 0);
  const brief = `Group margin is ${margin >= 50 ? "healthy" : "under pressure"} at ${margin.toFixed(0)}%. ${
    worst ? `${bName(worst.b)} has ${worst.n} high-impact stockout${worst.n > 1 ? "s" : ""} costing est. ${LKR(worst.cost)}/day.` : "No active stockouts across the group."
  } Dead stock is tying up ${LKR(dead)} across the retail LOB.`;

  const isBranch = persona.role === "branch";
  const title = isBranch ? `7 AM Exception Report — ${bName(scopeBranch!)}` : persona.role === "executive" ? "Group-Wide Daily Rollup" : "Retail LOB Exception Rollup";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">Section 7.4 — Last nightly sync: {lastSync ? new Date(lastSync).toLocaleString() : "seed data"}</p>
        </div>
        <Button onClick={runSync} disabled={syncing}>
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {syncing ? "Running ETL job..." : "Run Nightly Sync (Generate 7AM Report)"}
        </Button>
      </div>

      {isBranch ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi icon={Wallet} label="Store Revenue (MTD)" value={LKR(revenue)} tone="good" />
          <Kpi icon={Users} label="Footfall vs Conversion" value={`${(scopedInv.length * 52 + day * 11).toLocaleString()} / 18.4%`} />
          <Kpi icon={AlertTriangle} label="Store Exceptions" value={String(open.length)} tone={open.length ? "bad" : "good"} />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Wallet} label="Total Revenue (MTD)" value={LKR(revenue)} />
            <Kpi icon={BarChart3} label="Gross Margin %" value={`${margin.toFixed(1)}%`} tone={margin >= 0 ? "good" : "bad"} />
            <Kpi icon={TrendingDown} label="Active Stock Value" value={LKR(stockValue)} />
            <Kpi icon={AlertTriangle} label="Unresolved Exceptions" value={String(open.length)} tone={open.length ? "bad" : "good"} />
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary"><Sparkles className="size-3.5" />AI Morning Brief</div>
            <p className="text-sm text-foreground">{brief}</p>
          </div>
        </>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr>
              {!isBranch && <th className="px-3 py-2">Subsidiary / LOB</th>}
              {!isBranch && <th className="px-3 py-2">Branch</th>}
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Issue</th>
              <th className="px-3 py-2 text-right">Est. Impact (LKR)</th>
              <th className="px-3 py-2">{isBranch ? "Action" : "Explanation"}</th>
              {isBranch && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {open.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No open exceptions. Run the nightly sync to refresh.</td></tr>
            )}
            {open.map((e) => (
              <tr key={e.id} className="border-t border-border">
                {!isBranch && <td className="px-3 py-2 text-muted-foreground">Kelly Felder Retail</td>}
                {!isBranch && <td className="px-3 py-2">{bName(e.branchId)}</td>}
                <td className="px-3 py-2 font-mono text-xs">{e.sku}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_META[e.type].cls}`}>{TYPE_META[e.type].label}</span></td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-destructive">{Math.round(e.revenueImpact).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{isBranch ? TYPE_META[e.type].action : e.aiSummary}</td>
                {isBranch && (
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => save(exceptions.map((x) => (x.id === e.id ? { ...x, status: "resolved" } : x)))}>
                      <CheckCircle2 className="size-3.5" /> Mark Resolved
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
