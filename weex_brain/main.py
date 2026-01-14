"""
PROJECT: NEXUS-7 (WEEX AI HACKATHON ENTRY)
TEAM: WEEX Alpha Awakens Forked Entry
STRATEGY: Heuristic Momentum Scalping with Anomaly Detection (BTC Veto)
COMPLIANCE: Real-Time API Streaming via weex_client
"""

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

# --- ⚙️ CONFIGURATION ---
LIVE_TRADING = False
LEVERAGE = 10
BET_PERCENTAGE = 0.15
MAX_OPEN_POSITIONS = 5
HISTORY_SIZE = 300
LOOP_DELAY = 0.5

# RULE: Trade only designated pairs
ALLOWED_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", 
    "LTCUSDT", "XRPUSDT", "BNBUSDT", "ADAUSDT"
]

# --- 📉 STRATEGY: IRON-CLAD (0.3%) ---
MOMENTUM_THRESHOLD = 1.003
STOP_LOSS_PCT = 0.02
TRAILING_DISTANCE = 0.008

# --- 🛡️ LOSS CONTROL ---
BREAK_EVEN_TRIGGER = 0.006
PROFIT_LOCK_LEVEL_1 = 0.015
PROFIT_LOCK_LEVEL_2 = 0.030
PARTIAL_TAKE_PROFIT = 0.045

FILES = {"wallet": "wallet_data.json"}

# --- 🧠 STATE MEMORY ---
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {}
last_known_prices = {}

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- 💾 PERSISTENCE SYSTEM ---
def save_wallet(wallet_data):
    try:
        with open(FILES["wallet"], "w") as f:
            json.dump(wallet_data, f)
    except Exception as e:
        print(f"⚠️ Save Error: {e}")

def load_wallet():
    if os.path.exists(FILES["wallet"]):
        try:
            with open(FILES["wallet"], "r") as f: 
                data = json.load(f)
                total_equity = data.get("total", 1000.0)
                return {
                    "total": total_equity,
                    "available": total_equity, 
                    "in_positions": 0.0,
                    "unrealized_pnl": 0.0
                }
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
        elif pair in last_known_prices: 
            price_map[pair] = last_known_prices[pair]
    return price_map

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("⚡ NEXUS-7: REAL-TIME COMPLIANCE MODE")
    
    async def keep_alive():
        try:
            while True:
                await websocket.send_json({"type": "ping", "message": "HEARTBEAT"})
                await asyncio.sleep(20) 
        except: pass

    heartbeat_task = asyncio.create_task(keep_alive())
    
    try:
        while True:
            loop_start = time.time()
            prices = await fetch_all_prices()
            if not prices:
                await asyncio.sleep(0.1); continue

            # 🛡️ AI ANOMALY DETECTION
            veto_active = "GREEN"
            if "BTCUSDT" in prices:
                price_history["BTCUSDT"].append(prices["BTCUSDT"])
                if len(price_history["BTCUSDT"]) >= 5:
                    recent = list(price_history["BTCUSDT"])
                    if recent[-1] < recent[0] * 0.997: 
                        veto_active = "RED"

            for pair, current_price in prices.items():
                price_history[pair].append(current_price)
                history = list(price_history[pair])
                msg_type, msg_text = "SCAN", f"Scanning {pair}..."
                
                # --- MANAGE POSITIONS ---
                if pair in active_positions:
                    pos = active_positions[pair]
                    pct = (current_price - pos["price"]) / pos["price"]
                    
                    if current_price > pos.get("high_price", 0):
                        active_positions[pair]["high_price"] = current_price
                    
                    trail_stop = pos.get("high_price", 0) * (1 - TRAILING_DISTANCE)
                    should_sell, reason = False, ""
                    
                    # LOGIC: IRON-CLAD DEFENSE
                    if current_price <= pos["stop_loss"]: should_sell, reason = True, "Stop Loss"
                    elif pct >= PARTIAL_TAKE_PROFIT: should_sell, reason = True, "Moon Target"
                    
                    elif pct >= BREAK_EVEN_TRIGGER and pos["stop_loss"] < pos["price"]:
                        active_positions[pair]["stop_loss"] = pos["price"]
                        msg_text = f"🛡️ SHIELD UP: Risk Free"
                        # 📡 LOG TO WEEX
                        asyncio.create_task(asyncio.to_thread(weex_bot.upload_ai_log, pair, "MODIFY_STOP", "Break-Even Triggered", "0.0"))
                    
                    elif pct >= PROFIT_LOCK_LEVEL_1 and pos["stop_loss"] < pos["price"] * 1.005:
                        active_positions[pair]["stop_loss"] = pos["price"] * 1.005
                        msg_text = f"🔒 LEVEL 1: Locked +0.5%"
                    
                    elif pct >= PROFIT_LOCK_LEVEL_2 and pos["stop_loss"] < pos["price"] * 1.015:
                        active_positions[pair]["stop_loss"] = pos["price"] * 1.015
                        msg_text = f"🔒 LEVEL 2: Locked +1.5%"

                    elif current_price <= trail_stop and pct >= 0.008:
                        should_sell, reason = True, "Trailing Stop"

                    if should_sell:
                        pnl = pos["size"] * pct * LEVERAGE
                        SIMULATED_WALLET["available"] += (pos["size"] + pnl)
                        SIMULATED_WALLET["in_positions"] -= pos["size"]
                        del active_positions[pair]
                        
                        save_wallet(SIMULATED_WALLET)
                        # 📡 LOG TO WEEX
                        asyncio.create_task(asyncio.to_thread(weex_bot.upload_ai_log, pair, "SELL", reason, "0.0"))
                        msg_type, msg_text = "SELL", f"💰 SOLD {pair}: {reason}"
                    else:
                        active_positions[pair]["unrealized_pnl"] = pos["size"] * pct * LEVERAGE
                        if msg_text.startswith("Scanning"): msg_text = f"HOLD: {pair} ({pct*100:.2f}%)"
                        msg_type = "HOLD"

                # --- NEW ENTRIES ---
                elif len(history) >= 20 and veto_active == "GREEN":
                    if len(active_positions) >= MAX_OPEN_POSITIONS:
                         msg_text = f"Max Pos ({len(active_positions)}/{MAX_OPEN_POSITIONS})"
                    else:
                        momentum = (sum(history[-3:])/3) / (sum(history[-20:])/20)
                        if momentum > MOMENTUM_THRESHOLD:
                            bet = SIMULATED_WALLET["available"] * BET_PERCENTAGE
                            if bet >= 10:
                                SIMULATED_WALLET["available"] -= bet
                                SIMULATED_WALLET["in_positions"] += bet
                                active_positions[pair] = {
                                    "price": current_price, "size": bet, 
                                    "stop_loss": current_price * (1 - STOP_LOSS_PCT),
                                    "high_price": current_price, "type": "TREND"
                                }
                                
                                save_wallet(SIMULATED_WALLET)
                                # 📡 LOG TO WEEX
                                asyncio.create_task(asyncio.to_thread(weex_bot.upload_ai_log, pair, "BUY", "Momentum > 0.3%", "0.5"))
                                msg_type, msg_text = "BUY", f"⚡ ENTRY {pair}"

                # 📡 BROADCAST
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

            elapsed = time.time() - loop_start
            await asyncio.sleep(max(0, LOOP_DELAY - elapsed))

    except WebSocketDisconnect: 
        print("❌ LINK SEVERED")
    finally:
        heartbeat_task.cancel()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
