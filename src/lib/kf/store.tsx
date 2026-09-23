import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BRANCHES,
  DEFAULT_POLICY,
  PERSONAS,
  STORAGE_KEYS,
  seedInventory,
  seedWarehouse,
} from "./seed";
import { evaluateReorder, nextRequestId } from "./engine";
import type {
  InventoryItem,
  LogEntry,
  Persona,
  PolicySettings,
  ReorderRequest,
  WarehouseRow,
} from "./types";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

type Ctx = {
  hydrated: boolean;
  isLoggedIn: boolean;
  personaId: string;
  persona: Persona;
  login: (id: string) => void;
  logout: () => void;
  branches: typeof BRANCHES;
  inventory: InventoryItem[];
  warehouse: WarehouseRow[];
  policy: PolicySettings;
  requests: ReorderRequest[];
  logs: LogEntry[];
  running: boolean;
  setRunning: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  savePolicy: (p: PolicySettings) => void;
  simulateSale: (branchId: string, sku: string, qty?: number) => void;
  manualReorder: (item: InventoryItem, qty: number) => void;
  approve: (requestId: string) => void;
  editAndApprove: (requestId: string, newQty: number) => void;
  reject: (requestId: string, note: string) => void;
  dispatchOrder: (requestId: string) => void;
  resetDemo: () => void;
};

const KFContext = createContext<Ctx | null>(null);

