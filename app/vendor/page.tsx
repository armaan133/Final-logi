"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AutopilotControlTower } from "@/components/AutopilotControlTower";
import { ProductThumb } from "@/components/ProductThumb";
import type { AutopilotAction } from "@/lib/autopilot-engine";
import { useLogiTrack, Product } from "@/lib/state-store";
import { 
 BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
 LayoutDashboard, ShoppingBag, Send, CreditCard, Plus, Edit2, Trash2,
 AlertTriangle, Sparkles, TrendingUp, Users, Package, Compass, CheckCircle2, ChevronRight
} from "lucide-react";

// Dynamically import map to prevent SSR Leaflet errors
const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), { ssr: false });

export default function VendorDashboard() {
 const { 
 state, addProduct, updateProduct, deleteProduct, restockProduct,
 assignAgent, autoAssignOrder, upgradeSubscription,
 toggleSimulationMode, resetState
 } = useLogiTrack();

 const [activeTab, setActiveTab] = useState<"analytics" | "products" | "dispatch" | "map" | "billing">("analytics");
 const [productSearch, setProductSearch] = useState("");
 const [isAddModalOpen, setIsAddModalOpen] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [currentEditProduct, setCurrentEditProduct] = useState<Product | null>(null);

 // Form states
 const [formName, setFormName] = useState("");
 const [formSku, setFormSku] = useState("");
 const [formPrice, setFormPrice] = useState(0);
 const [formStock, setFormStock] = useState(0);
 const [formCategory, setFormCategory] = useState("Pantry");
 const [formImage, setFormImage] = useState("");

 const resetForm = () => {
 setFormName("");
 setFormSku("");
 setFormPrice(0);
 setFormStock(0);
 setFormCategory("Pantry");
 setFormImage("");
 };

 const handleAddProductSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!formName || !formSku) return;
 addProduct({
 name: formName,
 sku: formSku,
 price: formPrice,
 stock: formStock,
 category: formCategory,
 image: formImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"
 });
 resetForm();
 setIsAddModalOpen(false);
 };

 const handleEditProductSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentEditProduct) return;
 updateProduct({
 ...currentEditProduct,
 name: formName,
 sku: formSku,
 price: formPrice,
 stock: formStock,
 category: formCategory,
 image: formImage
 });
 setCurrentEditProduct(null);
 resetForm();
 setIsEditModalOpen(false);
 };

 const openEditModal = (p: Product) => {
 setCurrentEditProduct(p);
 setFormName(p.name);
 setFormSku(p.sku);
 setFormPrice(p.price);
 setFormStock(p.stock);
 setFormCategory(p.category);
 setFormImage(p.image);
 setIsEditModalOpen(true);
 };

 // --- STATS COMPUTATIONS ---
 const activeOrders = useMemo(() => {
 return state.orders.filter(o => 
 o.status !== "delivered" && o.status !== "failed" && o.status !== "returned"
 );
 }, [state.orders]);

 const stats = useMemo(() => {
 const deliveredOrders = state.orders.filter(o => o.status === "delivered");
 const failedOrders = state.orders.filter(o => o.status === "failed");
 const revenue = state.orders
 .filter(o => o.status === "delivered" || o.status === "placed" || o.status === "confirmed" || o.status === "dispatched" || o.status === "out_for_delivery")
 .reduce((sum, o) => sum + o.total, 0);

 const ratings = deliveredOrders.map(o => o.deliveryRating).filter((r): r is number => r !== null);
 const avgRating = ratings.length ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 5.0;

 const returnRate = state.orders.length 
 ? parseFloat(((state.orders.filter(o => o.status === "returned").length / state.orders.length) * 100).toFixed(1)) 
 : 0;

 const successDenominator = deliveredOrders.length + failedOrders.length;
 const successRate = successDenominator
 ? parseFloat(((deliveredOrders.length / successDenominator) * 100).toFixed(1))
 : 100;

 return {
 revenue: parseFloat(revenue.toFixed(2)),
 totalOrders: state.orders.length,
 avgRating,
 returnRate,
 successRate,
 deliveredCount: deliveredOrders.length,
 failedCount: failedOrders.length,
 activeOrdersCount: activeOrders.length
 };
 }, [state.orders, activeOrders]);

 // --- RECHARTS CHART DATA ---
 const chartData = useMemo(() => {
 // Group orders by date (last 7 days)
 const data: Record<string, { date: string; orders: number; revenue: number }> = {};
 const last7Days = Array.from({ length: 7 }).map((_, i) => {
 const d = new Date();
 d.setDate(d.getDate() - i);
 return d.toISOString().split("T")[0];
 }).reverse();

 last7Days.forEach(dateStr => {
 const formattedDate = new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
 data[dateStr] = { date: formattedDate, orders: 0, revenue: 0 };
 });

 state.orders.forEach(order => {
 const orderDateStr = order.timestamp.split("T")[0];
 if (data[orderDateStr]) {
 data[orderDateStr].orders += 1;
 if (order.status !== "returned") {
 data[orderDateStr].revenue += order.total;
 }
 }
 });

 return Object.values(data);
 }, [state.orders]);

 // Top products sales
 const topProductsData = useMemo(() => {
 const salesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
 state.orders.forEach(o => {
 if (o.status !== "returned") {
 o.products.forEach(p => {
 if (!salesMap[p.id]) {
 salesMap[p.id] = { name: p.name, quantity: 0, revenue: 0 };
 }
 salesMap[p.id].quantity += p.quantity;
 salesMap[p.id].revenue += p.price * p.quantity;
 });
 }
 });
 return Object.values(salesMap)
 .sort((a, b) => b.revenue - a.revenue)
 .slice(0, 5)
 .map(item => ({
 name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
 revenue: parseFloat(item.revenue.toFixed(2)),
 quantity: item.quantity
 }));
 }, [state.orders]);

 // --- AI FORECASTING LOGIC ---
 const forecastingData = useMemo(() => {
 // Calculates sales in past 30 days per product, then divides by 30 to get daily sales velocity
 // Predicts demand in next 7 days = velocity * 7
 // If current stock < predicted demand, restock suggested.
 return state.products.map(p => {
 let unitsSold = 0;
 state.orders.forEach(o => {
 if (o.status !== "returned") {
 const item = o.products.find(op => op.id === p.id);
 if (item) unitsSold += item.quantity;
 }
 });
 const dailyVelocity = unitsSold / 30;
 const predictedDemand7Days = Math.ceil(dailyVelocity * 7);
 const restockQtyNeeded = Math.max(0, (predictedDemand7Days * 1.5) - p.stock); // 1.5x buffer factor
 const needsRestock = p.stock < predictedDemand7Days;

 return {
 ...p,
 unitsSold,
 predictedDemand7Days,
 needsRestock,
 restockQtyNeeded
 };
 });
 }, [state.products, state.orders]);

 // --- CUSTOMER CHURN PREDICTOR ---
 // List of customers from our history. Let's tag them if they have 0 recent orders
 // Let's identify the mock customer database
 const customerChurnList = useMemo(() => {
 const customers = [
 { name: "Sachin Jadhav", lastOrderDaysAgo: 45, status: "churn_risk", phone: "+91 98900 12345" },
 { name: "Tejaswini Shinde", lastOrderDaysAgo: 5, status: "active", phone: "+91 97300 45678" },
 { name: "Aditi Gokhale", lastOrderDaysAgo: 32, status: "churn_risk", phone: "+91 95450 12345" },
 { name: "Rahul Sharma", lastOrderDaysAgo: 2, status: "active", phone: "+91 88060 67890" },
 { name: "Mukta Bhave", lastOrderDaysAgo: 60, status: "churned", phone: "+91 91580 98765" },
 { name: "Abhishek More", lastOrderDaysAgo: 12, status: "active", phone: "+91 99220 54321" }
 ];
 return customers.filter(c => c.lastOrderDaysAgo >= 30);
 }, []);

 const filteredProducts = useMemo(() => {
 return state.products.filter(p => 
 p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
 p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
 p.category.toLowerCase().includes(productSearch.toLowerCase())
 );
 }, [state.products, productSearch]);

 const activeAgents = useMemo(() => {
 return state.agents.filter(a => a.status !== "offline");
 }, [state.agents]);

 const handleAutopilotAction = (action: AutopilotAction) => {
 if (action.kind === "assign" && action.orderId) {
 autoAssignOrder(action.orderId);
 }

 if (action.kind === "restock" && action.productId && action.quantity) {
 restockProduct(action.productId, action.quantity);
 }

 if (action.target === "dispatch") setActiveTab("dispatch");
 if (action.target === "products") setActiveTab("products");
 if (action.target === "billing") setActiveTab("billing");
 };

 // SSG safe hydration check
 const [hydrated, setHydrated] = useState(false);
 useEffect(() => {
 const frame = window.requestAnimationFrame(() => setHydrated(true));
 return () => window.cancelAnimationFrame(frame);
 }, []);

 if (!hydrated) return null;

 return (
 <div className="logi-command-page flex min-h-screen text-foreground font-sans">
 {/* Sidebar Navigation */}
 <aside className="logi-command-sidebar w-64 border-r border-border flex flex-col justify-between shrink-0">
 <div>
 <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
 <div className="p-1.5 rounded-lg bg-foreground text-background">
 <Package className="w-5 h-5" />
 </div>
 <span className="font-bold text-lg text-foreground">LogiTrack Owner</span>
 </div>

 <nav className="p-4 space-y-1">
 <button
 onClick={() => setActiveTab("analytics")}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "analytics" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
 >
 <LayoutDashboard className="w-4 h-4" />
 Analytics & AI
 </button>
 <button
 onClick={() => setActiveTab("products")}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "products" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
 >
 <ShoppingBag className="w-4 h-4" />
 Products & Stock
 </button>
 <button
 onClick={() => setActiveTab("dispatch")}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all relative ${activeTab === "dispatch" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
 >
 <Send className="w-4 h-4" />
 Dispatch Center
 {state.orders.filter(o => o.status === "placed").length > 0 && (
 <span className="absolute right-4 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
 {state.orders.filter(o => o.status === "placed").length}
 </span>
 )}
 </button>
 <button
 onClick={() => setActiveTab("map")}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "map" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
 >
 <Compass className="w-4 h-4" />
 Optimization Map
 </button>
 <button
 onClick={() => setActiveTab("billing")}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "billing" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
 >
 <CreditCard className="w-4 h-4" />
 Billing Plan
 </button>
 </nav>
 </div>

 {/* User Footnote */}
 <div className="p-4 border-t border-border bg-background/50">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-foreground">Owner Portal</p>
 <p className="text-[10px] text-muted-foreground">Subscription: <span className="uppercase text-accent font-semibold">{state.subscription.tier}</span></p>
 </div>
 <Link 
 href="/" 
 className="text-[10px] bg-secondary hover:bg-secondary/80 px-2 py-1 rounded border border-border text-muted-foreground"
 >
 Back Home
 </Link>
 </div>
 </div>
 </aside>

 {/* Main Content Area */}
 <main className="logi-command-main flex-1 flex flex-col min-h-screen overflow-y-auto">
 <header className="logi-command-topbar h-16 border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
 <h2 className="text-xl font-bold tracking-tight text-foreground capitalize">
 {activeTab === "analytics" ? "Analytics & AI Insights" : activeTab === "map" ? "Route Optimization Map" : activeTab}
 </h2>
 <div className="flex items-center gap-4">
 <button
 onClick={() => {
 resetState();
 }}
 className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 active:bg-background border border-border hover:border-border/80 transition-all text-muted-foreground shadow-sm"
 >
 Reset Demo Data
 </button>
 <button
 onClick={toggleSimulationMode}
 className={`flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg transition-all border ${state.simulationMode ? "bg-emerald-600 hover:bg-emerald-500 text-foreground border-emerald-500 shadow-sm" : "bg-secondary hover:bg-secondary/80 text-muted-foreground border-border"}`}
 >
 <span className={`w-2.5 h-2.5 rounded-full ${state.simulationMode ? "bg-white animate-pulse" : "bg-muted-foreground"}`} />
 Simulator: {state.simulationMode ? "ON" : "OFF"}
 </button>
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-xs text-muted-foreground font-semibold">Simulated DB Connected</span>
 </div>
 </div>
 </header>

 <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
 {/* TAB 1: ANALYTICS & AI */}
 {activeTab === "analytics" && (
 <div className="space-y-8">
 <AutopilotControlTower
 state={state}
 onAction={handleAutopilotAction}
 />

 {/* Stat Cards */}
 <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
 <div className="p-6 rounded-xl bg-background border border-border">
 <span className="text-xs text-muted-foreground font-medium">Daily Revenue</span>
 <div className="text-2xl font-bold mt-1 text-foreground">₹{stats.revenue}</div>
 <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
 <TrendingUp className="w-3 h-3" /> +14.2% vs yesterday
 </div>
 </div>
 <div className="p-6 rounded-xl bg-background border border-border">
 <span className="text-xs text-muted-foreground font-medium">Total Orders placed</span>
 <div className="text-2xl font-bold mt-1 text-accent">{stats.totalOrders}</div>
 <div className="text-[10px] text-muted-foreground mt-1">Includes historical demo seeds</div>
 </div>
 <div className="p-6 rounded-xl bg-background border border-border">
 <span className="text-xs text-muted-foreground font-medium">Delivery Experience</span>
 <div className="text-2xl font-bold mt-1 text-amber-600">{stats.avgRating} / 5.0</div>
 <div className="text-[10px] text-muted-foreground mt-1">Average user rating</div>
 </div>
 <div className="p-6 rounded-xl bg-background border border-border">
 <span className="text-xs text-muted-foreground font-medium">Return Rate</span>
 <div className="text-2xl font-bold mt-1 text-rose-500">{stats.returnRate}%</div>
 <div className="text-[10px] text-rose-600 font-semibold mt-1">Benchmark: &lt;15%</div>
 </div>
 <div className="p-6 rounded-xl bg-background border border-border">
 <span className="text-xs text-muted-foreground font-medium">Delivery Success</span>
 <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.successRate}%</div>
 <div className="text-[10px] text-muted-foreground mt-1 font-mono">
 {stats.deliveredCount} ok · {stats.failedCount} failed
 </div>
 </div>
 <div className="p-6 rounded-xl bg-background border border-border">
 <span className="text-xs text-muted-foreground font-medium">Active Deliveries</span>
 <div className="text-2xl font-bold mt-1 text-emerald-600">{stats.activeOrdersCount}</div>
 <div className="text-[10px] text-muted-foreground mt-1">Pending dispatch/on route</div>
 </div>
 </div>

 {/* Charts Grid */}
 <div className="grid min-w-0 lg:grid-cols-2 gap-8">
 {/* Chart 1: Revenue Trends */}
 <div className="min-w-0 p-6 rounded-2xl bg-background border border-border space-y-4">
 <h3 className="text-sm font-bold text-muted-foreground">Revenue & Order Trends (Last 7 Days)</h3>
 <div className="min-w-0 h-64">
 <ResponsiveContainer width="100%" height="100%" minWidth={0}>
 <LineChart data={chartData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
 <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
 <YAxis stroke="#94a3b8" fontSize={11} />
 <Tooltip contentStyle={{ backgroundColor: "var(--logi-paper)", border: "1px solid var(--logi-rule)", color: "var(--logi-ink)" }} />
 <Legend />
 <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="var(--logi-accent)" strokeWidth={2} />
 <Line type="monotone" dataKey="orders" name="Orders Count" stroke="var(--logi-risk)" strokeWidth={2} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Chart 2: Product sales */}
 <div className="min-w-0 p-6 rounded-2xl bg-background border border-border space-y-4">
 <h3 className="text-sm font-bold text-muted-foreground">Top 5 Products by Revenue</h3>
 <div className="min-w-0 h-64">
 <ResponsiveContainer width="100%" height="100%" minWidth={0}>
 <BarChart data={topProductsData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
 <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
 <YAxis stroke="#94a3b8" fontSize={11} />
 <Tooltip contentStyle={{ backgroundColor: "var(--logi-paper)", border: "1px solid var(--logi-rule)", color: "var(--logi-ink)" }} />
 <Legend />
 <Bar dataKey="revenue" name="Sales Revenue (₹)" fill="var(--logi-accent)" radius={[4, 4, 0, 0]} />
 <Bar dataKey="quantity" name="Units Sold" fill="var(--logi-risk)" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 {/* AI Forecast & Churn Predictor Grid */}
 <div className="grid lg:grid-cols-2 gap-8">
 {/* AI Demand Forecasting */}
 <div className="p-6 rounded-2xl bg-background border border-border space-y-4 flex flex-col">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Sparkles className="w-5 h-5 text-accent" />
 <h3 className="font-bold text-foreground text-base">AI Demand Forecasting</h3>
 </div>
 <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">7-Day Predictor</span>
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Based on order velocity from the past 30 days, LogiTrack AI forecasts demand for the next 7 days and flags inventory that requires restock.
 </p>
 
 <div className="mt-4 flex-grow overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
 <th className="pb-3">Product Name</th>
 <th className="pb-3 text-center">Current Stock</th>
 <th className="pb-3 text-center">Predicted Demand</th>
 <th className="pb-3 text-right">Status / Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {forecastingData.map(p => (
 <tr key={p.id} className="hover:bg-card/30 transition-colors">
 <td className="py-3 font-semibold text-foreground">{p.name}</td>
 <td className="py-3 text-center font-mono">{p.stock} units</td>
 <td className="py-3 text-center font-mono text-amber-600 font-semibold">{p.predictedDemand7Days} units</td>
 <td className="py-3 text-right">
 {p.needsRestock ? (
 <button
 onClick={() => restockProduct(p.id, p.restockQtyNeeded)}
 className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 font-semibold hover:bg-amber-500 hover:text-background transition-all inline-flex items-center gap-1 text-[10px]"
 >
 <AlertTriangle className="w-3 h-3" />
 Restock +{p.restockQtyNeeded}
 </button>
 ) : (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
 <CheckCircle2 className="w-3 h-3" /> Optimum
 </span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Customer Churn Predictor */}
 <div className="p-6 rounded-2xl bg-background border border-border space-y-4 flex flex-col justify-between">
 <div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Users className="w-5 h-5 text-primary" />
 <h3 className="font-bold text-foreground text-base">Customer Churn Predictor</h3>
 </div>
 <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-border">30+ Days Inactive</span>
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed mt-2">
 Customers flagged here have not placed any order in 30+ days. The system suggests immediate re-engagement campaigns.
 </p>

 <div className="mt-4 space-y-3">
 {customerChurnList.map((customer, index) => (
 <div key={index} className="p-3.5 rounded-lg bg-card border border-border flex items-center justify-between">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-semibold text-sm text-foreground">{customer.name}</span>
 <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${customer.status === "churned" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
 {customer.status === "churned" ? "Churned" : "Churn Risk"}
 </span>
 </div>
 <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">Last order: {customer.lastOrderDaysAgo} days ago | {customer.phone}</p>
 </div>
 <button
 onClick={() => alert(`Re-engagement SMS with 15% discount coupon triggered for ${customer.name}!`)}
 className="px-3 py-1.5 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-semibold text-xs transition-colors duration-200 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 Send Offer
 </button>
 </div>
 ))}
 </div>
 </div>

 <div className="p-3 rounded-lg bg-card/50 border border-border/80 mt-4 flex items-center justify-between text-xs text-muted-foreground">
 <span>Average Churn rate: <strong className="text-foreground">8.5%</strong></span>
 <button className="text-accent font-semibold hover:underline flex items-center cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded">
 Campaign Settings <ChevronRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB 2: PRODUCTS & INVENTORY */}
 {activeTab === "products" && (
 <div className="space-y-6">
 {/* Toolbar */}
 <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-background p-4 rounded-xl border border-border">
 <input
 type="text"
 placeholder="Search products by SKU, name, or category..."
 value={productSearch}
 onChange={(e) => setProductSearch(e.target.value)}
 className="flex-grow max-w-md bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background placeholder-muted-foreground font-medium transition-colors duration-200"
 />
 <button
 onClick={() => {
 resetForm();
 setIsAddModalOpen(true);
 }}
 className="px-4 py-2.5 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-semibold text-sm transition-colors duration-200 inline-flex items-center gap-2 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 <Plus className="w-4 h-4" /> Add Product
 </button>
 </div>

 {/* Products Catalog Table */}
 <div className="rounded-2xl bg-background border border-border overflow-hidden">
 <table className="w-full text-left text-sm border-collapse">
 <thead>
 <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-xs bg-background">
 <th className="p-4 pl-6">Product</th>
 <th className="p-4">SKU</th>
 <th className="p-4 text-center">Category</th>
 <th className="p-4 text-right">Price</th>
 <th className="p-4 text-center">Stock</th>
 <th className="p-4 text-right pr-6">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredProducts.map(p => (
 <tr key={p.id} className="hover:bg-card/30 transition-colors">
 <td className="p-4 pl-6">
 <div className="flex items-center gap-3">
 <ProductThumb src={p.image} name={p.name} size={48} />
 <span className="font-bold text-foreground">{p.name}</span>
 </div>
 </td>
 <td className="p-4 text-muted-foreground font-mono text-xs">{p.sku}</td>
 <td className="p-4 text-center">
 <span className="px-2.5 py-0.5 rounded-full text-xs bg-card border border-border text-muted-foreground">
 {p.category}
 </span>
 </td>
 <td className="p-4 text-right font-semibold text-foreground font-mono">₹{p.price.toFixed(2)}</td>
 <td className="p-4 text-center">
 <span className={`font-mono text-sm px-2.5 py-1 rounded font-bold ${p.stock < 10 ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-card text-muted-foreground"}`}>
 {p.stock}
 </span>
 </td>
 <td className="p-4 text-right pr-6 space-x-2">
 <button
 onClick={() => openEditModal(p)}
 className="p-1.5 rounded bg-card hover:bg-secondary text-accent hover:text-foreground border border-border inline-flex items-center cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 title="Edit"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => {
 if (confirm("Are you sure you want to delete this product?")) {
 deleteProduct(p.id);
 }
 }}
 className="p-1.5 rounded bg-card hover:bg-secondary text-rose-500 hover:text-rose-600 border border-border inline-flex items-center cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 title="Delete"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => restockProduct(p.id, 20)}
 className="px-2 py-1 rounded bg-accent/10 hover:bg-foreground text-accent hover:text-background font-semibold text-xs border border-accent/20 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 Restock +20
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Inventory History Log */}
 <div className="p-6 rounded-2xl bg-background border border-border space-y-4">
 <h3 className="text-sm font-bold text-muted-foreground">Inventory Adjustment Logs</h3>
 <div className="overflow-y-auto max-h-60 space-y-2">
 {state.inventoryHistory.map(log => (
 <div key={log.id} className="p-3 rounded-lg bg-card/60 border border-border/80 flex items-center justify-between text-xs font-medium">
 <div className="flex items-center gap-3">
 <span className={`w-2 h-2 rounded-full ${log.change > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
 <div>
 <p className="text-foreground">
 {log.productName} <span className={log.change > 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{log.change > 0 ? `+${log.change}` : log.change} units</span>
 </p>
 <p className="text-[10px] text-muted-foreground mt-0.5 font-normal">Reason: {log.reason}</p>
 </div>
 </div>
 <span className="text-[10px] text-muted-foreground font-mono">{new Date(log.timestamp).toLocaleString()}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* TAB 3: DISPATCH CENTER */}
 {activeTab === "dispatch" && (
 <div className="space-y-6">
 {/* Filter active orders */}
 <div className="grid md:grid-cols-3 gap-6">
 {/* Incoming Orders Panel */}
 <div className="md:col-span-2 space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-muted-foreground">Pending Dispatch List</h3>
 <span className="text-xs text-muted-foreground font-semibold">{state.orders.filter(o => o.status === "placed").length} Unassigned</span>
 </div>

 <div className="space-y-4">
 {state.orders.filter(o => o.status !== "delivered" && o.status !== "failed" && o.status !== "returned").map(order => {
 const assignedAgent = state.agents.find(a => a.id === order.agentId);
 return (
 <div key={order.id} className="p-6 rounded-2xl bg-background border border-border space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <div className="flex items-center gap-2">
 <h4 className="font-bold text-foreground text-base">Order {order.id}</h4>
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20`}>
 {order.status.replace(/_/g, " ")}
 </span>
 </div>
 <p className="text-xs text-muted-foreground mt-1 font-mono">{new Date(order.timestamp).toLocaleString()}</p>
 </div>
 <div className="text-right">
 <span className="text-base font-black text-foreground font-mono">₹{order.total.toFixed(2)}</span>
 <p className="text-[10px] text-muted-foreground mt-0.5">{order.products.length} unique items</p>
 <div className="mt-1.5 flex items-center justify-end gap-1.5">
 <span
 className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${
 order.paymentStatus === "paid"
 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
 : order.paymentStatus === "refunded"
 ? "bg-rose-500/10 text-rose-500 border-rose-500/25"
 : "bg-amber-500/10 text-amber-600 border-amber-500/25"
 }`}
 >
 {order.paymentStatus}
 </span>
 {order.paymentProvider ? (
 <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
 {order.paymentProvider === "stripe" ? "Stripe" : "Razorpay"}
 </span>
 ) : null}
 </div>
 </div>
 </div>

 <div className="grid sm:grid-cols-2 gap-4 text-xs bg-card p-4 rounded-xl border border-border">
 <div>
 <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Customer Details</p>
 <p className="font-bold text-foreground mt-1">{order.customerName}</p>
 <p className="text-muted-foreground font-mono mt-0.5">{order.customerPhone}</p>
 <p className="text-muted-foreground mt-0.5">{order.address}</p>
 </div>
 <div>
 <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Products Ordered</p>
 <div className="mt-1 space-y-0.5">
 {order.products.map((p, idx) => (
 <p key={idx} className="text-muted-foreground font-medium">
 {p.name} <span className="text-accent">x{p.quantity}</span>
 </p>
 ))}
 </div>
 </div>
 </div>

 {/* Agent Assignment Controls */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
 <div>
 {assignedAgent ? (
 <p className="text-xs text-muted-foreground">
 Assigned Agent: <strong className="text-foreground">{assignedAgent.name}</strong> ({assignedAgent.phone})
 </p>
 ) : (
 <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
 <AlertTriangle className="w-3.5 h-3.5" /> Requires dispatch assignment
 </p>
 )}
 </div>
 
 {!order.agentId && (
 <div className="flex items-center gap-2">
 <select
 onChange={(e) => {
 if (e.target.value) assignAgent(order.id, e.target.value);
 }}
 defaultValue=""
 className="bg-card border border-border rounded-lg text-xs px-3 py-2 text-muted-foreground focus:outline-none font-semibold cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 <option value="" disabled>Manual Assign...</option>
 {activeAgents
 .filter(a => a.status === "available")
 .map(a => (
 <option key={a.id} value={a.id}>{a.name} (Online)</option>
 ))}
 </select>
 <button
 onClick={() => autoAssignOrder(order.id)}
 className="px-3 py-2 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
 AI Auto-Assign
 </button>
 </div>
 )}
 </div>
 </div>
 );
 })}

 {state.orders.filter(o => o.status !== "delivered" && o.status !== "failed" && o.status !== "returned").length === 0 && (
 <div className="p-12 text-center rounded-2xl bg-background border border-border text-muted-foreground font-semibold">
 No active orders currently pending dispatch.
 </div>
 )}
 </div>
 </div>

 {/* Agents Status Sidebar */}
 <div className="space-y-4">
 <h3 className="text-sm font-bold text-muted-foreground">Delivery Fleet</h3>
 <div className="space-y-3">
 {state.agents.map(agent => (
 <div key={agent.id} className="p-4 rounded-xl bg-background border border-border space-y-2">
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground text-sm">{agent.name}</span>
 <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${agent.status === "available" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25" : agent.status === "busy" ? "bg-amber-500/10 text-amber-600 border-amber-500/25" : "bg-card text-muted-foreground border-border"}`}>
 {agent.status}
 </span>
 </div>
 <div className="text-[10px] text-muted-foreground space-y-0.5">
 <p>Phone: {agent.phone}</p>
 <p className="font-mono">Coordinates: {agent.lat.toFixed(4)}, {agent.lng.toFixed(4)}</p>
 </div>
 <div className="pt-1.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border">
 <span>Jobs: {agent.deliveriesCompleted}</span>
 <span className="text-emerald-600 font-bold font-mono">Incentive: ₹{agent.incentivesEarned}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB 4: ROUTE OPTIMIZATION MAP */}
 {activeTab === "map" && (
 <div className="space-y-4">
 <p className="text-xs text-muted-foreground">
 Visualizing active agents and customer locations in real time. The dashed lines show assignments. Open a separate window for the Agent Portal and simulate GPS movements to see updates here instantly.
 </p>
 <div className="h-[550px] w-full rounded-2xl overflow-hidden border border-border bg-background">
 <DeliveryMap 
 agents={state.agents} 
 orders={state.orders} 
 warehouses={state.warehouses}
 />
 </div>
 </div>
 )}

 {/* TAB 5: BILLING & SUBSCRIPTION */}
 {activeTab === "billing" && (
 <div className="max-w-4xl mx-auto space-y-8">
 <div className="p-8 rounded-2xl bg-background border border-border relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
 <div className="absolute inset-x-8 top-0 h-px bg-primary/20 pointer-events-none" />

 <div className="space-y-2">
 <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded bg-accent/10 uppercase tracking-wider border border-accent/20">Current Tier</span>
 <h3 className="text-2xl font-black text-foreground">
 LogiTrack <span className="text-accent uppercase">{state.subscription.tier}</span> Plan
 </h3>
 <p className="text-xs text-muted-foreground max-w-md">
 You have processed <strong className="text-foreground font-mono">{state.subscription.orderCountThisMonth} orders</strong> this billing cycle.
 </p>
 </div>

 {state.subscription.tier === "free" ? (
 <button
 onClick={() => {
 if (confirm("Simulate upgrading to the PRO tier? (Free sandbox simulation)")) {
 upgradeSubscription();
 alert("Upgrade successful! You now have unlimited orders.");
 }
 }}
 className="px-6 py-3 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-bold text-sm shadow-lg transition-colors duration-200 flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 <Sparkles className="w-4 h-4 text-accent" />
 Upgrade to PRO (₹2,999/mo)
 </button>
 ) : (
 <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
 <CheckCircle2 className="w-4 h-4" /> Professional Unlimited Active
 </div>
 )}
 </div>

 {/* Pricing Cards Grid */}
 <div className="grid md:grid-cols-2 gap-8">
 {/* Free Plan card */}
 <div className="p-8 rounded-2xl bg-background border border-border flex flex-col justify-between h-96">
 <div>
 <h4 className="text-lg font-bold text-foreground">Starter Free</h4>
 <p className="text-xs text-muted-foreground mt-1">Perfect for evaluation and micro-retailers</p>
 <div className="text-3xl font-black text-foreground mt-4">₹0 <span className="text-xs text-muted-foreground font-semibold">/ month</span></div>
 <ul className="mt-6 space-y-2 text-xs text-muted-foreground font-medium">
 <li>&bull; Up to 50 orders per month</li>
 <li>&bull; Basic manual order assignment</li>
 <li>&bull; Active Leaflet routing maps</li>
 <li>&bull; Standard customer notifications</li>
 </ul>
 </div>
 <button 
 disabled 
 className="w-full py-2.5 rounded-lg bg-card border border-border text-xs font-bold text-muted-foreground"
 >
 {state.subscription.tier === "free" ? "Currently Active" : "Downgrade Unavailable"}
 </button>
 </div>

 {/* Pro Plan card */}
 <div className={`p-8 rounded-2xl border flex flex-col justify-between h-96 transition-all ${state.subscription.tier === "pro" ? "bg-background border-accent shadow-lg" : "bg-background border-border"}`}>
 <div>
 <div className="flex justify-between items-center">
 <h4 className="text-lg font-bold text-foreground">Business Pro</h4>
 <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded uppercase">Highly Suggested</span>
 </div>
 <p className="text-xs text-muted-foreground mt-1">Scale delivery operations seamlessly</p>
 <div className="text-3xl font-black text-foreground mt-4">₹2,999 <span className="text-xs text-muted-foreground font-semibold">/ month</span></div>
 <ul className="mt-6 space-y-2 text-xs text-muted-foreground font-medium">
 <li className="text-muted-foreground font-bold">&bull; Unlimited orders & deliveries</li>
 <li>&bull; AI Smart Auto-Assignment</li>
 <li>&bull; AI Demand Forecasting 7-day model</li>
 <li>&bull; Customer Churn Predictor tags</li>
 <li>&bull; Priority support & route logs</li>
 </ul>
 </div>
 {state.subscription.tier === "pro" ? (
 <button 
 disabled 
 className="w-full py-2.5 rounded-lg bg-accent/10 border border-accent/20 text-xs font-bold text-accent"
 >
 Currently Active
 </button>
 ) : (
 <button
 onClick={upgradeSubscription}
 className="w-full py-2.5 rounded-lg bg-foreground hover:bg-foreground/90 text-background text-xs font-bold transition-colors duration-200 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 Upgrade Now
 </button>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </main>

 {/* --- ADD PRODUCT MODAL DIALOG --- */}
 {isAddModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
 <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
 <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
 <Plus className="w-5 h-5 text-accent" /> Create Product Listing
 </h3>
 <form onSubmit={handleAddProductSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Product Name</label>
 <input
 type="text"
 required
 placeholder="e.g. Fresh Red Strawberries"
 value={formName}
 onChange={(e) => setFormName(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">SKU</label>
 <input
 type="text"
 required
 placeholder="e.g. FRU-STR-09"
 value={formSku}
 onChange={(e) => setFormSku(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium font-mono"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Category</label>
 <select
 value={formCategory}
 onChange={(e) => setFormCategory(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-muted-foreground focus:outline-none font-semibold cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 <option value="Beverages">Beverages</option>
 <option value="Dairy & Alternatives">Dairy</option>
 <option value="Bakery">Bakery</option>
 <option value="Pantry">Pantry</option>
 <option value="Snacks">Snacks</option>
 <option value="Household">Household</option>
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Price (₹)</label>
 <input
 type="number"
 step="0.01"
 required
 min="0"
 placeholder="9.99"
 value={formPrice}
 onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium font-mono"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Stock Quantity</label>
 <input
 type="number"
 required
 min="0"
 placeholder="25"
 value={formStock}
 onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium font-mono"
 />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Image URL (Optional)</label>
 <input
 type="text"
 placeholder="https://example.com/image.jpg"
 value={formImage}
 onChange={(e) => setFormImage(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium"
 />
 </div>

 <div className="flex justify-end gap-3 pt-2">
 <button
 type="button"
 onClick={() => setIsAddModalOpen(false)}
 className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold text-muted-foreground border border-border cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-bold text-xs shadow-sm cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 Create Listing
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* --- EDIT PRODUCT MODAL DIALOG --- */}
 {isEditModalOpen && currentEditProduct && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
 <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
 <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
 <Edit2 className="w-5 h-5 text-accent" /> Edit Product Listing
 </h3>
 <form onSubmit={handleEditProductSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Product Name</label>
 <input
 type="text"
 required
 value={formName}
 onChange={(e) => setFormName(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">SKU</label>
 <input
 type="text"
 required
 value={formSku}
 onChange={(e) => setFormSku(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium font-mono"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Category</label>
 <select
 value={formCategory}
 onChange={(e) => setFormCategory(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-muted-foreground focus:outline-none font-semibold cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 <option value="Beverages">Beverages</option>
 <option value="Dairy & Alternatives">Dairy</option>
 <option value="Bakery">Bakery</option>
 <option value="Pantry">Pantry</option>
 <option value="Snacks">Snacks</option>
 <option value="Household">Household</option>
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Price (₹)</label>
 <input
 type="number"
 step="0.01"
 required
 min="0"
 value={formPrice}
 onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium font-mono"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Stock Quantity</label>
 <input
 type="number"
 required
 min="0"
 value={formStock}
 onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium font-mono"
 />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-xs text-muted-foreground font-semibold">Image URL</label>
 <input
 type="text"
 value={formImage}
 onChange={(e) => setFormImage(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-colors duration-200 font-medium"
 />
 </div>

 <div className="flex justify-end gap-3 pt-2">
 <button
 type="button"
 onClick={() => setIsEditModalOpen(false)}
 className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold text-muted-foreground border border-border cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-bold text-xs shadow-sm cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
 >
 Save Changes
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
