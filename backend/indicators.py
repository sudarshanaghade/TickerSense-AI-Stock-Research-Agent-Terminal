import ta
import pandas as pd

def add_indicators(df):
    # Flatten multi-level columns returned by yfinance
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    close = df['Close'].squeeze()

    df['MA50'] = close.rolling(50).mean()
    df['MA200'] = close.rolling(200).mean()
    df['RSI'] = ta.momentum.RSIIndicator(close).rsi()
    macd = ta.trend.MACD(close)
    df['MACD'] = macd.macd()
    df['MACD_SIGNAL'] = macd.macd_signal()
    return df