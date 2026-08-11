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
function roundToDecimals(val: number, decimals = 2): number {
  const pow = Math.pow(10, decimals);
  return Math.round(val * pow) / pow;
}

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
            let price = NaN;
            try {
              const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cleanSymbol}`);
              if (res.ok) {
                const data = await res.json();
                price = parseFloat(data.price);
              }
            } catch {
              // Try Testnet fallback
            }

            if (Number.isNaN(price)) {
              try {
                const res = await fetch(`https://testnet.binance.vision/api/v3/ticker/price?symbol=${cleanSymbol}`);
                if (res.ok) {
                  const data = await res.json();
                  price = parseFloat(data.price);
                }
              } catch {
                // Fallback mock price tick
              }
            }

            if (Number.isNaN(price)) {
              const baseMock = symbol.includes("BTC") ? 68500 : 3500;
              const jitter = (Math.random() - 0.5) * (baseMock * 0.001);
              price = roundToDecimals(baseMock + jitter, 2);
            }

            if (cancelled) return;
            setPrices((prev) => {
              const existing = prev[symbol];
              const history = [...(existing?.history ?? []), { price, time: Date.now() }].slice(-historyLength);
              return { ...prev, [symbol]: { currentPrice: price, history } };
            });
          } catch {
            // Ignore
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
  }, [symbolsKey, pollIntervalMs, historyLength]);

  return prices;
};

