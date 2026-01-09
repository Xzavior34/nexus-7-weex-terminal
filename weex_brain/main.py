import uvicorn
import asyncio
import json
import csv
import os
import random
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

# --- 🎯 SNIPER CONFIGURATION (WINNING SETTINGS) ---
LEVERAGE = 10            # 10x (Safe but powerful)
STOP_LOSS_PCT = 0.02     # SAFETY: Sell if price drops 2%
BET_PERCENTAGE = 0.15    # COMPOUNDING: Bet 15% of wallet (Exponential Growth)

HISTORY_SIZE = 30
LOG_FILE = "ai_trading_logs.csv"
WALLET_FILE = "wallet_data.json" 

price_history = {pair: deque(maxlen=HISTORY_SIZE) for pair in ALLOWED_PAIRS}
active_positions = {}    

app = FastAPI()

@app.api_route("/", methods=["GET", "HEAD"])
def health_check():
    return {"status": "active", "system": "Nexus-7 Sniper Mode", "version": "3.1-CHAMPION"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Initialize Wallet
SIMULATED_WALLET = load_wallet()

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
    print(f"⚡ NEXUS-7: SNIPER MODE (Lev: {LEVERAGE}x | Bet: {BET_PERCENTAGE*100}%)")
    
    try:
        while True:
            # 1. BTC VETO CHECK
            btc_price = await asyncio.to_thread(weex_bot.get_market_price, "BTCUSDT")
            if btc_price:
                price_history["BTCUSDT"].append(btc_price)

            is_btc_bearish = False
            if len(price_history["BTCUSDT"]) >= 10:
                btc_list = list(price_history["BTCUSDT"])
                btc_avg = sum(btc_list) / len(btc_list)
                if btc_list[-1] < btc_avg:
                    is_btc_bearish = True

            # 2. SCAN TARGET
            target_pair = random.choice(ALLOWED_PAIRS)
            current_price = await asyncio.to_thread(weex_bot.get_market_price, target_pair)

            if current_price is None:
                await asyncio.sleep(1.0)
                continue

            price_history[target_pair].append(current_price)
            history_list = list(price_history[target_pair])
            
            log_type = "AI_SCAN"
            log_msg = f"Scanning {target_pair}..."
            
            # --- 🛡️ 1. CHECK ACTIVE POSITIONS ---
            if target_pair in active_positions:
                entry_data = active_positions[target_pair]
                entry_price = entry_data["price"]
                position_size = entry_data["size"] # Use the ACTUAL bet size we made

                pct_change = (current_price - entry_price) / entry_price
                
                # TREND CHECK
                trend_is_down = False
                if len(history_list) >= 5:
                    short_term_avg = sum(history_list[-5:]) / 5
                    if current_price < short_term_avg:
                        trend_is_down = True

                # UPDATE PNL
                pnl_dollar = position_size * pct_change * LEVERAGE
                
                SIMULATED_WALLET["unrealized_pnl"] = pnl_dollar
                SIMULATED_WALLET["total"] = SIMULATED_WALLET["available"] + SIMULATED_WALLET["in_positions"] + pnl_dollar

                should_sell = False
                sell_reason = ""

                # STOP LOSS (-2%)
                if pct_change <= -STOP_LOSS_PCT:
                    should_sell = True
                    sell_reason = "Stop Loss Triggered"
                    log_type = "RISK_CHECK"
                    log_msg = f"🛡️ STOP LOSS: Sold {target_pair} (Saved Capital)"

                # JACKPOT (+6%)
                elif pct_change >= 0.06:
                    should_sell = True
                    sell_reason = "Jackpot Target Hit (6%)"
                    log_type = "OPPORTUNITY"
                    log_msg = f"💎 JACKPOT: Sold {target_pair} at +6% (+{pct_change*100:.2f}%)"

                # PROFIT (+4%) - Smart Exit
                elif pct_change >= 0.04:
                    if trend_is_down:
                        should_sell = True
                        sell_reason = "Secure 4% (Trend Weakening)"
                        log_type = "OPPORTUNITY"
                        log_msg = f"💰 SECURED: Sold {target_pair} at +4% (Trend Weakening)"
                    else:
                        log_msg = f"🚀 Holding {target_pair} (+{pct_change*100:.2f}%) - Aiming for 6%!"

                # PROFIT (+2%) - Smart Exit
                elif pct_change >= 0.02:
                    if trend_is_down:
                        should_sell = True
                        sell_reason = "Secure 2% (Trend Weakening)"
                        log_type = "OPPORTUNITY"
                        log_msg = f"💰 SECURED: Sold {target_pair} at +2% (Trend Weakening)"
                    else:
                        log_msg = f"🚀 Holding {target_pair} (+{pct_change*100:.2f}%) - Aiming for 4%!"

                else:
                    log_msg = f"Holding {target_pair} (PnL: {pct_change*100:.2f}%)"

                # EXECUTE SELL
                if should_sell:
                    SIMULATED_WALLET["available"] += (position_size + pnl_dollar)
                    SIMULATED_WALLET["in_positions"] -= position_size
                    del active_positions[target_pair]
                    
                    save_wallet()
                    save_ai_log(target_pair, "SELL", 100, current_price, sell_reason)
            
            # --- 2. LOOK FOR NEW TRADES ---
            elif len(history_list) >= 20:
                sma = sum(history_list) / len(history_list)
                deviation = (current_price - sma) / sma
                
                if deviation > 0.0015: 
                    if is_btc_bearish and target_pair != "BTCUSDT":
                         log_type = "AI_SCAN"
                         log_msg = f"🛡️ SMART GUARD: Skipped {target_pair} Buy (BTC is Weak)"
                    else:
                        # 💰 COMPOUNDING LOGIC (15% of Wallet)
                        bet_amount = SIMULATED_WALLET["available"] * BET_PERCENTAGE
                        
                        if bet_amount >= 10: 
                            SIMULATED_WALLET["available"] -= bet_amount
                            SIMULATED_WALLET["in_positions"] += bet_amount
                            
                            log_type = "EXECUTION"
                            log_msg = f"🚀 BUY SIGNAL: {target_pair} @ {current_price} (Bet: ${bet_amount:.2f})"
                            
                            active_positions[target_pair] = {
                                "price": current_price,
                                "size": bet_amount
                            }
                            
                            save_wallet()
                            save_ai_log(target_pair, "BUY", 95, current_price, "Trend Confirmed")
            
            # --- 3. SEND WALLET UPDATE ---
            active_trades_list = []
            for sym, entry in active_positions.items():
                entry_price = entry["price"]
                last_price = price_history[sym][-1] if len(price_history[sym]) > 0 else entry_price
                pnl_pct = (last_price - entry_price) / entry_price * 100
                active_trades_list.append({
                    "symbol": sym,
                    "pnl": round(pnl_pct, 2)
                })

            wallet_payload = {
                "total": round(SIMULATED_WALLET["total"], 2),
                "available": round(SIMULATED_WALLET["available"], 2),
                "inPositions": round(SIMULATED_WALLET["in_positions"], 2),
                "unrealizedPnL": round(SIMULATED_WALLET["unrealized_pnl"], 2),
                "pnlPercent": round((SIMULATED_WALLET["total"] - 1000) / 1000 * 100, 2),
                "positions": active_trades_list 
            }
            
            data = {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": target_pair,
                "price": current_price,
                "type": log_type,
                "message": log_msg,
                "wallet": wallet_payload 
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
