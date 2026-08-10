import { useState, useEffect, useCallback } from "react";
import { api, EngineStatus, EngineApiAuthError, EngineApiWakingUpError } from "@/services/api";

export interface UseEngineStatusResult {
  status: string; // "running", "starting", "paused", "halted", "error", or "connecting"
  lastEquity: number | null;
  lastError: string | null;
  engineStatus: EngineStatus | null;
  isConnected: boolean;
  isWakingUp: boolean;
  isUnauthorized: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to poll GET /api/status every 3-5 seconds (default: 4000ms).
 * Directly binds status, last_equity, and last_error to terminal state.
 */
export function useEngineStatus(pollIntervalMs: number = 4000): UseEngineStatusResult {
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isWakingUp, setIsWakingUp] = useState<boolean>(true);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getStatus();
      setEngineStatus(data);
      setIsConnected(true);
      setIsWakingUp(false);
      setIsUnauthorized(false);
      setError(null);
    } catch (err: any) {
      setIsConnected(false);
      if (err instanceof EngineApiAuthError) {
        setIsUnauthorized(true);
        setIsWakingUp(false);
        setError(err.message);
      } else if (err instanceof EngineApiWakingUpError) {
        setIsWakingUp(true);
        setIsUnauthorized(false);
        setError("Connecting to Engine...");
      } else {
        setIsWakingUp(false);
        setError(err?.message || "Failed to connect to Engine");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchStatus, pollIntervalMs]);

  const rawStatus =
    engineStatus?.status ?? (isWakingUp ? "connecting" : isConnected ? "running" : "disconnected");
  const lastEquity = engineStatus?.last_equity ?? engineStatus?.last_equity_usd ?? null;
  const lastError = engineStatus?.last_error ?? error;

  return {
    status: rawStatus,
    lastEquity,
    lastError,
    engineStatus,
    isConnected,
    isWakingUp,
    isUnauthorized,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
