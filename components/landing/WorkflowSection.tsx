"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { BarChart3, Truck, Package, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

const agents = [
  {
    id: "crm",
    name: "Forecasting Agent",
    icon: BarChart3,
    description: "An agent that watches stock levels, predicts demand based on historical data, and surfaces restock actions before you run out of inventory.",
  },
  {
    id: "routing",
    name: "Dispatch & Routing Agent",
    icon: Truck,
    description: "An agent that automatically assigns incoming orders to the closest available driver, optimizes paths, and updates ETAs in real-time.",
  },
  {
    id: "support",
    name: "Customer Operations Agent",
    icon: Package,
    description: "An agent that reads customer order updates, checks delivery status traces, and automatically handles routine return requests.",
  },
  {
    id: "compliance",
    name: "Compliance Agent",
    icon: ShieldCheck,
    description: "An agent that reviews driver activity, tracks successful deliveries, and generates end-of-day payout reports for accounting.",
  },
];

export function WorkflowSection() {
  const [activeAgent, setActiveAgent] = useState(agents[0].id);

  return (
    <section id="agents" className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-16">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Deploy AI agents across all workflows
          </h2>
        </div>

        <div className="flex flex-col gap-0 border-t border-border">
          {agents.map((agent) => {
            const isActive = activeAgent === agent.id;
            const Icon = agent.icon;
            
            return (
              <div key={agent.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveAgent(isActive ? "" : agent.id)}
                  className="group flex w-full items-center gap-4 py-6 text-left transition-colors focus-visible:outline-none focus-visible:bg-secondary/50 rounded-lg px-2 -mx-2"
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-300 ${isActive ? `bg-accent/10 text-accent ring-accent/20 scale-100 opacity-100` : "bg-secondary text-muted-foreground ring-border scale-90 opacity-70 group-hover:scale-100 group-hover:opacity-100 group-hover:text-foreground"}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className={`flex-1 text-xl sm:text-2xl font-medium transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"}`}>
                    {agent.name}
                  </span>
                </button>
                
                <motion.div
                  initial={false}
                  animate={{ 
                    height: isActive ? "auto" : 0,
                    opacity: isActive ? 1 : 0,
                    paddingBottom: isActive ? "24px" : 0
                  }}
                  className="overflow-hidden px-2 -mx-2"
                >
                  <p className="max-w-[48ch] text-[15px] leading-[1.6] text-muted-foreground pl-12">
                    {agent.description}
                  </p>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
