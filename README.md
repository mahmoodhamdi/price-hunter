# Price Hunter - صياد الأسعار

> Find the best prices across all stores

A comprehensive price comparison platform for products across multiple online stores in Saudi Arabia, Egypt, and UAE.

## Features

### Core Features
- Search any product and compare prices across 14+ stores
- Automatic currency conversion (SAR, EGP, AED, KWD, USD)
- Price alerts when prices drop to your target
- Price history tracking with charts
- Wishlist management
- Barcode scanning
- Full Arabic/English support with RTL

### Auto-Fetch System
- Automatically scrapes products from stores when not found in database
- Saves scraped products for future searches
- Records price history for all products

### Monetization Features
- Affiliate link tracking with click analytics
- Coupon management system with verification
- Cashback transaction tracking
- Store-level affiliate configuration

### User Authentication
- Email/password authentication
- Password reset with email verification
- Session management
- Role-based access (User/Admin)

### Admin Panel
- Store management
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

# Start PostgreSQL with Docker
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
- **Styling:** Tailwind CSS + shadcn/ui
- **Internationalization:** next-intl (Arabic/English)
- **Authentication:** NextAuth.js
- **Scraping:** Cheerio + Axios
- **Testing:** Vitest + Playwright

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # User dashboard
│   ├── admin/             # Admin panel
│   └── api/               # API routes
├── components/            # React components
│   ├── common/           # Shared components
│   ├── providers/        # Context providers
│   └── ui/               # shadcn/ui components
├── lib/                   # Utilities and services
│   ├── scrapers/         # Store scrapers
│   └── services/         # Business logic
└── i18n/                  # Translations
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run unit tests
npm run test:e2e   # Run E2E tests
npm run db:studio  # Open Prisma Studio
npm run db:seed    # Seed the database
```

## API Endpoints

### Search
- `GET /api/search?q={query}` - Search products
- `GET /api/search?q={query}&fresh=true` - Search with live scraping

### Products
- `GET /api/products/{slug}` - Get product details
- `GET /api/products/{slug}/history` - Get price history

### Stores
- `GET /api/stores` - List all stores
- `GET /api/stores/{slug}` - Get store details

### Coupons
- `GET /api/coupons` - List all active coupons
- `POST /api/coupons/{id}/use` - Track coupon usage

### Affiliate
- `GET /api/go/{id}` - Redirect with affiliate tracking

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Application URL

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Documentation

- [Competitors Analysis](docs/COMPETITORS-ANALYSIS.md) - Market analysis and profit strategy

## License

MIT
