import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    redis?: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      used: number;
      total: number;
      percentage: number;
    };
  };
}

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    memory: { status: "ok", used: 0, total: 0, percentage: 0 },
  };

  let overallStatus: HealthStatus["status"] = "healthy";

  // Check database connection
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    overallStatus = "unhealthy";
  }

  // Check Redis if configured
  if (process.env.REDIS_URL) {
    try {
      const redisStart = Date.now();
      // Simple Redis ping check using ioredis
      const Redis = (await import("ioredis")).default;
      const client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true,
      });
      await client.connect();
      await client.ping();
      await client.quit();
      checks.redis = {
        status: "up",
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      if (overallStatus === "healthy") {
        overallStatus = "degraded";
      }
    }
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

  checks.memory = {
    status: memoryPercentage > 90 ? "critical" : memoryPercentage > 70 ? "warning" : "ok",
    used: Math.round(usedMemory / 1024 / 1024),
    total: Math.round(totalMemory / 1024 / 1024),
    percentage: memoryPercentage,
  };

  if (checks.memory.status === "critical") {
    overallStatus = "unhealthy";
  } else if (checks.memory.status === "warning" && overallStatus === "healthy") {
    overallStatus = "degraded";
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp,
    version: process.env.npm_package_version || "1.0.0",
    uptime,
    checks,
  };

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
