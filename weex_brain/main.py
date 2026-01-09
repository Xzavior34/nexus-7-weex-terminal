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

# ✅ APPROVED "HIGH BETA" MAJORS (Expanded to 12 for Compliance)
# We track 12 coins to ensure we hit the "10 Trades" requirement quickly.
ALLOWED_PAIRS = [
    "BTCUSDT",   # The King
    "ETHUSDT",   # The Queen
    "SOLUSDT",   # Speed
    "DOGEUSDT",  # Volatility
    "XRPUSDT",   # Old Guard
    "SUIUSDT",   # New L1
    "BNBUSDT",   # Exchange Coin (High Volume)
    "ADAUSDT",   # Cardano (Stable)
    "AVAXUSDT",  # Avalanche (Fast Mover)
    "LINKUSDT",  # DeFi Oracle (Reliable)
    "DOTUSDT",   # Polkadot
    "LTCUSDT"    # Litecoin (The "Silver" to BTC)
]

# --- 🛡️ PROFESSIONAL RISK MANAGEMENT ---
# These settings are tuned to "Preserve Capital" while "Hunting Profit"
LEVERAGE = 8             # 8x is the limit for aggressive/safe.
STOP_LOSS_PCT = 0.02     # SAFETY: Sell if down 2% (Prevents disaster).
TAKE_PROFIT_PCT = 0.045  # GREED: Sell if up 4.5% (Banks the win).

HISTORY_SIZE = 30
LOG_FILE = "ai_trading_logs.csv"

# separate history for BTC to track the "Market Mood"
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {}    

app = FastAPI()

# 🏥 CRITICAL UPTIME FIX: Explicitly Allow HEAD & GET
# This fixes the "405 Method Not Allowed" error on UptimeRobot.
@app.api_route("/", methods=["GET", "HEAD"])
def health_check():
    return {"status": "active", "system": "Nexus-7 Online", "version": "2.2-SMART"}

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
    print(f"⚡ NEXUS-7: SMART TREND FILTER ACTIVE (Lev: {LEVERAGE}x)")
    
    try:
        while True:
            # --- 🧠 STEP 1: READ THE GENERAL (BITCOIN) ---
            # We always check BTC first to determine the "Market Mood"
            btc_price = await asyncio.to_thread(weex_bot.get_market_price, "BTCUSDT")
            if btc_price:
                price_history["BTCUSDT"].append(btc_price)

            # Check if BTC is Bearish (Price < Average of last 10 readings)
            is_btc_bearish = False
            if len(price_history["BTCUSDT"]) >= 10:
                btc_list = list(price_history["BTCUSDT"])
                # Calculate simple moving average of recent BTC prices
                btc_avg = sum(btc_list) / len(btc_list)
                if btc_list[-1] < btc_avg:
                    is_btc_bearish = True

            # --- STEP 2: SCAN A TARGET ---
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
            
            # --- 🛡️ 1. CHECK ACTIVE POSITIONS (SAFETY SHIELD) ---
            if target_pair in active_positions:
                entry_price = active_positions[target_pair]
                pct_change = (current_price - entry_price) / entry_price
                
                # STOP LOSS (The Shield)
                if pct_change <= -STOP_LOSS_PCT:
                    log_type = "RISK_CHECK"
                    log_msg = f"🛡️ STOP LOSS: Sold {target_pair} (Saved Capital)"
                    del active_positions[target_pair] 
                    save_ai_log(target_pair, "SELL", 100, current_price, "Stop Loss Triggered")

                # TAKE PROFIT (The Bank)
                elif pct_change >= TAKE_PROFIT_PCT:
                    log_type = "OPPORTUNITY"
                    log_msg = f"💰 PROFIT LOCKED: Sold {target_pair} (+{pct_change*100:.2f}%)"
                    del active_positions[target_pair]
                    save_ai_log(target_pair, "SELL", 100, current_price, "Take Profit Hit")
                
                else:
                    log_msg = f"Holding {target_pair} (PnL: {pct_change*100:.2f}%)"
            
            # --- 2. LOOK FOR NEW TRADES (WITH BITCOIN VETO) ---
            elif len(history_list) >= 20:
                sma = sum(history_list) / len(history_list)
                deviation = (current_price - sma) / sma
                
                # LOGIC: If price pumps 0.15% above average, it's a breakout.
                if deviation > 0.0015: 
                    
                    # 🛑 THE VETO: Only Buy if BTC is Strong!
                    # If BTC is weak, we skip the buy unless the target IS Bitcoin itself.
                    if is_btc_bearish and target_pair != "BTCUSDT":
                         log_type = "AI_SCAN"
                         log_msg = f"🛡️ SMART GUARD: Skipped {target_pair} Buy (BTC is Weak)"
                    else:
                        confidence = 85 + int(deviation * 10000)
                        if confidence > 90:
                            log_type = "EXECUTION"
                            log_msg = f"🚀 BUY SIGNAL: {target_pair} @ {current_price}"
                            active_positions[target_pair] = current_price
                            save_ai_log(target_pair, "BUY", confidence, current_price, "Trend Confirmed")
                
            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": current_price,
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
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
