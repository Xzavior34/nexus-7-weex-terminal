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

# --- ⚙️ CONFIGURATION & RISK MANAGEMENT ---
LIVE_TRADING = False          # ⚠️ SET TO TRUE TO TRADE REAL MONEY
LEVERAGE = 10
BET_PERCENTAGE = 0.15         # 15% of Wallet per trade
HISTORY_SIZE = 50             # Ticks (approx 25-50 seconds of data)
LOOP_DELAY = 0.5              # fast loop (0.5s)

# ✅ APPROVED "HIGH BETA" MAJORS
ALLOWED_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", 
    "XRPUSDT", "SUIUSDT", "BNBUSDT", "ADAUSDT", 
    "AVAXUSDT", "LINKUSDT", "DOTUSDT", "LTCUSDT"
]

# --- 📉 STRATEGY LOGIC ---
DIP_THRESHOLDS = [0.005, 0.017, 0.02, 0.04, 0.06]
MOMENTUM_THRESHOLD = 1.015
RSI_OVERBOUGHT = 75

LOG_FILE = "nexus7_logs.csv"
WALLET_FILE = "wallet_data.json"

# --- 🧠 STATE MEMORY ---
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {} 
SIMULATED_WALLET = {} # Loaded below

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

# --- 🚀 ASYNC CORE (THE SPEED UPGRADE) ---

async def fetch_all_prices():
    """Fetches ALL prices in parallel. 12x Speed boost."""
    tasks = [asyncio.to_thread(weex_bot.get_market_price, pair) for pair in ALLOWED_PAIRS]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Map results to pairs, filtering out errors
    price_map = {}
    for pair, result in zip(ALLOWED_PAIRS, results):
        if not isinstance(result, Exception) and result is not None:
            price_map[pair] = result
    return price_map

