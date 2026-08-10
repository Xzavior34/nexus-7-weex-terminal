import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioFeedback } from "./useAudioFeedback";
import {
  api,
  EngineStatus,
  EnginePosition,
  EngineTrade,
  EngineDecision,
  EquityPoint,
  EngineApiAuthError,
  EngineApiWakingUpError,
} from "@/services/api";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "ai" | "api" | "execution" | "risk" | "system";
  message: string;
}

interface UseEngineDataOptions {
  audioEnabled?: boolean;
  audioVolume?: number;
  pollIntervalMs?: number; // Default: 4000ms (3–5 seconds)
}

/**
 * Hook to poll the Nexus-7 engine REST API every 3–5 seconds.
 * Uses Promise.allSettled so individual endpoint failures don't block the rest of the UI.
 */
export const useEngineData = (options: UseEngineDataOptions = {}) => {
  const { audioEnabled = true, audioVolume = 0.5, pollIntervalMs = 4000 } = options;

  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [positions, setPositions] = useState<Record<string, EnginePosition>>({});
  const [trades, setTrades] = useState<EngineTrade[]>([]);
  const [decisions, setDecisions] = useState<EngineDecision[]>([]);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const seenDecisionIds = useRef<Set<number>>(new Set());
  const seenTradeIds = useRef<Set<number>>(new Set());
  const { playSound } = useAudioFeedback({ enabled: audioEnabled, volume: audioVolume });

  const decisionToLog = useCallback((d: EngineDecision): LogEntry => {
    const time = d.ts ? new Date(d.ts).toLocaleTimeString() : new Date().toLocaleTimeString();
    if (d.executed) {
      return {
        id: `d-${d.id}`,
        timestamp: time,
        type: "execution",
        message: `[${d.symbol}] EXECUTED ${d.ai_action ?? d.technical_bias} — confidence ${d.ai_confidence ?? "?"}`,
      };
    }
    if (
      d.reject_reason?.startsWith("daily_loss_limit") ||
      d.reject_reason?.startsWith("stale_signal") ||
      d.reject_reason?.includes("cooldown")
    ) {
      return {
        id: `d-${d.id}`,
        timestamp: time,
        type: "risk",
        message: `[${d.symbol}] blocked — ${d.reject_reason}`,
      };
    }
    return {
      id: `d-${d.id}`,
      timestamp: time,
      type: "ai",
      message: `[${d.symbol}] HOLD (bias=${d.technical_bias ?? "?"} ai=${d.ai_action ?? "?"}/${d.ai_confidence ?? "?"}) — ${d.reject_reason ?? "no reason logged"}`,
    };
  }, []);

  const poll = useCallback(async () => {
    try {
      const [statusResult, positionsResult, tradesResult, decisionsResult, equityResult] =
        await Promise.allSettled([
          api.getStatus(),
          api.getPositions(),
          api.getTrades(30),
          api.getDecisions(30),
          api.getEquityCurve(200),
        ]);

      // 1. Check Status Endpoint
      if (statusResult.status === "fulfilled") {
        const statusRes = statusResult.value;
        setStatus(statusRes);
        if (!isConnected) playSound("success");
        setIsConnected(true);
        setIsWakingUp(false);
        setIsUnauthorized(false);
        setLastError(null);
      } else {
        const reason = statusResult.reason;
        setIsConnected(false);
        if (reason instanceof EngineApiAuthError) {
          setIsUnauthorized(true);
          setIsWakingUp(false);
          setLastError(reason.message);
        } else if (reason instanceof EngineApiWakingUpError) {
          setIsWakingUp(true);
          setIsUnauthorized(false);
          setLastError("Connecting to Engine...");
        } else {
          setIsWakingUp(false);
          setLastError(reason instanceof Error ? reason.message : String(reason));
        }
      }

      // 2. Positions
      if (positionsResult.status === "fulfilled" && positionsResult.value) {
        setPositions(positionsResult.value);
      }

      // 3. Trades
      if (tradesResult.status === "fulfilled" && Array.isArray(tradesResult.value)) {
        const tradesRes = tradesResult.value;
        setTrades(tradesRes);
        tradesRes.forEach((t) => {
          if (t.status === "closed" && !seenTradeIds.current.has(t.id)) {
            seenTradeIds.current.add(t.id);
            if ((t.realized_pnl_usd ?? 0) > 0) playSound("success");
          }
        });
      }

      // 4. Decisions & Logs
      if (decisionsResult.status === "fulfilled" && Array.isArray(decisionsResult.value)) {
        const decisionsRes = decisionsResult.value;
        setDecisions(decisionsRes);
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
      }

      // 5. Equity Curve
      if (equityResult.status === "fulfilled" && Array.isArray(equityResult.value)) {
        setEquityCurve(equityResult.value);
      }
    } catch (e: any) {
      setIsConnected(false);
      setLastError(e instanceof Error ? e.message : String(e));
    }
  }, [decisionToLog, isConnected, playSound]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, pollIntervalMs);
    return () => clearInterval(interval);
  }, [poll, pollIntervalMs]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    status,
    positions,
    trades,
    decisions,
    equityCurve,
    logs,
    isConnected,
    isWakingUp,
    isUnauthorized,
    lastError,
    clearLogs,
    refetch: poll,
  };
};
