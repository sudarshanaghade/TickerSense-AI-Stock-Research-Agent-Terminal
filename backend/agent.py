import os
import json
import logging
import difflib
import pandas as pd
import yfinance as yf
from typing import TypedDict, List, Dict, Any, Optional
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from sentiment import get_sentiment
from indicators import add_indicators

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
logger = logging.getLogger(__name__)

# ── GROQ API Setup ────────────────────────────────────────────────────────────

def get_fast_llm():
    """Return fast LLM (llama-3.1-8b-instant) for quick reasoning tasks."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        return ChatGroq(
            model_name="llama-3.1-8b-instant",
            groq_api_key=api_key,
            temperature=0.1,
        )
    except Exception as e:
        logger.warning("Could not initialize ChatGroq fast model: %s", e)
        return None

def get_synthesizer_llm():
    """Return versatile high-reasoning LLM (llama-3.3-70b-versatile) for synthesis."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        return ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key=api_key,
            temperature=0.3,
        )
    except Exception as e:
        logger.warning("Could not initialize ChatGroq synthesizer model: %s", e)
        return None

# ── Smart Ticker Resolver ───────────────────────────────────────────────────
KNOWN_ALIASES = {
    "RELIENCE": "RELIANCE.NS",
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "TATA MOTORS": "TATAMOTORS.NS",
    "TATAMOTORS": "TATAMOTORS.NS",
    "SBI": "SBIN.NS",
    "STATE BANK OF INDIA": "SBIN.NS",
    "INFY": "INFY.NS",
    "INFOSYS": "INFY.NS",
    "HDFC": "HDFCBANK.NS",
    "HDFC BANK": "HDFCBANK.NS",
    "ICICI": "ICICIBANK.NS",
    "ICICI BANK": "ICICIBANK.NS",
    "WIPRO": "WIPRO.NS",
    "BHARTI AIRTEL": "BHARTIARTL.NS",
    "AIRTEL": "BHARTIARTL.NS",
    "APPLE": "AAPL",
    "MICROSOFT": "MSFT",
    "GOOGLE": "GOOGL",
    "ALPHABET": "GOOGL",
    "AMAZON": "AMZN",
    "NVIDIA": "NVDA",
    "NVADIA": "NVDA",
    "TESLA": "TSLA",
    "META": "META",
    "FACEBOOK": "META",
    "NETFLIX": "NFLX",
}

def resolve_ticker_symbol(query: str) -> str:
    """
    Smart ticker symbol resolver that converts company names, typos, 
    and inputs (e.g. 'RELIENCE', 'Tata Motors', 'Apple') into valid Yahoo Finance tickers.
    """
    raw_query = query.strip()
    query_clean = raw_query.upper()

    # 1. Direct Known Alias lookup
    if query_clean in KNOWN_ALIASES:
        return KNOWN_ALIASES[query_clean]

    # 2. Fuzzy match against known alias keys
    close_matches = difflib.get_close_matches(query_clean, list(KNOWN_ALIASES.keys()), n=1, cutoff=0.7)
    if close_matches:
        logger.info("Fuzzy match found: '%s' -> '%s' (%s)", raw_query, close_matches[0], KNOWN_ALIASES[close_matches[0]])
        return KNOWN_ALIASES[close_matches[0]]

    # 3. Direct ticker test (as-is, .NS, .BO)
    for suffix in ["", ".NS", ".BO"]:
        candidate = f"{query_clean}{suffix}"
        try:
            t = yf.Ticker(candidate)
            hist = t.history(period="5d")
            if not hist.empty and len(hist) > 0:
                return candidate
        except Exception:
            pass

    # 4. Yahoo Finance Search API
    try:
        search_res = yf.Search(raw_query)
        quotes = search_res.quotes if hasattr(search_res, "quotes") else []
        for q in quotes:
            sym = q.get("symbol")
            if sym:
                try:
                    t = yf.Ticker(sym)
                    hist = t.history(period="5d")
                    if not hist.empty and len(hist) > 0:
                        logger.info("yf.Search resolved '%s' -> '%s'", raw_query, sym)
                        return sym
                except Exception:
                    pass
    except Exception as err:
        logger.debug("yf.Search failed for %s: %s", raw_query, err)

    # 5. Groq LLM Fallback (if key is set)
    llm = get_fast_llm()
    if llm:
        try:
            sys_msg = (
                "You are a financial stock ticker resolver. Convert company names, user queries, or typos into the exact Yahoo Finance ticker symbol.\n"
                "Examples:\n"
                "- 'RELIENCE' -> 'RELIANCE.NS'\n"
                "- 'Tata Motors' -> 'TATAMOTORS.NS'\n"
                "- 'Apple' -> 'AAPL'\n"
                "Respond ONLY with the exact ticker symbol string."
            )
            resp = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=raw_query)])
            resolved = resp.content.strip().replace("'", "").replace('"', "").upper()
            if resolved:
                logger.info("LLM resolved '%s' -> '%s'", raw_query, resolved)
                return resolved
        except Exception as exc:
            logger.warning("LLM ticker resolution failed: %s", exc)

    return query_clean

