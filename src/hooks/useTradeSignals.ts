import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

export interface TradeExecution {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
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

  const { playSound, announceEvent } = useAudioFeedback({ 
    enabled: audioEnabled, 
    volume: audioVolume 
  });

  const addLog = useCallback((log: Omit<LogEntry, 'id'>) => {
    const newLog: LogEntry = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setLogs(prev => [...prev.slice(-99), newLog]);
  }, []);

  useEffect(() => {
    console.log('[TRADE-SIGNALS] Setting up realtime subscription...');
    
    const channel = supabase.channel('trade-signals')
      .on('broadcast', { event: 'log' }, ({ payload }) => {
        console.log('[TRADE-SIGNALS] Received log:', payload);
        addLog({
          timestamp: payload.timestamp,
          type: payload.logType || 'system',
          message: payload.message,
        });
        playSound('tick');
      })
      .on('broadcast', { event: 'trade' }, ({ payload }) => {
        console.log('[TRADE-SIGNALS] Received trade:', payload);
        const trade = payload as TradeExecution;
        addLog({
          timestamp: trade.timestamp,
          type: 'execution',
          message: `${trade.side.toUpperCase()} ${trade.amount} ${trade.symbol} @ ${trade.price}`,
        });
        announceEvent('trade_executed', `${trade.side} ${trade.symbol} at ${trade.price}`);
      })
      .on('broadcast', { event: 'price' }, ({ payload }) => {
        const price = payload as PriceUpdate;
        setPrices(prev => ({
          ...prev,
          [price.symbol]: price,
        }));
      })
      .on('broadcast', { event: 'opportunity' }, ({ payload }) => {
        console.log('[TRADE-SIGNALS] Received opportunity:', payload);
        const opp = payload as OpportunitySignal;
        setOpportunities(prev => [...prev.slice(-4), opp]);
        addLog({
          timestamp: opp.timestamp,
          type: 'ai',
          message: `Opportunity detected: ${opp.direction.toUpperCase()} ${opp.symbol} (${(opp.confidence * 100).toFixed(0)}% confidence)`,
        });
        announceEvent('opportunity', `${opp.direction} ${opp.symbol} with ${(opp.confidence * 100).toFixed(0)} percent confidence`);
      })
      .on('broadcast', { event: 'risk_update' }, ({ payload }) => {
        console.log('[TRADE-SIGNALS] Received risk update:', payload);
        if (payload.level === 'warning' || payload.level === 'critical') {
          addLog({
            timestamp: payload.timestamp,
            type: 'risk',
            message: payload.message,
          });
          announceEvent('risk_warning', payload.message);
        }
      })
      .subscribe((status) => {
        console.log('[TRADE-SIGNALS] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          addLog({
            timestamp: new Date().toISOString(),
            type: 'system',
            message: 'Connected to Nexus-7 trade signal stream',
          });
        }
      });

    return () => {
      console.log('[TRADE-SIGNALS] Cleaning up subscription...');
      supabase.removeChannel(channel);
    };
  }, [addLog, playSound, announceEvent]);

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
