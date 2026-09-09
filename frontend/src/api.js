import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

/**
 * Fetch technical indicators analysis data.
 */
export const getAnalysis = (symbol) =>
  API.post("/analysis", { symbol });

/**
 * Synchronously execute the TickerSense LangGraph agent pipeline.
 */
export const runAgent = (symbol) =>
  API.post("/agent/analyze", { symbol });

/**
 * Create an EventSource for streaming live agent execution steps.
 */
export const createAgentEventSource = (symbol) => {
  return new EventSource(`http://localhost:5000/agent/stream?symbol=${encodeURIComponent(symbol)}`);
};

export default API;