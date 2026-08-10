import { useCallback, useRef, useEffect } from "react";

type SoundType = 'trade' | 'opportunity' | 'alert' | 'success' | 'error' | 'tick';

interface AudioConfig {
  enabled: boolean;
  volume: number;
}

// Audio context and oscillator-based sound generation (no external files needed)
const createAudioContext = (): AudioContext | null => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    console.warn('[AUDIO] Web Audio API not supported');
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
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  // Envelope for smooth sound
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + duration * 0.5);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
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
    audioContextRef.current = createAudioContext();
    speechSynthRef.current = window.speechSynthesis || null;
    
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const resumeContext = useCallback(async () => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    if (!config.enabled || !audioContextRef.current) return;
    
    await resumeContext();
    const ctx = audioContextRef.current;
    const vol = config.volume;

    switch (type) {
      case 'trade':
        // Quick double beep - trade executed
        playTone(ctx, 880, 0.08, 'sine', vol * 0.4);
        setTimeout(() => playTone(ctx, 1100, 0.08, 'sine', vol * 0.4), 100);
        break;
        
      case 'opportunity':
        // Rising arpeggio - opportunity detected
        playTone(ctx, 440, 0.12, 'triangle', vol * 0.3);
        setTimeout(() => playTone(ctx, 554, 0.12, 'triangle', vol * 0.3), 80);
        setTimeout(() => playTone(ctx, 659, 0.12, 'triangle', vol * 0.3), 160);
        setTimeout(() => playTone(ctx, 880, 0.2, 'triangle', vol * 0.4), 240);
        break;
        
      case 'alert':
        // Warning tone - attention needed
        playTone(ctx, 440, 0.15, 'sawtooth', vol * 0.25);
        setTimeout(() => playTone(ctx, 440, 0.15, 'sawtooth', vol * 0.25), 200);
        setTimeout(() => playTone(ctx, 440, 0.15, 'sawtooth', vol * 0.25), 400);
        break;
        
      case 'success':
        // Happy chord - successful operation
        playChord(ctx, [523, 659, 784], 0.3, 'sine', vol * 0.5);
        break;
        
      case 'error':
        // Descending tone - error occurred
        playTone(ctx, 440, 0.15, 'square', vol * 0.2);
        setTimeout(() => playTone(ctx, 349, 0.2, 'square', vol * 0.2), 150);
        break;
        
      case 'tick':
        // Subtle tick - data update
        playTone(ctx, 1200, 0.03, 'sine', vol * 0.15);
        break;
    }
  }, [config.enabled, config.volume, resumeContext]);

  const speak = useCallback((text: string, priority: boolean = false) => {
    if (!config.enabled || !speechSynthRef.current) return;
    
    if (priority) {
      speechSynthRef.current.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.volume = config.volume;
    
    // Try to get a robotic/professional voice
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
