"""
PROJECT: NEXUS-7 (IP FINDER & WHITELIST FIX)
STATUS: LIVE TRADING + IP DETECTION
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
LIVE_TRADING = True
API_URL = "https://api-contract.weex.com"
SYMBOL = "cmt_btcusdt"

# --- 2. KEYS (HARDCODED) ---
API_KEY = "weex_d6eac84d6220ac893cd2fb10aadcf493"
SECRET = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
PASSPHRASE = "weex0717289"

class WeexClient:
    def __init__(self):
        self.base_url = API_URL
        # Using CHROME headers to look like a real browser (Helps avoid some blocks)
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

    # 1. GET PRICE
    def get_price(self):
        try:
            r = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", timeout=2)
            return float(r.json()["price"]) if r.status_code == 200 else 90000.0
        except: return 90000.0

    # 2. GET WALLET (Crash Proof)
    def get_wallet_safe(self):
        endpoint = "/capi/v2/account/assets"
        safe_data = {"total": 0.0, "available": 0.0, "in_pos": 0.0, "unrealized_pnl": 0.0}

        try:
            auth = self._sign("GET", endpoint, "")
            headers = {**self.headers, **auth}
            r = requests.get(self.base_url + endpoint, headers=headers, timeout=5)
            
            if r.status_code == 521:
                print("⛔ ERROR 521: IP BLOCKED. Check the IP printed at startup!")
            
            if r.status_code == 200 and r.text.strip():
                data = r.json().get("data", {})
                if isinstance(data, list) and len(data) > 0: data = data[0]
                safe_data["total"] = float(data.get("equity", 0))
                safe_data["available"] = float(data.get("available", 0))
        except: pass
        return safe_data

    # 3. PLACE ORDER
    def place_order(self, side="buy"):
        endpoint = "/capi/v2/order/placeOrder"
        oid = f"nex{int(time.time())}"
        payload = {
            "symbol": SYMBOL, "client_oid": oid, "size": "1", "type": "1",
            "order_type": "0", "match_price": "1", "price": "0",
            "side": "1" if side == "buy" else "-1"
        }
        try:
            body = json.dumps(payload)
            auth = self._sign("POST", endpoint, body)
            headers = {**self.headers, **auth}
            print(f"🚀 EXECUTING {side.upper()} {SYMBOL}...")
            resp = requests.post(self.base_url + endpoint, data=body, headers=headers, timeout=5)
            print(f"📥 WEEX SAYS: {resp.text}")
            return resp.json()
        except Exception as e:
            return {"msg": str(e)}

bot = WeexClient()
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_check():
    print("\n" + "="*40)
    print("⚡ NEXUS-7 DIAGNOSTICS")
    print("="*40)
    
    # --- 🌍 IP ADDRESS FINDER (CRITICAL) ---
    try:
        ip = requests.get("https://api.ipify.org?format=text", timeout=5).text
        print(f"🌍 YOUR RENDER IP ADDRESS: {ip}")
        print("⚠️ COPY THIS IP AND SEND IT TO WEEX SUPPORT IF YOU GET 521 ERRORS!")
    except:
        print("❌ COULD NOT FETCH IP ADDRESS")
    
    print("="*40 + "\n")

    if LIVE_TRADING:
        asyncio.create_task(asyncio.to_thread(bot.place_order, "buy"))

@app.websocket("/ws/stream")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    while True:
        price = bot.get_price()
        wallet = await asyncio.to_thread(bot.get_wallet_safe)
        await ws.send_json({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "symbol": "BTCUSDT", "price": price, "wallet": wallet,
            "message": "System Active"
        })
        await asyncio.sleep(2)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
