import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Terminal, Pause, Play, Trash2, Wifi } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "AI-MODEL" | "WEEX-API" | "RISK" | "EXECUTION" | "SYSTEM" | "ai" | "api" | "execution" | "risk" | "system";
  message: string;
}

const mapLogType = (type: string): string => {
  const mapping: Record<string, string> = {
    "ai": "AI-MODEL",
    "api": "WEEX-API", 
    "execution": "EXECUTION",
    "risk": "RISK",
    "system": "SYSTEM",
  };
  return mapping[type] || type;
};

interface AILogStreamProProps {
  websocketUrl?: string;
  externalLogs?: LogEntry[];
}

const LOG_STYLES: Record<string, { color: string; prefix: string; glow: string }> = {
  "AI-MODEL": { 
    color: "text-terminal-purple", 
    prefix: "[AI-MODEL]",
    glow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
  },
  "WEEX-API": { 
    color: "text-terminal-cyan", 
    prefix: "[WEEX-API]",
    glow: "drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]"
  },
  "RISK": { 
    color: "text-warning", 
    prefix: "[RISK]",
    glow: "drop-shadow-[0_0_8px_rgba(255,165,0,0.5)]"
  },
  "EXECUTION": { 
    color: "text-primary", 
    prefix: "[EXECUTION]",
    glow: "drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]"
  },
  "SYSTEM": { 
    color: "text-muted-foreground", 
    prefix: "[SYSTEM]",
    glow: ""
  },
};

const DEMO_MESSAGES: Omit<LogEntry, "id" | "timestamp">[] = [
  { type: "SYSTEM", message: "Nexus-7 GlassBox Terminal v2.1.0 initialized..." },
  { type: "WEEX-API", message: "WebSocket connection established to WEEX servers" },
  { type: "WEEX-API", message: "Subscribing to BTC/USDT order book feed..." },
  { type: "AI-MODEL", message: "Neural network sentiment analyzer loaded (model: nexus-v3)" },
  { type: "AI-MODEL", message: "Processing 847 social signals from last 4 hours..." },
  { type: "AI-MODEL", message: "Sentiment score: BULLISH (confidence: 0.92)" },
  { type: "RISK", message: "Portfolio exposure scan initiated" },
  { type: "RISK", message: "Current leverage: 5x within 20x competition limit ✓" },
  { type: "WEEX-API", message: "Fetching SOL/USDT perpetual funding rate..." },
  { type: "AI-MODEL", message: "Momentum divergence detected on SOL 15m chart" },
  { type: "AI-MODEL", message: "Pattern recognition: Ascending triangle breakout imminent" },
  { type: "EXECUTION", message: "▶ Signal generated: LONG SOL/USDT @ $146.20" },
  { type: "RISK", message: "Position size: 0.5% of portfolio (within risk limits)" },
  { type: "EXECUTION", message: "▶ Order placed: LIMIT BUY 25 SOL @ $145.80" },
  { type: "WEEX-API", message: "Order acknowledged: ID #WX-2025-88291" },
  { type: "SYSTEM", message: "Setting TP: $152.80 (+5.2%) | SL: $141.40 (-2.6%)" },
  { type: "AI-MODEL", message: "Monitoring for exit signals on 3 active positions..." },
  { type: "WEEX-API", message: "Price tick: BTC $67,421.50 (+0.32%)" },
  { type: "AI-MODEL", message: "Cross-asset correlation analysis: 15 pairs scanned" },
  { type: "RISK", message: "Drawdown check: 0.8% (max allowed: 10%) ✓" },
  { type: "WEEX-API", message: "Fetching open interest data..." },
  { type: "AI-MODEL", message: "Funding rate arbitrage opportunity identified" },
  { type: "EXECUTION", message: "▶ Queuing hedge on BTC perpetual..." },
];

