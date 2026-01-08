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

# ✅ SAFE & VOLATILE MIX
ALLOWED_PAIRS = ["SOLUSDT", "DOGEUSDT", "XRPUSDT", "SUIUSDT", "BTCUSDT"]

# --- 🛡️ SAFETY SETTINGS ---
LEVERAGE = 8             # High enough to win
STOP_LOSS_PCT = 0.02     # If price drops 2%, SELL. (Prevents liquidation)
TAKE_PROFIT_PCT = 0.04   # If price rises 4%, SELL. (Locks in money)

HISTORY_SIZE = 30
LOG_FILE = "ai_trading_logs.csv"

price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {}    # Tracks what we bought: {'SOLUSDT': 134.50}

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

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"⚡ NEXUS-7: SAFETY SHIELD ACTIVE (SL: -{STOP_LOSS_PCT*100}%)")
    
    try:
        while True:
            target_pair = random.choice(ALLOWED_PAIRS)
            current_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            if current_price is None:
                if len(price_history[target_pair]) > 0:
                    current_price = price_history[target_pair][-1]
                else:
                    await asyncio.sleep(1.0)
                    continue

            # Update Memory
            price_history[target_pair].append(current_price)
            history_list = list(price_history[target_pair])
            
            log_type = "AI_SCAN"
            log_msg = f"Scanning {target_pair}..."
            sentiment = "NEUTRAL"
            confidence = 0

            # --- 🛡️ 1. CHECK ACTIVE POSITIONS (SAFETY SHIELD) ---
            if target_pair in active_positions:
                entry_price = active_positions[target_pair]
                pct_change = (current_price - entry_price) / entry_price
                
                # A. STOP LOSS HIT? (Bad Trade -> Kill it)
                if pct_change <= -STOP_LOSS_PCT:
                    log_type = "RISK_CHECK"
                    sentiment = "SELL_STOP_LOSS"
                    confidence = 100
                    log_msg = f"🛡️ STOP LOSS TRIGGERED: Sold {target_pair} at {current_price} (Loss: {pct_change*100:.2f}%)"
                    del active_positions[target_pair] # Close position
                    save_ai_log(target_pair, "SELL", 100, current_price, "Stop Loss Protection")

                # B. TAKE PROFIT HIT? (Good Trade -> Bank it)
                elif pct_change >= TAKE_PROFIT_PCT:
                    log_type = "OPPORTUNITY"
                    sentiment = "SELL_TAKE_PROFIT"
                    confidence = 100
                    log_msg = f"💰 PROFIT SECURED: Sold {target_pair} at {current_price} (Gain: {pct_change*100:.2f}%)"
                    del active_positions[target_pair] # Close position
                    save_ai_log(target_pair, "SELL", 100, current_price, "Take Profit Hit")
                
                else:
                    # Position is open and safe
                    log_msg = f"Holding {target_pair} (PnL: {pct_change*100:.2f}%)"
            
            # --- 2. LOOK FOR NEW TRADES (STRATEGIST LOGIC) ---
            elif len(history_list) >= 20:
                # Simple Moving Average Logic
                sma = sum(history_list) / len(history_list)
                deviation = (current_price - sma) / sma
                
                # Only buy if price pumps 0.1% above average (Momentum)
                if deviation > 0.001: 
                    sentiment = "BULLISH"
                    confidence = 85 + int(deviation * 10000)
                    reason = "Momentum Breakout"
                    
                    if confidence > 90:
                        log_type = "EXECUTION"
                        log_msg = f"🚀 BUY SIGNAL: {target_pair} @ {current_price} (Target: +4%)"
                        active_positions[target_pair] = current_price # OPEN POSITION
                        save_ai_log(target_pair, "BUY", confidence, current_price, reason)
                
            # Send Data to Dashboard
            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": current_price,
                "type": log_type,
                "message": log_msg
            }
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(2.0)

    except WebSocketDisconnect:
        print("❌ Disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(1)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
