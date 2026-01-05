import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Pause, Play, Settings, Zap } from "lucide-react";

interface Strategy {
  id: string;
  name: string;
  pair: string;
  status: "active" | "paused" | "waiting";
  pnl: number;
  pnlPercent: number;
  trades: number;
  winRate: number;
}

const mockStrategies: Strategy[] = [
  {
    id: "1",
    name: "Momentum Breakout",
    pair: "BTC/USDT",
    status: "active",
    pnl: 1245.80,
    pnlPercent: 4.2,
    trades: 23,
    winRate: 78,
  },
  {
    id: "2",
    name: "Mean Reversion",
    pair: "SOL/USDT",
    status: "active",
    pnl: 892.50,
    pnlPercent: 2.8,
    trades: 45,
    winRate: 65,
  },
  {
    id: "3",
    name: "Funding Arb",
    pair: "ETH/USDT",
    status: "waiting",
    pnl: -124.30,
    pnlPercent: -0.4,
    trades: 12,
    winRate: 58,
  },
];

const STATUS_CONFIG = {
  active: { 
    label: "ACTIVE", 
    color: "text-primary", 
    bg: "bg-primary/20",
    dot: "bg-primary animate-pulse"
  },
  paused: { 
    label: "PAUSED", 
    color: "text-terminal-yellow", 
    bg: "bg-terminal-yellow/20",
    dot: "bg-terminal-yellow"
  },
  waiting: { 
    label: "WAITING", 
    color: "text-terminal-cyan", 
    bg: "bg-terminal-cyan/20",
    dot: "bg-terminal-cyan animate-pulse"
  },
};

export function ActiveStrategies() {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Active Strategies</span>
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary/20 text-primary">
            {mockStrategies.filter(s => s.status === "active").length} Running
          </span>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Strategy List */}
      <div className="divide-y divide-border">
        {mockStrategies.map((strategy) => {
          const isPositive = strategy.pnl >= 0;
          const statusConfig = STATUS_CONFIG[strategy.status];
          
          return (
            <div 
              key={strategy.id}
              className="p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-foreground">{strategy.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{strategy.pair}</span>
                    <span className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded",
                      statusConfig.bg, statusConfig.color
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dot)} />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={cn(
                    "flex items-center gap-1 text-lg font-bold",
                    isPositive ? "text-primary" : "text-destructive"
                  )}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    ${Math.abs(strategy.pnl).toLocaleString()}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isPositive ? "text-primary" : "text-destructive"
                  )}>
                    {isPositive ? "+" : ""}{strategy.pnlPercent}%
                  </span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Trades: </span>
                    <span className="text-foreground font-medium">{strategy.trades}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Win Rate: </span>
                    <span className={cn(
                      "font-medium",
                      strategy.winRate >= 60 ? "text-primary" : "text-destructive"
                    )}>
                      {strategy.winRate}%
                    </span>
                  </div>
                </div>
                
                <button className="p-1 rounded hover:bg-accent transition-colors">
                  {strategy.status === "active" ? (
                    <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
