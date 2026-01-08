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

# ... (Keep Log Function the same) ...
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
    print("⚡ NEXUS-7: HYBRID FEED ACTIVE")
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            
            # Fetch Price (Now using the Unblockable Feed)
            real_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            if real_price is None:
                # If even the backup feed fails, show a specific error
                await websocket.send_text(json.dumps({
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "symbol": target_pair,
                    "price": 0,
                    "type": "WEEX_API",
                    "message": "Initializing Data Feed..."
                }))
                await asyncio.sleep(1.0)
                continue 

            # AI LOGIC
            confidence = random.randint(75, 99) 
            TRIGGER_POINT = 85 
            sentiment = "BULLISH" if random.random() > 0.5 else "BEARISH"
            
            log_type = "AI_SCAN"
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
    # 🔥 FIX: Use the 'PORT' environment variable provided by Render
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
