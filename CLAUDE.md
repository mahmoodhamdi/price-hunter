# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Build for production
npm run lint             # Run ESLint

# Database (Prisma + PostgreSQL)
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev mode)
npm run db:push          # Push schema without migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio GUI (localhost:5555)

# Testing
npm run test             # Run unit tests (Vitest)
npm run test:ui          # Vitest with UI
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run Playwright E2E tests
```

### Running Single Tests
```bash
npx vitest tests/unit/utils.test.ts          # Single unit test file
npx vitest -t "test name"                    # Run test by name
npx playwright test tests/e2e/auth.spec.ts   # Single E2E test
```

### Environment Setup
```bash
cp .env.example .env.local                   # Copy environment template
docker-compose -f docker-compose.dev.yml up  # Start DB + Redis for local dev
```

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 14 with App Router
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js with credentials provider
- **i18n:** next-intl (English/Arabic with RTL support)
- **Styling:** Tailwind CSS + shadcn/ui
- **Queue:** BullMQ + Redis (for scraping jobs)

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login, register)
│   ├── (dashboard)/       # Protected user dashboard
│   ├── admin/             # Admin panel (ADMIN role required)
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── common/            # Shared components (Header, Footer)
│   └── product/           # Product-specific components
├── lib/
│   ├── scrapers/          # Web scrapers for stores
│   ├── services/          # Business logic layer
│   ├── notifications/     # Email/Telegram notifications
│   ├── prisma.ts          # Prisma client singleton
│   └── auth.ts            # NextAuth configuration
├── i18n/                  # Internationalization config
└── types/                 # TypeScript types
tests/
├── unit/                  # Vitest unit tests
├── integration/           # API integration tests
└── e2e/                   # Playwright E2E tests
```

### Scraper Architecture
- Base class: `src/lib/scrapers/base.ts` - defines `ScrapedProduct` interface and common methods
- Store implementations extend `BaseScraper` with `scrapeProduct(url)` and `searchProducts(query)` methods
- Factory function `getScraperForStore(slug)` in `index.ts` returns cached scraper instances
- `scrapeProductFromUrl(url)` auto-detects store from URL domain
- URL validation via `isAllowedScrapeDomain()` in `src/lib/security.ts` prevents SSRF
- Scrapers use random User-Agent rotation and exponential backoff for retries

### Services Layer
Key services in `src/lib/services/`:
- **product-fetch.ts:** Orchestrates scraping, saves products, records price history
- **price-alerts.ts:** Check alerts, trigger notifications when prices drop
- **deals.ts / deal-aggregator.ts:** Find and aggregate best deals
- **currency-converter.ts:** Convert prices between currencies
- **shopping-list.ts:** User shopping list management with sharing
- **price-export.ts:** Export price history in multiple formats
- **browser-extension.ts:** API key management for extension auth

### Database Models (Prisma)
Key entities in `prisma/schema.prisma`:
- **User/Account/Session:** Auth with NextAuth adapter
- **Store:** Retail stores with scrape configs and affiliate settings
- **Product/StoreProduct:** Products and per-store pricing
- **PriceHistory:** Historical price tracking (per StoreProduct)
- **PriceAlert/Wishlist:** User features
- **ScrapeJob:** Background job tracking (PENDING/RUNNING/COMPLETED/FAILED)
- **ShoppingList/ShoppingListItem:** Shareable shopping lists

### i18n
- Locales: `en`, `ar` (with RTL via `localeDirection` in config)
- Config: `src/i18n/config.ts`
- Translation files: `public/locales/{en,ar}.json`

### Data Flow
```
Scraper (fetch HTML) → Services (business logic) → Prisma (database) → API Routes → Frontend
```
- `product-fetch.ts` orchestrates: scrape → normalize → save product → record price history
- All prices normalized to USD via `ExchangeRate` table for comparison

### Route Protection
- Middleware (`src/middleware.ts`) protects `/dashboard/*` and `/admin/*`
- `/dashboard/*` requires any authenticated user
- `/admin/*` requires `role: ADMIN`

### Testing
- Unit tests: `tests/unit/*.test.ts` (Vitest + jsdom)
- Integration tests: `tests/integration/*.test.ts` (API route testing)
- E2E tests: `tests/e2e/*.spec.ts` (Playwright)
- Setup file: `tests/setup.ts`

## Key Patterns

### Path Alias
Use `@/` for imports from `src/` directory.

### API Routes
Located in `src/app/api/`. Use Next.js route handlers with Prisma for data access.

### Store Slugs
Valid identifiers: `amazon-sa`, `amazon-eg`, `amazon-ae`, `noon-sa`, `noon-eg`, `noon-ae`, `jarir`, `extra`, `jumia-eg`, `btech`, `2b`, `sharaf-dg`, `carrefour-ae`, `lulu-sa`

### Currencies
Supported: `SAR`, `EGP`, `AED`, `KWD`, `USD`

### Countries
Supported: `SA` (Saudi Arabia), `EG` (Egypt), `AE` (UAE), `KW` (Kuwait)

### Admin Panel
- Located at `/admin/*` (requires ADMIN role)
- Dashboard: `/admin` - Overview stats
- Stores: `/admin/stores` - Enable/disable stores
- Scrape Jobs: `/admin/scrape-jobs` - Monitor scraping

### Browser Extension API
Endpoints at `/api/extension/*` require `x-api-key` header with user's `extensionApiKey`.

### Cron Endpoints
- `GET /api/cron/check-alerts` - Check price alerts and send notifications
- `GET /api/cron/update-rates` - Update exchange rates
- Requires `x-cron-secret` header matching `CRON_SECRET` env var

### Adding a New Scraper
1. Create `src/lib/scrapers/{store}.ts` extending `BaseScraper`
2. Implement `scrapeProduct(url)` and `searchProducts(query)` methods
3. Add store slug to `StoreSlug` type in `src/lib/scrapers/index.ts`
4. Register in `getScraperForStore()` switch statement
5. Add domain to `ALLOWED_SCRAPE_DOMAINS` in `src/lib/security.ts`
6. Seed store entry in `prisma/seed.ts`

### Default Admin
After seeding: `admin@pricehunter.com` / `Admin123!`
