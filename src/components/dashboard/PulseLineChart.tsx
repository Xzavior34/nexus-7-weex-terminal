import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";

interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

interface PulseLineChartProps {
  symbol: string;
  basePrice: number;
  volatility?: number;
  isOpportunity?: boolean;
}

export function PulseLineChart({ 
  symbol, 
  basePrice, 
  volatility = 0.002,
  isOpportunity = false 
}: PulseLineChartProps) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(basePrice);
  const [priceChange, setPriceChange] = useState(0);

  // Generate initial data
  useEffect(() => {
    const initialData: PricePoint[] = [];
    let price = basePrice;
    
    for (let i = 60; i >= 0; i--) {
      const change = (Math.random() - 0.5) * basePrice * volatility;
      price += change;
      const time = new Date(Date.now() - i * 1000);
      initialData.push({
        time: time.toLocaleTimeString('en-US', { hour12: false }),
        price: Number(price.toFixed(2)),
        volume: Math.random() * 1000000,
      });
    }
    setData(initialData);
    setCurrentPrice(price);
  }, [basePrice, volatility]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const lastPrice = prev[prev.length - 1]?.price || basePrice;
        const change = (Math.random() - 0.5) * basePrice * volatility;
        const newPrice = lastPrice + change;
        const time = new Date();
        
        setCurrentPrice(newPrice);
        setPriceChange(((newPrice - basePrice) / basePrice) * 100);

        const newData = [
          ...prev.slice(1),
          {
            time: time.toLocaleTimeString('en-US', { hour12: false }),
            price: Number(newPrice.toFixed(2)),
            volume: Math.random() * 1000000,
          },
        ];
        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [basePrice, volatility]);

  const isPositive = priceChange >= 0;
  const minPrice = useMemo(() => Math.min(...data.map(d => d.price)), [data]);
  const maxPrice = useMemo(() => Math.max(...data.map(d => d.price)), [data]);

  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl bg-card border border-border transition-all duration-500",
        isOpportunity && "pulse-opportunity gradient-border-profit"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
            isPositive ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
          )}>
            {symbol.split('/')[0].slice(0, 3)}
          </div>
          <div>
            <h3 className="font-bold text-foreground">{symbol}</h3>
            <p className="text-xs text-muted-foreground">WEEX Spot</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={cn(
            "text-xl font-bold tabular-nums",
            isPositive ? "text-primary text-glow-profit" : "text-destructive text-glow-risk"
          )}>
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={cn(
            "flex items-center justify-end gap-1 text-sm font-medium",
            isPositive ? "text-primary" : "text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Opportunity Indicator */}
      {isOpportunity && (
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold animate-pulse">
          <Zap className="w-3 h-3" />
          OPPORTUNITY
        </div>
      )}

      {/* Chart with Gradient Scan */}
      <div className="h-48 relative overflow-hidden">
        {/* Gradient scan animation overlay */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="gradient-scan-line" />
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={isPositive ? "hsl(145, 100%, 45%)" : "hsl(348, 100%, 55%)"} 
                  stopOpacity={0.3}
                />
                <stop 
                  offset="95%" 
                  stopColor={isPositive ? "hsl(145, 100%, 45%)" : "hsl(348, 100%, 55%)"} 
                  stopOpacity={0}
                />
              </linearGradient>
              <filter id={`glow-${symbol}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[minPrice * 0.999, maxPrice * 1.001]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 10 }}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 5%)',
                border: '1px solid hsl(0, 0%, 15%)',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: 'hsl(0, 0%, 55%)' }}
              itemStyle={{ color: isPositive ? 'hsl(145, 100%, 45%)' : 'hsl(348, 100%, 55%)' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
            />
            <ReferenceLine 
              y={basePrice} 
              stroke="hsl(0, 0%, 30%)" 
              strokeDasharray="3 3" 
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "hsl(145, 100%, 45%)" : "hsl(348, 100%, 55%)"}
              strokeWidth={2}
              dot={false}
              fill={`url(#gradient-${symbol})`}
              filter={isOpportunity ? `url(#glow-${symbol})` : undefined}
              className={isOpportunity ? "animate-glow-line" : ""}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">24h High</p>
          <p className="text-sm font-medium text-foreground">${(basePrice * 1.03).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">24h Low</p>
          <p className="text-sm font-medium text-foreground">${(basePrice * 0.97).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="text-sm font-medium text-foreground">$1.2B</p>
        </div>
      </div>
    </div>
  );
}
