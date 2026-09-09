import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout


# ─────────────────────────────────────────────
#  Shared feature builder (lag + rolling stats)
# ─────────────────────────────────────────────
def _build_features(df, look_back=10):
    """Return (X_train, X_test, y_train, y_test, scaler_y, split_idx, close_values)"""
    close = df['Close'].squeeze().values.reshape(-1, 1)

    feat = pd.DataFrame({'Close': close.flatten()})
    for lag in range(1, look_back + 1):
        feat[f'Lag_{lag}'] = feat['Close'].shift(lag)
    feat['MA_5']     = feat['Close'].rolling(5).mean()
    feat['MA_10']    = feat['Close'].rolling(10).mean()
    feat['STD_5']    = feat['Close'].rolling(5).std()
    feat['Momentum'] = feat['Close'].pct_change(5)
    feat['Target']   = feat['Close'].shift(-1)
    feat.dropna(inplace=True)

    feature_cols = [c for c in feat.columns if c != 'Target']
    X = feat[feature_cols].values
    y = feat['Target'].values

    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()
    X_train_sc = scaler_X.fit_transform(X_train)
    X_test_sc  = scaler_X.transform(X_test)
    scaler_y.fit(y_train.reshape(-1, 1))

    return X_train_sc, X_test_sc, y_train, y_test, scaler_X, scaler_y, split_idx, close


# ─────────────────────────────────────────────
#  MODEL 1: LSTM  (original)
# ─────────────────────────────────────────────
def train_lstm(df):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    close = df['Close'].squeeze().values.reshape(-1, 1)

    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(close)

    X, y = [], []
    window = 60

    for i in range(window, len(scaled_data)):
        X.append(scaled_data[i-window:i])
        y.append(scaled_data[i])

    X, y = np.array(X), np.array(y)

    model = Sequential([
        LSTM(50, return_sequences=True, input_shape=(X.shape[1], 1)),
        Dropout(0.2),
        LSTM(50),
        Dropout(0.2),
        Dense(1)
    ])

    model.compile(optimizer='adam', loss='mse')
    model.fit(X, y, epochs=5, batch_size=32, verbose=0)

    return model, scaler


def predict_next_days(model, scaler, df, days=10):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    close = df['Close'].squeeze().values.reshape(-1, 1)
    data = scaler.transform(close)

    window = 60
    last_sequence = data[-window:]
    predictions = []

    for _ in range(days):
        pred = model.predict(last_sequence.reshape(1, window, 1), verbose=0)
        predictions.append(pred[0][0])
        last_sequence = np.append(last_sequence[1:], pred, axis=0)

    predictions = scaler.inverse_transform(np.array(predictions).reshape(-1, 1))
    return predictions.flatten()


# ─────────────────────────────────────────────
#  MODEL 2: Linear Regression
# ─────────────────────────────────────────────
def train_and_predict_lr(df, days=10):
    """Train Linear Regression and predict next `days` prices."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    look_back = 10
    X_train_sc, y_train, scaler_X, close = _build_features(df, look_back)

    model = LinearRegression()
    model.fit(X_train_sc, y_train)

    # Roll forward — keep enough history so all lags can be computed
    recent = close[-(look_back + 15):].flatten().tolist()
    predictions = []

    for _ in range(days):
        feat_row = _make_feat_row(recent, look_back)
        feat_sc  = scaler_X.transform([feat_row])
        pred_val = float(model.predict(feat_sc)[0])
        predictions.append(pred_val)
        recent.append(pred_val)

    return np.array(predictions)


# ─────────────────────────────────────────────
#  MODEL 3: Random Forest
# ─────────────────────────────────────────────
def train_and_predict_rf(df, days=10):
    """Train Random Forest and predict next `days` prices."""
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    look_back = 10
    X_train_sc, y_train, scaler_X, close = _build_features(df, look_back)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        min_samples_split=3,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_sc, y_train)

    # Roll forward — keep enough history so all lags can be computed
    recent = close[-(look_back + 15):].flatten().tolist()
    predictions = []

    for _ in range(days):
        feat_row = _make_feat_row(recent, look_back)
        feat_sc  = scaler_X.transform([feat_row])
        pred_val = float(model.predict(feat_sc)[0])
        predictions.append(pred_val)
        recent.append(pred_val)

    return np.array(predictions)


# ─────────────────────────────────────────────
#  Helper: build a single feature row
# ─────────────────────────────────────────────
def _make_feat_row(recent_prices, look_back=10):
    """
    Given a growing list of closing prices, compute one feature row:
    [close, lag_1..lag_N, ma5, ma10, std5, momentum]
    Safely pads with the oldest value when history is short.
    """
    n      = len(recent_prices)
    close  = recent_prices[-1]

    # Lags: prices[-2] .. prices[-(look_back+1)] — pad if not enough data
    lags = []
    for i in range(1, look_back + 1):
        neg_idx = i + 1          # distance from end
        lags.append(recent_prices[-neg_idx] if neg_idx <= n else recent_prices[0])

    ma5      = float(np.mean(recent_prices[-5:]))  if n >= 5  else float(np.mean(recent_prices))
    ma10     = float(np.mean(recent_prices[-10:])) if n >= 10 else float(np.mean(recent_prices))
    std5     = float(np.std(recent_prices[-5:]))   if n >= 5  else 0.0
    denom    = recent_prices[-6] if (n >= 6 and recent_prices[-6] != 0) else None
    momentum = (close - denom) / denom if denom else 0.0

    return [close] + lags + [ma5, ma10, std5, momentum]