import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { isAllowedScrapeDomain } from "@/lib/security";

// Affiliate tag configurations
const AFFILIATE_CONFIGS: Record<string, { param: string; format: (url: string, tag: string) => string }> = {
  "amazon-sa": {
    param: "tag",
    format: (url, tag) => {
      const urlObj = new URL(url);
      urlObj.searchParams.set("tag", tag);
      return urlObj.toString();
    },
  },
  "amazon-eg": {
    param: "tag",
    format: (url, tag) => {
      const urlObj = new URL(url);
      urlObj.searchParams.set("tag", tag);
      return urlObj.toString();
    },
  },
  "amazon-ae": {
    param: "tag",
    format: (url, tag) => {
      const urlObj = new URL(url);
      urlObj.searchParams.set("tag", tag);
      return urlObj.toString();
    },
  },
  "noon-sa": {
    param: "utm_source",
    format: (url, tag) => {
      const urlObj = new URL(url);
      urlObj.searchParams.set("utm_source", tag);
      urlObj.searchParams.set("utm_medium", "affiliate");
      return urlObj.toString();
    },
  },
  "noon-eg": {
    param: "utm_source",
    format: (url, tag) => {
      const urlObj = new URL(url);
      urlObj.searchParams.set("utm_source", tag);
      urlObj.searchParams.set("utm_medium", "affiliate");
      return urlObj.toString();
    },
  },
  "noon-ae": {
    param: "utm_source",
    format: (url, tag) => {
      const urlObj = new URL(url);
      urlObj.searchParams.set("utm_source", tag);
      urlObj.searchParams.set("utm_medium", "affiliate");
      return urlObj.toString();
    },
  },
};

// Default affiliate tracking
function addDefaultTracking(url: string): string {
  const urlObj = new URL(url);
  urlObj.searchParams.set("ref", "pricehunter");
  return urlObj.toString();
}

/**
 * Generate affiliate URL for a store product
 * @throws Error if URL is not from an allowed domain
 */
export async function generateAffiliateUrl(
  storeSlug: string,
  originalUrl: string
): Promise<string> {
  // SECURITY: Validate URL is from an allowed domain to prevent open redirects
  if (!isAllowedScrapeDomain(originalUrl)) {
    throw new Error("URL domain not allowed for affiliate redirect");
  }

  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { affiliateTag: true },
  });

  const config = AFFILIATE_CONFIGS[storeSlug];
  const tag = store?.affiliateTag;

  if (config && tag) {
    return config.format(originalUrl, tag);
  }

  // Fallback to default tracking
  return addDefaultTracking(originalUrl);
}

/**
 * Hash IP address for privacy
 */
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + process.env.IP_SALT || "").digest("hex").substring(0, 16);
}

/**
 * Track affiliate click
 */
export async function trackAffiliateClick(params: {
  storeId: string;
  productId?: string;
  userId?: string;
  url: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}): Promise<string> {
  const click = await prisma.affiliateClick.create({
    data: {
      storeId: params.storeId,
      productId: params.productId,
      userId: params.userId,
      url: params.url,
      referrer: params.referrer,
      userAgent: params.userAgent,
      ipHash: params.ip ? hashIp(params.ip) : "unknown",
    },
  });

  return click.id;
}

/**
 * Mark click as converted and record revenue
 */
export async function recordConversion(
  clickId: string,
  revenue: number
): Promise<void> {
  await prisma.affiliateClick.update({
    where: { id: clickId },
    data: {
      converted: true,
      revenue,
    },
  });
}

/**
 * Get affiliate statistics for admin dashboard
 */
export async function getAffiliateStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  clicksByStore: { store: string; clicks: number; revenue: number }[];
}> {
  const dateFilter = {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  };

  const clicks = await prisma.affiliateClick.findMany({
    where: {
      createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    },
    include: {
      store: { select: { name: true, slug: true } },
    },
  });

  const totalClicks = clicks.length;
  const conversions = clicks.filter((c) => c.converted);
  const totalConversions = conversions.length;
  const totalRevenue = conversions.reduce(
    (sum, c) => sum + Number(c.revenue || 0),
    0
  );
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  // Group by store
  const storeMap = new Map<string, { clicks: number; revenue: number }>();
  clicks.forEach((click) => {
    const storeName = click.store.name;
    const current = storeMap.get(storeName) || { clicks: 0, revenue: 0 };
    current.clicks++;
    if (click.converted) {
      current.revenue += Number(click.revenue || 0);
    }
    storeMap.set(storeName, current);
  });

  const clicksByStore = Array.from(storeMap.entries()).map(([store, data]) => ({
    store,
    ...data,
  }));

  return {
    totalClicks,
    totalConversions,
    totalRevenue,
    conversionRate,
    clicksByStore,
  };
}
