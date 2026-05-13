# Docker Deployment Guide

This guide deploys Price Hunter using the production `docker-compose.yml` shipped with the repository. Suitable for any host with Docker + Docker Compose v2.

---

## 1. Prerequisites

- Linux host with Docker 24+ and Docker Compose v2
- 2 GB RAM minimum, 4 GB recommended
- A domain pointed at the host's public IP
- Optional: Cloudflare in front of the host for DDoS + free SSL

## 2. Clone and configure

```bash
git clone <your-private-repo-url> price-hunter
cd price-hunter

cp .env.example .env.production
```

Edit `.env.production` and set everything documented in `docs/deployment/vps-deployment.md` section 4. Production-only differences:

```env
NODE_ENV=production

# Use Docker network hostnames, not localhost
DATABASE_URL=postgresql://postgres:<STRONG_PASSWORD>@db:5432/price_hunter
REDIS_URL=redis://redis:6379

# Strong passwords for shared Docker containers
POSTGRES_PASSWORD=<STRONG_PASSWORD>
REDIS_PASSWORD=<STRONG_PASSWORD>

# Edition
NEXT_PUBLIC_EDITION=ksa-electronics
```

## 3. Build the edition image

```bash
docker build \
  --build-arg EDITION=ksa-electronics \
  -t pricehunter/ksa-electronics:1.0.0 \
  .
```

For a multi-edition matrix:

```bash
for edition in ksa-electronics ksa-fashion eg-electronics; do
  docker build --build-arg EDITION=$edition -t pricehunter/$edition:1.0.0 .
done
```

## 4. Start the stack

```bash
docker compose --env-file .env.production up -d
```

This brings up: app (Next.js), db (Postgres 16), redis (Redis 7), and optionally nginx (reverse proxy).

## 5. Database migrations and seed

```bash
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed
```

## 6. SSL termination

Two options:

### Option A: Cloudflare in front of plain HTTP

- Point your domain at the host IP via Cloudflare DNS (orange-cloud on).
- In Cloudflare → SSL/TLS → set to "Full".
- No certificate work on the server. Free.

### Option B: Caddy in a container (preferred for direct access)

Add a `caddy` service to your compose file. See the VPS guide §7 for the Caddyfile contents — mount it into `/etc/caddy/Caddyfile`.

## 7. Cron jobs

Use the host's crontab to hit the cron endpoints inside the container (the URL points at your public domain or the host's bridge IP):

```bash
*/10 * * * * curl -fsS -H "x-cron-secret: $CRON_SECRET" https://yourdomain.com/api/cron/check-alerts >/dev/null
0 */6 * * *  curl -fsS -H "x-cron-secret: $CRON_SECRET" https://yourdomain.com/api/cron/update-rates >/dev/null
```

## 8. Backups

```bash
# Database snapshot (cron-friendly)
docker compose exec -T db pg_dump -U postgres price_hunter | gzip > backups/db-$(date +\%F).sql.gz

# Restore
gunzip -c backups/db-2026-05-13.sql.gz | docker compose exec -T db psql -U postgres price_hunter
```

## 9. Monitoring (optional)

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Brings up Prometheus on `:9090` and Grafana on `:3001`. Default Grafana login from `.env.production` (`GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`).

Dashboards: `monitoring/grafana/dashboards/` (already provisioned).

## 10. Upgrade procedure

```bash
git pull
docker build --build-arg EDITION=$NEXT_PUBLIC_EDITION -t pricehunter/$NEXT_PUBLIC_EDITION:<new-version> .
docker compose up -d --no-deps app
docker compose exec app npx prisma db push
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `app` container exits | Bad env or missing DB | `docker compose logs app` |
| Slow first request | Next.js cold start | Pre-warm with `curl http://localhost:3000` after compose up |
| Scrapers timeout | Outbound DNS blocked | `docker compose exec app nslookup amazon.sa` |
| Prisma "P1001" | DB not yet ready | Wait 10s, retry; or add `depends_on: condition: service_healthy` |
