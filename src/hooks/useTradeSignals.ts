import { useEffect, useCallback, useState, useRef } from "react";
import { useAudioFeedback } from "./useAudioFeedback";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'api' | 'ai' | 'risk' | 'execution' | 'system';
  message: string;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  timestamp: string;
}

export interface OpportunitySignal {
  symbol: string;
  confidence: number;
  direction: 'long' | 'short';
  timestamp: string;
}

interface UseTradeSignalsOptions {
  audioEnabled?: boolean;
  audioVolume?: number;
}

export const useTradeSignals = (options: UseTradeSignalsOptions = {}) => {
  const { audioEnabled = true, audioVolume = 0.5 } = options;
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [opportunities, setOpportunities] = useState<OpportunitySignal[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const { playSound, announceEvent } = useAudioFeedback({ 
    enabled: audioEnabled, 
    volume: audioVolume 
  });

  // Helper to add logs locally
  const addLog = useCallback((log: Omit<LogEntry, 'id'>) => {
    const newLog: LogEntry = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setLogs(prev => [...prev.slice(-99), newLog]);
  }, []);

  useEffect(() => {
    // ---------------------------------------------------------
    // 🔗 CONNECT TO YOUR RENDER BACKEND HERE
    // ---------------------------------------------------------
    const wsUrl = 'wss://nexus-7-weex-terminal.onrender.com/ws/stream';
    console.log(`[NEXUS-7] Connecting to Brain at: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[NEXUS-7] ✅ Connected to Render Brain');
      setIsConnected(true);
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        type: 'system',
        message: '⚡ LINK ESTABLISHED: Connected to Nexus-7 Brain (Render Cloud)'
      });
      playSound('success');
    };

    ws.onclose = () => {
      console.log('[NEXUS-7] ❌ Disconnected');
      setIsConnected(false);
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        type: 'system',
        message: '⚠️ DISCONNECTED: Reconnecting to Brain...'
      });
    };

    ws.onerror = (error) => {
      console.error('[NEXUS-7] WebSocket Error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 1. Handle Logs (AI Logic, Risks, API Calls)
        if (data.type) {
            let logType: LogEntry['type'] = 'system';
            
            // Map backend types to frontend types
            if (data.type === 'WEEX_API') logType = 'api';
            else if (data.type === 'AI_SCAN') logType = 'ai';
            else if (data.type === 'RISK_CHECK') logType = 'risk';
            else if (data.type === 'OPPORTUNITY') logType = 'execution';

            addLog({
                timestamp: data.timestamp || new Date().toLocaleTimeString(),
                type: logType,
                message: data.message || JSON.stringify(data)
            });
            
            // Audio Feedback for important events
            if (logType === 'execution') playSound('trade');
            else if (logType === 'risk') playSound('alert');
            else playSound('tick');
        }

        // 2. Handle Price Updates (if sent separately)
        if (data.price && data.symbol) {
            setPrices(prev => ({
                ...prev,
                [data.symbol]: {
                    symbol: data.symbol,
                    price: data.price,
                    change: 0, // Mock change if not provided
                    timestamp: new Date().toISOString()
                }
            }));
        }

      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [addLog, playSound]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    prices,
    opportunities,
    isConnected,
    clearLogs,
    addLog,
  };
};