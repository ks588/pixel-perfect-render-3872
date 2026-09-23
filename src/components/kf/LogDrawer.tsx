import { ChevronDown, ChevronUp, Radio } from "lucide-react";
import { useState } from "react";
import { useKF } from "@/lib/kf/store";
import type { LogEntry } from "@/lib/kf/types";

const KIND_CLASS: Record<LogEntry["kind"], string> = {
  SALE: "text-muted-foreground",
  TRIGGER: "text-warning",
  "POLICY CHECK": "text-info",
  APPROVAL: "text-success",
  REJECTION: "text-destructive",
  BLOCKED: "text-muted-foreground",
  SYSTEM: "text-foreground",
};

export function LogDrawer() {
  const { logs, running } = useKF();
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-left lg:px-8"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Radio className={`size-3.5 ${running ? "text-success" : ""}`} />
          Live simulation & reorder log
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] tabular-nums text-secondary-foreground">
            {logs.length}
          </span>
        </span>
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>
      {open && (
        <div className="max-h-56 overflow-y-auto border-t border-border px-4 py-2 font-mono text-xs lg:px-8">
          {logs.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">
              Press Play or simulate a sale to start the event stream.
            </p>
          )}
          {logs.map((entry) => (
            <div key={entry.id} className="flex gap-3 py-0.5">
              <span className="shrink-0 text-muted-foreground/70">
                {new Date(entry.at).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 font-semibold ${KIND_CLASS[entry.kind]}`}>[{entry.kind}]</span>
              <span className="text-foreground/90">{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