# ── Agent State Definition ───────────────────────────────────────────────────
class AgentState(TypedDict):
    symbol: str
    resolved_ticker: str
    price_data: Optional[Dict[str, Any]]
    chart_series: List[Dict[str, Any]]
    headlines: List[Dict[str, Any]]
    technical_signals: Optional[Dict[str, Any]]
    sentiment_analysis: Optional[Dict[str, Any]]
    catalyst_breakdown: Optional[Dict[str, Any]]
    step_logs: List[Dict[str, Any]]
    error: Optional[str]

# ─────────────────────────────────────────────────────────────────────────────
# Node 1: Data-Fetch Agent
# ─────────────────────────────────────────────────────────────────────────────
def data_fetch_node(state: AgentState) -> AgentState:
    raw_symbol = state["symbol"].strip()
    logger.info("Data Fetch Node resolving symbol query: '%s'", raw_symbol)

    # Smart Ticker Symbol Resolution
    resolved_ticker = resolve_ticker_symbol(raw_symbol)
    logger.info("Resolved symbol query '%s' -> ticker '%s'", raw_symbol, resolved_ticker)

    df = pd.DataFrame()
    ticker = yf.Ticker(resolved_ticker)
    try:
        df = ticker.history(period="1y")
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
    except Exception as err:
        logger.warning("Fetch history for %s failed: %s", resolved_ticker, err)

    if df.empty or len(df) < 5:
        error_msg = f"Could not fetch price history for ticker '{raw_symbol}' (resolved as '{resolved_ticker}'). Check symbol validity."
        return {
            **state,
            "error": error_msg,
            "step_logs": state.get("step_logs", []) + [{
                "step": "data_fetch",
                "name": "Data Fetch Agent",
                "status": "failed",
                "message": error_msg,
            }]
        }

    # Extract price metadata
    close_prices = df["Close"].squeeze()
    volumes = df["Volume"].squeeze()
    
    latest_close = float(close_prices.iloc[-1])
    prev_close = float(close_prices.iloc[-2]) if len(close_prices) > 1 else latest_close
    price_change = round(latest_close - prev_close, 2)
    price_change_pct = round((price_change / prev_close) * 100, 2)
    high_52w = float(df["High"].max())
    low_52w = float(df["Low"].min())
    latest_vol = int(volumes.iloc[-1]) if pd.notna(volumes.iloc[-1]) else 0
    avg_vol_20 = int(volumes.tail(20).mean()) if len(volumes) >= 20 else latest_vol

    # Fetch news headlines via sentiment module (yfinance + NewsAPI fallback)
    clean_sym_for_news = resolved_ticker.replace(".NS", "").replace(".BO", "")
    raw_sentiment = get_sentiment(clean_sym_for_news)
    headlines = raw_sentiment.get("headlines", [])

    # Format chart series with technical indicators attached
    df_with_ind = add_indicators(df.copy())
    chart_series = []
    for idx, row in df_with_ind.tail(120).iterrows():
        date_str = idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx)[:10]
        chart_series.append({
            "date": date_str,
            "close": round(float(row["Close"]), 2) if pd.notna(row["Close"]) else None,
            "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
            "ma50": round(float(row["MA50"]), 2) if "MA50" in row and pd.notna(row["MA50"]) else None,
            "ma200": round(float(row["MA200"]), 2) if "MA200" in row and pd.notna(row["MA200"]) else None,
            "rsi": round(float(row["RSI"]), 2) if "RSI" in row and pd.notna(row["RSI"]) else None,
            "macd": round(float(row["MACD"]), 4) if "MACD" in row and pd.notna(row["MACD"]) else None,
            "macd_signal": round(float(row["MACD_SIGNAL"]), 4) if "MACD_SIGNAL" in row and pd.notna(row["MACD_SIGNAL"]) else None,
        })

    price_summary = {
        "ticker": resolved_ticker,
        "query": raw_symbol,
        "current_price": round(latest_close, 2),
        "prev_close": round(prev_close, 2),
        "change": price_change,
        "change_pct": price_change_pct,
        "high_52w": round(high_52w, 2),
        "low_52w": round(low_52w, 2),
        "volume": latest_vol,
        "avg_volume_20d": avg_vol_20,
        "trading_days": len(df),
    }

    log_entry = {
        "step": "data_fetch",
        "name": "Data-Fetch Agent",
        "status": "completed",
        "message": f"Resolved '{raw_symbol}' → '{resolved_ticker}'. Pulled {len(df)} bars & {len(headlines)} headlines.",
        "data_summary": price_summary,
    }

    return {
        **state,
        "resolved_ticker": resolved_ticker,
        "price_data": price_summary,
        "chart_series": chart_series,
        "headlines": headlines,
        "step_logs": state.get("step_logs", []) + [log_entry],
    }

