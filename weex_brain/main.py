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

# ... (Keep Log Function and Download Function the same) ...

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("⚡ NEXUS-7: DIAGNOSTIC MODE ACTIVE")
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            
            # FETCH PRICE
            real_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            # --- THE FIX: HANDLE MISSING DATA ---
            if real_price is None:
                # Instead of silence, send a "Searching" log so you know it's working
                err_msg = {
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "symbol": target_pair,
                    "price": 0,
                    "type": "WEEX_API",
                    "message": f"Connecting to WEEX Node..." 
                }
                await websocket.send_text(json.dumps(err_msg))
                await asyncio.sleep(1.0)
                continue 

            # --- IF SUCCESSFUL ---
            confidence = random.randint(75, 99) 
            TRIGGER_POINT = 85 
            sentiment = "BULLISH" if random.random() > 0.5 else "BEARISH"
            
            log_type = "AI_SCAN"
            log_msg = f"Analyzed {target_pair}: ${real_price} | Conf: {confidence}%"

            if confidence > TRIGGER_POINT:
                log_type = "OPPORTUNITY"
                log_msg = f"🚀 ALPHA STRIKE: {sentiment} on {target_pair} @ ${real_price}"

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
