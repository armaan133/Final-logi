"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLogiTrack, Product, Order } from "@/lib/state-store";
import { generateCustomerPromise } from "@/lib/autopilot-engine";

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
});

type Tab = "shop" | "cart" | "tracking" | "history";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "shop", label: "Shop" },
  { id: "cart", label: "Cart" },
  { id: "tracking", label: "Track" },
  { id: "history", label: "Orders" },
];

const CATEGORIES = [
  "All",
  "Beverages",
  "Dairy & Alternatives",
  "Bakery",
  "Pantry",
  "Snacks",
  "Household",
];

const TRACKING_STEPS: Array<{ key: Order["status"]; label: string; desc: string }> = [
  { key: "placed", label: "Order placed", desc: "Store received the cart." },
  { key: "confirmed", label: "Confirmed", desc: "Inventory reserved and assigned." },
  { key: "dispatched", label: "Dispatched", desc: "Package picked up from the store." },
  { key: "out_for_delivery", label: "Out for delivery", desc: "Agent is heading to your address." },
  { key: "delivered", label: "Delivered", desc: "Package handed over." },
];

export default function CustomerApp() {
  const { state, createOrder, submitFeedback, requestReturn } = useLogiTrack();

  const [activeTab, setActiveTab] = useState<Tab>("shop");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [customerName, setCustomerName] = useState("Aditi Gokhale");
  const [customerPhone, setCustomerPhone] = useState("+91 95450 12345");
  const [address, setAddress] = useState("Senapati Bapat Road, Pune, Maharashtra");
  const [lat] = useState(18.5308);
  const [lng] = useState(73.8313);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"razorpay" | "stripe">("razorpay");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  const [ratingOrder, setRatingOrder] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const [returnOrder, setReturnOrder] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("Item damaged on arrival");
  const [returnSuccess, setReturnSuccess] = useState(false);

  const [cartNotice, setCartNotice] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
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

  const showNotice = (msg: string) => {
    setCartNotice(msg);
    window.setTimeout(() => setCartNotice(null), 2500);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showNotice(`${product.name} is out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showNotice(`Only ${product.stock} units available.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQty = (productId: string, delta: number) => {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return { ...item, quantity: 0 };
          if (nextQty > product.stock) {
            showNotice(`Only ${product.stock} units available.`);
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = useMemo(() => {
    return parseFloat(
      cart
        .reduce((sum, item) => sum + item.product.price * item.quantity, 0)
        .toFixed(2)
    );
  }, [cart]);

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const customerPromise = useMemo(
    () => generateCustomerPromise(state, cart, lat, lng),
    [state, cart, lat, lng]
  );

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentProcessing) return;
    const orderProds = cart.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));
    setPaymentProcessing(true);
    // Simulate sandbox gateway round-trip
    window.setTimeout(() => {
      const orderId = createOrder({
        customerName,
        customerPhone,
        address,
        lat,
        lng,
        products: orderProds,
        total: cartTotal,
        paymentProvider,
      });
      setCart([]);
      setShowPaymentModal(false);
      setPaymentProcessing(false);
      setTrackingOrderId(orderId);
      setActiveTab("tracking");
    }, 900);
  };

  // 24-hour return window enforcement
  const RETURN_WINDOW_MS = 24 * 60 * 60 * 1000;
  const isWithinReturnWindow = (order: Order) => {
    if (order.status !== "delivered") return false;
    if (order.returnRequested) return false;
    const deliveredAtMs = order.deliveredAt
      ? new Date(order.deliveredAt).getTime()
      : new Date(order.timestamp).getTime();
    return Date.now() - deliveredAtMs <= RETURN_WINDOW_MS;
  };
  const hoursRemainingForReturn = (order: Order) => {
    const deliveredAtMs = order.deliveredAt
      ? new Date(order.deliveredAt).getTime()
      : new Date(order.timestamp).getTime();
    const remaining = RETURN_WINDOW_MS - (Date.now() - deliveredAtMs);
    return Math.max(0, Math.ceil(remaining / (60 * 60 * 1000)));
  };

  const activeTrackingOrder = useMemo(() => {
    if (!trackingOrderId) return null;
    return state.orders.find((o) => o.id === trackingOrderId) || null;
  }, [state.orders, trackingOrderId]);

  const trackingAgent = useMemo(() => {
    if (!activeTrackingOrder || !activeTrackingOrder.agentId) return null;
    return state.agents.find((a) => a.id === activeTrackingOrder.agentId) || null;
  }, [activeTrackingOrder, state.agents]);

  const customerHistory = useMemo(() => {
    return state.orders.filter(
      (o) => o.customerName === customerName && o.id.startsWith("ord-")
    );
  }, [state.orders, customerName]);

  const activeCustomerOrders = useMemo(() => {
    return state.orders.filter(
      (o) =>
        o.customerName === customerName &&
        o.status !== "delivered" &&
        o.status !== "failed" &&
        o.status !== "returned"
    );
  }, [state.orders, customerName]);

  const getStatusIndex = (status: Order["status"]) => {
    const order: Order["status"][] = [
      "placed",
      "confirmed",
      "dispatched",
      "out_for_delivery",
      "delivered",
    ];
    const idx = order.indexOf(status);
    return idx === -1 ? 4 : idx;
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingOrder) {
      submitFeedback(ratingOrder, selectedRating);
      setFeedbackSuccess(true);
      window.setTimeout(() => {
        setRatingOrder(null);
        setFeedbackSuccess(false);
      }, 1500);
    }
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnOrder) {
      requestReturn(returnOrder, returnReason);
      setReturnSuccess(true);
      window.setTimeout(() => {
        setReturnOrder(null);
        setReturnSuccess(false);
      }, 1500);
    }
  };

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              LogiTrack
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Store
            </span>
          </div>

          <nav aria-label="Customer sections" className="flex items-center gap-1">
            {TABS.map((t) => {
              const count =
                t.id === "cart"
                  ? cartItemCount
                  : t.id === "tracking"
                  ? activeCustomerOrders.length
                  : 0;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors focus-visible:outline-none ${
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{t.label}</span>
                  {count > 0 ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  ) : null}
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 -bottom-px h-px bg-foreground"
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <Link
            href="/"
            className="hidden text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline"
          >
            Exit
          </Link>
        </div>
      </header>

      {/* Toast notice */}
      {cartNotice ? (
        <div className="pointer-events-none fixed left-1/2 top-20 z-40 -translate-x-1/2 border border-border bg-card px-4 py-2 text-xs text-foreground shadow-sm">
          {cartNotice}
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {(activeTab === "shop" || activeTab === "cart") && (
          <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Catalog */}
            <div>
              <header>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Catalog
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Fresh essentials, ready to dispatch
                </h1>
              </header>

              <div className="mt-6 flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:gap-4">
                <input
                  type="search"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search product, SKU, or category"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {CATEGORIES.map((c) => {
                    const isOn = selectedCategory === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedCategory(c)}
                        className={`text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline ${
                          isOn
                            ? "font-medium text-foreground underline"
                            : "text-muted-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="mt-8 border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No products match that filter.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("All");
                      setProductQuery("");
                    }}
                    className="text-foreground underline underline-offset-4"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <ul className="mt-6 divide-y divide-border border-b border-border">
                  {filteredProducts.map((p) => {
                    const inCart = cart.find((c) => c.product.id === p.id);
                    const lowStock = p.stock > 0 && p.stock < 10;
                    return (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {p.category}
                          </p>
                          <h3 className="mt-0.5 text-sm font-medium text-foreground">
                            {p.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.stock <= 0
                              ? "Out of stock"
                              : lowStock
                              ? `Only ${p.stock} left`
                              : `${p.stock} in stock`}
                          </p>
                        </div>
                        <div className="flex items-baseline gap-5">
                          <p className="font-mono text-sm tabular-nums text-foreground">
                            ₹{p.price.toFixed(2)}
                          </p>
                          {p.stock > 0 ? (
                            <button
                              type="button"
                              onClick={() => addToCart(p)}
                              className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                            >
                              {inCart ? `Add another →` : "Add →"}
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Sold out
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Cart rail */}
            <aside className="border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-20 lg:self-start">
              <header className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Cart
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                </p>
              </header>

              {cart.length === 0 ? (
                <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                  Your cart is empty. Add items from the catalog.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col border-t border-border">
                  {cart.map((item) => (
                    <li
                      key={item.product.id}
                      className="flex items-baseline justify-between gap-3 border-b border-border py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {item.product.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="px-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <span className="mx-1 tabular-nums text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="px-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
                            aria-label="Increase"
                          >
                            +
                          </button>
                          <span className="ml-2">
                            × ₹{item.product.price.toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Delivery promise */}
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Estimated delivery
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {customerPromise.title}{" "}
                  <span className="text-muted-foreground">
                    · {customerPromise.etaRange}
                  </span>
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {customerPromise.summary}
                </p>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {customerPromise.confidence}%
                  </span>{" "}
                  confidence · {customerPromise.hubName}
                </p>
              </div>

              {/* Identity */}
              <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="border-b border-border bg-transparent pb-1 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="border-b border-border bg-transparent pb-1 font-mono text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Address</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border-b border-border bg-transparent pb-1 text-sm text-foreground focus:border-foreground focus:outline-none"
                  />
                </label>
              </div>

              {/* Total + checkout */}
              <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-mono text-base font-semibold tabular-nums text-foreground">
                  ₹{cartTotal.toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowPaymentModal(true)}
                className="mt-4 inline-flex w-full items-center justify-center rounded-none border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Sandbox checkout →
              </button>
            </aside>
          </section>
        )}

        {activeTab === "tracking" && (
          <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <button
                type="button"
                onClick={() => setActiveTab("shop")}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
              >
                ← Back to store
              </button>

              {activeTrackingOrder ? (
                <div className="mt-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Tracking
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Order {activeTrackingOrder.id.replace("ord-", "#")}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {activeTrackingOrder.address}
                  </p>
                  <p className="mt-1 text-sm capitalize text-foreground">
                    {activeTrackingOrder.status.replace(/_/g, " ")}
                  </p>

                  <ol className="mt-6 flex flex-col border-t border-border">
                    {TRACKING_STEPS.map((step, idx) => {
                      const activeIdx = getStatusIndex(activeTrackingOrder.status);
                      const isDone = idx <= activeIdx;
                      const isCurrent = idx === activeIdx;
                      return (
                        <li
                          key={step.key}
                          className="flex items-baseline gap-4 border-b border-border py-3 last:border-b-0"
                        >
                          <span
                            className={`w-8 shrink-0 font-mono text-xs tabular-nums ${
                              isDone ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm ${
                                isCurrent
                                  ? "font-semibold text-foreground"
                                  : isDone
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {step.desc}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {activeTrackingOrder.status === "delivered" && (
                    <div className="mt-6 border-t border-border pt-4">
                      <p className="text-sm leading-relaxed text-foreground">
                        Delivered. Rate the experience so the owner console picks it up.
                      </p>
                      {!activeTrackingOrder.deliveryRating ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRatingOrder(activeTrackingOrder.id);
                            setSelectedRating(5);
                          }}
                          className="mt-3 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                        >
                          Rate experience →
                        </button>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Rated{" "}
                          <span className="font-medium text-foreground">
                            {activeTrackingOrder.deliveryRating} / 5
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No order is selected for tracking.{" "}
                  {activeCustomerOrders.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTrackingOrderId(activeCustomerOrders[0].id)}
                      className="text-foreground underline underline-offset-4"
                    >
                      Track latest
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab("shop")}
                      className="text-foreground underline underline-offset-4"
                    >
                      Start a delivery
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Live map — single visual proof */}
            <div className="border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Live position
                </p>
              </div>
              {activeTrackingOrder && trackingAgent ? (
                <div className="h-[420px] w-full bg-background lg:h-[520px]">
                  <DeliveryMap
                    agents={[trackingAgent]}
                    orders={[activeTrackingOrder]}
                    focusLatLng={[activeTrackingOrder.lat, activeTrackingOrder.lng]}
                    warehouses={state.warehouses}
                  />
                </div>
              ) : (
                <div className="flex h-[420px] items-center justify-center bg-background lg:h-[520px]">
                  <p className="text-sm text-muted-foreground">
                    Map activates once an agent is assigned.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "history" && (
          <section>
            <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-5">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Past orders
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Receipts and returns
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("shop")}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Continue shopping →
              </button>
            </header>

            {customerHistory.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                You haven&apos;t placed any orders yet.{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("shop")}
                  className="text-foreground underline underline-offset-4"
                >
                  Shop the catalog
                </button>
                .
              </p>
            ) : (
              <ul className="mt-6 flex flex-col">
                {customerHistory.map((order) => (
                  <li
                    key={order.id}
                    className="border-b border-border py-6 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <p className="font-mono text-sm text-foreground">
                        {order.id.replace("ord-", "#")}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {order.status} ·{" "}
                        <span className="font-mono tabular-nums">
                          {new Date(order.timestamp).toLocaleDateString()}
                        </span>
                      </p>
                    </div>

                    <ul className="mt-3 flex flex-col gap-0.5 text-sm text-muted-foreground">
                      {order.products.map((p, idx) => (
                        <li key={idx}>
                          <span className="tabular-nums">{p.quantity}</span>{" "}
                          × <span className="text-foreground">{p.name}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                      <p className="font-mono text-sm tabular-nums text-foreground">
                        ₹{order.total.toFixed(2)}
                      </p>
                      {isWithinReturnWindow(order) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReturnOrder(order.id);
                            setReturnReason("Item damaged on arrival");
                          }}
                          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                        >
                          Request return →{" "}
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {hoursRemainingForReturn(order)}h left
                          </span>
                        </button>
                      ) : order.status === "delivered" && !order.returnRequested ? (
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Return window closed
                        </p>
                      ) : null}
                    </div>

                    {order.paymentReference ? (
                      <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
                        {order.paymentProvider === "stripe" ? "Stripe" : "Razorpay"} ·{" "}
                        <span className="font-mono">{order.paymentReference}</span>
                      </p>
                    ) : null}

                    {order.returnRequested ? (
                      <p className="mt-3 text-xs italic text-muted-foreground">
                        Refund completed. Reason: &quot;{order.returnReason}&quot;
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {/* Payment modal — minimal, no fake card placeholders */}
      {showPaymentModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-border bg-card p-6 sm:p-7">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Sandbox checkout
              </p>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Test mode
              </span>
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Confirm your order
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No real money moves. This routes through{" "}
              <span className="font-medium text-foreground">
                {paymentProvider === "stripe" ? "Stripe" : "Razorpay"} test mode
              </span>{" "}
              and settles instantly.
            </p>

            <fieldset className="mt-5 border-y border-border py-4">
              <legend className="px-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Payment gateway
              </legend>
              <div role="radiogroup" aria-label="Payment provider" className="mt-2 grid grid-cols-2 gap-2">
                {(["razorpay", "stripe"] as const).map((p) => {
                  const on = paymentProvider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPaymentProvider(p)}
                      className={`flex flex-col items-start gap-0.5 border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        on
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {p === "razorpay" ? "Razorpay" : "Stripe"}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {p === "razorpay" ? "rzp_test_*" : "pk_test_*"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <dl className="mt-4 flex flex-col gap-2 border-b border-border pb-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Items</dt>
                <dd className="tabular-nums text-foreground">{cartItemCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Delivery to</dt>
                <dd className="max-w-[60%] truncate text-right text-foreground">
                  {address}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-mono font-semibold tabular-nums text-foreground">
                  ₹{cartTotal.toFixed(2)}
                </dd>
              </div>
            </dl>

            <form
              onSubmit={handlePaymentSubmit}
              className="mt-5 flex items-center justify-end gap-5"
            >
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentProcessing}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentProcessing}
                className="inline-flex items-center border border-foreground bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {paymentProcessing
                  ? `Authorising ${paymentProvider === "stripe" ? "Stripe" : "Razorpay"}…`
                  : `Pay ₹${cartTotal.toFixed(2)} →`}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* Rating modal */}
      {ratingOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-border bg-card p-6 sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Rate delivery
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Order {ratingOrder.replace("ord-", "#")}
            </h2>

            {feedbackSuccess ? (
              <p className="mt-4 text-sm text-foreground">
                Thanks — the owner console has your rating.
              </p>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="mt-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  How was the delivery? Pick a score from 1 to 5.
                </p>
                <div
                  role="radiogroup"
                  aria-label="Rating"
                  className="mt-4 flex gap-1"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const on = star <= selectedRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={selectedRating === star}
                        onClick={() => setSelectedRating(star)}
                        className={`inline-flex h-9 w-9 items-center justify-center border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          on
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {star}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex items-center justify-end gap-5">
                  <button
                    type="button"
                    onClick={() => setRatingOrder(null)}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center border border-foreground bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Submit rating →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {/* Return modal */}
      {returnOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md border border-border bg-card p-6 sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Return request
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Order {returnOrder.replace("ord-", "#")}
            </h2>

            {returnSuccess ? (
              <p className="mt-4 text-sm text-foreground">
                Return processed. Refund queued.
              </p>
            ) : (
              <form onSubmit={handleReturnSubmit} className="mt-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tell us what went wrong. The refund is automatic in the demo.
                </p>

                <label className="mt-4 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Reason</span>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="border-b border-border bg-transparent pb-1 text-sm text-foreground focus:border-foreground focus:outline-none"
                  >
                    <option value="Item damaged on arrival">
                      Item damaged on arrival
                    </option>
                    <option value="Incorrect products shipped">
                      Incorrect products shipped
                    </option>
                    <option value="Quality not up to expectations">
                      Quality not up to expectations
                    </option>
                    <option value="Late delivery / No longer needed">
                      Late delivery / No longer needed
                    </option>
                  </select>
                </label>

                <div className="mt-5 flex items-center justify-end gap-5">
                  <button
                    type="button"
                    onClick={() => setReturnOrder(null)}
                    className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center border border-foreground bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Confirm return →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
