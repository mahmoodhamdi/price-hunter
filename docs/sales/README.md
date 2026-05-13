# Price Hunter — Sales Package

This directory contains everything needed to sell, deliver, and support Price Hunter editions.

## Documents

- [PRICING.md](./PRICING.md) — the canonical pricing sheet (12 single SKUs + bundles + enterprise + add-ons)
- [SUPPORT.md](./SUPPORT.md) — Bronze / Silver / Gold / Platinum support plans
- [HANDOVER-CHECKLIST.md](./HANDOVER-CHECKLIST.md) — buyer acceptance checklist (signed at delivery)
- [PIPELINE-TEMPLATE.md](./PIPELINE-TEMPLATE.md) — weekly sales pipeline tracker

## One-pagers (send to prospects)

- [Single SKU](./one-pagers/single-sku.md) — for any of the 12 $1,500 editions
- [Multi-Tenant SaaS License](./one-pagers/multi-tenant-saas.md) — $20,000 reseller package
- [Source Code Acquisition](./one-pagers/source-acquisition.md) — $30,000 perpetual IP transfer

## Deployment guides (send to buyers)

See `docs/deployment/`:

- [VPS deployment](../deployment/vps-deployment.md) — single VPS with PM2 + Caddy
- [Docker deployment](../deployment/docker-deployment.md) — docker-compose stack

## Edition system

See [docs/EDITIONS.md](../EDITIONS.md) for the technical architecture of the 20-edition matrix.

## Quick links

- Pricing summary: $1.5K single-SKU / $4K country-bundle / $5K vertical-bundle / $9K regional / $20K SaaS / $30K source
- Build an edition: `./scripts/build-edition.sh <country> <vertical>`
- Build all editions: `./scripts/build-all-editions.sh`
- Default admin (after seed, rotate immediately): `admin@pricehunter.com` / `Admin123!`
