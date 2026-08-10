/**
 * Authenticated API Service Layer for Nexus-7 Trading Engine
 *
 * Base URL: https://nexus7-engine.onrender.com
 *   - Local Storage override: NEXUS_ENGINE_API_URL
 *   - Vite: import.meta.env.VITE_ENGINE_API_URL
 *   - Next.js: process.env.NEXT_PUBLIC_ENGINE_API_URL
 *
 * Engine Token:
 *   - Local Storage override: NEXUS_ENGINE_TOKEN
 *   - Vite: import.meta.env.VITE_ENGINE_TOKEN (or VITE_ENGINE_API_TOKEN)
 *   - Next.js: process.env.NEXT_PUBLIC_ENGINE_TOKEN
 */

const DEFAULT_ENGINE_API_URL = "https://nexus7-engine.onrender.com";

function getEnvVariable(keys: string[], fallback: string = ""): string {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      for (const k of keys) {
        const val = import.meta.env[k];
        if (val !== undefined && val !== "") return String(val);
      }
    }
  } catch {
    // Ignore
  }

  try {
    if (typeof process !== "undefined" && process.env) {
      for (const k of keys) {
        const val = process.env[k];
        if (val !== undefined && val !== "") return String(val);
      }
    }
  } catch {
    // Ignore
  }

  return fallback;
}

export function sanitizeToken(rawToken: string): string {
  if (!rawToken) return "";
  return rawToken
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function getEngineApiUrl(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem("NEXUS_ENGINE_API_URL");
    if (stored && stored.trim() !== "") {
      return stored.trim().replace(/\/+$/, "");
    }
  }
  const envUrl = getEnvVariable(
    ["VITE_ENGINE_API_URL", "VITE_API_URL", "NEXT_PUBLIC_ENGINE_API_URL", "NEXT_PUBLIC_API_URL"],
    DEFAULT_ENGINE_API_URL
  );
  return (envUrl || DEFAULT_ENGINE_API_URL).replace(/\/+$/, "");
}

export function getEngineToken(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem("NEXUS_ENGINE_TOKEN");
    if (stored !== null && stored.trim() !== "") {
      return sanitizeToken(stored);
    }
  }
  const envVal = getEnvVariable([
    "VITE_ENGINE_TOKEN",
    "VITE_ENGINE_API_TOKEN",
    "VITE_API_AUTH_TOKEN",
    "VITE_ENGINE_AUTH_TOKEN",
    "NEXT_PUBLIC_ENGINE_TOKEN",
    "NEXT_PUBLIC_ENGINE_API_TOKEN",
    "NEXT_PUBLIC_API_AUTH_TOKEN",
  ]);
  return sanitizeToken(envVal);
}

export function setStoredEngineApiUrl(url: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (url && url.trim() !== "") {
      window.localStorage.setItem("NEXUS_ENGINE_API_URL", url.trim());
    } else {
      window.localStorage.removeItem("NEXUS_ENGINE_API_URL");
    }
  }
}

export function setStoredEngineToken(token: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    const sanitized = sanitizeToken(token);
    if (sanitized) {
      window.localStorage.setItem("NEXUS_ENGINE_TOKEN", sanitized);
    } else {
      window.localStorage.removeItem("NEXUS_ENGINE_TOKEN");
    }
  }
}

export const ENGINE_API_URL = getEngineApiUrl();
export const ENGINE_TOKEN = getEngineToken();

export interface EngineStatusConfig {
  testnet?: boolean;
  dry_run?: boolean;
  trading_enabled?: boolean;
  pairs?: string[];
  timeframe?: string;
  min_confidence_score?: number;
  poll_interval_seconds?: number;
  max_daily_loss_pct?: number;
  max_open_positions?: number;
  risk_per_trade_pct?: number;
}

export interface EngineStatus {
  status: "starting" | "running" | "paused" | "halted" | "error" | string;
  started_at?: string;
  last_cycle_at?: string | null;
  cycles_completed?: number;
  last_error: string | null;
  halt_reason?: string | null;
  last_equity_usd?: number | null;
  last_equity?: number | null;
  open_position_count?: number;
  config?: EngineStatusConfig;
}

