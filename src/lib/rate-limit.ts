/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis-based solution like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      success: true,
      remaining: config.max - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (entry.count >= config.max) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/**
 * Create a rate limit key combining IP and optional user ID
 */
export function createRateLimitKey(
  prefix: string,
  ip: string,
  userId?: string
): string {
  if (userId) {
    return `${prefix}:user:${userId}`;
  }
  return `${prefix}:ip:${ip}`;
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  AUTH_REGISTER: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 per hour
  AUTH_LOGIN: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 per 15 minutes
  AUTH_FORGOT_PASSWORD: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 per hour

  // Public endpoints - moderate limits
  SEARCH: { windowMs: 60 * 60 * 1000, max: 60 }, // 60 per hour
  DEALS: { windowMs: 60 * 60 * 1000, max: 100 }, // 100 per hour
  BARCODE: { windowMs: 60 * 60 * 1000, max: 30 }, // 30 per hour

  // Authenticated user endpoints
  ALERTS: { windowMs: 60 * 60 * 1000, max: 20 }, // 20 per hour
  WISHLIST: { windowMs: 60 * 60 * 1000, max: 100 }, // 100 per hour
  SHOPPING_LIST: { windowMs: 60 * 60 * 1000, max: 100 }, // 100 per hour
  REVIEWS: { windowMs: 24 * 60 * 60 * 1000, max: 10 }, // 10 per day

  // Extension API
  EXTENSION: { windowMs: 60 * 60 * 1000, max: 200 }, // 200 per hour

  // Default
  DEFAULT: { windowMs: 60 * 60 * 1000, max: 100 }, // 100 per hour
} as const;

/**
 * Helper to create rate limit error response
 */
export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    }
  );
}
