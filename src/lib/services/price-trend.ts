/**
 * Price-trend analysis (Phase 6 differentiation features).
 *
 * Given a product's current price and its price history, returns:
 *   - `dropPercent` — how far the current price is below the 90-day high
 *   - `isLowestEver` — true when current is the minimum across all history
 *   - `daysSinceLowest` — for "first time this low in N days" copy
 *
 * Pure function; no I/O. Callers fetch the history with `prisma.priceHistory`
 * limited to the lookback window and pass it in.
 */

export interface PricePoint {
  price: number;
  recordedAt: Date;
}

export interface PriceTrend {
  current: number;
  highest90d: number | null;
  lowest90d: number | null;
  lowestEver: number | null;
  dropPercent: number;
  isLowestEver: boolean;
  daysSinceLowest: number | null;
  windowDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function analyzePriceTrend(
  current: number,
  history: PricePoint[],
  windowDays = 90,
  now: Date = new Date()
): PriceTrend {
  if (!Number.isFinite(current) || current < 0) {
    throw new Error("price-trend: current price must be a non-negative number");
  }

  const cutoff = now.getTime() - windowDays * DAY_MS;
  const windowed = history.filter((p) => p.recordedAt.getTime() >= cutoff);

  let highest90d: number | null = null;
  let lowest90d: number | null = null;
  for (const p of windowed) {
    if (highest90d === null || p.price > highest90d) highest90d = p.price;
    if (lowest90d === null || p.price < lowest90d) lowest90d = p.price;
  }

  let lowestEver: number | null = null;
  for (const p of history) {
    if (lowestEver === null || p.price < lowestEver) lowestEver = p.price;
  }
  // Include current — a brand-new lower price still counts as "lowest ever"
  if (lowestEver === null || current < lowestEver) lowestEver = current;

  const dropPercent =
    highest90d !== null && highest90d > 0
      ? Math.max(0, Math.round(((highest90d - current) / highest90d) * 100))
      : 0;

  const isLowestEver = lowestEver !== null && current <= lowestEver + 0.01;

  let daysSinceLowest: number | null = null;
  if (lowest90d !== null) {
    const lowestPoint = windowed.find((p) => p.price === lowest90d);
    if (lowestPoint) {
      daysSinceLowest = Math.floor(
        (now.getTime() - lowestPoint.recordedAt.getTime()) / DAY_MS
      );
    }
  }

  return {
    current,
    highest90d,
    lowest90d,
    lowestEver,
    dropPercent,
    isLowestEver,
    daysSinceLowest,
    windowDays,
  };
}

/**
 * Predict the next 7-day direction using simple linear regression on the
 * most recent points. Returns one of `down`, `up`, `stable`, or `unknown`.
 * Deliberately lightweight — production should replace with a proper model.
 */
export function predictNextWeekDirection(
  history: PricePoint[]
): "down" | "up" | "stable" | "unknown" {
  if (history.length < 7) return "unknown";
  const sorted = [...history].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()
  );
  const recent = sorted.slice(-14);
  const n = recent.length;
  if (n < 2) return "unknown";

  // Simple least-squares slope. x = day index, y = price.
  const xs = recent.map((_, i) => i);
  const ys = recent.map((p) => p.price);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const meanPrice = meanY || 1;
  const slopeRel = slope / meanPrice; // relative change per day

  if (slopeRel < -0.003) return "down";
  if (slopeRel > 0.003) return "up";
  return "stable";
}
