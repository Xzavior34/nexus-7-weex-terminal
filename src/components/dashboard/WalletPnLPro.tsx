import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

export function WalletPnLPro() {
  const totalPnL = mockPositions.reduce((acc, pos) => acc + pos.pnl, 0);
  const isPositive = totalPnL >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground font-sans">Wallet & PnL</h3>
            <p className="text-xs text-muted-foreground">WEEX Competition</p>
          </div>
        </div>
        <motion.div
          animate={{ 
            boxShadow: isPositive 
              ? ['0 0 10px rgba(0,255,157,0.3)', '0 0 20px rgba(0,255,157,0.5)', '0 0 10px rgba(0,255,157,0.3)']
              : ['0 0 10px rgba(255,59,48,0.3)', '0 0 20px rgba(255,59,48,0.5)', '0 0 10px rgba(255,59,48,0.3)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl",
            isPositive ? "bg-primary/20" : "bg-destructive/20"
          )}
        >
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
        </motion.div>
      </div>

      {/* Balance Overview */}
      <div className="p-5 border-b border-border/50 bg-secondary/20">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1 font-sans">Total Balance</p>
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold text-foreground tracking-tight"
          >
            $25,847.50
          </motion.p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-background/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Available</p>
            <p className="text-sm font-bold text-foreground mt-1">$18,420.30</p>
          </div>
          <div className="p-3 rounded-xl bg-background/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">In Positions</p>
            <p className="text-sm font-bold text-foreground mt-1">$7,427.20</p>
          </div>
          <div className="p-3 rounded-xl bg-background/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Unrealized</p>
            <p className={cn(
              "text-sm font-bold mt-1",
              isPositive ? "text-primary" : "text-destructive"
            )}>
              {isPositive ? "+" : ""}${totalPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="p-5">
        <p className="text-xs text-muted-foreground mb-4 font-sans">
          Open Positions ({mockPositions.length})
        </p>
        <div className="space-y-3">
          {mockPositions.map((position, index) => {
            const posPositive = position.pnl >= 0;
            return (
              <motion.div
                key={position.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  posPositive 
                    ? "bg-primary/5 border-primary/20 hover:border-primary/40" 
                    : "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs",
                    posPositive ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                  )}>
                    {position.symbol.split('/')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{position.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {position.size} @ ${position.entryPrice.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {posPositive ? (
                      <TrendingUp className="w-3 h-3 text-primary" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <p className={cn(
                      "text-sm font-bold",
                      posPositive ? "text-primary" : "text-destructive"
                    )}>
                      {posPositive ? "+" : ""}${position.pnl.toFixed(2)}
                    </p>
                  </div>
                  <p className={cn(
                    "text-xs",
                    posPositive ? "text-primary/80" : "text-destructive/80"
                  )}>
                    {posPositive ? "+" : ""}{position.pnlPercent.toFixed(2)}%
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}