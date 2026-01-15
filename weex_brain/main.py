"""
PROJECT: NEXUS-7 (HYPER-ACTIVE / LOG GENERATOR)
TARGET: api-contract.weex.com
STATUS: FORCED TRADING + DEEP LOGGING
"""
import uvicorn
import asyncio
import json
import os
import time
import hmac
import hashlib
import base64
import requests
import random
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# --- 1. CONFIGURATION ---
LIVE_TRADING = True
API_URL = "https://api-contract.weex.com"
SYMBOL = "cmt_btcusdt" # The one pair to rule them all

# --- 2. KEYS (HARDCODED) ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        # shows Content-Type is needed even for GETs?
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Nexus-7/HyperActive",
            "locale": "en-US"
        }

    def _sign(self, method, endpoint, body=""):
        ts = str(int(time.time() * 1000))
        msg = f"{ts}{method.upper()}{endpoint}{body}"
        sign = base64.b64encode(hmac.new(
            SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256
        ).digest()).decode("utf-8")
        return {
            "ACCESS-KEY": API_KEY, "ACCESS-SIGN": sign,
            "ACCESS-PASSPHRASE": PASSPHRASE, "ACCESS-TIMESTAMP": ts
        }

    # 1. GET PRICE (Binance for speed)
    def get_price(self):
        try:
            r = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", timeout=2)
            return float(r.json()["price"]) if r.status_code == 200 else 90000.0
        except: return 90000.0

    # 2. GET WALLET (With Deep Logging)
    def get_wallet_safe(self):
        endpoint = "/capi/v2/account/assets"
        safe_data = {"total": 0.0, "available": 0.0, "in_pos": 0.0, "unrealized_pnl": 0.0}

        try:
            auth = self._sign("GET", endpoint, "")
            headers = {**self.headers, **auth}
            
            # requires Content-Type even here
            r = requests.get(self.base_url + endpoint, headers=headers, timeout=5)
            
            # LOG THE RAW TRUTH
            if r.status_code != 200:
                print(f"⚠️ WALLET RAW ERROR ({r.status_code}): {r.text}")
            
            if r.status_code == 200 and r.text.strip():
                data = r.json().get("data", {})
                if isinstance(data, list) and len(data) > 0: data = data[0]

                safe_data["total"] = float(data.get("equity", 0))
                safe_data["available"] = float(data.get("available", 0))
                safe_data["in_pos"] = float(data.get("frozen", 0))
                safe_data["unrealized_pnl"] = float(data.get("unrealizePnl", 0))
        except Exception as e:
            print(f"⚠️ WALLET CRASH: {e}")
            
        return safe_data

    # 3. PLACE ORDER (Hyper-Active Mode)
    def place_order(self, side="buy"):
        endpoint = "/capi/v2/order/placeOrder"
        oid = f"nex{int(time.time())}"
        
        # STRICT FORMAT
        payload = {
            "symbol": SYMBOL,
            "client_oid": oid,
            "size": "1",          # Smallest visible size
            "type": "1",          # Market
            "order_type": "0",
            "match_price": "1",
            "price": "0",
            "side": "1" if side == "buy" else "-1"
        }
        
        try:
            body = json.dumps(payload)
            auth = self._sign("POST", endpoint, body)
            headers = {**self.headers, **auth}
            
            print(f"🚀 EXECUTING {side.upper()} {SYMBOL}...")
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            
            # LOG RAW RESPONSE
            print(f"📥 WEEX SAYS: {resp.text}")
            
            if not resp.text.strip(): return {"msg": "Empty Response"}
            return resp.json()
        except Exception as e:
            print(f"❌ ORDER FAIL: {e}")
            return {"msg": str(e)}

bot = WeexClient()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 HYPER-ACTIVE MODE STARTING...")
    if LIVE_TRADING:
        # Instant trade on boot
        asyncio.create_task(asyncio.to_thread(bot.place_order, "buy"))

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("⚡ DASHBOARD CONNECTED")
    
    last_trade_time = time.time()
    
    try:
        while True:
            # 1. Fetch Data
            price = bot.get_price()
            wallet = await asyncio.to_thread(bot.get_wallet_safe)
            
            # 2. HYPER-ACTIVITY LOGIC (Heartbeat Trade)
            # If 60 seconds pass without action, FORCE a trade
            if time.time() - last_trade_time > 60 and LIVE_TRADING:
                print("⏰ HEARTBEAT TRIGGER: Forcing Activity...")
                side = "buy" if random.random() > 0.5 else "sell"
                asyncio.create_task(asyncio.to_thread(bot.place_order, side))
                last_trade_time = time.time()
                msg = f"⚡ AUTO-EXECUTE: {side.upper()}"
            else:
                msg = "Scanning Market..."

            # 3. Send to Dashboard
            await ws.send_json({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": "BTCUSDT",
                "price": price,
                "wallet": wallet,
                "message": msg
            })
            await asyncio.sleep(2)
    except: pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
