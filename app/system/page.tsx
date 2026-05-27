"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
 Activity,
 ArrowRight,
 BarChart3,
 CircleDollarSign,
 Clock3,
 Database,
 MapPinned,
 Package,
 RotateCcw,
 ShieldCheck,
 ShoppingBag,
 Truck,
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
 accentClass: "text-foreground bg-secondary",
 },
 {
 href: "/agent",
 title: "Agent Field App",
 eyebrow: "Driver workflow",
 description: "Route tasks, status, GPS, payouts.",
 icon: Truck,
 accentClass: "text-primary bg-primary/10",
 },
 {
 href: "/customer",
 title: "Customer Store",
 eyebrow: "Shopping + tracking",
 description: "Checkout, tracking, feedback, returns.",
 icon: ShoppingBag,
 accentClass: "text-foreground bg-secondary",
 },
];

export default function Home() {
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
 tone: "text-foreground",
 },
 {
 label: "Agents",
 value: activeAgents,
 detail: `${state.warehouses.length} hubs`,
 icon: Activity,
 tone: "text-foreground",
 },
 {
 label: "Stock",
 value: lowStockAlerts,
 detail: "risk SKUs",
 icon: Zap,
 tone: "text-foreground",
 },
 {
 label: "Paid",
 value: `₹${Math.round(totalRevenue / 1000)}k`,
 detail: `${returnRate}% returns`,
 icon: CircleDollarSign,
 tone: "text-foreground",
 },
 ];

 const handleAutopilotAction = (action: AutopilotAction) => {
 if (action.kind === "assign" && action.orderId) {
 autoAssignOrder(action.orderId);
 return;
 }

 if (action.kind === "restock" && action.productId && action.quantity) {
 restockProduct(action.productId, action.quantity);
 }
 };

 return (
 <>
 {loaderMounted ? <OriginalThinkingLoader isVisible={loaderVisible} /> : null}

 <div className="logi-command-page relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
 <div className="absolute inset-0 opacity-20">
 <LogisticsScene
 activeDeliveries={activeOrders.length}
 onlineAgents={activeAgents}
 />
 </div>
 
 <header className="logi-command-topbar relative z-20 border-b border-border bg-background">
 <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
 <div className="flex min-w-0 items-center gap-3">
 <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-primary/10 text-foreground">
 <Package className="size-[18px]" />
 </div>
 <div className="min-w-0">
 <p className="truncate text-sm font-black tracking-tight text-foreground sm:text-base">
 LogiTrack
 </p>
 <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:block">
 Local demo operations
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={toggleSimulationMode}
 className={`pressable inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-black uppercase tracking-[0.1em] cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
 state.simulationMode
 ? "border-emerald-200/30 bg-primary text-background hover:bg-primary/90"
 : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
 }`}
 >
 <span
 className={`size-2 rounded-full ${
 state.simulationMode ? "bg-background" : "bg-muted-foreground"
 }`}
 />
 <span className="hidden sm:inline">Simulation</span>
 {state.simulationMode ? "On" : "Off"}
 </button>
 <button
 type="button"
 aria-label="Reset simulation state"
 onClick={() => {
 resetState();
 }}
 className="pressable inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground cursor-pointer transition-colors duration-200 hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <RotateCcw className="size-3.5" />
 <span className="hidden sm:inline">Reset</span>
 </button>
 </div>
 </div>
 </header>

 <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
 <section className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
 <aside className="reveal-item ops-panel h-fit p-4">
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
 Start here
 </p>
 <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground">
 Choose a workspace
 </h1>
 </div>
 <span className="signal-dot mt-2 bg-primary/90" />
 </div>

 <div className="mt-5 grid gap-3">
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
 className="workspace-entry group/link reveal-item cursor-pointer"
 style={{ animationDelay: `${120 + index * 65}ms` }}
 >
 <div
 className={`grid size-10 shrink-0 place-items-center rounded-lg ${workspace.accentClass}`}
 >
 <Icon className="size-[18px]" />
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center justify-between gap-2">
 <p className="truncate text-sm font-black text-foreground">
 {workspace.title}
 </p>
 <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/link:translate-x-0.5" />
 </div>
 <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
 {workspace.eyebrow}
 </p>
 <p className="mt-2 text-xs leading-5 text-muted-foreground">
 {workspace.description}
 </p>
 <p className="mt-2 text-[11px] font-bold text-muted-foreground">
 {metric}
 </p>
 </div>
 </Link>
 );
 })}
 </div>
 </aside>

 <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
 <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:180ms]">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
 <div>
 <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
 Overview
 </p>
 <h2 className="mt-2 text-xl font-black tracking-tight text-foreground">
 Current operating board
 </h2>
 <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
 A compact snapshot of routing, warehouse coverage, stock
 pressure, and customer activity in the local demo state.
 </p>
 </div>

 <div className="w-full shrink-0 rounded-lg bg-secondary p-3 xl:w-56">
 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
 <span>Health</span>
 <ShieldCheck className="size-3.5 text-primary" />
 </div>
 <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
 <div
 className="h-full rounded-full bg-primary transition-[width] duration-500"
 style={{ width: `${healthScore}%` }}
 />
 </div>
 <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
 <span>{state.orders.length} orders</span>
 <span>{state.products.length} SKUs</span>
 </div>
 </div>
 </div>

 <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
 {statCards.map((stat) => {
 const Icon = stat.icon;

 return (
 <div key={stat.label} className="quiet-stat">
 <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
 <Icon className="size-3.5" />
 {stat.label}
 </div>
 <div className={`mt-2 text-2xl font-black tabular-nums ${stat.tone}`}>
 {stat.value}
 </div>
 <div className="mt-1 text-[11px] text-muted-foreground">
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

 <section className="border border-border bg-card">
 {/* Dispatch pipeline */}
 <div className="p-6 sm:p-7">
 <header className="flex flex-col gap-1">
 <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
 Dispatch pipeline
 </p>
 <h2 className="text-base font-semibold tracking-tight text-foreground">
 Orders by next handoff
 </h2>
 </header>

 <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-4">
 {activeStatuses.map((status) => {
 const count = state.orders.filter(
 (order) => order.status === status
 ).length;
 return (
 <div key={status} className="flex flex-col gap-1">
 <dt className="text-xs text-muted-foreground">
 {statusLabels[status]}
 </dt>
 <dd className="text-2xl font-semibold tabular-nums text-foreground">
 {count}
 </dd>
 </div>
 );
 })}
 </dl>
 </div>

 {/* Inventory + Hub split — one rectangle, internal hairlines */}
 <div className="grid border-t border-border lg:grid-cols-2">
 <div className="p-6 sm:p-7">
 <header className="flex flex-col gap-1">
 <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
 Inventory watch
 </p>
 <h2 className="text-base font-semibold tracking-tight text-foreground">
 Lowest stock SKUs
 </h2>
 </header>

 <ul className="mt-5 flex flex-col border-t border-border">
 {lowStockProducts.map((product) => (
 <li
 key={product.id}
 className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0"
 >
 <p className="min-w-0 flex-1 truncate text-sm text-foreground">
 {product.name}
 </p>
 <p className="text-sm tabular-nums">
 <span
 className={
 product.stock === 0
 ? "font-semibold text-foreground"
 : product.stock < 10
 ? "font-medium text-foreground"
 : "text-muted-foreground"
 }
 >
 {product.stock}
 </span>
 <span className="ml-1 text-xs text-muted-foreground">
 units
 </span>
 </p>
 </li>
 ))}
 </ul>
 </div>

 <div className="border-t border-border p-6 sm:p-7 lg:border-l lg:border-t-0">
 <header className="flex flex-col gap-1">
 <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
 Hub coverage
 </p>
 <h2 className="text-base font-semibold tracking-tight text-foreground">
 Agents per fulfillment point
 </h2>
 </header>

 <ul className="mt-5 flex flex-col border-t border-border">
 {hubCoverage.map((hub) => (
 <li
 key={hub.id}
 className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0"
 >
 <p className="min-w-0 flex-1 truncate text-sm text-foreground">
 {hub.name}
 </p>
 <p className="text-sm tabular-nums">
 <span className="font-medium text-foreground">{hub.agents}</span>
 <span className="ml-1 text-xs text-muted-foreground">
 {hub.agents === 1 ? "agent" : "agents"}
 </span>
 </p>
 </li>
 ))}
 </ul>
 </div>
 </div>
 </section>
 </div>

 <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5 lg:col-span-2 xl:col-span-1">
 <div className="reveal-item ops-panel p-4 sm:p-5 [animation-delay:300ms]">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-sm font-black text-foreground">Order Feed</h2>
 <p className="mt-1 text-xs text-muted-foreground">
 Recent activity.
 </p>
 </div>
 <Clock3 className="size-5 text-muted-foreground" />
 </div>

 <div className="mt-4 grid gap-3">
 {recentOrders.map((order) => (
 <div key={order.id} className="order-row">
 <div className="min-w-0">
 <div className="flex items-start justify-between gap-3">
 <p className="truncate text-sm font-black text-foreground">
 {order.customerName}
 </p>
 <span className="shrink-0 font-mono text-xs text-muted-foreground">
 ₹{Math.round(order.total)}
 </span>
 </div>
 <p className="mt-1 truncate text-xs text-muted-foreground">
 {order.address}
 </p>
 <div className="mt-3 flex items-center justify-between text-[11px]">
 <span className="font-bold text-foreground">
 {statusLabels[order.status]}
 </span>
 <span className="font-mono text-muted-foreground">
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
 <h2 className="text-sm font-black text-foreground">Data Store</h2>
 <p className="mt-1 text-xs text-muted-foreground">
 Browser session state.
 </p>
 </div>
 <Database className="size-5 text-muted-foreground" />
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3">
 <div className="quiet-stat">
 <p className="text-[11px] font-bold text-muted-foreground">Orders</p>
 <p className="mt-1 text-xl font-black text-foreground">{state.orders.length}</p>
 </div>
 <div className="quiet-stat">
 <p className="text-[11px] font-bold text-muted-foreground">Products</p>
 <p className="mt-1 text-xl font-black text-foreground">{state.products.length}</p>
 </div>
 <div className="quiet-stat">
 <p className="text-[11px] font-bold text-muted-foreground">Agents</p>
 <p className="mt-1 text-xl font-black text-foreground">{state.agents.length}</p>
 </div>
 <div className="quiet-stat">
 <p className="text-[11px] font-bold text-muted-foreground">Plan</p>
 <p className="mt-1 text-xl font-black capitalize text-foreground">
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
