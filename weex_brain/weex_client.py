import time
import hmac
import hashlib
import base64
import requests
import json
import random

# --- WEEX CONFIG ---
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
        # Browser-like headers to avoid being blocked
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json"
        }

    # --- THE TANK: MULTI-SOURCE PRICE FETCHER ---
    def get_market_price(self, symbol):
        """
        Tries 5 different sources. If one fails, it tries the next.
        """
        clean_sym = symbol.replace("_UMCBL", "").upper() # e.g., "BTCUSDT"
        base_coin = clean_sym.replace("USDT", "")        # e.g., "BTC"
        
        # SOURCE 1: BINANCE (Fastest)
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean_sym}"
            res = requests.get(url, headers=self.headers, timeout=2)
            if res.status_code == 200:
                return float(res.json()["price"])
        except:
            pass

        # SOURCE 2: COINBASE (Very Reliable, US-based)
        try:
            url = f"https://api.coinbase.com/v2/prices/{base_coin}-USD/spot"
            res = requests.get(url, headers=self.headers, timeout=2)
            if res.status_code == 200:
                return float(res.json()["data"]["amount"])
        except:
            pass

        # SOURCE 3: KRAKEN (Alternative)
        try:
            # Kraken uses XBT instead of BTC sometimes, but let's try standard pairs
            pair = f"{base_coin}USD"
            if base_coin == "BTC": pair = "XXBTZUSD"
            elif base_coin == "ETH": pair = "XETHZUSD"
            
            url = f"https://api.kraken.com/0/public/Ticker?pair={pair}"
            res = requests.get(url, headers=self.headers, timeout=2)
            if res.status_code == 200:
                data = res.json()
                if "result" in data:
                    first_key = list(data["result"].keys())[0]
                    return float(data["result"][first_key]["c"][0])
        except:
            pass
            
        # SOURCE 4: OKX (Asian Markets)
        try:
            url = f"https://www.okx.com/api/v5/market/ticker?instId={base_coin}-USDT"
            res = requests.get(url, headers=self.headers, timeout=2)
            if res.status_code == 200:
                return float(res.json()["data"][0]["last"])
        except:
            pass

        # SOURCE 5: COINGECKO (Last Resort - Slower)
        try:
            cg_map = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "DOGE": "dogecoin"}
            cg_id = cg_map.get(base_coin)
            if cg_id:
                url = f"https://api.coingecko.com/api/v3/simple/price?ids={cg_id}&vs_currencies=usd"
                res = requests.get(url, headers=self.headers, timeout=3)
                if res.status_code == 200:
                    return float(res.json()[cg_id]["usd"])
        except:
            pass

        return None # All sources failed (Very unlikely)

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
        
        # 1. Build the Compliance Payload
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
        
        # 2. Generate Signature using existing helper
        timestamp, sign = self._get_signature("POST", endpoint, body_json)

        # 3. Send Headers
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
