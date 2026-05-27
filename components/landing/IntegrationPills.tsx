"use client";

import { motion } from "framer-motion";
import { Box, Truck, CreditCard, HeadphonesIcon, Building2, BarChart3, Globe, Package } from "lucide-react";

const integrations = [
  { name: "Shopify", icon: Package, category: "Commerce" },
  { name: "NetSuite", icon: Building2, category: "ERP" },
  { name: "SAP", icon: BarChart3, category: "ERP" },
  { name: "Salesforce", icon: Globe, category: "CRM" },
  { name: "Stripe", icon: CreditCard, category: "Payments" },
  { name: "ShipBob", icon: Truck, category: "Fulfillment" },
  { name: "Flexport", icon: Box, category: "Freight" },
  { name: "Zendesk", icon: HeadphonesIcon, category: "Support" },
];

export function IntegrationPills() {
  return (
    <section id="integrations" className="relative py-28 md:py-36 px-4 sm:px-6 lg:px-8 border-t border-border">
      <div className="mx-auto max-w-[1000px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Integrations
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Works with your stack
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground leading-relaxed">
            Native connections to the tools you already use. No re-platforming required.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border"
        >
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.name}
                className="group bg-background p-6 sm:p-8 text-center transition-colors hover:bg-secondary/30"
              >
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground transition-colors group-hover:text-foreground group-hover:border-accent/20 group-hover:bg-accent/5">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{integration.category}</p>
              </div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 text-center text-sm text-muted-foreground"
        >
          Plus custom API access for proprietary systems.{" "}
          <a
            href="#"
            className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
          >
            Read the docs
          </a>
        </motion.p>
      </div>
    </section>
  );
}
