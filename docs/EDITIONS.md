# Price Hunter Editions

The Price Hunter codebase ships **20 distinct editions** generated from the same source via build-time configuration. Each edition is sellable as an independent SKU.

## The Matrix

|                | Electronics | Fashion | Grocery | Pharma | General |
|----------------|-------------|---------|---------|--------|---------|
| **KSA**        | ksa-electronics | ksa-fashion | ksa-grocery | ksa-pharma | ksa-general |
| **Egypt**      | eg-electronics  | eg-fashion  | eg-grocery  | eg-pharma  | eg-general  |
| **UAE**        | uae-electronics | uae-fashion | uae-grocery | uae-pharma | uae-general |
| **All Region** | all-electronics | all-fashion | all-grocery | all-pharma | all-general |

## Pricing Tiers (USD)

| Tier | Examples | Price |
|------|----------|-------|
| Single SKU (1 country × 1 vertical) | ksa-electronics, eg-pharma | $1,500 |
| Country bundle (1 country × all verticals) | ksa-general | $4,000 |
| Vertical bundle (all countries × 1 vertical) | all-electronics | $5,000 |
| Regional / "Everything" | all-general | $9,000 |

See `docs/sales/PRICING.md` for the complete pricing sheet including enterprise and support tiers.

## Building an Edition

```bash
# build a single edition
./scripts/build-edition.sh ksa electronics

# build all 12 single-SKU editions
./scripts/build-all-editions.sh

# build all 20 (single SKU + bundles)
INCLUDE_BUNDLES=1 ./scripts/build-all-editions.sh
```

Each build writes to `.next-builds/<edition>/.next/`.

## Architecture

```
src/lib/editions/
├── types.ts          # EditionConfig, VerticalConfig, CountryConfig types
├── verticals.ts      # 5 vertical configs (general, electronics, fashion, grocery, pharma)
├── countries.ts      # 4 country configs (ksa, eg, uae, all)
├── editions.ts       # 20 edition combinations + getEditionFromEnv()
└── index.ts          # public API
```

### Runtime selection

At build time the script sets `NEXT_PUBLIC_EDITION=<slug>`. At runtime any module calls:

```ts
import { getEditionFromEnv } from "@/lib/editions";

const edition = getEditionFromEnv();
// edition.vertical.primaryColor → "#1e40af" for electronics
// edition.country.defaultCurrency → "SAR" for KSA
// edition.stores → filtered StoreSlug[] for this edition
```

### Store filtering

Each edition's `stores` is the **intersection** of `country.stores` and `vertical.defaultStores`. If the intersection is empty (e.g., a vertical not represented in a country), the edition falls back to all country stores so the app still works.

### Pricing tier resolution

`editions.ts` assigns a `pricingTier` automatically based on whether the country and vertical are specific or "all":

- `single-sku`: specific country + specific vertical → $1,500
- `country-bundle`: specific country + general vertical → $4,000
- `vertical-bundle`: all countries + specific vertical → $5,000
- `regional`: all countries + general vertical → $9,000

## Adding a New Country

1. Add slug to `CountrySlug` type in `src/lib/editions/types.ts`
2. Add config to `COUNTRIES` in `src/lib/editions/countries.ts`
3. Update `COUNTRY_KEYS` array in `src/lib/editions/editions.ts`
4. Add the slug to the valid list in `scripts/build-edition.sh`

The matrix automatically grows: 1 new country = 5 new editions (one per vertical).

## Adding a New Vertical

1. Add slug to `VerticalSlug` type in `src/lib/editions/types.ts`
2. Add config to `VERTICALS` in `src/lib/editions/verticals.ts` (categories, colors, default stores, copy)
3. Update `VERTICAL_KEYS` array in `src/lib/editions/editions.ts`
4. Add the slug to the valid list in `scripts/build-edition.sh`

1 new vertical = 4 new editions (one per country).

## Per-Edition Branding

Each vertical defines `primaryColor`, `accentColor`, `heroEmoji`, and bilingual `name` + `tagline`. UI components should call `getEditionFromEnv()` and use these values to theme themselves. The `EditionBadge` component (`src/components/common/EditionBadge.tsx`) is one consumer.

## Tests

`tests/unit/editions.test.ts` verifies:
- All 20 editions exist
- Pricing tiers are correct
- Store intersection logic
- `getEditionFromEnv` resolution and fallback
- Each country has stores; each vertical has categories
