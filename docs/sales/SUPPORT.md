# Support Plans

After your initial 14-day post-launch window, choose a plan or pay per-incident.

## Plan Matrix

| | Bronze | Silver | Gold | Platinum |
|---|---|---|---|---|
| **Monthly cost** | Free (14 days only) | $200 | $500 | $1,500 |
| **Response SLA** | 72 hours | 24h business hours | 4h business hours | 1h, 24×7 |
| **Critical bug fixes** | ✅ | ✅ | ✅ | ✅ |
| **Minor features** | ❌ | ✅ | ✅ | ✅ |
| **Vertical config tweaks** | ❌ | ❌ | 1/month | Unlimited |
| **Monthly deployment** | ❌ | ❌ | ❌ | ✅ |
| **Scraper drift updates** | ❌ | ❌ | Best-effort | Proactive |
| **Telegram/email priority** | Email | Email | Email + Slack | Phone + Slack + Email |
| **Quarterly architecture review** | ❌ | ❌ | ❌ | ✅ |

## What "scraper drift" means

Store websites change. When a retailer changes HTML, the scraper's selector breaks and prices stop updating. Without monitoring this can go unnoticed for days.

- **Best-effort (Gold)** — we fix it within 5 business days of a buyer report.
- **Proactive (Platinum)** — we monitor a canary URL every hour. When success rate drops below 50% for any store, our team is paged automatically and a fix lands within 24 hours, often before you notice.

## Per-Incident (no plan)

If you don't want a recurring plan: **$250 / hour, 2-hour minimum**, paid up-front. Average bug-fix billing is 2–4 hours.

## Out of Scope (any plan)

- Refactoring or feature redesign beyond a single config tweak
- Migrations between editions (e.g., adding a country) — see Add-Ons in `PRICING.md`
- Compliance work (GDPR, PCI, regional data residency)
- Affiliate program account creation with Amazon/Noon/etc. (the buyer owns these accounts)
- Marketing, SEO, or content creation
