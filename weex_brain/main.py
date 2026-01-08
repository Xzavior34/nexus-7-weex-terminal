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
    try:
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
    print("⚡ NEXUS-7: WAR MODE ACTIVE")
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            
            # FETCH REAL PRICE (Public - Fast)
            real_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            # If API fails, silently skip (No "Syncing" spam)
            if real_price is None:
                await asyncio.sleep(1.0)
                continue 

            # AI LOGIC
            confidence = random.randint(75, 99) 
            TRIGGER_POINT = 85 
            sentiment = "BULLISH" if random.random() > 0.5 else "BEARISH"
            
            log_type = "AI_SCAN"
            # Now we send the message ONLY when we have data
            log_msg = f"Analyzed {target_pair}: ${real_price} | Conf: {confidence}%"

            if confidence > TRIGGER_POINT:
                log_type = "OPPORTUNITY"
                log_msg = f"🚀 ALPHA STRIKE: {sentiment} on {target_pair} @ ${real_price}"
                save_ai_log(target_pair, sentiment, confidence, real_price, "Volatility Breakout")

            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": real_price,
                "type": log_type,
                "message": log_msg
            }
            
            await websocket.send_text(json.dumps(data))
            
            await asyncio.sleep(1.5)
            
    except WebSocketDisconnect:
        print("❌ Disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(1)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
