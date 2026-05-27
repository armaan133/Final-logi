"use client";

import { useMemo } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  autopilotGraphNodes,
  generateAutopilotInsights,
  type AutopilotAction,
  type AutopilotInsight,
  type AutopilotInsightType,
} from "@/lib/autopilot-engine";
import type { LogiTrackState } from "@/lib/state-store";

const labelByType: Record<AutopilotInsightType, string> = {
  dispatch: "Dispatch agent",
  inventory: "Inventory agent",
  customer: "Customer agent",
  finance: "Finance agent",
  exception: "Exception agent",
};

interface AutopilotControlTowerProps {
  state: LogiTrackState;
  compact?: boolean;
  onAction?: (action: AutopilotAction, insight: AutopilotInsight) => void;
}

export function AutopilotControlTower({
  state,
  compact = false,
  onAction,
}: AutopilotControlTowerProps) {
  const insights = useMemo(() => generateAutopilotInsights(state), [state]);
  const primary = insights[0];
  const activeSignals = insights.filter((i) => i.urgency !== "low").length;
  const overallConfidence = primary?.confidence ?? 68;

  return (
    <section
      className={`flex min-w-0 flex-col border border-border bg-card ${
        compact ? "gap-6 p-5" : "gap-8 p-7"
      }`}
    >
      {/* Header — one column, no decorative chip, no big-number side card */}
      <header className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          LogiTrack autopilot
        </p>
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Control tower for the messy middle.
        </h2>
        <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
          Watches inventory, dispatch, customers, returns, and plan pressure —
          then explains the next move before applying it.
        </p>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{overallConfidence}%</span>
          <span> confidence · </span>
          <span className="font-medium text-foreground">{activeSignals}</span>
          <span> active {activeSignals === 1 ? "signal" : "signals"}</span>
        </p>
      </header>

      {/* Agent pipeline — single muted meta line, no numbered boxes */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Pipeline ·{" "}
        </span>
        {autopilotGraphNodes.map((node, i) => (
          <span key={node}>
            <span className="text-foreground">{node}</span>
            {i < autopilotGraphNodes.length - 1 ? (
              <span className="px-1.5 text-muted-foreground/50">/</span>
            ) : null}
          </span>
        ))}
      </p>

      {/* Insight cards — flat, editorial */}
      {insights.length > 0 ? (
        <div className="flex flex-col">
          {insights.map((insight, index) => {
            const isLast = index === insights.length - 1;
            return (
              <article
                key={insight.id}
                className={`flex flex-col gap-4 py-6 ${
                  index === 0 ? "" : "border-t border-border"
                } ${isLast ? "pb-0" : ""}`}
              >
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {labelByType[insight.type]}
                  </p>
                  <h3 className="text-balance text-lg font-semibold leading-snug text-foreground">
                    {insight.title}
                  </h3>
                </div>

                <p className="max-w-[64ch] text-sm leading-relaxed text-muted-foreground">
                  {insight.summary}
                </p>

                <p className="text-sm leading-relaxed text-foreground">
                  <span className="text-muted-foreground">Recommendation — </span>
                  {insight.recommendation}
                </p>

                {insight.evidence.length > 0 ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {insight.evidence
                      .slice(0, compact ? 2 : 3)
                      .join("  ·  ")}
                  </p>
                ) : null}

                <div className="mt-1 flex items-center justify-between gap-4 pt-1">
                  <p className="text-xs tabular-nums text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {insight.confidence}%
                    </span>
                    <span> confidence</span>
                  </p>

                  {insight.action ? (
                    <button
                      type="button"
                      onClick={() => onAction?.(insight.action!, insight)}
                      className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      {insight.action.label}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-foreground" />
          Operating nominally — every signal is inside its band.
        </div>
      )}
    </section>
  );
}
