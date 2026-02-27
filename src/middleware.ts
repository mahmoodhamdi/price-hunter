import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMITS = {
  api: 100, // 100 requests per minute
  auth: 10, // 10 auth attempts per minute
  scrape: 30, // 30 scrape requests per minute
};

// In-memory rate limit store (use Redis in production cluster)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(ip: string, type: string): string {
  return `${type}:${ip}`;
}

function checkRateLimit(ip: string, type: keyof typeof RATE_LIMITS): { limited: boolean; remaining: number } {
  const key = getRateLimitKey(ip, type);
  const now = Date.now();
  const record = rateLimitStore.get(key);
  const limit = RATE_LIMITS[type];

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { limited: false, remaining: limit - 1 };
  }

  record.count++;
  const remaining = Math.max(0, limit - record.count);
  return { limited: record.count > limit, remaining };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "127.0.0.1";
}

// Main middleware with auth
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const ip = getClientIP(req);

    // Admin route protection
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // API rate limiting
    if (pathname.startsWith("/api/")) {
      let limitType: keyof typeof RATE_LIMITS = "api";

      if (pathname.startsWith("/api/auth")) {
        limitType = "auth";
      } else if (pathname.startsWith("/api/scrape") || pathname.includes("/scrape")) {
        limitType = "scrape";
      }

      const { limited, remaining } = checkRateLimit(ip, limitType);

      if (limited) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
              "X-RateLimit-Limit": String(RATE_LIMITS[limitType]),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      // Add rate limit headers to response
      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", String(RATE_LIMITS[limitType]));
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      return response;
    }

    // Cron endpoint protection
    if (pathname.startsWith("/api/cron/")) {
      const cronSecret = req.headers.get("x-cron-secret");
      if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Extension API protection
    if (pathname.startsWith("/api/extension/")) {
      const apiKey = req.headers.get("x-api-key");
      if (!apiKey) {
        return NextResponse.json(
          { error: "API key required" },
          { status: 401 }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Protected routes require authentication
        const protectedRoutes = [
          "/dashboard",
          "/admin",
          "/wishlist",
          "/alerts",
          "/settings",
          "/profile",
          "/shopping-lists",
        ];

        const isProtected = protectedRoutes.some((route) =>
          pathname.startsWith(route)
        );

        // Protected API routes
        const protectedApiRoutes = [
          "/api/wishlist",
          "/api/alerts",
          "/api/user",
          "/api/shopping-lists",
        ];

        const isProtectedApi = protectedApiRoutes.some((route) =>
          pathname.startsWith(route)
        );

        if (isProtected || isProtectedApi) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
