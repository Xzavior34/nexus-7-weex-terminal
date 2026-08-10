import { Shield, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function RiskManagerWidget() {
  const currentLeverage = 5;
  const maxLeverage = 20;
  const leveragePercent = (currentLeverage / maxLeverage) * 100;

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-terminal-yellow/10">
          <Shield className="w-4 h-4 text-terminal-yellow" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Risk Manager</h3>
          <p className="text-xs text-muted-foreground">Competition Compliance</p>
        </div>
      </div>

      {/* Leverage Gauge */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Current Leverage</span>
          <span className="font-bold text-foreground">{currentLeverage}x</span>
        </div>

        <div className="relative">
          <Progress 
            value={leveragePercent} 
            className="h-3 bg-muted"
          />
          {/* Gauge markers */}
          <div className="absolute inset-0 flex items-center justify-between px-0.5">
            <span className="sr-only">0x</span>
            <span className="sr-only">{maxLeverage}x</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">0x</span>
          <div className="flex items-center gap-1 text-terminal-yellow">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-medium">{maxLeverage}x (Competition Cap)</span>
          </div>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary">
            ✓ Anti-Gambling Rules Compliant
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-4">
          Max position: 5% of portfolio • Max drawdown: 10%
        </p>
      </div>
    </div>
  );
}