export function AILogStreamPro({ websocketUrl, externalLogs = [] }: AILogStreamProProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection
  useEffect(() => {
    if (!websocketUrl) {
      setIsConnected(true); // Demo mode
      return;
    }

    const connect = () => {
      try {
        wsRef.current = new WebSocket(websocketUrl);

        wsRef.current.onopen = () => {
          setIsConnected(true);
          addLog({ type: "SYSTEM", message: "Connected to backend stream" });
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type && data.message) {
              addLog(data);
            }
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
          }
        };

        wsRef.current.onclose = () => {
          setIsConnected(false);
          addLog({ type: "SYSTEM", message: "Connection closed. Reconnecting..." });
          setTimeout(connect, 3000);
        };

        wsRef.current.onerror = () => {
          setIsConnected(false);
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);
      }
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [websocketUrl]);

  const addLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ...entry,
    };
    setLogs((prev) => [...prev.slice(-100), newLog]);
  }, []);

  // Handle external logs
  useEffect(() => {
    if (externalLogs.length > 0) {
      externalLogs.forEach(log => {
        if (!logs.some(l => l.id === log.id)) {
          setLogs(prev => [...prev.slice(-100), log]);
        }
      });
    }
  }, [externalLogs]);

  // Demo mode: Add mock messages
  useEffect(() => {
    if (websocketUrl || isPaused) return;

    const interval = setInterval(() => {
      const mockMessage = DEMO_MESSAGES[messageIndex % DEMO_MESSAGES.length];
      addLog(mockMessage);
      setMessageIndex((prev) => prev + 1);
    }, 800 + Math.random() * 1000);

    return () => clearInterval(interval);
  }, [isPaused, messageIndex, websocketUrl, addLog]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const clearLogs = () => {
    setLogs([]);
    setMessageIndex(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-full rounded-2xl bg-background/50 border border-border/50 overflow-hidden backdrop-blur-md"
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(0,0,0,0.15)_1px,rgba(0,0,0,0.15)_2px)] opacity-30" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-primary/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Terminal className="w-4 h-4 text-primary" />
            {!isPaused && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full"
              />
            )}
          </div>
          <span className="font-bold text-sm text-primary font-sans">AI Logic Stream</span>
          <span className={cn(
            "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider",
            isPaused 
              ? "bg-muted text-muted-foreground" 
              : "bg-primary/20 text-primary border border-primary/30"
          )}>
            {isPaused ? "PAUSED" : "● STREAMING"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Wifi className={cn("w-3 h-3", isConnected ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px]", isConnected ? "text-primary" : "text-muted-foreground")}>
              {isConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors border border-primary/20"
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-primary" />
            ) : (
              <Pause className="w-4 h-4 text-primary/70" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearLogs}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors border border-primary/20"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
          </motion.button>
        </div>
      </div>

      {/* Log Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar relative z-10"
        style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-primary/50 text-sm">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              █
            </motion.span>
            <span className="ml-2">Awaiting neural signals...</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, index) => {
              const style = LOG_STYLES[mapLogType(log.type)] || LOG_STYLES["SYSTEM"];
              const isLatest = index === logs.length - 1;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex items-start gap-2 py-1 px-2 rounded-sm transition-colors",
                    isLatest && "bg-primary/5"
                  )}
                >
                  <span className="text-[11px] text-primary/40 shrink-0 tabular-nums">
                    {log.timestamp}
                  </span>
                  <span className={cn("text-[11px] font-bold shrink-0", style.color, isLatest && style.glow)}>
                    {style.prefix}
                  </span>
                  <TypewriterText
                    text={log.message}
                    isLatest={isLatest}
                    isExecution={log.type === "EXECUTION"}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-primary/20 bg-primary/5 relative z-10">
        <span className="text-[10px] text-primary/60">
          {logs.length} entries • {isPaused ? "PAUSED" : "LIVE"}
        </span>
        <span className="text-[10px] text-primary/60">
          <span className="text-primary">root@nexus-7</span>:~/glassbox $
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="ml-0.5"
          >
            _
          </motion.span>
        </span>
      </div>
    </motion.div>
  );
}

function TypewriterText({ 
  text, 
  isLatest, 
  isExecution 
}: { 
  text: string; 
  isLatest: boolean;
  isExecution: boolean;
}) {
  const [displayedText, setDisplayedText] = useState(isLatest ? "" : text);

  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(text);
      return;
    }

    let index = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [text, isLatest]);

  return (
    <span
      className={cn(
        "text-[11px] text-foreground/90",
        isExecution && "text-primary font-medium drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]"
      )}
    >
      {displayedText}
      {isLatest && displayedText.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-primary"
        >
          █
        </motion.span>
      )}
    </span>
  );
}