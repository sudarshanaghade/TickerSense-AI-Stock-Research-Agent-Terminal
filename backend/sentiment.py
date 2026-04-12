"""
sentiment.py — VADER-based news sentiment with dual-source support.

Source priority:
  1. Yahoo Finance (via yfinance) — free, no key needed.
  2. NewsAPI — fallback when Yahoo returns 0 headlines.

Environment variable: NEWS_API_KEY (set in backend/.env)
"""

import os
import logging

import yfinance as yf
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from dotenv import load_dotenv

# Load .env from the same directory as this file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

_analyzer = SentimentIntensityAnalyzer()
logger    = logging.getLogger(__name__)

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")


# ─────────────────────────────────────────────────────────────────────────────
#  Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _label(compound: float) -> str:
    """Map a VADER compound score to a human-readable label."""
    if compound >= 0.05:
        return "Positive"
    if compound <= -0.05:
        return "Negative"
    return "Neutral"


def _score_text(title: str, description: str = "") -> dict:
    """
    Run VADER on 'title + description' (when available).
    Returns rounded score dict.
    """
    text = title.strip()
    if description and description.strip():
        text = text + ". " + description.strip()
    scores   = _analyzer.polarity_scores(text)
    compound = round(scores["compound"], 4)
    return {
        "compound":  compound,
        "positive":  round(scores["pos"], 3),
        "negative":  round(scores["neg"], 3),
        "neutral":   round(scores["neu"], 3),
        "label":     _label(compound),
    }


# ─────────────────────────────────────────────────────────────────────────────
#  Source 1: Yahoo Finance (yfinance)
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_yahoo(symbol: str) -> list:
    """
    Pull up to 15 recent headlines from Yahoo Finance.
    Returns a list of scored headline dicts, or [] if none found.
    """
    try:
        ticker   = yf.Ticker(f"{symbol}.NS")
        raw_news = ticker.news or []
    except Exception as exc:
        logger.warning("Yahoo Finance news fetch failed for %s: %s", symbol, exc)
        return []

    headlines = []
    for item in raw_news[:15]:
        content = item.get("content", item)

        title = (
            content.get("title")
            or item.get("title")
            or ""
        ).strip()
        if not title:
            continue

        description = (
            content.get("description")
            or content.get("summary")
            or item.get("description")
            or ""
        )

        publisher = (
            content.get("provider", {}).get("displayName")
            or content.get("publisher")
            or item.get("publisher")
            or "Unknown"
        )

        link = (
            content.get("canonicalUrl", {}).get("url")
            or content.get("clickThroughUrl", {}).get("url")
            or item.get("link")
            or "#"
        )

        scores = _score_text(title, description)
        headlines.append({
            "title":     title,
            "publisher": publisher,
            "link":      link,
            "source":    "Yahoo Finance",
            **scores,
        })

    return headlines


# ─────────────────────────────────────────────────────────────────────────────
#  Source 2: NewsAPI fallback
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_newsapi(symbol: str) -> list:
    """
    Fallback: pull up to 5 recent articles from NewsAPI.
    Returns [] if the key is missing or the call fails.
    """
    if not NEWS_API_KEY:
        logger.debug("NEWS_API_KEY not set; skipping NewsAPI fallback.")
        return []

    try:
        from newsapi import NewsApiClient  # lazy import — only needed as fallback
        client   = NewsApiClient(api_key=NEWS_API_KEY)
        response = client.get_everything(
            q=symbol,
            language="en",
            sort_by="publishedAt",
            page_size=5,
        )
    except Exception as exc:
        logger.warning("NewsAPI fallback failed for %s: %s", symbol, exc)
        return []

    if response.get("status") != "ok" or not response.get("totalResults"):
        return []

    headlines = []
    for article in response["articles"]:
        title       = (article.get("title") or "").strip()
        description = article.get("description") or ""
        if not title:
            continue

        scores = _score_text(title, description)
        headlines.append({
            "title":     title,
            "publisher": article.get("source", {}).get("name", "Unknown"),
            "link":      article.get("url") or "#",
            "source":    "NewsAPI",
            **scores,
        })

    return headlines


# ─────────────────────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_sentiment(symbol: str) -> dict:
    """
    Fetch news for an NSE stock and score each headline with VADER.

    Strategy:
      - Try Yahoo Finance first.
      - If 0 headlines found, fall back to NewsAPI.

    Args:
        symbol: NSE ticker without the .NS suffix (e.g. "RELIANCE")

    Returns:
        {
            "headlines": [...],
            "summary": {
                "avg_compound": float,   # -1.0 to +1.0
                "overall_label": str,
                "positive_count": int,
                "negative_count": int,
                "neutral_count": int,
                "total": int,
                "source": "Yahoo Finance" | "NewsAPI" | "None"
            }
        }
    """
    headlines = _fetch_yahoo(symbol)
    source    = "Yahoo Finance"

    if not headlines:
        logger.info("Yahoo Finance returned 0 articles for %s — trying NewsAPI.", symbol)
        headlines = _fetch_newsapi(symbol)
        source    = "NewsAPI" if headlines else "None"

    if not headlines:
        return {
            "headlines": [],
            "summary": {
                "avg_compound":  0.0,
                "overall_label": "Neutral",
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count":  0,
                "total":          0,
                "source":         "None",
            },
        }

    compounds   = [h["compound"] for h in headlines]
    avg_compound = round(sum(compounds) / len(compounds), 4)

    pos_count = sum(1 for h in headlines if h["label"] == "Positive")
    neg_count = sum(1 for h in headlines if h["label"] == "Negative")
    neu_count = sum(1 for h in headlines if h["label"] == "Neutral")

    return {
        "headlines": headlines,
        "summary": {
            "avg_compound":   avg_compound,
            "overall_label":  _label(avg_compound),
            "positive_count": pos_count,
            "negative_count": neg_count,
            "neutral_count":  neu_count,
            "total":          len(headlines),
            "source":         source,
        },
    }
