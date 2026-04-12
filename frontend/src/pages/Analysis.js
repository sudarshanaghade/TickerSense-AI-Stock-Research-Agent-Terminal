import { useState } from "react";
import { getAnalysis } from "../api";

function getRSISignal(rsi) {
    if (rsi === null || rsi === undefined) return { label: "N/A", cls: "neutral-c" };
    if (rsi > 70) return { label: "Overbought", cls: "bearish" };
    if (rsi < 30) return { label: "Oversold", cls: "bullish" };
    return { label: "Neutral", cls: "neutral-c" };
}

function getMACDSignal(macd) {
    if (macd === null || macd === undefined) return { label: "N/A", cls: "neutral-c" };
    if (macd > 0) return { label: "Bullish", cls: "bullish" };
    return { label: "Bearish", cls: "bearish" };
}

function getMASignal(ma50, ma200) {
    if (!ma50 || !ma200) return { label: "Insufficient Data", cls: "neutral-c" };
    if (ma50 > ma200) return { label: "Golden Cross", cls: "bullish" };
    return { label: "Death Cross", cls: "bearish" };
}

function Analysis() {
    const [symbol, setSymbol] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAnalysis = async () => {
        if (!symbol.trim()) return;
        setLoading(true);
        setError("");
        setData(null);
        try {
            const res = await getAnalysis(symbol.trim().toUpperCase());
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to fetch analysis.");
        } finally {
            setLoading(false);
        }
    };

    const rsi = data ? getRSISignal(data.RSI) : null;
    const macd = data ? getMACDSignal(data.MACD) : null;
    const ma = data ? getMASignal(data.MA50, data.MA200) : null;

    return (
        <div className="page">
            <div className="form-card">
                <h2>Technical Analysis</h2>
                <p className="subtitle">MA50, MA200, RSI & MACD indicators for any NSE-listed stock</p>
                <div className="input-row">
                    <div className="input-group">
                        <label>Stock Symbol</label>
                        <input
                            className="stock-input"
                            placeholder="e.g. RELIANCE, TCS, INFY"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAnalysis()}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleAnalysis} disabled={loading}>
                        {loading ? "Analysing..." : "Analyse"}
                    </button>
                </div>
                {error && <div className="error-box">{error}</div>}
            </div>

            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Fetching data and computing indicators...</p>
                </div>
            )}

            {data && (
                <div className="result-card">
                    <div className="section-title">Indicators</div>
                    <div className="indicators-grid">
                        <div className="indicator-card">
                            <div className="ind-label">MA50</div>
                            <div className="ind-value">{data.MA50 ? `Rs.${data.MA50.toFixed(2)}` : "N/A"}</div>
                            <div className="ind-hint">50-day moving average</div>
                        </div>
                        <div className="indicator-card">
                            <div className="ind-label">MA200</div>
                            <div className="ind-value">{data.MA200 ? `Rs.${data.MA200.toFixed(2)}` : "N/A"}</div>
                            <div className="ind-hint">200-day moving average</div>
                        </div>
                        <div className="indicator-card">
                            <div className="ind-label">RSI (14)</div>
                            <div className={`ind-value ${rsi?.cls}`}>{data.RSI ? data.RSI.toFixed(1) : "N/A"}</div>
                            <div className="ind-hint">{rsi?.label}</div>
                        </div>
                        <div className="indicator-card">
                            <div className="ind-label">MACD</div>
                            <div className={`ind-value ${macd?.cls}`}>{data.MACD ? data.MACD.toFixed(4) : "N/A"}</div>
                            <div className="ind-hint">{macd?.label}</div>
                        </div>
                    </div>

                    <div className="section-title" style={{ marginTop: "1.5rem" }}>Signals</div>
                    <div className="indicators-grid">
                        <div className="signal-card">
                            <span className="sig-label">MA Signal</span>
                            <span className={`sig-value ${ma?.cls}`}>{ma?.label}</span>
                        </div>
                        <div className="signal-card">
                            <span className="sig-label">RSI Signal</span>
                            <span className={`sig-value ${rsi?.cls}`}>{rsi?.label}</span>
                        </div>
                        <div className="signal-card">
                            <span className="sig-label">MACD Signal</span>
                            <span className={`sig-value ${macd?.cls}`}>{macd?.label}</span>
                        </div>
                    </div>

                    {data.RSI !== null && data.RSI !== undefined && (
                        <>
                            <div className="section-title" style={{ marginTop: "1.5rem" }}>RSI Gauge</div>
                            <div style={{ background: "var(--bg)", borderRadius: "6px", padding: "1rem 1.2rem", border: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.4rem" }}>
                                    <span>Oversold (30)</span>
                                    <span style={{ fontWeight: 700, color: rsi?.cls === "bullish" ? "var(--green)" : rsi?.cls === "bearish" ? "var(--red)" : "#b45309" }}>
                                        RSI: {data.RSI.toFixed(1)}
                                    </span>
                                    <span>Overbought (70)</span>
                                </div>
                                <div style={{ background: "var(--border)", height: "8px", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                                    <div style={{ position: "absolute", left: 0, width: "30%", height: "100%", background: "rgba(45,154,78,0.2)" }}></div>
                                    <div style={{ position: "absolute", left: "70%", width: "30%", height: "100%", background: "rgba(217,79,61,0.2)" }}></div>
                                    <div style={{
                                        position: "absolute",
                                        left: `calc(${Math.min(Math.max(data.RSI, 0), 100)}% - 4px)`,
                                        top: 0, width: "8px", height: "100%",
                                        background: rsi?.cls === "bullish" ? "var(--green)" : rsi?.cls === "bearish" ? "var(--red)" : "#b45309",
                                        borderRadius: "4px",
                                        transition: "left 0.5s ease"
                                    }}></div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default Analysis;