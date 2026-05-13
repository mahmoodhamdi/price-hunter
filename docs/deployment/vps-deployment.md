# VPS Deployment Guide

This guide deploys Price Hunter to a single VPS using Node.js + PM2 + Caddy. Tested on Ubuntu 22.04 and 24.04. Suitable for Launch and Growth traffic stages ($5–$20/month VPS).

For higher traffic, use the Docker deployment guide or the Kubernetes guide.

---

## 1. Provision the VPS

Recommended providers and tiers:

| Provider | Plan | Specs | Cost / month |
|----------|------|-------|--------------|
| DigitalOcean | Basic Droplet | 1 vCPU, 2 GB RAM, 50 GB SSD | $12 |
| Hetzner | CPX11 | 2 vCPU, 2 GB RAM, 40 GB SSD | €4.51 (~$5) |
| Vultr | Cloud Compute | 1 vCPU, 2 GB RAM, 55 GB SSD | $6 |
| Linode | Nanode 1 GB | 1 vCPU, 1 GB RAM, 25 GB SSD | $5 |

Minimum: 1 vCPU, 2 GB RAM, 20 GB disk. The 1 GB RAM tier works but is tight during `npm run build`.

## 2. Initial server setup

SSH in as root and run:

```bash
# Update packages and create a deploy user
apt update && apt upgrade -y
adduser --disabled-password --gecos "" pricehunter
usermod -aG sudo pricehunter
mkdir -p /home/pricehunter/.ssh
cp ~/.ssh/authorized_keys /home/pricehunter/.ssh/
chown -R pricehunter:pricehunter /home/pricehunter/.ssh
chmod 700 /home/pricehunter/.ssh
chmod 600 /home/pricehunter/.ssh/authorized_keys

# Install required tools
apt install -y curl git build-essential

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL 16
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install PM2 globally
npm install -g pm2

# Install Caddy (auto-SSL reverse proxy)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Switch to the deploy user for the rest:

```bash
su - pricehunter
```

## 3. Database setup

```bash
sudo -u postgres psql <<SQL
CREATE USER pricehunter WITH PASSWORD '<GENERATE_A_LONG_PASSWORD>';
CREATE DATABASE price_hunter OWNER pricehunter;
GRANT ALL PRIVILEGES ON DATABASE price_hunter TO pricehunter;
SQL
```

Edit `/etc/postgresql/16/main/pg_hba.conf` and change the `local` line for postgres to `md5` if not already.

## 4. Clone and configure

```bash
cd ~
git clone <your-private-repo-url> price-hunter
cd price-hunter

cp .env.example .env.local
nano .env.local
```

Set these critical variables in `.env.local`:

```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://pricehunter:<PASSWORD>@localhost:5432/price_hunter

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<openssl rand -base64 32>

# Cron and IP salts
CRON_SECRET=<openssl rand -hex 32>
IP_SALT=<openssl rand -hex 32>

# Edition
NEXT_PUBLIC_EDITION=ksa-electronics    # or your purchased slug

# Country / currency defaults (match the edition)
DEFAULT_COUNTRY=SA
DEFAULT_CURRENCY=SAR

# Email (Resend or SMTP)
RESEND_API_KEY=re_...
EMAIL_FROM=alerts@yourdomain.com

# Telegram (optional but recommended)
TELEGRAM_BOT_TOKEN=...
```

## 5. Install, migrate, seed

```bash
npm ci --legacy-peer-deps
npx prisma generate
npx prisma db push
npx prisma db seed

# Build for your edition
./scripts/build-edition.sh <country> <vertical>
```

## 6. Start with PM2

Create `~/price-hunter/ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: "price-hunter-web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/home/pricehunter/price-hunter",
      env_file: "/home/pricehunter/price-hunter/.env.local",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "800M",
    },
  ],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd          # follow the printed command as root
```

## 7. Reverse proxy (Caddy + SSL)

Edit `/etc/caddy/Caddyfile`:

```
yourdomain.com {
  reverse_proxy localhost:3000
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}

www.yourdomain.com {
  redir https://yourdomain.com{uri}
}
```

```bash
sudo systemctl reload caddy
```

Caddy auto-obtains a Let's Encrypt certificate. Point `yourdomain.com` and `www.yourdomain.com` A records at the VPS public IP.

## 8. Cron jobs

```bash
crontab -e
```

Add:

```
# Check price alerts every 10 minutes
*/10 * * * * curl -fsS -H "x-cron-secret: $(grep '^CRON_SECRET' /home/pricehunter/price-hunter/.env.local | cut -d= -f2)" https://yourdomain.com/api/cron/check-alerts >/dev/null

# Update exchange rates every 6 hours
0 */6 * * * curl -fsS -H "x-cron-secret: $(grep '^CRON_SECRET' /home/pricehunter/price-hunter/.env.local | cut -d= -f2)" https://yourdomain.com/api/cron/update-rates >/dev/null
```

## 9. Verify

- `curl -I https://yourdomain.com` → `200 OK`, valid SSL
- Sign in as `admin@pricehunter.com` / `Admin123!` (then immediately rotate the password)
- Create a non-admin user, add a price alert, confirm the email arrives
- Hit `/admin` → see store and scrape job status

## 10. Day-2 operations

```bash
# View logs
pm2 logs price-hunter-web --lines 100

# Restart after a deploy
git pull
npm ci --legacy-peer-deps
npx prisma db push
./scripts/build-edition.sh <country> <vertical>
pm2 reload price-hunter-web

# DB backup (run nightly via cron)
pg_dump -U pricehunter price_hunter | gzip > /home/pricehunter/backups/price_hunter-$(date +\%F).sql.gz
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Out of memory` during `npm run build` | <2 GB RAM | Add 2 GB swap: `fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile` |
| 502 from Caddy | Next not started | `pm2 list` and `pm2 logs` |
| Scrapers always fail | Outbound blocked | Check firewall, then `curl -sI https://www.amazon.sa` |
| Emails never arrive | Resend domain unverified | Verify your domain in Resend dashboard |
| Tests fail with auth errors | NEXTAUTH_SECRET unset | Reset env, restart PM2 |
