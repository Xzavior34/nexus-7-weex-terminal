import uvicorn
import asyncio
import json
import csv
import os
from collections import deque
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from weex_client import weex_bot

# ✅ APPROVED "HIGH BETA" MAJORS
ALLOWED_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", 
    "XRPUSDT", "SUIUSDT", "BNBUSDT", "ADAUSDT", 
    "AVAXUSDT", "LINKUSDT", "DOTUSDT", "LTCUSDT"
]

# --- 🎯 NEXUS 7 CONFIGURATION ---
LEVERAGE = 10            
BET_PERCENTAGE = 0.15    # 15% of Wallet per trade
HISTORY_SIZE = 50        

# --- 📉 FALL LOGIC: THE SNIPER LADDER ---
# The bot looks for these specific percentage drops
DIP_THRESHOLDS = [0.005, 0.017, 0.02, 0.04, 0.06]

# --- 🚀 RIDE LOGIC: MOMENTUM TRIGGER ---
MOMENTUM_THRESHOLD = 1.015  # Price is 1.5% above average
RSI_OVERBOUGHT = 75         # Safety Ceiling

LOG_FILE = "nexus7_logs.csv"
WALLET_FILE = "wallet_data.json" 

# Store price history for logic calculations
price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {}    

app = FastAPI()

