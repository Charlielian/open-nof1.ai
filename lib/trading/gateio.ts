/**
 * Gate.io public API client for market data (no API key required).
 * Free tier — no authentication needed for read-only public endpoints.
 */

const BASE = "https://api.gateio.ws/api/v4";

/**
 * Gate.io returns OHLCV as an array of arrays:
 * [timestamp, volume, close, high, low, open, ...]
 * Index: 0=timestamp(s), 1=volume(quote), 2=close, 3=high, 4=low, 5=open
 */
type GateCandle = string[];

/**
 * Fetch OHLCV candlesticks from gate.io spot market.
 * Returns CCXT-compatible array: [timestamp, open, high, low, close, volume]
 */
export async function fetchOHLCV(
  symbol: string,
  interval: string = "1m",
  limit: number = 100
): Promise<number[][]> {
  // Gate.io uses underscore format and accepts "1m", "4h", etc.
  const currencyPair = symbol.replace("/", "_");
  const url = `${BASE}/spot/candlesticks?currency_pair=${currencyPair}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(
      `gate.io OHLCV error (${res.status}): ${await res.text()}`
    );
  }

  const data: GateCandle[] = await res.json();
  return data.map((c) => [
    parseFloat(c[0]) * 1000, // timestamp (ms)
    parseFloat(c[5]), // open
    parseFloat(c[3]), // high
    parseFloat(c[4]), // low
    parseFloat(c[2]), // close
    parseFloat(c[1]), // volume (quote currency)
  ]);
}

const FUNDING_BASE = "https://api.gateio.ws/api/v4/futures/usdt";

/**
 * Fetch open interest for a perpetual swap contract.
 */
export async function fetchOpenInterest(symbol: string): Promise<{
  openInterestAmount: number;
  openInterestUsd: number;
}> {
  const contract = symbol.replace("USDT", "_USDT");
  const url = `${FUNDING_BASE}/contracts/${contract}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(
      `gate.io open interest error (${res.status}): ${await res.text()}`
    );
  }

  const data = await res.json();
  return {
    openInterestAmount: parseFloat(data.open_interest || "0"),
    openInterestUsd: parseFloat(data.open_interest_usd || "0"),
  };
}

/**
 * Fetch funding rate for a perpetual swap contract.
 */
export async function fetchFundingRate(symbol: string): Promise<{
  fundingRate: number;
}> {
  // Gate.io returns the last funding rate in the ticker endpoint
  const contract = symbol.replace("/", "_");
  const url = `${FUNDING_BASE}/tickers?contract=${contract}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(
      `gate.io funding rate error (${res.status}): ${await res.text()}`
    );
  }

  const data = await res.json();
  const rate = parseFloat(data[0]?.funding_rate || "0");
  return { fundingRate: rate };
}