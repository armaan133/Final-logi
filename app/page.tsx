"use client";

import Link from "next/link";
import { useLogiTrack } from "@/lib/state-store";
import { Package, Truck, ShoppingBag, BarChart3, Database, Award } from "lucide-react";

export default function Home() {
  const { resetState, state, toggleSimulationMode } = useLogiTrack();

  const totalOrders = state.orders.length;
  const pendingOrders = state.orders.filter(o => o.status === "placed" || o.status === "confirmed" || o.status === "dispatched" || o.status === "out_for_delivery").length;
  const activeAgents = state.agents.filter(a => a.status !== "offline").length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white overflow-hidden relative font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <Package className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">LogiTrack</span>
              <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold uppercase tracking-wider border border-indigo-500/20">Hackathon v2.0</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSimulationMode}
              className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all border ${state.simulationMode ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/15" : "bg-slate-800 hover:bg-slate-700 text-slate-350 border-slate-750"}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${state.simulationMode ? "bg-white animate-pulse" : "bg-slate-500"}`} />
              Simulated Backend: {state.simulationMode ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => {
                resetState();
                alert("Demo state successfully reset to initial seed values!");
              }}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-950 border border-slate-700 hover:border-slate-600 transition-all text-slate-300"
            >
              <Database className="w-3.5 h-3.5" />
              Reset Demo Data
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent leading-tight">
            Smart Supply Chain & <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Delivery Management</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            LogiTrack integrates all logistics workflows—from product catalogs, demand forecasting, and agent routing to sandbox payments and customer maps.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full mb-12">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-white">{totalOrders}</div>
            <div className="text-xs text-slate-400 mt-1">Total System Orders</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-indigo-400">{pendingOrders}</div>
            <div className="text-xs text-slate-400 mt-1">Active Deliveries</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-emerald-400">{activeAgents}</div>
            <div className="text-xs text-slate-400 mt-1">Online Agents</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
            <div className="text-2xl font-bold text-pink-400">{state.products.filter(p => p.stock < 10).length}</div>
            <div className="text-xs text-slate-400 mt-1">Low Stock Alerts</div>
          </div>
        </div>

        {/* Portals Selector */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
          {/* Business Owner */}
          <Link href="/vendor" className="group h-full">
            <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-6 border border-indigo-500/20">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Business Owner Portal</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Manage inventory, add products, dispatch incoming orders with AI auto-assign, track optimization maps, and review sales forecasting reports.
                </p>
              </div>
              <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                Open Dashboard &rarr;
              </div>
            </div>
          </Link>

          {/* Delivery Agent */}
          <Link href="/agent" className="group h-full">
            <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-6 border border-emerald-500/20">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">Delivery Agent App</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 text-balance">
                  Mobile-responsive list. Update delivery status, simulate live GPS coordinates, track daily completed tasks, and view earned payouts.
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                Open Agent View &rarr;
              </div>
            </div>
          </Link>

          {/* Customer */}
          <Link href="/customer" className="group h-full">
            <div className="h-full p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform mb-6 border border-pink-500/20">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Customer Store</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  Browse organic products, mock checkout with simulated sandbox payment, track orders in real time, watch live driver progress on map, and raise returns.
                </p>
              </div>
              <div className="text-xs font-semibold text-pink-400 flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
                Open Shop &rarr;
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 relative z-10 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>DevFusion Hackathon 2.0 Project Entry</span>
          </div>
          <div>
            <span>Double click portals to test side-by-side on your monitor</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
