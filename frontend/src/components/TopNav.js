import React, { useState } from "react";
import { Search, Play, Cpu, BookOpen } from "lucide-react";

export default function TopNav({ symbol, onSearch, onRunAgent, isRunning, priceData, marketStatus = null, onOpenGuide }) {
  const [inputVal, setInputVal] = useState(symbol);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  const price = priceData?.current_price;
  const change = priceData?.change;
  const changePct = priceData?.change_pct;
  const isPositive = change >= 0;

  const activeTicker = (priceData?.ticker || symbol || "").toUpperCase();
  const isUS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX"].includes(activeTicker);
  const currencySymbol = isUS ? "$" : "₹";

  return (
    <header className="terminal-header">
      {/* Brand & Symbol Search */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Cpu size={20} color="#10b981" />
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "15px", letterSpacing: "-0.5px" }}>
            TICKER<span style={{ color: "#10b981" }}>SENSE</span>
          </span>
          <span style={{ fontSize: "10px", background: "var(--border-main)", padding: "1px 6px", borderRadius: "3px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            v2.0 LANGGRAPH
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px" }} />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="SEARCH TICKER OR COMPANY (e.g. RELIENCE, AAPL, Tata Motors)..."
              className="font-mono"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-main)",
                borderRadius: "4px 0 0 4px",
                color: "var(--text-main)",
                padding: "6px 10px 6px 30px",
                fontSize: "11px",
                width: "280px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              className="font-mono"
              style={{
                background: "var(--border-main)",
                border: "1px solid var(--border-main)",
                borderLeft: "none",
                borderRadius: "0 4px 4px 0",
                color: "var(--text-main)",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              LOAD
            </button>
          </div>
        </form>

        <button
          onClick={() => onRunAgent(inputVal || symbol)}
          disabled={isRunning}
          className="font-mono"
          style={{
            background: isRunning ? "var(--bg-hover)" : "var(--accent-emerald-bg)",
            color: isRunning ? "var(--text-muted)" : "var(--accent-emerald)",
            border: `1px solid ${isRunning ? "var(--border-main)" : "var(--accent-emerald-border)"}`,
            borderRadius: "4px",
            padding: "6px 14px",
            fontSize: "11px",
            fontWeight: 700,
            cursor: isRunning ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Play size={13} />
          {isRunning ? "AGENT RUNNING..." : "RUN RESEARCH AGENT"}
        </button>

        <button
          onClick={onOpenGuide}
          className="font-mono"
          style={{
            background: "var(--bg-card)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "4px",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <BookOpen size={13} />
          USER GUIDE
        </button>
      </div>

      {/* Key Stats Strip */}
      {priceData && (
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div>
            <span style={{ fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
              TICKER
            </span>
            <span className="font-mono" style={{ fontWeight: 700, fontSize: "12px" }}>
              {priceData.ticker || symbol}
            </span>
          </div>

          <div>
            <span style={{ fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
              LAST PRICE
            </span>
            <span className="font-mono" style={{ fontWeight: 700, fontSize: "12px", color: "var(--text-main)" }}>
              {currencySymbol}{price?.toFixed(2)}
            </span>
          </div>

          <div>
            <span style={{ fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
              1D CHANGE
            </span>
            <span
              className="font-mono"
              style={{
                fontWeight: 700,
                fontSize: "12px",
                color: isPositive ? "var(--accent-emerald)" : "var(--accent-red)",
              }}
            >
              {isPositive ? "+" : ""}{change?.toFixed(2)} ({isPositive ? "+" : ""}{changePct?.toFixed(2)}%)
            </span>
          </div>

          <div>
            <span style={{ fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
              VOLUME
            </span>
            <span className="font-mono" style={{ fontWeight: 600, fontSize: "11px", color: "var(--text-secondary)" }}>
              {priceData.volume ? (priceData.volume / 1e6).toFixed(2) + "M" : "N/A"}
            </span>
          </div>

          <div>
            <span style={{ fontSize: "9px", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
              MARKET STATUS
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span className={marketStatus?.open ? "pulse-green" : ""} style={{ width: "6px", height: "6px", borderRadius: "50%", background: marketStatus?.open ? "var(--accent-emerald)" : "var(--text-dim)" }} />
              <span className="font-mono" style={{ fontSize: "11px", color: marketStatus?.open ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                {marketStatus?.label || "IST MARKET"}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
