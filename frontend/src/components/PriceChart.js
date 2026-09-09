import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Activity } from "lucide-react";

export default function PriceChart({ chartSeries, symbol }) {
  const [showMA50, setShowMA50] = useState(true);
  const [showMA200, setShowMA200] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  const activeTicker = (symbol || "").toUpperCase();
  const isUS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX"].includes(activeTicker);
  const currencySymbol = isUS ? "$" : "₹";

  if (!chartSeries || chartSeries.length === 0) {
    return (
      <div
        className="terminal-card"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "12px",
          color: "var(--text-dim)",
          minHeight: "400px",
        }}
      >
        <span className="font-mono">NO CHART DATA AVAILABLE FOR {symbol}</span>
      </div>
    );
  }

  // Calculate min/max domain for close price
  const closeValues = chartSeries.map((d) => d.close).filter(Boolean);
  const minPrice = Math.floor(Math.min(...closeValues) * 0.98);
  const maxPrice = Math.ceil(Math.max(...closeValues) * 1.02);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px", gap: "12px" }}>
      {/* Chart Header & Indicator Toggles */}
      <div className="terminal-card-header" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={14} color="var(--accent-emerald)" />
          <span>TECHNICAL PRICE ACTION — {symbol}</span>
        </div>

        {/* Overlay Toggle Controls */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setShowMA50(!showMA50)}
            className="font-mono"
            style={{
              background: showMA50 ? "rgba(56, 189, 248, 0.15)" : "var(--bg-input)",
              color: showMA50 ? "#38bdf8" : "var(--text-dim)",
              border: `1px solid ${showMA50 ? "rgba(56, 189, 248, 0.4)" : "var(--border-main)"}`,
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            MA50
          </button>

          <button
            onClick={() => setShowMA200(!showMA200)}
            className="font-mono"
            style={{
              background: showMA200 ? "rgba(251, 146, 60, 0.15)" : "var(--bg-input)",
              color: showMA200 ? "#fb923c" : "var(--text-dim)",
              border: `1px solid ${showMA200 ? "rgba(251, 146, 60, 0.4)" : "var(--border-main)"}`,
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            MA200
          </button>

          <button
            onClick={() => setShowRSI(!showRSI)}
            className="font-mono"
            style={{
              background: showRSI ? "rgba(192, 132, 252, 0.15)" : "var(--bg-input)",
              color: showRSI ? "#c084fc" : "var(--text-dim)",
              border: `1px solid ${showRSI ? "rgba(192, 132, 252, 0.4)" : "var(--border-main)"}`,
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            RSI
          </button>

          <button
            onClick={() => setShowMACD(!showMACD)}
            className="font-mono"
            style={{
              background: showMACD ? "rgba(16, 185, 129, 0.15)" : "var(--bg-input)",
              color: showMACD ? "#10b981" : "var(--text-dim)",
              border: `1px solid ${showMACD ? "rgba(16, 185, 129, 0.4)" : "var(--border-main)"}`,
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            MACD
          </button>
        </div>
      </div>

      {/* Main Price & Moving Averages Chart */}
      <div className="terminal-card" style={{ height: "320px", padding: "10px 10px 0 0" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e2530" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} minTickGap={30} />
            <YAxis domain={[minPrice, maxPrice]} stroke="#64748b" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} orientation="right" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111722",
                borderColor: "#222d40",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                borderRadius: "4px",
              }}
            />
            <Area type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" name={`Close (${currencySymbol})`} />
            {showMA50 && <Line type="monotone" dataKey="ma50" stroke="#38bdf8" strokeWidth={1.5} dot={false} name="MA 50" />}
            {showMA200 && <Line type="monotone" dataKey="ma200" stroke="#fb923c" strokeWidth={1.5} dot={false} name="MA 200" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Secondary Indicators Pane (RSI & Volume) */}
      <div style={{ display: "grid", gridTemplateColumns: showRSI && showMACD ? "1fr 1fr" : "1fr", gap: "12px" }}>
        {showRSI && (
          <div className="terminal-card" style={{ height: "130px", padding: "8px 10px 0 0" }}>
            <div style={{ fontSize: "10px", color: "#c084fc", fontWeight: 700, paddingLeft: "10px" }} className="font-mono">
              RSI (14) — [30 Oversold / 70 Overbought]
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <ComposedChart data={chartSeries} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e2530" strokeDasharray="2 2" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} orientation="right" ticks={[30, 50, 70]} />
                <Line type="monotone" dataKey="rsi" stroke="#c084fc" strokeWidth={1.5} dot={false} name="RSI" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {showMACD && (
          <div className="terminal-card" style={{ height: "130px", padding: "8px 10px 0 0" }}>
            <div style={{ fontSize: "10px", color: "#10b981", fontWeight: 700, paddingLeft: "10px" }} className="font-mono">
              MACD HISTOGRAM & SIGNAL
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <ComposedChart data={chartSeries} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e2530" strokeDasharray="2 2" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis stroke="#64748b" tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} orientation="right" />
                <Line type="monotone" dataKey="macd" stroke="#10b981" strokeWidth={1.5} dot={false} name="MACD" />
                <Line type="monotone" dataKey="macd_signal" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Signal" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
