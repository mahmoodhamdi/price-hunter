"use client";

import { useState, useMemo } from "react";
import { Filter } from "lucide-react";

/**
 * Smart deal filters (Phase 6 differentiation).
 *
 * Client-side filter band for the deals grid. Operates over a JSON-ish
 * shape so the same component works against any list of items shaped
 * like `{ minDiscount, rating, inStockCount, isHotDeal }`.
 *
 * Filter options:
 *   - minDiscount slider (0, 10, 20, 30, 50)
 *   - "Rated 4.5+" toggle
 *   - "Hot deals" toggle (price drop in last 24h)
 *   - "In stock everywhere" toggle
 */

export interface FilterableDeal {
  id: string;
  minDiscount: number;
  rating: number;
  inStockCount: number;
  totalStores: number;
  isHotDeal: boolean;
}

interface SmartDealFiltersProps<T extends FilterableDeal> {
  items: T[];
  render: (filtered: T[]) => React.ReactNode;
}

const DISCOUNT_STEPS = [0, 10, 20, 30, 50] as const;

export function SmartDealFilters<T extends FilterableDeal>({
  items,
  render,
}: SmartDealFiltersProps<T>) {
  const [minDiscount, setMinDiscount] = useState(0);
  const [highRated, setHighRated] = useState(false);
  const [hotOnly, setHotOnly] = useState(false);
  const [allInStock, setAllInStock] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (d.minDiscount < minDiscount) return false;
      if (highRated && d.rating < 4.5) return false;
      if (hotOnly && !d.isHotDeal) return false;
      if (allInStock && d.inStockCount < d.totalStores) return false;
      return true;
    });
  }, [items, minDiscount, highRated, hotOnly, allInStock]);

  const activeFilterCount =
    (minDiscount > 0 ? 1 : 0) +
    (highRated ? 1 : 0) +
    (hotOnly ? 1 : 0) +
    (allInStock ? 1 : 0);

  return (
    <div>
      <div className="mb-6 border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4" />
          <h2 className="font-semibold text-sm">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {activeFilterCount} active
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} / {items.length} deals
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {DISCOUNT_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setMinDiscount(step)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                minDiscount === step
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
              aria-pressed={minDiscount === step}
            >
              {step === 0 ? "All discounts" : `${step}%+ off`}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setHighRated((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              highRated
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-background hover:bg-muted"
            }`}
            aria-pressed={highRated}
          >
            ⭐ 4.5+ rated
          </button>

          <button
            type="button"
            onClick={() => setHotOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              hotOnly
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-background hover:bg-muted"
            }`}
            aria-pressed={hotOnly}
          >
            🔥 Hot deals
          </button>

          <button
            type="button"
            onClick={() => setAllInStock((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              allInStock
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-background hover:bg-muted"
            }`}
            aria-pressed={allInStock}
          >
            ✓ In stock everywhere
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setMinDiscount(0);
                setHighRated(false);
                setHotOnly(false);
                setAllInStock(false);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {render(filtered)}
    </div>
  );
}
