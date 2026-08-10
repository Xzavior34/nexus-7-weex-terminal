import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { PieChart as PieChartIcon, TrendingUp } from "lucide-react";

interface AllocationData {
  name: string;
  symbol: string;
  value: number;
  allocation: number;
  change24h: number;
  color: string;
}

const portfolioData: AllocationData[] = [
  { name: "Bitcoin", symbol: "BTC", value: 15420, allocation: 45, change24h: 2.34, color: "hsl(35, 100%, 50%)" },
  { name: "Solana", symbol: "SOL", value: 8240, allocation: 24, change24h: 5.67, color: "hsl(280, 100%, 60%)" },
  { name: "Ethereum", symbol: "ETH", value: 6890, allocation: 20, change24h: -0.89, color: "hsl(220, 100%, 60%)" },
  { name: "USDT", symbol: "USDT", value: 3780, allocation: 11, change24h: 0.01, color: "hsl(145, 100%, 45%)" },
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0 0 12px ${fill})`,
          transition: "all 0.3s ease-out",
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        style={{ opacity: 0.4 }}
      />
    </g>
  );
};

export function PortfolioAllocation() {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const totalValue = portfolioData.reduce((sum, item) => sum + item.value, 0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <PieChartIcon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-sm text-foreground">Portfolio Allocation</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
          <TrendingUp className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-primary">+3.24%</span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Pie Chart */}
          <div className="relative w-36 h-36 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  style={{ outline: "none" }}
                >
                  {portfolioData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="transparent"
                      style={{
                        filter: activeIndex === index ? `drop-shadow(0 0 8px ${entry.color})` : "none",
                        transition: "filter 0.3s ease",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-foreground">
                ${(totalValue / 1000).toFixed(1)}K
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {portfolioData.map((item, index) => (
              <div 
                key={item.symbol}
                className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                  activeIndex === index 
                    ? "bg-secondary/80 scale-[1.02]" 
                    : "bg-secondary/30 hover:bg-secondary/50"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      boxShadow: activeIndex === index ? `0 0 8px ${item.color}` : "none",
                    }}
                  />
                  <div>
                    <span className="text-xs font-medium text-foreground">{item.symbol}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{item.allocation}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-foreground">
                    ${item.value.toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-medium ${
                    item.change24h >= 0 ? "text-primary" : "text-destructive"
                  }`}>
                    {item.change24h >= 0 ? "+" : ""}{item.change24h}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-px bg-border">
        <div className="bg-card p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assets</p>
          <p className="text-sm font-bold text-foreground">{portfolioData.length}</p>
        </div>
        <div className="bg-card p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Diversification</p>
          <p className="text-sm font-bold text-primary">Optimal</p>
        </div>
        <div className="bg-card p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Score</p>
          <p className="text-sm font-bold text-terminal-yellow">Medium</p>
        </div>
      </div>
    </div>
  );
}
