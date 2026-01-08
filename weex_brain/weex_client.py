import time
import hmac
import hashlib
import base64
import requests
import json

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
        
        # 🔥 FIX: Add Browser Headers so WEEX doesn't block us
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json"
        }

    def get_market_price(self, symbol):
        """Fetches REAL PRICE via Public Endpoint with Error Reporting"""
        try:
            url = f"{self.base_url}/api/v1/market/ticker?symbol={symbol}_UMCBL"
            
            # Use the browser headers
            res = requests.get(url, headers=self.headers, timeout=3)
            
            if res.status_code != 200:
                print(f"⚠️ API Error {res.status_code}: {res.text}")
                return None
                
            data = res.json()
            if "data" in data and data["data"]:
                return float(data["data"]["lastPrice"])
            return None
            
        except Exception as e:
            print(f"⚠️ Connection Error: {e}")
            return None

    # Keep trading methods for the future
    def _get_signature(self, method, request_path, body=""):
        timestamp = str(int(time.time() * 1000))
        message = timestamp + method.upper() + request_path + body
        signature = hmac.new(self.secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).digest()
        return timestamp, base64.b64encode(signature).decode('utf-8')

weex_bot = WeexClient()
