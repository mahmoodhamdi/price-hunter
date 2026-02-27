import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: {
      findUnique: vi.fn(),
    },
    affiliateClick: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/security", () => ({
  isAllowedScrapeDomain: vi.fn(),
}));

import {
  generateAffiliateUrl,
  trackAffiliateClick,
  recordConversion,
  getAffiliateStats,
} from "@/lib/services/affiliate";
import { prisma } from "@/lib/prisma";
import { isAllowedScrapeDomain } from "@/lib/security";

describe("Affiliate Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateAffiliateUrl", () => {
    it("should add Amazon tag parameter", async () => {
      vi.mocked(isAllowedScrapeDomain).mockReturnValue(true);
      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        affiliateTag: "pricehunter-20",
      } as any);

      const result = await generateAffiliateUrl(
        "amazon-sa",
        "https://www.amazon.sa/dp/B09V3KXJPB"
      );
      expect(result).toContain("tag=pricehunter-20");
    });

    it("should add Noon utm_source parameter", async () => {
      vi.mocked(isAllowedScrapeDomain).mockReturnValue(true);
      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        affiliateTag: "pricehunter",
      } as any);

      const result = await generateAffiliateUrl(
        "noon-sa",
        "https://www.noon.com/saudi-en/product/123"
      );
      expect(result).toContain("utm_source=pricehunter");
      expect(result).toContain("utm_medium=affiliate");
    });

    it("should fallback to default tracking without affiliate tag", async () => {
      vi.mocked(isAllowedScrapeDomain).mockReturnValue(true);
      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        affiliateTag: null,
      } as any);

      const result = await generateAffiliateUrl(
        "amazon-sa",
        "https://www.amazon.sa/dp/B09V3KXJPB"
      );
      expect(result).toContain("ref=pricehunter");
    });

    it("should fallback for unconfigured store slugs", async () => {
      vi.mocked(isAllowedScrapeDomain).mockReturnValue(true);
      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        affiliateTag: "tag",
      } as any);

      const result = await generateAffiliateUrl(
        "jarir",
        "https://www.jarir.com/sa-en/product/123"
      );
      expect(result).toContain("ref=pricehunter");
    });

    it("should throw for disallowed domains", async () => {
      vi.mocked(isAllowedScrapeDomain).mockReturnValue(false);
      await expect(
        generateAffiliateUrl("amazon-sa", "https://evil.com/steal")
      ).rejects.toThrow("URL domain not allowed");
    });
  });

  describe("trackAffiliateClick", () => {
    it("should create click record with hashed IP", async () => {
      vi.mocked(prisma.affiliateClick.create).mockResolvedValue({
        id: "click-1",
      } as any);

      const result = await trackAffiliateClick({
        storeId: "store-1",
        productId: "product-1",
        userId: "user-1",
        url: "https://amazon.sa/product/123",
        ip: "192.168.1.1",
      });

      expect(result).toBe("click-1");
      expect(prisma.affiliateClick.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storeId: "store-1",
          productId: "product-1",
          userId: "user-1",
          url: "https://amazon.sa/product/123",
        }),
      });

      // IP should be hashed, not stored raw
      const callArgs = vi.mocked(prisma.affiliateClick.create).mock.calls[0][0];
      expect(callArgs.data.ipHash).not.toBe("192.168.1.1");
    });

    it("should handle missing IP", async () => {
      vi.mocked(prisma.affiliateClick.create).mockResolvedValue({
        id: "click-2",
      } as any);

      const result = await trackAffiliateClick({
        storeId: "store-1",
        url: "https://amazon.sa/product/123",
      });

      expect(result).toBe("click-2");
      const callArgs = vi.mocked(prisma.affiliateClick.create).mock.calls[0][0];
      expect(callArgs.data.ipHash).toBe("unknown");
    });
  });

  describe("recordConversion", () => {
    it("should update click with conversion data", async () => {
      vi.mocked(prisma.affiliateClick.update).mockResolvedValue({} as any);

      await recordConversion("click-1", 50.0);

      expect(prisma.affiliateClick.update).toHaveBeenCalledWith({
        where: { id: "click-1" },
        data: { converted: true, revenue: 50.0 },
      });
    });
  });

  describe("getAffiliateStats", () => {
    it("should calculate correct stats", async () => {
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([
        { converted: true, revenue: 100, store: { name: "Amazon SA", slug: "amazon-sa" } },
        { converted: true, revenue: 50, store: { name: "Amazon SA", slug: "amazon-sa" } },
        { converted: false, revenue: null, store: { name: "Noon SA", slug: "noon-sa" } },
        { converted: false, revenue: null, store: { name: "Noon SA", slug: "noon-sa" } },
      ] as any);

      const stats = await getAffiliateStats();

      expect(stats.totalClicks).toBe(4);
      expect(stats.totalConversions).toBe(2);
      expect(stats.totalRevenue).toBe(150);
      expect(stats.conversionRate).toBe(50);
      expect(stats.clicksByStore).toHaveLength(2);
    });

    it("should handle empty data", async () => {
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      const stats = await getAffiliateStats();

      expect(stats.totalClicks).toBe(0);
      expect(stats.totalConversions).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.conversionRate).toBe(0);
      expect(stats.clicksByStore).toHaveLength(0);
    });

    it("should filter by date range", async () => {
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      const start = new Date("2024-01-01");
      const end = new Date("2024-12-31");
      await getAffiliateStats(start, end);

      expect(prisma.affiliateClick.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: start, lte: end },
        },
        include: {
          store: { select: { name: true, slug: true } },
        },
      });
    });
  });
});
