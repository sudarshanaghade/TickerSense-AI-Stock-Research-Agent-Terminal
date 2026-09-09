import React, { useState } from "react";
import {
  X,
  Cpu,
  Play,
  BarChart2,
  Radio,
  Sparkles,
  Briefcase,
  Target,
  TrendingUp,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function GuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(10, 14, 20, 0.88)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-bright)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "800px",
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-main)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Cpu size={22} color="var(--accent-emerald)" />
            <div>
              <span className="font-mono" style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.3px" }}>
                TICKERSENSE — PRODUCT OVERVIEW & TRADER GUIDE
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                AI Research Agent Terminal for Traders, Analysts & Investors
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-main)",
              color: "var(--text-muted)",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-main)", paddingBottom: "10px" }}>
          <button
            onClick={() => setActiveTab("overview")}
            className="font-mono"
            style={{
              background: activeTab === "overview" ? "var(--accent-emerald-bg)" : "var(--bg-canvas)",
              color: activeTab === "overview" ? "var(--accent-emerald)" : "var(--text-muted)",
              border: `1px solid ${activeTab === "overview" ? "var(--accent-emerald-border)" : "var(--border-main)"}`,
              borderRadius: "4px",
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Briefcase size={13} />
            PRODUCT OVERVIEW & USE CASES
          </button>

          <button
            onClick={() => setActiveTab("walkthrough")}
            className="font-mono"
            style={{
              background: activeTab === "walkthrough" ? "rgba(56, 189, 248, 0.15)" : "var(--bg-canvas)",
              color: activeTab === "walkthrough" ? "#38bdf8" : "var(--text-muted)",
              border: `1px solid ${activeTab === "walkthrough" ? "rgba(56, 189, 248, 0.4)" : "var(--border-main)"}`,
              borderRadius: "4px",
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Play size={13} />
            HOW TO OPERATE
          </button>

          <button
            onClick={() => setActiveTab("cheatsheet")}
            className="font-mono"
            style={{
              background: activeTab === "cheatsheet" ? "rgba(192, 132, 252, 0.15)" : "var(--bg-canvas)",
              color: activeTab === "cheatsheet" ? "#c084fc" : "var(--text-muted)",
              border: `1px solid ${activeTab === "cheatsheet" ? "rgba(192, 132, 252, 0.4)" : "var(--border-main)"}`,
              borderRadius: "4px",
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <BarChart2 size={13} />
            INDICATOR CHEAT SHEET
          </button>
        </div>

        {/* TAB 1: PRODUCT OVERVIEW & TRADER USE CASES */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* What is TickerSense */}
            <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "14px" }}>
              <h3 className="font-mono" style={{ fontSize: "13px", color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={15} /> WHAT IS TICKERSENSE?
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                <strong>TickerSense</strong> is an autonomous multi-agent equity research terminal designed to bridge quantitative technical signals with qualitive market news sentiment. Inspired by institutional platforms like <em>Deepvue, Koyfin, and Bloomberg Terminals</em>, TickerSense replaces manual research with a 4-stage LangGraph AI agent pipeline that executes data fetching, indicator scoring, news sentiment extraction, and LLM synthesis in seconds.
              </p>
            </div>

            {/* How Traders Can Use It */}
            <div>
              <h3 className="font-mono" style={{ fontSize: "13px", color: "var(--text-main)", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Target size={15} color="#38bdf8" /> HOW TRADERS & INVESTORS USE IT
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* Use Case 1 */}
                <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#38bdf8", marginBottom: "4px" }} className="font-mono">
                    <TrendingUp size={14} /> 1. Swing & Momentum Traders
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    Identify high-probability trend continuation or breakout setups. Match price relative to MA50/MA200 with institutional volume spikes (&gt;1.5x average) and positive headline catalysts.
                  </p>
                </div>

                {/* Use Case 2 */}
                <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#c084fc", marginBottom: "4px" }} className="font-mono">
                    <Radio size={14} /> 2. Catalyst & News Traders
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    Instantly evaluate news tone across recent headlines. Get VADER compound sentiment scoring and LLM qualitative narrative extraction without reading dozens of articles.
                  </p>
                </div>

                {/* Use Case 3 */}
                <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "4px" }} className="font-mono">
                    <ShieldCheck size={14} /> 3. Reversal & Divergence Hunting
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    Spot trade divergence risks before taking a position (e.g. stock hitting oversold RSI &lt; 30 with strongly bullish headline sentiment signals a potential relief bounce).
                  </p>
                </div>

                {/* Use Case 4 */}
                <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "4px" }} className="font-mono">
                    <Zap size={14} /> 4. Pre-Market & Routine Scans
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    Conduct instant 10-second ticker deep-dives before market open. Receive plain-language executive summaries and confidence scores for watchlisted tickers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OPERATING WALKTHROUGH */}
        {activeTab === "walkthrough" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "12px" }}>
              <div className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "4px" }}>
                1. Smart Ticker Search Bar
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Type an exact symbol (<code style={{ color: "#10b981" }}>AAPL</code>, <code style={{ color: "#10b981" }}>TCS</code>), company name (<code style={{ color: "#10b981" }}>Tata Motors</code>, <code style={{ color: "#10b981" }}>Apple</code>), or common misspellings (<code style={{ color: "#10b981" }}>RELIENCE</code>). Smart Resolver auto-converts your input!
              </p>
            </div>

            <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "12px" }}>
              <div className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8", marginBottom: "4px" }}>
                2. Live Multi-Agent Execution Timeline
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Click <strong>RUN RESEARCH AGENT</strong> to trigger the 4 LangGraph agents in real-time via Server-Sent Events (SSE). Watch each agent finish sequence stages.
              </p>
            </div>

            <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-main)", borderRadius: "6px", padding: "12px" }}>
              <div className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "#c084fc", marginBottom: "4px" }}>
                3. Catalyst Breakdown & Confidence Rating
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Review the synthesized synthesis output: Overall Signal (<code style={{ color: "#10b981" }}>BULLISH</code> / <code style={{ color: "#ef4444" }}>BEARISH</code> / <code style={{ color: "#f59e0b" }}>NEUTRAL</code>), Confidence rating %, Executive summary, Technical read, and Sentiment read.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: INDICATOR CHEAT SHEET */}
        {activeTab === "cheatsheet" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }} className="font-mono">
            <div style={{ background: "var(--bg-canvas)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-main)" }}>
              <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "12px" }}>MA50 / MA200 TREND:</span>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Price &gt; MA50 &gt; MA200 indicates strong uptrend. Golden Cross occurs when MA50 crosses above MA200.
              </p>
            </div>

            <div style={{ background: "var(--bg-canvas)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-main)" }}>
              <span style={{ color: "#c084fc", fontWeight: 700, fontSize: "12px" }}>RSI MOMENTUM (14):</span>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                RSI &gt; 70 = Overbought (reversal warning). RSI &lt; 30 = Oversold (potential bounce). 50-70 = Bullish momentum.
              </p>
            </div>

            <div style={{ background: "var(--bg-canvas)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-main)" }}>
              <span style={{ color: "#10b981", fontWeight: 700, fontSize: "12px" }}>MACD CROSSOVER:</span>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                MACD line crossing above Signal line indicates accelerating bullish price momentum.
              </p>
            </div>

            <div style={{ background: "var(--bg-canvas)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-main)" }}>
              <span style={{ color: "#fb923c", fontWeight: 700, fontSize: "12px" }}>VOLUME SPIKE RATIO:</span>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Volume &gt; 1.5x 20-day average signals heavy institutional participation and catalyst validation.
              </p>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-main)", paddingTop: "12px" }}>
          <button
            onClick={onClose}
            className="font-mono"
            style={{
              background: "var(--accent-emerald-bg)",
              color: "var(--accent-emerald)",
              border: "1px solid var(--accent-emerald-border)",
              borderRadius: "4px",
              padding: "6px 16px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            CLOSE GUIDE
          </button>
        </div>
      </div>
    </div>
  );
}
