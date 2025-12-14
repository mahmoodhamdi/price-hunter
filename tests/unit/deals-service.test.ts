import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeProduct: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    searchHistory: {
      groupBy: vi.fn(),
    },
  },
}));

describe("Deals Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getDeals", () => {
    it("should return products with discounts", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deals");

      const mockStoreProducts = [
        {
          id: "sp1",
          productId: "p1",
          discount: 25,
          price: { toNumber: () => 750 },
          originalPrice: { toNumber: () => 1000 },
          currency: "SAR",
          url: "https://store.com/product",
          inStock: true,
          product: {
            id: "p1",
            name: "iPhone 15",
            nameAr: "آيفون 15",
            image: "/image.jpg",
            brand: "Apple",
          },
          store: {
            name: "Amazon",
            nameAr: "أمازون",
            slug: "amazon-sa",
            logo: "/logo.svg",
          },
        },
      ];

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockStoreProducts as any);

      const deals = await getDeals({ limit: 10, minDiscount: 10 });

      expect(deals).toHaveLength(1);
      expect(deals[0].name).toBe("iPhone 15");
      expect(deals[0].discount).toBe(25);
      expect(deals[0].store.slug).toBe("amazon-sa");
    });

    it("should filter by country", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deals");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getDeals({ country: "SA", limit: 10 });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            store: expect.objectContaining({
              country: "SA",
            }),
          }),
        })
      );
    });

    it("should filter by category", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deals");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getDeals({ category: "Smartphones", limit: 10 });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: expect.objectContaining({
              category: expect.objectContaining({
                contains: "Smartphones",
              }),
            }),
          }),
        })
      );
    });

    it("should respect minDiscount parameter", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deals");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getDeals({ minDiscount: 20, limit: 10 });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            discount: { gte: 20 },
          }),
        })
      );
    });

    it("should order by discount descending", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deals");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getDeals({ limit: 10 });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { discount: "desc" },
        })
      );
    });
  });

  describe("getTrendingProducts", () => {
    it("should return trending products based on search history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTrendingProducts } = await import("@/lib/services/deals");

      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([
        { productId: "p1", _count: { productId: 50 } },
        { productId: "p2", _count: { productId: 30 } },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "iPhone 15",
          nameAr: null,
          image: "/img.jpg",
          storeProducts: [{ price: { toNumber: () => 4000 }, currency: "SAR" }],
        },
        {
          id: "p2",
          name: "Galaxy S24",
          nameAr: null,
          image: "/img2.jpg",
          storeProducts: [{ price: { toNumber: () => 3500 }, currency: "SAR" }],
        },
      ] as any);

      const trending = await getTrendingProducts({ limit: 10, days: 7 });

      expect(trending).toHaveLength(2);
      expect(trending[0].productId).toBe("p1");
      expect(trending[0].searchCount).toBe(50);
    });

    it("should fall back to recent products when no search history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTrendingProducts } = await import("@/lib/services/deals");

      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "Recent Product",
          nameAr: null,
          image: null,
          storeProducts: [],
        },
      ] as any);

      const trending = await getTrendingProducts({ limit: 10 });

      expect(trending).toHaveLength(1);
      expect(trending[0].searchCount).toBe(0);
    });
  });

  describe("getNewProducts", () => {
    it("should return recently added products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getNewProducts } = await import("@/lib/services/deals");

      const mockStoreProducts = [
        {
          id: "sp1",
          productId: "p1",
          discount: 10,
          price: { toNumber: () => 900 },
          originalPrice: { toNumber: () => 1000 },
          currency: "SAR",
          url: "https://store.com/product",
          createdAt: new Date(),
          product: {
            id: "p1",
            name: "New Product",
            nameAr: null,
            image: null,
            brand: "Brand",
          },
          store: {
            name: "Store",
            nameAr: "متجر",
            slug: "store",
            logo: null,
          },
        },
      ];

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockStoreProducts as any);

      const newProducts = await getNewProducts({ limit: 10, days: 7 });

      expect(newProducts).toHaveLength(1);
      expect(newProducts[0].name).toBe("New Product");
    });

    it("should filter by country", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getNewProducts } = await import("@/lib/services/deals");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getNewProducts({ country: "EG", limit: 10 });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            store: expect.objectContaining({
              country: "EG",
            }),
          }),
        })
      );
    });
  });

  describe("getPriceDrops", () => {
    it("should return products with price drops", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDrops } = await import("@/lib/services/deals");

      const mockStoreProducts = [
        {
          id: "sp1",
          productId: "p1",
          discount: 15,
          price: 850,
          originalPrice: 1000,
          currency: "SAR",
          url: "https://store.com/product",
          inStock: true,
          product: {
            id: "p1",
            name: "Price Drop Product",
            nameAr: null,
            image: null,
            brand: "Brand",
          },
          store: {
            name: "Store",
            nameAr: "متجر",
            slug: "store",
            logo: null,
          },
          priceHistory: [
            { price: 850, recordedAt: new Date() },
            { price: 1000, recordedAt: new Date(Date.now() - 86400000) },
          ],
        },
      ];

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockStoreProducts as any);

      const drops = await getPriceDrops({ limit: 10 });

      expect(drops).toHaveLength(1);
      expect(drops[0].previousPrice).toBe(1000);
      expect(drops[0].dropPercentage).toBe(15);
    });

    it("should exclude products without price history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDrops } = await import("@/lib/services/deals");

      const mockStoreProducts = [
        {
          id: "sp1",
          productId: "p1",
          price: 850,
          originalPrice: null,
          currency: "SAR",
          url: "https://store.com/product",
          inStock: true,
          product: { name: "Product", nameAr: null, image: null, brand: null },
          store: { name: "Store", nameAr: "متجر", slug: "store", logo: null },
          priceHistory: [{ price: 850, recordedAt: new Date() }], // Only one entry
        },
      ];

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockStoreProducts as any);

      const drops = await getPriceDrops({ limit: 10 });

      expect(drops).toHaveLength(0);
    });

    it("should exclude products with price increase", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDrops } = await import("@/lib/services/deals");

      const mockStoreProducts = [
        {
          id: "sp1",
          productId: "p1",
          price: 1100,
          originalPrice: null,
          currency: "SAR",
          url: "https://store.com/product",
          inStock: true,
          product: { name: "Product", nameAr: null, image: null, brand: null },
          store: { name: "Store", nameAr: "متجر", slug: "store", logo: null },
          priceHistory: [
            { price: 1100, recordedAt: new Date() }, // Current - higher
            { price: 1000, recordedAt: new Date(Date.now() - 86400000) }, // Previous - lower
          ],
        },
      ];

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockStoreProducts as any);

      const drops = await getPriceDrops({ limit: 10 });

      expect(drops).toHaveLength(0);
    });
  });
});
