"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AutopilotControlTower } from "@/components/AutopilotControlTower";
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
    const revenue = state.orders
      .filter(o => o.status === "delivered" || o.status === "placed" || o.status === "confirmed" || o.status === "dispatched" || o.status === "out_for_delivery")
      .reduce((sum, o) => sum + o.total, 0);

    const ratings = deliveredOrders.map(o => o.deliveryRating).filter((r): r is number => r !== null);
    const avgRating = ratings.length ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 5.0;

    const returnRate = state.orders.length 
      ? parseFloat(((state.orders.filter(o => o.status === "returned").length / state.orders.length) * 100).toFixed(1)) 
      : 0;

    return {
      revenue: parseFloat(revenue.toFixed(2)),
      totalOrders: state.orders.length,
      avgRating,
      returnRate,
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
    <div className="logi-command-page flex min-h-screen text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="logi-command-sidebar w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
            <div className="p-1.5 rounded-lg bg-indigo-500 text-white">
              <Package className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white">LogiTrack Owner</span>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "analytics" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Analytics & AI
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "products" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
            >
              <ShoppingBag className="w-4 h-4" />
              Products & Stock
            </button>
            <button
              onClick={() => setActiveTab("dispatch")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all relative ${activeTab === "dispatch" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
            >
              <Send className="w-4 h-4" />
              Dispatch Center
              {state.orders.filter(o => o.status === "placed").length > 0 && (
                <span className="absolute right-4 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {state.orders.filter(o => o.status === "placed").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "map" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
            >
              <Compass className="w-4 h-4" />
              Optimization Map
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "billing" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}
            >
              <CreditCard className="w-4 h-4" />
              Billing Plan
            </button>
          </nav>
        </div>

        {/* User Footnote */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-200">Owner Portal</p>
              <p className="text-[10px] text-slate-500">Subscription: <span className="uppercase text-indigo-400 font-semibold">{state.subscription.tier}</span></p>
            </div>
            <Link 
              href="/" 
              className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-slate-400"
            >
              Back Home
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="logi-command-main flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="logi-command-topbar h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-xl font-bold tracking-tight text-white capitalize">
            {activeTab === "analytics" ? "Analytics & AI Insights" : activeTab === "map" ? "Route Optimization Map" : activeTab}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                resetState();
              }}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-950 border border-slate-700 hover:border-slate-600 transition-all text-slate-300 shadow-sm"
            >
              Reset Demo Data
            </button>
            <button
              onClick={toggleSimulationMode}
              className={`flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg transition-all border ${state.simulationMode ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/15" : "bg-slate-800 hover:bg-slate-700 text-slate-350 border-slate-750"}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${state.simulationMode ? "bg-white animate-pulse" : "bg-slate-500"}`} />
              Simulator: {state.simulationMode ? "ON" : "OFF"}
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-semibold">Simulated DB Connected</span>
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Daily Revenue</span>
                  <div className="text-2xl font-bold mt-1 text-white">₹{stats.revenue}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                    <TrendingUp className="w-3 h-3" /> +14.2% vs yesterday
                  </div>
                </div>
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Total Orders placed</span>
                  <div className="text-2xl font-bold mt-1 text-indigo-400">{stats.totalOrders}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Includes historical demo seeds</div>
                </div>
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Delivery Experience</span>
                  <div className="text-2xl font-bold mt-1 text-amber-400">{stats.avgRating} / 5.0</div>
                  <div className="text-[10px] text-slate-500 mt-1">Average user rating</div>
                </div>
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Return Rate</span>
                  <div className="text-2xl font-bold mt-1 text-rose-400">{stats.returnRate}%</div>
                  <div className="text-[10px] text-rose-500/80 font-semibold mt-1">Benchmark: &lt;15%</div>
                </div>
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Active Deliveries</span>
                  <div className="text-2xl font-bold mt-1 text-emerald-400">{stats.activeOrdersCount}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Pending dispatch/on route</div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid min-w-0 lg:grid-cols-2 gap-8">
                {/* Chart 1: Revenue Trends */}
                <div className="min-w-0 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-300">Revenue & Order Trends (Last 7 Days)</h3>
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
                <div className="min-w-0 p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-300">Top 5 Products by Revenue</h3>
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
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-white text-base">AI Demand Forecasting</h3>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">7-Day Predictor</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Based on order velocity from the past 30 days, LogiTrack AI forecasts demand for the next 7 days and flags inventory that requires restock.
                  </p>
                  
                  <div className="mt-4 flex-grow overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="pb-3">Product Name</th>
                          <th className="pb-3 text-center">Current Stock</th>
                          <th className="pb-3 text-center">Predicted Demand</th>
                          <th className="pb-3 text-right">Status / Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {forecastingData.map(p => (
                          <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3 font-semibold text-slate-200">{p.name}</td>
                            <td className="py-3 text-center font-mono">{p.stock} units</td>
                            <td className="py-3 text-center font-mono text-indigo-400">{p.predictedDemand7Days} units</td>
                            <td className="py-3 text-right">
                              {p.needsRestock ? (
                                <button
                                  onClick={() => restockProduct(p.id, p.restockQtyNeeded)}
                                  className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold hover:bg-amber-500 hover:text-slate-950 transition-all inline-flex items-center gap-1 text-[10px]"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  Restock +{p.restockQtyNeeded}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-pink-400" />
                        <h3 className="font-bold text-white text-base">Customer Churn Predictor</h3>
                      </div>
                      <span className="text-[10px] font-bold text-pink-400 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">30+ Days Inactive</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mt-2">
                      Customers flagged here have not placed any order in 30+ days. The system suggests immediate re-engagement campaigns.
                    </p>

                    <div className="mt-4 space-y-3">
                      {customerChurnList.map((customer, index) => (
                        <div key={index} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-200">{customer.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${customer.status === "churned" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                {customer.status === "churned" ? "Churned" : "Churn Risk"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Last order: {customer.lastOrderDaysAgo} days ago | {customer.phone}</p>
                          </div>
                          <button
                            onClick={() => alert(`Re-engagement SMS with 15% discount coupon triggered for ${customer.name}!`)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/10"
                          >
                            Send Offer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>Average Churn rate: <strong className="text-white">8.5%</strong></span>
                    <button className="text-indigo-400 font-semibold hover:underline flex items-center">
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
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <input
                  type="text"
                  placeholder="Search products by SKU, name, or category..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="flex-grow max-w-md bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500 font-medium"
                />
                <button
                  onClick={() => {
                    resetForm();
                    setIsAddModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all inline-flex items-center gap-2 shadow-lg shadow-indigo-600/15"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              {/* Products Catalog Table */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold text-xs bg-slate-950">
                      <th className="p-4 pl-6">Product</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4 text-center">Category</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-center">Stock</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded-lg bg-slate-900 border border-slate-800" />
                            <span className="font-bold text-slate-200">{p.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-xs">{p.sku}</td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-400">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-200 font-mono">₹{p.price.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`font-mono text-sm px-2.5 py-1 rounded font-bold ${p.stock < 10 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-900 text-slate-300"}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6 space-x-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-800 inline-flex items-center"
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
                            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-slate-800 inline-flex items-center"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => restockProduct(p.id, 20)}
                            className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-slate-950 font-semibold text-xs border border-indigo-500/20 transition-all"
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
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-300">Inventory Adjustment Logs</h3>
                <div className="overflow-y-auto max-h-60 space-y-2">
                  {state.inventoryHistory.map(log => (
                    <div key={log.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${log.change > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <div>
                          <p className="text-slate-200">
                            {log.productName} <span className={log.change > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{log.change > 0 ? `+${log.change}` : log.change} units</span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-normal">Reason: {log.reason}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
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
                    <h3 className="text-sm font-bold text-slate-300">Pending Dispatch List</h3>
                    <span className="text-xs text-slate-500 font-semibold">{state.orders.filter(o => o.status === "placed").length} Unassigned</span>
                  </div>

                  <div className="space-y-4">
                    {state.orders.filter(o => o.status !== "delivered" && o.status !== "failed" && o.status !== "returned").map(order => {
                      const assignedAgent = state.agents.find(a => a.id === order.agentId);
                      return (
                        <div key={order.id} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-base">Order {order.id}</h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`}>
                                  {order.status.replace(/_/g, " ")}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 font-mono">{new Date(order.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-black text-white font-mono">₹{order.total.toFixed(2)}</span>
                              <p className="text-[10px] text-slate-500 mt-0.5">{order.products.length} unique items</p>
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4 text-xs bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div>
                              <p className="text-slate-500 uppercase tracking-wide font-semibold text-[10px]">Customer Details</p>
                              <p className="font-bold text-slate-200 mt-1">{order.customerName}</p>
                              <p className="text-slate-400 font-mono mt-0.5">{order.customerPhone}</p>
                              <p className="text-slate-400 mt-0.5">{order.address}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase tracking-wide font-semibold text-[10px]">Products Ordered</p>
                              <div className="mt-1 space-y-0.5">
                                {order.products.map((p, idx) => (
                                  <p key={idx} className="text-slate-300 font-medium">
                                    {p.name} <span className="text-indigo-400">x{p.quantity}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Agent Assignment Controls */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                            <div>
                              {assignedAgent ? (
                                <p className="text-xs text-slate-400">
                                  Assigned Agent: <strong className="text-white">{assignedAgent.name}</strong> ({assignedAgent.phone})
                                </p>
                              ) : (
                                <p className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
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
                                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-300 focus:outline-none font-semibold cursor-pointer"
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
                                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/10 transition-all"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                                  AI Auto-Assign
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {state.orders.filter(o => o.status !== "delivered" && o.status !== "failed" && o.status !== "returned").length === 0 && (
                      <div className="p-12 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 font-semibold">
                        No active orders currently pending dispatch.
                      </div>
                    )}
                  </div>
                </div>

                {/* Agents Status Sidebar */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-300">Delivery Fleet</h3>
                  <div className="space-y-3">
                    {state.agents.map(agent => (
                      <div key={agent.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-sm">{agent.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${agent.status === "available" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : agent.status === "busy" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" : "bg-slate-900 text-slate-500 border-slate-850"}`}>
                            {agent.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          <p>Phone: {agent.phone}</p>
                          <p className="font-mono">Coordinates: {agent.lat.toFixed(4)}, {agent.lng.toFixed(4)}</p>
                        </div>
                        <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-900">
                          <span>Jobs: {agent.deliveriesCompleted}</span>
                          <span className="text-emerald-400 font-bold font-mono">Incentive: ₹{agent.incentivesEarned}</span>
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
              <p className="text-xs text-slate-400">
                Visualizing active agents and customer locations in real time. The dashed lines show assignments. Open a separate window for the Agent Portal and simulate GPS movements to see updates here instantly.
              </p>
              <div className="h-[550px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
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
              <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-850 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="absolute inset-x-8 top-0 h-px bg-emerald-200/20 pointer-events-none" />

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 uppercase tracking-wider border border-indigo-500/20">Current Tier</span>
                  <h3 className="text-2xl font-black text-white">
                    LogiTrack <span className="text-indigo-400 uppercase">{state.subscription.tier}</span> Plan
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    You have processed <strong className="text-white font-mono">{state.subscription.orderCountThisMonth} orders</strong> this billing cycle.
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
                    className="px-6 py-3 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    Upgrade to PRO (₹2,999/mo)
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Professional Unlimited Active
                  </div>
                )}
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Free Plan card */}
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between h-96">
                  <div>
                    <h4 className="text-lg font-bold text-slate-200">Starter Free</h4>
                    <p className="text-xs text-slate-500 mt-1">Perfect for evaluation and micro-retailers</p>
                    <div className="text-3xl font-black text-white mt-4">₹0 <span className="text-xs text-slate-500 font-semibold">/ month</span></div>
                    <ul className="mt-6 space-y-2 text-xs text-slate-400 font-medium">
                      <li>&bull; Up to 50 orders per month</li>
                      <li>&bull; Basic manual order assignment</li>
                      <li>&bull; Active Leaflet routing maps</li>
                      <li>&bull; Standard customer notifications</li>
                    </ul>
                  </div>
                  <button 
                    disabled 
                    className="w-full py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400"
                  >
                    {state.subscription.tier === "free" ? "Currently Active" : "Downgrade Unavailable"}
                  </button>
                </div>

                {/* Pro Plan card */}
                <div className={`p-8 rounded-2xl border flex flex-col justify-between h-96 transition-all ${state.subscription.tier === "pro" ? "bg-slate-950 border-indigo-500 shadow-2xl shadow-indigo-500/5" : "bg-slate-950 border-slate-800"}`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-slate-200">Business Pro</h4>
                      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">Highly Suggested</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Scale delivery operations seamlessly</p>
                    <div className="text-3xl font-black text-white mt-4">₹2,999 <span className="text-xs text-slate-500 font-semibold">/ month</span></div>
                    <ul className="mt-6 space-y-2 text-xs text-slate-400 font-medium">
                      <li className="text-slate-300 font-bold">&bull; Unlimited orders & deliveries</li>
                      <li>&bull; AI Smart Auto-Assignment</li>
                      <li>&bull; AI Demand Forecasting 7-day model</li>
                      <li>&bull; Customer Churn Predictor tags</li>
                      <li>&bull; Priority support & route logs</li>
                    </ul>
                  </div>
                  {state.subscription.tier === "pro" ? (
                    <button 
                      disabled 
                      className="w-full py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400"
                    >
                      Currently Active
                    </button>
                  ) : (
                    <button
                      onClick={upgradeSubscription}
                      className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/15"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
              <Plus className="w-5 h-5 text-indigo-500" /> Create Product Listing
            </h3>
            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Red Strawberries"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">SKU</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FRU-STR-09"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-300 focus:outline-none font-semibold cursor-pointer"
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
                  <label className="text-xs text-slate-400 font-semibold">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="9.99"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="25"
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/10"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
              <Edit2 className="w-5 h-5 text-indigo-500" /> Edit Product Listing
            </h3>
            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Product Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">SKU</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-300 focus:outline-none font-semibold cursor-pointer"
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
                  <label className="text-xs text-slate-400 font-semibold">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Image URL</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/10"
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
