"""
app.py — FastAPI Server for Stock Price Prediction + TickerSense LangGraph Multi-Agent Research.

Endpoints:
  GET  /              — Server status & IST market status
  POST /predict       — ML price forecast (LSTM / LR / RF) + sentiment adjustment
  POST /analysis      — Technical indicators (MA50, MA200, RSI, MACD) chart data
  POST /agent/analyze — Complete TickerSense LangGraph agent pipeline execution
  GET  /agent/stream  — Server-Sent Events (SSE) live step-by-step agent execution
"""

import os
import time
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta

import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from model import train_lstm, predict_next_days, train_and_predict_lr, train_and_predict_rf
from indicators import add_indicators
from sentiment import get_sentiment
from agent import agent_graph, run_agent_pipeline, resolve_ticker_symbol

# ─────────────────────────────────────────────────────────────────────────────
#  FastAPI Setup
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TickerSense API",
    description="Full-stack AI Stock Research Agent powered by LangGraph & Groq",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
#  Helpers & Cache
# ─────────────────────────────────────────────────────────────────────────────
IST = timezone(timedelta(hours=5, minutes=30))
_CACHE: dict = {}
_CACHE_TTL = 300  # 5 minutes

def market_status() -> dict:
    now_ist = datetime.now(IST)
    weekday = now_ist.weekday()
    minutes = now_ist.hour * 60 + now_ist.minute
    is_open = (weekday < 5) and (9 * 60 + 15 <= minutes <= 15 * 60 + 30)
    return {
        "open": is_open,
        "label": "Market Open" if is_open else "Market Closed",
        "time": now_ist.strftime("%H:%M IST"),
    }

def cache_get(key: str):
    entry = _CACHE.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["value"]
    return None

def cache_set(key: str, value):
    _CACHE[key] = {"ts": time.time(), "value": value}

# ─────────────────────────────────────────────────────────────────────────────
#  Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    symbol: str
    model: str = "lstm"
    fast_mode: bool = False

class AnalysisRequest(BaseModel):
    symbol: str

class AgentRequest(BaseModel):
    symbol: str

# ─────────────────────────────────────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "TickerSense FastAPI Backend",
        "market_status": market_status(),
        "groq_api_key_configured": bool(os.getenv("GROQ_API_KEY")),
    }

@app.post("/predict")
def predict(req: PredictRequest):
    raw_symbol = req.symbol.strip()
    model_type = req.model.lower()
    fast_mode = req.fast_mode
    days = 10

    if not raw_symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    resolved_ticker = resolve_ticker_symbol(raw_symbol)

    if fast_mode and model_type == "lstm":
        model_type = "lr"
        logger.info("Fast mode active — switching to Linear Regression for %s.", resolved_ticker)

    df = pd.DataFrame()
    try:
        ticker = yf.Ticker(resolved_ticker)
        _df = ticker.history(period="1y")
        if isinstance(_df.columns, pd.MultiIndex):
            _df.columns = _df.columns.get_level_values(0)
        if not _df.empty and len(_df) >= 30:
            df = _df
    except Exception as fetch_err:
        logger.debug("Ticker %s failed: %s", resolved_ticker, fetch_err)

    if df.empty or len(df) < 30:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient price history for ticker '{raw_symbol}' (resolved as '{resolved_ticker}'). Please check symbol validity."
        )

    current_price = float(df["Close"].squeeze().iloc[-1])

    cache_key = f"{resolved_ticker}:{model_type}"
    ml_predictions = cache_get(cache_key)

    if ml_predictions is None:
        logger.info("Cache miss — training %s for %s.", model_type, resolved_ticker)
        if model_type == "lstm":
            model, scaler = train_lstm(df)
            ml_predictions = predict_next_days(model, scaler, df, days=days).tolist()
        elif model_type == "lr":
            ml_predictions = train_and_predict_lr(df, days=days).tolist()
        elif model_type == "rf":
            ml_predictions = train_and_predict_rf(df, days=days).tolist()
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model_type}")
        cache_set(cache_key, ml_predictions)

    clean_sym = resolved_ticker.replace(".NS", "").replace(".BO", "")
    sentiment_data = get_sentiment(clean_sym)
    compound = sentiment_data["summary"]["avg_compound"]
    adj = round(compound * 10, 2)
    adjusted_predictions = [round(p + adj, 2) for p in ml_predictions]

    hist_series = []
    for idx, row in df.tail(60).iterrows():
        d_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        hist_series.append({"date": d_str, "close": round(float(row["Close"]), 2)})

    last_date = df.index[-1]
    if isinstance(last_date, str):
        last_date = pd.to_datetime(last_date)
    future_dates = [(last_date + pd.Timedelta(days=i+1)).strftime("%Y-%m-%d") for i in range(days)]

    forecast_series = []
    for d, raw_p, adj_p in zip(future_dates, ml_predictions, adjusted_predictions):
        forecast_series.append({
            "date": d,
            "raw_pred": round(float(raw_p), 2),
            "adj_pred": round(float(adj_p), 2),
        })

    return {
        "symbol": resolved_ticker,
        "query": raw_symbol,
        "current_price": round(current_price, 2),
        "model_used": model_type,
        "sentiment_adjustment": adj,
        "sentiment_summary": sentiment_data["summary"],
        "historical": hist_series,
        "forecast": forecast_series,
        "market_status": market_status(),
    }

