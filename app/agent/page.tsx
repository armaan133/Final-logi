"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLogiTrack, Order } from "@/lib/state-store";
import { generateAgentNextAction } from "@/lib/autopilot-engine";
import { 
  Truck, MapPin, Navigation, DollarSign,
  Phone, Smartphone, ClipboardList, AlertCircle, RefreshCcw
} from "lucide-react";
import Link from "next/link";

export default function AgentDashboard() {
  const { state, updateOrderStatus, updateAgentLocation, updateAgentStatus, simulatePayout } = useLogiTrack();

  const [selectedAgentId, setSelectedAgentId] = useState<string>("a1");
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get active agent details
  const currentAgent = state.agents.find(a => a.id === selectedAgentId) || state.agents[0];

  // Get orders assigned to this agent
  const assignedOrders = state.orders.filter(o => 
    o.agentId === selectedAgentId && 
    o.status !== "delivered" && 
    o.status !== "failed" && 
    o.status !== "returned"
  );

  // Completed orders for this agent (current session)
  const completedOrdersCount = state.orders.filter(o => 
    o.agentId === selectedAgentId && o.status === "delivered"
  ).length;

  const currentActiveOrder = assignedOrders[0];
  const nextAction = useMemo(
    () => generateAgentNextAction(state, selectedAgentId),
    [state, selectedAgentId]
  );

  // Handle agent status toggle
  const toggleOnlineOffline = () => {
    const nextStatus = currentAgent.status === "offline" ? "available" : "offline";
    updateAgentStatus(currentAgent.id, nextStatus);
  };

  // Status transitions helper
  const handleStatusTransition = (orderId: string, currentStatus: Order["status"], action: "dispatch" | "out" | "deliver" | "fail" | "return") => {
    let nextStatus: Order["status"] = currentStatus;
    if (action === "dispatch") nextStatus = "dispatched";
    else if (action === "out") nextStatus = "out_for_delivery";
    else if (action === "deliver") nextStatus = "delivered";
    else if (action === "fail") nextStatus = "failed";
    else if (action === "return") nextStatus = "returned";

    updateOrderStatus(orderId, nextStatus);
    
    // Stop simulation if job ends
    if (action === "deliver" || action === "fail" || action === "return") {
      stopRouteSimulation();
    }
  };

  const runNextAction = () => {
    if (currentAgent.status === "offline") {
      toggleOnlineOffline();
      return;
    }

    if (!currentActiveOrder) return;

    if (currentActiveOrder.status === "confirmed") {
      handleStatusTransition(currentActiveOrder.id, currentActiveOrder.status, "dispatch");
      return;
    }

    if (currentActiveOrder.status === "dispatched") {
      handleStatusTransition(currentActiveOrder.id, currentActiveOrder.status, "out");
      return;
    }

    if (currentActiveOrder.status === "out_for_delivery") {
      startRouteSimulation();
    }
  };

  // Manual GPS sliders
  const handleLattitudeChange = (val: number) => {
    updateAgentLocation(currentAgent.id, val, currentAgent.lng);
  };

  const handleLongitudeChange = (val: number) => {
    updateAgentLocation(currentAgent.id, currentAgent.lat, val);
  };

  // GPS Route Auto-Simulation (Moves Agent step-by-step toward active customer)
  const startRouteSimulation = () => {
    if (!currentActiveOrder) return;
    setIsSimulatingRoute(true);

    const destLat = currentActiveOrder.lat;
    const destLng = currentActiveOrder.lng;

    simulationIntervalRef.current = setInterval(() => {
      // Move 10% of the distance each step
      updateAgentLocation(currentAgent.id, (prevLat) => {
        const diffLat = destLat - prevLat;
        const stepLat = prevLat + diffLat * 0.15;
        
        // Use a functional state update trick or read from current agent
        // Since we are inside an interval context, simple updates based on state are clean:
        return Math.abs(diffLat) < 0.0001 ? destLat : stepLat;
      }, (prevLng) => {
        const diffLng = destLng - prevLng;
        const stepLng = prevLng + diffLng * 0.15;
        return Math.abs(diffLng) < 0.0001 ? destLng : stepLng;
      });
    }, 1500);
  };

  const stopRouteSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulatingRoute(false);
  };

  // Handle ref for simulation coordinates updates since state is synced
  const updateAgentLocationRef = useRef(updateAgentLocation);

  useEffect(() => {
    updateAgentLocationRef.current = updateAgentLocation;
  }, [updateAgentLocation]);

  useEffect(() => {
    if (isSimulatingRoute && currentActiveOrder && currentAgent) {
      const destLat = currentActiveOrder.lat;
      const destLng = currentActiveOrder.lng;
      
      const interval = setInterval(() => {
        const currLat = currentAgent.lat;
        const currLng = currentAgent.lng;
        
        const latDiff = destLat - currLat;
        const lngDiff = destLng - currLng;
        
        if (Math.abs(latDiff) < 0.001 && Math.abs(lngDiff) < 0.001) {
          updateAgentLocationRef.current(currentAgent.id, destLat, destLng);
          clearInterval(interval);
          setIsSimulatingRoute(false);
        } else {
          // step 15% closer
          const nextLat = currLat + latDiff * 0.15;
          const nextLng = currLng + lngDiff * 0.15;
          updateAgentLocationRef.current(currentAgent.id, nextLat, nextLng);
        }
      }, 1500);
      
      return () => clearInterval(interval);
    }
  }, [isSimulatingRoute, currentActiveOrder, currentAgent]);

  // Clean intervals on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  return (
    <div className="logi-mobile-stage logi-agent-stage min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative">
      <div className="logi-stage-grid" />

      {/* Field workspace container */}
      <div className="logi-phone-shell logi-agent-shell w-full max-w-md bg-slate-900 border border-slate-800 rounded-[28px] shadow-2xl flex flex-col overflow-hidden relative" style={{ minHeight: "780px" }}>
        
        <div className="logi-mobile-strip h-10 flex items-center justify-between px-4 select-none border-b border-slate-900/60 relative shrink-0">
          <span className="text-[10px] font-black uppercase tracking-[0.18em]">Field mode</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">{assignedOrders.length} active jobs</span>
          </div>
        </div>

        {/* App Header */}
        <header className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black">
              <Truck className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-200">LogiTrack Driver</span>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={selectedAgentId}
              onChange={(e) => {
                setSelectedAgentId(e.target.value);
                stopRouteSimulation();
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg text-[10px] px-2.5 py-1.5 text-slate-300 font-bold focus:outline-none cursor-pointer"
            >
              {state.agents.map(a => (
                <option key={a.id} value={a.id}>{a.name.split(" ")[0]} ({a.status})</option>
              ))}
            </select>
            <Link 
              href="/"
              className="text-[9px] bg-slate-800 hover:bg-slate-750 px-2 py-1.5 rounded border border-slate-700 font-bold"
            >
              Exit
            </Link>
          </div>
        </header>

        {/* Dashboard Content Panel */}
        <div className="logi-mobile-content flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Agent Status banner */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${currentAgent.status === "offline" ? "bg-slate-600" : currentAgent.status === "busy" ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              <div>
                <h4 className="font-bold text-xs text-slate-200">{currentAgent.name}</h4>
                <p className="text-[10px] text-slate-500 font-medium capitalize">Status: {currentAgent.status}</p>
              </div>
            </div>
            
            <button
              onClick={toggleOnlineOffline}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${currentAgent.status === "offline" ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500" : "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20"}`}
            >
              {currentAgent.status === "offline" ? "Go Online" : "Go Offline"}
            </button>
          </div>

          <div className="agent-action-card">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                Agent Copilot
              </p>
              <h3>{nextAction.title}</h3>
              <p>{nextAction.summary}</p>
            </div>
            <div className="agent-action-confidence">
              <span>{nextAction.confidence}%</span>
              <small>confidence</small>
            </div>
            <ul>
              {nextAction.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button type="button" onClick={runNextAction}>
              {nextAction.actionLabel}
            </button>
          </div>

          {/* Active Order Card */}
          {currentActiveOrder ? (
            <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-4 relative overflow-hidden">
              <div className="absolute inset-x-5 top-0 h-px bg-emerald-200/25 pointer-events-none" />
              
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                  Active Delivery
                </span>
                <span className="text-sm font-black text-white font-mono">₹{currentActiveOrder.total.toFixed(2)}</span>
              </div>

              <div>
                <h3 className="font-bold text-slate-200 text-sm">Order {currentActiveOrder.id}</h3>
                <div className="flex items-center gap-1.5 mt-2 text-slate-400 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <p className="truncate leading-relaxed font-semibold">{currentActiveOrder.address}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-slate-400 text-xs">
                  <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <p className="font-mono">{currentActiveOrder.customerPhone} ({currentActiveOrder.customerName})</p>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {currentActiveOrder.status === "confirmed" && (
                    <button
                      onClick={() => handleStatusTransition(currentActiveOrder.id, currentActiveOrder.status, "dispatch")}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/10"
                    >
                      Start Transit
                    </button>
                  )}
                  {currentActiveOrder.status === "dispatched" && (
                    <button
                      onClick={() => handleStatusTransition(currentActiveOrder.id, currentActiveOrder.status, "out")}
                      className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/10"
                    >
                      Out for Delivery
                    </button>
                  )}
                  {currentActiveOrder.status === "out_for_delivery" && (
                    <>
                      <button
                        onClick={() => handleStatusTransition(currentActiveOrder.id, currentActiveOrder.status, "deliver")}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/10"
                      >
                        Delivered
                      </button>
                      <button
                        onClick={() => handleStatusTransition(currentActiveOrder.id, currentActiveOrder.status, "fail")}
                        className="py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs transition-all"
                      >
                        Failed
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-850 text-slate-500 font-bold text-xs">
              <ClipboardList className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              No active delivery assigned to you.
            </div>
          )}

          {/* GPS Simulation Controls */}
          {currentActiveOrder && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-xs text-slate-300">GPS Tracker Simulation</h4>
                </div>
                <button
                  onClick={isSimulatingRoute ? stopRouteSimulation : startRouteSimulation}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 border ${isSimulatingRoute ? "bg-amber-500/10 text-amber-400 border-amber-500/25" : "bg-emerald-600 text-white border-emerald-500"}`}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${isSimulatingRoute ? "animate-spin" : ""}`} />
                  {isSimulatingRoute ? "Stop Auto-Drive" : "Auto-Drive to Customer"}
                </button>
              </div>

              {/* Coordinates status */}
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl space-y-1 font-mono text-[10px] text-slate-400">
                <p className="flex justify-between">
                  <span>Agent Lat:</span> <strong className="text-white font-bold">{currentAgent.lat.toFixed(5)}</strong>
                </p>
                <p className="flex justify-between">
                  <span>Agent Lng:</span> <strong className="text-white font-bold">{currentAgent.lng.toFixed(5)}</strong>
                </p>
                <p className="flex justify-between border-t border-slate-955 pt-1 mt-1">
                  <span>Dest Lat:</span> <strong className="text-slate-300 font-semibold">{currentActiveOrder.lat.toFixed(5)}</strong>
                </p>
                <p className="flex justify-between font-bold">
                  <span>Dest Lng:</span> <strong className="text-slate-300 font-semibold">{currentActiveOrder.lng.toFixed(5)}</strong>
                </p>
              </div>

              {/* Manual adjustment sliders */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1 text-[10px] font-bold text-slate-400">
                  <div className="flex justify-between">
                    <span>Adjust Latitude</span>
                    <span className="font-mono text-white">{currentAgent.lat.toFixed(4)}</span>
                  </div>
                  <input
                    type="range"
                    min="18.45"
                    max="18.60"
                    step="0.001"
                    value={currentAgent.lat}
                    onChange={(e) => handleLattitudeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
                <div className="space-y-1 text-[10px] font-bold text-slate-400">
                  <div className="flex justify-between">
                    <span>Adjust Longitude</span>
                    <span className="font-mono text-white">{currentAgent.lng.toFixed(4)}</span>
                  </div>
                  <input
                    type="range"
                    min="73.75"
                    max="73.95"
                    step="0.001"
                    value={currentAgent.lng}
                    onChange={(e) => handleLongitudeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Earnings Panel */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-xs text-slate-300">Earnings Tracker</h4>
              </div>
              <button
                onClick={() => {
                  simulatePayout(currentAgent.id);
                  alert("Payout request submitted successfully! Your bank transfer is pending processing.");
                }}
                disabled={currentAgent.incentivesEarned === 0}
                className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold hover:bg-slate-800 active:bg-slate-950 transition-all disabled:opacity-50"
              >
                Request Payout
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-500 font-semibold block">Completed (Today)</span>
                <span className="text-xl font-black text-white font-mono">{completedOrdersCount} orders</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-500 font-semibold block">Incentives Earned</span>
                <span className="text-xl font-black text-emerald-400 font-mono">₹{currentAgent.incentivesEarned}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-lg text-[9px] text-slate-500 leading-normal flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
              <span>Base pay: ₹150.00 per hour. Incentives (₹80.00/order) are updated instantly. Simulated payouts are credited in 1-2 business days.</span>
            </div>
          </div>

        </div>

        <div className="h-3 shrink-0 border-t border-white/[0.06] bg-black/20" />
      </div>
    </div>
  );
}