@app.api_route("/", methods=["GET", "HEAD"])
def health_check():
    return {"status": "active", "system": "Nexus-7 Kinetic Engine", "version": "3.5-GREEN_TICK"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 🧮 MATH HELPER: RSI CALCULATION ---
def calculate_rsi(prices, period=14):
    if len(prices) < period + 1:
        return 50 # Default neutral if not enough data
    
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
    rsi = 100 - (100 / (1 + rs))
    return rsi

# --- 💾 PERSISTENCE FUNCTIONS ---
def load_wallet():
    if os.path.exists(WALLET_FILE):
        try:
            with open(WALLET_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {
        "total": 1000.00,
        "available": 1000.00,
        "in_positions": 0.00,
        "unrealized_pnl": 0.00
    }

def save_wallet():
    try:
        with open(WALLET_FILE, "w") as f:
            json.dump(SIMULATED_WALLET, f)
    except:
        pass

SIMULATED_WALLET = load_wallet()

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

@app.get("/download-logs")
def download_logs():
    if os.path.exists(LOG_FILE):
        return FileResponse(LOG_FILE, media_type='text/csv', filename="nexus7_logs.csv")
    return {"error": "No data yet."}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"⚡ NEXUS-7 ONLINE: GREEN TICK VERIFICATION ACTIVE")
    
    scan_index = 0
    
    try:
        while True:
            # --- 1. GLOBAL MARKET SENSE (BTC VETO) ---
            btc_price = await asyncio.to_thread(weex_bot.get_market_price, "BTCUSDT")
            veto_active = False
            
            if btc_price:
                price_history["BTCUSDT"].append(btc_price)
                
                # Check for Flash Dump (BTC Veto)
                if len(price_history["BTCUSDT"]) >= 5:
                    recent_btc = list(price_history["BTCUSDT"])
                    # If BTC lost > 0.3% in last 5 ticks -> DANGER
                    if recent_btc[-1] < recent_btc[0] * 0.997:
                        veto_active = True

            # --- 2. TARGET SELECTION ---
            target_pair = ALLOWED_PAIRS[scan_index]
            scan_index = (scan_index + 1) % len(ALLOWED_PAIRS)
            
            current_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            if current_price is None:
                await asyncio.sleep(0.5)
                continue

            price_history[target_pair].append(current_price)
            history_list = list(price_history[target_pair])
            
            log_type = "SCAN"
            log_msg = f"Scanning {target_pair}..."
            
            # Helper: Calculate status for Frontend
            veto_status = "RED" if veto_active else "GREEN"

            # --- 🛡️ MANAGE ACTIVE POSITIONS ---
            if target_pair in active_positions:
                entry_data = active_positions[target_pair]
                entry_price = entry_data["price"]
                position_size = entry_data["size"] 

                pct_change = (current_price - entry_price) / entry_price
                pnl_dollar = position_size * pct_change * LEVERAGE
                
                # Update Wallet State
                SIMULATED_WALLET["unrealized_pnl"] = pnl_dollar
                SIMULATED_WALLET["total"] = SIMULATED_WALLET["available"] + SIMULATED_WALLET["in_positions"] + pnl_dollar

                should_sell = False
                sell_reason = ""

                # STOP LOSS (-2%)
                if pct_change <= -0.02: 
                    should_sell = True
                    sell_reason = "Loss Cut (-2%)"
                    log_type = "SELL_LOSS"

                # PROFIT LADDER
                elif pct_change >= 0.06:
                    should_sell = True
                    sell_reason = "Jackpot (+6%)"
                    log_type = "SELL_PROFIT"
                elif pct_change >= 0.04:
                    log_msg = f"🚀 {target_pair} at +4%... Holding for 6%"
                elif pct_change >= 0.02:
                    log_msg = f"🟢 {target_pair} at +2%... Holding for 4%"

                if should_sell:
                    SIMULATED_WALLET["available"] += (position_size + pnl_dollar)
                    SIMULATED_WALLET["in_positions"] -= position_size
                    del active_positions[target_pair]
                    save_wallet()
                    save_nexus_log(target_pair, "SELL", log_type, current_price, sell_reason)
                    log_msg = f"💰 SOLD {target_pair}: {sell_reason}"

            # --- 🔭 SEARCH FOR NEW TRADES ---
            elif len(history_list) >= 20:
                
                # METRICS
                recent_high = max(history_list)
                pullback_pct = (recent_high - current_price) / recent_high
                
                short_ma = sum(history_list[-3:]) / 3    
                long_ma = sum(history_list[-20:]) / 20   
                momentum_score = short_ma / long_ma
                
                # RSI CALC
                rsi_val = calculate_rsi(history_list)

                buy_signal = False
                buy_reason = ""
                buy_type = ""

                # 🔥 1. THE "RIDE" (High Momentum + RSI SAFE)
                if momentum_score > MOMENTUM_THRESHOLD:
                    if rsi_val < RSI_OVERBOUGHT:
                        buy_signal = True
                        buy_reason = f"🚀 RIDE: Mtm {momentum_score:.3f} | RSI {rsi_val:.1f}"
                        buy_type = "MOMENTUM_BUY"
                    else:
                        log_msg = f"⚠️ RIDE Skipped: RSI Overheated ({rsi_val:.1f})"

                # 📉 2. THE "FALL" (Sniper Ladder + GREEN TICK)
                # Only check fallback if Momentum didn't trigger
                if not buy_signal:
                    for threshold in DIP_THRESHOLDS:
                        upper_limit = threshold + 0.003 
                        
                        if threshold <= pullback_pct < upper_limit:
                            
                            # --- 🧠 SMART CHECK: THE GREEN TICK ---
                            # If checking the risky 0.5% level, ensure price is CURLLING UP
                            if threshold == 0.005:
                                last_price_check = history_list[-2] if len(history_list) > 1 else current_price
                                
                                if current_price <= last_price_check:
                                    # Price is still falling! Skip this cycle.
                                    log_msg = f"📉 {target_pair} at 0.5% dip, waiting for CURL..."
                                    break 
                                else:
                                    # Price ticked UP! Confirm buy.
                                    buy_signal = True
                                    buy_reason = f"✅ CURL: Sniped {threshold*100}% Dip on Bounce"
                                    buy_type = "DIP_BUY"
                                    break
                            
                            else:
                                # For deeper dips (1.7%+), just buy (Panic Oversold)
                                buy_signal = True
                                buy_reason = f"📉 FALL: Sniped {threshold*100}% Dip"
                                buy_type = "DIP_BUY"
                                break

                # 🚫 BTC VETO OVERRIDE
                if buy_signal:
                    if veto_active and target_pair != "BTCUSDT":
                        buy_signal = False
                        log_msg = f"🛡️ BTC VETO BLOCKED: Market Unsafe"
                        log_type = "VETO_BLOCK"

                # ✅ EXECUTE BUY
                if buy_signal:
                    bet_amount = SIMULATED_WALLET["available"] * BET_PERCENTAGE
                    if bet_amount >= 10:
                        SIMULATED_WALLET["available"] -= bet_amount
                        SIMULATED_WALLET["in_positions"] += bet_amount
                        
                        active_positions[target_pair] = {
                            "price": current_price,
                            "size": bet_amount,
                            "type": buy_type
                        }
                        
                        save_wallet()
                        save_nexus_log(target_pair, "BUY", buy_type, current_price, buy_reason)
                        log_msg = f"⚡ ORDER EXECUTED: {buy_reason}"
                        log_type = "EXECUTION"

            # --- 📡 BROADCAST UPDATE ---
            active_trades_list = []
            for sym, entry in active_positions.items():
                p_now = price_history[sym][-1] if len(price_history[sym]) > 0 else entry["price"]
                pnl = (p_now - entry["price"]) / entry["price"] * 100
                active_trades_list.append({"symbol": sym, "pnl": round(pnl, 2), "type": entry.get("type", "UNK")})

            wallet_payload = {
                "total": round(SIMULATED_WALLET["total"], 2),
                "available": round(SIMULATED_WALLET["available"], 2),
                "inPositions": round(SIMULATED_WALLET["in_positions"], 2),
                "positions": active_trades_list
            }
            
            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": current_price,
                "type": log_type,
                "message": log_msg,
                "veto_status": veto_status,  # Sent to Frontend
                "wallet": wallet_payload 
            }
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1.0) 

    except WebSocketDisconnect:
        print("❌ Client Disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(1)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