@app.post("/analysis")
def analysis(req: AnalysisRequest):
    raw_symbol = req.symbol.strip()
    if not raw_symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    resolved_ticker = resolve_ticker_symbol(raw_symbol)

    df = pd.DataFrame()
    try:
        ticker = yf.Ticker(resolved_ticker)
        _df = ticker.history(period="1y")
        if isinstance(_df.columns, pd.MultiIndex):
            _df.columns = _df.columns.get_level_values(0)
        if not _df.empty and len(_df) >= 30:
            df = _df
    except Exception as err:
        logger.debug("Fetch error %s: %s", resolved_ticker, err)

    if df.empty:
        raise HTTPException(status_code=400, detail=f"No price history found for '{raw_symbol}' (resolved as '{resolved_ticker}').")

    df_ind = add_indicators(df.copy())
    chart_points = []
    for idx, row in df_ind.tail(120).iterrows():
        d_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        chart_points.append({
            "date": d_str,
            "close": round(float(row["Close"]), 2) if pd.notna(row["Close"]) else None,
            "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
            "ma50": round(float(row["MA50"]), 2) if "MA50" in row and pd.notna(row["MA50"]) else None,
            "ma200": round(float(row["MA200"]), 2) if "MA200" in row and pd.notna(row["MA200"]) else None,
            "rsi": round(float(row["RSI"]), 2) if "RSI" in row and pd.notna(row["RSI"]) else None,
            "macd": round(float(row["MACD"]), 4) if "MACD" in row and pd.notna(row["MACD"]) else None,
            "macd_signal": round(float(row["MACD_SIGNAL"]), 4) if "MACD_SIGNAL" in row and pd.notna(row["MACD_SIGNAL"]) else None,
        })

    return {
        "symbol": resolved_ticker,
        "query": raw_symbol,
        "data_points": len(chart_points),
        "chart_series": chart_points,
    }

@app.post("/agent/analyze")
def agent_analyze(req: AgentRequest):
    symbol = req.symbol.strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    logger.info("Executing TickerSense LangGraph agent pipeline for '%s'...", symbol)
    result = run_agent_pipeline(symbol)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return {
        "symbol": result.get("resolved_ticker", symbol),
        "price_data": result.get("price_data"),
        "chart_series": result.get("chart_series", []),
        "headlines": result.get("headlines", []),
        "technical_signals": result.get("technical_signals"),
        "sentiment_analysis": result.get("sentiment_analysis"),
        "catalyst_breakdown": result.get("catalyst_breakdown"),
        "step_logs": result.get("step_logs", []),
    }

@app.get("/agent/stream")
async def agent_stream(symbol: str = Query(..., description="Ticker symbol or query to analyze")):
    clean_symbol = symbol.strip()
    if not clean_symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    async def event_generator():
        initial_state = {
            "symbol": clean_symbol,
            "resolved_ticker": clean_symbol,
            "price_data": None,
            "chart_series": [],
            "headlines": [],
            "technical_signals": None,
            "sentiment_analysis": None,
            "catalyst_breakdown": None,
            "step_logs": [],
            "error": None,
        }

        try:
            yield f"event: start\ndata: {json.dumps({'symbol': clean_symbol, 'message': 'Agent pipeline initialized'})}\n\n"
            await asyncio.sleep(0.05)

            for output in agent_graph.stream(initial_state):
                for node_name, node_state in output.items():
                    step_logs = node_state.get("step_logs", [])
                    latest_log = step_logs[-1] if step_logs else {}
                    
                    event_payload = {
                        "node": node_name,
                        "log": latest_log,
                        "state_snapshot": {
                            "resolved_ticker": node_state.get("resolved_ticker"),
                            "price_data": node_state.get("price_data"),
                            "technical_signals": node_state.get("technical_signals"),
                            "sentiment_analysis": node_state.get("sentiment_analysis"),
                            "catalyst_breakdown": node_state.get("catalyst_breakdown"),
                        }
                    }
                    yield f"event: step\ndata: {json.dumps(event_payload)}\n\n"
                    await asyncio.sleep(0.1)

            final_res = run_agent_pipeline(clean_symbol)
            yield f"event: complete\ndata: {json.dumps(final_res)}\n\n"

        except Exception as exc:
            logger.error("SSE stream error for %s: %s", clean_symbol, exc)
            yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)