# ─────────────────────────────────────────────────────────────────────────────
# Node 2: Technical-Analysis Agent
# ─────────────────────────────────────────────────────────────────────────────
def technical_analysis_node(state: AgentState) -> AgentState:
    if state.get("error") or not state.get("chart_series"):
        return state

    chart_series = state["chart_series"]
    latest_bar = chart_series[-1]
    
    rsi = latest_bar.get("rsi")
    ma50 = latest_bar.get("ma50")
    ma200 = latest_bar.get("ma200")
    macd = latest_bar.get("macd")
    macd_signal = latest_bar.get("macd_signal")
    close = latest_bar.get("close")
    volume = latest_bar.get("volume", 0)

    price_data = state["price_data"] or {}
    avg_vol = price_data.get("avg_volume_20d", 1)
    vol_ratio = round(volume / avg_vol, 2) if avg_vol > 0 else 1.0

    # Determine trend & momentum signals
    trend = "Neutral"
    if close and ma50 and ma200:
        if close > ma50 > ma200:
            trend = "Strong Uptrend (Bullish Alignment)"
        elif close > ma50:
            trend = "Moderate Uptrend (Above MA50)"
        elif close < ma50 < ma200:
            trend = "Strong Downtrend (Bearish Alignment)"
        elif close < ma50:
            trend = "Moderate Downtrend (Below MA50)"

    rsi_status = "Neutral"
    if rsi is not None:
        if rsi >= 70:
            rsi_status = "Overbought (>=70)"
        elif rsi >= 55:
            rsi_status = "Bullish Momentum (55-70)"
        elif rsi <= 30:
            rsi_status = "Oversold (<=30)"
        elif rsi <= 45:
            rsi_status = "Bearish Momentum (30-45)"

    macd_status = "Neutral"
    if macd is not None and macd_signal is not None:
        diff = macd - macd_signal
        if diff > 0:
            macd_status = "Bullish (MACD above Signal)"
        else:
            macd_status = "Bearish (MACD below Signal)"

    vol_status = "Normal Volume"
    if vol_ratio >= 1.5:
        vol_status = f"High Volume Spike ({vol_ratio}x 20d avg)"
    elif vol_ratio <= 0.6:
        vol_status = f"Low Volume ({vol_ratio}x 20d avg)"

    technical_signals = {
        "trend_classification": trend,
        "rsi_value": rsi,
        "rsi_status": rsi_status,
        "ma50": ma50,
        "ma200": ma200,
        "macd_value": macd,
        "macd_signal": macd_signal,
        "macd_status": macd_status,
        "volume_ratio": vol_ratio,
        "volume_status": vol_status,
        "relative_strength": f"{price_data.get('change_pct', 0):+.2f}% 1D Return",
    }

    # Use LLM for concise technical commentary
    llm = get_fast_llm()
    tech_reasoning = ""
    if llm:
        try:
            curr_sym = "$" if state.get("resolved_ticker", "").upper() in ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX"] else "₹"
            sys_prompt = "You are a quantitative technical analyst. Provide a 2-sentence crisp technical summary of the stock signals."
            user_msg = f"Ticker: {state['resolved_ticker']}\nPrice: {curr_sym}{close}\nSignals: {json.dumps(technical_signals)}"
            response = llm.invoke([SystemMessage(content=sys_prompt), HumanMessage(content=user_msg)])
            tech_reasoning = response.content.strip()
        except Exception as exc:
            logger.warning("Fast LLM technical analysis failed: %s", exc)
            tech_reasoning = f"Price is in a {trend} with RSI at {rsi} ({rsi_status}) and volume at {vol_ratio}x average."
    else:
        tech_reasoning = f"Price is in a {trend} with RSI at {rsi} ({rsi_status}) and volume at {vol_ratio}x average."

    technical_signals["llm_reasoning"] = tech_reasoning

    log_entry = {
        "step": "technical_analysis",
        "name": "Technical-Analysis Agent",
        "status": "completed",
        "message": f"Computed momentum signals: {trend}, RSI: {rsi} ({rsi_status}), Vol Spike: {vol_ratio}x.",
        "signals": technical_signals,
    }

    return {
        **state,
        "technical_signals": technical_signals,
        "step_logs": state.get("step_logs", []) + [log_entry],
    }

