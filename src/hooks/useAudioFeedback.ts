import { useCallback, useRef, useEffect } from "react";

type SoundType = 'trade' | 'opportunity' | 'alert' | 'success' | 'error' | 'tick';

interface AudioConfig {
  enabled: boolean;
  volume: number;
}

const createAudioContext = (): AudioContext | null => {
  try {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  } catch {
    console.warn('[AUDIO] Web Audio API not supported or restricted');
    return null;
  }
};

const playTone = (
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) => {
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + duration * 0.5);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio playback errors
  }
};

const playChord = (
  ctx: AudioContext,
  frequencies: number[],
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.2
) => {
  frequencies.forEach(freq => playTone(ctx, freq, duration, type, volume / frequencies.length));
};

export const useAudioFeedback = (config: AudioConfig = { enabled: true, volume: 0.5 }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    try {
      audioContextRef.current = createAudioContext();
      speechSynthRef.current = typeof window !== "undefined" ? window.speechSynthesis || null : null;
    } catch {
      // Ignore audio init errors
    }
    
    return () => {
      try {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const resumeContext = useCallback(async () => {
    try {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch {
      // Ignore
    }
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    if (!config.enabled || !audioContextRef.current) return;
    
    await resumeContext();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const vol = config.volume;

    switch (type) {
      case 'trade':
        playTone(ctx, 880, 0.08, 'sine', vol * 0.4);
        setTimeout(() => playTone(ctx, 1100, 0.08, 'sine', vol * 0.4), 100);
        break;
        
      case 'opportunity':
        playTone(ctx, 440, 0.12, 'triangle', vol * 0.3);
        setTimeout(() => playTone(ctx, 554, 0.12, 'triangle', vol * 0.3), 80);
        setTimeout(() => playTone(ctx, 659, 0.12, 'triangle', vol * 0.3), 160);
        setTimeout(() => playTone(ctx, 880, 0.2, 'triangle', vol * 0.4), 240);
        break;
        
      case 'alert':
        playTone(ctx, 440, 0.15, 'sawtooth', vol * 0.25);
        setTimeout(() => playTone(ctx, 440, 0.15, 'sawtooth', vol * 0.25), 200);
        setTimeout(() => playTone(ctx, 440, 0.15, 'sawtooth', vol * 0.25), 400);
        break;
        
      case 'success':
        playChord(ctx, [523, 659, 784], 0.3, 'sine', vol * 0.5);
        break;
        
      case 'error':
        playTone(ctx, 440, 0.15, 'square', vol * 0.2);
        setTimeout(() => playTone(ctx, 349, 0.2, 'square', vol * 0.2), 150);
        break;
        
      case 'tick':
        playTone(ctx, 1200, 0.03, 'sine', vol * 0.15);
        break;
    }
  }, [config.enabled, config.volume, resumeContext]);

  const speak = useCallback((text: string, priority: boolean = false) => {
    try {
      if (!config.enabled || !speechSynthRef.current) return;
      
      if (priority) {
        speechSynthRef.current.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      utterance.volume = config.volume;
      
      const voices = speechSynthRef.current.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Microsoft') ||
        v.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      speechSynthRef.current.speak(utterance);
    } catch {
      // Ignore speech synthesis errors
    }
  }, [config.enabled, config.volume]);

  const announceEvent = useCallback((eventType: string, details: string) => {
    if (!config.enabled) return;
    
    switch (eventType) {
      case 'trade_executed':
        playSound('trade');
        speak(`Trade executed. ${details}`, true);
        break;
      case 'opportunity':
        playSound('opportunity');
        speak(`Opportunity detected. ${details}`, true);
        break;
      case 'risk_warning':
        playSound('alert');
        speak(`Risk warning. ${details}`, true);
        break;
      case 'profit':
        playSound('success');
        speak(`Profit realized. ${details}`, false);
        break;
      case 'loss':
        playSound('error');
        speak(`Position closed at loss. ${details}`, false);
        break;
    }
  }, [config.enabled, playSound, speak]);

  return {
    playSound,
    speak,
    announceEvent,
  };
};
