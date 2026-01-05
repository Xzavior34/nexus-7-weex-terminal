# WEEX API Configuration
# Put WEEX UID and API Keys here
# 
# Instructions:
# 1. Log into your WEEX account
# 2. Navigate to API Management
# 3. Create a new API key with trading permissions
# 4. Copy the UID, API Key, and Secret below
#
# IMPORTANT: Never commit this file with real credentials!
# Use environment variables in production.

import os
from dotenv import load_dotenv

load_dotenv()

# WEEX Competition UID
WEEX_UID = os.getenv("WEEX_UID", "")

# API Credentials
WEEX_API_KEY = os.getenv("WEEX_API_KEY", "")
WEEX_API_SECRET = os.getenv("WEEX_API_SECRET", "")

# API Endpoints
WEEX_REST_URL = "https://api.weex.com"
WEEX_WS_URL = "wss://ws.weex.com"

# Trading Configuration
MAX_LEVERAGE = 5  # Competition rule compliance
MAX_POSITION_SIZE = 0.05  # 5% of portfolio per position
MAX_DRAWDOWN = 0.10  # 10% max drawdown

# Pairs to trade
TRADING_PAIRS = [
    "BTC/USDT",
    "SOL/USDT",
    "ETH/USDT",
    "ADA/USDT",
]