export function KFProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [personaId, setPersonaId] = useState<string>("bm-col");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouse, setWarehouse] = useState<WarehouseRow[]>([]);
  const [policy, setPolicy] = useState<PolicySettings>(DEFAULT_POLICY);
  const [requests, setRequests] = useState<ReorderRequest[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(4000);

  useEffect(() => {
    write(STORAGE_KEYS.branches, BRANCHES);
    setInventory(read(STORAGE_KEYS.inventory, seedInventory()));
    setWarehouse(read(STORAGE_KEYS.warehouse, seedWarehouse()));
    setPolicy(read(STORAGE_KEYS.policy, DEFAULT_POLICY));
    setRequests(read<ReorderRequest[]>(STORAGE_KEYS.requests, []));
    setLogs(read<LogEntry[]>(STORAGE_KEYS.logs, []));

    const savedUser = window.localStorage.getItem(STORAGE_KEYS.activeUser);
    if (savedUser && PERSONAS.some((p) => p.id === savedUser)) {
      setPersonaId(savedUser);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) write(STORAGE_KEYS.inventory, inventory);
  }, [hydrated, inventory]);

  useEffect(() => {
    if (hydrated) write(STORAGE_KEYS.warehouse, warehouse);
  }, [hydrated, warehouse]);

  useEffect(() => {
    if (hydrated) write(STORAGE_KEYS.requests, requests);
  }, [hydrated, requests]);

  useEffect(() => {
    if (hydrated) write(STORAGE_KEYS.logs, logs);
  }, [hydrated, logs]);

  const login = useCallback((id: string) => {
    setPersonaId(id);
    setIsLoggedIn(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.activeUser, id);
    }
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setRunning(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.activeUser);
    }
  }, []);

  const pushLog = useCallback((kind: LogEntry["kind"], message: string) => {
    setLogs((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          at: new Date().toISOString(),
          kind,
          message,
        },
        ...prev,
      ].slice(0, 300),
    );
  }, []);

  const branchName = useCallback(
    (id: string) => BRANCHES.find((b) => b.branchId === id)?.shortName ?? id,
    [],
  );

  const simulateSale = useCallback(
    (branchId: string, sku: string, qty = 1) => {
      setInventory((prevInv) => {
        const idx = prevInv.findIndex((i) => i.branchId === branchId && i.sku === sku);
        if (idx === -1) return prevInv;
        const item = prevInv[idx]!;
        const sold = Math.min(qty, Math.max(item.currentStock, 0));
        if (sold <= 0) return prevInv;

        const updated = { ...item, currentStock: item.currentStock - sold };
        const next = [...prevInv];
        next[idx] = updated;

        pushLog(
          "SALE",
          `${branchName(branchId)} sold ${sold} unit${sold > 1 ? "s" : ""} of ${sku} (Stock: ${updated.currentStock}/${updated.reorderThreshold})`,
        );

        setRequests((prevReq) => {
          const openExists = prevReq.some(
            (r) =>
              r.sku === sku &&
              r.branchId === branchId &&
              (r.approvalStatus === "needs_approval" || r.approvalStatus === "auto_approved" || r.approvalStatus === "approved"),
          );
          const wh = warehouseRef.current.find((w) => w.sku === sku);
          const result = evaluateReorder(updated, policyRef.current, wh, openExists);
          if (result.outcome === "none") return prevReq;
          if (result.outcome === "blocked") {
            pushLog("BLOCKED", `${sku} at ${branchName(branchId)} — ${result.reason}. Reorder suppressed.`);
            return prevReq;
          }
          const req = result.request;
          pushLog(
            "TRIGGER",
            `Threshold breached on ${sku}. Engine calculating replenishment of ${req.requestedQty} units to target cover.`,
          );
          if (req.approvalStatus === "auto_approved") {
            pushLog("POLICY CHECK", `In-policy and auto-approval enabled — auto-approved (${req.requestId}).`);
          } else {
            pushLog(
              "POLICY CHECK",
              `${req.escalationReasons[0]} — Escalated to Retail LOB Lead (${req.requestId}).`,
            );
          }
          return [req, ...prevReq];
        });

        return next;
      });
    },
    [branchName, pushLog],
  );

  const policyRef = useRef(policy);
  const warehouseRef = useRef(warehouse);
  policyRef.current = policy;
  warehouseRef.current = warehouse;

  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const pool = inventoryRef.current.filter((i) => i.currentStock > 0);
      if (pool.length === 0) return;
      const picks = Math.random() > 0.5 ? 2 : 1;
      for (let n = 0; n < picks; n += 1) {
        const item = pool[Math.floor(Math.random() * pool.length)]!;
        simulateSale(item.branchId, item.sku, 1 + Math.floor(Math.random() * 3));
      }
    }, speed);
    return () => window.clearInterval(timer);
  }, [running, speed, simulateSale]);

  const savePolicy = useCallback(
    (p: PolicySettings) => {
      setPolicy(p);
      write(STORAGE_KEYS.policy, p);
      pushLog("SYSTEM", "Global policy & guardrails updated by Retail LOB Lead.");
    },
    [pushLog],
  );

  const manualReorder = useCallback(
    (item: InventoryItem, qty: number) => {
      const reasons: string[] = [];
      const wh = warehouseRef.current.find((w) => w.sku === item.sku);
      if ((wh?.centralStockAvailable ?? 0) < qty) reasons.push("Central warehouse insufficient stock");
      if (qty > policyRef.current.maxOrderQuantity)
        reasons.push(`Quantity (${qty}) breaches Max Line Cap (${policyRef.current.maxOrderQuantity})`);
      if (qty < policyRef.current.minOrderQuantity)
        reasons.push(`Below minimum order quantity (${policyRef.current.minOrderQuantity})`);
      const totalValue = qty * item.unitCost;
      if (totalValue > policyRef.current.branchBudgetCap) reasons.push("Exceeds branch budget limit");

      const auto = reasons.length === 0 && policyRef.current.autoApproveInPolicyOrders;
      if (!auto && reasons.length === 0) reasons.push("Human sign-off required by enterprise policy");

      const req: ReorderRequest = {
        requestId: nextRequestId(),
        branchId: item.branchId,
        sku: item.sku,
        itemName: item.itemName,
        requestedQty: qty,
        unitCost: item.unitCost,
        totalValue,
        policyStatus: auto ? "in_policy" : "outside_policy",
        approvalStatus: auto ? "auto_approved" : "needs_approval",
        escalationReasons: reasons,
        origin: "manual",
        createdAt: new Date().toISOString(),
      };

      setRequests((prev) => [req, ...prev]);
      pushLog(
        "POLICY CHECK",
        `Manual request ${req.requestId} for ${qty} × ${item.sku} — ${auto ? "auto-approved" : "escalated to Retail LOB Lead"}.`,
      );
    },
    [pushLog],
  );

  const fulfil = useCallback((req: ReorderRequest) => {
    setWarehouse((prev) =>
      prev.map((w) =>
        w.sku === req.sku
          ? { ...w, centralStockAvailable: Math.max(0, w.centralStockAvailable - req.requestedQty) }
          : w,
      ),
    );
    setInventory((prev) =>
      prev.map((i) =>
        i.sku === req.sku && i.branchId === req.branchId
          ? {
              ...i,
              inTransitStock: i.inTransitStock + req.requestedQty,
              lastReorderDate: new Date().toISOString(),
            }
          : i,
      ),
    );
  }, []);

  const approve = useCallback(
    (requestId: string) => {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.requestId !== requestId) return r;
          pushLog(
            "APPROVAL",
            `${requestId} approved — awaiting physical dispatch to ${branchName(r.branchId)}.`,
          );
          return { ...r, approvalStatus: "approved" as const };
        }),
      );
    },
    [branchName, pushLog],
  );

  const editAndApprove = useCallback(
    (requestId: string, newQty: number) => {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.requestId !== requestId) return r;
          const oldQty = r.requestedQty;
          const updatedReq = {
            ...r,
            requestedQty: newQty,
            totalValue: newQty * r.unitCost,
            approvalStatus: "approved" as const,
          };
          pushLog(
            "APPROVAL",
            `${requestId} edited (${oldQty} -> ${newQty} units) and approved — awaiting physical dispatch to ${branchName(r.branchId)}.`
          );
          return updatedReq;
        })
      );
    },
    [branchName, pushLog]
  );

  const dispatchOrder = useCallback(
    (requestId: string) => {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.requestId !== requestId) return r;
          fulfil(r);
          pushLog(
            "SYSTEM",
            `${requestId} dispatched from DC — ${r.requestedQty} units of ${r.sku} in transit to ${branchName(r.branchId)}.`
          );
          return { ...r, approvalStatus: "dispatched" as const };
        })
      );
    },
    [branchName, fulfil, pushLog]
  );

  const reject = useCallback(
    (requestId: string, note: string) => {
      setRequests((prev) =>
        prev.map((r) => {
          if (r.requestId !== requestId) return r;
          pushLog("REJECTION", `${requestId} rejected (${r.sku}) — "${note}"`);
          return { ...r, approvalStatus: "rejected" as const, rejectionNote: note };
        }),
      );
    },
    [pushLog],
  );

  const resetDemo = useCallback(() => {
    const inv = seedInventory();
    const wh = seedWarehouse();
    setInventory(inv);
    setWarehouse(wh);
    setPolicy(DEFAULT_POLICY);
    setRequests([]);
    setRunning(false);
    write(STORAGE_KEYS.inventory, inv);
    write(STORAGE_KEYS.warehouse, wh);
    write(STORAGE_KEYS.policy, DEFAULT_POLICY);
    write(STORAGE_KEYS.requests, []);
    setLogs([
      {
        id: `${Date.now()}`,
        at: new Date().toISOString(),
        kind: "SYSTEM",
        message: "Demo data reset. Seeded 3 branches and 24 SKU/branch lines.",
      },
    ]);
  }, []);

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0]!;

  const value = useMemo<Ctx>(
    () => ({
      hydrated,
      isLoggedIn,
      personaId,
      persona,
      login,
      logout,
      branches: BRANCHES,
      inventory,
      warehouse,
      policy,
      requests,
      logs,
      running,
      setRunning,
      speed,
      setSpeed,
      savePolicy,
      simulateSale,
      manualReorder,
      approve,
      editAndApprove,
      reject,
      dispatchOrder,
      resetDemo,
    }),
    [
      hydrated,
      isLoggedIn,
      personaId,
      persona,
      login,
      logout,
      inventory,
      warehouse,
      policy,
      requests,
      logs,
      running,
      speed,
      savePolicy,
      simulateSale,
      manualReorder,
      approve,
      editAndApprove,
      reject,
      dispatchOrder,
      resetDemo,
    ],
  );

  return <KFContext.Provider value={value}>{children}</KFContext.Provider>;
}

export function useKF() {
  const ctx = useContext(KFContext);
  if (!ctx) throw new Error("useKF must be used inside KFProvider");
  return ctx;
}

export const LKR = (n: number) =>
  `LKR ${Math.round(n).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;