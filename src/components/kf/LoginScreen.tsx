import { ArrowRight, Building2, Package, ShieldCheck, Sparkles, Store, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PERSONAS } from "@/lib/kf/seed";
import { useKF } from "@/lib/kf/store";

export function LoginScreen() {
  const { login } = useKF();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[480px] w-[640px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            <span>Axceera Section 7.5 Prototype</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Kelly Felder Retail Replenishment
          </h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Select a verified user profile to authenticate into the branch inventory portal, DC fulfillments, or the central escalation dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {PERSONAS.map((p) => {
            const isAdmin = p.role === "admin";
            const isWarehouse = p.role === "warehouse";

            return (
              <Card
                key={p.id}
                className="group relative flex flex-col justify-between overflow-hidden border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <div
                  className={`h-1.5 w-full ${isAdmin ? "bg-primary" : isWarehouse ? "bg-warning" : "bg-info"}`}
                />

                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex size-12 items-center justify-center rounded-xl font-mono text-base font-semibold shadow-xs ${
                        isAdmin
                          ? "bg-primary text-primary-foreground"
                          : isWarehouse 
                          ? "bg-warning text-warning-foreground border border-warning/20"
                          : "bg-secondary text-secondary-foreground border border-border"
                      }`}
                    >
                      {p.initials}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                        isAdmin
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : isWarehouse
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-info/10 text-info border border-info/20"
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="size-3" /> : isWarehouse ? <Package className="size-3" /> : <Store className="size-3" />}
                      {isAdmin ? "LOB Lead" : isWarehouse ? "DC Manager" : "Branch"}
                    </span>
                  </div>

                  <div>
                    <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {p.name}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                      {p.department}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {p.description}
                  </p>

                  <div className="rounded-md border border-border bg-muted/40 p-2.5 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="size-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {p.branchName ?? "Group-wide Rollup"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Scope: {p.branchId ? `Scoped to [${p.branchId}]` : "Group-wide Rollup"}
                    </div>
                  </div>

                  <Button
                    className="w-full cursor-pointer justify-between group/btn"
                    variant={isAdmin ? "default" : "outline"}
                    onClick={() => login(p.id)}
                  >
                    <span>Sign in as {p.name.split(" ")[0]}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card/60 p-4 text-center text-xs text-muted-foreground backdrop-blur">
          <div className="flex items-center justify-center gap-2 font-medium text-foreground">
            <UserCheck className="size-4 text-primary" />
            <span>Multi-Tenant Role Enforcement</span>
          </div>
          <p className="mt-1 max-w-xl mx-auto text-[11px]">
            Branch managers can only inspect stock and propose orders within their store. Central Admin reviews out-of-policy exceptions, manages spend ceilings, and adjusts automated reorder policies.
          </p>
        </div>
      </div>
    </div>
  );
}