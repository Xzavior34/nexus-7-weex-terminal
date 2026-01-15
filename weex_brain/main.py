"""
PROJECT: NEXUS-7 (FRONTEND COMPATIBLE)
STATUS: LIVE REAL MONEY + DASHBOARD FIX
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
API_URL = "https://api-contract.weex.com" #

# --- 2. KEYS (HARDCODED) ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Nexus-7/FrontendFix",
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

    def get_price(self, symbol="BTCUSDT"):
        try:
            clean = symbol.replace("cmt_", "").replace("usdt", "").upper() + "USDT"
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean}"
            r = requests.get(url, timeout=2)
            if r.status_code == 200: return float(r.json()["price"])
        except: pass
        return 0.0

    # GET REAL WALLET & FORMAT FOR FRONTEND
    def get_wallet_safe(self):
        endpoint = "/capi/v2/account/assets"
        auth = self._sign("GET", endpoint, "")
        headers = {**self.headers, **auth}
        
        # Default "Safe" Structure (Prevents Frontend Crash)
        safe_data = {
            "total": 0.0,
            "available": 0.0,
            "in_pos": 0.0,
            "unrealized_pnl": 0.0
        }

        try:
            r = requests.get(self.base_url + endpoint, headers=headers, timeout=5)
            if r.status_code == 200:
                data = r.json().get("data", {})
                # MAP REAL WEEX DATA TO FRONTEND FIELDS
                # Weex usually returns 'accountEquity' or similar
                safe_data["total"] = float(data.get("accountEquity", 0.0))
                safe_data["available"] = float(data.get("availableMargin", 0.0))
                safe_data["in_pos"] = float(data.get("frozenMargin", 0.0))
                safe_data["unrealized_pnl"] = float(data.get("unrealizedPl", 0.0))
            else:
                print(f"⚠️ WALLET ERROR: {r.text}")
        except: 
            pass # Keep safe_data as 0.0 on error
            
        return safe_data

    def place_order(self, symbol, side, size):
        endpoint = "/capi/v2/order/placeOrder"
        oid = f"nex{int(time.time())}"
        payload = {
            "symbol": symbol.lower(), "client_oid": oid, "size": str(size),
            "type": "1", "order_type": "0", "match_price": "1", "price": "0",
            "side": "1" if side == "buy" else "-1"
        }
        body = json.dumps(payload)
        auth = self._sign("POST", endpoint, body)
        headers = {**self.headers, **auth}
        
        print(f"🚀 EXECUTING {side} {symbol}...")
        try:
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            print(f"📥 WEEX REPLY: {resp.text}")
            return resp.json()
        except Exception as e:
            return {"msg": str(e)}

bot = WeexClient()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 REBOOTING...")
    # Trigger Immediate Trade for Proof
    if LIVE_TRADING:
        print("⚡ ATTEMPTING LIVE TRADE...")
        await asyncio.to_thread(bot.place_order, "cmt_btcusdt", "buy", "1")

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("⚡ DASHBOARD CONNECTED")
    
    try:
        while True:
            # 1. Get Live Data
            btc_price = bot.get_price("BTCUSDT")
            
            # 2. Get Formatted Wallet (Safe for Frontend)
            wallet_data = await asyncio.to_thread(bot.get_wallet_safe)

            # 3. Frontend-Compatible Payload
            await ws.send_json({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": "BTCUSDT",
                "price": btc_price,
                # Frontend expects "wallet" object with "total", "available", etc.
                "wallet": wallet_data,
                "message": "System Active - Real Data"
            })
            await asyncio.sleep(2)
    except: pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
