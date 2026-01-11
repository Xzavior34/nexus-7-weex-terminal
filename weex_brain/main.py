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
DIP_THRESHOLDS = [0.005, 0.017, 0.02, 0.04, 0.06]
MOMENTUM_THRESHOLD = 1.004  # Targeted high-probability moves
RSI_OVERBOUGHT = 85

LOG_FILE = "nexus7_logs.csv"
WALLET_FILE = "wallet_data.json"

# --- 🧠 STATE MEMORY ---
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {}
last_known_prices = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_wallet():
    if os.path.exists(WALLET_FILE):
        try:
            with open(WALLET_FILE, "r") as f: return json.load(f)
        except: pass
    return {"total": 1000.0, "available": 1000.0, "in_positions": 0.0, "unrealized_pnl": 0.0}

SIMULATED_WALLET = load_wallet()

async def fetch_price_safe(pair):
    """Fetches real-time price with thread safety for parallel execution."""
    try:
        # Strict thread management prevents blocking the WebSocket heartbeat
        return await asyncio.to_thread(weex_bot.get_market_price, pair)
    except:
        return None

async def fetch_all_prices():
    """Batch executes price scans to solve latency issues."""
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
    print("⚡ NEXUS-7 PRO v2.1: LINKED")
    
    try:
        while True:
            loop_start = time.time()
            prices = await fetch_all_prices()
            
            if not prices:
                await asyncio.sleep(0.1)
                continue

            # 🛡️ ATOMIC VETO CHECK
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
                
                msg_type = "SCAN"
                msg_text = f"Scanning {pair}..."
                
                # --- POSITION MANAGEMENT ---
                if pair in active_positions:
                    entry = active_positions[pair]
                    pct = (current_price - entry["price"]) / entry["price"]
                    pnl_val = entry["size"] * pct * LEVERAGE
                    active_positions[pair]["unrealized_pnl"] = pnl_val
                    
                    # Logic for Profit/Loss Cuts
                    should_sell = False
                    reason = ""
                    if pct <= -0.02: should_sell, reason = True, "Loss Cut (-2%)"
                    elif pct >= 0.035: should_sell, reason = True, "Jackpot (+3.5%)"
                    
                    if should_sell:
                        SIMULATED_WALLET["available"] += (entry["size"] + pnl_val)
                        SIMULATED_WALLET["in_positions"] -= entry["size"]
                        del active_positions[pair]
                        msg_type, msg_text = "SELL", f"💰 SOLD {pair}: {reason}"

                # --- SIGNAL DETECTION ---
                elif len(history) >= 20:
                    momentum = (sum(history[-3:])/3) / (sum(history[-20:])/20)
                    if momentum > MOMENTUM_THRESHOLD and veto_active == "GREEN":
                        bet = SIMULATED_WALLET["available"] * BET_PERCENTAGE
                        if bet >= 10:
                            SIMULATED_WALLET["available"] -= bet
                            SIMULATED_WALLET["in_positions"] += bet
                            active_positions[pair] = {"price": current_price, "size": bet, "type": "TREND"}
                            msg_type, msg_text = "BUY", f"⚡ BOUGHT {pair}: MOMENTUM"

                # 📡 BROADCAST PAYLOAD
                total_unrealized = sum(p.get("unrealized_pnl", 0) for p in active_positions.values())
                SIMULATED_WALLET["total"] = SIMULATED_WALLET["available"] + SIMULATED_WALLET["in_positions"] + total_unrealized
                
                # Format to match your new "positions" list in Dashboard.tsx
                payload = {
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "symbol": pair,
                    "price": current_price,
                    "type": msg_type,
                    "message": msg_text,
                    "veto_status": veto_active,
                    "wallet": {
                        "total": round(SIMULATED_WALLET["total"], 2),
                        "available": round(SIMULATED_WALLET["available"], 2),
                        "inPositions": round(SIMULATED_WALLET["in_positions"], 2),
                        "unrealizedPnL": round(total_unrealized, 2),
                        "pnlPercent": round((total_unrealized/1000)*100, 2),
                        "positions": [
                            {"symbol": k, "pnl": round((v.get("unrealized_pnl",0)/v["size"])*100/LEVERAGE, 2), "type": v["type"]}
                            for k, v in active_positions.items()
                        ]
                    }
                }
                await websocket.send_text(json.dumps(payload))
                await asyncio.sleep(0.01) # UI Smoothing

            elapsed = time.time() - loop_start
            await asyncio.sleep(max(0, LOOP_DELAY - elapsed))

    except WebSocketDisconnect:
        print("❌ DASHBOARD LINK SEVERED")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
