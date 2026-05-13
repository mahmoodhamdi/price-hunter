import type { PriceTrend } from "@/lib/services/price-trend";

interface PriceTrendBadgeProps {
  trend: PriceTrend;
  locale?: "en" | "ar";
}

const COPY = {
  en: {
    lowestEver: "Lowest ever",
    dropFromHigh: (pct: number) => `-${pct}% from 90d high`,
    matchesLow: "Matches 90-day low",
  },
  ar: {
    lowestEver: "أدنى سعر على الإطلاق",
    dropFromHigh: (pct: number) => `أرخص بـ ${pct}% من أعلى سعر`,
    matchesLow: "يطابق أدنى سعر خلال ٩٠ يوم",
  },
};

export function PriceTrendBadge({
  trend,
  locale = "en",
}: PriceTrendBadgeProps) {
  const t = COPY[locale];

  if (trend.isLowestEver) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
        title={
          trend.lowestEver !== null
            ? `Lowest recorded: ${trend.lowestEver.toFixed(2)}`
            : undefined
        }
      >
        <span aria-hidden>🏆</span>
        {t.lowestEver}
      </span>
    );
  }

  if (trend.dropPercent >= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
        <span aria-hidden>📉</span>
        {t.dropFromHigh(trend.dropPercent)}
      </span>
    );
  }

  if (
    trend.lowest90d !== null &&
    Math.abs(trend.current - trend.lowest90d) < 0.01
  ) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
        <span aria-hidden>📌</span>
        {t.matchesLow}
      </span>
    );
  }

  return null;
}
