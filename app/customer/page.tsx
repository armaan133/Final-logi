"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLogiTrack, Product, Order } from "@/lib/state-store";
import { generateCustomerPromise } from "@/lib/autopilot-engine";
import { 
  ShoppingBag, Trash2, MapPin, CreditCard, Star, Search,
  ArrowLeft, Check, CheckCircle2, ShieldAlert, Truck, Play
} from "lucide-react";
import Link from "next/link";

// Dynamically import map to prevent SSR Leaflet errors
const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), { ssr: false });

export default function CustomerApp() {
  const { state, createOrder, submitFeedback, requestReturn } = useLogiTrack();

  const [activeTab, setActiveTab] = useState<"shop" | "cart" | "tracking" | "history">("shop");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [customerName, setCustomerName] = useState("Aditi Gokhale");
  const [customerPhone, setCustomerPhone] = useState("+91 95450 12345");
  const [address, setAddress] = useState("Senapati Bapat Road, Pune, Maharashtra");
  const [lat, setLat] = useState(18.5308);
  const [lng, setLng] = useState(73.8313);

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
    return state.products.filter(p => {
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      const query = productQuery.trim().toLowerCase();
      const matchesQuery =
        query.length === 0 ||
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [state.products, selectedCategory, productQuery]);

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

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);
  const customerPromise = useMemo(
    () => generateCustomerPromise(state, cart, lat, lng),
    [state, cart, lat, lng]
  );

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

  const activeCustomerOrders = useMemo(() => {
    return state.orders.filter(o =>
      o.customerName === customerName &&
      o.status !== "delivered" &&
      o.status !== "failed" &&
      o.status !== "returned"
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
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!hydrated) return null;

  return (
    <div className="logi-store-page min-h-screen bg-slate-950 text-slate-100 font-sans relative">
      <div className="logi-stage-grid" />

      <header className="store-topbar sticky top-0 z-40 border-b border-slate-800">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-pink-500 text-slate-950">
              <ShoppingBag className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">LogiTrack Store</p>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:block">
                Customer delivery workspace
              </p>
            </div>
          </div>

          <nav className="store-tabs" aria-label="Customer sections">
            {[
              { id: "shop", label: "Shop" },
              { id: "cart", label: "Cart", count: cartItemCount },
              { id: "tracking", label: "Track", count: activeCustomerOrders.length },
              { id: "history", label: "Orders" },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`store-tab ${activeTab === item.id ? "is-active" : ""}`}
              >
                <span>{item.label}</span>
                {item.count ? <span className="store-tab-count">{item.count}</span> : null}
              </button>
            ))}
          </nav>

          <Link href="/" className="store-secondary hidden sm:inline-flex">
            Exit
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
        <section className="store-hero reveal-item">
          <div className="max-w-3xl">
            <p className="store-eyebrow">Same data stream as dispatch</p>
            <h1>Shop, checkout, and track the handoff without leaving the store.</h1>
            <p>
              Browse the live catalog, confirm the Pune delivery point, and follow the
              assigned agent as the owner console updates the same order.
            </p>
          </div>
          <div className="store-hero-metrics">
            <div>
              <span>{state.products.length}</span>
              <p>products</p>
            </div>
            <div>
              <span>{cartItemCount}</span>
              <p>in cart</p>
            </div>
            <div>
              <span>{activeCustomerOrders.length}</span>
              <p>active</p>
            </div>
          </div>
        </section>

        {(activeTab === "shop" || activeTab === "cart") && (
          <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="store-panel reveal-item p-4 sm:p-5 [animation-delay:90ms]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="store-eyebrow">Catalog</p>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    Fresh essentials ready for dispatch
                  </h2>
                </div>

                <label className="store-search">
                  <Search className="size-4" />
                  <input
                    type="search"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search product, SKU, or category"
                  />
                </label>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`store-chip ${selectedCategory === cat ? "is-active" : ""}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map(p => {
                  const isLowStock = p.stock > 0 && p.stock < 10;

                  return (
                    <article key={p.id} className="store-product-card">
                      <div className="store-product-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt={p.name} />
                        <span className={`store-stock ${isLowStock ? "is-risk" : ""}`}>
                          {p.stock > 0 ? `${p.stock} left` : "Sold out"}
                        </span>
                      </div>
                      <div className="store-product-copy">
                        <p>{p.category}</p>
                        <h3>{p.name}</h3>
                        <span>{p.sku}</span>
                      </div>
                      <div className="store-product-actions">
                        <strong>₹{p.price.toFixed(2)}</strong>
                        {p.stock > 0 ? (
                          <button type="button" onClick={() => addToCart(p)}>
                            Add
                          </button>
                        ) : (
                          <span className="store-unavailable">Out</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="store-empty mt-4">
                  <ShoppingBag className="size-6" />
                  <p>No products match that filter.</p>
                  <button type="button" onClick={() => { setSelectedCategory("All"); setProductQuery(""); }}>
                    Reset filters
                  </button>
                </div>
              )}
            </div>

            <aside className="store-rail reveal-item p-4 sm:p-5 [animation-delay:160ms]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="store-eyebrow">Checkout rail</p>
                  <h2 className="text-lg font-black text-white">Your cart</h2>
                </div>
                <span className="store-cart-count">{cartItemCount}</span>
              </div>

              {cart.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {cart.map(item => (
                    <div key={item.product.id} className="store-cart-row">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.product.image} alt={item.product.name} />
                      <div className="min-w-0 flex-1">
                        <p>{item.product.name}</p>
                        <span>₹{item.product.price.toFixed(2)} each</span>
                      </div>
                      <div className="store-qty">
                        <button type="button" onClick={() => updateCartQty(item.product.id, -1)}>-</button>
                        <strong>{item.quantity}</strong>
                        <button type="button" onClick={() => updateCartQty(item.product.id, 1)}>+</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="store-remove"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="store-empty mt-4">
                  <ShoppingBag className="size-7" />
                  <p>Your cart is ready for the first item.</p>
                  <button type="button" onClick={() => setActiveTab("shop")}>
                    Browse products
                  </button>
                </div>
              )}

              <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                <div className={`promise-card signal-${customerPromise.stockSignal}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="store-eyebrow">Promise Engine</p>
                      <h3>{customerPromise.title}</h3>
                    </div>
                    <span>{customerPromise.etaRange}</span>
                  </div>
                  <p>{customerPromise.summary}</p>
                  <div className="promise-meta">
                    <strong>{customerPromise.confidence}% confidence</strong>
                    <small>{customerPromise.hubName}</small>
                  </div>
                  <ul>
                    {customerPromise.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>

                <div className="store-field">
                  <label>Customer</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="store-field">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="store-field">
                  <label>Delivery address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="store-field">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 18.52)}
                    />
                  </div>
                  <div className="store-field">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 73.85)}
                    />
                  </div>
                </div>
              </div>

              <div className="store-total mt-5">
                <div>
                  <span>Subtotal</span>
                  <strong>₹{cartTotal.toFixed(2)}</strong>
                </div>
                <div>
                  <span>Delivery</span>
                  <strong className="text-emerald-300">Free</strong>
                </div>
                <div className="is-grand">
                  <span>Total</span>
                  <strong>₹{cartTotal.toFixed(2)}</strong>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowSandboxModal(true)}
                className="store-checkout"
              >
                <CreditCard className="size-4" />
                Secure sandbox checkout
              </button>
            </aside>
          </section>
        )}

        {activeTab === "tracking" && (
          <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="store-panel reveal-item p-5">
              <button
                type="button"
                onClick={() => setActiveTab("shop")}
                className="store-secondary mb-5"
              >
                <ArrowLeft className="size-3.5" /> Back to store
              </button>

              {activeTrackingOrder ? (
                <div>
                  <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="store-eyebrow">Tracking</p>
                      <h2 className="text-2xl font-black text-white">
                        Order {activeTrackingOrder.id}
                      </h2>
                      <p className="mt-2 text-sm text-slate-400">
                        {activeTrackingOrder.address}
                      </p>
                    </div>
                    <span className="store-status-badge">
                      {activeTrackingOrder.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      { label: "Order placed", desc: "Store received the cart." },
                      { label: "Confirmed", desc: "Inventory reserved and assigned." },
                      { label: "Dispatched", desc: "Package picked up from the store." },
                      { label: "Out for delivery", desc: "Agent is heading to your address." },
                      { label: "Delivered", desc: "Package handed over successfully." }
                    ].map((step, idx) => {
                      const activeIdx = getStatusIndex(activeTrackingOrder.status);
                      const isDone = idx <= activeIdx;
                      const isCurrent = idx === activeIdx;

                      return (
                        <div key={step.label} className={`tracking-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}>
                          <span>{isDone ? <Check className="size-3" /> : idx + 1}</span>
                          <div>
                            <p>{step.label}</p>
                            <small>{step.desc}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeTrackingOrder.status === "delivered" && (
                    <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <h3 className="flex items-center gap-2 text-sm font-black text-emerald-300">
                        <CheckCircle2 className="size-4" /> Order delivered
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Rate the delivery agent after handoff so the owner console receives the feedback.
                      </p>
                      {!activeTrackingOrder.deliveryRating ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRatingOrder(activeTrackingOrder.id);
                            setSelectedRating(5);
                          }}
                          className="store-secondary mt-3"
                        >
                          Rate experience
                        </button>
                      ) : (
                        <p className="mt-3 text-xs font-bold text-slate-400">
                          Rated <span className="text-amber-300">{activeTrackingOrder.deliveryRating} / 5</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="store-empty min-h-80">
                  <Play className="size-8" />
                  <p>No order is selected for tracking.</p>
                  {activeCustomerOrders.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTrackingOrderId(activeCustomerOrders[0].id)}
                    >
                      Track latest order
                    </button>
                  ) : (
                    <button type="button" onClick={() => setActiveTab("shop")}>
                      Start a delivery
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="store-panel reveal-item overflow-hidden p-0 [animation-delay:120ms]">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div>
                  <p className="store-eyebrow">Live map</p>
                  <h2 className="text-base font-black text-white">Agent and delivery point</h2>
                </div>
                <Truck className="size-5 text-slate-400" />
              </div>
              {activeTrackingOrder && trackingAgent ? (
                <div className="h-[520px] min-h-80 w-full bg-slate-950">
                  <DeliveryMap
                    agents={[trackingAgent]}
                    orders={[activeTrackingOrder]}
                    focusLatLng={[activeTrackingOrder.lat, activeTrackingOrder.lng]}
                    warehouses={state.warehouses}
                  />
                </div>
              ) : (
                <div className="store-empty min-h-[520px]">
                  <MapPin className="size-8" />
                  <p>Map activates after the order has an assigned agent.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "history" && (
          <section className="store-panel reveal-item mt-5 p-5">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="store-eyebrow">Order history</p>
                <h2 className="text-2xl font-black text-white">Returns and receipts</h2>
              </div>
              <button type="button" onClick={() => setActiveTab("shop")} className="store-secondary">
                Continue shopping
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {customerHistory.map(order => (
                <article key={order.id} className="store-order-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-white">Order {order.id}</p>
                      <span className="font-mono text-[11px] text-slate-500">
                        {new Date(order.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <span className={`store-status-badge ${order.status === "returned" ? "is-danger" : ""}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-xs text-slate-400">
                    {order.products.map((p, idx) => (
                      <p key={idx}>
                        {p.name} <span className="font-bold text-white">x{p.quantity}</span>
                      </p>
                    ))}
                    <p className="pt-2">
                      Total paid: <strong className="font-mono text-white">₹{order.total.toFixed(2)}</strong>
                    </p>
                  </div>

                  {order.status === "delivered" && !order.returnRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        setReturnOrder(order.id);
                        setReturnReason("Item damaged on arrival");
                      }}
                      className="store-return"
                    >
                      Request return
                    </button>
                  )}

                  {order.returnRequested && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-300">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                      <span>Refund completed. Reason: &quot;{order.returnReason}&quot;</span>
                    </div>
                  )}
                </article>
              ))}

              {customerHistory.length === 0 && (
                <div className="store-empty md:col-span-2">
                  <ShoppingBag className="size-8" />
                  <p>You have not placed any orders yet.</p>
                  <button type="button" onClick={() => setActiveTab("shop")}>
                    Shop the catalog
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

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
