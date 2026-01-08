import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Terminal, Shield, Wallet, Pause, Trash2, Zap, Wifi, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
type LogType = 'AI_SCAN' | 'WEEX_API' | 'RISK_CHECK' | 'OPPORTUNITY' | 'EXECUTION';

interface LogMessage {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
}

// --- MOCK CHART DATA ---
const sparklineData = Array.from({ length: 20 }, (_, i) => ({
  value: 67000 + Math.random() * 500 - 250
}));

const portfolioData = [
  { name: 'BTC', value: 30, color: '#f7931a' },
  { name: 'SOL', value: 40, color: '#00ff9d' },
  { name: 'ETH', value: 15, color: '#627eea' },
  { name: 'DOGE', value: 15, color: '#fbcd17' },
];

// --- COMPONENTS ---
const StatusBadge = ({ icon: Icon, label, active = true }: { icon: any, label: string, active?: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
    active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
  } text-xs font-mono backdrop-blur-md`}>
    <Icon size={12} className={active ? "animate-pulse" : ""} />
    <span>{label}</span>
  </div>
);

// 🔥 UPDATED: COMPACT "WAR MODE" CARD
const MarketCard = ({ symbol, price, change, isPositive, isGlow }: { symbol: string, price: string, change: string, isPositive: boolean, isGlow?: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`relative overflow-hidden rounded-xl p-3 backdrop-blur-md transition-all h-32 flex flex-col justify-between
      ${isGlow 
        ? 'bg-black/60 border border-[#00ff9d]/50 shadow-[0_0_20px_rgba(0,255,157,0.15)]' 
        : 'bg-black/40 border border-white/10'
      }`}
  >
    {/* Background Chart Effect */}
    <div className="absolute inset-0 opacity-20 pointer-events-none">
       <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparklineData}>
          <Line type="monotone" dataKey="value" stroke={isPositive ? "#00ff9d" : "#ff3b30"} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div className="relative z-10 flex justify-between items-start">
      <div>
        <h3 className="text-gray-400 text-[10px] font-bold tracking-wider mb-0.5">{symbol}</h3>
        <div className="text-lg font-mono font-bold text-white tracking-tighter">{price}</div>
      </div>
      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-green-500/20 text-[#00ff9d]' : 'bg-red-500/20 text-[#ff3b30]'}`}>
        {change}
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  // --- REAL-TIME PRICES STATE ---
  const [solPrice, setSolPrice] = useState(146.21);
  const [btcPrice, setBtcPrice] = useState(67309.00);
  const [ethPrice, setEthPrice] = useState(3450.00);
  const [dogePrice, setDogePrice] = useState(0.124);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    // ✅ KEEP YOUR LINK
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
        
        // ⚡ HANDLE MULTI-ASSET UPDATES
        if (data.price) {
            const sym = data.symbol.replace("/", "").replace("_", ""); // Normalize
            if (sym.includes("SOL")) setSolPrice(data.price);
            if (sym.includes("BTC")) setBtcPrice(data.price);
            if (sym.includes("ETH")) setEthPrice(data.price);
            if (sym.includes("DOGE")) setDogePrice(data.price);
        }
      } catch (e) {
        // ignore errors
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog("RISK_CHECK", "DISCONNECTED: Reconnecting...");
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  const addLog = (type: string, message: string) => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type: type as LogType,
      message
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  const getLogStyle = (type: LogType) => {
    switch (type) {
      case 'AI_SCAN': return 'text-purple-400';
      case 'WEEX_API': return 'text-blue-400';
      case 'RISK_CHECK': return 'text-yellow-400';
      case 'EXECUTION': return 'text-[#00ff9d] font-bold';
      case 'OPPORTUNITY': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#00ff9d] selection:text-black pb-10">
      
      {/* HEADER */}
      <header className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_10px] ${isConnected ? 'bg-[#00ff9d] shadow-[#00ff9d]' : 'bg-red-500 shadow-red-500'}`} />
            <h1 className="font-bold tracking-wider text-sm md:text-lg">NEXUS-7 <span className="text-gray-600 text-[10px] font-normal ml-1">WAR MODE</span></h1>
          </div>
          
          <div className="flex gap-2 scale-90 origin-right">
            <StatusBadge icon={Wifi} label={isConnected ? "API: 25ms" : "API: OFF"} active={isConnected} />
            <StatusBadge icon={Cpu} label="AI: HUNTER" />
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#00ff9d]/50 to-transparent opacity-50 shadow-[0_0_10px_#00ff9d]" />
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* 🔥 4-CARD GRID FOR WAR MODE */}
          <section className="grid grid-cols-2 gap-3">
            <MarketCard symbol="BTC/USDT" price={`$${btcPrice.toLocaleString()}`} change="+0.4%" isPositive={true} />
            <MarketCard symbol="SOL/USDT" price={`$${solPrice.toFixed(2)}`} change="+8.01%" isPositive={true} isGlow={true} />
            <MarketCard symbol="ETH/USDT" price={`$${ethPrice.toLocaleString()}`} change="-0.4%" isPositive={false} />
            <MarketCard symbol="DOGE/USDT" price={`$${dogePrice.toFixed(4)}`} change="+12.5%" isPositive={true} />
          </section>

          {/* Wallet Widget */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 text-gray-500 uppercase text-[10px] tracking-widest font-bold">
              <Wallet size={12} /> Wallet & PnL
            </div>
            <div className="mb-4">
              <div className="text-3xl font-mono font-bold tracking-tighter">$25,847.50</div>
              <div className="text-[#00ff9d] text-xs font-mono mt-1">+$1,240.65 (High Volatility Mode)</div>
            </div>
            
            {/* DIVERSIFIED PORTFOLIO DONUT */}
            <div className="h-24 w-full flex items-center gap-4">
               <div className="h-20 w-20">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={portfolioData} innerRadius={25} outerRadius={35} paddingAngle={5} dataKey="value">
                        {portfolioData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                 </ResponsiveContainer>
               </div>
               <div className="text-[10px] text-gray-400 space-y-1">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f7931a]"/> BTC 30%</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00ff9d]"/> SOL 40%</div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN (TERMINAL) */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl h-[400px] flex flex-col relative">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-[#00ff9d]" />
                <span className="text-[10px] font-mono text-[#00ff9d] tracking-widest uppercase">AI Logic Stream • Live</span>
              </div>
              <div className="flex gap-2">
                <Pause size={12} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setIsAutoScroll(!isAutoScroll)}/>
                <Trash2 size={12} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setLogs([])}/>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1 scrollbar-hide">
              {logs.length === 0 && (
                <div className="text-gray-700 italic text-center mt-32">Initialize Neural Handshake...</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 rounded">
                  <span className="text-gray-600 opacity-50 min-w-[60px]">{log.timestamp}</span>
                  <span className={`font-bold tracking-tight min-w-[80px] ${getLogStyle(log.type)}`}>
                    [{log.type}]
                  </span>
                  <span className="text-gray-400">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
               <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">Risk Guard</div>
                  <Shield size={14} className="text-yellow-500" />
               </div>
               {/* ⚠️ UPDATED TO 12x LEVERAGE FOR WAR MODE */}
               <div className="text-2xl font-mono font-bold text-white">12x</div>
               <div className="w-full bg-white/10 h-1 mt-2 rounded-full"><div className="bg-yellow-500 h-1 w-3/5 rounded-full"/></div>
            </div>

            <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/20 rounded-xl p-4 flex flex-col justify-center items-center text-center">
              <div className="text-[#00ff9d] font-bold text-sm tracking-wider flex items-center gap-2">
                <Zap size={14} className="animate-pulse" /> ACTIVE
              </div>
              <div className="text-[10px] text-[#00ff9d]/60 mt-1">Strategy: Momentum / Volatility</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
