import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { LiveMarketCard } from "@/components/dashboard/LiveMarketCard";
import { AILogStreamPro } from "@/components/dashboard/AILogStreamPro";
import { WalletPnLPro } from "@/components/dashboard/WalletPnLPro";
import { RiskManagerPro } from "@/components/dashboard/RiskManagerPro";
import { TradingHeartbeat } from "@/components/dashboard/TradingHeartbeat";
import { AudioControls } from "@/components/dashboard/AudioControls";
import { useTradeSignals } from "@/hooks/useTradeSignals";

const Index = () => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [sessionTime, setSessionTime] = useState(0);

  const { logs, isConnected } = useTradeSignals({
    audioEnabled,
    audioVolume,
  });

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Status Header with Heartbeat */}
      <StatusHeader isConnected={isConnected} />

      {/* Main Content */}
      <main className="p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight font-sans">
                Nexus-7{" "}
                <span className="text-primary drop-shadow-[0_0_20px_rgba(0,255,157,0.5)]">
                  GlassBox
                </span>{" "}
                Terminal
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Transparent AI trading decisions • WEEX Alpha Awakens Hackathon
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AudioControls
                enabled={audioEnabled}
                volume={audioVolume}
                onEnabledChange={setAudioEnabled}
                onVolumeChange={setAudioVolume}
              />
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
                <span className="text-sm font-bold text-primary">
                  {isConnected ? "LIVE" : "CONNECTING"}
                </span>
              </div>
              <div className="text-right px-4 py-2 rounded-xl bg-secondary/50 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Session
                </p>
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {formatTime(sessionTime)}
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Market Cards & Logs */}
          <div className="lg:col-span-8 space-y-6">
            {/* Live Market Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LiveMarketCard
                symbol="BTC/USDT"
                basePrice={67309.93}
                volatility={0.0006}
                isActive={false}
              />
              <LiveMarketCard
                symbol="SOL/USDT"
                basePrice={146.2}
                volatility={0.002}
                isActive={true}
              />
            </div>

            {/* Trading Heartbeat */}
            <TradingHeartbeat activityLevel={72} isConnected={isConnected} />

            {/* AI Logic Stream - The GlassBox Feature */}
            <div className="h-[400px]">
              <AILogStreamPro externalLogs={logs} />
            </div>
          </div>

          {/* Right Column - Wallet & Risk */}
          <div className="lg:col-span-4 space-y-6">
            <WalletPnLPro />
            <RiskManagerPro />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;