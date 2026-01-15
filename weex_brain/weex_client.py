import time
import hmac
import hashlib
import base64
import requests
import json
import os

class WeexClient:
    def __init__(self):
        # On Render, we use the standard API URL
        self.base_url = "https://api.weex.com"
        
        # Keys (Hardcoded as you requested)
        self.key = "weex_d6eac84d6220ac893cd2fb10aadcf493"
        self.secret = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
        self.passphrase = "weex0717289"

        # Standard Headers
        self.common_headers = {
            "Content-Type": "application/json",
            "User-Agent": "Nexus-7/Render"
        }

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

    def get_market_price(self, symbol):
        # Use Binance for fast price checking
        clean_sym = symbol.replace("_UMCBL", "").replace("USDT", "") + "USDT"
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean_sym}"
            res = requests.get(url, timeout=2)
            if res.status_code == 200:
                return float(res.json()["price"])
        except:
            pass
        return 0.0

    def place_order(self, symbol, side, size):
        endpoint = "/api/v1/order/submit"
        
        # Ensure correct symbol format for futures
        if "_UMCBL" not in symbol and "USDT" in symbol:
            symbol += "_UMCBL"

        params = {
            "symbol": symbol,
            "side": side.lower(),
            "type": "market",
            "size": str(size),
            "marginMode": "cross",
            "leverage": "10"
        }
        body = json.dumps(params)
        timestamp, sign = self._get_signature("POST", endpoint, body)
        
        headers = self.common_headers.copy()
        headers.update({
            "ACCESS-KEY": self.key,
            "ACCESS-SIGN": sign,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-PASSPHRASE": self.passphrase
        })
        
        print(f"🚀 SENDING ORDER: {side.upper()} {symbol} (Size: {size})...")
        
        try:
            response = requests.post(self.base_url + endpoint, headers=headers, data=body, timeout=10)
            print(f"📥 WEEX SAYS: {response.text}")
            return response.json()
        except Exception as e:
            print(f"❌ CONNECTION ERROR: {e}")
            return {"error": str(e)}

weex_bot = WeexClient()
