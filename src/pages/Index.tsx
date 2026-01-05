import { useState } from "react";
import { TradingSidebar } from "@/components/dashboard/TradingSidebar";
import { PulseLineChart } from "@/components/dashboard/PulseLineChart";
import { AILogStream } from "@/components/dashboard/AILogStream";
import { ActiveStrategies } from "@/components/dashboard/ActiveStrategies";
import { WalletPnL } from "@/components/dashboard/WalletPnL";

const Index = () => {
  const [activeSection, setActiveSection] = useState("markets");

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <TradingSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">LIVE</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Session</p>
                <p className="text-sm font-medium text-foreground tabular-nums">00:42:17</p>
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
              <AILogStream />
            </div>
          </div>

          {/* Right Column - Stats & Info */}
          <div className="space-y-6">
            <WalletPnL />
            <ActiveStrategies />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
