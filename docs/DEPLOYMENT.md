# Price Hunter - Deployment Guide

This guide covers deploying Price Hunter to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Scaling](#scaling)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 20+ (for manual deployment)
- PostgreSQL 16+
- Redis 7+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

## Quick Start

### Using Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/your-org/price-hunter.git
cd price-hunter

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed database (optional)
docker-compose --profile seed up seed
```

### Verify Deployment

```bash
# Check health
curl http://localhost:3000/api/health

# Check logs
docker-compose logs -f app
```

## Docker Deployment

### Production Stack

The production stack includes:
- **nginx**: Reverse proxy with SSL termination
- **app**: Next.js application
- **db**: PostgreSQL 16 database
- **redis**: Redis 7 cache

### Build and Deploy

```bash
# Build production image
docker build -t price-hunter:latest .

# Or build with compose
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Running Migrations

```bash
# Apply migrations
docker-compose --profile migrate up migrate

# Or exec into running container
docker-compose exec app npx prisma migrate deploy
```

### Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Apply any new migrations
docker-compose exec app npx prisma migrate deploy
```

## Manual Deployment

### 1. Install Dependencies

```bash
npm ci --only=production
npx prisma generate
```

### 2. Build Application

```bash
npm run build
```

### 3. Start Application

```bash
# Using PM2 (recommended)
pm2 start npm --name "price-hunter" -- start

# Or directly
NODE_ENV=production npm start
```

### 4. Setup Process Manager

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup startup script
pm2 startup
```

## Environment Configuration

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/price_hunter

# Auth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.com

# Redis
REDIS_URL=redis://:password@host:6379
```

### Optional Variables

```env
# Email notifications
RESEND_API_KEY=re_xxx
EMAIL_FROM=alerts@yourdomain.com

# Telegram notifications
TELEGRAM_BOT_TOKEN=xxx:xxx

# Monitoring
CRON_SECRET=<generate with: openssl rand -hex 32>
```

### Security Notes

- Never commit `.env` files to version control
- Use secrets management (AWS Secrets Manager, Vault, etc.)
- Rotate secrets regularly
- Use strong passwords (16+ characters)

## Database Setup

### Initial Setup

```bash
# Create database
createdb price_hunter

# Run migrations
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

### Performance Indexes

The schema includes optimized indexes for:
- Product search
- Price history queries
- User lookups
- Store filtering

### Backup

```bash
# Full backup
pg_dump -h localhost -U postgres price_hunter > backup.sql

# Compressed backup
pg_dump -h localhost -U postgres price_hunter | gzip > backup.sql.gz

# Automated backup (add to cron)
0 2 * * * pg_dump -h localhost -U postgres price_hunter | gzip > /backups/$(date +%Y%m%d).sql.gz
```

### Restore

```bash
# From SQL file
psql -h localhost -U postgres price_hunter < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql -h localhost -U postgres price_hunter
```

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d your-domain.com

# Auto-renewal (automatic via systemd timer)
certbot renew --dry-run
```

### Nginx SSL Configuration

Update `nginx/conf.d/default.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

## Scaling

### Horizontal Scaling

```bash
# Scale app containers
docker-compose up -d --scale app=3
```

### Load Balancing

Nginx automatically load balances across app instances.

### Database Scaling

For high traffic:
- Use read replicas
- Connection pooling (PgBouncer)
- Consider managed databases (Supabase, Neon, RDS)

### Redis Scaling

For high traffic:
- Redis Cluster mode
- Managed Redis (Upstash, ElastiCache)

## Backup & Recovery

### Automated Backups

```bash
# Add to crontab
# Database backup daily at 2 AM
0 2 * * * docker-compose exec -T db pg_dump -U postgres price_hunter | gzip > /backups/db-$(date +%Y%m%d).sql.gz

# Redis backup
0 3 * * * docker cp price-hunter-redis:/data/dump.rdb /backups/redis-$(date +%Y%m%d).rdb

# Clean old backups (keep 30 days)
0 4 * * * find /backups -mtime +30 -delete
```

### Disaster Recovery

1. Restore database from backup
2. Restore Redis data (optional, cache will rebuild)
3. Verify application health
4. Update DNS if server changed

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

### Database Connection Issues

```bash
# Test connection
docker-compose exec db psql -U postgres -c "SELECT 1"

# Check connectivity
docker-compose exec app nc -zv db 5432
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check slow queries
docker-compose exec db psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'active'"
```

### Memory Issues

```bash
# Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=4096

# Or in docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G
```

## Health Checks

### Endpoints

- `GET /api/health` - Full health check (database, redis, memory)
- `GET /api/metrics` - Prometheus metrics

### Example Health Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-21T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "up", "latency": 5 },
    "redis": { "status": "up", "latency": 2 },
    "memory": { "status": "ok", "percentage": 45 }
  }
}
```

## Support

For issues and questions:
- GitHub Issues: [github.com/your-org/price-hunter/issues](https://github.com/your-org/price-hunter/issues)
- Documentation: [docs.pricehunter.example.com](https://docs.pricehunter.example.com)
