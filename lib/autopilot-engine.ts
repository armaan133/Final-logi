import type { Agent, LogiTrackState, Order, Product } from "@/lib/state-store";

export type AutopilotInsightType =
  | "dispatch"
  | "inventory"
  | "customer"
  | "finance"
  | "exception";

export type AutopilotUrgency = "low" | "medium" | "high";

export interface AgentDispatchScore {
  agent: Agent;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  reasons: string[];
}

export interface AutopilotAction {
  kind: "assign" | "restock" | "review";
  label: string;
  orderId?: string;
  productId?: string;
  quantity?: number;
  target?: "dispatch" | "products" | "billing" | "customer";
}

export interface AutopilotInsight {
  id: string;
  type: AutopilotInsightType;
  title: string;
  summary: string;
  recommendation: string;
  confidence: number;
  urgency: AutopilotUrgency;
  evidence: string[];
  action?: AutopilotAction;
  scores?: AgentDispatchScore[];
}

export interface DemandForecast {
  product: Product;
  unitsSold30Days: number;
  predictedDemand7Days: number;
  restockQtyNeeded: number;
  needsRestock: boolean;
}

export interface AgentNextAction {
  title: string;
  summary: string;
  confidence: number;
  checklist: string[];
  actionLabel: string;
}

export interface CustomerPromise {
  title: string;
  summary: string;
  etaRange: string;
  confidence: number;
  hubName: string;
  stockSignal: "ready" | "risk" | "empty";
  reasons: string[];
}

const activeStatuses: Order["status"][] = [
  "placed",
  "confirmed",
  "dispatched",
  "out_for_delivery",
];

export const autopilotGraphNodes = [
  "Signal intake",
  "Demand forecast",
  "Dispatch planner",
  "Customer promise",
  "Action audit",
];

