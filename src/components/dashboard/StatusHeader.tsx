import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Wifi, Brain, Shield, Activity } from "lucide-react";

interface StatusHeaderProps {
  isConnected?: boolean;
}

export function StatusHeader({ isConnected = true }: StatusHeaderProps) {
  const [apiLatency, setApiLatency] = useState(25);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const offsetRef = useRef(0);

  // Simulate fluctuating latency
  useEffect(() => {
    const interval = setInterval(() => {
      setApiLatency(prev => {
        const change = Math.floor((Math.random() - 0.5) * 8);
        const newLatency = prev + change;
        return Math.max(15, Math.min(45, newLatency));
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Animated heartbeat line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    const generateHeartbeatPoint = (x: number, phase: number): number => {
      const normalizedX = ((x + phase) % 80) / 80;
      
      // R spike (main peak)
      if (normalizedX >= 0.2 && normalizedX < 0.3) {
        const t = (normalizedX - 0.2) / 0.1;
        return Math.sin(t * Math.PI) * 8;
      }
      // Small recovery
      if (normalizedX >= 0.35 && normalizedX < 0.45) {
        const t = (normalizedX - 0.35) / 0.1;
        return Math.sin(t * Math.PI) * 3;
      }
      
      return 0;
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Create gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(0, 255, 157, 0.1)');
      gradient.addColorStop(0.5, 'rgba(0, 255, 157, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 255, 157, 0.3)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ff9d';
      ctx.shadowBlur = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const y = centerY - generateHeartbeatPoint(x, offsetRef.current);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();

      offsetRef.current += 0.8;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative border-b border-border/50 bg-background/80 backdrop-blur-md">
      {/* Main Status Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          {/* WEEX API Status */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Wifi className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-sans">WEEX API:</span>
            <div className="flex items-center gap-1.5">
              <motion.span
                animate={{ 
                  boxShadow: ['0 0 4px rgba(0,255,157,0.5)', '0 0 8px rgba(0,255,157,0.8)', '0 0 4px rgba(0,255,157,0.5)']
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative flex h-2 w-2"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </motion.span>
              <span className="text-xs font-medium text-primary">
                Connected ({apiLatency}ms)
              </span>
            </div>
          </motion.div>

          {/* AI Engine Status */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <Brain className="w-3.5 h-3.5 text-terminal-purple" />
            <span className="text-xs text-muted-foreground font-sans">AI Engine:</span>
            <span className="text-xs font-bold text-terminal-purple uppercase tracking-wide">ONLINE</span>
          </motion.div>

          {/* Risk Guard Status */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <Shield className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs text-muted-foreground font-sans">Risk Guard:</span>
            <span className="text-xs font-bold text-warning uppercase tracking-wide">ACTIVE</span>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
            <Activity className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-primary uppercase">System Healthy</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Nexus-7 v2.1.0
          </span>
        </motion.div>
      </div>

      {/* Animated Heartbeat Line */}
      <div className="relative h-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1200}
          height={16}
          className="w-full h-full opacity-60"
        />
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}