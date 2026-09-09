# TickerSense — AI Stock Research Agent Terminal

**TickerSense** is a full-stack AI research agent that delivers structured deep-dive analysis on any stock ticker. It combines quantitative technical signals, news sentiment analysis, and a synthesized **catalyst breakdown** — similar in spirit to Deepvue's AI Terminal, Koyfin, and Bloomberg Terminals.

---

## 🏗️ Stack & Architecture

- **Backend**: Python 3.13, **FastAPI**, **LangGraph** for multi-agent graph orchestration.
- **LLM Engine**: **Groq** (`llama-3.1-8b-instant` for fast signal/sentiment nodes, `llama-3.3-70b-versatile` for the synthesizer node) via `langchain-groq`.
- **Frontend**: React SPA, styled with custom Dark Obsidian CSS system (`#0a0e14`), strict semantic color coding (emerald green / red-orange / amber), **JetBrains Mono** for data/numeric fields, and **Inter** for narrative prose.
- **Data Sources**: `yfinance` for OHLCV price/volume history and headlines, `NewsAPI` fallback, `vaderSentiment` for rule-based scoring.

---

## 🤖 LangGraph Multi-Agent Pipeline

1. **Data-Fetch Agent (`data_fetch_node`)**:
   - Given a ticker symbol (e.g. `AAPL`, `RELIANCE`, `NVDA`), pulls 1-year OHLCV price data and the top ~10-15 recent headlines. Auto-resolves exchange suffixes (`.NS` for NSE, `.BO` for BSE, or US global).

2. **Technical-Analysis Agent (`technical_analysis_node`)**:
   - Computes momentum and trend signals: `MA50`, `MA200`, `RSI (14)`, `MACD`, Volume Spike Ratio (vs 20-day average volume), and trend classification (`Strong Uptrend`, `Downtrend`, `Consolidation`).

3. **Sentiment Agent (`sentiment_analysis_node`)**:
   - Runs VADER sentiment scoring over headlines and uses Groq `llama-3.1-8b-instant` for qualitative financial narrative and risk driver extraction.

4. **Synthesizer Agent (`synthesizer_node`)**:
   - Combines outputs from technical and sentiment nodes using Groq `llama-3.3-70b-versatile` to produce a structured **Catalyst Breakdown**:
     - **Overall Signal & Confidence Score**: `BULLISH` / `BEARISH` / `NEUTRAL` with a 1-100% confidence rating.
     - **What Happened**: Recent news catalysts & company developments.
     - **Technical Read**: Price action, moving averages, volume spikes, and support/resistance context.
     - **Sentiment Read**: Narrative overview, headline ratio, and institutional tone.
     - **Plain-Language Summary**: Crisp executive summary for investors.

---

## 🚀 How to Run

### 1. Backend (FastAPI + LangGraph)

```bash
cd backend
# Create environment file backend/.env and add your Groq API key:
# GROQ_API_KEY=your_groq_api_key_here
# NEWS_API_KEY=your_news_api_key_here (optional fallback)

pip install -r requirements.txt
python -m uvicorn app:app --port 5000 --reload
```

FastAPI server runs at `http://localhost:5000`.

### 2. Frontend (React Terminal UI)

```bash
cd frontend
npm install
npm start
```

Frontend app runs at `http://localhost:3000`.

---

## 📡 API Endpoints

- `GET  /` — Health check & IST market open/closed status.
- `POST /predict` — ML price forecasts (LSTM / Linear Regression / Random Forest) + sentiment adjustments.
- `POST /analysis` — Historical price chart series with MA50, MA200, RSI, MACD indicators.
- `POST /agent/analyze` — Synchronous execution of the TickerSense LangGraph agent pipeline.
- `GET  /agent/stream?symbol=AAPL` — Server-Sent Events (SSE) live streaming endpoint for real-time agent execution updates.