export interface EnginePosition {
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  opened_at: string;
  trade_id: number;
  order_id: string;
  bracket_order_id: string | null;
  protection: "oco" | "stop_only" | "none";
}

export interface EngineTrade {
  id: number;
  ts: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  notional_usd: number | null;
  order_id: string | null;
  bracket_order_id: string | null;
  status: "open" | "closed";
  realized_pnl_usd: number | null;
}

export interface EngineDecision {
  id: number;
  ts: string;
  symbol: string;
  technical_bias: string | null;
  ai_action: string | null;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  executed: number; // 0 or 1
  reject_reason: string | null;
}

export interface EquityPoint {
  id: number;
  ts: string;
  equity_usd: number;
}

export class EngineApiError extends Error {
  public statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "EngineApiError";
    this.statusCode = statusCode;
  }
}

export class EngineApiAuthError extends EngineApiError {
  constructor(message: string = "HTTP 401 Unauthorized: Missing or invalid Bearer token.") {
    super(message, 401);
    this.name = "EngineApiAuthError";
  }
}

export class EngineApiWakingUpError extends EngineApiError {
  constructor(message: string = "Connecting to Engine... (Backend instance waking up from Render sleep)") {
    super(message, 503);
    this.name = "EngineApiWakingUpError";
  }
}

let hasAlerted401 = false;

async function engineFetch<T>(path: string, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const baseUrl = getEngineApiUrl();
  const token = getEngineToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token || ""}`,
  };

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 401) {
      if (!hasAlerted401) {
        hasAlerted401 = true;
        console.error(
          "🚨 [Nexus-7 API] HTTP 401 Unauthorized: Missing or invalid Bearer token.\n" +
          "Please configure VITE_ENGINE_TOKEN in your environment or via the terminal Settings modal."
        );
      }
      throw new EngineApiAuthError(
        "HTTP 401 Unauthorized: Missing or invalid Bearer token. Please verify your Engine API_AUTH_TOKEN."
      );
    }

    if (res.status === 502 || res.status === 503) {
      throw new EngineApiWakingUpError(
        `Connecting to Engine... (Backend instance waking up from Render sleep, HTTP ${res.status})`
      );
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new EngineApiError(
        `Engine API ${path} returned HTTP ${res.status}: ${errText}`,
        res.status
      );
    }

    // Reset 401 alert flag on successful request
    hasAlerted401 = false;
    return (await res.json()) as T;
  } catch (error: any) {
    clearTimeout(timer);

    if (error instanceof EngineApiAuthError || error instanceof EngineApiWakingUpError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new EngineApiWakingUpError(
        "Connecting to Engine... (Request timed out waiting for engine wakeup)"
      );
    }

    if (
      error instanceof TypeError &&
      (error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError"))
    ) {
      throw new EngineApiWakingUpError("Connecting to Engine... (Network connection pending)");
    }

    throw new EngineApiError(error?.message || String(error));
  }
}

export const api = {
  health: () => engineFetch<{ status: string }>("/health"),
  getStatus: () => engineFetch<EngineStatus>("/api/status"),
  getPositions: () => engineFetch<Record<string, EnginePosition>>("/api/positions"),
  getTrades: (limit = 50) => engineFetch<EngineTrade[]>(`/api/trades?limit=${limit}`),
  getDecisions: (limit = 50) => engineFetch<EngineDecision[]>(`/api/decisions?limit=${limit}`),
  getEquityCurve: (limit = 500) => engineFetch<EquityPoint[]>(`/api/equity-curve?limit=${limit}`),

  // Aliases for compatibility
  status: () => engineFetch<EngineStatus>("/api/status"),
  positions: () => engineFetch<Record<string, EnginePosition>>("/api/positions"),
  trades: (limit = 50) => engineFetch<EngineTrade[]>(`/api/trades?limit=${limit}`),
  decisions: (limit = 50) => engineFetch<EngineDecision[]>(`/api/decisions?limit=${limit}`),
  equityCurve: (limit = 500) => engineFetch<EquityPoint[]>(`/api/equity-curve?limit=${limit}`),
};
