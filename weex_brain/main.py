import uvicorn
import asyncio
import json
import os
import time
from collections import deque
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from weex_client import weex_bot

# --- CONFIGURATION ---
LIVE_TRADING = True  # Real Money Mode
ALLOWED_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
MOMENTUM_THRESHOLD = 1.002

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Price History Storage
price_history = {pair: deque(maxlen=20) for pair in ALLOWED_PAIRS}

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 STARTING ON RENDER...")
    # Check connection immediately on startup
    price = weex_bot.get_market_price("BTCUSDT")
    print(f"✅ SYSTEM CHECK: BTC Price is {price}")
    
    # Attempt a "Check-in" trade or logic here if needed
    # If using Real Money, be careful with auto-trades on startup

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("⚡ DASHBOARD CONNECTED")
    
    try:
        while True:
            # 1. Fetch Prices
            prices = {}
            for pair in ALLOWED_PAIRS:
                p = await asyncio.to_thread(weex_bot.get_market_price, pair)
                if p > 0: prices[pair] = p
            
            if not prices:
                await asyncio.sleep(1); continue

            # 2. Strategy Loop
            for pair, current_price in prices.items():
                price_history[pair].append(current_price)
                history = list(price_history[pair])
                
                msg_type = "SCAN"
                msg_text = f"Tracking {pair}..."

                # Simple Momentum Trigger
                if len(history) >= 5:
                    if history[-1] > history[0] * MOMENTUM_THRESHOLD:
                        # BUY SIGNAL
                        quantity = 0.001 if "BTC" in pair else 0.01 # Adjust sizes
                        
                        if LIVE_TRADING:
                            # Execute Real Order
                            asyncio.create_task(asyncio.to_thread(weex_bot.place_order, pair, "buy", quantity))
                            msg_type = "BUY"
                            msg_text = f"⚡ ORDER SENT: {pair}"

                # 3. Send Status to Dashboard
                payload = {
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "symbol": pair,
                    "price": current_price,
                    "type": msg_type,
                    "message": msg_text
                }
                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.5)

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        print("❌ DISCONNECTED")

if __name__ == "__main__":
    # RENDER REQUIREMENT: Use 0.0.0.0 and PORT env
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
