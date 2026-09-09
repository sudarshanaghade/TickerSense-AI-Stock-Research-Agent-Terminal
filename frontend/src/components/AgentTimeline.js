import React from "react";
import { CheckCircle2, Loader2, AlertTriangle, Circle, Terminal, Bot } from "lucide-react";

export default function AgentTimeline({ stepLogs = [], isRunning }) {
  const steps = [
    { key: "data_fetch", name: "1. Data-Fetch Agent", desc: "Pulls ~1y OHLCV prices & news headlines (yfinance + NewsAPI)" },
    { key: "technical_analysis", name: "2. Technical-Analysis Agent", desc: "Computes MA50, MA200, RSI, MACD, Volume Spikes & Momentum" },
    { key: "sentiment_analysis", name: "3. Sentiment Agent", desc: "Runs VADER scoring + Groq llama-3.1-8b narrative extraction" },
    { key: "synthesizer", name: "4. Synthesizer Agent", desc: "Groq llama-3.3-70b synthesizes structured Catalyst Breakdown" },
  ];

  // Helper to resolve status of each step
  const getStepStatus = (stepKey) => {
    const log = stepLogs.find((l) => l.step === stepKey);
    if (log) {
      return { status: log.status || "completed", message: log.message, details: log };
    }
    // If agent is currently running and this is the next step to execute
    const completedKeys = stepLogs.map((l) => l.step);
    if (isRunning) {
      if (stepKey === "data_fetch" && !completedKeys.includes("data_fetch")) {
        return { status: "running", message: "Fetching market data & recent headlines..." };
      }
      if (stepKey === "technical_analysis" && completedKeys.includes("data_fetch") && !completedKeys.includes("technical_analysis")) {
        return { status: "running", message: "Calculating momentum indicators & trend signals..." };
      }
      if (stepKey === "sentiment_analysis" && completedKeys.includes("technical_analysis") && !completedKeys.includes("sentiment_analysis")) {
        return { status: "running", message: "Analyzing headline sentiment and market drivers..." };
      }
      if (stepKey === "synthesizer" && completedKeys.includes("sentiment_analysis") && !completedKeys.includes("synthesizer")) {
        return { status: "running", message: "Synthesizing catalyst breakdown with llama-3.3-70b..." };
      }
    }
    return { status: "pending", message: "Awaiting execution..." };
  };

  return (
    <div className="terminal-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div className="terminal-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bot size={15} color="#10b981" />
          <span>MULTI-AGENT PIPELINE EXECUTION LOG</span>
        </div>
        {isRunning && (
          <span className="font-mono" style={{ fontSize: "10px", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Loader2 size={12} className="spin" style={{ animation: "spin 1s linear infinite" }} />
            LIVE GRAPH STREAM
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {steps.map((step) => {
          const { status, message, details } = getStepStatus(step.key);
          const isDone = status === "completed";
          const isExec = status === "running";
          const isErr = status === "failed";

          return (
            <div
              key={step.key}
              style={{
                background: isExec ? "var(--bg-hover)" : "var(--bg-panel)",
                border: `1px solid ${isDone ? "var(--accent-emerald-border)" : isExec ? "var(--accent-amber-border)" : "var(--border-main)"}`,
                borderRadius: "4px",
                padding: "8px 12px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isDone && <CheckCircle2 size={14} color="var(--accent-emerald)" />}
                  {isExec && <Loader2 size={14} color="var(--accent-amber)" style={{ animation: "spin 1s linear infinite" }} />}
                  {isErr && <AlertTriangle size={14} color="var(--accent-red)" />}
                  {!isDone && !isExec && !isErr && <Circle size={14} color="var(--text-dim)" />}
                  
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: "12px", color: isDone ? "var(--text-main)" : isExec ? "var(--accent-amber)" : "var(--text-muted)" }}>
                    {step.name}
                  </span>
                </div>

                <span className="font-mono" style={{ fontSize: "10px", textTransform: "uppercase", color: isDone ? "var(--accent-emerald)" : isExec ? "var(--accent-amber)" : "var(--text-dim)" }}>
                  {status}
                </span>
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", paddingLeft: "22px" }}>
                {message || step.desc}
              </div>

              {/* Show structured signal highlights if completed */}
              {isDone && details && details.signals && (
                <div className="font-mono" style={{ fontSize: "10px", color: "var(--text-secondary)", background: "var(--bg-canvas)", padding: "4px 8px", borderRadius: "3px", marginTop: "6px", marginLeft: "22px" }}>
                  TREND: {details.signals.trend_classification} | RSI: {details.signals.rsi_value} | VOL: {details.signals.volume_status}
                </div>
              )}

              {isDone && details && details.sentiment && (
                <div className="font-mono" style={{ fontSize: "10px", color: "var(--text-secondary)", background: "var(--bg-canvas)", padding: "4px 8px", borderRadius: "3px", marginTop: "6px", marginLeft: "22px" }}>
                  SENTIMENT: {details.sentiment.overall_label} (VADER: {details.sentiment.score}) | BULL: {details.sentiment.bullish_count} | BEAR: {details.sentiment.bearish_count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
