import { useState, useEffect } from "react";
import { TradingSidebar } from "@/components/dashboard/TradingSidebar";
import { PulseLineChart } from "@/components/dashboard/PulseLineChart";
import { AILogStream } from "@/components/dashboard/AILogStream";
import { ActiveStrategies } from "@/components/dashboard/ActiveStrategies";
import { WalletPnL } from "@/components/dashboard/WalletPnL";
import { RiskMatrix } from "@/components/dashboard/RiskMatrix";
import { AudioControls } from "@/components/dashboard/AudioControls";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { RiskManagerWidget } from "@/components/dashboard/RiskManagerWidget";
import { useTradeSignals } from "@/hooks/useTradeSignals";

const Index = () => {
  const [activeSection, setActiveSection] = useState("markets");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [sessionTime, setSessionTime] = useState(0);

  const { logs, isConnected } = useTradeSignals({ 
    audioEnabled, 
    audioVolume 
  });

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <TradingSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Status Bar - Heartbeat Header */}
        <StatusBar />
        
        <main className="flex-1 p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Nexus-7 <span className="text-primary text-glow-profit">GlassBox</span> Terminal
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visualizing AI trading decisions in real-time • WEEX Alpha Awakens
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AudioControls
                enabled={audioEnabled}
                volume={audioVolume}
                onEnabledChange={setAudioEnabled}
                onVolumeChange={setAudioVolume}
              />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isConnected ? 'LIVE' : 'CONNECTING'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Session</p>
                <p className="text-sm font-medium text-foreground tabular-nums">{formatTime(sessionTime)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PulseLineChart 
                symbol="BTC/USDT" 
                basePrice={67421.50} 
                volatility={0.0008}
                isOpportunity={false}
              />
              <PulseLineChart 
                symbol="SOL/USDT" 
                basePrice={146.20} 
                volatility={0.003}
                isOpportunity={true}
              />
            </div>

            {/* AI Logic Stream */}
            <div className="h-80">
              <AILogStream externalLogs={logs} />
            </div>
          </div>

          {/* Right Column - Stats & Info */}
          <div className="space-y-6">
            <WalletPnL />
            <RiskManagerWidget />
            <RiskMatrix />
            <ActiveStrategies />
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
