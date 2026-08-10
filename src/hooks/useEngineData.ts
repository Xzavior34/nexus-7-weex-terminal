import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioFeedback } from "./useAudioFeedback";
import {
  engineApi,
  EngineStatus,
  EnginePosition,
  EngineTrade,
  EngineDecision,
  EquityPoint,
} from "@/lib/engineApi";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "ai" | "api" | "execution" | "risk" | "system";
  message: string;
}

interface UseEngineDataOptions {
  audioEnabled?: boolean;
  audioVolume?: number;
  pollIntervalMs?: number;
}

/**
 * Replaces the old useTradeSignals WebSocket hook (which pointed at a
 * backend that no longer exists). This polls the real engine's REST API —
 * appropriate for a monitoring dashboard, and the only sane option for a
 * bearer-token-protected API called straight from the browser (browsers
 * can't set an Authorization header on a raw WebSocket handshake anyway).
 */
export const useEngineData = (options: UseEngineDataOptions = {}) => {
  const { audioEnabled = true, audioVolume = 0.5, pollIntervalMs = 8000 } = options;

  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [positions, setPositions] = useState<Record<string, EnginePosition>>({});
  const [trades, setTrades] = useState<EngineTrade[]>([]);
  const [decisions, setDecisions] = useState<EngineDecision[]>([]);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const seenDecisionIds = useRef<Set<number>>(new Set());
  const seenTradeIds = useRef<Set<number>>(new Set());
  const { playSound } = useAudioFeedback({ enabled: audioEnabled, volume: audioVolume });

  const decisionToLog = useCallback((d: EngineDecision): LogEntry => {
    const time = new Date(d.ts).toLocaleTimeString();
    if (d.executed) {
      return {
        id: `d-${d.id}`, timestamp: time, type: "execution",
        message: `[${d.symbol}] EXECUTED ${d.ai_action ?? d.technical_bias} — confidence ${d.ai_confidence ?? "?"}`,
      };
    }
    if (d.reject_reason?.startsWith("daily_loss_limit") || d.reject_reason?.startsWith("stale_signal") || d.reject_reason?.includes("cooldown")) {
      return {
        id: `d-${d.id}`, timestamp: time, type: "risk",
        message: `[${d.symbol}] blocked — ${d.reject_reason}`,
      };
    }
    return {
      id: `d-${d.id}`, timestamp: time, type: "ai",
      message: `[${d.symbol}] HOLD (bias=${d.technical_bias ?? "?"} ai=${d.ai_action ?? "?"}/${d.ai_confidence ?? "?"}) — ${d.reject_reason ?? "no reason logged"}`,
    };
  }, []);

  const poll = useCallback(async () => {
    try {
      const [statusRes, positionsRes, tradesRes, decisionsRes, equityRes] = await Promise.all([
        engineApi.status(),
        engineApi.positions(),
        engineApi.trades(30),
        engineApi.decisions(30),
        engineApi.equityCurve(200),
      ]);

      setStatus(statusRes);
      setPositions(positionsRes);
      setTrades(tradesRes);
      setEquityCurve(equityRes);

      const newDecisions = decisionsRes.filter((d) => !seenDecisionIds.current.has(d.id));
      if (newDecisions.length > 0) {
        newDecisions.forEach((d) => seenDecisionIds.current.add(d.id));
        const newLogs = newDecisions.map(decisionToLog).reverse();
        setLogs((prev) => [...prev.slice(-150), ...newLogs]);
        newLogs.forEach((log) => {
          if (log.type === "execution") playSound("trade");
          else if (log.type === "risk") playSound("alert");
        });
      }
      setDecisions(decisionsRes);

      tradesRes.forEach((t) => {
        if (t.status === "closed" && !seenTradeIds.current.has(t.id)) {
          seenTradeIds.current.add(t.id);
          if ((t.realized_pnl_usd ?? 0) > 0) playSound("success");
        }
      });

      if (!isConnected) playSound("success");
      setIsConnected(true);
      setLastError(null);
    } catch (e) {
      setIsConnected(false);
      setLastError(e instanceof Error ? e.message : String(e));
    }
  }, [decisionToLog, isConnected, playSound]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, pollIntervalMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    status,
    positions,
    trades,
    decisions,
    equityCurve,
    logs,
    isConnected,
    lastError,
    clearLogs,
  };
};
