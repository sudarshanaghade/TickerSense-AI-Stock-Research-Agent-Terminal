import { useState } from "react";
import { predictStock } from "../api";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";

const MODELS = [
    { id: "lstm", label: "LSTM",              color: "#4f6bed" },
    { id: "lr",   label: "Linear Regression", color: "#16a34a" },
    { id: "rf",   label: "Random Forest",     color: "#d97706" },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function sentimentColor(label) {
    if (label === "Positive") return "var(--green)";
    if (label === "Negative") return "var(--red)";
    return "#b45309";
}

// ── MarketStatusBadge ─────────────────────────────────────────────────────────

function MarketStatusBadge({ status }) {
    if (!status) return null;
    const { open, label, time } = status;
    return (
        <span style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "0.3rem",
            fontSize:     "0.72rem",
            fontWeight:   600,
            padding:      "0.18rem 0.6rem",
            borderRadius: "999px",
            background:   open ? "rgba(45,154,78,0.12)" : "rgba(217,79,61,0.10)",
            color:        open ? "var(--green)"          : "var(--red)",
            border:       `1px solid ${open ? "rgba(45,154,78,0.25)" : "rgba(217,79,61,0.2)"}`,
        }}>
            <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: open ? "var(--green)" : "var(--red)",
                boxShadow:  open ? "0 0 5px var(--green)" : "none",
                animation:  open ? "pulse 1.8s ease-in-out infinite" : "none",
            }} />
            {label} · {time}
        </span>
    );
}

// ── SentimentPanel ────────────────────────────────────────────────────────────

