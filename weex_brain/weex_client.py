import time
import hmac
import hashlib
import base64
import requests
import json
import logging

# --- YOUR LIVE HACKATHON CREDENTIALS ---
WEEX_CONFIG = {
    "API_KEY": "weex_d6eac84d6220ac893cd2fb10aadcf493",
    "SECRET_KEY": "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b",
    "PASSPHRASE": "weex0717289",
    "BASE_URL": "https://api-contract.weex.com"
}

class WeexClient:
    def __init__(self):
        self.key = WEEX_CONFIG["API_KEY"]
        self.secret = WEEX_CONFIG["SECRET_KEY"]
        self.passphrase = WEEX_CONFIG["PASSPHRASE"]
        self.base_url = WEEX_CONFIG["BASE_URL"]
        print("✅ [SYSTEM] WEEX Client Connection Established")

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

    def _send_request(self, method, endpoint, params=None):
        url = self.base_url + endpoint
        body = ""
        if method == "POST" and params:
            body = json.dumps(params)
        elif method == "GET" and params:
            endpoint += "?" + "&".join([f"{k}={v}" for k, v in params.items()])
        
        timestamp, sign = self._get_signature(method, endpoint, body)
        
        headers = {
            "ACCESS-KEY": self.key,
            "ACCESS-SIGN": sign,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-PASSPHRASE": self.passphrase,
            "Content-Type": "application/json"
        }
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=5)
            else:
                response = requests.post(url, headers=headers, data=body, timeout=5)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    # --- ACTIONS ---
    def get_wallet_balance(self):
        """Fetches live balance to prove connectivity"""
        return self._send_request("GET", "/api/v1/account/assets")

    def place_test_order(self, symbol="BTCUSDT_UMCBL", side="open_long"):
        """Places a tiny order to prove execution capability"""
        params = {
            "symbol": symbol,
            "side": side,
            "type": "limit", # Limit order so we don't accidentally fill
            "size": "1",
            "price": "10000", # Price far away from market
            "timeInForce": "GTC"
        }
        return self._send_request("POST", "/api/v1/order/submit", params)

# Instance for main.py to use
weex_bot = WeexClient()
