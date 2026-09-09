import React, { useState, useEffect } from "react";
import TopNav from "../components/TopNav";
import PriceChart from "../components/PriceChart";
import AgentTimeline from "../components/AgentTimeline";
import CatalystBreakdown from "../components/CatalystBreakdown";
import NewsFeed from "../components/NewsFeed";
import GuideModal from "../components/GuideModal";
import { runAgent, getAnalysis, createAgentEventSource } from "../api";

export default function TerminalPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [isRunning, setIsRunning] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [priceData, setPriceData] = useState(null);
  const [chartSeries, setChartSeries] = useState([]);
  const [headlines, setHeadlines] = useState([]);
  const [catalystBreakdown, setCatalystBreakdown] = useState(null);
  const [stepLogs, setStepLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTickerAnalysis(symbol);
  }, [symbol]);

  const fetchTickerAnalysis = async (tickerSym) => {
    try {
      setError(null);
      const res = await getAnalysis(tickerSym);
      if (res.data) {
        setChartSeries(res.data.chart_series || []);
        if (res.data.symbol) setSymbol(res.data.symbol);
      }
    } catch (err) {
      console.warn("Failed to fetch initial analysis:", err);
    }
  };

  const handleSearch = (newSymbol) => {
    if (!newSymbol) return;
    setSymbol(newSymbol);
    setCatalystBreakdown(null);
    setStepLogs([]);
    fetchTickerAnalysis(newSymbol);
  };

  const handleRunAgent = async (targetSymbol) => {
    const sym = targetSymbol || symbol;
    setIsRunning(true);
    setError(null);
    setStepLogs([]);
    setCatalystBreakdown(null);

    try {
      const sse = createAgentEventSource(sym);

      sse.addEventListener("start", (e) => {
        console.log("Agent stream started:", e.data);
      });

      sse.addEventListener("step", (e) => {
        try {
          const payload = JSON.parse(e.data);
          const { log, state_snapshot } = payload;
          if (log && log.step) {
            setStepLogs((prev) => {
              const existingIdx = prev.findIndex((l) => l.step === log.step);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = log;
                return updated;
              }
              return [...prev, log];
            });
          }

          if (state_snapshot) {
            if (state_snapshot.price_data) setPriceData(state_snapshot.price_data);
            if (state_snapshot.catalyst_breakdown) setCatalystBreakdown(state_snapshot.catalyst_breakdown);
          }
        } catch (err) {
          console.error("Error parsing step event:", err);
        }
      });

      sse.addEventListener("complete", (e) => {
        try {
          const res = JSON.parse(e.data);
          setPriceData(res.price_data);
          setChartSeries(res.chart_series || []);
          setHeadlines(res.headlines || []);
          setCatalystBreakdown(res.catalyst_breakdown);
          setStepLogs(res.step_logs || []);
          if (res.symbol) setSymbol(res.symbol);
        } catch (err) {
          console.error("Error parsing complete event:", err);
        } finally {
          setIsRunning(false);
          sse.close();
        }
      });

      sse.addEventListener("error", (e) => {
        console.warn("SSE stream error, falling back to sync run:", e);
        sse.close();
        fallbackSyncRun(sym);
      });

    } catch (err) {
      console.warn("EventSource creation failed, falling back to sync run:", err);
      fallbackSyncRun(sym);
    }
  };

  const fallbackSyncRun = async (sym) => {
    try {
      const res = await runAgent(sym);
      const data = res.data;
      setPriceData(data.price_data);
      setChartSeries(data.chart_series || []);
      setHeadlines(data.headlines || []);
      setCatalystBreakdown(data.catalyst_breakdown);
      setStepLogs(data.step_logs || []);
      if (data.symbol) setSymbol(data.symbol);
    } catch (err) {
      console.error("Sync agent call failed:", err);
      setError(err.response?.data?.detail || "Failed to execute agent pipeline.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="terminal-layout">
      {/* Top Bar Navigation & Key Stats Strip */}
      <TopNav
        symbol={symbol}
        onSearch={handleSearch}
        onRunAgent={handleRunAgent}
        isRunning={isRunning}
        priceData={priceData}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {error && (
        <div className="font-mono" style={{ background: "var(--accent-red-bg)", color: "var(--accent-red)", borderBottom: "1px solid var(--accent-red-border)", padding: "6px 16px", fontSize: "11px" }}>
          ERROR: {error}
        </div>
      )}

      {/* Main Terminal Grid Pane */}
      <div className="terminal-main-grid">
        {/* Left Pane: Technical Chart */}
        <div className="terminal-left-pane">
          <PriceChart chartSeries={chartSeries} symbol={symbol} />
        </div>

        {/* Right Pane Stacked: Execution Timeline & Catalyst Breakdown */}
        <div className="terminal-right-pane">
          <AgentTimeline stepLogs={stepLogs} isRunning={isRunning} />
          <CatalystBreakdown breakdown={catalystBreakdown} symbol={symbol} />
        </div>
      </div>

      {/* Bottom Strip: News Feed */}
      <NewsFeed headlines={headlines} />

      {/* User Guide Modal */}
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
