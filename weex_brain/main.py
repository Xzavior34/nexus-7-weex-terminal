import uvicorn
import asyncio
import json
import csv
import os
import random
import math
from collections import deque
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from weex_client import weex_bot

ALLOWED_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "BNBUSDT"]

# --- STRATEGY SETTINGS ---
LEVERAGE = 8          
HISTORY_SIZE = 30     # Need more data for RSI/Bollinger (approx 60s memory)
LOG_FILE = "ai_trading_logs.csv"

# --- SMART MEMORY BANK ---
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ADVANCED MATH ENGINE ---
def calculate_rsi(prices, period=14):
    """Calculates Relative Strength Index (0-100)."""
    if len(prices) < period + 1: return 50 # Not enough data
    
    gains = []
    losses = []
    
    for i in range(1, len(prices)):
        change = prices[i] - prices[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
            
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    
    if avg_loss == 0: return 100
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_bollinger_bands(prices, period=20):
    """Calculates Volatility Bands (Upper, Lower)."""
    if len(prices) < period: return 0, 0, 0
    
    # 1. Simple Moving Average (SMA)
    sma = sum(prices[-period:]) / period
    
    # 2. Standard Deviation
    variance = sum([((x - sma) ** 2) for x in prices[-period:]]) / period
    std_dev = math.sqrt(variance)
    
    upper_band = sma + (std_dev * 2)
    lower_band = sma - (std_dev * 2)
    
    return upper_band, lower_band, sma

def save_ai_log(symbol, action, confidence, price, reason):
    try:
        file_exists = os.path.isfile(LOG_FILE)
        with open(LOG_FILE, mode='a', newline='') as file:
            writer = csv.writer(file)
            if not file_exists:
                writer.writerow(["Timestamp", "Symbol", "Action", "Confidence", "Price", "Reason"])
            writer.writerow([datetime.utcnow().isoformat(), symbol, action, confidence, price, reason])
    except:
        pass

@app.get("/download-logs")
def download_logs():
    if os.path.exists(LOG_FILE):
        return FileResponse(LOG_FILE, media_type='text/csv', filename="ai_trading_logs.csv")
    return {"error": "No trades generated yet."}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"⚡ NEXUS-7: STRATEGIST ENGINE (RSI+BB) ACTIVE")
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            
            # 1. FETCH REAL PRICE
            current_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            if current_price is None:
                if len(price_history[target_pair]) > 0:
                    current_price = price_history[target_pair][-1]
                else:
                    await asyncio.sleep(1.0)
                    continue

            # 2. UPDATE MEMORY
            price_history[target_pair].append(current_price)
            history_list = list(price_history[target_pair])
            
            sentiment = "NEUTRAL"
            confidence = 0
            reason = "Analyzing..."
            
            # 3. RUN TRINITY ANALYSIS (Need 20+ data points)
            if len(history_list) >= 20:
                # A. Calculate Indicators
                rsi = calculate_rsi(history_list)
                upper_bb, lower_bb, sma = calculate_bollinger_bands(history_list)
                
                # B. The "Strategist" Logic
                # BULLISH SIGNAL: Price breaks Upper Band AND RSI is not maxed out (<75)
                if current_price > upper_bb and rsi < 75:
                    sentiment = "BULLISH"
                    confidence = 85 + int((current_price - upper_bb) / upper_bb * 1000)
                    reason = f"BB Breakout + RSI {int(rsi)} OK"
                    
                # BEARISH SIGNAL: Price breaks Lower Band AND RSI is not bottomed out (>25)
                elif current_price < lower_bb and rsi > 25:
                    sentiment = "BEARISH"
                    confidence = 85 + int((lower_bb - current_price) / lower_bb * 1000)
                    reason = f"BB Breakdown + RSI {int(rsi)} OK"
                
                # REVERSION SIGNAL (Buying the dip)
                elif current_price < lower_bb and rsi < 20:
                    sentiment = "BULLISH" # Bounce likely
                    confidence = 90
                    reason = "Oversold Bounce (RSI < 20)"
                    
                else:
                    sentiment = "NEUTRAL"
                    confidence = 45
                    reason = f"Range Bound (RSI: {int(rsi)})"

                # Cap confidence
                if confidence > 99: confidence = 99
                
            else:
                sentiment = "CALIBRATING"
                reason = f"Need Data ({len(history_list)}/20)"

            TRIGGER_POINT = 85 
            
            log_type = "AI_SCAN"
            log_msg = f"Scan {target_pair}: ${current_price} | {sentiment}"

            # 4. EXECUTION
            if confidence > TRIGGER_POINT and sentiment != "NEUTRAL":
                log_type = "OPPORTUNITY"
                log_msg = f"🚀 STRATEGY SIGNAL: {sentiment} on {target_pair} ({reason})"
                save_ai_log(target_pair, sentiment, confidence, current_price, reason)

            # 5. SEND TO FRONTEND
            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": current_price,
                "type": log_type,
                "message": log_msg
            }
            
            await websocket.send_text(json.dumps(data))
            
            # Scan speed
            await asyncio.sleep(2.0)
            
    except WebSocketDisconnect:
        print("❌ Disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(1)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
