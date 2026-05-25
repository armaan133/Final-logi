"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLogiTrack, Product, Order } from "@/lib/state-store";
import { 
  ShoppingBag, Trash2, MapPin, CreditCard, Star, RefreshCw, 
  ChevronRight, ArrowLeft, Check, CheckCircle2, ShieldAlert, Phone, Truck, Play
} from "lucide-react";
import Link from "next/link";

// Dynamically import map to prevent SSR Leaflet errors
const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), { ssr: false });

export default function CustomerApp() {
  const { state, createOrder, submitFeedback, requestReturn } = useLogiTrack();

  const [activeTab, setActiveTab] = useState<"shop" | "cart" | "tracking" | "history">("shop");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [customerName, setCustomerName] = useState("Aditi Gokhale");
  const [customerPhone, setCustomerPhone] = useState("+91 95450 12345");
  const [address, setAddress] = useState("Senapati Bapat Road, Pune, Maharashtra");
  const [lat, setLat] = useState(18.5308);
  const [lng, setLng] = useState(73.8313);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Return and feedback states
  const [ratingOrder, setRatingOrder] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const [returnOrder, setReturnOrder] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("Item damaged on arrival");
  const [returnSuccess, setReturnSuccess] = useState(false);

  // Categories
  const categories = ["All", "Beverages", "Dairy & Alternatives", "Bakery", "Pantry", "Snacks", "Household"];

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") return state.products;
    return state.products.filter(p => p.category === selectedCategory);
  }, [state.products, selectedCategory]);

  // Cart logic
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("This item is currently out of stock!");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Only ${product.stock} units available in inventory.`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQty = (productId: string, val: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const nextQty = Math.max(1, item.quantity + val);
          if (nextQty > product.stock) {
            alert(`Only ${product.stock} units available.`);
            return item;
          }
          return { ...item, quantity: nextQty };
        }
        return item;
      });
    });
  };

  const cartTotal = useMemo(() => {
    return parseFloat(cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2));
  }, [cart]);

  // Place order flow
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Assemble order products
    const orderProds = cart.map(item => ({
      id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    const orderId = createOrder({
      customerName,
      customerPhone,
      address,
      lat,
      lng,
      products: orderProds,
      total: cartTotal
    });

    setCart([]);
    setShowSandboxModal(false);
    setTrackingOrderId(orderId);
    setActiveTab("tracking");
  };

  // Find active tracking order
  const activeTrackingOrder = useMemo(() => {
    if (!trackingOrderId) return null;
    return state.orders.find(o => o.id === trackingOrderId) || null;
  }, [state.orders, trackingOrderId]);

  // Find active tracking order's agent coordinates
  const trackingAgent = useMemo(() => {
    if (!activeTrackingOrder || !activeTrackingOrder.agentId) return null;
    return state.agents.find(a => a.id === activeTrackingOrder.agentId) || null;
  }, [activeTrackingOrder, state.agents]);

  // Customer order history (excludes the simulated 30 day seed list for cleanliness, or shows recent customer orders)
  const customerHistory = useMemo(() => {
    return state.orders.filter(o => 
      o.customerName === customerName && 
      o.id.startsWith("ord-") // starts with ord- represents real-time created orders
    );
  }, [state.orders, customerName]);

  // Status index for tracking vertical stepper progress
  const getStatusIndex = (status: Order["status"]) => {
    const statuses: Order["status"][] = ["placed", "confirmed", "dispatched", "out_for_delivery", "delivered"];
    const idx = statuses.indexOf(status);
    return idx === -1 ? 4 : idx; // if returned or failed, just keep highlights
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingOrder) {
      submitFeedback(ratingOrder, selectedRating);
      setFeedbackSuccess(true);
      setTimeout(() => {
        setRatingOrder(null);
        setFeedbackSuccess(false);
      }, 2000);
    }
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnOrder) {
      requestReturn(returnOrder, returnReason);
      setReturnSuccess(true);
      setTimeout(() => {
        setReturnOrder(null);
        setReturnSuccess(false);
      }, 2000);
    }
  };

  // SSG Hydration check
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] max-w-lg rounded-full bg-pink-500/5 blur-[120px] pointer-events-none" />

      {/* Mock Phone Wrapper Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative" style={{ minHeight: "780px" }}>
        
        {/* Phone Notch/Status Bar */}
        <div className="h-10 bg-slate-950 flex items-center justify-between px-8 select-none border-b border-slate-900/60 relative shrink-0">
          <div className="w-16 h-4.5 rounded-full bg-slate-900 absolute left-1/2 -translate-x-1/2 top-2 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 font-mono">15:08</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">LTE</span>
            <div className="w-5 h-2.5 rounded-sm border border-slate-400 p-0.5 flex items-center justify-start"><div className="w-3 h-full bg-slate-400 rounded-2xs" /></div>
          </div>
        </div>

        {/* App Navigation Header */}
        <header className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500 text-slate-950 font-black">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-200">LogiTrack Store</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("history")}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${activeTab === "history" ? "bg-pink-500/10 text-pink-400" : "text-slate-400 hover:text-slate-200"}`}
            >
              My Orders
            </button>
            <Link 
              href="/"
              className="text-[9px] bg-slate-800 hover:bg-slate-750 px-2.5 py-1.5 rounded border border-slate-700 font-bold"
            >
              Exit
            </Link>
          </div>
        </header>

        {/* Dynamic Navigation Tabs Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: SHOPPING STOREFRONT */}
          {activeTab === "shop" && (
            <div className="space-y-4">
              {/* Category selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${selectedCategory === cat ? "bg-pink-600 text-white border-pink-500" : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(p => (
                  <div key={p.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-850 flex flex-col justify-between space-y-3">
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt={p.name} className="w-full h-24 object-cover rounded-xl bg-slate-900 border border-slate-900" />
                      <div className="mt-2.5">
                        <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">{p.category}</span>
                        <h4 className="font-bold text-slate-200 text-xs mt-0.5 line-clamp-1 leading-normal">{p.name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-black text-sm text-white font-mono">₹{p.price.toFixed(2)}</span>
                      {p.stock > 0 ? (
                        <button
                          onClick={() => addToCart(p)}
                          className="px-2 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white font-bold text-[10px] transition-all"
                        >
                          + Add
                        </button>
                      ) : (
                        <span className="text-[9px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SHOPPING CART */}
          {activeTab === "cart" && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab("shop")}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
              </button>

              {cart.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.product.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.product.image} alt={item.product.name} className="w-10 h-10 object-cover rounded-lg bg-slate-900 border border-slate-900" />
                          <div>
                            <h4 className="font-bold text-slate-200 text-xs leading-tight truncate max-w-[120px]">{item.product.name}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">₹{item.product.price.toFixed(2)} each</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                            <button
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-400 font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs text-slate-200 font-mono font-bold px-2">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-400 font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 rounded text-rose-400 hover:bg-slate-900/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Checkout Fields Form */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                    <h4 className="font-bold text-xs text-slate-200 border-b border-slate-900 pb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" /> Delivery Address
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Customer Name</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase">Delivery Address</label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                        />
                      </div>

                      {/* Coordinates details */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase">Latitude Coordinate</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={lat}
                            onChange={(e) => setLat(parseFloat(e.target.value) || 18.52)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase">Longitude Coordinate</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={lng}
                            onChange={(e) => setLng(parseFloat(e.target.value) || 73.85)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary and Pay */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Cart Subtotal:</span>
                      <span className="font-mono font-bold text-slate-200">₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Delivery Fee:</span>
                      <span className="font-mono text-emerald-400 font-bold">FREE</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-900 pt-3 text-sm">
                      <span className="font-bold text-slate-200">Total Price:</span>
                      <span className="font-black text-white font-mono">₹{cartTotal.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() => setShowSandboxModal(true)}
                      className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/15 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" /> Secure Sandbox Checkout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-950 border border-slate-850 text-slate-500 font-bold text-xs space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-800 mx-auto mb-1" />
                  <p>Your shopping cart is empty.</p>
                  <button
                    onClick={() => setActiveTab("shop")}
                    className="text-pink-400 hover:underline font-bold"
                  >
                    Go Shop Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDER TRACKING */}
          {activeTab === "tracking" && (
            <div className="space-y-4">
              {activeTrackingOrder ? (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-900 pb-2.5">
                      <div>
                        <h4 className="font-bold text-xs text-slate-200">Tracking: Order {activeTrackingOrder.id}</h4>
                        <span className="text-[9px] text-slate-500 block font-mono mt-0.5">Placed: {new Date(activeTrackingOrder.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        {activeTrackingOrder.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Stepper progress */}
                    <div className="space-y-3.5 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-800">
                      {[
                        { label: "Order Placed", desc: "Waiting for store dispatch confirmation", stateKey: "placed" },
                        { label: "Order Confirmed", desc: "Assigned to delivery agent", stateKey: "confirmed" },
                        { label: "Dispatched", desc: "Package picked up from store", stateKey: "dispatched" },
                        { label: "Out for Delivery", desc: "Agent is heading to your location", stateKey: "out_for_delivery" },
                        { label: "Delivered", desc: "Package handed over successfully", stateKey: "delivered" }
                      ].map((step, idx) => {
                        const activeIdx = getStatusIndex(activeTrackingOrder.status);
                        const isDone = idx <= activeIdx;
                        const isCurrent = idx === activeIdx;

                        return (
                          <div key={idx} className="relative text-xs">
                            <span className={`absolute -left-6 top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all ${isDone ? "bg-pink-500 border-pink-500 text-slate-950 font-black" : "bg-slate-950 border-slate-800 text-slate-600"}`}>
                              {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : idx + 1}
                            </span>
                            <div className="pl-1">
                              <h5 className={`font-bold ${isCurrent ? "text-pink-400" : isDone ? "text-slate-200" : "text-slate-600"}`}>
                                {step.label}
                              </h5>
                              <p className={`text-[10px] mt-0.5 ${isCurrent ? "text-slate-300" : "text-slate-500"}`}>{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Leaflet Map Tracker */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-pink-500" /> Live Agent Tracking Map
                    </h4>
                    {trackingAgent ? (
                      <div className="h-60 w-full rounded-2xl overflow-hidden border border-slate-850 bg-slate-950">
                        <DeliveryMap 
                          agents={[trackingAgent]} 
                          orders={[activeTrackingOrder]}
                          focusLatLng={[activeTrackingOrder.lat, activeTrackingOrder.lng]} 
                          warehouses={state.warehouses}
                        />
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs rounded-xl bg-slate-950 border border-slate-850 text-slate-500">
                        Map will activate once an agent is assigned and starts transit.
                      </div>
                    )}
                  </div>

                  {/* Feedback Trigger */}
                  {activeTrackingOrder.status === "delivered" && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                      <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Order Delivered!
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Your delivery completed successfully. Please take a moment to rate the delivery agent's experience.
                      </p>
                      
                      {!activeTrackingOrder.deliveryRating ? (
                        <button
                          onClick={() => {
                            setRatingOrder(activeTrackingOrder.id);
                            setSelectedRating(5);
                          }}
                          className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all shadow-md shadow-emerald-600/10"
                        >
                          Rate Experience
                        </button>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          You rated this: <span className="text-amber-400 font-black font-mono">{activeTrackingOrder.deliveryRating} / 5</span> Stars
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-950 border border-slate-850 text-slate-500 font-bold text-xs space-y-2">
                  <Play className="w-8 h-8 text-slate-800 mx-auto mb-1 animate-pulse" />
                  <p>No active order being tracked.</p>
                  <button
                    onClick={() => setActiveTab("shop")}
                    className="text-pink-400 hover:underline font-bold"
                  >
                    Start Shopping
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ORDER HISTORY & RETURNS */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <h3 className="font-bold text-xs text-slate-300">My Orders History</h3>
              <div className="space-y-3">
                {customerHistory.map(order => (
                  <div key={order.id} className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-200 text-xs">Order {order.id}</span>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">{new Date(order.timestamp).toLocaleString()}</p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${order.status === "delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : order.status === "returned" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-900 pt-2.5">
                      {order.products.map((p, idx) => (
                        <p key={idx}>
                          {p.name} <span className="font-bold text-slate-200">x{p.quantity}</span>
                        </p>
                      ))}
                      <p className="text-slate-500 pt-1">
                        Total paid: <strong className="text-white font-mono">₹{order.total.toFixed(2)}</strong> | Payment: <span className="capitalize font-semibold text-emerald-400">{order.paymentStatus}</span>
                      </p>
                    </div>

                    {/* Return Action */}
                    {order.status === "delivered" && !order.returnRequested && (
                      <button
                        onClick={() => {
                          setReturnOrder(order.id);
                          setReturnReason("Item damaged on arrival");
                        }}
                        className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-850 text-[10px] text-rose-400 border border-rose-500/25 font-bold transition-colors"
                      >
                        Request Return (24h Window)
                      </button>
                    )}

                    {order.returnRequested && (
                      <div className="p-2 rounded bg-rose-500/5 border border-rose-500/15 text-[9px] text-rose-400/80 leading-normal flex items-start gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Returned Refund: Completed. Reason: &quot;{order.returnReason}&quot;</span>
                      </div>
                    )}
                  </div>
                ))}

                {customerHistory.length === 0 && (
                  <div className="p-12 text-center rounded-2xl bg-slate-950 border border-slate-850 text-slate-500 font-bold text-xs">
                    You have not placed any orders yet.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Cart Indicator Overlay */}
        {activeTab === "shop" && cart.length > 0 && (
          <div className="p-4 bg-slate-950 border-t border-slate-850 flex items-center justify-between shrink-0 animate-fade-in relative z-20">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Subtotal</span>
                <span className="font-black text-white font-mono text-xs">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("cart")}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-pink-600/15 transition-all"
            >
              View Cart <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* App Footer Tab Bar */}
        <footer className="h-14 bg-slate-900 border-t border-slate-850 flex items-center justify-around shrink-0 relative z-30 select-none">
          <button
            onClick={() => setActiveTab("shop")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold transition-colors ${activeTab === "shop" ? "text-pink-500" : "text-slate-400 hover:text-slate-200"}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Shop
          </button>
          <button
            onClick={() => setActiveTab("cart")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold transition-colors relative ${activeTab === "cart" ? "text-pink-500" : "text-slate-400 hover:text-slate-200"}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Cart
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.5 rounded-full text-[8px] font-bold bg-pink-500 text-white">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("tracking")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold transition-colors ${activeTab === "tracking" ? "text-pink-500" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Truck className="w-4 h-4" />
            Tracking
            {state.orders.filter(o => o.customerName === customerName && (o.status !== "delivered" && o.status !== "failed" && o.status !== "returned")).length > 0 && (
              <span className="absolute -top-1.5 -right-2 w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            )}
          </button>
        </footer>

        {/* Simulated Phone Bar Footer */}
        <div className="h-5 bg-slate-950 flex items-center justify-center pb-2.5 shrink-0">
          <div className="w-28 h-1 rounded-full bg-slate-800" />
        </div>
      </div>

      {/* --- SANDBOX PAYMENT DIALOG GATEWAY MODAL --- */}
      {showSandboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-pink-500" /> Razorpay Sandbox Gateway
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed leading-normal">
              You are simulating a payment checkout. No actual money will be transacted. This sandbox environment completes payments instantly.
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 flex justify-between items-center text-xs">
              <span className="text-slate-400">Merchant Charge:</span>
              <span className="font-mono font-bold text-white">₹{cartTotal.toFixed(2)}</span>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4111 •••• •••• 1111"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM / YY"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">CVV Code</label>
                  <input
                    type="password"
                    required
                    maxLength={3}
                    placeholder="•••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSandboxModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-md shadow-pink-600/10"
                >
                  Pay Demo Total
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FEEDBACK STAR RATING MODAL --- */}
      {ratingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" /> Rate Delivery Experience
            </h3>
            {feedbackSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center text-xs font-semibold flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8" />
                <span>Thank you for your rating!</span>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <p className="text-[10px] text-slate-400 leading-normal">
                  How was your delivery service for order <strong className="text-white font-mono">{ratingOrder}</strong>? Rate from 1 to 5 stars.
                </p>
                <div className="flex justify-center gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className="p-1 transition-all"
                    >
                      <Star className={`w-8 h-8 ${star <= selectedRating ? "fill-amber-400 text-amber-400 scale-110" : "text-slate-600"}`} />
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRatingOrder(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-350"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Submit Rating
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- RETURN REQUEST DIALOG MODAL --- */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Raise Return Request
            </h3>
            {returnSuccess ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-center text-xs font-semibold flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-rose-400" />
                <span>Return request processed and refunded!</span>
              </div>
            ) : (
              <form onSubmit={handleReturnSubmit} className="space-y-4">
                <p className="text-[10px] text-slate-400 leading-normal">
                  You are raising a return for order <strong className="text-white font-mono">{returnOrder}</strong>. Please state the reason for return below.
                </p>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase">Reason for return</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="Item damaged on arrival">Item damaged on arrival</option>
                    <option value="Incorrect products shipped">Incorrect products shipped</option>
                    <option value="Quality not up to expectations">Quality not up to expectations</option>
                    <option value="Late delivery / No longer needed">Late delivery / No longer needed</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnOrder(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-350"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    Confirm Return & Refund
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
