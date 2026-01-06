import { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";

interface TradingHeartbeatProps {
  activityLevel?: number; // 0-100
  isConnected?: boolean;
}

export const TradingHeartbeat = ({ 
  activityLevel = 50, 
  isConnected = true 
}: TradingHeartbeatProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bpm, setBpm] = useState(72);
  const animationRef = useRef<number>();
  const offsetRef = useRef(0);

  // Generate ECG waveform points
  const generateECGPoint = (x: number, phase: number): number => {
    const normalizedX = ((x + phase) % 100) / 100;
    
    // P wave (small bump)
    if (normalizedX >= 0.1 && normalizedX < 0.15) {
      const t = (normalizedX - 0.1) / 0.05;
      return Math.sin(t * Math.PI) * 8;
    }
    // Q dip
    if (normalizedX >= 0.2 && normalizedX < 0.22) {
      const t = (normalizedX - 0.2) / 0.02;
      return -Math.sin(t * Math.PI) * 5;
    }
    // R spike (main peak)
    if (normalizedX >= 0.22 && normalizedX < 0.28) {
      const t = (normalizedX - 0.22) / 0.06;
      const spike = Math.sin(t * Math.PI);
      return spike * 35 * (isConnected ? 1 : 0.3);
    }
    // S dip
    if (normalizedX >= 0.28 && normalizedX < 0.32) {
      const t = (normalizedX - 0.28) / 0.04;
      return -Math.sin(t * Math.PI) * 10;
    }
    // T wave (recovery bump)
    if (normalizedX >= 0.4 && normalizedX < 0.5) {
      const t = (normalizedX - 0.4) / 0.1;
      return Math.sin(t * Math.PI) * 12;
    }
    
    return 0;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // Animation speed based on activity level
    const speed = 0.5 + (activityLevel / 100) * 1.5;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw grid lines (subtle)
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.1)';
      ctx.lineWidth = 0.5;
      for (let y = 0; y < height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let x = 0; x < width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Main ECG line with glow
      ctx.shadowColor = isConnected ? '#00E676' : '#666';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = isConnected ? '#00E676' : '#666';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const phase = offsetRef.current;
        const y = centerY - generateECGPoint(x * 0.5, phase);
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();

      // Leading dot
      const leadX = width - 20;
      const leadY = centerY - generateECGPoint(leadX * 0.5, offsetRef.current);
      
      ctx.beginPath();
      ctx.arc(leadX, leadY, 4, 0, Math.PI * 2);
      ctx.fillStyle = isConnected ? '#00E676' : '#666';
      ctx.shadowBlur = 15;
      ctx.fill();

      offsetRef.current += speed;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activityLevel, isConnected]);

  // Update BPM based on activity
  useEffect(() => {
    const baseBpm = 60 + Math.floor(activityLevel * 0.6);
    const variance = Math.floor(Math.random() * 8) - 4;
    setBpm(baseBpm + variance);
    
    const interval = setInterval(() => {
      const newVariance = Math.floor(Math.random() * 8) - 4;
      setBpm(baseBpm + newVariance);
    }, 2000);

    return () => clearInterval(interval);
  }, [activityLevel]);

  return (
    <div className="relative h-16 bg-card/50 border border-border/50 rounded-lg overflow-hidden backdrop-blur-sm">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: isConnected 
            ? 'radial-gradient(ellipse at center, rgba(0, 230, 118, 0.2) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(100, 100, 100, 0.2) 0%, transparent 70%)'
        }}
      />
      
      {/* ECG Canvas */}
      <canvas
        ref={canvasRef}
        width={300}
        height={64}
        className="w-full h-full"
      />
      
      {/* BPM Display */}
      <div className="absolute top-1 left-2 flex items-center gap-1.5">
        <Activity className={`w-3 h-3 ${isConnected ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <span className="text-[10px] font-mono text-muted-foreground">TRADING PULSE</span>
      </div>
      
      <div className="absolute top-1 right-2 flex items-center gap-1">
        <span className={`text-sm font-bold tabular-nums ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
          {bpm}
        </span>
        <span className="text-[10px] text-muted-foreground">TPM</span>
      </div>
      
      {/* Activity indicator */}
      <div className="absolute bottom-1 right-2 flex items-center gap-1">
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                i < Math.ceil(activityLevel / 20)
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30'
              }`}
              style={{
                height: `${8 + i * 2}px`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
