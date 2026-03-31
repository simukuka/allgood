/**
 * Exchange rate service for AllGood.
 *
 * Fetches live rates from a free API with caching and offline fallback.
 * Uses https://open.er-api.com (no API key required for basic usage).
 */

type SupportedCurrency = "USD" | "MXN" | "BRL" | "EUR" | "GBP" | "COP";

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

// Cache rates for 10 minutes
const CACHE_TTL_MS = 10 * 60 * 1000;
// Rate lock duration shown to users (5 minutes)
export const RATE_LOCK_SECONDS = 300;

let rateCache: RateCache | null = null;

// Hardcoded fallback rates (updated periodically) — used when offline
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  MXN: 17.15,
  BRL: 5.05,
  EUR: 0.92,
  GBP: 0.79,
  COP: 3950,
};

/**
 * Fetch exchange rates from the API with caching.
 * Returns rates relative to USD.
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  // Return cached rates if still fresh
  if (rateCache && Date.now() - rateCache.fetchedAt < CACHE_TTL_MS) {
    return rateCache.rates;
  }

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== "success" || !data.rates) {
      throw new Error("Invalid API response format");
    }

    const rates: Record<string, number> = {};
    for (const currency of Object.keys(FALLBACK_RATES)) {
      rates[currency] = data.rates[currency] ?? FALLBACK_RATES[currency];
    }

    rateCache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch (error) {
    console.warn("Exchange rate fetch failed, using fallback:", error);
    // Return fallback but don't cache it (try fresh on next call)
    return FALLBACK_RATES;
  }
}

/**
 * Get the exchange rate from one currency to another.
 */
export async function getExchangeRate(
  from: SupportedCurrency,
  to: SupportedCurrency,
): Promise<{ rate: number; isLive: boolean }> {
  const rates = await fetchExchangeRates();
  const isLive =
    rateCache !== null && Date.now() - rateCache.fetchedAt < CACHE_TTL_MS;

  if (from === "USD") {
    return { rate: rates[to] ?? 1, isLive };
  }
  if (to === "USD") {
    return { rate: 1 / (rates[from] ?? 1), isLive };
  }
  // Cross-rate via USD
  const fromToUsd = 1 / (rates[from] ?? 1);
  const usdToTarget = rates[to] ?? 1;
  return { rate: fromToUsd * usdToTarget, isLive };
}

/**
 * Convert an amount between currencies.
 */
export async function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
): Promise<{ converted: number; rate: number; isLive: boolean }> {
  const { rate, isLive } = await getExchangeRate(from, to);
  return { converted: amount * rate, rate, isLive };
}

/**
 * Invalidate the cache (e.g., when user taps "refresh rate").
 */
export function clearRateCache() {
  rateCache = null;
}

/**
 * Check if cached rates are still within the lock window.
 */
export function getRateLockRemaining(): number {
  if (!rateCache) return 0;
  const elapsed = (Date.now() - rateCache.fetchedAt) / 1000;
  return Math.max(0, RATE_LOCK_SECONDS - elapsed);
}
