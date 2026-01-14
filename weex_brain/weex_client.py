import os
import time
import hmac
import hashlib
import base64
import requests
import json
import random

# --- WEEX CONFIG (SECURE) ---
# Now pulls from Render Environment Variables. Safe to commit to GitHub.
WEEX_CONFIG = {
    "API_KEY": os.environ.get("WEEX_API_KEY", ""),
    "SECRET_KEY": os.environ.get("WEEX_API_SECRET", ""),
    "PASSPHRASE": os.environ.get("WEEX_API_PASSPHRASE", ""),
    "BASE_URL": "https://api-contract.weex.com"
}

class WeexClient:
    def __init__(self):
        self.key = WEEX_CONFIG["API_KEY"]
        self.secret = WEEX_CONFIG["SECRET_KEY"]
        self.passphrase = WEEX_CONFIG["PASSPHRASE"]
        self.base_url = WEEX_CONFIG["BASE_URL"]
        # Browser-like headers to avoid being blocked
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json"
        }

    # --- THE TANK: MULTI-SOURCE PRICE FETCHER ---
    def get_market_price(self, symbol):
        clean_sym = symbol.replace("_UMCBL", "").upper()
        base_coin = clean_sym.replace("USDT", "")
        
        # SOURCE 1: BINANCE
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean_sym}"
            res = requests.get(url, headers=self.headers, timeout=2)
            if res.status_code == 200: return float(res.json()["price"])
        except: pass

        # SOURCE 2: COINBASE
        try:
            url = f"https://api.coinbase.com/v2/prices/{base_coin}-USD/spot"
            res = requests.get(url, headers=self.headers, timeout=2)
            if res.status_code == 200: return float(res.json()["data"]["amount"])
        except: pass

        # SOURCE 3: OKX
        try:
            url = f"https://www.okx.com/api/v5/market/ticker?instId={base_coin}-USDT"
            res = requests.get(url, headers=self.headers, timeout=2)
            if res.status_code == 200: return float(res.json()["data"][0]["last"])
        except: pass

        return None

    # --- AUTHENTICATION HELPER ---
    def _get_signature(self, method, request_path, body=""):
        timestamp = str(int(time.time() * 1000))
        message = timestamp + method.upper() + request_path + body
        signature = hmac.new(
            self.secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        sign_b64 = base64.b64encode(signature).decode('utf-8')
        return timestamp, sign_b64

    # --- 🚨 OFFICIAL HACKATHON COMPLIANCE LOGGING 🚨 ---
    def upload_ai_log(self, symbol, action, logic, risk_score):
        """
        Streams AI decisions to WEEX servers in real-time.
        Endpoint: /capi/v2/order/uploadAiLog
        """
        endpoint = "/capi/v2/order/uploadAiLog"
        url = self.base_url + endpoint
        
        # 1. Build Payload
        payload = {
            "orderId": None,
            "stage": "Decision Making",
            "model": "Nexus-7-Heuristic-v1",
            "input": {
                "symbol": symbol,
                "strategy": "Momentum Scalp",
                "parameters": "Threshold: 0.3%"
            },
            "output": {
                "action": action,
                "risk_score": risk_score
            },
            "explanation": logic
        }
        body_json = json.dumps(payload)
        
        # 2. Generate Signature
        timestamp, sign = self._get_signature("POST", endpoint, body_json)

        # 3. Send Request
        headers = {
            "Content-Type": "application/json",
            "ACCESS-KEY": self.key,
            "ACCESS-SIGN": sign,
            "ACCESS-PASSPHRASE": self.passphrase,
            "ACCESS-TIMESTAMP": timestamp,
            "locale": "en-US"
        }

        try:
            response = requests.post(url, data=body_json, headers=headers, timeout=5)
            if response.status_code == 200:
                print(f"✅ AI LOG SENT: {action} on {symbol}")
                return True
            else:
                print(f"⚠️ LOG FAILED ({response.status_code}): {response.text}")
                return False
        except Exception as e:
            print(f"⚠️ LOG ERROR: {e}")
            return False

    # --- TRADING EXECUTION ---
    def place_order(self, symbol, side, size):
        params = {
            "symbol": symbol + "_UMCBL",
            "side": side,
            "type": "market",
            "size": str(size),
            "marginMode": "cross"
        }
        endpoint = "/api/v1/order/submit"
        body = json.dumps(params)
        timestamp, sign = self._get_signature("POST", endpoint, body)
        
        headers = {
            "ACCESS-KEY": self.key,
            "ACCESS-SIGN": sign,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-PASSPHRASE": self.passphrase,
            "Content-Type": "application/json"
        }
        try:
            response = requests.post(self.base_url + endpoint, headers=headers, data=body, timeout=5)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

weex_bot = WeexClient()
