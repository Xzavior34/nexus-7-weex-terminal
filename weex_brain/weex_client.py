import time
import hmac
import hashlib
import base64
import requests
import json
import urllib3

# 1. DISABLE SSL WARNINGS (Required for Direct IP Connection)
urllib3.disable_warnings()

class WeexClient:
    def __init__(self):
        # --- 🔑 YOUR KEYS (Hardcoded for Speed) ---
        self.key = "weex_d6eac84d6220ac893cd2fb10aadcf493"
        self.secret = "dd6dda820151a46c6ac9dc1e0baf1d846ba9d1c8deee0d93aa3e71d516515c3b"
        self.passphrase = "weex0717289"

        # --- 🌐 NETWORK BYPASS CONFIG ---
        # We connect directly to the AWS IP to bypass Nigerian DNS Blocks
        self.direct_ip = "13.113.98.222"
        self.base_url = f"https://{self.direct_ip}"
        
        # We mimic the Host header so the server thinks we are a normal user
        self.host_header = "api.weex.com"

        # Headers to look like a real Chrome Browser
        self.common_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
            "Host": self.host_header
        }

    # --- 1. THE SIGNATURE GENERATOR ---
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

    # --- 2. MULTI-SOURCE PRICE FETCHER (Stability) ---
    def get_market_price(self, symbol):
        # We try Binance first because it's faster and public
        clean_sym = symbol.replace("_UMCBL", "").replace("USDT", "") + "USDT"
        try:
            url = f"https://api.binance.com/api/v3/ticker/price?symbol={clean_sym}"
            res = requests.get(url, timeout=2)
            if res.status_code == 200:
                price = float(res.json()["price"])
                # print(f"✅ PRICE {symbol}: {price}")
                return price
        except:
            pass
        return 0.0

    # --- 3. 🚨 REAL TRADING EXECUTION 🚨 ---
    def place_order(self, symbol, side, size):
        # ENDPOINT: Futures Order Submit
        endpoint = "/api/v1/order/submit"
        
        # We append _UMCBL for Futures contracts if missing
        if "_UMCBL" not in symbol and "USDT" in symbol:
            symbol += "_UMCBL"

        params = {
            "symbol": symbol,
            "side": side.lower(), # 'buy' or 'sell'
            "type": "market",     # Market order for instant fill
            "size": str(size),
            "marginMode": "cross"
        }
        body = json.dumps(params)
        
        # Sign the request
        timestamp, sign = self._get_signature("POST", endpoint, body)
        
        headers = self.common_headers.copy()
        headers.update({
            "ACCESS-KEY": self.key,
            "ACCESS-SIGN": sign,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-PASSPHRASE": self.passphrase
        })
        
        print(f"🚀 EXECUTING {side.upper()} {symbol} (Size: {size})...")
        
        try:
            # SEND to Direct IP (verify=False ignores SSL errors)
            response = requests.post(
                self.base_url + endpoint, 
                headers=headers, 
                data=body, 
                timeout=5, 
                verify=False
            )
            
            print(f"📥 WEEX SAYS: {response.text}")
            return response.json()
        except Exception as e:
            print(f"❌ EXECUTION FAILED: {e}")
            return {"error": str(e)}

    # --- 4. HACKATHON LOGGING (Best Effort) ---
    def upload_ai_log(self, symbol, action, logic, risk_score):
        endpoint = "/capi/v2/order/uploadAiLog"
        
        payload = {
            "orderId": None,
            "stage": "Execution",
            "model": "Nexus-7-Live",
            "input": {"symbol": symbol, "strategy": "Momentum"},
            "output": {"action": action, "risk_score": float(risk_score)},
            "explanation": logic
        }
        body = json.dumps(payload)
        timestamp, sign = self._get_signature("POST", endpoint, body)

        headers = self.common_headers.copy()
        # Log server often needs a different Host header, but we try standard first
        headers.update({
            "ACCESS-KEY": self.key,
            "ACCESS-SIGN": sign,
            "ACCESS-TIMESTAMP": timestamp,
            "ACCESS-PASSPHRASE": self.passphrase,
            "Host": "api-contract.weex.com" # Switch host for this specific call
        })

        try:
            requests.post(self.base_url + endpoint, headers=headers, data=body, timeout=2, verify=False)
            # We don't print success here to keep the logs clean
        except:
            pass

# Initialize the bot instance
weex_bot = WeexClient()
