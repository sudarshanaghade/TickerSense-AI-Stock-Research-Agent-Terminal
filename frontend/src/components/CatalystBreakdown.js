import React from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, FileText, BarChart2, Radio } from "lucide-react";

export default function CatalystBreakdown({ breakdown, symbol }) {
  if (!breakdown) {
    return (
      <div
        className="terminal-card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          textAlign: "center",
          color: "var(--text-dim)",
          minHeight: "220px",
        }}
      >
        <Sparkles size={24} color="var(--border-bright)" style={{ marginBottom: "10px" }} />
        <span className="font-mono" style={{ fontSize: "12px" }}>
          RUN THE RESEARCH AGENT TO GENERATE CATALYST BREAKDOWN
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
          Synthesizes technical signals & news sentiment using Groq llama-3.3-70b
        </span>
      </div>
    );
  }

  const signal = (breakdown.overall_signal || "NEUTRAL").toUpperCase();
  const confidence = breakdown.confidence_score || 75;

  let badgeClass = "badge-neutral";
  let SignalIcon = Minus;
  let accentColor = "var(--accent-amber)";

  if (signal === "BULLISH") {
    badgeClass = "badge-bullish";
    SignalIcon = TrendingUp;
    accentColor = "var(--accent-emerald)";
  } else if (signal === "BEARISH") {
    badgeClass = "badge-bearish";
    SignalIcon = TrendingDown;
    accentColor = "var(--accent-red)";
  }

  return (
    <div className="terminal-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Card Header: Signal Badge & Confidence */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-main)", paddingBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className={badgeClass} style={{ fontSize: "13px", padding: "4px 10px" }}>
            <SignalIcon size={14} />
            {signal} SYNTHESIS
          </span>
          <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            TICKER: {symbol}
          </span>
        </div>

        {/* Confidence Meter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-muted)" }}>
            CONFIDENCE
          </span>
          <div style={{ width: "60px", height: "6px", background: "var(--bg-canvas)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ width: `${confidence}%`, height: "100%", background: accentColor, borderRadius: "3px" }} />
          </div>
          <span className="font-mono" style={{ fontSize: "11px", fontWeight: 700, color: accentColor }}>
            {confidence}%
          </span>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "4px", padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--accent-amber)", fontWeight: 700, marginBottom: "4px" }} className="font-mono">
          <Sparkles size={13} />
          EXECUTIVE SUMMARY
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
          {breakdown.plain_language_summary}
        </p>
      </div>

      {/* Structured 3-Column Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* What Happened */}
        <div style={{ borderLeft: `2px solid ${accentColor}`, paddingLeft: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }} className="font-mono">
            <FileText size={12} />
            WHAT HAPPENED (CATALYSTS)
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {breakdown.what_happened}
          </p>
        </div>

        {/* Technical Read */}
        <div style={{ borderLeft: "2px solid #38bdf8", paddingLeft: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#38bdf8", fontWeight: 700 }} className="font-mono">
            <BarChart2 size={12} />
            TECHNICAL READ
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {breakdown.technical_read}
          </p>
        </div>

        {/* Sentiment Read */}
        <div style={{ borderLeft: "2px solid #c084fc", paddingLeft: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#c084fc", fontWeight: 700 }} className="font-mono">
            <Radio size={12} />
            SENTIMENT READ
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {breakdown.sentiment_read}
          </p>
        </div>
      </div>
    </div>
  );
}
