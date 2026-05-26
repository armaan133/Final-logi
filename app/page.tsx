"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Clock3,
  Database,
  MapPinned,
  Package,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Warehouse,
  Zap,
} from "lucide-react";
import { LogisticsScene } from "@/components/LogisticsScene";
import { OriginalThinkingLoader } from "@/components/OriginalThinkingLoader";
import { AutopilotControlTower } from "@/components/AutopilotControlTower";
import type { AutopilotAction } from "@/lib/autopilot-engine";
import { useLogiTrack, type Order } from "@/lib/state-store";

const activeStatuses: Order["status"][] = [
  "placed",
  "confirmed",
  "dispatched",
  "out_for_delivery",
];

const statusLabels: Record<Order["status"], string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed: "Failed",
  returned: "Returned",
};

const workspaceCards = [
  {
    href: "/vendor",
    title: "Owner Console",
    eyebrow: "Inventory + dispatch",
    description: "Stock, assignment, forecasting, billing.",
    icon: BarChart3,
    accentClass: "text-cyan-200 bg-cyan-300/10 border-cyan-200/[0.18]",
  },
  {
    href: "/agent",
    title: "Agent Field App",
    eyebrow: "Driver workflow",
    description: "Route tasks, status, GPS, payouts.",
    icon: Truck,
    accentClass: "text-emerald-200 bg-emerald-300/10 border-emerald-200/[0.18]",
  },
  {
    href: "/customer",
    title: "Customer Store",
    eyebrow: "Shopping + tracking",
    description: "Checkout, tracking, feedback, returns.",
    icon: ShoppingBag,
    accentClass: "text-amber-200 bg-amber-300/10 border-amber-200/[0.18]",
  },
];

