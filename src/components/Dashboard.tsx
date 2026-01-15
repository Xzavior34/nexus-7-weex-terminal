import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Terminal, Shield, Wallet, Zap, Activity, Cpu, Wifi, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
type LogType = 'AI_SCAN' | 'WEEX_API' | 'RISK_CHECK' | 'OPPORTUNITY' | 'EXECUTION' | 'VETO_BLOCK' | 'INFO';

interface LogMessage {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
}

// --- VISUAL CHART DATA ---
const initialSparkline = Array.from({ length: 40 }, (_, i) => ({
  value: 100 + Math.random() * 20
}));

// --- COMPONENTS ---

const StatusBadge = ({ icon: Icon, label, active = true, color = "green" }: any) => {
  const colorMap: any = {
    green: "text-[#00ff9d] border-[#00ff9d]/30 bg-[#00ff9d]/10 shadow-[0_0_15px_rgba(0,255,157,0.3)]",
    red: "text-[#ff3b30] border-[#ff3b30]/30 bg-[#ff3b30]/10 shadow-[0_0_15px_rgba(255,59,48,0.3)]",
    purple: "text-[#bf5af2] border-[#bf5af2]/30 bg-[#bf5af2]/10 shadow-[0_0_15px_rgba(191,90,242,0.3)]",
    yellow: "text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10 shadow-[0_0_15px_rgba(255,204,0,0.3)]",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
      active ? colorMap[color] : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
    } text-[10px] font-mono font-bold backdrop-blur-md`}>
      <Icon size={12} className={active && color !== 'red' ? "animate-pulse" : ""} />
      <span>{label}</span>
    </div>
  );
};

const MarketCard = ({ symbol, price, change, isPositive, data }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl h-44 flex flex-col justify-between group transition-all duration-300
      ${isPositive 
        ? 'bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#00ff9d]/5 border border-[#00ff9d]/20 hover:border-[#00ff9d]/50 hover:shadow-[0_0_30px_rgba(0,255,157,0.1)]' 
        : 'bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#ff3b30]/5 border border-[#ff3b30]/20 hover:border-[#ff3b30]/50'
      }`}
  >
    <div className="absolute inset-x-0 bottom-0 h-32 opacity-30 group-hover:opacity-50 transition-opacity duration-500 mask-image-gradient">
       <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#00ff9d" : "#ff3b30"} stopOpacity={0.5}/>
              <stop offset="95%" stopColor={isPositive ? "#00ff9d" : "#ff3b30"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={isPositive ? "#00ff9d" : "#ff3b30"} 
            strokeWidth={3} 
            fill={`url(#gradient-${symbol})`} 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    <div className="relative z-10 flex justify-between items-start">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] ${isPositive ? 'bg-[#00ff9d] text-[#00ff9d] animate-pulse' : 'bg-[#ff3b30] text-[#ff3b30]'}`} />
          <h3 className="text-gray-400 text-xs font-bold tracking-[0.2em]">{symbol} / USDT</h3>
        </div>
        <div className="text-3xl font-mono font-bold text-white tracking-tighter drop-shadow-2xl">{price}</div>
      </div>
      <div className={`text-[10px] font-bold px-2 py-1 rounded border backdrop-blur-md ${
        isPositive ? 'bg-[#00ff9d]/10 border-[#00ff9d]/30 text-[#00ff9d] shadow-[0_0_10px_rgba(0,255,157,0.2)]' : 'bg-[#ff3b30]/10 border-[#ff3b30]/30 text-[#ff3b30]'
      }`}>
        {change}
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chartData, setChartData] = useState(initialSparkline);
  const [vetoStatus, setVetoStatus] = useState("GREEN");

  // --- 💰 WALLET DATA ---
  const [wallet, setWallet] = useState({
    total: 0.00,        
    available: 0.00,
    inPositions: 0.00,
    unrealizedPnL: 0.00,
    pnlPercent: 0.00,
    positions: [] as any[]
  });

  // --- REAL-TIME PRICES STATE ---
  const [prices, setPrices] = useState({
    SOL: { price: 138.64, change: "+0.75%", start: 136.00 }, 
    BTC: { price: 91207.30, change: "+0.04%", start: 90800.00 },
    ETH: { price: 3118.00, change: "-0.87%", start: 3150.00 },
    DOGE: { price: 0.1425, change: "+12.5%", start: 0.1300 } 
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const newVal = prev[prev.length - 1].value + (Math.random() - 0.5) * 8;
        return [...prev.slice(1), { value: newVal }];
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    // ⚠️ CRITICAL: MATCH THIS URL TO YOUR RENDER URL
    const wsUrl = "wss://nexus-7-weex-terminal.onrender.com/ws/stream"; 
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      addLog("WEEX_API", "CONNECTED: Secure WebSocket link established.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // LOGGING
        if (data.message) {
            // Filter out repetitive scans to keep logs clean
            if (!data.message.includes("System Active")) {
                addLog(data.type || "INFO", data.message);
            }
        }
        
        if (data.veto_status) setVetoStatus(data.veto_status);

        // --- 💰 CRITICAL FIX: WALLET MAPPING ---
        // Maps backend keys (in_pos) to frontend keys (inPositions)
        if (data.wallet) {
            const safeTotal = data.wallet.total || 1; // Prevent div/0
            const safePnl = data.wallet.unrealized_pnl || 0;
            const calculatedPercent = (safePnl / safeTotal) * 100;

            setWallet({
                total: data.wallet.total || 0,
                available: data.wallet.available || 0,
                inPositions: data.wallet.in_pos || 0, // <--- FIXED MAPPING HERE
                unrealizedPnL: data.wallet.unrealized_pnl || 0, // <--- FIXED MAPPING HERE
                pnlPercent: parseFloat(calculatedPercent.toFixed(2)),
                positions: data.wallet.positions || [] 
            });
        }

        // ⚡ PRICE UPDATE
        if (data.price && data.symbol) {
            const sym = data.symbol.replace("USDT", "").replace("cmt_", "").toUpperCase();
            
            if (prices[sym as keyof typeof prices]) {
              setPrices(prev => {
                const coinKey = sym as keyof typeof prev;
                const oldData = prev[coinKey];
                const percentChange = ((data.price - oldData.start) / oldData.start) * 100;
                const sign = percentChange >= 0 ? "+" : "";
                
                return {
                  ...prev,
                  [coinKey]: {
                    ...oldData,
                    price: data.price,
                    change: `${sign}${percentChange.toFixed(2)}%` 
                  }
                };
              });
            }
        }
      } catch (e) { }
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog("RISK_CHECK", "DISCONNECTED: Reconnecting...");
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: string, message: string) => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type: type as LogType,
      message
    };
    setLogs(prev => [...prev.slice(-14), newLog]); 
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#00ff9d] selection:text-black pb-10 overflow-hidden relative">
      
      {/* 🌌 BACKGROUND */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#00ff9d]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#bf5af2]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 🟢 TOP NAV */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
                <Activity className="text-[#00ff9d] animate-pulse" size={20} />
                <div className="absolute inset-0 bg-[#00ff9d] blur-lg opacity-40 animate-pulse"></div>
            </div>
            <h1 className="font-bold tracking-widest text-xl text-white">NEXUS-7 <span className="text-[#00ff9d] text-xs font-mono ml-2 px-2 py-0.5 border border-[#00ff9d]/30 rounded bg-[#00ff9d]/10 shadow-[0_0_10px_rgba(0,255,157,0.2)]">PRO v2.1</span></h1>
          </div>
          
          <div className="flex gap-4">
            <StatusBadge 
                icon={vetoStatus === "RED" ? AlertTriangle : Shield} 
                label={vetoStatus === "RED" ? "ATOMIC VETO: ACTIVE" : "SYSTEM: SECURE"} 
                active={true} 
                color={vetoStatus === "RED" ? "red" : "green"} 
            />
            <StatusBadge icon={Wifi} label={isConnected ? "FEED: LIVE" : "FEED: CONNECTING"} active={isConnected} color="green" />
            <StatusBadge icon={Cpu} label="AI ENGINE: 100%" color="purple" />
          </div>
        </div>
      </header>

      {/* 🟢 MAIN GRID */}
      <main className="max-w-[1600px] mx-auto px-6 pt-8 grid grid-cols-12 gap-6 relative z-10">
        
        {/* LEFT: MARKET OVERVIEW */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono text-[#00ff9d] uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-md">
              <span className="w-1.5 h-1.5 bg-[#00ff9d] rounded-full animate-ping"></span> Kinetic Market Scan
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MarketCard symbol="BTC" price={`$${prices.BTC.price.toLocaleString()}`} change={prices.BTC.change} isPositive={!prices.BTC.change.includes("-")} data={chartData} />
            <MarketCard symbol="SOL" price={`$${prices.SOL.price.toLocaleString()}`} change={prices.SOL.change} isPositive={!prices.SOL.change.includes("-")} data={chartData} />
            <MarketCard symbol="ETH" price={`$${prices.ETH.price.toLocaleString()}`} change={prices.ETH.change} isPositive={!prices.ETH.change.includes("-")} data={chartData} />
            <MarketCard symbol="DOGE" price={`$${prices.DOGE.price.toFixed(4)}`} change={prices.DOGE.change} isPositive={!prices.DOGE.change.includes("-")} data={chartData} />
          </div>

          {/* TERMINAL LOGS */}
          <div className="bg-[#050505]/90 border border-[#00ff9d]/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] h-[420px] flex flex-col relative group hover:border-[#00ff9d]/40 transition-colors">
            <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00ff9d] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#00ff9d]" />
                <span className="text-xs font-mono text-[#00ff9d] tracking-widest uppercase drop-shadow-[0_0_5px_rgba(0,255,157,0.5)]">Nexus-7 Logic Stream</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed space-y-2 scrollbar-hide">
              <AnimatePresence>
              {logs.map((log) => (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id} 
                    className="flex gap-3 border-l-2 border-transparent hover:border-[#00ff9d] pl-2 transition-all opacity-80 hover:opacity-100 hover:bg-white/5 rounded-r"
                >
                  <span className="text-gray-500 w-16">{log.timestamp}</span>
                  <span className={`font-bold w-24 ${
                    log.type === 'EXECUTION' ? 'text-[#00ff9d] drop-shadow-[0_0_5px_rgba(0,255,157,0.8)]' : 
                    log.type === 'RISK_CHECK' ? 'text-[#ffcc00]' : 
                    log.type === 'VETO_BLOCK' ? 'text-[#ff3b30]' : 'text-[#bf5af2]'
                  }`}>[{log.type}]</span>
                  <span className="text-gray-300">{log.message}</span>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT: WALLET & POSITIONS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          <div className="bg-gradient-to-b from-[#0a0a0a] to-black border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-[#00ff9d]/30 transition-all duration-500 shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00ff9d]/10 rounded-full blur-[80px] -mr-10 -mt-10 group-hover:bg-[#00ff9d]/20 transition-all duration-700"/>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Wallet size={12} /> Total Equity
                  </div>
                  <div className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-xl">${wallet.total.toLocaleString()}</div>
              </div>
            </div>

            <div className="relative z-10">
                <div className={`text-center py-2 rounded-lg border text-sm font-bold font-mono mb-6 backdrop-blur-md transition-all ${
                    wallet.pnlPercent >= 0 
                    ? 'bg-[#00ff9d]/10 border-[#00ff9d]/30 text-[#00ff9d] shadow-[0_0_15px_rgba(0,255,157,0.1)]' 
                    : 'bg-[#ff3b30]/10 border-[#ff3b30]/30 text-[#ff3b30]'
                }`}>
                    Daily PnL: {wallet.pnlPercent > 0 ? '+' : ''}{wallet.pnlPercent}% (${wallet.unrealizedPnL.toFixed(2)})
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Available</div>
                    <div className="text-lg font-mono text-white">${wallet.available.toLocaleString()}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">In Positions</div>
                    <div className="text-lg font-mono text-white">${wallet.inPositions.toLocaleString()}</div>
                </div>
                </div>
            </div>
          </div>

          <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 min-h-[200px] shadow-lg">
             <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                <div className="text-gray-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                    <Zap size={12} className={wallet.positions.length > 0 ? "text-[#00ff9d]" : "text-gray-600"} />
                    Active Positions ({wallet.positions.length})
                </div>
              </div>
              
              <div className="space-y-3">
              {wallet.positions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-700 space-y-2">
                    <div className={`w-2 h-2 rounded-full ${vetoStatus === "RED" ? "bg-red-500" : "bg-[#00ff9d] animate-ping"}`} />
                  <span className="text-xs font-mono italic">
                    {vetoStatus === "RED" 
                      ? "⛔ TRADING PAUSED (BTC VETO)" 
                      : "Scanning for high-probability setups..."
                    }
                  </span>
                </div>
              ) : (
                wallet.positions.map((pos, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={index} 
                    className="flex justify-between items-center text-xs font-mono bg-white/5 p-3 rounded-lg border border-white/5 hover:border-[#00ff9d]/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${pos.pnl >= 0 ? 'bg-[#00ff9d] text-[#00ff9d]' : 'bg-[#ff3b30] text-[#ff3b30]'}`}/> 
                      <span className="font-bold text-white">{pos.symbol}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{pos.type}</span>
                    </div>
                    <div className={`font-bold ${pos.pnl >= 0 ? "text-[#00ff9d]" : "text-[#ff3b30]"}`}>
                      {pos.pnl > 0 ? "+" : ""}{pos.pnl}%
                    </div>
                  </motion.div>
                ))
              )}
              </div>
          </div>

          <div className="bg-gradient-to-r from-black to-[#0a0a0a] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Shield size={16} className="text-[#ffcc00]" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Risk Guard</span>
            </div>
            
            <div className="flex justify-between items-end mb-3 relative z-10">
               <span className="text-4xl font-mono font-bold text-white drop-shadow-lg">{vetoStatus === "RED" ? "0x" : "10x"}</span>
               <span className={`text-[10px] font-bold border px-2 py-1 rounded backdrop-blur-sm ${
                 vetoStatus === "RED" 
                   ? "text-[#ff3b30] border-[#ff3b30]/30 bg-[#ff3b30]/10 animate-pulse"
                   : "text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10"
               }`}>
                 {vetoStatus === "RED" ? "ATOMIC FREEZE" : "High Performance Mode"}
               </span>
            </div>
            
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative z-10">
               <div className={`h-full rounded-full shadow-[0_0_15px_currentColor] transition-all duration-500 ${
                   vetoStatus === "RED" ? "bg-[#ff3b30] w-full text-[#ff3b30]" : "bg-[#ffcc00] w-3/4 text-[#ffcc00]"
               }`} />
            </div>

             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
          </div>

        </div>
      </main>
    </div>
  );
}
