import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Zap, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface PricePoint {
  price: number;
  time: number;
}

interface LiveMarketCardProps {
  symbol: string;
  basePrice: number;
  volatility?: number;
  isActive?: boolean;
  priceUpdate?: number | null;
}

export function LiveMarketCard({
  symbol,
  basePrice,
  volatility = 0.001,
  isActive = false,
  priceUpdate,
}: LiveMarketCardProps) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(basePrice);
  const [prevPrice, setPrevPrice] = useState(basePrice);
  const [priceChange, setPriceChange] = useState(0);

  // Generate initial sparkline data
  useEffect(() => {
    const initialData: PricePoint[] = [];
    let price = basePrice;

    for (let i = 30; i >= 0; i--) {
      const change = (Math.random() - 0.5) * basePrice * volatility * 2;
      price += change;
      initialData.push({
        price: Number(price.toFixed(2)),
        time: Date.now() - i * 2000,
      });
    }
    setData(initialData);
    setCurrentPrice(price);
    setPrevPrice(price);
  }, [basePrice, volatility]);

  // Handle external price updates
  useEffect(() => {
    if (priceUpdate !== null && priceUpdate !== undefined) {
      setPrevPrice(currentPrice);
      setCurrentPrice(priceUpdate);
      setPriceChange(((priceUpdate - basePrice) / basePrice) * 100);
      setData((prev) => [
        ...prev.slice(1),
        { price: priceUpdate, time: Date.now() },
      ]);
    }
  }, [priceUpdate]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const lastPrice = prev[prev.length - 1]?.price || basePrice;
        const change = (Math.random() - 0.5) * basePrice * volatility * 2;
        const newPrice = lastPrice + change;

        setPrevPrice(currentPrice);
        setCurrentPrice(newPrice);
        setPriceChange(((newPrice - basePrice) / basePrice) * 100);

        return [
          ...prev.slice(1),
          { price: Number(newPrice.toFixed(2)), time: Date.now() },
        ];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [basePrice, volatility, currentPrice]);

  const isPositive = priceChange >= 0;
  const priceDirection = currentPrice > prevPrice ? "up" : currentPrice < prevPrice ? "down" : "none";
  
  const { minPrice, maxPrice } = useMemo(() => ({
    minPrice: Math.min(...data.map(d => d.price)),
    maxPrice: Math.max(...data.map(d => d.price)),
  }), [data]);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(4);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative p-5 rounded-2xl border transition-all duration-500 overflow-hidden",
        "bg-card/80 backdrop-blur-md",
        isActive 
          ? "border-primary/50 shadow-[0_0_40px_rgba(0,255,157,0.15)]" 
          : "border-border/50 hover:border-primary/30",
      )}
    >
      {/* Glow effect behind active asset */}
      {isActive && (
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, hsl(157 100% 50% / 0.2) 0%, transparent 60%)',
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ 
              boxShadow: isActive 
                ? ['0 0 20px rgba(0,255,157,0.3)', '0 0 40px rgba(0,255,157,0.5)', '0 0 20px rgba(0,255,157,0.3)']
                : '0 0 0px transparent'
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm",
              isPositive ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
            )}
          >
            {symbol.split('/')[0]}
          </motion.div>
          <div>
            <h3 className="font-bold text-lg text-foreground font-sans">{symbol}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">WEEX Spot</span>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium"
                >
                  <Zap className="w-2.5 h-2.5" />
                  HOT
                </motion.span>
              )}
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-primary"
          />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Price Display */}
      <div className="relative z-10 mb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPrice.toFixed(2)}
            initial={{ 
              opacity: 0.5, 
              y: priceDirection === "up" ? 10 : priceDirection === "down" ? -10 : 0 
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "text-3xl font-bold tabular-nums tracking-tight",
              isPositive ? "text-primary" : "text-destructive",
              isActive && isPositive && "drop-shadow-[0_0_20px_rgba(0,255,157,0.5)]",
              isActive && !isPositive && "drop-shadow-[0_0_20px_rgba(255,59,48,0.5)]"
            )}
          >
            ${formatPrice(currentPrice)}
          </motion.div>
        </AnimatePresence>

        <motion.div
          animate={{ 
            color: isPositive ? 'hsl(157, 100%, 50%)' : 'hsl(4, 100%, 59%)'
          }}
          className="flex items-center gap-1.5 mt-1"
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="text-sm font-semibold">
            {isPositive ? "+" : ""}{priceChange.toFixed(3)}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">24h</span>
        </motion.div>
      </div>

      {/* Sparkline Chart */}
      <div className="h-16 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id={`sparkline-gradient-${symbol}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isPositive ? "hsl(157, 100%, 50%)" : "hsl(4, 100%, 59%)"} stopOpacity={0.2} />
                <stop offset="100%" stopColor={isPositive ? "hsl(157, 100%, 50%)" : "hsl(4, 100%, 59%)"} stopOpacity={1} />
              </linearGradient>
              <filter id={`sparkline-glow-${symbol}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <YAxis domain={[minPrice * 0.9995, maxPrice * 1.0005]} hide />
            <Line
              type="monotone"
              dataKey="price"
              stroke={`url(#sparkline-gradient-${symbol})`}
              strokeWidth={2}
              dot={false}
              filter={`url(#sparkline-glow-${symbol})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 relative z-10">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Vol: $1.2B</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">${(basePrice * 1.02).toLocaleString()}</span>
          <span className="mx-1">/</span>
          <span className="text-foreground font-medium">${(basePrice * 0.98).toLocaleString()}</span>
          <span className="ml-1 text-muted-foreground">H/L</span>
        </div>
      </div>
    </motion.div>
  );
}