export default function Home() {
  const router = useRouter();
  const {
    autoAssignOrder,
    resetState,
    restockProduct,
    state,
    toggleSimulationMode,
  } = useLogiTrack();
  const [loaderMounted, setLoaderMounted] = useState(true);
  const [loaderVisible, setLoaderVisible] = useState(true);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("skipLoader")) {
      const skipTimer = window.setTimeout(() => {
        setLoaderVisible(false);
        setLoaderMounted(false);
      }, 0);

      return () => window.clearTimeout(skipTimer);
    }

    const hideTimer = window.setTimeout(() => setLoaderVisible(false), 900);
    const removeTimer = window.setTimeout(() => setLoaderMounted(false), 1420);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  const activeOrders = useMemo(
    () => state.orders.filter((order) => activeStatuses.includes(order.status)),
    [state.orders]
  );

  const lowStockProducts = useMemo(
    () => [...state.products].sort((a, b) => a.stock - b.stock).slice(0, 4),
    [state.products]
  );

  const recentOrders = useMemo(() => {
    const visibleOrders = activeOrders.length > 0 ? activeOrders : state.orders;
    return [...visibleOrders]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 5);
  }, [activeOrders, state.orders]);

  const hubCoverage = useMemo(
    () =>
      state.warehouses.map((warehouse) => ({
        ...warehouse,
        agents: state.agents.filter((agent) => agent.warehouseId === warehouse.id)
          .length,
      })),
    [state.agents, state.warehouses]
  );

  const totalRevenue = state.orders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.total, 0);
  const activeAgents = state.agents.filter((agent) => agent.status !== "offline").length;
  const assignedActiveOrders = activeOrders.filter((order) => order.agentId).length;
  const lowStockAlerts = state.products.filter((product) => product.stock < 10).length;
  const returnRate =
    state.orders.length === 0
      ? 0
      : Math.round(
          (state.orders.filter((order) => order.returnRequested).length /
            state.orders.length) *
            100
        );
  const healthScore = Math.max(68, 100 - lowStockAlerts * 7 - returnRate);

  const statCards = [
    {
      label: "Active",
      value: activeOrders.length,
      detail: `${assignedActiveOrders} assigned`,
      icon: MapPinned,
      tone: "text-cyan-100",
    },
    {
      label: "Agents",
      value: activeAgents,
      detail: `${state.warehouses.length} hubs`,
      icon: Activity,
      tone: "text-emerald-100",
    },
    {
      label: "Stock",
      value: lowStockAlerts,
      detail: "risk SKUs",
      icon: Zap,
      tone: "text-amber-100",
    },
    {
      label: "Paid",
      value: `₹${Math.round(totalRevenue / 1000)}k`,
      detail: `${returnRate}% returns`,
      icon: CircleDollarSign,
      tone: "text-zinc-100",
    },
  ];

  const handleAutopilotAction = (action: AutopilotAction) => {
    if (action.kind === "assign" && action.orderId) {
      autoAssignOrder(action.orderId);
      return;
    }

    if (action.kind === "restock" && action.productId && action.quantity) {
      restockProduct(action.productId, action.quantity);
      return;
    }

    if (action.kind === "review" && action.target) {
      router.push(`/vendor?tab=${action.target}`);
    }
  };

  return (
    <>
      {loaderMounted ? <OriginalThinkingLoader isVisible={loaderVisible} /> : null}

      <div className="logi-command-page relative min-h-screen overflow-hidden bg-[#090a08] text-zinc-100 selection:bg-emerald-200 selection:text-zinc-950">
        <div className="absolute inset-0 opacity-70">
          <LogisticsScene
            activeDeliveries={activeOrders.length}
            onlineAgents={activeAgents}
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#090a08_0%,rgba(9,10,8,0.92)_42%,rgba(9,10,8,0.64)_100%),linear-gradient(180deg,rgba(9,10,8,0.2),#090a08_90%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(244,244,245,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,244,245,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

        <header className="logi-command-topbar relative z-20 border-b border-white/10 bg-[#090a08]/[0.82] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-emerald-200/20 bg-emerald-200/10 text-emerald-100">
                <Package className="size-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-tight text-white sm:text-base">
                  LogiTrack
                </p>
                <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 sm:block">
                  Local demo operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSimulationMode}
                className={`pressable inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-black uppercase tracking-[0.1em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/[0.7] ${
                  state.simulationMode
                    ? "border-emerald-200/30 bg-emerald-200 text-zinc-950"
                    : "border-white/10 bg-white/[0.055] text-zinc-400"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    state.simulationMode ? "bg-zinc-950" : "bg-zinc-600"
                  }`}
                />
                <span className="hidden sm:inline">Simulation</span>
                {state.simulationMode ? "On" : "Off"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetState();
                }}
                className="pressable inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 text-[11px] font-black uppercase tracking-[0.1em] text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/[0.7]"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <section className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)_330px]">
            <aside className="reveal-item ops-panel h-fit p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    Start here
                  </p>
                  <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
                    Choose a workspace
                  </h1>
                </div>
                <span className="signal-dot mt-2 bg-emerald-300" />
              </div>

              <div className="mt-5 grid gap-2">
                {workspaceCards.map((workspace, index) => {
                  const Icon = workspace.icon;
                  const metric =
                    index === 0
                      ? `${lowStockAlerts} stock risks`
                      : index === 1
                        ? `${activeAgents} online`
                        : `${state.products.length} products`;

                  return (
                    <Link
                      key={workspace.href}
                      href={workspace.href}
                      className="workspace-entry group/link reveal-item"
                      style={{ animationDelay: `${120 + index * 65}ms` }}
                    >
                      <div
                        className={`grid size-10 shrink-0 place-items-center rounded-lg border ${workspace.accentClass}`}
                      >
                        <Icon className="size-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-zinc-100">
                            {workspace.title}
                          </p>
                          <ArrowRight className="size-3.5 shrink-0 text-zinc-500 transition-transform group-hover/link:translate-x-0.5" />
                        </div>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                          {workspace.eyebrow}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-zinc-400">
                          {workspace.description}
                        </p>
                        <p className="mt-2 text-[11px] font-bold text-zinc-500">
                          {metric}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </aside>

            <div className="grid gap-4">
              <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:180ms]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                      Overview
                    </p>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-white">
                      Current operating board
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                      A compact snapshot of routing, warehouse coverage, stock
                      pressure, and customer activity in the local demo state.
                    </p>
                  </div>

                  <div className="min-w-48 rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      <span>Health</span>
                      <ShieldCheck className="size-3.5 text-emerald-200" />
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-emerald-200 transition-[width] duration-500"
                        style={{ width: `${healthScore}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                      <span>{state.orders.length} orders</span>
                      <span>{state.products.length} SKUs</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-4">
                  {statCards.map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div key={stat.label} className="quiet-stat">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500">
                          <Icon className="size-3.5" />
                          {stat.label}
                        </div>
                        <div className={`mt-2 text-2xl font-black tabular-nums ${stat.tone}`}>
                          {stat.value}
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-600">
                          {stat.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="reveal-item [animation-delay:220ms]">
                <AutopilotControlTower
                  state={state}
                  compact
                  onAction={handleAutopilotAction}
                />
              </div>

              <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:260ms]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black tracking-tight text-white">
                      Dispatch Pipeline
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Orders grouped by the next handoff.
                    </p>
                  </div>
                  <Truck className="size-5 text-zinc-400" />
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-4">
                  {activeStatuses.map((status, index) => {
                    const count = state.orders.filter(
                      (order) => order.status === status
                    ).length;
                    return (
                      <div key={status} className="pipeline-step">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                            0{index + 1}
                          </span>
                          <span className="text-lg font-black tabular-nums text-white">
                            {count}
                          </span>
                        </div>
                        <p className="mt-4 min-h-8 text-xs font-bold leading-4 text-zinc-300">
                          {statusLabels[status]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:340ms]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-white">
                        Inventory Watch
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Lowest stock products.
                      </p>
                    </div>
                    <Boxes className="size-5 text-zinc-400" />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="inventory-row">
                        <PackageCheck className="size-4 text-zinc-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-bold text-zinc-200">
                              {product.name}
                            </p>
                            <span className="text-sm font-black tabular-nums text-amber-100">
                              {product.stock}
                            </span>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                            <div
                              className="h-full rounded-full bg-amber-200"
                              style={{
                                width: `${Math.min(100, Math.max(8, product.stock * 3))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:420ms]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-white">
                        Hub Coverage
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Agent spread across fulfillment points.
                      </p>
                    </div>
                    <Warehouse className="size-5 text-zinc-400" />
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {hubCoverage.map((hub) => (
                      <div key={hub.id} className="hub-row">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-zinc-200">
                            {hub.name}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            {hub.lat.toFixed(2)}, {hub.lng.toFixed(2)}
                          </p>
                        </div>
                        <span className="text-sm font-black tabular-nums text-emerald-100">
                          {hub.agents}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-4">
              <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:300ms]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-white">Order Feed</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Recent activity.
                    </p>
                  </div>
                  <Clock3 className="size-5 text-zinc-400" />
                </div>

                <div className="mt-4 grid gap-2">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="order-row">
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-sm font-black text-zinc-200">
                            {order.customerName}
                          </p>
                          <span className="shrink-0 font-mono text-xs text-zinc-500">
                            ₹{Math.round(order.total)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {order.address}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-100">
                            {statusLabels[order.status]}
                          </span>
                          <span className="font-mono text-zinc-600">
                            {order.id.replace("ord-", "#")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:380ms]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-white">Data Store</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Browser session state.
                    </p>
                  </div>
                  <Database className="size-5 text-zinc-400" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="quiet-stat">
                    <p className="text-[11px] font-bold text-zinc-500">Orders</p>
                    <p className="mt-1 text-xl font-black text-white">{state.orders.length}</p>
                  </div>
                  <div className="quiet-stat">
                    <p className="text-[11px] font-bold text-zinc-500">Products</p>
                    <p className="mt-1 text-xl font-black text-white">{state.products.length}</p>
                  </div>
                  <div className="quiet-stat">
                    <p className="text-[11px] font-bold text-zinc-500">Agents</p>
                    <p className="mt-1 text-xl font-black text-white">{state.agents.length}</p>
                  </div>
                  <div className="quiet-stat">
                    <p className="text-[11px] font-bold text-zinc-500">Plan</p>
                    <p className="mt-1 text-xl font-black capitalize text-white">
                      {state.subscription.tier}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
