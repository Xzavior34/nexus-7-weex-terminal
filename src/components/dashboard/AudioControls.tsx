import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";

interface AudioControlsProps {
  enabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}

export const AudioControls = ({ 
  enabled, 
  volume, 
  onEnabledChange, 
  onVolumeChange 
}: AudioControlsProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { playSound } = useAudioFeedback({ enabled, volume });

  const handleToggle = () => {
    const newEnabled = !enabled;
    onEnabledChange(newEnabled);
    if (newEnabled) {
      // Play a test sound when enabling
      setTimeout(() => playSound('success'), 100);
    }
  };

  return (
    <div 
      className="flex items-center gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleToggle}
        className={cn(
          "p-2 rounded-lg transition-all duration-200",
          enabled 
            ? "bg-primary/20 text-primary hover:bg-primary/30" 
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
        )}
        title={enabled ? "Mute audio feedback" : "Enable audio feedback"}
      >
        {enabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>
      
      {/* Volume slider - shows on hover */}
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isHovered ? "w-20 opacity-100" : "w-0 opacity-0"
      )}>
        <input
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          disabled={!enabled}
        />
      </div>
    </div>
  );
};
