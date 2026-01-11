import uvicorn
import asyncio
import json
import csv
import os
import time
from collections import deque
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from weex_client import weex_bot

# --- ⚙️ CONFIGURATION & RISK ---
LIVE_TRADING = False
LEVERAGE = 10
BET_PERCENTAGE = 0.15
HISTORY_SIZE = 300
LOOP_DELAY = 0.5

ALLOWED_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", 
    "XRPUSDT", "SUIUSDT", "BNBUSDT", "ADAUSDT", 
    "AVAXUSDT", "LINKUSDT", "DOTUSDT", "LTCUSDT"
]

# --- 📉 STRATEGY TUNING ---
MOMENTUM_THRESHOLD = 1.004  
STOP_LOSS_PCT = 0.02         # Initial 2% Stop Loss
TRAILING_DISTANCE = 0.01     # Trail 1% behind peaks
BREAK_EVEN_TRIGGER = 0.015   # Move to Break-even at +1.5% profit
PARTIAL_TAKE_PROFIT = 0.025  # Sell 30% at +2.5%

LOG_FILE = "nexus7_logs.csv"
WALLET_FILE = "wallet_data.json"

# --- 🧠 STATE MEMORY ---
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {}
last_known_prices = {}

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def load_wallet():
    if os.path.exists(WALLET_FILE):
        try:
            with open(WALLET_FILE, "r") as f: return json.load(f)
        except: pass
    return {"total": 1000.0, "available": 1000.0, "in_positions": 0.0, "unrealized_pnl": 0.0}

SIMULATED_WALLET = load_wallet()

async def fetch_price_safe(pair):
    try: return await asyncio.to_thread(weex_bot.get_market_price, pair)
    except: return None

async def fetch_all_prices():
    tasks = [fetch_price_safe(pair) for pair in ALLOWED_PAIRS]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    price_map = {}
    for pair, result in zip(ALLOWED_PAIRS, results):
        if isinstance(result, (int, float)):
            price_map[pair] = float(result)
            last_known_prices[pair] = float(result)
        elif pair in last_known_prices: price_map[pair] = last_known_prices[pair]
    return price_map

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("⚡ NEXUS-7 PRO v2.1: RISK GUARD ACTIVE")
    
    try:
        while True:
            loop_start = time.time()
            prices = await fetch_all_prices()
            if not prices:
                await asyncio.sleep(0.1); continue

            # 🛡️ ATOMIC VETO CHECK
            veto_active = "GREEN"
            if "BTCUSDT" in prices:
                price_history["BTCUSDT"].append(prices["BTCUSDT"])
                if len(price_history["BTCUSDT"]) >= 5:
                    recent = list(price_history["BTCUSDT"])
                    if recent[-1] < recent[0] * 0.997: veto_active = "RED"

            for pair, current_price in prices.items():
                price_history[pair].append(current_price)
                history = list(price_history[pair])
                msg_type, msg_text = "SCAN", f"Scanning {pair}..."
                
                # --- POSITION MANAGEMENT (TRAIL & BREAK-EVEN) ---
                if pair in active_positions:
                    pos = active_positions[pair]
                    pct = (current_price - pos["price"]) / pos["price"]
                    
                    # Update High Water Mark for Trailing
                    if current_price > pos.get("high_price", 0):
                        active_positions[pair]["high_price"] = current_price
                    
                    # 1. Trailing Stop Logic
                    trail_stop = pos.get("high_price", 0) * (1 - TRAILING_DISTANCE)
                    
                    # 2. Sell Logic
                    should_sell, reason = False, ""
                    if current_price <= pos["stop_loss"]: should_sell, reason = True, "Stop Loss"
                    elif pct >= 0.035: should_sell, reason = True, "Max Take Profit"
                    elif pct >= BREAK_EVEN_TRIGGER and pos["stop_loss"] < pos["price"]:
                        active_positions[pair]["stop_loss"] = pos["price"]
                        msg_text = f"🛡️ BREAK-EVEN SET for {pair}"
                    elif current_price <= trail_stop and pct >= 0.01:
                        should_sell, reason = True, "Trailing Stop Hit"

                    if should_sell:
                        pnl = pos["size"] * pct * LEVERAGE
                        SIMULATED_WALLET["available"] += (pos["size"] + pnl)
                        SIMULATED_WALLET["in_positions"] -= pos["size"]
                        del active_positions[pair]
                        msg_type, msg_text = "SELL", f"💰 SOLD {pair}: {reason}"
                    else:
                        active_positions[pair]["unrealized_pnl"] = pos["size"] * pct * LEVERAGE
                        msg_type, msg_text = "HOLD", f"Holding {pair} ({pct*100:.2f}%)"

                # --- SIGNAL DETECTION ---
                elif len(history) >= 20 and veto_active == "GREEN":
                    momentum = (sum(history[-3:])/3) / (sum(history[-20:])/20)
                    if momentum > MOMENTUM_THRESHOLD:
                        bet = SIMULATED_WALLET["available"] * BET_PERCENTAGE
                        if bet >= 10:
                            SIMULATED_WALLET["available"] -= bet
                            SIMULATED_WALLET["in_positions"] += bet
                            active_positions[pair] = {
                                "price": current_price, 
                                "size": bet, 
                                "stop_loss": current_price * (1 - STOP_LOSS_PCT),
                                "high_price": current_price,
                                "type": "TREND"
                            }
                            msg_type, msg_text = "BUY", f"⚡ BOUGHT {pair}: MOMENTUM"

                # 📡 BROADCAST PAYLOAD
                total_unrealized = sum(p.get("unrealized_pnl", 0) for p in active_positions.values())
                SIMULATED_WALLET["total"] = SIMULATED_WALLET["available"] + SIMULATED_WALLET["in_positions"] + total_unrealized
                
                payload = {
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "symbol": pair, "price": current_price, "type": msg_type, "message": msg_text, "veto_status": veto_active,
                    "wallet": {
                        "total": round(SIMULATED_WALLET["total"], 2),
                        "available": round(SIMULATED_WALLET["available"], 2),
                        "inPositions": round(SIMULATED_WALLET["in_positions"], 2),
                        "unrealizedPnL": round(total_unrealized, 2),
                        "pnlPercent": round((total_unrealized/1000)*100, 2),
                        "positions": [{"symbol": k, "pnl": round((v.get("unrealized_pnl",0)/v["size"])*100/LEVERAGE, 2), "type": v["type"]} for k, v in active_positions.items()]
                    }
                }
                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.01)

            await asyncio.sleep(max(0, LOOP_DELAY - (time.time() - loop_start)))

    except WebSocketDisconnect: print("❌ LINK SEVERED")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
