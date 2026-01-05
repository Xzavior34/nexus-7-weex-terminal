import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Position {
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

const mockPositions: Position[] = [
  { symbol: "BTC/USDT", size: 0.15, entryPrice: 66800, currentPrice: 67421, pnl: 93.15, pnlPercent: 0.93 },
  { symbol: "SOL/USDT", size: 25, entryPrice: 143.50, currentPrice: 146.20, pnl: 67.50, pnlPercent: 1.88 },
  { symbol: "ETH/USDT", size: 1.2, entryPrice: 3450, currentPrice: 3420, pnl: -36.00, pnlPercent: -0.87 },
];

export function WalletPnL() {
  const totalPnL = mockPositions.reduce((acc, pos) => acc + pos.pnl, 0);
  const isPositive = totalPnL >= 0;

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Wallet & PnL</span>
        </div>
        <span className="text-xs text-muted-foreground">WEEX Competition</span>
      </div>

      {/* Balance Overview */}
      <div className="p-4 border-b border-border bg-secondary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
            <p className="text-2xl font-bold text-foreground">$25,847.50</p>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-3 py-1.5 rounded-lg",
            isPositive ? "bg-primary/20" : "bg-destructive/20"
          )}>
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4 text-primary" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-destructive" />
            )}
            <span className={cn(
              "text-sm font-bold",
              isPositive ? "text-primary" : "text-destructive"
            )}>
              {isPositive ? "+" : ""}${totalPnL.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-sm font-medium text-foreground">$18,420.30</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">In Positions</p>
            <p className="text-sm font-medium text-foreground">$7,427.20</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unrealized PnL</p>
            <p className={cn(
              "text-sm font-medium",
              isPositive ? "text-primary" : "text-destructive"
            )}>
              {isPositive ? "+" : ""}${totalPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3">Open Positions ({mockPositions.length})</p>
        <div className="space-y-3">
          {mockPositions.map((position) => {
            const posPositive = position.pnl >= 0;
            return (
              <div 
                key={position.symbol}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                    posPositive ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                  )}>
                    {position.symbol.split('/')[0].slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{position.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      Size: {position.size} @ ${position.entryPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    posPositive ? "text-primary" : "text-destructive"
                  )}>
                    {posPositive ? "+" : ""}${position.pnl.toFixed(2)}
                  </p>
                  <p className={cn(
                    "text-xs",
                    posPositive ? "text-primary" : "text-destructive"
                  )}>
                    {posPositive ? "+" : ""}{position.pnlPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
