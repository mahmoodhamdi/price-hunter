# Price Hunter — Single SKU

> A turn-key MENA price-comparison platform, configured for **one country × one vertical**, deployed to your servers in under a week.

**$1,500** • One-time license • Source code included

---

## The problem you're solving

The Middle East e-commerce market is worth >$60B and growing 20% YoY. Yet the leading price-comparison site (Pricena, since 2012) is slow, cluttered with ads, and offers no Telegram notifications, no real-time price updates, and a clunky mobile experience. Yaoota is Egypt-only and runs on outdated data.

Buyers in the region search "أرخص سعر iPhone" and end up shuffling between five shopping tabs. There is room for a clean, focused, monetized competitor — *specifically* for one niche where you have an edge.

## What you get

- **A production Next.js 14 + TypeScript app**, built and tested. Hand-tuned scrapers for **3–5 stores** matching your country and vertical.
- **Auto-fetch by URL** — paste any product URL from a supported store and the price drops into the comparison table. Most competitors only refresh nightly.
- **Telegram bot + email alerts** — when the user's target price is hit, they get a notification in <60s. No other regional competitor offers Telegram.
- **Affiliate-tracking built in** — affiliate URLs auto-rewritten on every outbound click. Connect your Amazon Associates / Noon Partner account on day one.
- **Cashback wallet schema** — give a portion of your commission back to users for stickiness. UX wired, payout flow gated to admin approval.
- **Coupons section** — admin can publish vouchers; shown on product pages with auto-copy.
- **Bilingual (AR/EN) with full RTL** — your users get a native experience.
- **Admin panel** — manage stores, monitor scrape jobs, browse users.
- **Browser extension API** — your users can install a Chrome/Firefox extension to compare prices on competitor pages (extension scaffold included; final UI is an add-on).
- **PWA-ready** — installable on Android Chrome and iOS Safari.
- **Demo data seeded** — 500 realistic products with 90-day price history so the site looks alive from minute one.

## What's under the hood

- Next.js 14 App Router, TypeScript, React 18
- PostgreSQL + Prisma 6
- Redis + BullMQ for scrape queues
- NextAuth with credentials, rotation, hashed reset tokens
- next-intl for i18n (en, ar with RTL)
- Tailwind CSS + shadcn/ui (theme-able)
- 600+ unit / integration / E2E tests
- Docker images for dev and production
- Optional: Prometheus + Grafana monitoring stack

## How it beats the incumbents

| | Pricena | Yaoota | Google Shopping | Price Hunter |
|---|---|---|---|---|
| 14 MENA stores | ✅ | partial | partial | ✅ |
| Real-time auto-fetch | ❌ | ❌ | ❌ | ✅ |
| Telegram alerts | ❌ | ❌ | ❌ | ✅ |
| Browser extension | ✅ | ❌ | ❌ | ✅ (API ready) |
| Affiliate built in | ✅ | ✅ | n/a | ✅ |
| Dark mode | ❌ | ❌ | ✅ | ✅ |
| Multi-currency | ✅ | ❌ | partial | ✅ |
| Page load <2s | ❌ | ✅ | ✅ | ✅ |
| Ad clutter | high | low | low | none |

## Revenue model (based on observed market data)

70% of revenue from affiliate commissions, 15% cashback margin, 10% featured listings, 5% display ads.

| Stage | Daily Visitors | Monthly Revenue |
|-------|---------------|------------------|
| Launch | 1,000 | $1,000 – $2,000 |
| Growth | 5,000 | $5,000 – $10,000 |
| Scale | 15,000 | $15,000 – $30,000 |
| Mature | 50,000 | $50,000 – $100,000 |

Payback: typical at month 1 even at Launch traffic.

## Delivery timeline

1. **Day 0** — order placed, 50% deposit received
2. **Day 1** — private repo invite sent, edition built
3. **Day 3–5** — joint deployment session (Zoom, ~90 minutes)
4. **Day 5–7** — buyer signs off, final 50% paid
5. **Day 5–19** — 14-day post-launch support window

## What you provide

- A VPS or cloud server ($5–$20/month works for Launch stage)
- A domain
- A Resend account ($0 / month free tier covers Launch traffic) or SMTP credentials
- A Telegram bot token (free, via @BotFather)
- Optional: Amazon Associates / Noon Partner accounts for affiliate links

## What's NOT included (be transparent)

- The buyer owns customer support, marketing, content, and SEO.
- We do not enrol your business in Amazon Associates / Noon partner programs; you do that with your own corporate identity.
- A React Native mobile app is not included. The PWA covers most mobile use cases. A native app is on the roadmap and available as a custom add-on ($8,000+).
- Stripe billing integration is interface-ready but not wired (you select a provider; we can wire Paymob, Tap, or Stripe as a $1,500 add-on).

## Order

Email **mahmoodhamdi@…** with subject `Price Hunter — <edition slug>`. We respond within 24 hours.

---

*All editions: ksa-electronics, ksa-fashion, ksa-grocery, ksa-pharma, eg-electronics, eg-fashion, eg-grocery, eg-pharma, uae-electronics, uae-fashion, uae-grocery, uae-pharma.*
