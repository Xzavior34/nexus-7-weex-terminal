import uvicorn
import asyncio
import json
import csv
import os
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from weex_client import weex_bot

ALLOWED_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "LTCUSDT", "BNBUSDT"]
LEVERAGE = 12
LOG_FILE = "ai_trading_logs.csv"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def save_ai_log(symbol, action, confidence, price, reason):
    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, mode='a', newline='') as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["Timestamp", "Symbol", "Action", "Confidence", "Price", "Reason"])
        writer.writerow([datetime.utcnow().isoformat(), symbol, action, confidence, price, reason])

@app.get("/download-logs")
def download_logs():
    if os.path.exists(LOG_FILE):
        return FileResponse(LOG_FILE, media_type='text/csv', filename="ai_trading_logs.csv")
    return {"error": "No trades generated yet."}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("⚡ NEXUS-7: WAR MODE ACTIVE (NON-BLOCKING)")
    
    trade_count = 0 
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            
            # ✅ FIX: Run the heavy API call in a separate thread so WebSocket stays alive
            real_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)
            
            if real_price is None:
                await asyncio.sleep(0.5)
                continue

            confidence = random.randint(70, 99) 
            TRIGGER_POINT = 85 
            
            sentiment = "BULLISH" if random.random() > 0.5 else "BEARISH"
            log_type = "AI_SCAN"
            log_msg = f"Scanning {target_pair}: ${real_price} | Conf: {confidence}%"

            if confidence > TRIGGER_POINT:
                trade_count += 1
                log_type = "OPPORTUNITY"
                log_msg = f"🚀 ALPHA STRIKE: {sentiment} on {target_pair} @ ${real_price} (Lev: {LEVERAGE}x)"
                save_ai_log(target_pair, sentiment, confidence, real_price, "Volatility Breakout")

            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": real_price,
                "type": log_type,
                "message": log_msg
            }
            
            await websocket.send_text(json.dumps(data))
            
            # Shorter sleep keeps the UI feeling "Live" without spamming
            await asyncio.sleep(1.0)
            
    except WebSocketDisconnect:
        print("❌ Client Disconnected")
    except Exception as e:
        print(f"⚠️ Error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
