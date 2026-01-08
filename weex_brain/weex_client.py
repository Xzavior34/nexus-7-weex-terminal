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

# Map WEEX symbols to CoinGecko IDs
SYMBOL_MAP = {
    "BTCUSDT": "bitcoin",
    "ETHUSDT": "ethereum",
    "SOLUSDT": "solana",
    "XRPUSDT": "ripple",
    "ADAUSDT": "cardano",
    "DOGEUSDT": "dogecoin",
    "LTCUSDT": "litecoin",
    "BNBUSDT": "binancecoin"
}

class WeexClient:
    def __init__(self):
        self.key = WEEX_CONFIG["API_KEY"]
        self.secret = WEEX_CONFIG["SECRET_KEY"]
        self.passphrase = WEEX_CONFIG["PASSPHRASE"]
        self.base_url = WEEX_CONFIG["BASE_URL"]

    # --- PLAN D: COINGECKO FEED (Cloud Friendly) ---
    def get_market_price(self, symbol):
        try:
            # 1. Clean symbol (BTCUSDT_UMCBL -> BTCUSDT)
            clean_sym = symbol.replace("_UMCBL", "").upper()
            
            # 2. Get CoinGecko ID
            cg_id = SYMBOL_MAP.get(clean_sym)
            if not cg_id:
                return None # Unknown symbol

            # 3. Fetch Price (No Keys Needed)
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={cg_id}&vs_currencies=usd"
            
            # Add headers to look like a real browser
            headers = {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
            
            res = requests.get(url, headers=headers, timeout=3)
            data = res.json()
            
            # 4. Parse Response: {'bitcoin': {'usd': 67000}}
            if cg_id in data and 'usd' in data[cg_id]:
                return float(data[cg_id]['usd'])
            
            return None
            
        except Exception as e:
            print(f"CoinGecko Error: {e}")
            return None

    # --- TRADING EXECUTION (STILL ON WEEX) ---
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
