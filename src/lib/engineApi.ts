/**
 * Client for the Nexus-7 Python trading engine's monitoring API.
 *
 * ⚠️ SECURITY NOTE — read before deploying:
 * VITE_ENGINE_API_TOKEN is bundled into the client-side JS and is visible to
 * anyone who opens browser devtools on the deployed site. This was a
 * deliberate, informed tradeoff (simplicity over a server-side proxy), not
 * an oversight — but it means:
 *   1. This token should be treated as effectively public once deployed.
 *      Anyone who extracts it can call the engine's read endpoints AND the
 *      control endpoints (pause/resume/kill-switch) with your credentials.
 *   2. This dashboard intentionally does NOT call the pause/resume/
 *      kill-switch endpoints from the UI for that reason — see
 *      README's frontend section. Don't add buttons for those without
 *      re-reading that reasoning.
 *   3. If you later want real access control, route these calls through a
 *      server-side proxy (e.g. a Supabase Edge Function) that holds the
 *      token server-side instead of shipping it to the browser.
 */

const ENGINE_API_URL = import.meta.env.VITE_ENGINE_API_URL as string | undefined;
const ENGINE_API_TOKEN = import.meta.env.VITE_ENGINE_API_TOKEN as string | undefined;

export interface EngineStatus {
  status: "starting" | "running" | "paused" | "halted" | "error";
  started_at: string;
  last_cycle_at: string | null;
  cycles_completed: number;
  last_error: string | null;
  halt_reason: string | null;
  last_equity_usd: number | null;
  open_position_count: number;
  config: {
    testnet: boolean;
    dry_run: boolean;
    trading_enabled: boolean;
    pairs: string[];
    timeframe: string;
    min_confidence_score: number;
    poll_interval_seconds: number;
    max_daily_loss_pct: number;
    max_open_positions: number;
    risk_per_trade_pct: number;
  };
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

class EngineApiError extends Error {}

async function engineFetch<T>(path: string): Promise<T> {
  if (!ENGINE_API_URL) {
    throw new EngineApiError("VITE_ENGINE_API_URL is not set. See .env.local.example.");
  }
  const headers: Record<string, string> = {};
  if (ENGINE_API_TOKEN) {
    headers["Authorization"] = `Bearer ${ENGINE_API_TOKEN}`;
  }
  const res = await fetch(`${ENGINE_API_URL}${path}`, { headers });
  if (!res.ok) {
    throw new EngineApiError(`Engine API ${path} returned ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json() as Promise<T>;
}

export const engineApi = {
  health: () => engineFetch<{ status: string }>("/health"),
  status: () => engineFetch<EngineStatus>("/api/status"),
  positions: () => engineFetch<Record<string, EnginePosition>>("/api/positions"),
  trades: (limit = 50) => engineFetch<EngineTrade[]>(`/api/trades?limit=${limit}`),
  decisions: (limit = 50) => engineFetch<EngineDecision[]>(`/api/decisions?limit=${limit}`),
  equityCurve: (limit = 500) => engineFetch<EquityPoint[]>(`/api/equity-curve?limit=${limit}`),
};

/**
 * Mirrors the engine's own daily-loss circuit breaker math (see
 * app/risk.py RiskManager.daily_loss_limit_hit) so the dashboard shows the
 * same "% of today's loss budget used" figure the engine itself is acting
 * on, not an approximation that could disagree with it.
 */
export function computeDailyLossUsedPct(equityCurve: EquityPoint[], maxDailyLossPct: number): number {
  if (equityCurve.length === 0 || maxDailyLossPct <= 0) return 0;

  const todayStartUtc = new Date();
  todayStartUtc.setUTCHours(0, 0, 0, 0);

  const todaysPoints = equityCurve.filter((p) => new Date(p.ts).getTime() >= todayStartUtc.getTime());
  if (todaysPoints.length === 0) return 0;

  const dayStartEquity = todaysPoints[0].equity_usd;
  const latestEquity = todaysPoints[todaysPoints.length - 1].equity_usd;
  if (dayStartEquity <= 0) return 0;

  const lossPct = Math.max(0, ((dayStartEquity - latestEquity) / dayStartEquity) * 100);
  return (lossPct / maxDailyLossPct) * 100;
}

export { EngineApiError };
