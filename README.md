# Stock Prediction

Simple stock price prediction for NSE-listed stocks.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
python app.py
```

## Frontend

```powershell
cd frontend
npm install
npm start
```

Open http://localhost:3000

## API Endpoints

- `POST /predict` — `{ "symbol": "RELIANCE", "model": "lstm|lr|rf" }`
- `POST /analysis` — `{ "symbol": "RELIANCE" }`