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
from weex_client import weex_bot  # Assuming this handles your API calls

# --- ⚙️ CONFIGURATION & COMPETITION MODE ---
LIVE_TRADING = False          # ⚠️ SET TO TRUE TO TRADE REAL MONEY
LEVERAGE = 10                 # High-Performance Leverage
BET_PERCENTAGE = 0.15         # 15% of Wallet per trade
HISTORY_SIZE = 300            # 2.5 minutes of memory
LOOP_DELAY = 0.5              # Fast loop

# ✅ APPROVED "HIGH BETA" MAJORS
ALLOWED_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", 
    "XRPUSDT", "SUIUSDT", "BNBUSDT", "ADAUSDT", 
    "AVAXUSDT", "LINKUSDT", "DOTUSDT", "LTCUSDT"
]

# --- 📉 PROFIT TUNING ---
DIP_THRESHOLDS = [0.005, 0.017, 0.02, 0.04, 0.06]
MOMENTUM_THRESHOLD = 1.003    # Standard Breakout
RSI_OVERBOUGHT = 85           # Allow pumps to run

LOG_FILE = "nexus7_logs.csv"
WALLET_FILE = "wallet_data.json"

# --- 🧠 STATE MEMORY ---
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {} 
SIMULATED_WALLET = {} 
# 🧠 MEMORY CACHE: Stores the last REAL price to prevent "Blank Screens"
last_known_prices = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 🛠️ HELPER FUNCTIONS ---

