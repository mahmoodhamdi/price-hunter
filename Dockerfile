# ============================================
# Price Hunter - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Install dev dependencies for build
FROM node:20-alpine AS dev-deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy dependencies
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Build application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install production dependencies
RUN apk add --no-cache libc6-compat openssl curl dumb-init

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create necessary directories
RUN mkdir -p /app/logs && chown -R nextjs:nodejs /app/logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
