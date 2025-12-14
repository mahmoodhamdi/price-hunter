# Price Hunter - صياد الأسعار

> Find the best prices across all stores

A comprehensive price comparison platform for products across multiple online stores in Saudi Arabia, Egypt, and UAE.

## Features

### Core Features
- Search any product and compare prices across 14+ stores
- Automatic currency conversion (SAR, EGP, AED, KWD, USD)
- Price alerts when prices drop to your target
- Price history tracking with charts and export
- Wishlist management
- Barcode scanning
- Full Arabic/English support with RTL

### Smart Features
- **Deal Aggregator** - Find and filter the best deals across all stores
- **Price Predictions** - ML-based price trend predictions
- **Shopping Lists** - Create, share, and copy shopping lists
- **Store Reviews** - User reviews with ratings for stores
- **Stock Notifications** - Get notified when out-of-stock items return
- **Price Export** - Export price history in CSV, JSON, or Excel

### Auto-Fetch System
- Automatically scrapes products from stores when not found in database
- Saves scraped products for future searches
- Records price history for all products

### Monetization Features
- Affiliate link tracking with click analytics
- Coupon management system with verification
- Cashback transaction tracking
- Store-level affiliate configuration

### Browser Extension
- Compare prices while browsing any supported store
- Quick add to wishlist
- Price tracking from any product page
- API key authentication

### User Authentication
- Email/password authentication
- Password reset with email verification
- Session management
- Role-based access (User/Admin)

### Admin Panel
- Store management (enable/disable stores)
- Coupon management
- Scrape job monitoring
- User management

## Supported Stores

### Saudi Arabia
- Amazon.sa
- Noon
- Jarir
- Extra
- Lulu

### Egypt
- Amazon.eg
- Noon
- Jumia
- B.Tech
- 2B

### UAE
- Amazon.ae
- Noon
- Sharaf DG
- Carrefour

## Quick Start

```bash
# Clone the repository
git clone https://github.com/mahmoodhamdi/price-hunter.git
cd price-hunter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start PostgreSQL and Redis with Docker
docker-compose up -d

# Push database schema
npx prisma db push

# Seed the database
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Admin Account
- Email: admin@pricehunter.com
- Password: Admin123!

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Cache/Queue:** Redis + BullMQ
- **Styling:** Tailwind CSS + shadcn/ui
- **Internationalization:** next-intl (Arabic/English with RTL)
- **Authentication:** NextAuth.js
- **Scraping:** Cheerio + Axios
- **Charts:** Recharts
- **Testing:** Vitest + Playwright
- **Email:** Resend

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # User dashboard
│   ├── admin/             # Admin panel
│   └── api/               # API routes
├── components/
│   ├── common/            # Shared components (Header, Footer)
│   ├── providers/         # Context providers
│   ├── product/           # Product-specific components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── scrapers/          # Store scrapers (base + implementations)
│   ├── services/          # Business logic layer
│   ├── notifications/     # Email/Telegram notifications
│   └── security.ts        # Security utilities
├── i18n/                  # Internationalization config
└── types/                 # TypeScript types
tests/
├── unit/                  # Vitest unit tests
├── integration/           # API integration tests
└── e2e/                   # Playwright E2E tests
```

## Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:push          # Push schema changes
npm run db:seed          # Seed the database
npm run db:studio        # Open Prisma Studio (localhost:5555)

# Testing
npm run test             # Run unit tests
npm run test:ui          # Vitest with UI
npm run test:coverage    # Run with coverage
npm run test:e2e         # Run Playwright E2E tests
```

## API Endpoints

### Search
- `GET /api/search?q={query}` - Search products
- `GET /api/search?q={query}&fresh=true` - Search with live scraping

### Products
- `GET /api/products/{id}` - Get product details

### Price History
- `GET /api/price-history/export?productId={id}&format={csv|json|xlsx}` - Export history
- `GET /api/price-history/summary?productId={id}` - Get price summary
- `GET /api/price-history/chart?productId={id}` - Get chart data

### Deals
- `GET /api/deals` - Get current deals
- `GET /api/deals/aggregate` - Aggregated deals with filters
- `GET /api/deals/compare` - Compare deals across stores

### Alerts & Wishlist
- `GET/POST /api/alerts` - Manage price alerts
- `GET/POST /api/wishlist` - Manage wishlist

### Shopping Lists
- `GET/POST /api/shopping-lists` - Manage shopping lists
- `GET/PUT/DELETE /api/shopping-lists/{id}` - Single list operations
- `POST /api/shopping-lists/{id}/items` - Add items to list

### Coupons
- `GET /api/coupons` - List all active coupons

### Store Reviews
- `GET/POST /api/store-reviews` - Manage store reviews

### Currency
- `GET /api/currency?from={currency}&to={currency}&amount={amount}` - Convert currency

### Affiliate
- `GET /api/go/{id}` - Redirect with affiliate tracking

### Browser Extension
- `GET /api/extension/price` - Get price for URL
- `GET /api/extension/search` - Search products
- `POST /api/extension/track` - Track product
- `POST /api/extension/wishlist` - Add to wishlist
- `GET /api/extension/compare` - Compare prices

*Extension endpoints require `x-api-key` header*

### Cron (Protected)
- `GET /api/cron/check-alerts` - Check and trigger price alerts
- `GET /api/cron/update-rates` - Update exchange rates

*Requires `x-cron-secret` header*

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/price_hunter

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=alerts@yourdomain.com

# Exchange Rates
EXCHANGE_RATE_API_KEY=your-api-key

# Scraping
SCRAPE_DELAY_MIN=1000
SCRAPE_DELAY_MAX=3000
```

## Testing

```bash
# Run all unit tests
npm test

# Run specific test file
npx vitest tests/unit/utils.test.ts

# Run tests matching pattern
npx vitest -t "price calculation"

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test tests/e2e/auth.spec.ts
```

## Docker

```bash
# Start all services (DB + Redis + App)
docker-compose up -d

# Start only DB and Redis (for local development)
docker-compose -f docker-compose.dev.yml up -d
```

## Documentation

- [Competitors Analysis](docs/COMPETITORS-ANALYSIS.md) - Market analysis and profit strategy

## License

MIT
