import { LogOut, Package, Pause, Play, ShieldCheck, Store, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKF } from "@/lib/kf/store";

function Pill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "warn"
      ? "border-warning/30 bg-warning/10 text-warning"
      : tone === "danger"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-secondary text-secondary-foreground";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export function TopNav() {
  const { persona, logout, inventory, requests, running, setRunning, policy } =
    useKF();

  const scoped =
    persona.role === "branch"
      ? inventory.filter((i) => i.branchId === persona.branchId)
      : inventory;

  const lowStock = scoped.filter(
    (i) => i.currentStock + i.inTransitStock <= i.reorderThreshold,
  ).length;

  const pending = requests.filter(
    (r) =>
      r.approvalStatus === "needs_approval" &&
      (persona.role === "admin" || r.branchId === persona.branchId),
  ).length;

  const isAdmin = persona.role === "admin";
  const isWarehouse = persona.role === "warehouse";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <Zap className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                Kelly Felder AI <span className="text-muted-foreground font-normal">|</span> Automated Reorder Engine
              </h1>
              <p className="text-xs text-muted-foreground">Section 7.5 — Branch-Level Replenishment</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-1.5 pl-2.5">
              <div className="flex items-center gap-2 text-left">
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    isAdmin
                      ? "bg-primary text-primary-foreground"
                      : isWarehouse
                      ? "bg-warning text-warning-foreground"
                      : "bg-info text-primary-foreground"
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="size-3.5" /> : isWarehouse ? <Package className="size-3.5" /> : <Store className="size-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-none text-foreground">
                    {persona.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                    {isAdmin ? "Retail LOB Lead" : isWarehouse ? "Distribution Center" : (persona.branchName ?? persona.branchId)}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Switch User / Logout"
                className="h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
              <span className="relative flex size-2.5">
                {running && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                )}
                <span
                  className={`relative inline-flex size-2.5 rounded-full ${
                    running ? "bg-success" : "bg-muted-foreground/40"
                  }`}
                />
              </span>
              <Button
                size="sm"
                variant={running ? "secondary" : "default"}
                onClick={() => setRunning(!running)}
                className="cursor-pointer h-7 text-xs"
              >
                {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {running ? "Pause" : "Play"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill
            label="Active scope"
            value={persona.role === "admin" ? "All branches" : isWarehouse ? "Central Warehouse" : (persona.branchName ?? persona.branchId ?? "")}
          />
          <Pill label="SKU lines" value={scoped.length} />
          <Pill label="Low stock alerts" value={lowStock} tone={lowStock ? "warn" : "default"} />
          <Pill label="Pending approvals" value={pending} tone={pending ? "danger" : "default"} />
          <Pill label="Auto-approve" value={policy.autoApproveInPolicyOrders ? "ON" : "OFF"} />
        </div>
      </div>
    </header>
  );
}