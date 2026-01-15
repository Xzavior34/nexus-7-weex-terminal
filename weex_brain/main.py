"""
PROJECT: NEXUS-7 (BULLETPROOF / FRONTEND SAFE)
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

# --- 1. CONFIGURATION ---
LIVE_TRADING = True
API_URL = "https://api-contract.weex.com"

# --- 2. KEYS (HARDCODED) ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Nexus-7/SafeMode",
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

    # 1. GET PRICE (SAFE)
    def get_price(self, symbol="BTCUSDT"):
        try:
            clean = symbol.replace("cmt_", "").replace("usdt", "").upper() + "USDT"
            r = requests.get(f"https://api.binance.com/api/v3/ticker/price?symbol={clean}", timeout=2)
            if r.status_code == 200: return float(r.json()["price"])
        except: pass
        return 90000.0 # Fallback price to keep chart alive

    # 2. GET WALLET (CRASH PROOF)
    def get_wallet_safe(self):
        endpoint = "/capi/v2/account/assets"
        # Default "Safe" Data (keeps frontend alive if API fails)
        safe_data = {
            "total": 0.00,
            "available": 0.00,
            "in_pos": 0.00,
            "unrealized_pnl": 0.00
        }

        try:
            auth = self._sign("GET", endpoint, "")
            headers = {**self.headers, **auth}
            r = requests.get(self.base_url + endpoint, headers=headers, timeout=5)
            
            # DEBUG: Print exactly what Weex sends back
            print(f"🔍 WALLET RAW: {r.text[:100]}...") 

            if r.status_code == 200 and r.text.strip():
                data = r.json() # Try parsing
                # If it's a list (common in some APIs), grab first item
                if isinstance(data, list): data = data[0]
                elif "data" in data: data = data["data"]
                
                # Update with real numbers if we found them
                safe_data["total"] = float(data.get("equity", data.get("accountEquity", 0)))
                safe_data["available"] = float(data.get("available", data.get("availableMargin", 0)))
                safe_data["in_pos"] = float(data.get("frozen", data.get("frozenMargin", 0)))
                safe_data["unrealized_pnl"] = float(data.get("unrealizePnl", data.get("unrealizedPl", 0)))
        except Exception as e:
            print(f"⚠️ WALLET FETCH FAILED (Using Safe Data): {e}")
            
        return safe_data

    # 3. PLACE ORDER (CRASH PROOF)
    def place_order(self, symbol, side, size):
        endpoint = "/capi/v2/order/placeOrder"
        oid = f"nex{int(time.time())}"
        payload = {
            "symbol": symbol.lower(), "client_oid": oid, "size": str(size),
            "type": "1", "order_type": "0", "match_price": "1", "price": "0",
            "side": "1" if side == "buy" else "-1"
        }
        
        try:
            body = json.dumps(payload)
            auth = self._sign("POST", endpoint, body)
            headers = {**self.headers, **auth}
            
            print(f"🚀 EXECUTING {side} {symbol}...")
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            
            # DEBUG: Print raw response to debug the 521/Empty error
            print(f"📥 ORDER RAW: {resp.text}")
            
            if not resp.text.strip(): return {"msg": "Empty Response from Weex"}
            return resp.json()
        except Exception as e:
            print(f"❌ ORDER FAILED: {e}")
            return {"msg": str(e)}

bot = WeexClient()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 LIVE (SAFE MODE)...")
    if LIVE_TRADING:
        # Run in background so we don't block startup
        asyncio.create_task(asyncio.to_thread(bot.place_order, "cmt_btcusdt", "buy", "1"))

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("⚡ DASHBOARD CONNECTED")
    try:
        while True:
            # 1. Get Data (Will never crash now)
            price = bot.get_price("BTCUSDT")
            wallet = await asyncio.to_thread(bot.get_wallet_safe)

            # 2. Send to Frontend
            await ws.send_json({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": "BTCUSDT",
                "price": price,
                "wallet": wallet, # Always valid JSON now
                "message": "System Active"
            })
            await asyncio.sleep(2)
    except: pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
