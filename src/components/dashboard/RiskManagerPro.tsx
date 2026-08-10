import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { EngineStatus } from "@/lib/engineApi";

interface RiskManagerProProps {
  status: EngineStatus | null;
  dailyLossUsedPct: number; // 0-100+, computed by the caller from equity curve
}

export function RiskManagerPro({ status, dailyLossUsedPct }: RiskManagerProProps) {
  const cfg = status?.config;
  const minConfidence = cfg?.min_confidence_score ?? 0;
  const clampedDailyLossPct = Math.min(Math.max(dailyLossUsedPct, 0), 100);
  const isHalted = status?.status === "halted";
  const isCompliant = !isHalted && clampedDailyLossPct < 90;

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
          <motion.div
            animate={{
              boxShadow: ['0 0 10px rgba(255,165,0,0.3)', '0 0 20px rgba(255,165,0,0.5)', '0 0 10px rgba(255,165,0,0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2 rounded-xl bg-warning/10"
          >
            <Shield className="w-5 h-5 text-warning" />
          </motion.div>
          <div>
            <h3 className="font-bold text-foreground font-sans">Risk Manager</h3>
            <p className="text-xs text-muted-foreground">Live engine risk config</p>
          </div>
        </div>
        <div className={
          isCompliant
            ? "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20"
            : "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-destructive/10 border border-destructive/20"
        }>
          {isCompliant ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <AlertTriangle className="w-3 h-3 text-destructive" />}
          <span className={isCompliant ? "text-[10px] font-bold text-primary uppercase" : "text-[10px] font-bold text-destructive uppercase"}>
            {isHalted ? "Halted" : isCompliant ? "Nominal" : "Near Limit"}
          </span>
        </div>
      </div>

      {/* Daily Loss Budget Gauge (replaces the old fake leverage gauge —
          this bot doesn't use leverage; the daily-loss circuit breaker is
          the risk control that actually matters day to day) */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground font-sans">Daily Loss Budget Used</span>
          <motion.span
            key={Math.round(clampedDailyLossPct)}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-foreground"
          >
            {clampedDailyLossPct.toFixed(1)}%
          </motion.span>
        </div>

        <div className="relative h-4 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedDailyLossPct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: clampedDailyLossPct > 80
                ? 'linear-gradient(90deg, hsl(38, 100%, 50%) 0%, hsl(4, 100%, 59%) 100%)'
                : 'linear-gradient(90deg, hsl(157, 100%, 50%) 0%, hsl(38, 100%, 50%) 100%)',
              boxShadow: '0 0 20px rgba(0, 255, 157, 0.4)',
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">0%</span>
          <div className="flex items-center gap-1 text-warning">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px] font-bold">100% = new entries blocked for the day</span>
          </div>
        </div>

        {/* Real risk config from the engine, not hardcoded numbers */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="p-3 rounded-xl bg-background/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Min AI Confidence</p>
            <p className="text-lg font-bold text-foreground mt-1">{cfg ? `${minConfidence}/100` : "—"}</p>
            <p className="text-[10px] text-muted-foreground">required to trade</p>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Open Positions</p>
            <p className="text-lg font-bold text-foreground mt-1">{status?.open_position_count ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">right now</p>
          </div>
        </div>

        {/* Compliance / status banner */}
        <motion.div
          animate={{
            boxShadow: isCompliant
              ? ['0 0 10px rgba(0,255,157,0.2)', '0 0 20px rgba(0,255,157,0.3)', '0 0 10px rgba(0,255,157,0.2)']
              : ['0 0 10px rgba(255,59,48,0.2)', '0 0 20px rgba(255,59,48,0.3)', '0 0 10px rgba(255,59,48,0.2)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className={
            isCompliant
              ? "mt-5 p-4 rounded-xl bg-primary/10 border border-primary/30"
              : "mt-5 p-4 rounded-xl bg-destructive/10 border border-destructive/30"
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className={isCompliant ? "w-2 h-2 rounded-full bg-primary" : "w-2 h-2 rounded-full bg-destructive"}
            />
            <span className={isCompliant ? "text-sm font-bold text-primary" : "text-sm font-bold text-destructive"}>
              {isHalted
                ? `⚠ Engine halted: ${status?.halt_reason ?? "unknown reason"}`
                : isCompliant
                ? "✓ Risk controls nominal"
                : "⚠ Approaching daily loss limit"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground ml-4">
            {status ? `Testnet: ${status.config.testnet ? "yes" : "NO — LIVE"} · Trading enabled: ${status.config.trading_enabled ? "yes" : "no"}` : "Waiting for engine connection..."}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
