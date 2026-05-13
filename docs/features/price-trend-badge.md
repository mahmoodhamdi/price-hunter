# Price-Trend Badge (Phase 6)

Surfaces three visually-distinct badges on product cards:

- **🏆 Lowest ever** — golden badge when the current price is the lowest recorded across all-time history
- **📉 -X% from 90d high** — red badge when the current price is ≥5% below the 90-day high
- **📌 Matches 90-day low** — green badge when the current price ties the 90-day minimum (without being all-time low)

The badge is opt-in: components render it only when a `priceTrend` prop is provided. Backwards-compatible with all existing callers.

## Components

- `src/lib/services/price-trend.ts` — pure analyzer (`analyzePriceTrend`, `predictNextWeekDirection`)
- `src/components/product/PriceTrendBadge.tsx` — the visual component (i18n: en/ar)
- `src/components/product/ProductCard.tsx` — accepts optional `priceTrend` prop

## Integration pattern

When rendering a product card in a server component that already has a Prisma client:

```tsx
import { analyzePriceTrend } from "@/lib/services/price-trend";
import { prisma } from "@/lib/prisma";

const products = await prisma.product.findMany({
  include: {
    storeProducts: {
      include: {
        store: true,
        priceHistory: {
          orderBy: { recordedAt: "desc" },
          take: 90,
        },
      },
      orderBy: { price: "asc" },
      take: 1,
    },
  },
  // ...
});

// Compute one trend per product (uses cheapest store-product's history)
const trends = new Map(
  products.map((p) => {
    const sp = p.storeProducts[0];
    if (!sp) return [p.id, null];
    return [
      p.id,
      analyzePriceTrend(
        Number(sp.price),
        sp.priceHistory.map((h) => ({
          price: Number(h.price),
          recordedAt: h.recordedAt,
        }))
      ),
    ];
  })
);

return products.map((p) => (
  <ProductCard
    key={p.id}
    product={p}
    priceTrend={trends.get(p.id) ?? undefined}
  />
));
```

## Performance note

For listing pages, the price-history fetch can become expensive. Two mitigations:

1. **Cap history depth** — `take: 90` reads at most 90 rows per store-product
2. **Hot-set caching** — wrap the trend computation in a Redis cache key like `product:${id}:trend:v1` with a 15-minute TTL. The pure-function analyzer makes this trivial.

For the canonical home page with 4 deals × 1 store × 90 rows = 360 rows, no cache is needed.

## Buyer customization

- Adjust the 5% threshold for the drop badge in `PriceTrendBadge.tsx`
- Adjust the 90-day window in `analyzePriceTrend`'s third argument
- Disable for specific verticals by checking `getEditionFromEnv()` inside the component

## Tests

`tests/unit/price-trend.test.ts` — 12 tests covering the analyzer and the predictor. Run with:

```bash
npx vitest run tests/unit/price-trend.test.ts
```
