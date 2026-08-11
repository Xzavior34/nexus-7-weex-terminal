import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { StatusHeader } from "@/components/dashboard/StatusHeader";
import { LiveMarketCard } from "@/components/dashboard/LiveMarketCard";
import { AILogStreamPro } from "@/components/dashboard/AILogStreamPro";
import { WalletPnLPro } from "@/components/dashboard/WalletPnLPro";
import { RiskManagerPro } from "@/components/dashboard/RiskManagerPro";
import { TradingHeartbeat } from "@/components/dashboard/TradingHeartbeat";
import { AudioControls } from "@/components/dashboard/AudioControls";
import { ApiConfigModal } from "@/components/dashboard/ApiConfigModal";
import { useEngineData } from "@/hooks/useEngineData";
import { useLivePrices } from "@/hooks/useLivePrices";
import { computeDailyLossUsedPct } from "@/lib/engineApi";
import { Key, Settings, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";

const Index = () => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [sessionTime, setSessionTime] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerTrade = async () => {
    setIsTriggering(true);
    try {
      await api.triggerTrade("BTC/USDT", "LONG");
      refetch();
    } catch (e: any) {
      console.error("Trigger trade failed:", e);
    } finally {
      setIsTriggering(false);
    }
  };


  const {
    status,
    positions,
    decisions,
    equityCurve,
    logs,
    isConnected,
    isWakingUp,
    isUnauthorized,
    lastError,
    refetch,
  } = useEngineData({ audioEnabled, audioVolume });

  const symbols = status?.config?.pairs ?? ["BTC/USDT", "ETH/USDT"];
  const livePrices = useLivePrices(symbols);

  const currentPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [symbol, state] of Object.entries(livePrices)) {
      map[symbol] = state.currentPrice;
    }
    return map;
  }, [livePrices]);

  const dailyLossUsedPct = useMemo(
    () => computeDailyLossUsedPct(equityCurve, status?.config?.max_daily_loss_pct ?? 0),
    [equityCurve, status]
  );

  const recentDecisionRate = useMemo(() => {
    if (decisions.length === 0) return 20;
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recentCount = decisions.filter((d) => new Date(d.ts).getTime() >= fiveMinAgo).length;
    return Math.min(20 + recentCount * 15, 100);
  }, [decisions]);

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

  const currentEquity =
    status?.last_equity ??
    status?.last_equity_usd ??
    status?.equity ??
    status?.balance ??
    status?.usdt_balance ??
    (isConnected ? 10000.0 : null);


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
                Transparent AI trading decisions • Binance Spot Testnet + Gemini
              </p>
              {isUnauthorized ? (
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-destructive font-semibold">
                    🚨 Authentication Error: Missing or invalid Bearer token (HTTP 401).
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsConfigOpen(true)}
                    className="h-6 px-2 text-[11px] border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <Key className="w-3 h-3 mr-1" />
                    Configure API Token
                  </Button>
                </div>
              ) : isWakingUp ? (
                <p className="text-xs text-amber-400 mt-1 font-medium animate-pulse">
                  ⚡ Connecting to Engine... (Render backend waking up from sleep ~30s)
                </p>
              ) : lastError ? (
                <p className="text-xs text-destructive mt-1">Engine connection error: {lastError}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-4">
              <AudioControls
                enabled={audioEnabled}
                volume={audioVolume}
                onEnabledChange={setAudioEnabled}
                onVolumeChange={setAudioVolume}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(true)}
                className="gap-1.5 border-border/60 hover:bg-secondary/50 text-xs font-medium"
              >
                <Settings className="w-3.5 h-3.5 text-primary" />
                API Settings
              </Button>
              <Button
                size="sm"
                onClick={handleTriggerTrade}
                disabled={isTriggering}
                className="gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 text-xs font-bold shadow-[0_0_15px_rgba(0,255,157,0.2)] transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-primary text-primary" />
                {isTriggering ? "Opening Trade..." : "▶ Start Instant Trade"}
              </Button>

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-primary" : isUnauthorized ? "bg-destructive" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`text-sm font-bold ${
                    isConnected ? "text-primary" : isUnauthorized ? "text-destructive" : "text-amber-400"
                  }`}
                >
                  {isConnected
                    ? (status?.status ?? "LIVE").toString().toUpperCase()
                    : isWakingUp
                    ? "CONNECTING..."
                    : isUnauthorized
                    ? "UNAUTHORIZED (401)"
                    : "CONNECTING"}
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
              {symbols.slice(0, 2).map((symbol) => {
                const feed = livePrices[symbol];
                if (!feed) {
                  return (
                    <div
                      key={symbol}
                      className="p-5 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-center h-[168px] text-xs text-muted-foreground"
                    >
                      Loading {symbol} price feed...
                    </div>
                  );
                }
                return (
                  <LiveMarketCard
                    key={symbol}
                    symbol={symbol}
                    basePrice={feed.history[0]?.price ?? feed.currentPrice}
                    isActive={!!positions[symbol]}
                    liveHistory={feed.history}
                    liveCurrentPrice={feed.currentPrice}
                  />
                );
              })}
            </div>

            {/* Trading Heartbeat */}
            <TradingHeartbeat activityLevel={recentDecisionRate} isConnected={isConnected} />

            {/* AI Logic Stream - The GlassBox Feature */}
            <div className="h-[400px]">
              <AILogStreamPro externalLogs={logs} />
            </div>
          </div>

          {/* Right Column - Wallet & Risk */}
          <div className="lg:col-span-4 space-y-6">
            <WalletPnLPro
              equityUsd={currentEquity}
              positions={positions}
              livePrices={currentPriceMap}
              isConnected={isConnected}
            />
            <RiskManagerPro status={status} dailyLossUsedPct={dailyLossUsedPct} />
          </div>
        </div>
      </main>

      {/* API Configuration Modal */}
      <ApiConfigModal
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        onConfigSaved={refetch}
      />
    </div>
  );
};

export default Index;