# ─────────────────────────────────────────────────────────────────────────────
# Node 3: Sentiment Agent
# ─────────────────────────────────────────────────────────────────────────────
def sentiment_analysis_node(state: AgentState) -> AgentState:
    if state.get("error"):
        return state

    headlines = state.get("headlines", [])
    if not headlines:
        sentiment_res = {
            "overall_label": "Neutral",
            "score": 0.0,
            "headline_count": 0,
            "bullish_count": 0,
            "bearish_count": 0,
            "neutral_count": 0,
            "reasoning": "No recent news headlines were found for this ticker.",
        }
        log_entry = {
            "step": "sentiment_analysis",
            "name": "Sentiment Agent",
            "status": "completed",
            "message": "No news headlines found. Defaulted to Neutral.",
            "sentiment": sentiment_res,
        }
        return {
            **state,
            "sentiment_analysis": sentiment_res,
            "step_logs": state.get("step_logs", []) + [log_entry],
        }

    # Aggregate VADER scores
    compounds = [h.get("compound", 0) for h in headlines]
    avg_compound = round(sum(compounds) / len(compounds), 4)
    pos_count = sum(1 for c in compounds if c >= 0.05)
    neg_count = sum(1 for c in compounds if c <= -0.05)
    neu_count = len(compounds) - pos_count - neg_count

    if avg_compound >= 0.05:
        base_label = "Bullish"
    elif avg_compound <= -0.05:
        base_label = "Bearish"
    else:
        base_label = "Neutral"

    # LLM qualitative narrative extraction
    llm = get_fast_llm()
    reasoning = ""
    if llm:
        try:
            headline_titles = [f"- [{h.get('publisher', 'News')}] {h.get('title')}" for h in headlines[:10]]
            sys_prompt = "You are a financial news sentiment analyst. Analyze recent headlines and summarize the key narrative drivers and tone in 2-3 concise sentences."
            user_msg = f"Ticker: {state['resolved_ticker']}\nHeadlines:\n" + "\n".join(headline_titles)
            res = llm.invoke([SystemMessage(content=sys_prompt), HumanMessage(content=user_msg)])
            reasoning = res.content.strip()
        except Exception as exc:
            logger.warning("Fast LLM sentiment analysis failed: %s", exc)
            reasoning = f"Analyzed {len(headlines)} headlines with {pos_count} positive, {neg_count} negative, and {neu_count} neutral signals."
    else:
        reasoning = f"Analyzed {len(headlines)} headlines with {pos_count} positive, {neg_count} negative, and {neu_count} neutral signals."

    sentiment_res = {
        "overall_label": base_label,
        "score": avg_compound,
        "headline_count": len(headlines),
        "bullish_count": pos_count,
        "bearish_count": neg_count,
        "neutral_count": neu_count,
        "reasoning": reasoning,
    }

    log_entry = {
        "step": "sentiment_analysis",
        "name": "Sentiment Agent",
        "status": "completed",
        "message": f"Scored {len(headlines)} headlines. Overall: {base_label} (avg VADER score: {avg_compound}).",
        "sentiment": sentiment_res,
    }

    return {
        **state,
        "sentiment_analysis": sentiment_res,
        "step_logs": state.get("step_logs", []) + [log_entry],
    }

