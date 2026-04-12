"""
app.py — Flask API for Stock Price Prediction + Sentiment Fusion.

Endpoints:
  POST /predict   — ML price forecast + sentiment-adjusted hybrid predictions
  POST /analysis  — Technical indicators (MA50, MA200, RSI, MACD)

Features:
  - Three ML models: lstm | lr | rf
  - Fast Mode: lr/rf only (skips LSTM training, ~10x faster)
  - Sentiment adjustment: compound * 10 added to predictions
  - In-memory prediction cache with 5-minute TTL
  - IST-aware market status (NSE: 09:15–15:30)
"""

import time
import logging
from datetime import datetime, timezone, timedelta

import pandas as pd
import yfinance as yf
from flask import Flask, request, jsonify
from flask_cors import CORS

from model import train_lstm, predict_next_days, train_and_predict_lr, train_and_predict_rf
from indicators import add_indicators
from sentiment import get_sentiment

# ─────────────────────────────────────────────────────────────────────────────
#  App setup
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

# IST = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))

def _market_status() -> dict:
    """Return NSE market open/closed status based on current IST time."""
    now_ist  = datetime.now(IST)
    weekday  = now_ist.weekday()          # 0 = Monday … 6 = Sunday
    hh, mm   = now_ist.hour, now_ist.minute
    minutes  = hh * 60 + mm
    is_open  = (
        weekday < 5                       # Mon–Fri only
        and 9 * 60 + 15 <= minutes <= 15 * 60 + 30
    )
    return {
        "open":  is_open,
        "label": "Market Open" if is_open else "Market Closed",
        "time":  now_ist.strftime("%H:%M IST"),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  In-memory prediction cache  (TTL: 5 minutes)
# ─────────────────────────────────────────────────────────────────────────────

_CACHE: dict = {}          # key → {"ts": float, "predictions": list}
_CACHE_TTL   = 5 * 60      # 300 seconds


def _cache_get(key: str):
    entry = _CACHE.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["value"]
    return None


def _cache_set(key: str, value):
    _CACHE[key] = {"ts": time.time(), "value": value}


# ─────────────────────────────────────────────────────────────────────────────
#  /predict
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    data        = request.get_json() or {}
    symbol      = (data.get("symbol") or "").strip().upper()
    model_type  = data.get("model", "lstm").lower()
    fast_mode   = bool(data.get("fast_mode", False))
    days        = 10  # number of days to forecast

    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400

    # Fast mode forces a quick model (lr is fastest, then rf)
    if fast_mode and model_type == "lstm":
        model_type = "lr"
        logger.info("Fast mode active — switching to Linear Regression for %s.", symbol)

    try:
        # ── Fetch historical data (auto-detect exchange) ──────────────────────
        # Try the symbol as-is first (works for US stocks, crypto, etc.),
        # then fall back to .NS (NSE India) and .BO (BSE India).
        df = pd.DataFrame()
        resolved_ticker = symbol
        for suffix in ["", ".NS", ".BO"]:
            candidate = f"{symbol}{suffix}"
            try:
                ticker = yf.Ticker(candidate)
                _df    = ticker.history(period="1y")
                if isinstance(_df.columns, pd.MultiIndex):
                    _df.columns = _df.columns.get_level_values(0)
                if not _df.empty and len(_df) >= 60:
                    df = _df
                    resolved_ticker = candidate
                    logger.info("Resolved %s → %s (%d rows)", symbol, candidate, len(df))
                    break
            except Exception as fetch_err:
                logger.debug("Ticker %s failed: %s", candidate, fetch_err)

        if df.empty or len(df) < 60:
            return jsonify({
                "error": f"Insufficient data for '{symbol}'. "
                         f"Check the ticker symbol and try again (e.g. RELIANCE, TCS, AAPL)."
            }), 400

        current_price = float(df["Close"].squeeze().iloc[-1])

        # ── Step 1: ML Price Prediction (with cache) ──────────────────────────
        cache_key      = f"{resolved_ticker}:{model_type}"
        ml_predictions = _cache_get(cache_key)

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
                return jsonify({"error": f"Unknown model: {model_type}"}), 400
            _cache_set(cache_key, ml_predictions)
        else:
            logger.info("Cache hit for %s:%s.", resolved_ticker, model_type)

        # ── Step 2: News Sentiment Analysis ──────────────────────────────────
        sentiment_result = get_sentiment(symbol)
        summary          = sentiment_result["summary"]
        compound         = summary["avg_compound"]   # range: -1.0 to +1.0

        # ── Step 3: Hybrid Fusion ─────────────────────────────────────────────
        # Simple sentiment adjustment: sentiment_score * 10 added to predictions
        sentiment_adjustment = compound * 10
        hybrid_predictions = [
            round(price + sentiment_adjustment, 2)
            for price in ml_predictions
        ]

        # Sentiment impact in absolute terms (Day 10 hybrid vs ML-only)
        sentiment_impact_rs = round(
            hybrid_predictions[-1] - ml_predictions[-1], 2
        ) if days > 0 else 0.0

        return jsonify({
            "symbol":              symbol,
            "resolved_ticker":     resolved_ticker,
            "model":               model_type.upper(),
            "fast_mode":           fast_mode,
            "current_price":       current_price,
            "market_status":       _market_status(),
            "predictions":         [round(p, 2) for p in ml_predictions],
            "hybrid_predictions":  hybrid_predictions,
            "sentiment_impact_rs": sentiment_impact_rs,
            "sentiment": {
                "avg_compound":   round(compound, 4),
                "overall_label":  summary["overall_label"],
                "positive_count": summary["positive_count"],
                "negative_count": summary["negative_count"],
                "neutral_count":  summary["neutral_count"],
                "total":          summary["total"],
                "source":         summary.get("source", "Unknown"),
            },
        })

    except Exception as exc:
        logger.error("Error in /predict: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  /analysis
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/analysis", methods=["POST"])
def analysis():
    data   = request.get_json() or {}
    symbol = (data.get("symbol") or "").strip().upper()

    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400

    try:
        # Auto-detect exchange (same logic as /predict)
        df = pd.DataFrame()
        for suffix in ["", ".NS", ".BO"]:
            candidate = f"{symbol}{suffix}"
            try:
                ticker = yf.Ticker(candidate)
                _df    = ticker.history(period="1y")
                if isinstance(_df.columns, pd.MultiIndex):
                    _df.columns = _df.columns.get_level_values(0)
                if not _df.empty and len(_df) >= 200:
                    df = _df
                    break
            except Exception:
                pass

        if df.empty or len(df) < 200:
            return jsonify({
                "error": f"Insufficient data for {symbol}. Need at least 200 trading days."
            }), 400

        df  = add_indicators(df)
        row = df.iloc[-1]

        return jsonify({
            "symbol": symbol,
            "MA50":   float(row["MA50"])   if pd.notna(row["MA50"])   else None,
            "MA200":  float(row["MA200"])  if pd.notna(row["MA200"])  else None,
            "RSI":    float(row["RSI"])    if pd.notna(row["RSI"])    else None,
            "MACD":   float(row["MACD"])   if pd.notna(row["MACD"])   else None,
        })

    except Exception as exc:
        logger.error("Error in /analysis: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  /sentiment
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/sentiment", methods=["POST"])
def sentiment():
    data   = request.get_json() or {}
    symbol = (data.get("symbol") or "").strip().upper()

    if not symbol:
        return jsonify({"error": "Symbol is required"}), 400

    try:
        result = get_sentiment(symbol)
        return jsonify({"symbol": symbol, **result})
    except Exception as exc:
        logger.error("Error in /sentiment: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)