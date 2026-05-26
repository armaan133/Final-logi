"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CreditCard,
  PackagePlus,
  Route,
  Users,
  Zap,
} from "lucide-react";
import {
  autopilotGraphNodes,
  generateAutopilotInsights,
  type AutopilotAction,
  type AutopilotInsight,
  type AutopilotInsightType,
} from "@/lib/autopilot-engine";
import type { LogiTrackState } from "@/lib/state-store";

const iconByType: Record<AutopilotInsightType, typeof Route> = {
  dispatch: Route,
  inventory: PackagePlus,
  customer: Users,
  finance: CreditCard,
  exception: AlertTriangle,
};

const labelByType: Record<AutopilotInsightType, string> = {
  dispatch: "Dispatch Agent",
  inventory: "Inventory Agent",
  customer: "Customer Agent",
  finance: "Finance Agent",
  exception: "Exception Agent",
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
  const activeSignals = insights.filter((insight) => insight.urgency !== "low").length;
  const overallConfidence = primary?.confidence ?? 68;

  return (
    <section className={`autopilot-tower ${compact ? "is-compact" : ""}`}>
      <div className="autopilot-header">
        <div className="autopilot-header-copy">
          <div className="autopilot-title-row">
            <p className="autopilot-eyebrow">LogiTrack Autopilot</p>
            <span className="autopilot-mode">Explainable local agents</span>
          </div>
          <h2>Control tower for the messy middle.</h2>
          <p>
            Watches inventory, dispatch, customers, returns, and plan pressure,
            then explains the next move before applying it.
          </p>
        </div>

        <div className="autopilot-status-grid">
          <div className="autopilot-score">
            <BrainCircuit className="size-5" />
            <span>{overallConfidence}%</span>
            <p>confidence</p>
          </div>
          <div className="autopilot-stat">
            <span>{activeSignals}</span>
            <p>signals</p>
          </div>
        </div>
      </div>

      <div className="autopilot-graph" aria-label="Autopilot agent graph">
        {autopilotGraphNodes.map((node, index) => (
          <div key={node} className="autopilot-node is-active">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{node}</p>
            {index < autopilotGraphNodes.length - 1 ? (
              <ArrowRight className="size-3.5" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
          </div>
        ))}
      </div>

      <div
        className={`autopilot-grid ${insights.length === 1 ? "has-single-insight" : ""}`}
        data-insight-count={insights.length}
      >
        {insights.length > 0 ? (
          insights.map((insight, index) => {
            const Icon = iconByType[insight.type];

            return (
              <article
                key={insight.id}
                className={`autopilot-card urgency-${insight.urgency} ${
                  index === 0 ? "is-primary" : ""
                }`}
              >
                <div className="autopilot-card-head">
                  <div>
                    <span>{labelByType[insight.type]}</span>
                    <h3>{insight.title}</h3>
                  </div>
                  <div className="autopilot-icon">
                    <Icon className="size-5" />
                  </div>
                </div>

                <p className="autopilot-summary">{insight.summary}</p>
                <div className="autopilot-recommendation">
                  <span>Recommended move</span>
                  <p>{insight.recommendation}</p>
                </div>

                {insight.scores?.length ? (
                  <div className="autopilot-score-list">
                    {insight.scores.slice(0, 2).map((score) => (
                      <div key={score.agent.id}>
                        <strong>{score.agent.name}</strong>
                        <span>{score.score}% / {score.etaMinutes} min</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <ul className="autopilot-evidence">
                  {insight.evidence.slice(0, compact ? 2 : 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <div className="autopilot-card-foot">
                  <div className="autopilot-meter" aria-label={`${insight.confidence}% confidence`}>
                    <span>{insight.confidence}% confidence</span>
                    <div>
                      <i style={{ width: `${insight.confidence}%` }} />
                    </div>
                  </div>
                  {insight.action ? (
                    <button
                      type="button"
                      className="autopilot-action"
                      onClick={() => onAction?.(insight.action!, insight)}
                    >
                      <Zap className="size-3.5" />
                      {insight.action.label}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="autopilot-empty">
            <CheckCircle2 className="size-7" />
            <p>All systems are inside the operating band.</p>
          </div>
        )}
      </div>
    </section>
  );
}
