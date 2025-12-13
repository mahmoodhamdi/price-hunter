# Price Hunter - EB'1F) 'D#39'1

> Find the best prices across all stores

A price comparison platform for products across multiple online stores in Saudi Arabia, Egypt, and UAE.

## Features

- Search any product and compare prices across 15+ stores
- Automatic currency conversion (SAR, EGP, AED, KWD, USD)
- Price alerts when prices drop to your target
- Price history tracking with charts
- Wishlist management
- Barcode scanning
- Full Arabic/English support with RTL

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

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL with Prisma
- **Styling:** Tailwind CSS + shadcn/ui
- **i18n:** next-intl
- **Auth:** NextAuth.js
- **Queue:** BullMQ + Redis
- **Scraping:** Cheerio + Playwright

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run unit tests
npm run test:e2e   # Run E2E tests
npm run db:studio  # Open Prisma Studio
```

## Environment Variables

See `.env.example` for all required environment variables.

## License

MIT
