"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Types
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image: string;
  category: string;
}

export interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  lat: number;
  lng: number;
  products: OrderProduct[];
  total: number;
  status: "placed" | "confirmed" | "dispatched" | "out_for_delivery" | "delivered" | "failed" | "returned";
  agentId: string | null;
  timestamp: string;
  deliveryRating: number | null;
  paymentStatus: "pending" | "paid" | "refunded";
  returnRequested: boolean;
  returnReason?: string;
  returnTimestamp?: string;
  routePoints?: [number, number][];
  currentRouteIndex?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Agent {
  id: string;
  name: string;
  status: "available" | "busy" | "offline";
  lat: number;
  lng: number;
  deliveriesCompleted: number;
  incentivesEarned: number;
  phone: string;
  warehouseId: string;
}

export interface InventoryHistoryItem {
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: string;
  timestamp: string;
}

export interface Subscription {
  tier: "free" | "pro";
  orderCountThisMonth: number;
}

export interface LogiTrackState {
  products: Product[];
  orders: Order[];
  agents: Agent[];
  inventoryHistory: InventoryHistoryItem[];
  subscription: Subscription;
  simulationMode: boolean;
  warehouses: Warehouse[];
}

const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: "w1", name: "Deccan Central Hub", lat: 18.5196, lng: 73.8413 },
  { id: "w2", name: "Viman Nagar Logistics Hub", lat: 18.5678, lng: 73.9143 },
  { id: "w3", name: "Kothrud Fulfillment Depot", lat: 18.5074, lng: 73.8077 },
  { id: "w4", name: "Aundh Retail Hub", lat: 18.5580, lng: 73.8075 },
  { id: "w5", name: "Hadapsar Distribution Hub", lat: 18.5089, lng: 73.9260 },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: "p1", name: "Premium Arabica Coffee Beans", sku: "COF-ARA-001", price: 550, stock: 45, image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80", category: "Beverages" },
  { id: "p2", name: "Organic Almond Milk 1L", sku: "MLK-ALM-002", price: 250, stock: 12, image: "https://images.unsplash.com/photo-1568649929103-28ffbbeaca1e?w=400&q=80", category: "Dairy & Alternatives" },
  { id: "p3", name: "Gluten-Free Sourdough Bread", sku: "BRD-SDR-003", price: 180, stock: 5, image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&q=80", category: "Bakery" },
  { id: "p4", name: "Cold-Pressed Extra Virgin Olive Oil", sku: "OIL-EVO-004", price: 1200, stock: 30, image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80", category: "Pantry" },
  { id: "p5", name: "Himalayan Pink Salt 500g", sku: "SLT-PNK-005", price: 99, stock: 80, image: "https://images.unsplash.com/photo-1614725350930-b3e34b9d073c?w=400&q=80", category: "Pantry" },
  { id: "p6", name: "Dark Chocolate 72% Madagascar", sku: "CHO-MAD-006", price: 350, stock: 110, image: "https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=400&q=80", category: "Snacks" },
  { id: "p7", name: "Organic Green Tea (20 bags)", sku: "TEA-GRN-007", price: 220, stock: 6, image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=80", category: "Beverages" },
  { id: "p8", name: "Eco-Friendly Dishwashing Liquid", sku: "HSH-DSH-008", price: 180, stock: 25, image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80", category: "Household" },
];

const INITIAL_AGENTS: Agent[] = [
  // Deccan (w1)
  { id: "a1", name: "Amit Deshmukh", status: "available", lat: 18.5196, lng: 73.8413, deliveriesCompleted: 142, incentivesEarned: 11360, phone: "+91 98220 12345", warehouseId: "w1" },
  { id: "a2", name: "Rohan Mehta", status: "available", lat: 18.5196, lng: 73.8413, deliveriesCompleted: 189, incentivesEarned: 15120, phone: "+91 99230 67890", warehouseId: "w1" },
  { id: "a3", name: "Suresh Patil", status: "available", lat: 18.5196, lng: 73.8413, deliveriesCompleted: 95, incentivesEarned: 7600, phone: "+91 91580 45678", warehouseId: "w1" },
  { id: "a4", name: "Aniket Shinde", status: "available", lat: 18.5196, lng: 73.8413, deliveriesCompleted: 48, incentivesEarned: 3840, phone: "+91 88060 98765", warehouseId: "w1" },
  { id: "a5", name: "Pooja Sawant", status: "available", lat: 18.5196, lng: 73.8413, deliveriesCompleted: 210, incentivesEarned: 16800, phone: "+91 88050 34567", warehouseId: "w1" },

  // Viman Nagar (w2)
  { id: "a6", name: "Vikram Joshi", status: "available", lat: 18.5678, lng: 73.9143, deliveriesCompleted: 54, incentivesEarned: 4320, phone: "+91 97630 56789", warehouseId: "w2" },
  { id: "a7", name: "Kunal Shah", status: "available", lat: 18.5678, lng: 73.9143, deliveriesCompleted: 38, incentivesEarned: 3040, phone: "+91 96520 78901", warehouseId: "w2" },
  { id: "a8", name: "Rahul Sharma", status: "available", lat: 18.5678, lng: 73.9143, deliveriesCompleted: 125, incentivesEarned: 10000, phone: "+91 95450 12345", warehouseId: "w2" },
  { id: "a9", name: "Neha Gadgil", status: "available", lat: 18.5678, lng: 73.9143, deliveriesCompleted: 73, incentivesEarned: 5840, phone: "+91 91230 45678", warehouseId: "w2" },
  { id: "a10", name: "Ajay Gokhale", status: "available", lat: 18.5678, lng: 73.9143, deliveriesCompleted: 66, incentivesEarned: 5280, phone: "+91 98820 11223", warehouseId: "w2" },

  // Kothrud (w3)
  { id: "a11", name: "Snehal Shinde", status: "available", lat: 18.5074, lng: 73.8077, deliveriesCompleted: 87, incentivesEarned: 6960, phone: "+91 90110 23456", warehouseId: "w3" },
  { id: "a12", name: "Manish Patil", status: "available", lat: 18.5074, lng: 73.8077, deliveriesCompleted: 62, incentivesEarned: 4960, phone: "+91 94220 34567", warehouseId: "w3" },
  { id: "a13", name: "Tushar Kadam", status: "available", lat: 18.5074, lng: 73.8077, deliveriesCompleted: 45, incentivesEarned: 3600, phone: "+91 90900 12345", warehouseId: "w3" },
  { id: "a14", name: "Pranali Bhave", status: "available", lat: 18.5074, lng: 73.8077, deliveriesCompleted: 112, incentivesEarned: 8960, phone: "+91 92250 98765", warehouseId: "w3" },
  { id: "a15", name: "Sameer More", status: "available", lat: 18.5074, lng: 73.8077, deliveriesCompleted: 78, incentivesEarned: 6240, phone: "+91 93250 56789", warehouseId: "w3" },

  // Aundh (w4)
  { id: "a16", name: "Harish Kale", status: "available", lat: 18.5580, lng: 73.8075, deliveriesCompleted: 119, incentivesEarned: 9520, phone: "+91 98810 45678", warehouseId: "w4" },
  { id: "a17", name: "Deepa Kulkarni", status: "available", lat: 18.5580, lng: 73.8075, deliveriesCompleted: 43, incentivesEarned: 3440, phone: "+91 93700 56789", warehouseId: "w4" },
  { id: "a18", name: "Yash Wanwasi", status: "available", lat: 18.5580, lng: 73.8075, deliveriesCompleted: 91, incentivesEarned: 7280, phone: "+91 91720 12345", warehouseId: "w4" },
  { id: "a19", name: "Aarti Date", status: "available", lat: 18.5580, lng: 73.8075, deliveriesCompleted: 58, incentivesEarned: 4640, phone: "+91 98900 67890", warehouseId: "w4" },
  { id: "a20", name: "Prathamesh Kunte", status: "available", lat: 18.5580, lng: 73.8075, deliveriesCompleted: 104, incentivesEarned: 8320, phone: "+91 95030 98765", warehouseId: "w4" },

  // Hadapsar (w5)
  { id: "a21", name: "Swapnil Shinde", status: "available", lat: 18.5089, lng: 73.9260, deliveriesCompleted: 75, incentivesEarned: 6000, phone: "+91 98010 12345", warehouseId: "w5" },
  { id: "a22", name: "Ganesh Patil", status: "available", lat: 18.5089, lng: 73.9260, deliveriesCompleted: 92, incentivesEarned: 7360, phone: "+91 99020 67890", warehouseId: "w5" },
  { id: "a23", name: "Riddhi Deshpande", status: "available", lat: 18.5089, lng: 73.9260, deliveriesCompleted: 64, incentivesEarned: 5120, phone: "+91 91590 45678", warehouseId: "w5" },
  { id: "a24", name: "Sanjay More", status: "available", lat: 18.5089, lng: 73.9260, deliveriesCompleted: 83, incentivesEarned: 6640, phone: "+91 88070 34567", warehouseId: "w5" },
  { id: "a25", name: "Tanmay Kulkarni", status: "available", lat: 18.5089, lng: 73.9260, deliveriesCompleted: 51, incentivesEarned: 4080, phone: "+91 97640 56789", warehouseId: "w5" },
];

// Generate 30 days of mock sales for AI demand forecasting
const generateHistoricalOrders = (): Order[] => {
  const list: Order[] = [];
  const now = new Date();
  const customerNames = ["Ananya Kulkarni", "Rahul Sharma", "Priyanka Joshi", "Aditya Ranade", "Sneha Kadam", "Abhishek More", "Tejaswini Shinde", "Sachin Jadhav", "Mukta Bhave"];
  const addresses = ["FC Road, Pune", "Koregaon Park, Pune", "Aundh Road, Pune", "Senapati Bapat Road, Pune", "Kothrud Depot, Pune", "Viman Nagar, Pune"];
  
  for (let i = 30; i > 0; i--) {
    const orderDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Number of orders per day fluctuates between 1 and 4
    const ordersCount = Math.floor(Math.random() * 3) + 1;
    for (let o = 0; o < ordersCount; o++) {
      const idx = Math.floor(Math.random() * customerNames.length);
      const addrIdx = Math.floor(Math.random() * addresses.length);
      const isReturn = Math.random() < 0.12; // 12% return rate
      const rating = Math.random() < 0.8 ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 3) + 1; // skewed high
      
      const p1 = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
      const p2 = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
      const productsList = [
        { id: p1.id, name: p1.name, quantity: Math.floor(Math.random() * 2) + 1, price: p1.price }
      ];
      if (p1.id !== p2.id && Math.random() < 0.4) {
        productsList.push({ id: p2.id, name: p2.name, quantity: 1, price: p2.price });
      }
      
      const total = productsList.reduce((acc, p) => acc + p.price * p.quantity, 0);

      list.push({
        id: `ord-hist-${i}-${o}`,
        customerName: customerNames[idx],
        customerPhone: "+1 (555) 011-0000",
        address: addresses[addrIdx],
        lat: 18.52 + (Math.random() - 0.5) * 0.06,
        lng: 73.85 + (Math.random() - 0.5) * 0.06,
        products: productsList,
        total: parseFloat(total.toFixed(2)),
        status: isReturn ? "returned" : "delivered",
        agentId: `a${Math.floor(Math.random() * 3) + 1}`,
        timestamp: orderDate.toISOString(),
        deliveryRating: rating,
        paymentStatus: isReturn ? "refunded" : "paid",
        returnRequested: isReturn,
        returnReason: isReturn ? "Item damaged on arrival" : undefined,
        returnTimestamp: isReturn ? new Date(orderDate.getTime() + 12 * 60 * 60 * 1000).toISOString() : undefined,
      });
    }
  }
  return list;
};

const INITIAL_INVENTORY_HISTORY: InventoryHistoryItem[] = [
  { id: "ih1", productId: "p1", productName: "Premium Arabica Coffee Beans", change: 50, reason: "Initial Restock", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "ih2", productId: "p2", productName: "Organic Almond Milk 1L", change: 20, reason: "Initial Restock", timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "ih3", productId: "p3", productName: "Gluten-Free Sourdough Bread", change: 10, reason: "Initial Restock", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
];

const DEFAULT_STATE: LogiTrackState = {
  products: INITIAL_PRODUCTS,
  orders: [], // Will be combined with historical data in context
  agents: INITIAL_AGENTS,
  inventoryHistory: INITIAL_INVENTORY_HISTORY,
  subscription: { tier: "free", orderCountThisMonth: 0 },
  simulationMode: true,
  warehouses: INITIAL_WAREHOUSES
};

// Context setup
interface LogiTrackContextType {
  state: LogiTrackState;
  resetState: () => void;
  toggleSimulationMode: () => void;
  // Product actions
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  restockProduct: (id: string, qty: number) => void;
  // Order actions
  createOrder: (order: Omit<Order, "id" | "status" | "agentId" | "timestamp" | "deliveryRating" | "paymentStatus" | "returnRequested">) => string;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  assignAgent: (orderId: string, agentId: string) => void;
  autoAssignOrder: (orderId: string) => void;
  submitFeedback: (orderId: string, rating: number) => void;
  requestReturn: (orderId: string, reason: string) => void;
  refundOrder: (orderId: string) => void;
  // Agent actions
  updateAgentLocation: (agentId: string, lat: number | ((prev: number) => number), lng: number | ((prev: number) => number)) => void;
  updateAgentStatus: (agentId: string, status: Agent["status"]) => void;
  simulatePayout: (agentId: string) => void;
  // Subscription
  upgradeSubscription: () => void;
}

const LogiTrackContext = createContext<LogiTrackContextType | undefined>(undefined);

const fetchOSRMRoute = async (startLat: number, startLng: number, endLat: number, endLng: number): Promise<[number, number][]> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    if (!response.ok) throw new Error("OSRM router error");
    const data = await response.json();
    if (data.routes && data.routes[0]) {
      const coords = data.routes[0].geometry.coordinates; // Array of [lng, lat]
      return coords.map((coord: [number, number]) => [coord[1], coord[0]]); // Convert to [lat, lng]
    }
  } catch (err) {
    console.error("Failed to fetch OSRM route, falling back to straight line:", err);
  }
  return [[startLat, startLng], [endLat, endLng]];
};

export const LogiTrackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LogiTrackState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync from LocalStorage on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("logitrack_state");
      if (stored) {
        try {
          setState(JSON.parse(stored));
        } catch (e) {
          console.error("Error parsing stored LogiTrack state, loading defaults", e);
          const history = generateHistoricalOrders();
          const defaultWithHistory = { ...DEFAULT_STATE, orders: [...history] };
          setState(defaultWithHistory);
          localStorage.setItem("logitrack_state", JSON.stringify(defaultWithHistory));
        }
      } else {
        const history = generateHistoricalOrders();
        const defaultWithHistory = { ...DEFAULT_STATE, orders: [...history] };
        setState(defaultWithHistory);
        localStorage.setItem("logitrack_state", JSON.stringify(defaultWithHistory));
      }
      setIsLoaded(true);
    }
  }, []);

  // Sync to LocalStorage on change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("logitrack_state", JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // Listen to cross-tab updates
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "logitrack_state" && event.newValue) {
        try {
          setState(JSON.parse(event.newValue));
        } catch (e) {
          console.error("Error syncing state across tabs", e);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Load route points for active orders using OSRM API
  useEffect(() => {
    if (!state.simulationMode) return;

    const unroutedOrders = state.orders.filter(
      o => o.agentId && 
           (o.status === "confirmed" || o.status === "dispatched" || o.status === "out_for_delivery") && 
           !o.routePoints
    );

    if (unroutedOrders.length === 0) return;

    const processRoutes = async () => {
      let stateChanged = false;
      const updatedOrders = [...state.orders];

      for (const order of unroutedOrders) {
        const agent = state.agents.find(a => a.id === order.agentId);
        if (agent) {
          const points = await fetchOSRMRoute(agent.lat, agent.lng, order.lat, order.lng);
          const orderIdx = updatedOrders.findIndex(o => o.id === order.id);
          if (orderIdx !== -1) {
            updatedOrders[orderIdx] = {
              ...updatedOrders[orderIdx],
              routePoints: points,
              currentRouteIndex: 0
            };
            stateChanged = true;
          }
        }
      }

      if (stateChanged) {
        setState(prev => {
          const mergedOrders = prev.orders.map(o => {
            const match = updatedOrders.find(uo => uo.id === o.id);
            return match && match.routePoints 
              ? { ...o, routePoints: match.routePoints, currentRouteIndex: match.currentRouteIndex || 0 } 
              : o;
          });
          const nextState = { ...prev, orders: mergedOrders };
          if (typeof window !== "undefined") {
            localStorage.setItem("logitrack_state", JSON.stringify(nextState));
          }
          return nextState;
        });
      }
    };

    processRoutes();
  }, [state.orders, state.agents, state.simulationMode]);

  const resetState = () => {
    const history = generateHistoricalOrders();
    const defaultWithHistory = { ...DEFAULT_STATE, orders: [...history] };
    setState(defaultWithHistory);
    if (typeof window !== "undefined") {
      localStorage.setItem("logitrack_state", JSON.stringify(defaultWithHistory));
    }
  };

  const toggleSimulationMode = () => {
    setState(prev => ({
      ...prev,
      simulationMode: !prev.simulationMode
    }));
  };

  // Background Simulation Loop Effect
  useEffect(() => {
    if (!state.simulationMode) return;

    // 1. Driving & Auto-Assignment Loop: Tick every 2 seconds
    const driveInterval = setInterval(() => {
      setState(prev => {
        if (!prev.simulationMode) return prev;

        let stateChanged = false;
        let updatedAgents = [...prev.agents];

        // First, check for placed orders with no agent and try to auto-assign them
        const updatedOrders = prev.orders.map(o => {
          if (o.status === "placed" && !o.agentId) {
            const availableAgents = updatedAgents.filter(a => a.status === "available");
            if (availableAgents.length > 0) {
              stateChanged = true;
              
              // Simple nearest agent assignment heuristic
              let closestAgent = availableAgents[0];
              let minDistance = Infinity;
              availableAgents.forEach(a => {
                const dist = Math.sqrt(Math.pow(a.lat - o.lat, 2) + Math.pow(a.lng - o.lng, 2));
                if (dist < minDistance) {
                  minDistance = dist;
                  closestAgent = a;
                }
              });

              // Mark agent busy
              updatedAgents = updatedAgents.map(a => 
                a.id === closestAgent.id ? { ...a, status: "busy" as const } : a
              );
              
              return { ...o, agentId: closestAgent.id, status: "confirmed" as const };
            }
          }
          return o;
        });

        // Next, progress order statuses and simulate driving agent coordinates closer to destination
        const fullyUpdatedOrders = updatedOrders.map(o => {
          if (o.agentId && (o.status === "confirmed" || o.status === "dispatched" || o.status === "out_for_delivery")) {
            stateChanged = true;
            if (o.status === "confirmed") {
              return { ...o, status: "dispatched" as const };
            }
            if (o.status === "dispatched") {
              return { ...o, status: "out_for_delivery" as const };
            }
          }
          return o;
        });

        updatedAgents = updatedAgents.map(agent => {
          if (agent.status === "busy") {
            const activeOrder = fullyUpdatedOrders.find(o => o.agentId === agent.id && o.status === "out_for_delivery");
            if (activeOrder) {
              stateChanged = true;
              
              if (activeOrder.routePoints && activeOrder.routePoints.length > 0) {
                const routeIdx = activeOrder.currentRouteIndex ?? 0;
                
                if (routeIdx >= activeOrder.routePoints.length) {
                  // Arrived at customer destination!
                  // Update agent stats and return to available status at their warehouse
                  const warehouse = INITIAL_WAREHOUSES.find(w => w.id === agent.warehouseId);
                  const nextAgent = {
                    ...agent,
                    lat: warehouse ? warehouse.lat : activeOrder.lat,
                    lng: warehouse ? warehouse.lng : activeOrder.lng,
                    status: "available" as const,
                    deliveriesCompleted: agent.deliveriesCompleted + 1,
                    incentivesEarned: agent.incentivesEarned + 80
                  };

                  // Change order status to delivered
                  const orderIdx = fullyUpdatedOrders.findIndex(o => o.id === activeOrder.id);
                  if (orderIdx !== -1) {
                    fullyUpdatedOrders[orderIdx] = {
                      ...fullyUpdatedOrders[orderIdx],
                      status: "delivered" as const
                    };
                  }

                  return nextAgent;
                }

                // Move toward current waypoint
                const targetPoint = activeOrder.routePoints[routeIdx];
                const latDiff = targetPoint[0] - agent.lat;
                const lngDiff = targetPoint[1] - agent.lng;
                const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

                const step = 0.0025; // Smaller step size to make road following smooth and beautiful!
                if (dist <= step) {
                  // Arrived at waypoint! Advance to next waypoint
                  const orderIdx = fullyUpdatedOrders.findIndex(o => o.id === activeOrder.id);
                  if (orderIdx !== -1) {
                    const nextIdx = routeIdx + 1;
                    fullyUpdatedOrders[orderIdx] = {
                      ...fullyUpdatedOrders[orderIdx],
                      currentRouteIndex: nextIdx
                    };
                  }
                  
                  return {
                    ...agent,
                    lat: targetPoint[0],
                    lng: targetPoint[1]
                  };
                } else {
                  // Drive closer to waypoint
                  return {
                    ...agent,
                    lat: agent.lat + (latDiff / dist) * step,
                    lng: agent.lng + (lngDiff / dist) * step
                  };
                }
              } else {
                // If routePoints not loaded yet, pause agent movement to avoid drone hops
                return agent;
              }
            }
          }
          return agent;
        });

        if (stateChanged) {
          return {
            ...prev,
            orders: fullyUpdatedOrders,
            agents: updatedAgents
          };
        }
        return prev;
      });
    }, 2000);

    // 2. Simulated Order Placement Loop: Trigger every 14 seconds
    const orderGenInterval = setInterval(() => {
      setState(prev => {
        if (!prev.simulationMode) return prev;

        const randomProduct = prev.products[Math.floor(Math.random() * prev.products.length)];
        if (!randomProduct || randomProduct.stock <= 0) return prev;

        const customerNames = ["Rahul Sharma", "Priya Patel", "Amit Deshmukh", "Ananya Kulkarni", "Vikram Joshi", "Sneha Rao", "Rohan Mehta", "Neha Patil"];
        const addresses = ["Deccan Gymkhana, Pune", "Aundh Road, Pune", "Kothrud Depot, Pune", "Viman Nagar, Pune", "Senapati Bapat Road, Pune", "FC Road, Pune", "Koregaon Park, Pune"];
        
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
        const address = addresses[Math.floor(Math.random() * addresses.length)];
        const orderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Random Pune coords
        const lat = 18.52 + (Math.random() - 0.5) * 0.06;
        const lng = 73.85 + (Math.random() - 0.5) * 0.06;

        const newOrder: Order = {
          id: orderId,
          customerName,
          customerPhone: "+91 98811 00000",
          address,
          lat,
          lng,
          products: [{ id: randomProduct.id, name: randomProduct.name, quantity: 1, price: randomProduct.price }],
          total: randomProduct.price,
          status: "placed",
          agentId: null,
          timestamp: new Date().toISOString(),
          deliveryRating: null,
          paymentStatus: "paid",
          returnRequested: false
        };

        // Try to assign immediately if agent available
        const availableAgents = prev.agents.filter(a => a.status === "available");
        let updatedAgents = [...prev.agents];
        
        if (availableAgents.length > 0) {
          let closestAgent = availableAgents[0];
          let minDistance = Infinity;
          availableAgents.forEach(a => {
            const dist = Math.sqrt(Math.pow(a.lat - lat, 2) + Math.pow(a.lng - lng, 2));
            if (dist < minDistance) {
              minDistance = dist;
              closestAgent = a;
            }
          });

          newOrder.agentId = closestAgent.id;
          newOrder.status = "confirmed";
          
          updatedAgents = prev.agents.map(a => 
            a.id === closestAgent.id ? { ...a, status: "busy" as const } : a
          );
        }

        // Deduct inventory
        const updatedProducts = prev.products.map(p => 
          p.id === randomProduct.id ? { ...p, stock: Math.max(0, p.stock - 1) } : p
        );

        return {
          ...prev,
          products: updatedProducts,
          orders: [newOrder, ...prev.orders],
          agents: updatedAgents,
          inventoryHistory: [
            {
              id: `ih-${Date.now()}`,
              productId: randomProduct.id,
              productName: randomProduct.name,
              change: -1,
              reason: `Simulated Sale Order ${orderId}`,
              timestamp: new Date().toISOString()
            },
            ...prev.inventoryHistory
          ]
        };
      });
    }, 14000);

    return () => {
      clearInterval(driveInterval);
      clearInterval(orderGenInterval);
    };
  }, [state.simulationMode]);

  // Product CRUD Actions
  const addProduct = (p: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...p,
      id: `p-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      products: [...prev.products, newProduct],
      inventoryHistory: [
        {
          id: `ih-${Date.now()}`,
          productId: newProduct.id,
          productName: newProduct.name,
          change: newProduct.stock,
          reason: "Product Created",
          timestamp: new Date().toISOString()
        },
        ...prev.inventoryHistory
      ]
    }));
  };

  const updateProduct = (p: Product) => {
    setState(prev => {
      const oldProduct = prev.products.find(x => x.id === p.id);
      const stockDiff = p.stock - (oldProduct ? oldProduct.stock : 0);
      const updatedHistory = [...prev.inventoryHistory];
      
      if (stockDiff !== 0) {
        updatedHistory.unshift({
          id: `ih-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          change: stockDiff,
          reason: stockDiff > 0 ? "Manual Adjustment (Add)" : "Manual Adjustment (Deduct)",
          timestamp: new Date().toISOString()
        });
      }

      return {
        ...prev,
        products: prev.products.map(x => x.id === p.id ? p : x),
        inventoryHistory: updatedHistory
      };
    });
  };

  const deleteProduct = (id: string) => {
    setState(prev => ({
      ...prev,
      products: prev.products.filter(x => x.id !== id)
    }));
  };

  const restockProduct = (id: string, qty: number) => {
    setState(prev => {
      const product = prev.products.find(x => x.id === id);
      if (!product) return prev;
      return {
        ...prev,
        products: prev.products.map(x => x.id === id ? { ...x, stock: x.stock + qty } : x),
        inventoryHistory: [
          {
            id: `ih-${Date.now()}`,
            productId: id,
            productName: product.name,
            change: qty,
            reason: "Restocked",
            timestamp: new Date().toISOString()
          },
          ...prev.inventoryHistory
        ]
      };
    });
  };

  // Order Actions
  const createOrder = (o: Omit<Order, "id" | "status" | "agentId" | "timestamp" | "deliveryRating" | "paymentStatus" | "returnRequested">) => {
    const id = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      ...o,
      id,
      status: "placed",
      agentId: null,
      timestamp: new Date().toISOString(),
      deliveryRating: null,
      paymentStatus: "paid", // sandbox payment completes instantly
      returnRequested: false
    };

    setState(prev => {
      // Deduct inventory stock
      const updatedProducts = prev.products.map(product => {
        const orderProd = o.products.find(op => op.id === product.id);
        if (orderProd) {
          return { ...product, stock: Math.max(0, product.stock - orderProd.quantity) };
        }
        return product;
      });

      // Add to inventory history
      const newHistoryItems: InventoryHistoryItem[] = o.products.map(op => ({
        id: `ih-${Date.now()}-${op.id}`,
        productId: op.id,
        productName: op.name,
        change: -op.quantity,
        reason: `Sold in Order ${id}`,
        timestamp: new Date().toISOString()
      }));

      const newOrderCount = prev.subscription.orderCountThisMonth + 1;

      return {
        ...prev,
        products: updatedProducts,
        orders: [newOrder, ...prev.orders],
        inventoryHistory: [...newHistoryItems, ...prev.inventoryHistory],
        subscription: {
          ...prev.subscription,
          orderCountThisMonth: newOrderCount
        }
      };
    });

    return id;
  };

  const updateOrderStatus = (orderId: string, status: Order["status"]) => {
    setState(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      let updatedAgents = [...prev.agents];
      
      // If status becomes delivered or failed, free up the agent
      if (order && order.agentId && (status === "delivered" || status === "failed")) {
        updatedAgents = prev.agents.map(a => {
          if (a.id === order.agentId) {
            const isDelivery = status === "delivered";
            const warehouse = INITIAL_WAREHOUSES.find(w => w.id === a.warehouseId);
            return {
              ...a,
              status: "available" as const,
              lat: warehouse ? warehouse.lat : a.lat,
              lng: warehouse ? warehouse.lng : a.lng,
              deliveriesCompleted: a.deliveriesCompleted + (isDelivery ? 1 : 0),
              incentivesEarned: a.incentivesEarned + (isDelivery ? 80 : 0) // ₹80 incentive per delivery
            };
          }
          return a;
        });
      }

      return {
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? { ...o, status } : o),
        agents: updatedAgents
      };
    });
  };

  const assignAgent = (orderId: string, agentId: string) => {
    setState(prev => {
      const updatedOrders = prev.orders.map(o => 
        o.id === orderId ? { ...o, agentId, status: "confirmed" as const } : o
      );
      const updatedAgents = prev.agents.map(a => 
        a.id === agentId ? { ...a, status: "busy" as const } : a
      );
      return {
        ...prev,
        orders: updatedOrders,
        agents: updatedAgents
      };
    });
  };

  const autoAssignOrder = (orderId: string) => {
    // AI Smart Auto-Assign simulation
    // Selects available agent with closest distance or least load
    setState(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      if (!order) return prev;

      const availableAgents = prev.agents.filter(a => a.status === "available");
      if (availableAgents.length === 0) return prev; // no agent available

      // Distance calculation (Haversine simple approximation)
      let closestAgent = availableAgents[0];
      let minDistance = Infinity;

      availableAgents.forEach(a => {
        const dist = Math.sqrt(Math.pow(a.lat - order.lat, 2) + Math.pow(a.lng - order.lng, 2));
        if (dist < minDistance) {
          minDistance = dist;
          closestAgent = a;
        }
      });

      const updatedOrders = prev.orders.map(o => 
        o.id === orderId ? { ...o, agentId: closestAgent.id, status: "confirmed" as const } : o
      );
      const updatedAgents = prev.agents.map(a => 
        a.id === closestAgent.id ? { ...a, status: "busy" as const } : a
      );

      return {
        ...prev,
        orders: updatedOrders,
        agents: updatedAgents
      };
    });
  };

  const submitFeedback = (orderId: string, rating: number) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, deliveryRating: rating } : o)
    }));
  };

  const requestReturn = (orderId: string, reason: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => 
        o.id === orderId 
          ? { 
              ...o, 
              status: "returned" as const, 
              paymentStatus: "refunded" as const,
              returnRequested: true, 
              returnReason: reason, 
              returnTimestamp: new Date().toISOString() 
            } 
          : o
      )
    }));
  };

  const refundOrder = (orderId: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => 
        o.id === orderId ? { ...o, paymentStatus: "refunded" as const, status: "returned" as const } : o
      )
    }));
  };

  // Agent Actions
  const updateAgentLocation = (
    agentId: string, 
    lat: number | ((prev: number) => number), 
    lng: number | ((prev: number) => number)
  ) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => {
        if (a.id === agentId) {
          const nextLat = typeof lat === "function" ? lat(a.lat) : lat;
          const nextLng = typeof lng === "function" ? lng(a.lng) : lng;
          return { ...a, lat: nextLat, lng: nextLng };
        }
        return a;
      })
    }));
  };

  const updateAgentStatus = (agentId: string, status: Agent["status"]) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === agentId ? { ...a, status } : a)
    }));
  };

  const simulatePayout = (agentId: string) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === agentId ? { ...a, incentivesEarned: 0 } : a)
    }));
  };

  // Subscription Actions
  const upgradeSubscription = () => {
    setState(prev => ({
      ...prev,
      subscription: { ...prev.subscription, tier: "pro" }
    }));
  };

  return (
    <LogiTrackContext.Provider value={{
      state,
      resetState,
      toggleSimulationMode,
      addProduct,
      updateProduct,
      deleteProduct,
      restockProduct,
      createOrder,
      updateOrderStatus,
      assignAgent,
      autoAssignOrder,
      submitFeedback,
      requestReturn,
      refundOrder,
      updateAgentLocation,
      updateAgentStatus,
      simulatePayout,
      upgradeSubscription
    }}>
      {children}
    </LogiTrackContext.Provider>
  );
};

export const useLogiTrack = () => {
  const context = useContext(LogiTrackContext);
  if (context === undefined) {
    throw new Error("useLogiTrack must be used within a LogiTrackProvider");
  }
  return context;
};
