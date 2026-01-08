// FILE: src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Terminal, Activity, Shield, Wallet, Pause, Trash2, Zap, Wifi, Cpu } from 'lucide-react';
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

// --- COMPONENTS ---
const StatusBadge = ({ icon: Icon, label, active = true }: { icon: any, label: string, active?: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
    active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
  } text-xs font-mono backdrop-blur-md`}>
    <Icon size={12} className={active ? "animate-pulse" : ""} />
    <span>{label}</span>
  </div>
);

const MarketCard = ({ symbol, price, change, isPositive }: { symbol: string, price: string, change: string, isPositive: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden bg-black/40 border border-white/10 rounded-xl p-5 backdrop-blur-md hover:border-[#00ff9d]/30 transition-all"
  >
    <div className="absolute top-0 right-0 p-4 opacity-10">
      <Activity size={48} className="text-[#00ff9d]" />
    </div>
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{symbol}</h3>
        <div className="text-2xl font-mono font-bold text-white tracking-tight">{price}</div>
      </div>
      <div className={`text-sm font-mono px-2 py-1 rounded ${isPositive ? 'bg-green-500/20 text-[#00ff9d]' : 'bg-red-500/20 text-[#ff3b30]'}`}>
        {change}
      </div>
    </div>
    <div className="h-16 w-full opacity-50">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparklineData}>
          <Line type="monotone" dataKey="value" stroke={isPositive ? "#00ff9d" : "#ff3b30"} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Real-Time Data States
  const [solPrice, setSolPrice] = useState(145.20);
  const [btcPrice, setBtcPrice] = useState(67309.93);
  const [isConnected, setIsConnected] = useState(false);

  // --- WEBSOCKET CONNECTION ---
  useEffect(() => {
    // ✅ I ADDED YOUR EXACT RENDER LINK HERE:
    const wsUrl = "wss://nexus-7-weex-terminal.onrender.com/ws/stream"; 
    
    console.log("Attempting connection to:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      addLog("WEEX_API", "CONNECTED: Secure WebSocket link established.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 1. Add the log to the screen
        addLog(data.type, data.message);

        // 2. If the backend sends a price, update the screen
        if (data.price && data.symbol === "SOL/USDT") {
          setSolPrice(data.price);
        }
      } catch (e) {
        console.error("Data Parse Error", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog("RISK_CHECK", "DISCONNECTED: Connection lost. Retrying...");
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      addLog("RISK_CHECK", "ERROR: Could not reach Render server.");
    };

    return () => ws.close();
  }, []);

  // Auto-scroll logic
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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#00ff9d] selection:text-black pb-10">
      
      {/* HEADER */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_10px] ${isConnected ? 'bg-[#00ff9d] shadow-[#00ff9d]' : 'bg-red-500 shadow-red-500'}`} />
            <h1 className="font-bold tracking-wider text-lg">NEXUS-7 <span className="text-gray-500 text-xs font-normal ml-2">v2.1.0</span></h1>
          </div>
          
          <div className="hidden md:flex gap-4">
            <StatusBadge icon={Wifi} label={isConnected ? "WEEX API: CONNECTED" : "WEEX API: DISCONNECTED"} active={isConnected} />
            <StatusBadge icon={Cpu} label="AI Engine: ONLINE" />
            <StatusBadge icon={Shield} label="Risk Guard: ACTIVE" />
          </div>
        </div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#00ff9d]/50 to-transparent opacity-50" />
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4">
            <MarketCard symbol="BTC/USDT" price={`$${btcPrice.toLocaleString()}`} change="+2.4%" isPositive={true} />
            <MarketCard symbol="SOL/USDT" price={`$${solPrice.toFixed(2)}`} change="+1.2%" isPositive={true} />
          </section>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 text-gray-400 uppercase text-xs tracking-wider">
              <Wallet size={14} /> Wallet & PnL
            </div>
            <div className="mb-6">
              <div className="text-3xl font-mono font-bold">$25,847.50</div>
              <div className="text-[#00ff9d] text-sm font-mono mt-1">+$124.65 (Unrealized PnL)</div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="font-bold text-white">BTC/USDT</span>
                <span className="font-mono text-[#00ff9d]">+0.93%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-white">ETH/USDT</span>
                <span className="font-mono text-red-400">-0.07%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN (THE TERMINAL) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-black/60 border border-white/10 rounded-xl overflow-hidden shadow-2xl h-[500px] flex flex-col relative">
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#00ff9d]" />
                <span className="text-xs font-mono text-[#00ff9d] tracking-wider">AI LOGIC STREAM • LIVE</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsAutoScroll(!isAutoScroll)} className="p-1.5 hover:bg-white/10 rounded text-gray-400">
                  <Pause size={14} className={!isAutoScroll ? "text-[#00ff9d]" : ""} />
                </button>
                <button onClick={() => setLogs([])} className="p-1.5 hover:bg-white/10 rounded text-gray-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <AnimatePresence>
                {logs.length === 0 && (
                  <div className="text-gray-600 italic text-center mt-20">Waiting for AI Neural Interface...<br/>Connecting to: {isConnected ? "Connected" : "Connecting..."}</div>
                )}
                {logs.map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 border-l-2 border-transparent hover:border-white/10 pl-2 py-0.5"
                  >
                    <span className="text-gray-600 min-w-[70px]">{log.timestamp}</span>
                    <span className={`font-bold min-w-[100px] ${getLogStyle(log.type)}`}>
                      [{log.type}]
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/40 border border-white/10 rounded-xl p-5 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-bl-full -mr-4 -mt-4" />
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-yellow-500" />
                <h3 className="text-sm font-bold text-gray-200">Risk Manager</h3>
              </div>
              <div className="text-xs text-gray-400 mb-4">Competition Compliance Mode</div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-xs text-gray-500">Current Leverage</span>
                <span className="text-xl font-mono font-bold text-white">5x</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-[25%]" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#00ff9d]/5 border border-[#00ff9d]/20 rounded-xl p-5 backdrop-blur-md flex flex-col justify-center items-center text-center">
              <Zap size={24} className="text-[#00ff9d] mb-2 animate-pulse" />
              <div className="text-[#00ff9d] font-bold text-lg">Active Strategy</div>
              <div className="text-xs text-[#00ff9d]/70">Arbitrage / Trend Following</div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}
