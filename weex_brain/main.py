"""
PROJECT: NEXUS-7 (OFFICIAL COMPLIANCE VERSION)
TARGET: api-contract.weex.com (As per Hackathon Docs)
STATUS: LIVE TRADING
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

# --- 1. CONFIGURATION (FROM YOUR SCREENSHOTS) ---
LIVE_TRADING = True
API_URL = "https://api-contract.weex.com"  # <--- The Correct URL

# --- 2. YOUR KEYS (HARDCODED) ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

# --- 3. THE CLIENT ENGINE ---
class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        self.headers = {"Content-Type": "application/json", "User-Agent": "Nexus-7/V2"}

    def _sign(self, method, endpoint, body=""):
        ts = str(int(time.time() * 1000))
        msg = f"{ts}{method.upper()}{endpoint}{body}"
        sign = base64.b64encode(hmac.new(
            SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256
        ).digest()).decode("utf-8")
        return {
            "ACCESS-KEY": API_KEY,
            "ACCESS-SIGN": sign,
            "ACCESS-PASSPHRASE": PASSPHRASE,
            "ACCESS-TIMESTAMP": ts,
            "locale": "en-US"
        }

    # 1. GET PRICE (To know what to buy)
    def get_price(self, symbol="BTCUSDT"):
        try:
            # We use Binance for speed, Weex for execution
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}"
            res = requests.get(url, timeout=2)
            if res.status_code == 200: return float(res.json()["price"])
        except: pass
        return 0.0

    # 2. PLACE ORDER (Using the /capi/v2/ endpoint from screenshots)
    def place_order(self, symbol, side, size):
        endpoint = "/capi/v2/order/placeOrder"
        
        # Format Symbol (must be lower case for this endpoint usually, e.g. cmt_btcusdt)
        # But we will try the standard format first: "cmt_btcusdt" is often required for Sandbox
        # Let's stick to standard "BTCUSDT" first, if fails we try "cmt_btcusdt"
        
        # Random Client OID (Required by your screenshot)
        client_oid = str(int(time.time())) + str(random.randint(100,999))
        
        body_dict = {
            "symbol": symbol.lower(), # api-contract often wants lowercase
            "client_oid": client_oid,
            "size": str(size),
            "type": "1",         # 1 = Market Order (Instant)
            "order_type": "0",   # 0 = Limit/Market
            "match_price": "1",  # 1 = Market Price
            "price": "0",        # Ignored for market orders
            "side": "1" if side.lower() == "buy" else "-1" # 1=Open Long, -1=Open Short
        }
        
        body = json.dumps(body_dict)
        headers = self.headers.copy()
        auth = self._sign("POST", endpoint, body)
        headers.update(auth)
        
        print(f"🚀 EXECUTING {side} {symbol} (OID: {client_oid})...")
        try:
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            print(f"📥 WEEX REPLIED: {resp.text}")
            return resp.json()
        except Exception as e:
            print(f"❌ ERROR: {e}")
            return {}

bot = WeexClient()

# --- 4. THE APP LOGIC ---
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SIM_WALLET = {"total": 1000.0, "available": 1000.0}

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 STARTING...")
    
    # IMMEDIATE TRADE ON STARTUP (To get Proof)
    if LIVE_TRADING:
        print("⚡ ATTEMPTING IMMEDIATE PROOF TRADE...")
        # Trying a tiny size
        await asyncio.to_thread(bot.place_order, "btcusdt", "buy", "0.01")

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("⚡ DASHBOARD CONNECTED")
    try:
        while True:
            price = bot.get_price("BTCUSDT")
            await ws.send_json({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": "BTCUSDT", "price": price, "message": "System Active",
                "wallet": SIM_WALLET
            })
            await asyncio.sleep(2)
    except: pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
