"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { BarChart3, Truck, Package, ShieldCheck } from "lucide-react";

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

const accordionTransition: any = {
  height: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  opacity: { duration: 0.25, ease: "easeInOut" },
  paddingBottom: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
};

const cardVariants: any = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: "easeIn" } },
};

export function WorkflowSection() {
  const [activeAgent, setActiveAgent] = useState(agents[0].id);
  const selectedAgent = agents.find((agent) => agent.id === activeAgent) ?? agents[0];
  const SelectedIcon = selectedAgent.icon;

  return (
    <section id="agents" className="relative border-t border-border px-4 py-24 sm:px-6 md:py-28 lg:px-10">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1fr] lg:gap-28">
          <div className="max-w-[620px]">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Platform
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.04]">
              Deploy AI agents across all workflows
            </h2>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
              Every part of your supply chain — from demand prediction to driver payouts — is handled by a dedicated agent that reasons over your live data and proposes actions for your approval.
            </p>

            <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-xl border border-border">
              <div className="p-4">
                <p className="text-2xl font-semibold tracking-tight text-foreground">4</p>
                <p className="mt-1 text-xs text-muted-foreground">Active agents</p>
              </div>
              <div className="border-l border-border p-4">
                <p className="text-2xl font-semibold tracking-tight text-foreground">&lt; 1s</p>
                <p className="mt-1 text-xs text-muted-foreground">Decision latency</p>
              </div>
              <div className="border-l border-border p-4">
                <p className="text-2xl font-semibold tracking-tight text-foreground">100%</p>
                <p className="mt-1 text-xs text-muted-foreground">Human sign-off</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.article
                key={selectedAgent.id}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="mt-8 rounded-xl border border-border bg-background p-4 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
                    <SelectedIcon className="size-4" />
                  </span>
                  <p className="font-semibold text-foreground">{selectedAgent.name}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {selectedAgent.description}
                </p>
              </motion.article>
            </AnimatePresence>
          </div>

          <div className="flex w-full max-w-[640px] flex-col gap-0 border-t border-border lg:justify-self-end">
            {agents.map((agent) => {
              const isActive = activeAgent === agent.id;
              const Icon = agent.icon;

              return (
                <div key={agent.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setActiveAgent(isActive ? "" : agent.id)}
                    className="group flex w-full items-center gap-4 rounded-lg px-1 py-5 text-left transition-colors focus-visible:bg-secondary/50 focus-visible:outline-none"
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-300 ${isActive ? "bg-accent/10 text-accent ring-accent/20 scale-100 opacity-100" : "bg-secondary text-muted-foreground ring-border scale-90 opacity-70 group-hover:scale-100 group-hover:opacity-100 group-hover:text-foreground"}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className={`flex-1 text-[1.95rem] font-medium leading-tight tracking-tight transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"}`}>
                      {agent.name}
                    </span>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: isActive ? "auto" : 0,
                      opacity: isActive ? 1 : 0,
                      paddingBottom: isActive ? "20px" : 0
                    }}
                    transition={accordionTransition}
                    className="overflow-hidden"
                  >
                    <p className="max-w-[48ch] pl-12 text-[15px] leading-[1.6] text-muted-foreground">
                      {agent.description}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
