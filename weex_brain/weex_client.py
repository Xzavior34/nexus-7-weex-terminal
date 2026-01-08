import time
import hmac
import hashlib
import base64
import requests
import json
import logging

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
        # Use a session for faster repeated connections
        self.session = requests.Session()

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
            if params:
                query_string = "&".join([f"{k}={v}" for k, v in params.items()])
                endpoint += "?" + query_string
        
        timestamp, sign = self._get_signature(method, endpoint, body)
        
        headers = {
            "ACCESS-KEY": self.key,
            "ACCESS-SIGN": sign,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-PASSPHRASE": self.passphrase,
            "Content-Type": "application/json"
        }
        
        try:
            # 🔥 TIMEOUT SET TO 2 SECONDS to prevent freezing
            if method == "GET":
                response = self.session.get(self.base_url + endpoint, headers=headers, timeout=2)
            else:
                response = self.session.post(self.base_url + endpoint, headers=headers, data=body, timeout=2)
            return response.json()
        except Exception as e:
            print(f"⚠️ API TIMEOUT: {str(e)}")
            return None

    def get_market_price(self, symbol):
        """Fetches REAL PRICE. Returns None if slow."""
        try:
            endpoint = f"/api/v1/market/ticker?symbol={symbol}_UMCBL"
            res = self._send_request("GET", endpoint)
            if res and "data" in res and res["data"]:
                return float(res["data"]["lastPrice"])
            return None
        except:
            return None

    # Keep these for completeness
    def get_wallet_balance(self):
        return self._send_request("GET", "/api/v1/account/assets")
    
    def place_order(self, symbol, side, size):
        params = {"symbol": symbol + "_UMCBL", "side": side, "type": "market", "size": str(size), "marginMode": "cross"}
        return self._send_request("POST", "/api/v1/order/submit", params)

weex_bot = WeexClient()
