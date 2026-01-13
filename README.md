
# Nexus-7: GlassBox Trading Terminal 🧠

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Tech Stack](https://img.shields.io/badge/stack-Python%20%7C%20FastAPI%20%7C%20WebSockets-blue)
![Strategy](https://img.shields.io/badge/strategy-Heuristic%20Momentum%20Scalping-purple)
![Hackathon](https://img.shields.io/badge/hackathon-WEEX%20Alpha%20Awakens-orange)

> **"Trust shouldn't be blind. It should be visible."**

**Nexus-7** is the first "GlassBox" algorithmic trading terminal built exclusively for the **WEEX Alpha Awakens 2026 Hackathon**. Unlike standard "Black Box" bots that hide their logic, Nexus-7 visualizes its **Heuristic AI decision-making process** in real-time—streaming Anomaly Detection (BTC Veto) and Risk Scores directly to the user's dashboard.

---

## 🔗 Live Demo
- **Live Terminal:** [https://nexus-7-weex-terminal.vercel.app](https://nexus-7-weex-terminal.vercel.app)
- **Code Repository:** [https://github.com/Xzavior34/nexus-7-weex-terminal](https://github.com/Xzavior34/nexus-7-weex-terminal)

---

## ✨ Key Features (AI & Compliance)

### 🧠 Heuristic AI Engine
The bot utilizes a **Rule-Based State Machine** to identify high-probability momentum shifts while filtering out market noise.
- **Anomaly Detection (BTC Veto):** A dedicated volatility sensor monitors Bitcoin (BTC). If a crash is detected (>0.3% drop in 30s), the "Atomic Veto" freezes all purchasing logic to prevent "catching a falling knife."
- **Momentum Thresholds:** Dynamic entry triggers (0.3% delta) ensure trades only occur during confirmable trend formations.

### 🛡️ Iron-Clad Risk Manager
Safety is not an option; it is hard-coded into the architecture.
- **Auto-Break-Even:** The AI automatically moves Stop Losses to entry price once a trade hits **+0.6% profit**, creating a "Zero-Risk" state.
- **Exposure Cap:** Strictly limits open positions to **5 Max** to prevent over-leverage.
- **Compliance Logging:** Automatically generates `ai_log.csv`, recording every logic branch and risk score for audit transparency.

### ⚡ WEEX Integration
- **Pairs Traded:** BTC, ETH, SOL, DOGE, LTC, XRP, BNB, ADA (Strict adherence to competition pair list).
- **Leverage:** Capped at **10x** (Safe Zone).
- **Connectivity:** Zero-lag WebSocket connection for sub-millisecond price updates.

---

## 🛠️ Tech Stack

### The Brain (Backend)
- **Language:** Python 3.10+
- **Framework:** FastAPI (AsyncIO)
- **Logic:** `deque` (Time-Series Memory), `csv` (Audit Logging)
- **Exchange:** WEEX API (via customized client)

### The Face (Frontend)
- **Framework:** HTML5 / JavaScript (WebSocket Native)
- **Deployment:** Vercel
- **Visualization:** Real-time DOM manipulation for high-frequency updates

---

## 🏗️ Architecture

The system uses a decoupled **"Brain & Face"** architecture to ensure high performance.

```mermaid
graph LR
    A[WEEX Exchange] <-->|Rest API / WSS| B(Python Brain / Render)
    B -->|Secure WebSocket Stream| C(Dashboard / Vercel)
    B -->|Audit Trail| D[ai_log.csv]
    E[Risk Manager] -->|Block/Allow| B

🚀 Local Installation
If you want to audit the logic locally:
 * Clone the Repo
   git clone [https://github.com/Xzavior34/nexus-7-weex-terminal.git](https://github.com/Xzavior34/nexus-7-weex-terminal.git)
cd nexus-7-weex-terminal

 * Setup Backend
   pip install -r requirements.txt
python main.py

   The AI Engine will initialize and begin scanning WEEX markets immediately.
⚠️ Hackathon Compliance Statement
This project was built specifically for the WEEX Alpha Awakens competition (Forked Entry).
 * Leverage: Hard-capped at 10x.
 * Trading Pairs: Restricted to the 8 allowed assets.
 * AI Log: The system automatically generates ai_log.csv containing Timestamp, Symbol, Action, Logic_Reason, and Risk_Score for every decision.
 