function SentimentPanel({ sentiment, modelColor, impactRs }) {
    const {
        avg_compound, overall_label,
        positive_count, negative_count, neutral_count, total,
        source,
    } = sentiment;
    const color = sentimentColor(overall_label);
    const pct   = Math.round(((avg_compound + 1) / 2) * 100);
    const impactSign = impactRs >= 0 ? "+" : "";

    return (
        <div className="sentiment-panel">
            {/* header row */}
            <div className="sp-header">
                <span className="sp-title">News Sentiment</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    {source && source !== "None" && (
                        <span style={{
                            fontSize: "0.68rem", fontWeight: 600,
                            padding: "0.1rem 0.45rem", borderRadius: "4px",
                            background: "rgba(100,100,200,0.1)", color: "#6366f1",
                            border: "1px solid rgba(99,102,241,0.2)",
                        }}>
                            {source}
                        </span>
                    )}
                    <span className="sentiment-badge" style={{
                        background: color + "1a", color,
                    }}>
                        {overall_label === "Positive" ? "▲" : overall_label === "Negative" ? "▼" : "●"} {overall_label}
                        &nbsp;·&nbsp;{avg_compound >= 0 ? "+" : ""}{avg_compound.toFixed(3)}
                    </span>
                </div>
            </div>

            {/* mini gauge */}
            <div className="sp-gauge-track">
                <div className="sp-zone sp-zone--neg" />
                <div className="sp-zone sp-zone--neu" />
                <div className="sp-zone sp-zone--pos" />
                <div className="sp-thumb" style={{
                    left: `calc(${pct}% - 5px)`,
                    background: color,
                    boxShadow: `0 0 6px ${color}55`,
                }} />
            </div>
            <div className="sp-axis">
                <span style={{ color: "var(--red)" }}>-1.0</span>
                <span style={{ color: "#b45309" }}>0</span>
                <span style={{ color: "var(--green)" }}>+1.0</span>
            </div>

            {/* counts */}
            <div className="sp-counts">
                <div className="sp-count-item">
                    <span className="sp-count" style={{ color: "var(--green)" }}>{positive_count}</span>
                    <span className="sp-count-label">Positive</span>
                </div>
                <div className="sp-count-item">
                    <span className="sp-count" style={{ color: "#b45309" }}>{neutral_count}</span>
                    <span className="sp-count-label">Neutral</span>
                </div>
                <div className="sp-count-item">
                    <span className="sp-count" style={{ color: "var(--red)" }}>{negative_count}</span>
                    <span className="sp-count-label">Negative</span>
                </div>
                <div className="sp-count-item">
                    <span className="sp-count" style={{ color: "var(--muted)" }}>{total}</span>
                    <span className="sp-count-label">Total</span>
                </div>
            </div>

            {/* sentiment impact */}
            {impactRs !== undefined && (
                <div style={{
                    marginTop: "0.75rem",
                    padding: "0.55rem 0.85rem",
                    background: (impactRs >= 0 ? "rgba(45,154,78,0.07)" : "rgba(217,79,61,0.07)"),
                    borderRadius: "8px",
                    border: `1px solid ${impactRs >= 0 ? "rgba(45,154,78,0.2)" : "rgba(217,79,61,0.18)"}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                    <span style={{ fontSize: "0.76rem", color: "var(--muted)", fontWeight: 500 }}>
                        Sentiment Impact at Day 10
                    </span>
                    <span style={{
                        fontSize: "0.88rem", fontWeight: 700,
                        color: impactRs >= 0 ? "var(--green)" : "var(--red)",
                    }}>
                        {impactSign}₹{Math.abs(impactRs).toFixed(2)}
                    </span>
                </div>
            )}

            {/* legend note */}
            <div className="sp-note">
                <span className="sp-note-dot" style={{ background: modelColor }} />
                ML-only &nbsp;|&nbsp;
                <span className="sp-note-dot sp-note-dot--hybrid" />
                Hybrid (ML + Sentiment)
            </div>
        </div>
    );
}

// ── custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "#fff", border: "1px solid #dde1ea",
            borderRadius: "8px", padding: "0.65rem 0.9rem",
            fontSize: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
        }}>
            <p style={{ fontWeight: 700, color: "#1a1f36", marginBottom: "0.35rem" }}>{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color, margin: "0.15rem 0", fontWeight: 600 }}>
                    {entry.name}: ₹{entry.value?.toFixed(2)}
                </p>
            ))}
        </div>
    );
}

// ── comparison table ──────────────────────────────────────────────────────────

function ComparisonTable({ predictions, hybridPredictions, currentPrice, modelColor }) {
    return (
        <div className="hybrid-table-wrap">
            <div className="hybrid-table-head">
                <span>Day</span>
                <span style={{ color: modelColor }}>ML Only</span>
                <span style={{ color: "#a855f7" }}>Hybrid</span>
                <span>Δ Sentiment</span>
            </div>
            {predictions.map((mlP, i) => {
                const hyP   = hybridPredictions[i];
                const delta = hyP - mlP;
                const mlChg = currentPrice ? ((mlP - currentPrice) / currentPrice * 100) : null;
                const hyChg = currentPrice ? ((hyP - currentPrice) / currentPrice * 100) : null;
                return (
                    <div className="hybrid-table-row" key={i}>
                        <span className="ht-day">Day {i + 1}</span>
                        <span>
                            <span className="ht-price">₹{mlP.toFixed(2)}</span>
                            {mlChg !== null && (
                                <span className="ht-chg" style={{ color: mlChg >= 0 ? "var(--green)" : "var(--red)" }}>
                                    {mlChg >= 0 ? "+" : ""}{mlChg.toFixed(2)}%
                                </span>
                            )}
                        </span>
                        <span>
                            <span className="ht-price">₹{hyP.toFixed(2)}</span>
                            {hyChg !== null && (
                                <span className="ht-chg" style={{ color: hyChg >= 0 ? "var(--green)" : "var(--red)" }}>
                                    {hyChg >= 0 ? "+" : ""}{hyChg.toFixed(2)}%
                                </span>
                            )}
                        </span>
                        <span className="ht-delta" style={{ color: delta >= 0 ? "var(--green)" : "var(--red)" }}>
                            {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ── main page ─────────────────────────────────────────────────────────────────

function Prediction() {
    const [symbol,        setSymbol]        = useState("");
    const [selectedModel, setSelectedModel] = useState("lstm");
    const [fastMode,      setFastMode]      = useState(false);
    const [data,          setData]          = useState(null);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState("");

    const activeModel = MODELS.find(m => m.id === selectedModel);

    const runPredict = async () => {
        const s = symbol.trim().toUpperCase();
        if (!s) return;
        setLoading(true);
        setError("");
        setData(null);
        try {
            const res = await predictStock(s, selectedModel, fastMode);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to fetch prediction.");
        } finally {
            setLoading(false);
        }
    };

    // Build chart data: each point has ml_price + hybrid_price
    const chartData = data?.predictions?.map((p, i) => ({
        day:        `Day ${i + 1}`,
        "ML Only":  parseFloat(p.toFixed(2)),
        "Hybrid":   parseFloat((data.hybrid_predictions?.[i] ?? p).toFixed(2)),
    }));

    const hybridColor   = "#a855f7";
    const effectiveModel = data?.model ?? activeModel?.label;

    return (
        <div className="page">
            {/* ── input card ── */}
            <div className="form-card">
                <h2>Stock Price Prediction</h2>
                <p className="subtitle">
                    ML forecast + News Sentiment fusion — 10-day price prediction for NSE stocks
                </p>

                {/* model selector */}
                <div className="model-selector">
                    {MODELS.map(opt => (
                        <button
                            key={opt.id}
                            className={`model-btn ${selectedModel === opt.id ? "model-btn--active" : ""}`}
                            style={selectedModel === opt.id ? { borderColor: opt.color, color: opt.color } : {}}
                            onClick={() => setSelectedModel(opt.id)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* symbol input */}
                <div className="input-row">
                    <div className="input-group">
                        <label>Stock Symbol</label>
                        <input
                            id="prediction-symbol-input"
                            className="stock-input"
                            placeholder="e.g. RELIANCE, TCS, INFY"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && runPredict()}
                        />
                    </div>
                    <button
                        id="predict-btn"
                        className="btn btn-primary"
                        onClick={runPredict}
                        disabled={loading}
                        style={{ background: activeModel?.color, borderColor: activeModel?.color }}
                    >
                        {loading ? "Predicting…" : "Predict"}
                    </button>
                </div>

                {/* ── controls row: fast mode ── */}
                <div style={{
                    marginTop: "1.1rem",
                    display: "flex", flexWrap: "wrap", gap: "1.2rem", alignItems: "flex-end",
                }}>
                    {/* Fast Mode toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.2rem" }}>
                        <label
                            htmlFor="fast-mode-toggle"
                            style={{
                                display: "flex", alignItems: "center", gap: "0.45rem",
                                cursor: "pointer", userSelect: "none",
                                fontSize: "0.8rem", fontWeight: 600,
                                color: fastMode ? "#f59e0b" : "var(--muted)",
                            }}
                        >
                            <span style={{
                                position: "relative", display: "inline-block",
                                width: "38px", height: "20px",
                            }}>
                                <input
                                    id="fast-mode-toggle"
                                    type="checkbox"
                                    checked={fastMode}
                                    onChange={(e) => setFastMode(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: "absolute", inset: 0, borderRadius: "20px",
                                    background: fastMode ? "#f59e0b" : "#d1d5db",
                                    transition: "background 0.25s",
                                }} />
                                <span style={{
                                    position: "absolute", top: "2px",
                                    left: fastMode ? "20px" : "2px",
                                    width: "16px", height: "16px",
                                    borderRadius: "50%", background: "#fff",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                                    transition: "left 0.25s",
                                }} />
                            </span>
                            ⚡ Fast Mode
                        </label>
                        {fastMode && selectedModel === "lstm" && (
                            <span style={{
                                fontSize: "0.68rem", color: "#f59e0b",
                                background: "rgba(245,158,11,0.1)",
                                padding: "0.1rem 0.45rem", borderRadius: "4px",
                                border: "1px solid rgba(245,158,11,0.25)",
                            }}>
                                LSTM → LR
                            </span>
                        )}
                    </div>
                </div>

                {fastMode && (
                    <div style={{
                        marginTop: "0.7rem", fontSize: "0.74rem",
                        color: "#92400e", background: "rgba(245,158,11,0.08)",
                        padding: "0.4rem 0.75rem", borderRadius: "6px",
                        border: "1px solid rgba(245,158,11,0.2)",
                    }}>
                        ⚡ Fast Mode is <strong>ON</strong> — LSTM is replaced with Linear Regression.
                        Predictions complete in ~1s instead of 10–15s.
                    </div>
                )}

                {error && <div className="error-box">{error}</div>}
            </div>

            {/* ── loading ── */}
            {loading && (
                <div className="loading">
                    <div className="spinner" />
                    <p>
                        Running {fastMode && selectedModel === "lstm" ? "LR (Fast Mode)" : activeModel?.label}
                        {" + Sentiment analysis…"}
                    </p>
                    {!fastMode && selectedModel === "lstm" && (
                        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                            LSTM training can take 10–15s. Enable Fast Mode for instant results.
                        </p>
                    )}
                </div>
            )}

            {/* ── results ── */}
            {data && (
                <div className="result-card">
                    {/* header */}
                    <div className="result-header">
                        <div>
                            <div className="result-symbol">{data.symbol}</div>
                            <div className="meta-row">
                                <span className="meta-item">
                                    <span className="meta-label">Current: </span>
                                    <span className="result-price">₹{data.current_price.toFixed(2)}</span>
                                </span>
                                <span className="model-used-badge" style={{ color: activeModel?.color }}>
                                    {effectiveModel}
                                    {data.fast_mode && (
                                        <span style={{ marginLeft: "0.4rem", color: "#f59e0b", fontSize: "0.68rem" }}>
                                            ⚡ Fast
                                        </span>
                                    )}
                                </span>
                                {data.market_status && (
                                    <MarketStatusBadge status={data.market_status} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* sentiment panel */}
                    {data.sentiment && (
                        <SentimentPanel
                            sentiment={data.sentiment}
                            modelColor={activeModel?.color}
                            impactRs={data.sentiment_impact_rs}
                        />
                    )}

                    {/* dual-line chart */}
                    <div className="section-title" style={{ marginTop: "1.5rem" }}>
                        10-Day Price Forecast
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
                                <XAxis dataKey="day" tick={{ fill: "#697386", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tick={{ fill: "#697386", fontSize: 11 }}
                                    domain={["auto", "auto"]}
                                    tickFormatter={(v) => `₹${v}`}
                                    axisLine={false}
                                    tickLine={false}
                                    width={72}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: "11px", paddingTop: "0.5rem" }}
                                />
                                <ReferenceLine
                                    y={data.current_price}
                                    stroke="#697386"
                                    strokeDasharray="4 4"
                                    label={{ value: "Current", position: "right", fontSize: 10, fill: "#697386" }}
                                />
                                {/* ML-only line */}
                                <Line
                                    type="monotone"
                                    dataKey="ML Only"
                                    stroke={activeModel?.color}
                                    strokeWidth={2}
                                    strokeDasharray="5 3"
                                    dot={{ fill: activeModel?.color, r: 3, strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                                {/* Hybrid line */}
                                <Line
                                    type="monotone"
                                    dataKey="Hybrid"
                                    stroke={hybridColor}
                                    strokeWidth={2.5}
                                    dot={{ fill: hybridColor, r: 3, strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* comparison table */}
                    {data.hybrid_predictions && (
                        <>
                            <div className="section-title" style={{ marginTop: "1.5rem" }}>
                                Day-by-Day Comparison
                            </div>
                            <ComparisonTable
                                predictions={data.predictions}
                                hybridPredictions={data.hybrid_predictions}
                                currentPrice={data.current_price}
                                modelColor={activeModel?.color}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default Prediction;