# ─────────────────────────────────────────────────────────────────────────────
# Node 4: Synthesizer Agent
# ─────────────────────────────────────────────────────────────────────────────
def synthesizer_node(state: AgentState) -> AgentState:
    if state.get("error"):
        return state

    symbol = state.get("resolved_ticker", state["symbol"])
    price_data = state.get("price_data", {})
    tech_signals = state.get("technical_signals", {})
    sentiment_data = state.get("sentiment_analysis", {})
    headlines = state.get("headlines", [])

    llm = get_synthesizer_llm()
    
    if llm:
        try:
            sys_prompt = (
                "You are an elite hedge fund equity researcher synthesising technical and sentiment signals into a structured catalyst breakdown.\n"
                "You MUST output valid JSON ONLY with no markdown codeblock wrapper or extra text.\n"
                "JSON format required:\n"
                "{\n"
                '  "overall_signal": "BULLISH" | "NEUTRAL" | "BEARISH",\n'
                '  "confidence_score": 1-100 integer,\n'
                '  "what_happened": "Key catalysts, company developments, and news context.",\n'
                '  "technical_read": "Analysis of price action, moving averages, volume spikes, and indicators.",\n'
                '  "sentiment_read": "Synthesis of news sentiment, market tone, and narrative drivers.",\n'
                '  "plain_language_summary": "Crisp 2-3 sentence executive summary for investors."\n'
                "}"
            )

            prompt_content = {
                "ticker": symbol,
                "price": price_data.get("current_price"),
                "change_pct": price_data.get("change_pct"),
                "technical_signals": tech_signals,
                "sentiment_signals": sentiment_data,
                "sample_headlines": [h.get("title") for h in headlines[:5]],
            }

            response = llm.invoke([
                SystemMessage(content=sys_prompt),
                HumanMessage(content=json.dumps(prompt_content, indent=2))
            ])

            raw_text = response.content.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            breakdown = json.loads(raw_text.strip())

        except Exception as exc:
            logger.warning("Synthesizer LLM failed or produced non-JSON output: %s. Using heuristic fallback.", exc)
            breakdown = None
    else:
        breakdown = None

    if not breakdown:
        label = sentiment_data.get("overall_label", "Neutral").upper()
        if label == "POSITIVE":
            label = "BULLISH"
        elif label == "NEGATIVE":
            label = "BEARISH"

        curr_sym = "$" if symbol.upper() in ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX"] else "₹"
        breakdown = {
            "overall_signal": label if label in ["BULLISH", "BEARISH", "NEUTRAL"] else "NEUTRAL",
            "confidence_score": 75,
            "what_happened": f"Recent trading activity shows {symbol} at {curr_sym}{price_data.get('current_price')} ({price_data.get('change_pct'):+.2f}%). {len(headlines)} headlines evaluated.",
            "technical_read": tech_signals.get("llm_reasoning") or f"Trend: {tech_signals.get('trend_classification')}. RSI: {tech_signals.get('rsi_value')}.",
            "sentiment_read": sentiment_data.get("reasoning") or f"News sentiment is {sentiment_data.get('overall_label')}.",
            "plain_language_summary": f"{symbol} exhibits a {tech_signals.get('trend_classification')} setup alongside {sentiment_data.get('overall_label', 'neutral')} news sentiment.",
        }

    log_entry = {
        "step": "synthesizer",
        "name": "Synthesizer Agent",
        "status": "completed",
        "message": f"Synthesized final catalyst breakdown: {breakdown.get('overall_signal')} ({breakdown.get('confidence_score')}% confidence).",
        "breakdown": breakdown,
    }

    return {
        **state,
        "catalyst_breakdown": breakdown,
        "step_logs": state.get("step_logs", []) + [log_entry],
    }

# ─────────────────────────────────────────────────────────────────────────────
# LangGraph Workflow Construction
# ─────────────────────────────────────────────────────────────────────────────
def build_agent_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("data_fetch", data_fetch_node)
    workflow.add_node("technical_analysis", technical_analysis_node)
    workflow.add_node("sentiment_analysis", sentiment_analysis_node)
    workflow.add_node("synthesizer", synthesizer_node)

    workflow.set_entry_point("data_fetch")
    workflow.add_edge("data_fetch", "technical_analysis")
    workflow.add_edge("technical_analysis", "sentiment_analysis")
    workflow.add_edge("sentiment_analysis", "synthesizer")
    workflow.add_edge("synthesizer", END)

    return workflow.compile()

agent_graph = build_agent_graph()

def run_agent_pipeline(symbol: str) -> Dict[str, Any]:
    """Execute full agent graph synchronously."""
    initial_state: AgentState = {
        "symbol": symbol,
        "resolved_ticker": symbol,
        "price_data": None,
        "chart_series": [],
        "headlines": [],
        "technical_signals": None,
        "sentiment_analysis": None,
        "catalyst_breakdown": None,
        "step_logs": [],
        "error": None,
    }
    return agent_graph.invoke(initial_state)
