import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TopNav } from "@/components/kf/TopNav";
import { BranchView } from "@/components/kf/BranchView";
import { AdminView } from "@/components/kf/AdminView";
import { WarehouseView } from "@/components/kf/WarehouseView";
import { LogDrawer } from "@/components/kf/LogDrawer";
import { LoginScreen } from "@/components/kf/LoginScreen";
import { KFProvider, useKF } from "@/lib/kf/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kelly Felder AI — Automated Branch Reorder Engine" },
      {
        name: "description",
        content:
          "Automated apparel retail inventory replenishment prototype: branch stock dashboards, policy guardrails, escalation approvals and live sales simulation.",
      },
      { property: "og:title", content: "Kelly Felder AI — Automated Branch Reorder Engine" },
      {
        property: "og:description",
        content:
          "Branch-level reorder engine with multi-tenant roles, escalation inbox and live replenishment simulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Workspace() {
  const { persona, hydrated, resetDemo, isLoggedIn } = useKF();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading replenishment workspace...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-64">
      <TopNav />
      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        {persona.role === "admin" && <AdminView />}
        {persona.role === "warehouse" && <WarehouseView />}
        {persona.role === "branch" && <BranchView branchId={persona.branchId!} />}
        
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground">
          <p>
            Axceera Section 7.5 prototype — All state persists locally in your browser — No backend required.
          </p>
          <Button variant="outline" size="sm" onClick={resetDemo}>
            <RotateCcw className="size-3.5" /> Reset demo data
          </Button>
        </footer>
      </main>
      <LogDrawer />
      <Toaster />
    </div>
  );
}

function Page() {
  return (
    <KFProvider>
      <Workspace />
    </KFProvider>
  );
}