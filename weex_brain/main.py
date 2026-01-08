import uvicorn
import asyncio
import json
import csv
import os
import random
from collections import deque
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from weex_client import weex_bot

ALLOWED_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "BNBUSDT"]

# --- STRATEGY SETTINGS ---
LEVERAGE = 8          # Lowered from 12x to 8x (Safety buffer increased)
SMA_PERIOD = 15       # Look at the last 15 price checks (approx 30 seconds of memory)
LOG_FILE = "ai_trading_logs.csv"

# --- SMART MEMORY BANK ---
# Stores a list of recent prices for each coin: {'BTCUSDT': [67000, 67005, 67010...]}
price_history = {pair: deque(maxlen=SMA_PERIOD) for pair in ALLOWED_PAIRS}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    print(f"⚡ NEXUS-7: SMA TREND ENGINE ACTIVE (Lev: {LEVERAGE}x)")
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            
            # 1. FETCH REAL PRICE
            current_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            if current_price is None:
                # Use last known average if fetch fails, or skip
                if len(price_history[target_pair]) > 0:
                    current_price = price_history[target_pair][-1]
                else:
                    await asyncio.sleep(1.0)
                    continue

            # 2. UPDATE MEMORY (Add price to history)
            price_history[target_pair].append(current_price)
            
            # 3. CALCULATE SMART TREND (Simple Moving Average)
            # We need at least 5 data points to make a smart decision
            if len(price_history[target_pair]) >= 5:
                history_list = list(price_history[target_pair])
                sma = sum(history_list) / len(history_list) # Average price
                
                # Deviation: How far is current price from the average?
                deviation = current_price - sma
                percent_diff = (deviation / sma) * 100
                
                # LOGIC: Only trade if price breaks the average by 0.05% (Filters noise)
                TRIGGER_THRESHOLD = 0.05 
                
                if percent_diff > TRIGGER_THRESHOLD:
                    sentiment = "BULLISH"
                    reason = f"Price > SMA by {percent_diff:.3f}%"
                    confidence = 80 + min(int(percent_diff * 500), 19) # Cap at 99
                elif percent_diff < -TRIGGER_THRESHOLD:
                    sentiment = "BEARISH"
                    reason = f"Price < SMA by {percent_diff:.3f}%"
                    confidence = 80 + min(int(abs(percent_diff) * 500), 19)
                else:
                    sentiment = "NEUTRAL"
                    reason = "Choppy/Sideways"
                    confidence = 40 # Low confidence = No trade
            else:
                sentiment = "GATHERING_DATA"
                confidence = 0
                reason = "Building Memory..."

            TRIGGER_POINT = 85 
            
            log_type = "AI_SCAN"
            log_msg = f"Analyzed {target_pair}: ${current_price} | Trend: {sentiment}"

            # 4. EXECUTION
            if confidence > TRIGGER_POINT and sentiment != "NEUTRAL":
                log_type = "OPPORTUNITY"
                log_msg = f"🚀 ALPHA STRIKE: {sentiment} on {target_pair} (Conf: {confidence}%)"
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
            
            # Speed: 2 seconds scan rate
            await asyncio.sleep(2.0)
            
    except WebSocketDisconnect:
        print("❌ Disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(1)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
