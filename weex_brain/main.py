import uvicorn
import asyncio
import json
import random
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("⚡ MOCK MODE: Connected to Dashboard")
    
    price = 145.20 
    
    while True:
        price += random.uniform(-0.5, 0.5)
        
        log_types = ["AI_SCAN", "WEEX_API", "RISK_CHECK", "OPPORTUNITY"]
        chosen_type = random.choice(log_types)
        
        log_msg = ""
        if chosen_type == "WEEX_API":
            log_msg = f"Latency 45ms - Orderbook depth verified."
        elif chosen_type == "AI_SCAN":
            log_msg = f"Sentiment Analysis: BULLISH ({random.randint(80,99)}%)"
        elif chosen_type == "OPPORTUNITY":
            log_msg = "Arbitrage spread 0.15% detected on SOL/USDT."
        elif chosen_type == "RISK_CHECK":
            log_msg = "Margin safe. Leverage capped at 5x."

        data = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "symbol": "SOL/USDT",
            "price": round(price, 2),
            "type": chosen_type,
            "message": log_msg
        }
        
        await websocket.send_text(json.dumps(data))
        await asyncio.sleep(1.5)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)