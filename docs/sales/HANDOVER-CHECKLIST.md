# Buyer Handover Checklist

Use this checklist on every delivery. Buyer signs off at the bottom; only then is the second invoice payable.

## Pre-Delivery (vendor)

- [ ] Edition slug confirmed and matches buyer's order
- [ ] Source code branch tagged `delivery/<buyer-slug>-<edition>`
- [ ] Edition built locally and smoke-tested (`./scripts/build-edition.sh <country> <vertical>`)
- [ ] Demo data seeded for the buyer's vertical
- [ ] Default admin password rotated (`Admin123!` is the seed only; buyer gets a fresh one)
- [ ] `.env.example` reviewed; sensitive fields blanked
- [ ] All `console.log` statements with sensitive content removed
- [ ] Tests pass (`npm test -- --run`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type-check passes (`npm run type-check`)
- [ ] Lighthouse run completed on the buyer's edition build
- [ ] AI attribution scan: `git log` clean, source files clean, all sales materials clean

## Delivery (vendor → buyer)

- [ ] Private GitHub repo created and buyer's GitHub user invited as collaborator
- [ ] `delivery/...` branch pushed
- [ ] Edition-specific config (`NEXT_PUBLIC_EDITION` value) communicated in writing
- [ ] Deployment guide link sent (`docs/deployment/vps-deployment.md` or equivalent)
- [ ] Default admin credentials sent via password manager (not email)
- [ ] Buyer's preferred deployment target confirmed: VPS / Docker / Kubernetes
- [ ] DNS instructions sent (`docs/deployment/domain-setup.md`)

## Joint Deployment Session (Zoom / Meet)

- [ ] Recording consent obtained
- [ ] Buyer provisioned VPS / DigitalOcean droplet / Hetzner / etc.
- [ ] DB and Redis up
- [ ] Buyer's domain DNS pointing at server
- [ ] SSL certificate issued (Cloudflare or LetsEncrypt)
- [ ] `npm ci`, `prisma db push`, `prisma db seed` run
- [ ] Edition built: `./scripts/build-edition.sh <country> <vertical>`
- [ ] Production process started (PM2 / systemd / Docker)
- [ ] Buyer logs in as admin successfully
- [ ] Buyer creates a non-admin user, performs a search, adds a price alert, sees the email/Telegram notification
- [ ] Cron secret set; cron job(s) installed (`/api/cron/check-alerts`, `/api/cron/update-rates`)
- [ ] Recording shared with buyer

## Post-Delivery

- [ ] Buyer signed handover acceptance (date + signature below)
- [ ] Second invoice issued and paid
- [ ] 14-day support window started: `<date>` → `<date + 14>`
- [ ] Buyer added to support channel (Slack / email DL)
- [ ] Optional support plan offered

---

## Buyer acceptance

I, **___________________________** (buyer / authorized representative), confirm that the **___________________________** edition has been delivered, deployed to my infrastructure, and is operating as specified. The 14-day support window starts today.

Signature: ___________________________
Date: ___________________________

Vendor representative: **Mahmoud Hamdy**
Vendor signature: ___________________________
Date: ___________________________
