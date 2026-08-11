import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { EnginePosition } from "@/lib/engineApi";

export interface DisplayPosition {
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface WalletPnLProProps {
  equityUsd: number | null;
  positions?: Record<string, EnginePosition> | null;
  livePrices?: Record<string, number> | null;
  isConnected: boolean;
}

function toDisplayPositions(
  positions?: Record<string, EnginePosition> | null,
  livePrices?: Record<string, number> | null
): DisplayPosition[] {
  if (!positions || typeof positions !== "object") return [];
  const prices = livePrices || {};
  return Object.values(positions)
    .filter((p): p is EnginePosition => !!p && typeof p === "object" && !!p.symbol && p.symbol.toUpperCase() !== "UNKNOWN")
    .map((p) => {
      const entryPrice = p.entry_price ?? 0;
      const quantity = p.quantity ?? 0;
      const currentPrice = prices[p.symbol] ?? entryPrice;
      const pnl = (currentPrice - entryPrice) * quantity;
      const pnlPercent = entryPrice && quantity ? (pnl / (entryPrice * quantity)) * 100 : 0;
      return {
        symbol: p.symbol,
        size: quantity,
        entryPrice,
        currentPrice,
        pnl,
        pnlPercent,
      };
    });
}

export function WalletPnLPro({ equityUsd, positions, livePrices, isConnected }: WalletPnLProProps) {
  const displayPositions = toDisplayPositions(positions, livePrices);
  const unrealizedPnL = displayPositions.reduce((acc, pos) => acc + (pos.pnl || 0), 0);
  const inPositionsUsd = displayPositions.reduce((acc, pos) => acc + (pos.size || 0) * (pos.currentPrice || 0), 0);
  const availableUsd = equityUsd !== null && equityUsd !== undefined ? Math.max(equityUsd - inPositionsUsd, 0) : null;
  const isPositive = unrealizedPnL >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 overflow-hidden font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground font-sans">Wallet & PnL</h3>
            <p className="text-xs text-muted-foreground">Binance Spot Testnet</p>
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
            {isPositive ? "+" : ""}${unrealizedPnL.toFixed(2)}
          </span>
        </motion.div>
      </div>

      {/* Balance Overview */}
      <div className="p-5 border-b border-border/50 bg-secondary/20">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1 font-sans">Total Equity (USDT)</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            ${(equityUsd ?? 10000.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-background/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Available</p>
            <p className="text-sm font-bold text-foreground mt-1">
              ${(availableUsd ?? 10000.0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-background/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">In Positions</p>
            <p className="text-sm font-bold text-foreground mt-1">
              ${inPositionsUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-background/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Unrealized</p>
            <p className={cn(
              "text-sm font-bold mt-1",
              isPositive ? "text-primary" : "text-destructive"
            )}>
              {isPositive ? "+" : ""}${unrealizedPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground font-sans">
            Open Positions ({displayPositions.length})
          </p>
          {displayPositions.length === 0 && isConnected && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Scanning Setups
            </span>
          )}
        </div>

        {displayPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border/60 bg-secondary/10 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-foreground font-sans">
              0 Active Positions
            </p>
            <p className="text-[11px] text-muted-foreground max-w-[260px] leading-relaxed">
              {isConnected
                ? "Engine is monitoring market signals. Orders will trigger automatically when high-probability setups execute."
                : "Connecting to trading engine feed..."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayPositions.map((position, index) => {
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
        )}
      </div>
    </motion.div>
  );
}
