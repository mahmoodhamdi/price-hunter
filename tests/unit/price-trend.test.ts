import { describe, it, expect } from "vitest";
import {
  analyzePriceTrend,
  predictNextWeekDirection,
  type PricePoint,
} from "@/lib/services/price-trend";

const DAY = 24 * 60 * 60 * 1000;

function buildHistory(prices: number[], now: Date): PricePoint[] {
  return prices.map((price, idx) => ({
    price,
    recordedAt: new Date(now.getTime() - (prices.length - idx) * DAY),
  }));
}

describe("analyzePriceTrend", () => {
  const now = new Date("2026-05-13T12:00:00Z");

  it("computes drop percent from 90-day high", () => {
    const history = buildHistory([100, 98, 95, 92, 90, 85, 80], now);
    const trend = analyzePriceTrend(80, history, 90, now);
    expect(trend.highest90d).toBe(100);
    expect(trend.lowest90d).toBe(80);
    expect(trend.dropPercent).toBe(20);
  });

  it("flags isLowestEver when current is the new low", () => {
    const history = buildHistory([100, 98, 95, 92], now);
    const trend = analyzePriceTrend(90, history, 90, now);
    expect(trend.isLowestEver).toBe(true);
    expect(trend.lowestEver).toBe(90);
  });

  it("does not flag isLowestEver when current is above the historical min", () => {
    const history = buildHistory([100, 80, 95, 92], now);
    const trend = analyzePriceTrend(85, history, 90, now);
    expect(trend.isLowestEver).toBe(false);
    expect(trend.lowestEver).toBe(80);
  });

  it("returns 0 dropPercent when there is no useful history", () => {
    const trend = analyzePriceTrend(100, [], 90, now);
    expect(trend.dropPercent).toBe(0);
    expect(trend.highest90d).toBeNull();
    expect(trend.lowest90d).toBeNull();
  });

  it("excludes history older than windowDays from drop computation", () => {
    const oldPoint: PricePoint = {
      price: 200,
      recordedAt: new Date(now.getTime() - 120 * DAY),
    };
    const recent = buildHistory([100, 98, 95], now);
    const trend = analyzePriceTrend(95, [oldPoint, ...recent], 90, now);
    expect(trend.highest90d).toBe(100);
    expect(trend.dropPercent).toBe(5);
  });

  it("computes daysSinceLowest from the most recent matching point", () => {
    const history: PricePoint[] = [
      { price: 100, recordedAt: new Date(now.getTime() - 10 * DAY) },
      { price: 80, recordedAt: new Date(now.getTime() - 5 * DAY) },
      { price: 90, recordedAt: new Date(now.getTime() - 1 * DAY) },
    ];
    const trend = analyzePriceTrend(85, history, 90, now);
    expect(trend.daysSinceLowest).toBeGreaterThanOrEqual(4);
    expect(trend.daysSinceLowest).toBeLessThanOrEqual(5);
  });

  it("rejects negative current price", () => {
    expect(() => analyzePriceTrend(-1, [], 90, now)).toThrow();
  });

  it("rejects NaN current price", () => {
    expect(() => analyzePriceTrend(NaN, [], 90, now)).toThrow();
  });
});

describe("predictNextWeekDirection", () => {
  const now = new Date("2026-05-13T12:00:00Z");

  it("returns 'down' for clearly declining series", () => {
    const history = buildHistory([100, 98, 96, 94, 92, 90, 88, 86], now);
    expect(predictNextWeekDirection(history)).toBe("down");
  });

  it("returns 'up' for clearly rising series", () => {
    const history = buildHistory([80, 82, 84, 86, 88, 90, 92, 94], now);
    expect(predictNextWeekDirection(history)).toBe("up");
  });

  it("returns 'stable' for flat-ish series", () => {
    const history = buildHistory([100, 100.1, 99.9, 100, 100.2, 100, 99.9, 100], now);
    expect(predictNextWeekDirection(history)).toBe("stable");
  });

  it("returns 'unknown' when there is too little data", () => {
    const history = buildHistory([100, 99], now);
    expect(predictNextWeekDirection(history)).toBe("unknown");
  });
});
