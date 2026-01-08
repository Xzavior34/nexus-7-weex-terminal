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

# --- MEMORY BANK (To compare Old vs New Price) ---
price_memory = {}

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
    print("⚡ NEXUS-7: SMART MOMENTUM ENGINE ACTIVE")
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            
            # 1. FETCH REAL PRICE
            current_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            if current_price is None:
                # Use last known if fetch fails
                current_price = price_memory.get(target_pair, 0)
                if current_price == 0:
                    await asyncio.sleep(1.0)
                    continue

            # 2. SMART ANALYSIS (Compare with Memory)
            old_price = price_memory.get(target_pair, current_price) # Default to current if no memory
            price_memory[target_pair] = current_price # Update memory for next time
            
            # Calculate Change
            price_change = current_price - old_price
            
            # LOGIC: If price moved UP, we are BULLISH. If DOWN, we are BEARISH.
            if price_change > 0:
                sentiment = "BULLISH"
                reason = "Upward Momentum"
                confidence = 80 + int((price_change / current_price) * 10000) # Higher change = Higher confidence
            elif price_change < 0:
                sentiment = "BEARISH"
                reason = "Downward Pressure"
                confidence = 80 + int(abs((price_change / current_price) * 10000))
            else:
                sentiment = "NEUTRAL"
                confidence = 50
                reason = "Stagnant"

            # Cap confidence at 99%
            if confidence > 99: confidence = 99
            
            TRIGGER_POINT = 85 
            
            log_type = "AI_SCAN"
            log_msg = f"Analyzed {target_pair}: ${current_price} | Trend: {sentiment}"

            # 3. EXECUTION DECISION
            if confidence > TRIGGER_POINT and sentiment != "NEUTRAL":
                log_type = "OPPORTUNITY"
                log_msg = f"🚀 ALPHA STRIKE: {sentiment} on {target_pair} (Conf: {confidence}%)"
                
                # Save the Smart Decision to the Log File
                save_ai_log(target_pair, sentiment, confidence, current_price, reason)

            # 4. SEND TO FRONTEND
            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": current_price,
                "type": log_type,
                "message": log_msg
            }
            
            await websocket.send_text(json.dumps(data))
            
            # Wait 2 seconds to let the market move slightly
            await asyncio.sleep(2.0)
            
    except WebSocketDisconnect:
        print("❌ Disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(1)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
