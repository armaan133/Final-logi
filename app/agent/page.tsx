"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useLogiTrack, Order } from "@/lib/state-store";
import { generateAgentNextAction } from "@/lib/autopilot-engine";

const statusLabel: Record<string, string> = {
  available: "Available",
  busy: "Busy",
  offline: "Offline",
};

export default function AgentDashboard() {
  const {
    state,
    updateOrderStatus,
    updateAgentLocation,
    updateAgentStatus,
    simulatePayout,
  } = useLogiTrack();

  const [selectedAgentId, setSelectedAgentId] = useState<string>("a1");
  const [isSimulatingRoute, setIsSimulatingRoute] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState<string | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentAgent =
    state.agents.find((a) => a.id === selectedAgentId) || state.agents[0];

  const assignedOrders = state.orders.filter(
    (o) =>
      o.agentId === selectedAgentId &&
      o.status !== "delivered" &&
      o.status !== "failed" &&
      o.status !== "returned"
  );

  const completedOrdersCount = state.orders.filter(
    (o) => o.agentId === selectedAgentId && o.status === "delivered"
  ).length;

  const currentActiveOrder = assignedOrders[0];

  const nextAction = useMemo(
    () => generateAgentNextAction(state, selectedAgentId),
    [state, selectedAgentId]
  );

  const toggleOnlineOffline = () => {
    const nextStatus =
      currentAgent.status === "offline" ? "available" : "offline";
    updateAgentStatus(currentAgent.id, nextStatus);
  };

  const handleStatusTransition = (
    orderId: string,
    _currentStatus: Order["status"],
    action: "dispatch" | "out" | "deliver" | "fail" | "return"
  ) => {
    let nextStatus: Order["status"] = _currentStatus;
    if (action === "dispatch") nextStatus = "dispatched";
    else if (action === "out") nextStatus = "out_for_delivery";
    else if (action === "deliver") nextStatus = "delivered";
    else if (action === "fail") nextStatus = "failed";
    else if (action === "return") nextStatus = "returned";

    updateOrderStatus(orderId, nextStatus);

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

  const startRouteSimulation = () => {
    if (!currentActiveOrder) return;
    setIsSimulatingRoute(true);
  };

  const stopRouteSimulation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulatingRoute(false);
  };

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
          const nextLat = currLat + latDiff * 0.15;
          const nextLng = currLng + lngDiff * 0.15;
          updateAgentLocationRef.current(currentAgent.id, nextLat, nextLng);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isSimulatingRoute, currentActiveOrder, currentAgent]);

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  // Distance estimate in km, rough great-circle
  const distanceKm = useMemo(() => {
    if (!currentActiveOrder) return null;
    const dLat = (currentActiveOrder.lat - currentAgent.lat) * 111;
    const dLng =
      (currentActiveOrder.lng - currentAgent.lng) *
      111 *
      Math.cos((currentAgent.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }, [currentActiveOrder, currentAgent]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              LogiTrack
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Driver
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">
              <span className="sr-only">Choose agent</span>
              <select
                value={selectedAgentId}
                onChange={(e) => {
                  setSelectedAgentId(e.target.value);
                  stopRouteSimulation();
                }}
                className="bg-transparent text-sm font-medium text-foreground focus:outline-none focus-visible:underline"
              >
                {state.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name.split(" ")[0]}
                  </option>
                ))}
              </select>
            </label>
            <Link
              href="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Agent identity + shift toggle */}
        <section className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              On shift
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {currentAgent.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusLabel[currentAgent.status]} ·{" "}
              <span className="tabular-nums">{assignedOrders.length}</span>{" "}
              {assignedOrders.length === 1 ? "active job" : "active jobs"} ·{" "}
              <span className="tabular-nums">{completedOrdersCount}</span> delivered today
            </p>
          </div>

          <button
            type="button"
            onClick={toggleOnlineOffline}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {currentAgent.status === "offline" ? "Go online →" : "Go offline →"}
          </button>
        </section>

        {/* Single editorial document with all working blocks divided by hairlines */}
        <section className="mt-10 border border-border bg-card">
          {/* Copilot — next action */}
          <div className="p-6 sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Copilot
            </p>
            <h2 className="mt-1 text-balance text-xl font-semibold tracking-tight text-foreground">
              {nextAction.title}
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {nextAction.summary}
            </p>

            {nextAction.checklist.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-1.5">
                {nextAction.checklist.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-foreground">
                    <span className="text-muted-foreground">— </span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <p className="text-xs tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{nextAction.confidence}%</span>
                <span> confidence</span>
              </p>
              <button
                type="button"
                onClick={runNextAction}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
              >
                {nextAction.actionLabel}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </div>

          {/* Active order */}
          <div className="border-t border-border p-6 sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Active delivery
            </p>

            {currentActiveOrder ? (
              <>
                <h2 className="mt-1 text-balance text-xl font-semibold tracking-tight text-foreground">
                  {currentActiveOrder.customerName}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {currentActiveOrder.address}
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Order</dt>
                    <dd className="mt-1 font-mono text-sm text-foreground">
                      {currentActiveOrder.id.replace("ord-", "#")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd className="mt-1 text-sm capitalize text-foreground">
                      {currentActiveOrder.status.replace(/_/g, " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Value</dt>
                    <dd className="mt-1 font-mono text-sm text-foreground">
                      ₹{currentActiveOrder.total.toFixed(2)}
                    </dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs text-muted-foreground">Customer</dt>
                    <dd className="mt-1 font-mono text-sm text-foreground">
                      {currentActiveOrder.customerPhone}
                    </dd>
                  </div>
                  {distanceKm !== null ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Remaining</dt>
                      <dd className="mt-1 font-mono text-sm text-foreground tabular-nums">
                        {distanceKm.toFixed(2)} km
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4">
                  {currentActiveOrder.status === "confirmed" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusTransition(
                          currentActiveOrder.id,
                          currentActiveOrder.status,
                          "dispatch"
                        )
                      }
                      className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      Start transit →
                    </button>
                  ) : null}

                  {currentActiveOrder.status === "dispatched" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusTransition(
                          currentActiveOrder.id,
                          currentActiveOrder.status,
                          "out"
                        )
                      }
                      className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      Mark out for delivery →
                    </button>
                  ) : null}

                  {currentActiveOrder.status === "out_for_delivery" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusTransition(
                            currentActiveOrder.id,
                            currentActiveOrder.status,
                            "deliver"
                          )
                        }
                        className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        Mark delivered →
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusTransition(
                            currentActiveOrder.id,
                            currentActiveOrder.status,
                            "fail"
                          )
                        }
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        Mark failed
                      </button>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={
                      isSimulatingRoute ? stopRouteSimulation : startRouteSimulation
                    }
                    disabled={currentActiveOrder.status !== "out_for_delivery"}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted-foreground disabled:hover:no-underline focus-visible:outline-none focus-visible:underline"
                  >
                    {isSimulatingRoute ? "Pause auto-drive" : "Auto-drive to customer"}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                No deliveries assigned. New jobs from dispatch appear here.
              </p>
            )}
          </div>

          {/* Earnings */}
          <div className="border-t border-border p-6 sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Earnings
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4">
              <div>
                <dt className="text-xs text-muted-foreground">Completed today</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {completedOrdersCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Incentives earned</dt>
                <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                  ₹{currentAgent.incentivesEarned}
                </dd>
              </div>
            </dl>

            <p className="mt-4 max-w-prose text-xs leading-relaxed text-muted-foreground">
              Base pay is ₹150 / hour. Incentives are ₹80 per delivery and update
              instantly. Simulated payouts settle in 1–2 business days.
            </p>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
              {payoutNotice ? (
                <p className="text-xs text-foreground">{payoutNotice}</p>
              ) : (
                <span aria-hidden />
              )}
              <button
                type="button"
                onClick={() => {
                  simulatePayout(currentAgent.id);
                  setPayoutNotice("Payout requested. Settles in 1–2 days.");
                  window.setTimeout(() => setPayoutNotice(null), 3000);
                }}
                disabled={currentAgent.incentivesEarned === 0}
                className="text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:no-underline focus-visible:outline-none focus-visible:underline"
              >
                Request payout →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
