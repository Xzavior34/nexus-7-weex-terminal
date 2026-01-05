import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Terminal, Pause, Play, Trash2 } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "API" | "AI" | "RISK" | "EXEC" | "SYSTEM" | "api" | "ai" | "risk" | "execution" | "system";
  message: string;
}

interface AILogStreamProps {
  externalLogs?: LogEntry[];
}

const LOG_TYPES = {
  API: { color: "text-terminal-cyan", prefix: "[WEEX-API]", bgColor: "bg-terminal-cyan/10" },
  AI: { color: "text-terminal-purple", prefix: "[AI-MODEL]", bgColor: "bg-terminal-purple/10" },
  RISK: { color: "text-terminal-yellow", prefix: "[RISK-GUARD]", bgColor: "bg-terminal-yellow/10" },
  EXEC: { color: "text-primary", prefix: "[EXECUTION]", bgColor: "bg-primary/10" },
  SYSTEM: { color: "text-muted-foreground", prefix: "[SYSTEM]", bgColor: "bg-muted/10" },
  api: { color: "text-terminal-cyan", prefix: "[WEEX-API]", bgColor: "bg-terminal-cyan/10" },
  ai: { color: "text-terminal-purple", prefix: "[AI-MODEL]", bgColor: "bg-terminal-purple/10" },
  risk: { color: "text-terminal-yellow", prefix: "[RISK-GUARD]", bgColor: "bg-terminal-yellow/10" },
  execution: { color: "text-primary", prefix: "[EXECUTION]", bgColor: "bg-primary/10" },
  system: { color: "text-muted-foreground", prefix: "[SYSTEM]", bgColor: "bg-muted/10" },
};

const MOCK_MESSAGES: Omit<LogEntry, "id" | "timestamp">[] = [
  { type: "SYSTEM", message: "Nexus-7 GlassBox Terminal initialized..." },
  { type: "API", message: "Connecting to WEEX WebSocket feed..." },
  { type: "API", message: "Fetching order book for BTC/USDT..." },
  { type: "AI", message: "Loading sentiment model v3.2.1..." },
  { type: "AI", message: "Analyzing 24h price action patterns..." },
  { type: "AI", message: "Sentiment analysis: Bullish (confidence: 0.89)" },
  { type: "RISK", message: "Portfolio exposure check: PASSED" },
  { type: "RISK", message: "Leverage capped at 5x (Competition Rule Compliance)" },
  { type: "API", message: "Fetching order book for SOL/USDT..." },
  { type: "AI", message: "SOL momentum score: +2.4 std dev above mean" },
  { type: "AI", message: "Detecting breakout pattern on 15m timeframe..." },
  { type: "EXEC", message: "Signal generated: LONG SOL/USDT" },
  { type: "RISK", message: "Position size calculated: 0.5% of portfolio" },
  { type: "EXEC", message: "Placing LIMIT BUY @ $145.20..." },
  { type: "API", message: "Order confirmed: ID #WX-2024-88291" },
  { type: "SYSTEM", message: "Take profit set @ $152.80 (+5.2%)" },
  { type: "SYSTEM", message: "Stop loss set @ $141.40 (-2.6%)" },
  { type: "AI", message: "Monitoring for exit signals..." },
  { type: "API", message: "Price update: BTC $67,421.50 (+0.3%)" },
  { type: "AI", message: "Correlation matrix updated across 15 pairs" },
  { type: "RISK", message: "Drawdown check: 0.8% (Max allowed: 10%)" },
  { type: "API", message: "Fetching funding rates..." },
  { type: "AI", message: "Funding rate arbitrage opportunity detected" },
  { type: "EXEC", message: "Queuing hedge position on perpetual..." },
];

export function AILogStream({ externalLogs = [] }: AILogStreamProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Merge external logs
  useEffect(() => {
    if (externalLogs.length > 0) {
      const mappedLogs = externalLogs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false }),
      }));
      setLogs(prev => {
        const combined = [...prev, ...mappedLogs.filter(l => !prev.some(p => p.id === l.id))];
        return combined.slice(-50);
      });
    }
  }, [externalLogs]);

  // Add new log entries periodically
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const mockMessage = MOCK_MESSAGES[messageIndex % MOCK_MESSAGES.length];
      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        ...mockMessage,
      };
      
      setLogs((prev) => [...prev.slice(-50), newLog]); // Keep last 50 logs
      setMessageIndex((prev) => prev + 1);
    }, 800 + Math.random() * 1200); // Random interval for realism

    return () => clearInterval(interval);
  }, [isPaused, messageIndex]);

  // Auto-scroll to bottom
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
    <div className="flex flex-col h-full rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Terminal className="w-4 h-4 text-primary" />
            {!isPaused && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            )}
          </div>
          <span className="font-bold text-sm text-foreground">AI Logic Stream</span>
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary/20 text-primary">
            {isPaused ? "PAUSED" : "LIVE"}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-primary" />
            ) : (
              <Pause className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Log Stream */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar bg-background/50"
        style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Waiting for trading signals...
          </div>
        ) : (
          logs.map((log, index) => {
            const typeConfig = LOG_TYPES[log.type];
            const isLatest = index === logs.length - 1;
            
            return (
              <div
                key={log.id}
                className={cn(
                  "flex items-start gap-2 py-1.5 px-2 rounded transition-all duration-300",
                  isLatest && "animate-fade-in-up",
                  isLatest && typeConfig.bgColor
                )}
              >
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {log.timestamp}
                </span>
                <span className={cn("text-xs font-bold shrink-0", typeConfig.color)}>
                  {typeConfig.prefix}
                </span>
                <span 
                  className={cn(
                    "text-xs text-foreground",
                    isLatest && log.type === "EXEC" && "text-glow-profit"
                  )}
                >
                  {log.message}
                  {isLatest && <span className="animate-cursor ml-0.5">_</span>}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-secondary/30">
        <span className="text-xs text-muted-foreground">
          {logs.length} entries • Last 60 seconds
        </span>
        <span className="text-xs text-muted-foreground">
          Model: <span className="text-foreground">Nexus-7 v2.1</span>
        </span>
      </div>
    </div>
  );
}
