import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Terminal, Shield, Wallet, Zap, Activity, Lock, Cpu, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

// --- TYPES ---
type LogType = 'AI_SCAN' | 'WEEX_API' | 'RISK_CHECK' | 'OPPORTUNITY' | 'EXECUTION';

interface LogMessage {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
}

// --- VISUAL CHART DATA (Flowing Effect) ---
const initialSparkline = Array.from({ length: 40 }, (_, i) => ({
  value: 100 + Math.random() * 20
}));

// --- COMPONENTS ---
const StatusBadge = ({ icon: Icon, label, active = true, color = "green" }: any) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
    active 
      ? `bg-${color}-500/10 border-${color}-500/20 text-${color}-400` 
      : 'bg-red-500/10 border-red-500/30 text-red-400'
  } text-[10px] font-mono backdrop-blur-md shadow-lg`}>
    <Icon size={12} className={active ? "animate-pulse" : ""} />
    <span>{label}</span>
  </div>
);

// 🔥 GLASSBOX MARKET CARD (With Glowing Area Chart)
const MarketCard = ({ symbol, price, change, isPositive, data }: any) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={`relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl h-44 flex flex-col justify-between group
      ${isPositive 
        ? 'bg-gradient-to-br from-[#050505] to-[#0a0a0a] border border-[#00ff9d]/20 shadow-[0_0_20px_rgba(0,255,157,0.05)]' 
        : 'bg-black border border-white/5'
      }`}
  >
    {/* Chart Background */}
    <div className="absolute inset-x-0 bottom-0 h-28 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
       <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#00ff9d" : "#ff3b30"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isPositive ? "#00ff9d" : "#ff3b30"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={isPositive ? "#00ff9d" : "#ff3b30"} 
            strokeWidth={2} 
            fill={`url(#gradient-${symbol})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    {/* Content */}
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-[#00ff9d] animate-pulse' : 'bg-red-500'}`} />
          <h3 className="text-gray-400 text-xs font-bold tracking-widest">{symbol}</h3>
        </div>
        <div className="text-2xl font-mono font-bold text-white tracking-tighter drop-shadow-md">{price}</div>
      </div>
      <div className={`text-[10px] font-bold px-2 py-1 rounded border ${
        isPositive ? 'bg-[#00ff9d]/10 border-[#00ff9d]/20 text-[#00ff9d]' : 'bg-red-500/10 border-red-500/20 text-[#ff3b30]'
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

  // --- 💰 WALLET DATA (D-DAY SWITCH READY) ---
  const [wallet, setWallet] = useState({
    total: 1000.00,        
    available: 1000.00,
    inPositions: 0.00,
    unrealizedPnL: 0.00,
    pnlPercent: 0.00,
    positions: [] as any[] // <--- NEW: Dynamic List
  });

  // --- REAL-TIME PRICES STATE ---
  const [prices, setPrices] = useState({
    SOL: { price: 138.64, change: "+0.75%", start: 136.00 }, 
    BTC: { price: 91207.30, change: "+0.04%", start: 90800.00 },
    ETH: { price: 3118.00, change: "-0.87%", start: 3150.00 },
    DOGE: { price: 0.1425, change: "+12.5%", start: 0.1300 } 
  });

  // --- ANIMATE CHART ---
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const newVal = prev[prev.length - 1].value + (Math.random() - 0.5) * 5;
        return [...prev.slice(1), { value: newVal }];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    const wsUrl = "wss://nexus-7-weex-terminal.onrender.com/ws/stream"; 
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      addLog("WEEX_API", "CONNECTED: Secure WebSocket link established.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(data.type, data.message);
        
        // ⚡ AUTOMATIC WALLET SWITCH ⚡
        if (data.wallet) {
            setWallet({
                total: data.wallet.total,
                available: data.wallet.available,
                inPositions: data.wallet.inPositions,
                unrealizedPnL: data.wallet.unrealizedPnL,
                pnlPercent: data.wallet.pnlPercent,
                positions: data.wallet.positions || [] // <--- Update the list
            });
        }

        // ⚡ DYNAMIC PRICE & PERCENTAGE UPDATE ⚡
        if (data.price) {
            const sym = data.symbol.replace("USDT", "");
            
            if (prices[sym as keyof typeof prices]) {
              setPrices(prev => {
                const coinKey = sym as keyof typeof prev;
                const oldData = prev[coinKey];
                
                // MATH: ((NewPrice - StartPrice) / StartPrice) * 100
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
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#00ff9d] selection:text-black pb-10 overflow-hidden">
      
      {/* 🟢 TOP NAV */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Activity className="text-[#00ff9d]" size={18} />
            <h1 className="font-bold tracking-widest text-lg">NEXUS-7 <span className="text-gray-600 text-xs font-mono ml-2">GlassBox Terminal</span></h1>
          </div>
          
          <div className="flex gap-3">
            <StatusBadge icon={Wifi} label={isConnected ? "WEEX API: CONNECTED" : "WEEX API: OFF"} active={isConnected} color="green" />
            <StatusBadge icon={Cpu} label="AI ENGINE: ONLINE" color="purple" />
            <StatusBadge icon={Shield} label="RISK GUARD: ACTIVE" color="yellow" />
          </div>
        </div>
      </header>

      {/* 🟢 MAIN GRID */}
      <main className="max-w-[1600px] mx-auto px-6 pt-6 grid grid-cols-12 gap-6">
        
        {/* LEFT: MARKET OVERVIEW (Col-span-8) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Markets
            </h2>
          </div>

          {/* ⚡ 4-GRID LAYOUT */}
          <div className="grid grid-cols-2 gap-4">
            <MarketCard symbol="BTC" price={`$${prices.BTC.price.toLocaleString()}`} change={prices.BTC.change} isPositive={!prices.BTC.change.includes("-")} data={chartData} />
            <MarketCard symbol="SOL" price={`$${prices.SOL.price.toLocaleString()}`} change={prices.SOL.change} isPositive={!prices.SOL.change.includes("-")} data={chartData} />
            <MarketCard symbol="ETH" price={`$${prices.ETH.price.toLocaleString()}`} change={prices.ETH.change} isPositive={!prices.ETH.change.includes("-")} data={chartData} />
            <MarketCard symbol="DOGE" price={`$${prices.DOGE.price.toFixed(4)}`} change={prices.DOGE.change} isPositive={!prices.DOGE.change.includes("-")} data={chartData} />
          </div>

          {/* TERMINAL LOGS */}
          <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-[400px] flex flex-col relative">
            <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00ff9d]/50 to-transparent" />
            <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#00ff9d]" />
                <span className="text-xs font-mono text-[#00ff9d] tracking-widest uppercase shadow-[#00ff9d]">AI Logic Stream</span>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed space-y-2 scrollbar-hide">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 border-l-2 border-transparent hover:border-[#00ff9d] pl-2 transition-all opacity-80 hover:opacity-100">
                  <span className="text-gray-600">{log.timestamp}</span>
                  <span className={`font-bold ${
                    log.type === 'EXECUTION' ? 'text-[#00ff9d]' : 
                    log.type === 'RISK_CHECK' ? 'text-yellow-500' : 'text-purple-400'
                  }`}>[{log.type}]</span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: WALLET & POSITIONS (Col-span-4) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* 💰 PRO WALLET CARD */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff9d]/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-[#00ff9d]/20 transition-all"/>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                 <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Balance</div>
                 <div className="text-4xl font-mono font-bold text-white tracking-tight">${wallet.total.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className={`bg-[#00ff9d]/10 text-[#00ff9d] text-xs font-bold px-2 py-1 rounded border border-[#00ff9d]/20 ${wallet.pnlPercent < 0 ? 'text-red-400 border-red-400/20 bg-red-400/10' : ''}`}>
                  {wallet.pnlPercent > 0 ? '+' : ''}{wallet.pnlPercent}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <div className="text-gray-500 text-[10px] uppercase">Available</div>
                <div className="text-lg font-mono text-white">${wallet.available.toLocaleString()}</div>
              </div>
              <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <div className="text-gray-500 text-[10px] uppercase">In Positions</div>
                <div className="text-lg font-mono text-white">${wallet.inPositions.toLocaleString()}</div>
              </div>
            </div>

            {/* 🔥 DYNAMIC POSITIONS LIST 🔥 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Open Positions ({wallet.positions.length})</div>
              </div>
              
              {wallet.positions.length === 0 ? (
                <div className="text-gray-600 text-xs italic text-center py-4">
                  Scanning for targets...
                </div>
              ) : (
                wallet.positions.map((pos, index) => (
                  <div key={index} className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${pos.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}/> 
                      {pos.symbol}
                    </div>
                    <div className={pos.pnl >= 0 ? "text-[#00ff9d]" : "text-red-400"}>
                      {pos.pnl > 0 ? "+" : ""}{pos.pnl}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RISK MANAGER CARD */}
          <div className="bg-black border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-yellow-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Risk Manager</span>
            </div>
            
            <div className="flex justify-between items-end mb-2">
               <span className="text-3xl font-mono font-bold text-white">8x</span>
               <span className="text-xs text-yellow-500 border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 rounded">Competition Safe</span>
            </div>
            
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
               <div className="bg-yellow-500 h-full w-2/5 rounded-full shadow-[0_0_10px_orange]" />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-600 font-mono">
              <span>1x</span>
              <span>20x (Cap)</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
