import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AssetRisk {
  symbol: string;
  exposure: number; // 0-100 percentage
  leverage: number;
  pnl: number;
  volatility: number; // 0-1
}

const mockAssets: AssetRisk[] = [
  { symbol: "BTC", exposure: 45, leverage: 3, pnl: 2.4, volatility: 0.3 },
  { symbol: "SOL", exposure: 28, leverage: 5, pnl: -1.2, volatility: 0.7 },
  { symbol: "ETH", exposure: 15, leverage: 2, pnl: 0.8, volatility: 0.25 },
  { symbol: "ADA", exposure: 8, leverage: 4, pnl: 3.1, volatility: 0.5 },
  { symbol: "DOGE", exposure: 4, leverage: 2, pnl: -0.5, volatility: 0.9 },
];

const getRiskColor = (exposure: number, volatility: number): string => {
  const riskScore = (exposure / 100) * volatility;
  
  if (riskScore > 0.3) return "from-risk/80 to-risk/40";
  if (riskScore > 0.15) return "from-amber-500/80 to-amber-500/40";
  return "from-profit/80 to-profit/40";
};

const getExposureHeight = (exposure: number): string => {
  return `${Math.max(exposure, 10)}%`;
};

export const RiskMatrix = () => {
  const [assets, setAssets] = useState<AssetRisk[]>(mockAssets);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prev => prev.map(asset => ({
        ...asset,
        exposure: Math.max(5, Math.min(60, asset.exposure + (Math.random() - 0.5) * 5)),
        volatility: Math.max(0.1, Math.min(1, asset.volatility + (Math.random() - 0.5) * 0.1)),
        pnl: asset.pnl + (Math.random() - 0.5) * 0.3,
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const totalExposure = assets.reduce((sum, a) => sum + a.exposure, 0);
  const avgLeverage = assets.reduce((sum, a) => sum + a.leverage, 0) / assets.length;

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Risk Matrix</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            Total: <span className="text-foreground font-medium">{totalExposure.toFixed(0)}%</span>
          </span>
          <span className="text-muted-foreground">
            Avg Lev: <span className="text-foreground font-medium">{avgLeverage.toFixed(1)}x</span>
          </span>
        </div>
      </div>

      {/* Heatmap Bars */}
      <div className="flex items-end gap-2 h-32 mb-4">
        {assets.map((asset) => (
          <div
            key={asset.symbol}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
            onMouseEnter={() => setHoveredAsset(asset.symbol)}
            onMouseLeave={() => setHoveredAsset(null)}
          >
            {/* Bar */}
            <div className="w-full flex items-end justify-center h-24">
              <div
                className={cn(
                  "w-full max-w-[40px] rounded-t-md bg-gradient-to-t transition-all duration-700 ease-out",
                  getRiskColor(asset.exposure, asset.volatility),
                  hoveredAsset === asset.symbol && "ring-2 ring-primary/50 scale-105"
                )}
                style={{ 
                  height: getExposureHeight(asset.exposure),
                  boxShadow: hoveredAsset === asset.symbol 
                    ? `0 0 20px ${asset.volatility > 0.5 ? 'hsl(var(--risk))' : 'hsl(var(--profit))'}` 
                    : 'none'
                }}
              >
                {/* Shimmer effect */}
                <div className="w-full h-full rounded-t-md overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
            
            {/* Label */}
            <span className={cn(
              "text-xs font-medium transition-colors",
              hoveredAsset === asset.symbol ? "text-primary" : "text-muted-foreground"
            )}>
              {asset.symbol}
            </span>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {hoveredAsset && (
        <div className="p-3 rounded-lg bg-background/50 border border-border/30 animate-slide-up">
          {(() => {
            const asset = assets.find(a => a.symbol === hoveredAsset);
            if (!asset) return null;
            return (
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Exposure</p>
                  <p className="font-medium text-foreground">{asset.exposure.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leverage</p>
                  <p className="font-medium text-foreground">{asset.leverage}x</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PnL</p>
                  <p className={cn(
                    "font-medium",
                    asset.pnl >= 0 ? "text-profit" : "text-risk"
                  )}>
                    {asset.pnl >= 0 ? "+" : ""}{asset.pnl.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Volatility</p>
                  <p className={cn(
                    "font-medium",
                    asset.volatility > 0.6 ? "text-risk" : asset.volatility > 0.3 ? "text-amber-500" : "text-profit"
                  )}>
                    {(asset.volatility * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Risk Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-profit/40 to-profit/80" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-amber-500/40 to-amber-500/80" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-risk/40 to-risk/80" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
};
