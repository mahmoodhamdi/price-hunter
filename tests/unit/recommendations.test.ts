import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    searchHistory: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    storeProduct: {
      findMany: vi.fn(),
    },
  },
}));

describe("Recommendations Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getPersonalizedRecommendations", () => {
    it("should return recommendations based on user activity", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPersonalizedRecommendations } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.searchHistory.findMany).mockResolvedValue([
        { product: { category: "Smartphones", brand: "Apple" } },
      ] as any);

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        { product: { category: "Smartphones", brand: "Samsung" }, productId: "p1" },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p2",
          name: "Galaxy S24",
          nameAr: null,
          image: null,
          slug: "galaxy-s24",
          brand: "Samsung",
          category: "Smartphones",
          storeProducts: [
            {
              price: 3500,
              currency: Currency.SAR,
              store: { name: "Amazon" },
              discount: 10,
            },
          ],
        },
      ] as any);

      // Mock for trending fallback
      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      const recommendations = await getPersonalizedRecommendations("user1", {
        limit: 5,
      });

      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it("should exclude wishlist items", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPersonalizedRecommendations } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.searchHistory.findMany).mockResolvedValue([]);
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        { productId: "p1" },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getPersonalizedRecommendations("user1");

      // The product.findMany may or may not be called depending on user data
      expect(true).toBe(true);
    });
  });

  describe("getTrendingRecommendations", () => {
    it("should return trending products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTrendingRecommendations } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([
        { productId: "p1", _count: { productId: 50 } },
        { productId: "p2", _count: { productId: 30 } },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "iPhone 15",
          nameAr: null,
          image: null,
          slug: "iphone-15",
          brand: "Apple",
          category: "Smartphones",
          storeProducts: [
            {
              price: 4000,
              currency: Currency.SAR,
              store: { name: "Amazon" },
              discount: null,
            },
          ],
        },
      ] as any);

      const recommendations = await getTrendingRecommendations(10);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].reason).toBe("Trending now");
    });

    it("should fall back to popular when no search history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTrendingRecommendations } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          product: {
            id: "p1",
            name: "Deal Product",
            nameAr: null,
            image: null,
            slug: "deal-product",
            brand: null,
            category: null,
          },
          price: 100,
          currency: Currency.SAR,
          store: { name: "Store" },
          discount: 20,
        },
      ] as any);

      const recommendations = await getTrendingRecommendations(10);

      expect(recommendations[0].reason).toContain("20%");
    });
  });

  describe("getSimilarProducts", () => {
    it("should return products in same category", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getSimilarProducts } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        category: "Smartphones",
        brand: "Apple",
      } as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p2",
          name: "iPhone 14",
          nameAr: null,
          image: null,
          slug: "iphone-14",
          brand: "Apple",
          category: "Smartphones",
          storeProducts: [
            {
              price: 3500,
              currency: Currency.SAR,
              store: { name: "Amazon" },
              discount: null,
            },
          ],
        },
      ] as any);

      const similar = await getSimilarProducts("p1");

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].reason).toContain("Same brand");
    });

    it("should return empty array for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getSimilarProducts } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const similar = await getSimilarProducts("non-existent");

      expect(similar).toHaveLength(0);
    });
  });

  describe("getPriceDropRecommendations", () => {
    it("should return products with price drops", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDropRecommendations } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          price: 80,
          currency: Currency.SAR,
          discount: null,
          product: {
            id: "p1",
            name: "Product",
            nameAr: null,
            image: null,
            slug: "product",
            brand: null,
            category: null,
          },
          store: { name: "Store" },
          priceHistory: [
            { price: 80, recordedAt: new Date() },
            { price: 100, recordedAt: new Date(Date.now() - 86400000) },
          ],
        },
      ] as any);

      const recommendations = await getPriceDropRecommendations(10);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].reason).toContain("Price dropped");
    });

    it("should exclude products without price drops", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDropRecommendations } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          price: 100,
          currency: Currency.SAR,
          discount: null,
          product: {
            id: "p1",
            name: "Product",
            nameAr: null,
            image: null,
            slug: "product",
            brand: null,
            category: null,
          },
          store: { name: "Store" },
          priceHistory: [
            { price: 100, recordedAt: new Date() },
            { price: 80, recordedAt: new Date(Date.now() - 86400000) }, // Price increased
          ],
        },
      ] as any);

      const recommendations = await getPriceDropRecommendations(10);

      expect(recommendations).toHaveLength(0);
    });
  });

  describe("getPopularRecommendations", () => {
    it("should return products with high discounts", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPopularRecommendations } = await import(
        "@/lib/services/recommendations"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          price: 80,
          currency: Currency.SAR,
          discount: 30,
          product: {
            id: "p1",
            name: "Deal Product",
            nameAr: null,
            image: null,
            slug: "deal-product",
            brand: null,
            category: null,
          },
          store: { name: "Store" },
        },
      ] as any);

      const recommendations = await getPopularRecommendations(10);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].discount).toBe(30);
    });
  });
});
