import { useEffect, useRef, useState } from "react";

export interface PricePoint {
  price: number;
  time: number;
}

interface PriceState {
  currentPrice: number;
  history: PricePoint[];
}

/**
 * Polls Binance's PUBLIC ticker endpoint directly from the browser. This is
 * read-only public market data — unlike the engine's own API, there's no
 * token involved and nothing to protect, so calling it straight from the
 * client is fine. Deliberately decoupled from the trading engine: price
 * display shouldn't depend on (or count against) the engine's own API.
 */
export const useLivePrices = (symbols: string[], pollIntervalMs = 5000, historyLength = 40) => {
  const [prices, setPrices] = useState<Record<string, PriceState>>({});
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      await Promise.all(
        symbols.map(async (symbol) => {
          const cleanSymbol = symbol.replace("/", "");
          try {
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cleanSymbol}`);
            if (!res.ok) return;
            const data = await res.json();
            const price = parseFloat(data.price);
            if (cancelled || Number.isNaN(price)) return;
            setPrices((prev) => {
              const existing = prev[symbol];
              const history = [...(existing?.history ?? []), { price, time: Date.now() }].slice(-historyLength);
              return { ...prev, [symbol]: { currentPrice: price, history } };
            });
          } catch {
            // A transient failure to fetch a public ticker isn't worth
            // surfacing as a dashboard error — just skip this tick.
          }
        })
      );
    };

    poll();
    const interval = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, pollIntervalMs, historyLength]);

  return prices;
};