export function getDistanceKm(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(endLat - startLat);
  const dLng = toRad(endLng - startLng);
  const lat1 = toRad(startLat);
  const lat2 = toRad(endLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function scoreAgentsForOrder(
  state: LogiTrackState,
  order: Order
): AgentDispatchScore[] {
  return state.agents
    .filter((agent) => agent.status !== "offline")
    .map((agent) => {
      const distanceKm = getDistanceKm(agent.lat, agent.lng, order.lat, order.lng);
      const activeLoad = state.orders.filter(
        (candidate) =>
          candidate.agentId === agent.id &&
          activeStatuses.includes(candidate.status)
      ).length;
      const distanceScore = Math.max(0, 42 - distanceKm * 5);
      const availabilityScore = agent.status === "available" ? 24 : 10;
      const loadScore = Math.max(0, 18 - activeLoad * 7);
      const experienceScore = Math.min(12, agent.deliveriesCompleted / 18);
      const score = Math.round(
        distanceScore + availabilityScore + loadScore + experienceScore
      );
      const etaMinutes = Math.max(
        8,
        Math.round(distanceKm * 5 + activeLoad * 9 + (agent.status === "busy" ? 12 : 4))
      );
      const reasons = [
        `${distanceKm.toFixed(1)} km from drop point`,
        `${activeLoad} active job${activeLoad === 1 ? "" : "s"}`,
        `${agent.deliveriesCompleted} completed deliveries`,
      ];

      if (agent.status === "available") {
        reasons.push("available now");
      }

      return {
        agent,
        distanceKm,
        etaMinutes,
        score: Math.min(99, Math.max(1, score)),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function generateDemandForecasts(
  state: LogiTrackState
): DemandForecast[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return state.products
    .map((product) => {
      const unitsSold30Days = state.orders.reduce((sum, order) => {
        const isRecent = new Date(order.timestamp).getTime() >= cutoff;
        if (!isRecent || order.status === "returned") return sum;

        const line = order.products.find((item) => item.id === product.id);
        return sum + (line?.quantity ?? 0);
      }, 0);
      const predictedDemand7Days = Math.ceil((unitsSold30Days / 30) * 7);
      const restockQtyNeeded = Math.max(
        0,
        Math.ceil(predictedDemand7Days * 1.35 - product.stock)
      );

      return {
        product,
        unitsSold30Days,
        predictedDemand7Days,
        restockQtyNeeded,
        needsRestock: product.stock < Math.max(7, predictedDemand7Days),
      };
    })
    .sort((a, b) => {
      if (a.needsRestock !== b.needsRestock) {
        return a.needsRestock ? -1 : 1;
      }

      return b.predictedDemand7Days - b.product.stock - (a.predictedDemand7Days - a.product.stock);
    });
}

export function generateAutopilotInsights(
  state: LogiTrackState
): AutopilotInsight[] {
  const insights: AutopilotInsight[] = [];
  const unassignedOrder = state.orders.find(
    (order) => order.status === "placed" && !order.agentId
  );

  if (unassignedOrder) {
    const scores = scoreAgentsForOrder(state, unassignedOrder).slice(0, 3);
    const top = scores[0];

    insights.push({
      id: `dispatch-${unassignedOrder.id}`,
      type: "dispatch",
      title: "Dispatch Planner found an unassigned order",
      summary: top
        ? `${top.agent.name} is the best match with ${top.score}% confidence and ${top.etaMinutes} min ETA.`
        : "No online agent can take this order right now.",
      recommendation: top
        ? `Auto-assign order ${unassignedOrder.id} to ${top.agent.name}.`
        : "Move one agent online before assigning.",
      confidence: top?.score ?? 42,
      urgency: "high",
      evidence: top
        ? top.reasons
        : ["order is placed", "no online fleet capacity", "customer is waiting"],
      action: top
        ? {
            kind: "assign",
            label: "Run auto-assign",
            orderId: unassignedOrder.id,
            target: "dispatch",
          }
        : { kind: "review", label: "Review fleet", target: "dispatch" },
      scores,
    });
  }

  const forecast = generateDemandForecasts(state).find(
    (item) => item.needsRestock || item.product.stock < 10
  );

  if (forecast) {
    insights.push({
      id: `inventory-${forecast.product.id}`,
      type: "inventory",
      title: "Inventory Agent predicts a stockout risk",
      summary: `${forecast.product.name} has ${forecast.product.stock} units against ${forecast.predictedDemand7Days} expected units next week.`,
      recommendation: `Restock ${Math.max(12, forecast.restockQtyNeeded)} units before the next demand spike.`,
      confidence: forecast.needsRestock ? 88 : 72,
      urgency: forecast.needsRestock ? "high" : "medium",
      evidence: [
        `${forecast.unitsSold30Days} units sold in 30 days`,
        `${forecast.predictedDemand7Days} unit 7-day forecast`,
        `${forecast.product.stock} units currently available`,
      ],
      action: {
        kind: "restock",
        label: `Restock +${Math.max(12, forecast.restockQtyNeeded)}`,
        productId: forecast.product.id,
        quantity: Math.max(12, forecast.restockQtyNeeded),
        target: "products",
      },
    });
  }

  const customerLastOrders = new Map<string, number>();
  state.orders.forEach((order) => {
    const time = new Date(order.timestamp).getTime();
    const previous = customerLastOrders.get(order.customerName) ?? 0;
    if (time > previous) customerLastOrders.set(order.customerName, time);
  });
  const churnCandidate = Array.from(customerLastOrders.entries())
    .map(([name, lastOrderTime]) => ({
      name,
      days: Math.floor((Date.now() - lastOrderTime) / (24 * 60 * 60 * 1000)),
    }))
    .filter((customer) => customer.days >= 30)
    .sort((a, b) => b.days - a.days)[0];

  if (churnCandidate) {
    insights.push({
      id: `customer-${churnCandidate.name}`,
      type: "customer",
      title: "Customer Agent found a reactivation opportunity",
      summary: `${churnCandidate.name} has been inactive for ${churnCandidate.days} days.`,
      recommendation: "Send a targeted recovery offer tied to their last bought category.",
      confidence: 79,
      urgency: "medium",
      evidence: [
        "30+ day inactivity threshold crossed",
        "customer has previous paid orders",
        "offer can be sent without changing dispatch flow",
      ],
      action: { kind: "review", label: "Review customer", target: "customer" },
    });
  }

  const activeOrders = state.orders.filter((order) =>
    activeStatuses.includes(order.status)
  );
  const availableAgents = state.agents.filter(
    (agent) => agent.status === "available"
  );

  if (activeOrders.length > Math.max(2, availableAgents.length * 1.4)) {
    insights.push({
      id: "exception-fleet-pressure",
      type: "exception",
      title: "Exception Agent sees fleet pressure",
      summary: `${activeOrders.length} active orders are competing for ${availableAgents.length} available agents.`,
      recommendation: "Switch to crisis mode: prioritize nearby orders and pause long-distance promises.",
      confidence: 84,
      urgency: "high",
      evidence: [
        `${activeOrders.length} active orders`,
        `${availableAgents.length} available agents`,
        "auto-assignment should favor ETA over fairness until backlog clears",
      ],
      action: { kind: "review", label: "Open dispatch", target: "dispatch" },
    });
  }

  const returnRate =
    state.orders.length === 0
      ? 0
      : Math.round(
          (state.orders.filter((order) => order.returnRequested).length /
            state.orders.length) *
            100
        );

  if (returnRate >= 10) {
    insights.push({
      id: "exception-return-rate",
      type: "exception",
      title: "Returns Agent detects quality leakage",
      summary: `Return rate is ${returnRate}%, above the safe operating threshold.`,
      recommendation: "Inspect returned product categories before scaling more orders.",
      confidence: 76,
      urgency: "medium",
      evidence: [
        `${returnRate}% return rate`,
        "refund flow is active",
        "ratings and return reasons should be reviewed together",
      ],
      action: { kind: "review", label: "Review orders", target: "dispatch" },
    });
  }

  if (state.subscription.tier === "free" && state.subscription.orderCountThisMonth >= 35) {
    insights.push({
      id: "finance-upgrade",
      type: "finance",
      title: "Finance Agent predicts plan friction",
      summary: `${state.subscription.orderCountThisMonth} of 50 free monthly orders are already used.`,
      recommendation: "Show upgrade impact before the order cap blocks dispatch growth.",
      confidence: 82,
      urgency: "low",
      evidence: [
        "free plan caps at 50 orders",
        "dispatch automation increases order throughput",
        "upgrade flow is already wired",
      ],
      action: { kind: "review", label: "Open billing", target: "billing" },
    });
  }

  return insights.slice(0, 5);
}

export function generateAgentNextAction(
  state: LogiTrackState,
  agentId: string
): AgentNextAction {
  const agent = state.agents.find((candidate) => candidate.id === agentId);
  const activeOrder = state.orders.find(
    (order) =>
      order.agentId === agentId &&
      activeStatuses.includes(order.status) &&
      order.status !== "placed"
  );

  if (!agent) {
    return {
      title: "No agent selected",
      summary: "Choose a field agent to generate next-best-action guidance.",
      confidence: 0,
      checklist: ["Select an agent", "Review active jobs"],
      actionLabel: "Select agent",
    };
  }

  if (agent.status === "offline") {
    return {
      title: "Go online to receive jobs",
      summary: "The fleet planner will skip this agent until they are available.",
      confidence: 91,
      checklist: ["Go online", "Confirm current GPS", "Wait for assignment"],
      actionLabel: "Go online",
    };
  }

  if (!activeOrder) {
    return {
      title: "Stand by near assigned hub",
      summary: "No active delivery is assigned. Staying near the hub improves future matching.",
      confidence: 74,
      checklist: [
        "Keep status available",
        "Confirm payout balance",
        "Hold near nearest warehouse",
      ],
      actionLabel: "Stand by",
    };
  }

  if (activeOrder.status === "confirmed") {
    return {
      title: "Start transit",
      summary: `Order ${activeOrder.id} is confirmed and ready for pickup.`,
      confidence: 88,
      checklist: [
        "Verify customer phone",
        "Start transit",
        "Let customer tracking activate",
      ],
      actionLabel: "Start transit",
    };
  }

  if (activeOrder.status === "dispatched") {
    return {
      title: "Mark out for delivery",
      summary: "The package has left the store; the customer should now see live movement.",
      confidence: 86,
      checklist: [
        "Confirm parcel handoff",
        "Enable auto-drive simulation",
        "Mark out for delivery",
      ],
      actionLabel: "Out for delivery",
    };
  }

  return {
    title: "Complete customer handoff",
    summary: `You are heading to ${activeOrder.customerName}. Finish the delivery or flag a failed attempt.`,
    confidence: 83,
    checklist: [
      "Follow GPS progress",
      "Call customer if delayed",
      "Mark delivered after handoff",
    ],
    actionLabel: "Complete handoff",
  };
}

export function generateCustomerPromise(
  state: LogiTrackState,
  cart: Array<{ product: Product; quantity: number }>,
  lat: number,
  lng: number
): CustomerPromise {
  const nearestHub = [...state.warehouses]
    .map((warehouse) => ({
      warehouse,
      distanceKm: getDistanceKm(warehouse.lat, warehouse.lng, lat, lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const stockRisk = cart.find((item) => item.quantity > item.product.stock);
  const lowStock = cart.find((item) => item.product.stock < 10);
  const availableAgents = state.agents.filter(
    (agent) => agent.status === "available"
  ).length;
  const baseEta = nearestHub ? Math.max(18, Math.round(nearestHub.distanceKm * 6 + 18)) : 32;
  const pressure = availableAgents < 3 ? 12 : availableAgents < 7 ? 6 : 0;

  if (cart.length === 0) {
    return {
      title: "Build a cart to calculate promise",
      summary: "The promise engine needs products before it can reserve inventory and route capacity.",
      etaRange: "--",
      confidence: 0,
      hubName: nearestHub?.warehouse.name ?? "Nearest hub",
      stockSignal: "empty",
      reasons: ["cart is empty", `${availableAgents} agents available`],
    };
  }

  if (stockRisk) {
    return {
      title: "Promise blocked by stock",
      summary: `${stockRisk.product.name} does not have enough units for this cart.`,
      etaRange: "after restock",
      confidence: 36,
      hubName: nearestHub?.warehouse.name ?? "Nearest hub",
      stockSignal: "risk",
      reasons: [
        `${stockRisk.product.stock} units in stock`,
        `${stockRisk.quantity} requested`,
        "owner needs restock before checkout",
      ],
    };
  }

  return {
    title: lowStock ? "Fast delivery, low stock" : "Delivery promise ready",
    summary: lowStock
      ? `${lowStock.product.name} is low stock, but this cart can still be reserved now.`
      : "Inventory, payment, and fleet capacity are aligned for this checkout.",
    etaRange: `${baseEta + pressure}-${baseEta + pressure + 14} min`,
    confidence: lowStock ? 73 : 89,
    hubName: nearestHub?.warehouse.name ?? "Nearest hub",
    stockSignal: lowStock ? "risk" : "ready",
    reasons: [
      nearestHub
        ? `${nearestHub.warehouse.name} is ${nearestHub.distanceKm.toFixed(1)} km away`
        : "nearest hub selected",
      `${availableAgents} agents available`,
      lowStock ? `${lowStock.product.name} is below 10 units` : "all cart items in stock",
    ],
  };
}