async def execute_trade(action, pair, amount, price, reason):
    """Handles both SIMULATION and LIVE execution."""
    if LIVE_TRADING:
        # ⚠️ REAL MONEY EXECUTION
        if action == "BUY":
            # await asyncio.to_thread(weex_bot.create_market_buy, pair, amount) 
            pass # Uncomment above when ready
        elif action == "SELL":
            # await asyncio.to_thread(weex_bot.create_market_sell, pair, amount)
            pass
    
    # Always update internal ledger for UI/Logs
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
    print(f"⚡ NEXUS-7 ONLINE: PARALLEL ENGINE ACTIVE")
    
    try:
        while True:
            loop_start = time.time()
            
            # 1. ⚡ FETCH ALL PRICES (PARALLEL)
            prices = await fetch_all_prices()
            if not prices:
                await asyncio.sleep(0.5)
                continue

            # 2. 🛡️ GLOBAL VETO CHECK (BTC)
            veto_active = False
            if "BTCUSDT" in prices:
                btc_price = prices["BTCUSDT"]
                price_history["BTCUSDT"].append(btc_price)
                if len(price_history["BTCUSDT"]) >= 5:
                    recent_btc = list(price_history["BTCUSDT"])
                    # If BTC dumps 0.3% in last ~2.5 seconds (FAST reaction)
                    if recent_btc[-1] < recent_btc[0] * 0.997:
                        veto_active = True

            # 3. 🧠 PROCESS ALL PAIRS (ATOMIC SWEEP)
            current_log = {"type": "HEARTBEAT", "message": "Scanning..."}
            
            for pair, current_price in prices.items():
                price_history[pair].append(current_price)
                history = list(price_history[pair])
                
                # A. MANAGE EXISTING POSITIONS
                if pair in active_positions:
                    entry = active_positions[pair]
                    pct = (current_price - entry["price"]) / entry["price"]
                    pnl_dollar = entry["size"] * pct * LEVERAGE
                    active_positions[pair]["unrealized_pnl"] = pnl_dollar # Temp store
                    
                    # Exit Logic
                    should_sell = False
                    sell_reason = ""
                    
                    trend_weak = False
                    if len(history) >= 5 and current_price < (sum(history[-5:])/5):
                        trend_weak = True

                    if pct <= -0.02: 
                        should_sell = True; sell_reason = "Loss Cut (-2%)"
                    elif pct >= 0.06: 
                        should_sell = True; sell_reason = "Jackpot (+6%)"
                    elif pct >= 0.04 and trend_weak: 
                        should_sell = True; sell_reason = "Secure +4% (Weak)"
                    elif pct >= 0.02 and trend_weak: 
                        should_sell = True; sell_reason = "Scalp +2% (Weak)"

                    if should_sell:
                        await execute_trade("SELL", pair, entry["size"], current_price, sell_reason)
                        current_log = {"type": "SELL", "message": f"💰 SOLD {pair}: {sell_reason}"}

                # B. HUNT NEW TRADES
                elif len(history) >= 20:
                    # Metrics
                    recent_high = max(history)
                    pullback_pct = (recent_high - current_price) / recent_high
                    momentum = (sum(history[-3:])/3) / (sum(history[-20:])/20)
                    rsi = calculate_rsi(history)
                    
                    buy_signal = False
                    buy_type = ""
                    buy_note = ""

                    # Strategy 1: RIDE
                    if momentum > MOMENTUM_THRESHOLD and rsi < RSI_OVERBOUGHT:
                        buy_signal = True
                        buy_type = "MOMENTUM_BUY"
                        buy_note = f"RIDE: Mtm {momentum:.3f}"

                    # Strategy 2: FALL (Ladder)
                    if not buy_signal:
                        for threshold in DIP_THRESHOLDS:
                            if threshold <= pullback_pct < (threshold + 0.003):
                                # Green Tick Confirmation
                                last_p = history[-2] if len(history)>1 else current_price
                                if threshold == 0.005 and current_price <= last_p:
                                    continue # Wait for curl
                                buy_signal = True
                                buy_type = "DIP_BUY"
                                buy_note = f"SNIPED {threshold*100}% DIP"
                                break

                    # Execution
                    if buy_signal:
                        if veto_active and pair != "BTCUSDT":
                             current_log = {"type": "VETO", "message": f"🛡️ VETO BLOCKED {pair}"}
                        else:
                            bet = SIMULATED_WALLET["available"] * BET_PERCENTAGE
                            if bet >= 10:
                                await execute_trade("BUY", pair, bet, current_price, buy_type)
                                current_log = {"type": "BUY", "message": f"⚡ BOUGHT {pair}: {buy_note}"}

            # 4. 📊 BROADCAST STATUS
            total_unrealized = sum(p.get("unrealized_pnl", 0) for p in active_positions.values())
            SIMULATED_WALLET["unrealized_pnl"] = total_unrealized
            SIMULATED_WALLET["total"] = SIMULATED_WALLET["available"] + SIMULATED_WALLET["in_positions"] + total_unrealized

            positions_list = [
                {"symbol": k, "pnl": round((v.get("unrealized_pnl",0)/v["size"])*100/LEVERAGE, 2), "type": v["type"]}
                for k, v in active_positions.items()
            ]

            payload = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "veto_status": "RED" if veto_active else "GREEN",
                "log": current_log,
                "wallet": {
                    "total": round(SIMULATED_WALLET["total"], 2),
                    "available": round(SIMULATED_WALLET["available"], 2),
                    "positions": positions_list
                }
            }
            
            await websocket.send_text(json.dumps(payload))
            
            # Maintain Loop Speed
            elapsed = time.time() - loop_start
            sleep_time = max(0, LOOP_DELAY - elapsed)
            await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        print("❌ Client Disconnected")
    except Exception as e:
        print(f"🔥 Critical Error: {e}")
        await asyncio.sleep(1)

@app.api_route("/", methods=["GET"])
def health():
    return {"status": "active", "mode": "LIVE" if LIVE_TRADING else "SIMULATION"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
