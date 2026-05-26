"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper component to reset selection when clicking on the map background
function MapClickReset({ onReset }: { onReset: () => void }) {
  useMapEvents({
    click() {
      onReset();
    }
  });
  return null;
}

// Helper to create custom HTML/SVG icons for Leaflet markers
// Helper to create custom HTML/SVG icons for Leaflet markers
const createSvgIcon = (color: string, type: "agent" | "order" | "warehouse", isSelected?: boolean) => {
  const svg = type === "agent" 
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><circle cx="18.5" cy="17.5" r="3.5"></circle><circle cx="5.5" cy="17.5" r="3.5"></circle><circle cx="15" cy="5" r="1"></circle><path d="M12 17.5V14l-3-3 4-3 2 3h2"></path></svg>`
    : type === "order"
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M3 21V10l9-6 9 6v11H3z"></path><path d="M9 21V12h6v9H9z"></path></svg>`;

  let bgBorder = "";
  if (type === "warehouse") {
    bgBorder = "border-radius: 8px; border: 2.5px solid #4f46e5; background: #e0e7ff;";
  } else {
    bgBorder = isSelected 
      ? `border-radius: 50%; border: 3.5px solid #06b6d4; background: white; box-shadow: 0 0 12px #06b6d4;` 
      : `border-radius: 50%; border: 2px solid ${color}; background: white;`;
  }

  const iconColor = type === "warehouse" ? "#4f46e5" : (isSelected ? "#06b6d4" : color);

  return L.divIcon({
    html: `<div style="${bgBorder} color: ${iconColor}; padding: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);">${svg}</div>`,
    className: "custom-leaflet-icon",
    iconSize: isSelected ? [42, 42] : [36, 36],
    iconAnchor: isSelected ? [21, 21] : [18, 18],
    popupAnchor: [0, -18]
  });
};

interface MapProps {
  agents: Array<{
    id: string;
    name: string;
    status: "available" | "busy" | "offline";
    lat: number;
    lng: number;
    phone: string;
  }>;
  orders: Array<{
    id: string;
    customerName: string;
    address: string;
    lat: number;
    lng: number;
    status: string;
    agentId: string | null;
    routePoints?: [number, number][];
    currentRouteIndex?: number;
  }>;
  warehouses?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  focusLatLng?: [number, number];
}

export default function DeliveryMap({ agents, orders, warehouses, focusLatLng }: MapProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const getJitteredPosition = (lat: number, lng: number, id: string, status: string): [number, number] => {
    if (status !== "available") return [lat, lng];
    const num = parseInt(id.replace(/\D/g, ""), 10) || 0;
    const angle = (num * 2 * Math.PI) / 5; // Distribute agents in a circle
    const radius = 0.0025; // Small dispersion radius
    return [
      lat + Math.sin(angle) * radius,
      lng + Math.cos(angle) * radius
    ];
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-400 font-medium">
        Loading interactive map...
      </div>
    );
  }

  const center: [number, number] = focusLatLng || [18.5204, 73.8567];

  // Draw polylines from agents to their assigned orders (following OSRM road routes if loaded)
  const activeRoutes = orders
    .filter(o => o.agentId && (o.status === "confirmed" || o.status === "dispatched" || o.status === "out_for_delivery"))
    .map(o => {
      const agent = agents.find(a => a.id === o.agentId);
      if (agent) {
        let positions: Array<[number, number]> = [];
        if (o.routePoints && o.routePoints.length > 0) {
          const idx = o.currentRouteIndex ?? 0;
          positions = [
            [agent.lat, agent.lng],
            ...o.routePoints.slice(idx)
          ];
        } else {
          positions = [
            [agent.lat, agent.lng],
            [o.lat, o.lng]
          ];
        }
        const isSelected = selectedAgentId === agent.id;
        return {
          id: `${agent.id}-${o.id}`,
          positions: positions as Array<[number, number]>,
          isSelected,
          color: isSelected 
            ? "#06b6d4" // Neon cyan for selected
            : o.status === "out_for_delivery" ? "#f43f5e" : "#6366f1"
        };
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickReset onReset={() => setSelectedAgentId(null)} />

        {/* Render Warehouses */}
        {warehouses && warehouses.map(w => (
          <Marker
            key={w.id}
            position={[w.lat, w.lng]}
            icon={createSvgIcon("#4f46e5", "warehouse")}
          >
            <Popup>
              <div className="p-1 font-sans text-xs">
                <h4 className="font-bold text-indigo-700">{w.name}</h4>
                <p className="text-slate-650 font-medium mt-0.5">Primary Dispatch Hub</p>
                <p className="text-slate-500 font-mono mt-0.5">{w.lat.toFixed(4)}, {w.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Agents */}
        {agents
          .filter(a => a.status !== "offline")
          .map(agent => (
            <Marker
              key={agent.id}
              position={getJitteredPosition(agent.lat, agent.lng, agent.id, agent.status)}
              icon={createSvgIcon(
                agent.status === "busy" ? "#f59e0b" : "#10b981", 
                "agent",
                selectedAgentId === agent.id
              )}
              eventHandlers={{
                click: () => setSelectedAgentId(prev => prev === agent.id ? null : agent.id)
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <h4 className="font-bold text-slate-900">{agent.name}</h4>
                  <p className="text-slate-600 mt-0.5">Status: <span className="capitalize font-semibold">{agent.status}</span></p>
                  <p className="text-slate-600">Contact: {agent.phone}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Render Active Orders */}
        {orders
          .filter(o => o.status !== "delivered" && o.status !== "failed" && o.status !== "returned")
          .map(order => {
            const statusColors = {
              placed: "#a855f7",       // purple
              confirmed: "#3b82f6",    // blue
              dispatched: "#6366f1",   // indigo
              out_for_delivery: "#f43f5e" // rose
            };
            const color = statusColors[order.status as keyof typeof statusColors] || "#64748b";
            return (
              <Marker
                key={order.id}
                position={[order.lat, order.lng]}
                icon={createSvgIcon(color, "order")}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <h4 className="font-bold text-slate-900">Order: {order.id}</h4>
                    <p className="text-slate-600 mt-0.5">Customer: {order.customerName}</p>
                    <p className="text-slate-600">Address: {order.address}</p>
                    <p className="text-slate-600">
                      Status: <span className="capitalize font-semibold" style={{ color }}>{order.status.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Render Route Paths */}
        {activeRoutes.map((route) => {
          if (!route) return null;
          const hasSelection = selectedAgentId !== null;
          const opacity = route.isSelected 
            ? 1.0 
            : hasSelection ? 0.15 : 0.7;
          const weight = route.isSelected ? 6 : 3;
          const dashArray = route.isSelected ? undefined : "6, 6";

          return (
            <Polyline
              key={route.id}
              positions={route.positions}
              pathOptions={{
                color: route.color,
                weight,
                dashArray,
                opacity
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
