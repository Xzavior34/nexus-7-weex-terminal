"""
PROJECT: NEXUS-7 (INSTANT TRIGGER VERSION)
DEPLOYMENT: RENDER CLOUD
STATUS: LIVE - FORCED TRADING
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
from datetime import datetime
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# --- 1. CONFIGURATION ---
LIVE_TRADING = True         # ⚠️ REAL MONEY MODE
API_URL = "https://api.weex.com"

# --- 2. YOUR KEYS (HARDCODED) ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

# --- 3. THE CLIENT ENGINE ---
class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        self.headers = {"Content-Type": "application/json", "User-Agent": "Nexus-7/Render"}

    def _sign(self, method, endpoint, body=""):
        ts = str(int(time.time() * 1000))
        msg = f"{ts}{method}{endpoint}{body}"
        sign = base64.b64encode(hmac.new(
            SECRET.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256
        ).digest()).decode("utf-8")
        return {"ACCESS-KEY": API_KEY, "ACCESS-SIGN": sign, "ACCESS-PASSPHRASE": PASSPHRASE, "ACCESS-TIMESTAMP": ts}

    def get_price(self, symbol):
        try:
            clean = symbol.replace("USDT", "") + "USDT"
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean}"
            res = requests.get(url, timeout=2)
            if res.status_code == 200: return float(res.json()["price"])
        except: pass
        return 0.0

    def place_order(self, symbol, side, qty):
        endpoint = "/api/v1/order/submit"
        if "_UMCBL" not in symbol and "USDT" in symbol: symbol += "_UMCBL"
        
        body = json.dumps({
            "symbol": symbol, "side": side.lower(), "type": "market",
            "size": str(qty), "marginMode": "cross", "leverage": "10"
        })
        
        auth = self._sign("POST", endpoint, body)
        headers = {**self.headers, **auth}
        
        print(f"🚀 FORCING {side.upper()} {symbol} (Size: {qty})...")
        try:
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            print(f"📥 WEEX: {resp.text}")
            return resp.json()
        except Exception as e:
            print(f"❌ ERROR: {e}")
            return {}

bot = WeexClient()

# --- 4. THE APP LOGIC ---
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# FAKE WALLET FOR UI DISPLAY (So dashboard looks alive)
SIM_WALLET = {"total": 1000.0, "available": 1000.0, "in_pos": 0.0}

@app.on_event("startup")
async def startup_check():
    print("⚡ NEXUS-7 STARTING...")
    print("📡 CHECKING CONNECTION...")
    price = bot.get_price("BTCUSDT")
    print(f"✅ MARKET LIVE: BTC {price}")

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("⚡ DASHBOARD CONNECTED")
    
    # ⚠️ STATE TRACKER TO PREVENT INFINITE BUYING
    has_traded = False 
    
    try:
        while True:
            btc_price = bot.get_price("BTCUSDT")
            
            msg_type = "SCAN"
            msg_text = "Scanning..."

            # --- THE INSTANT TRIGGER ---
            # If we haven't traded yet, DO IT NOW.
            if not has_traded and btc_price > 0 and LIVE_TRADING:
                print("⚡ INSTANT TRIGGER ACTIVATED!")
                
                # BUY 0.001 BTC (Approx $90 USD value, check your wallet balance!)
                # If wallet is small, change to 'TRXUSDT' or 'DOGEUSDT' for cheaper testing.
                order = await asyncio.to_thread(bot.place_order, "BTCUSDT", "buy", 0.001)
                
                if "orderId" in str(order) or "success" in str(order):
                    msg_type = "BUY"
                    msg_text = "⚡ INSTANT ORDER EXECUTED!"
                    has_traded = True # Stop from buying again
                else:
                    msg_text = f"⚠️ Order Error: {order.get('msg', 'Unknown')}"

            # Update UI
            await ws.send_json({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "symbol": "BTCUSDT",
                "price": btc_price,
                "type": msg_type,
                "message": msg_text,
                "wallet": SIM_WALLET # Keep UI happy
            })
            await asyncio.sleep(2) # Wait 2 seconds before next loop
    except: pass

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
