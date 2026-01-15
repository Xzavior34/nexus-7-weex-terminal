"""
PROJECT: NEXUS-7 (OFFICIAL COMPLIANCE VERSION)
TARGET: api-contract.weex.com
STATUS: LIVE TRADING + CRASH PROTECTION
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

# --- 1. CONFIGURATION (STRICTLY FROM DOCS) ---
LIVE_TRADING = True
API_URL = "https://api-contract.weex.com" #

# --- 2. YOUR KEYS ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Nexus-7/Compete",
            "locale": "en-US" # REQUIRED HEADER
        }

    def _sign(self, method, endpoint, body=""):
        ts = str(int(time.time() * 1000))
        # Doc requires: timestamp + method + path + body
        msg = f"{ts}{method.upper()}{endpoint}{body}"
        sign = base64.b64encode(hmac.new(
            SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256
        ).digest()).decode("utf-8")
        return {
            "ACCESS-KEY": API_KEY,
            "ACCESS-SIGN": sign,
            "ACCESS-PASSPHRASE": PASSPHRASE,
            "ACCESS-TIMESTAMP": ts
        }

    # 1. GET PRICE (Safe Fallback)
    def get_price(self, symbol="BTCUSDT"):
        try:
            # We use Binance for valid price data to feed the dashboard
            clean = symbol.replace("cmt_", "").replace("usdt", "").upper() + "USDT"
            r = requests.get(f"https://api.binance.com/api/v3/ticker/price?symbol={clean}", timeout=2)
            if r.status_code == 200: return float(r.json()["price"])
        except: pass
        return 0.0

    # 2. GET WALLET (Crash-Proof for Frontend)
    def get_wallet_safe(self):
        endpoint = "/capi/v2/account/assets"
        
        # Default "Safe" Data to keep Frontend Green
        safe_data = {
            "total": 0.0, "available": 0.0,
            "in_pos": 0.0, "unrealized_pnl": 0.0
        }

        try:
            auth = self._sign("GET", endpoint, "")
            headers = {**self.headers, **auth}
            r = requests.get(self.base_url + endpoint, headers=headers, timeout=5)

            if r.status_code == 200 and r.text.strip():
                data = r.json().get("data", {})
                # If API returns a list, take the first item
                if isinstance(data, list) and len(data) > 0: data = data[0]

                # Map to Frontend fields
                safe_data["total"] = float(data.get("equity", 0))
                safe_data["available"] = float(data.get("available", 0))
                safe_data["in_pos"] = float(data.get("frozen", 0))
                safe_data["unrealized_pnl"] = float(data.get("unrealizePnl", 0))
            else:
                print(f"⚠️ WALLET WARNING: {r.text[:50]}...")
        except Exception as e:
            print(f"⚠️ WALLET FETCH ERROR: {e}")
            
        return safe_data

    # 3. PLACE ORDER (STRICT COMPLIANCE MODE)
    def place_order(self, symbol="cmt_btcusdt", side="buy", size="0.0001"):
        endpoint = "/capi/v2/order/placeOrder"
        
        # Unique Client ID (Required)
        oid = f"nex{int(time.time())}"
        
        # EXACT PAYLOAD STRUCTURE FROM DOCS
        payload = {
            "symbol": symbol,           # Must be "cmt_btcusdt"
            "client_oid": oid,          # Must be unique
            "size": str(size),          # Must be string
            "type": "1",                # 1 = Market
            "order_type": "0",          # 0 = Limit/Market
            "match_price": "1",         # 1 = Market Price
            "price": "0",               # Ignored for market
            "side": "1" if side == "buy" else "-1"
        }
        
        try:
            body = json.dumps(payload)
            auth = self._sign("POST", endpoint, body)
            headers = {**self.headers, **auth}
            
            print(f"🚀 EXECUTING OFFICIAL TRADE: {side} {symbol}...")
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            
            # RAW LOGGING (To see the truth)
            print(f"📥 WEEX REPLY: {resp.text}")
            
            if not resp.text.strip(): return {"msg": "Empty Response"}
            return resp.json()
        except Exception as e:
            print(f"❌ ORDER ERROR: {e}")
            return {"msg": str(e)}

bot = WeexClient()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 STARTING (COMPLIANCE MODE)...")
    if LIVE_TRADING:
        # REQUIRED TEST TRADE: 10 USDT value roughly
        # 0.0001 BTC @ 90k = $9. This meets the test requirement.
        asyncio.create_task(asyncio.to_thread(bot.place_order, "cmt_btcusdt", "buy", "0.0001"))

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("⚡ DASHBOARD CONNECTED")
    try:
        while True:
            # 1. Get Data
            price = bot.get_price("BTCUSDT")
            wallet = await asyncio.to_thread(bot.get_wallet_safe)

            # 2. Send to Frontend (Valid JSON Always)
            await ws.send_json({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": "BTCUSDT",
                "price": price,
                "wallet": wallet,
                "message": "System Active"
            })
            await asyncio.sleep(2)
    except: pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