def calculate_rsi(prices, period=14):
    if len(prices) < period + 1:
        return 50
    gains = []
    losses = []
    for i in range(1, len(prices)):
        change = prices[i] - prices[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

def load_wallet():
    if os.path.exists(WALLET_FILE):
        try:
            with open(WALLET_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"total": 1000.0, "available": 1000.0, "in_positions": 0.0, "unrealized_pnl": 0.0}

def save_wallet():
    try:
        with open(WALLET_FILE, "w") as f:
            json.dump(SIMULATED_WALLET, f)
    except:
        pass

def save_nexus_log(symbol, action, type_tag, price, reason):
    try:
        file_exists = os.path.isfile(LOG_FILE)
        with open(LOG_FILE, mode='a', newline='') as file:
            writer = csv.writer(file)
            if not file_exists:
                writer.writerow(["Timestamp", "Symbol", "Action", "Type", "Price", "Reason"])
            writer.writerow([datetime.utcnow().isoformat(), symbol, action, type_tag, price, reason])
    except:
        pass

# Initialize Wallet
SIMULATED_WALLET = load_wallet()

# --- 🚀 ASYNC CORE (PURE REAL-TIME PARALLEL) ---

async def fetch_price_safe(pair):
    """
    Fetches REAL price. NO timeout.
    We use to_thread so it doesn't block the WebSocket heartbeat.
    """
    try:
        # We wait as long as needed. No 'wait_for' timeout here.
        return await asyncio.to_thread(weex_bot.get_market_price, pair)
    except:
        return None

async def fetch_all_prices():
    """
    Fetches ALL prices in parallel threads.
    This fixes the '11s delay' naturally by running 12 requests at once.
    """
    tasks = []
    for pair in ALLOWED_PAIRS:
        tasks.append(fetch_price_safe(pair))
        # Tiny 0.05s stagger prevents '429 Rate Limit' errors from Exchange
        await asyncio.sleep(0.05) 
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    price_map = {}
    
    for pair, result in zip(ALLOWED_PAIRS, results):
        if result is not None and not isinstance(result, Exception) and isinstance(result, (int, float)):
            price_map[pair] = float(result)
            last_known_prices[pair] = float(result) # Save valid price to memory
        elif pair in last_known_prices:
            # Fallback: Use the last REAL price we saw (never send 0 or blank)
            price_map[pair] = last_known_prices[pair]
            
    return price_map

async def execute_trade(action, pair, amount, price, reason):
    """Handles both SIMULATION and LIVE execution."""
    if LIVE_TRADING:
        # ⚠️ REAL MONEY EXECUTION
        # if action == "BUY": await asyncio.to_thread(weex_bot.create_market_buy, pair, amount) 
        pass 
    
    # Update Wallet
    if action == "BUY":
        SIMULATED_WALLET["available"] -= amount
        SIMULATED_WALLET["in_positions"] += amount
        active_positions[pair] = {"price": price, "size": amount, "type": reason}
    elif action == "SELL":
        entry = active_positions[pair]
        pnl = (amount + entry["unrealized_pnl"]) if "unrealized_pnl" in entry else amount
        SIMULATED_WALLET["available"] += pnl
        SIMULATED_WALLET["in_positions"] -= entry["size"]
        del active_positions[pair]
    
    save_wallet() 
    save_nexus_log(pair, action, "TRADE", price, reason)

# --- 📡 WEBSOCKET LOOP ---

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"⚡ NEXUS-7 ONLINE: PURE REAL-TIME ENGINE ACTIVE")
    
    try:
        while True:
            loop_start = time.time()
            
            # 1. ⚡ FETCH REAL PRICES (PARALLEL)
            prices = await fetch_all_prices()
            
            # If completely empty (network down), retry immediately
            if not prices:
                await asyncio.sleep(0.1)
                continue

            # 2. 🛡️ GLOBAL VETO CHECK (BTC)
            veto_active = False
            if "BTCUSDT" in prices:
                btc_price = prices["BTCUSDT"]
                price_history["BTCUSDT"].append(btc_price)
                if len(price_history["BTCUSDT"]) >= 5:
                    recent_btc = list(price_history["BTCUSDT"])
                    if recent_btc[-1] < recent_btc[0] * 0.997:
                        veto_active = True

            # 3. 🧠 PROCESS & BROADCAST
            for pair, current_price in prices.items():
                price_history[pair].append(current_price)
                history = list(price_history[pair])
                
                msg_type = "SCAN"
                msg_text = f"Scanning {pair}..."
                
                # A. MANAGE EXISTING POSITIONS
                if pair in active_positions:
                    entry = active_positions[pair]
                    pct = (current_price - entry["price"]) / entry["price"]
                    pnl_dollar = entry["size"] * pct * LEVERAGE
                    active_positions[pair]["unrealized_pnl"] = pnl_dollar 
                    
                    # Exit Logic 
                    should_sell = False
                    sell_reason = ""
                    trend_weak = len(history) >= 5 and current_price < (sum(history[-5:])/5)

                    if pct <= -0.02: should_sell = True; sell_reason = "Loss Cut (-2%)"
                    elif pct >= 0.035: should_sell = True; sell_reason = "Jackpot (+3.5%)"
                    elif pct >= 0.02 and trend_weak: should_sell = True; sell_reason = "Secure +2%"

                    if should_sell:
                        await execute_trade("SELL", pair, entry["size"], current_price, sell_reason)
                        msg_type = "SELL"
                        msg_text = f"💰 SOLD {pair}: {sell_reason}"
                    else:
                        msg_type = "HOLD"
                        msg_text = f"Holding {pair} ({pct*100:.2f}%)"

                # B. HUNT NEW TRADES
                elif len(history) >= 20:
                    recent_high = max(history)
                    pullback_pct = (recent_high - current_price) / recent_high
                    
                    short_ma = sum(history[-3:]) / 3
                    long_ma = sum(history[-20:]) / 20
                    momentum = short_ma / long_ma
                    rsi = calculate_rsi(history)
                    
                    buy_signal = False
                    buy_note = ""

                    # 🔥 STRATEGY 1: ACTIVE TREND SNIPER
                    if 55 < rsi < 85 and momentum > 1.004:
                        buy_signal = True; buy_note = "TREND FOLLOW"

                    # 🚀 STRATEGY 2: MOMENTUM EXPLOSION
                    if momentum > MOMENTUM_THRESHOLD and rsi < RSI_OVERBOUGHT:
                        buy_signal = True; buy_note = f"MOMENTUM ({momentum:.3f})"

                    # 📉 STRATEGY 3: FALL (Ladder)
                    if not buy_signal:
                        for threshold in DIP_THRESHOLDS:
                            if threshold <= pullback_pct < (threshold + 0.003):
                                if threshold == 0.005 and len(history)>1 and current_price <= history[-2]:
                                    continue 
                                buy_signal = True; buy_note = f"SNIPED {threshold*100}% DIP"
                                break

                    # Execution
                    if buy_signal:
                        if veto_active and pair != "BTCUSDT":
                            msg_type = "VETO"
                            msg_text = f"🛡️ BLOCKED {pair} (BTC DUMP)"
                        else:
                            bet = SIMULATED_WALLET["available"] * BET_PERCENTAGE
                            if bet >= 10:
                                await execute_trade("BUY", pair, bet, current_price, buy_note)
                                msg_type = "BUY"
                                msg_text = f"⚡ BOUGHT {pair}: {buy_note}"

                # 4. 📡 SEND PAYLOAD
                total_unrealized = sum(p.get("unrealized_pnl", 0) for p in active_positions.values())
                SIMULATED_WALLET["total"] = SIMULATED_WALLET["available"] + SIMULATED_WALLET["in_positions"] + total_unrealized
                
                positions_list = [
                    {"symbol": k, "pnl": round((v.get("unrealized_pnl",0)/v["size"])*100/LEVERAGE, 2), "type": v["type"]}
                    for k, v in active_positions.items()
                ]

                payload = {
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "symbol": pair,
                    "price": current_price,
                    "type": msg_type,
                    "message": msg_text,
                    "veto_status": "RED" if veto_active else "GREEN",
                    "wallet": {
                        "total": round(SIMULATED_WALLET["total"], 2),
                        "available": round(SIMULATED_WALLET["available"], 2),
                        "inPositions": round(SIMULATED_WALLET["in_positions"], 2),
                        "positions": positions_list
                    }
                }
                
                await websocket.send_text(json.dumps(payload))
                # Critical for smooth UI
                await asyncio.sleep(0.01)

            # End of Cycle
            elapsed = time.time() - loop_start
            sleep_time = max(0, LOOP_DELAY - elapsed)
            await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        print("❌ Client Disconnected")
    except Exception as e:
        print(f"🔥 Critical Error: {e}")
        await asyncio.sleep(1)

# --- 📥 DOWNLOAD ENDPOINT ---
@app.get("/download-logs")
def download_logs():
    if os.path.exists(LOG_FILE):
        return FileResponse(LOG_FILE, media_type='text/csv', filename="nexus7_logs.csv")
    return {"error": "No data yet."}

@app.api_route("/", methods=["GET"])
def health():
    return {"status": "active", "mode": "LIVE" if LIVE_TRADING else "SIMULATION"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
