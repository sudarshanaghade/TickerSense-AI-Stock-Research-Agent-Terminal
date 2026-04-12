import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000"
});

/**
 * Run a stock price prediction.
 * @param {string} symbol   - NSE ticker symbol (e.g. "RELIANCE")
 * @param {string} model    - "lstm" | "lr" | "rf"
 * @param {number} alpha    - Sentiment influence strength (0.0 – 0.10). Default: 0.02
 * @param {boolean} fastMode - If true, skips LSTM and uses LR for speed
 */
export const predictStock = (symbol, model = "lstm", fastMode = false) =>
  API.post("/predict", { symbol, model, fast_mode: fastMode });

export const getAnalysis = (symbol) =>
  API.post("/analysis", { symbol });