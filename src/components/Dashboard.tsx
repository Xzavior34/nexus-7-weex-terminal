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

// --- VISUAL CHART DATA ---
// Keeps the "flowing" chart look active
const sparklineData = Array.from({ length: 40 }, (_, i) => ({
  value: 50 + Math.random() * 30
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
    active ? 'bg-[#00ff9d]/10 border-[#00ff9d]/20 text-[#00ff9d]' : 'bg-red-500/10 border-red-500/30 text-red-400'
  } text-xs font-mono backdrop-blur-md shadow-[0_0_10px_rgba(0,255,157,0.1)]`}>
    <Icon size={12} className={active ? "animate-pulse" : ""} />
    <span>{label}</span>
  </div>
);

// 🔥 RESTORED: DEEP BLACK GLASS CARDS
const MarketCard = ({ symbol, price, change, isPositive, isGlow }: { symbol: string, price: string, change: string, isPositive: boolean, isGlow?: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    // REMOVED GREY BORDERS, ADDED DEEP BLACK GLASS
    className={`relative overflow-hidden rounded-xl p-5 backdrop-blur-xl transition-all h-48 flex flex-col justify-between group
      ${isGlow 
        ? 'bg-black border border-[#00ff9d]/50 shadow-[0_0_30px_rgba(0,255,157,0.15)]' 
        : 'bg-white/5 border border-white/5 hover:border-white/20'
      }`}
  >
    {/* Chart in Background */}
    <div className="absolute inset-x-0 bottom-0 h-32 opacity-30 group-hover:opacity-50 transition-opacity">
       <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparklineData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={isPositive ? "#00ff9d" : "#ff3b30"} 
            strokeWidth={3} 
            dot={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* Subtle Gradient for Depth */}
    <div className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80`} />

    <div className="relative z-10 flex justify-between items-start">
      <div>
        <h3 className="text-gray-400 text-xs font-bold tracking-widest mb-1">{symbol}</h3>
        <div className="text-3xl font-mono font-bold text-white tracking-tighter drop-shadow-lg">{price}</div>
      </div>
      <div className={`text-xs font-bold px-2 py-1 rounded border ${isPositive ? 'bg-[#00ff9d]/10 border-[#00ff9d]/20 text-[#00ff9d]' : 'bg-red-500/10 border-red-500/20 text-[#ff3b30]'}`}>
        {change}
      </div>
    </div>
    
    <div className="relative z-10 text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-auto flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-[#00ff9d] animate-pulse' : 'bg-red-500'}`} />
      Live Feed
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  // --- REAL-TIME PRICES STATE ---
  const [solPrice, setSolPrice] = useState(134.10); 
  const [btcPrice, setBtcPrice] = useState(89793.69);
  const [ethPrice, setEthPrice] = useState(3101.76);
  const [dogePrice, setDogePrice] = useState(0.1397);

  useEffect(() => {
    // ✅ REAL CONNECTION
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
        if (data.price) {
            const sym = data.symbol.replace("/", "").replace("_", "");
            if (sym.includes("SOL")) setSolPrice(data.price);
            if (sym.includes("BTC")) setBtcPrice(data.price);
            if (sym.includes("ETH")) setEthPrice(data.price);
            if (sym.includes("DOGE")) setDogePrice(data.price);
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
    // 🔥 REMOVED GRAIN BACKGROUND. RESTORED DEEP BLACK GRADIENT.
    <div className="min-h-screen bg-[#050505] bg-gradient-to-b from-black via-[#0a0a0a] to-[#050505] text-white font-sans selection:bg-[#00ff9d] selection:text-black pb-10">
      
      {/* HEADER */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_15px] ${isConnected ? 'bg-[#00ff9d] shadow-[#00ff9d]' : 'bg-red-500 shadow-red-500'}`} />
            <h1 className="font-bold tracking-wider text-xl">NEXUS-7 <span className="text-gray-500 text-xs font-normal ml-2 font-mono">v2.1 FINAL</span></h1>
          </div>
          
          <div className="flex gap-3">
            <StatusBadge icon={Wifi} label={isConnected ? "API: 25ms" : "API: OFF"} active={isConnected} />
            <StatusBadge icon={Cpu} label="AI: HUNTER" />
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#00ff9d]/30 to-transparent" />
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="space-y-8">
          <section className="grid grid-cols-2 gap-4">
            <MarketCard symbol="BTC/USDT" price={`$${btcPrice.toLocaleString()}`} change="+0.4%" isPositive={true} />
            <MarketCard symbol="SOL/USDT" price={`$${solPrice.toFixed(2)}`} change="+8.01%" isPositive={true} isGlow={true} />
            <MarketCard symbol="ETH/USDT" price={`$${ethPrice.toLocaleString()}`} change="-0.4%" isPositive={false} />
            <MarketCard symbol="DOGE/USDT" price={`$${dogePrice.toFixed(4)}`} change="+12.5%" isPositive={true} />
          </section>

          {/* Wallet Widget - CLEAN BLACK LOOK */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/40 border border-white/5 rounded-xl p-6 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#00ff9d]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"/>
            
            <div className="flex items-center gap-2 mb-4 text-gray-400 uppercase text-xs tracking-widest font-bold">
              <Wallet size={14} /> Wallet & PnL
            </div>
            <div className="mb-6">
              <div className="text-4xl font-mono font-bold tracking-tighter text-white">$25,847.50</div>
              <div className="text-[#00ff9d] text-sm font-mono mt-1 font-bold shadow-green-500/20">+$1,240.65 (Active)</div>
            </div>
            
            <div className="h-28 w-full flex items-center gap-6">
               <div className="h-24 w-24 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={portfolioData} innerRadius={30} outerRadius={40} paddingAngle={5} dataKey="value" stroke="none">
                        {portfolioData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    HODL
                 </div>
               </div>
               <div className="text-xs text-gray-400 space-y-2 font-mono">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f7931a]"/> BTC 30%</div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00ff9d] shadow-[0_0_8px_#00ff9d]"/> SOL 40%</div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN (TERMINAL) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl h-[500px] flex flex-col relative group">
            {/* Terminal Glow Line */}
            <div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00ff9d]/50 to-transparent opacity-50" />
            
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#00ff9d]" />
                <span className="text-xs font-mono text-[#00ff9d] tracking-widest uppercase shadow-[#00ff9d]">AI Logic Stream • Live</span>
              </div>
              <div className="flex gap-2">
                <Pause size={14} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setIsAutoScroll(!isAutoScroll)}/>
                <Trash2 size={14} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setLogs([])}/>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 font-mono text-xs leading-loose space-y-1 scrollbar-hide bg-black/50">
              {logs.length === 0 && (
                <div className="text-gray-700 italic text-center mt-40">Initialize Neural Handshake...</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 hover:bg-white/5 px-2 rounded py-0.5 border-l-2 border-transparent hover:border-[#00ff9d]/50 transition-colors">
                  <span className="text-gray-600 opacity-50 min-w-[60px]">{log.timestamp}</span>
                  <span className={`font-bold tracking-tight min-w-[90px] ${getLogStyle(log.type)}`}>
                    [{log.type}]
                  </span>
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-black/40 border border-white/10 rounded-xl p-5 relative overflow-hidden">
               <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Risk Guard</div>
                  <Shield size={16} className="text-yellow-500" />
               </div>
               <div className="text-3xl font-mono font-bold text-white">12x</div>
               <div className="w-full bg-white/10 h-1.5 mt-3 rounded-full overflow-hidden">
                 <div className="bg-yellow-500 h-full w-3/5 rounded-full shadow-[0_0_10px_orange]" />
               </div>
            </div>

            <div className="bg-[#00ff9d]/5 border border-[#00ff9d]/20 rounded-xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[#00ff9d]/5 blur-xl"></div>
              <div className="relative z-10 text-[#00ff9d] font-bold text-sm tracking-wider flex items-center gap-2">
                <Zap size={16} className="animate-pulse" /> ACTIVE
              </div>
              <div className="relative z-10 text-xs text-[#00ff9d]/70 mt-1 font-mono">Strategy: Momentum / Volatility</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
