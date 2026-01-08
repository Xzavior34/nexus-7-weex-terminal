import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";

export function RiskManagerPro() {
  const currentLeverage = 5;
  const maxLeverage = 20;
  const leveragePercent = (currentLeverage / maxLeverage) * 100;

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
            <p className="text-xs text-muted-foreground">Competition Compliance</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle2 className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase">Compliant</span>
        </div>
      </div>

      {/* Leverage Gauge */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground font-sans">Current Leverage</span>
          <motion.span
            key={currentLeverage}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-foreground"
          >
            {currentLeverage}x
          </motion.span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${leveragePercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, hsl(157, 100%, 50%) 0%, hsl(38, 100%, 50%) 100%)`,
              boxShadow: '0 0 20px rgba(0, 255, 157, 0.4)',
            }}
          />
          {/* Glow effect */}
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${leveragePercent}%`,
              background: 'linear-gradient(90deg, transparent 70%, rgba(255,255,255,0.3) 100%)',
            }}
          />
          {/* Markers */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-px h-2 bg-white/20" />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">0x</span>
          <div className="flex items-center gap-1 text-warning">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px] font-bold">{maxLeverage}x (Competition Cap)</span>
          </div>
        </div>

        {/* Risk Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="p-3 rounded-xl bg-background/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Max Position</p>
            <p className="text-lg font-bold text-foreground mt-1">5%</p>
            <p className="text-[10px] text-muted-foreground">of portfolio</p>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-sans">Max Drawdown</p>
            <p className="text-lg font-bold text-foreground mt-1">10%</p>
            <p className="text-[10px] text-muted-foreground">limit set</p>
          </div>
        </div>

        {/* Compliance Status */}
        <motion.div
          animate={{ 
            boxShadow: ['0 0 10px rgba(0,255,157,0.2)', '0 0 20px rgba(0,255,157,0.3)', '0 0 10px rgba(0,255,157,0.2)']
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-5 p-4 rounded-xl bg-primary/10 border border-primary/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            <span className="text-sm font-bold text-primary">
              ✓ Anti-Gambling Rules Compliant
            </span>
          </div>
          <p className="text-xs text-muted-foreground ml-4">
            All trades follow WEEX hackathon risk management guidelines
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}