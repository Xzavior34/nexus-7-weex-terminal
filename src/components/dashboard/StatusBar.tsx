import { useState, useEffect } from "react";
import { Wifi, Brain, Shield } from "lucide-react";

export function StatusBar() {
  const [apiLatency, setApiLatency] = useState(34);

  // Simulate fluctuating latency
  useEffect(() => {
    const interval = setInterval(() => {
      setApiLatency(prev => {
        const change = Math.floor((Math.random() - 0.5) * 10);
        const newLatency = prev + change;
        return Math.max(18, Math.min(62, newLatency));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-2 bg-secondary/50 border-b border-border">
      <div className="flex items-center gap-6">
        {/* API Status */}
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">WEEX API:</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Connected ({apiLatency}ms)
          </span>
        </div>

        {/* AI Engine */}
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-terminal-purple" />
          <span className="text-xs text-muted-foreground">AI Engine:</span>
          <span className="text-xs font-medium text-terminal-purple">ONLINE</span>
        </div>

        {/* Risk Guard */}
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-terminal-yellow" />
          <span className="text-xs text-muted-foreground">Risk Guard:</span>
          <span className="text-xs font-medium text-terminal-yellow">ACTIVE</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Nexus-7 v2.1.0 • WEEX Hackathon 2025
      </div>
    </div>
  );
}
