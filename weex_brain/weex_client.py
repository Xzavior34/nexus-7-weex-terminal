import time
import hmac
import hashlib
import base64
import requests
import json

# --- CONFIGURATION ---
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

    # --- UNBLOCKABLE PUBLIC DATA (Via Binance Public Feed) ---
    def get_market_price(self, symbol):
        """
        Fetches Real-Time Price from Binance (Unblockable).
        Symbol format input: 'BTCUSDT' -> automatically handled.
        """
        try:
            # Clean the symbol just in case (e.g. remove _UMCBL if present)
            clean_symbol = symbol.replace("_UMCBL", "").upper()
            
            # Binance Public API (No keys needed, very fast)
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean_symbol}"
            
            res = requests.get(url, timeout=2)
            data = res.json()
            
            if "price" in data:
                return float(data["price"])
            return None
        except Exception:
            return None

    # --- TRADING EXECUTION (STILL ON WEEX) ---
    # These use your API Keys and run only when you place a trade.
    # They are less likely to be blocked because they are signed requests.
    
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

    def place_order(self, symbol, side, size):
        params = {
            "symbol": symbol + "_UMCBL",
            "side": side,
            "type": "market",
            "size": str(size),
            "marginMode": "cross"
        }
        # Simplified Private Request Logic for Order Placement
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
