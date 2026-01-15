"""
PROJECT: NEXUS-7 (REAL MONEY / NO SIMULATION)
TARGET: api-contract.weex.com
STATUS: LIVE WALLET CONNECTION
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

# --- 2. YOUR KEYS ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Nexus-7/RealMoney",
            "locale": "en-US"
        }

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
            "ACCESS-TIMESTAMP": ts
        }

    # 1. GET PRICE
    def get_price(self, symbol="BTCUSDT"):
        try:
            clean = symbol.replace("cmt_", "").replace("usdt", "").upper() + "USDT"
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean}"
            r = requests.get(url, timeout=2)
            if r.status_code == 200: return float(r.json()["price"])
        except: pass
        return 0.0

    # 2. GET REAL WALLET
    def get_wallet(self):
        endpoint = "/capi/v2/account/assets"
        auth = self._sign("GET", endpoint, "")
        headers = {**self.headers, **auth}
        
        try:
            r = requests.get(self.base_url + endpoint, headers=headers, timeout=5)
            # If successful, return the REAL data. If fail, return empty dict.
            if r.status_code == 200: 
                return r.json()
            else:
                print(f"⚠️ WALLET ERROR: {r.text}")
                return {"error": "Failed to fetch wallet"}
        except Exception as e:
            return {"error": str(e)}

    # 3. PLACE REAL ORDER
    def place_order(self, symbol, side, size):
        endpoint = "/capi/v2/order/placeOrder"
        oid = f"nex{int(time.time())}"
        
        payload = {
            "symbol": symbol.lower(),
            "client_oid": oid,
            "size": str(size),
            "type": "1",         # Market Order
            "order_type": "0",
            "match_price": "1",
            "price": "0",
            "side": "1" if side == "buy" else "-1"
        }
        
        body = json.dumps(payload)
        auth = self._sign("POST", endpoint, body)
        headers = {**self.headers, **auth}
        
        print(f"🚀 EXECUTING REAL TRADE: {side} {symbol}...")
        try:
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            print(f"📥 WEEX REPLY: {resp.text}")
            return resp.json()
        except Exception as e:
            print(f"❌ ERROR: {e}")
            return {"msg": str(e)}

bot = WeexClient()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 LIVE (REAL MONEY MODE)...")
    
    # IMMEDIATE TRADE ON STARTUP
    # This will SPEND MONEY. If you have 0 balance, it will return "Insufficient Balance".
    # That error message IS your proof of connection.
    if LIVE_TRADING:
        print("⚡ ATTEMPTING LIVE TRADE...")
        await asyncio.to_thread(bot.place_order, "cmt_btcusdt", "buy", "1")

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("⚡ DASHBOARD CONNECTED")
    
    try:
        while True:
            # 1. Get Live Price
            btc_price = bot.get_price("BTCUSDT")
            
            # 2. Get LIVE Wallet (No Simulation)
            real_wallet = await asyncio.to_thread(bot.get_wallet)
            
            # 3. Ladder Visualization (Visual only, data is real)
            ladder = []
            if btc_price > 0:
                ladder = [
                    {"price": btc_price * 1.01, "vol": random.randint(10,50), "type": "ask"},
                    {"price": btc_price, "vol": "---", "type": "curr"},
                    {"price": btc_price * 0.99, "vol": random.randint(10,50), "type": "bid"},
                ]

            await ws.send_json({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": "BTCUSDT",
                "price": btc_price,
                "ladder": ladder,
                "wallet": real_wallet, # <--- THIS IS REAL DATA FROM WEEX
                "message": "System Active - Real Money Mode"
            })
            await asyncio.sleep(2)
    except: pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
