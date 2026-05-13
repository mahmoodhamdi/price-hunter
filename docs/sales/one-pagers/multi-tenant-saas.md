# Price Hunter — Multi-Tenant SaaS License

> Host **unlimited tenants** under your own brand. Resell editions as your own product. Keep 100% of every dollar your customers pay.

**$20,000** • One-time license • 1 year of priority support

---

## Who this is for

- **Marketing agencies** selling "price comparison white-label" to e-commerce clients.
- **MENA-focused reseller networks** who want to capture 10–20 single-SKU sales at $1,500 each without doing the engineering.
- **Affiliate operators** who want to launch hundreds of micro-sites (one per niche) on the same infrastructure.
- **Regional partners** building a "compare prices in [Lebanon / Bahrain / Oman / Qatar]" play on top of our scrapers.

## What you can do with it

- Spin up unlimited tenant instances on shared infrastructure.
- Each tenant gets their own subdomain (`tenant1.yourbrand.com`) or custom domain (`compareit.example`) with isolated data.
- Each tenant runs any of the 20 editions (or your own custom-configured combination).
- White-label everything: logos, colors, copy, terms-of-service, privacy policy.
- Charge your customers whatever you want — $50/month, $500/month, $50,000 one-time. You keep 100%.
- Use our admin tooling to provision, suspend, or migrate tenants.

## What's included beyond the single SKU

- **Tenant-isolation middleware** — every database query is automatically scoped to the calling tenant. Cross-tenant data leaks are architecturally prevented.
- **Subdomain + custom-domain router** — automatic tenant resolution from the host header.
- **Super-admin panel** — `/super-admin` (separate auth namespace from regular admin); create, suspend, and analytics-view tenants.
- **Tenant onboarding script** — `scripts/onboard-tenant.sh <slug> <edition> <owner-email>` provisions DB rows, sends credentials, and outputs DNS instructions.
- **Billing-provider interfaces** — `Subscription` table with stub adapters for Stripe, Paymob, and Tap. Wire whichever fits your market.
- **Per-tenant analytics** — usage, MAU, scrape jobs, affiliate clicks, revenue projection.
- **Edition build matrix** — `./scripts/build-all-editions.sh` builds all 20 editions; any tenant can use any of them.

## Architecture diagram

```
                    ┌────────────────────────┐
                    │ Your domain / DNS      │
                    │ tenant1.yourbrand.com  │
                    │ tenant2.yourbrand.com  │
                    │ custom.acme-corp.com   │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼───────────┐
                    │  Next.js middleware    │
                    │  resolveTenant(host)   │
                    └────────────┬───────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
        │  Tenant 1    │ │  Tenant 2    │ │  Tenant N    │
        │ ksa-electronics │ eg-fashion  │ │ custom edition│
        └───────┬──────┘ └───────┬──────┘ └───────┬──────┘
                │                │                │
                └────────────────▼────────────────┘
                    ┌────────────────────────┐
                    │  Prisma (tenant-scoped │
                    │  middleware on every   │
                    │  read & write)         │
                    └────────────┬───────────┘
                                 │
                    ┌────────────▼───────────┐
                    │  PostgreSQL (shared,   │
                    │  row-level tenantId)   │
                    └────────────────────────┘
```

## ROI math

Assume you sell 50 tenants in year 1 at an average $3,000 / tenant / year:
- Year 1 revenue: $150,000
- Cost: $20,000 license + hosting (~$200/month × 12 = $2,400) = $22,400
- Year 1 profit: $127,600

Even at 10 tenants × $1,500: you break even by tenant #14.

## What you provide

- Hosting infrastructure (Kubernetes cluster, managed Postgres, Redis)
- Your own brand (logo, name, ToS, privacy)
- Sales and customer success
- Compliance with each tenant's local data-residency rules (we provide single-region defaults)

## What's NOT included

- Compliance certifications (SOC 2, PCI-DSS, GDPR DPA preparation) — those are yours to obtain
- Sales materials, lead generation, SEO
- Payment processing accounts (you sign your own Stripe / Paymob)
- Custom verticals or countries beyond the 20 supported editions (add-on pricing in `PRICING.md`)
- Re-licensing rights (you can host tenants, but you cannot resell the source code as if you owned the IP — for that, see Source Code Acquisition at $30,000)

## Delivery

1. Day 0: $20,000 paid, private repo invite sent
2. Day 1–3: Deployment guide reviewed, onboarding script tested
3. Day 4: Joint Zoom session (~2 hours) — first tenant provisioned end-to-end
4. Day 5–365: 1 year of priority support (4h business-hours SLA)

## Order

Email **mahmoodhamdi@…** with subject `Price Hunter — Multi-Tenant SaaS`. Include: target tenant count, hosting region preference, preferred billing provider.
