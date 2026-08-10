import { api, EquityPoint } from "@/services/api";

export * from "@/services/api";

export const engineApi = api;

/**
 * Mirrors the engine's own daily-loss circuit breaker math (see
 * app/risk.py RiskManager.daily_loss_limit_hit) so the dashboard shows the
 * same "% of today's loss budget used" figure the engine itself is acting
 * on, not an approximation that could disagree with it.
 */
export function computeDailyLossUsedPct(equityCurve: EquityPoint[], maxDailyLossPct: number): number {
  if (!equityCurve || equityCurve.length === 0 || !maxDailyLossPct || maxDailyLossPct <= 0) return 0;

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
