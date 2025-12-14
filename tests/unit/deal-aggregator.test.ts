import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeProduct: {
      findMany: vi.fn(),
    },
    priceHistory: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    store: {
      findMany: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
    },
    searchHistory: {
      findMany: vi.fn(),
    },
    affiliateClick: {
      groupBy: vi.fn(),
    },
  },
}));

describe("Deal Aggregator Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getDeals", () => {
    it("should return deals sorted by discount", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 80,
          originalPrice: 100,
          discount: 20,
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: 4.5,
          reviewCount: 100,
          updatedAt: new Date(),
          product: { id: "p1", name: "Product 1", slug: "product-1", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
        {
          id: "sp2",
          productId: "p2",
          storeId: "s1",
          price: 50,
          originalPrice: 100,
          discount: 50,
          currency: Currency.SAR,
          url: "http://store.com/p2",
          inStock: true,
          rating: 4.0,
          reviewCount: 50,
          updatedAt: new Date(),
          product: { id: "p2", name: "Product 2", slug: "product-2", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
      ] as any);

      const deals = await getDeals();

      expect(deals).toHaveLength(2);
      expect(deals[0].discount).toBe(20);
      expect(deals[1].discount).toBe(50);
    });

    it("should filter by minimum discount", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getDeals({ minDiscount: 30 });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            discount: { gte: 30 },
          }),
        })
      );
    });

    it("should filter by store IDs", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getDeals({ storeIds: ["s1", "s2"] });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId: { in: ["s1", "s2"] },
          }),
        })
      );
    });

    it("should filter by in-stock only", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getDeals({ inStockOnly: true });

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            inStock: true,
          }),
        })
      );
    });
  });

  describe("getFlashSales", () => {
    it("should return deals with 30%+ discount", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getFlashSales } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 70,
          originalPrice: 100,
          discount: 30,
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p1", name: "Flash Product", slug: "flash-product", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
      ] as any);

      const deals = await getFlashSales(20);

      expect(deals).toHaveLength(1);
      expect(deals[0].dealType).toBe("flash_sale");
    });
  });

  describe("getClearanceDeals", () => {
    it("should return deals with 50%+ discount", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getClearanceDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 50,
          originalPrice: 100,
          discount: 50,
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p1", name: "Clearance Product", slug: "clearance-product", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
      ] as any);

      const deals = await getClearanceDeals(20);

      expect(deals).toHaveLength(1);
      expect(deals[0].dealType).toBe("clearance");
    });
  });

  describe("getPriceDrops", () => {
    it("should return recent price drops", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDrops } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([
        {
          id: "ph1",
          price: 100,
          recordedAt: new Date(),
          storeProduct: {
            id: "sp1",
            productId: "p1",
            storeId: "s1",
            price: 80, // Current price is lower
            currency: Currency.SAR,
            url: "http://store.com/p1",
            inStock: true,
            rating: null,
            reviewCount: null,
            updatedAt: new Date(),
            product: { id: "p1", name: "Price Drop Product", slug: "price-drop", nameAr: null, image: null },
            store: { id: "s1", name: "Store 1", slug: "store-1" },
          },
        },
      ] as any);

      const deals = await getPriceDrops(24, 10, 50);

      expect(deals).toHaveLength(1);
      expect(deals[0].dealType).toBe("price_drop");
      expect(deals[0].discountPercentage).toBe(20);
    });

    it("should not include items with price increase", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDrops } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([
        {
          id: "ph1",
          price: 80, // Previous price
          recordedAt: new Date(),
          storeProduct: {
            id: "sp1",
            productId: "p1",
            storeId: "s1",
            price: 100, // Current price is higher
            currency: Currency.SAR,
            url: "http://store.com/p1",
            inStock: true,
            rating: null,
            reviewCount: null,
            updatedAt: new Date(),
            product: { id: "p1", name: "Product", slug: "product", nameAr: null, image: null },
            store: { id: "s1", name: "Store 1", slug: "store-1" },
          },
        },
      ] as any);

      const deals = await getPriceDrops(24, 10, 50);

      expect(deals).toHaveLength(0);
    });
  });

  describe("getDealsByCategory", () => {
    it("should return deals for specific category", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDealsByCategory } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "Electronics Product",
          slug: "electronics-product",
          nameAr: null,
          image: null,
          category: "Electronics",
          storeProducts: [
            {
              id: "sp1",
              storeId: "s1",
              price: 80,
              originalPrice: 100,
              discount: 20,
              currency: Currency.SAR,
              url: "http://store.com/p1",
              inStock: true,
              rating: null,
              reviewCount: null,
              updatedAt: new Date(),
              store: { id: "s1", name: "Store 1", slug: "store-1" },
            },
          ],
        },
      ] as any);

      const deals = await getDealsByCategory("Electronics", 50);

      expect(deals).toHaveLength(1);
      expect(deals[0].productName).toBe("Electronics Product");
    });
  });

  describe("getDealSummary", () => {
    it("should return deal statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDealSummary } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 70,
          originalPrice: 100,
          discount: 30,
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p1", name: "Product 1", slug: "product-1", nameAr: null, image: null, category: "Electronics" },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
        {
          id: "sp2",
          productId: "p2",
          storeId: "s2",
          price: 50,
          originalPrice: 100,
          discount: 50,
          currency: Currency.SAR,
          url: "http://store.com/p2",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p2", name: "Product 2", slug: "product-2", nameAr: null, image: null, category: "Electronics" },
          store: { id: "s2", name: "Store 2", slug: "store-2" },
        },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { category: "Electronics" },
        { category: "Electronics" },
      ] as any);

      const summary = await getDealSummary();

      expect(summary.totalDeals).toBe(2);
      expect(summary.maxDiscount).toBe(50);
      expect(summary.averageDiscount).toBe(40);
      expect(summary.byStore).toHaveLength(2);
    });
  });

  describe("getBestDeals", () => {
    it("should return deals sorted by absolute savings", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getBestDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 800,
          originalPrice: 1000,
          discount: 20,
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p1", name: "Expensive Product", slug: "expensive", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
        {
          id: "sp2",
          productId: "p2",
          storeId: "s1",
          price: 50,
          originalPrice: 100,
          discount: 50,
          currency: Currency.SAR,
          url: "http://store.com/p2",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p2", name: "Cheap Product", slug: "cheap", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
      ] as any);

      const deals = await getBestDeals(Currency.SAR, 20);

      expect(deals).toHaveLength(2);
      // First deal should have higher absolute savings (200 SAR vs 50 SAR)
      expect(deals[0].productName).toBe("Expensive Product");
    });
  });

  describe("getDealsWithCoupons", () => {
    it("should return deals from stores with active coupons", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDealsWithCoupons } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.store.findMany).mockResolvedValue([
        { id: "s1" },
      ] as any);

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 80,
          originalPrice: 100,
          discount: 20,
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p1", name: "Product", slug: "product", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
      ] as any);

      const deals = await getDealsWithCoupons(50);

      expect(deals).toHaveLength(1);
    });

    it("should return empty if no stores have coupons", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getDealsWithCoupons } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.store.findMany).mockResolvedValue([]);

      const deals = await getDealsWithCoupons(50);

      expect(deals).toHaveLength(0);
    });
  });

  describe("compareDealAcrossStores", () => {
    it("should compare product prices across stores", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { compareDealAcrossStores } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "iPhone 15",
        slug: "iphone-15",
        nameAr: null,
        image: "/iphone.jpg",
        storeProducts: [
          {
            id: "sp1",
            storeId: "s1",
            price: 3500,
            originalPrice: 4000,
            discount: 12,
            currency: Currency.SAR,
            url: "http://amazon.sa/iphone",
            inStock: true,
            rating: 4.5,
            reviewCount: 100,
            updatedAt: new Date(),
            store: { id: "s1", name: "Amazon", slug: "amazon" },
          },
          {
            id: "sp2",
            storeId: "s2",
            price: 3600,
            originalPrice: 4000,
            discount: 10,
            currency: Currency.SAR,
            url: "http://noon.com/iphone",
            inStock: true,
            rating: 4.3,
            reviewCount: 80,
            updatedAt: new Date(),
            store: { id: "s2", name: "Noon", slug: "noon" },
          },
        ],
      } as any);

      const deals = await compareDealAcrossStores("p1");

      expect(deals).toHaveLength(2);
      expect(deals[0].currentPrice).toBeLessThan(deals[1].currentPrice);
    });

    it("should return empty for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { compareDealAcrossStores } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const deals = await compareDealAcrossStores("nonexistent");

      expect(deals).toHaveLength(0);
    });
  });

  describe("getNewLowestPrices", () => {
    it("should return products at all-time low", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getNewLowestPrices } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 80, // Current price (lowest ever)
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p1", name: "Product", slug: "product", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
          priceHistory: [
            { price: 100 }, // Historical price was higher
            { price: 95 },
          ],
        },
      ] as any);

      const deals = await getNewLowestPrices(30);

      expect(deals).toHaveLength(1);
      expect(deals[0].dealType).toBe("new_low");
    });
  });

  describe("searchDeals", () => {
    it("should search deals by query", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { searchDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "iPhone 15 Pro",
          slug: "iphone-15-pro",
          nameAr: null,
          image: null,
          storeProducts: [
            {
              id: "sp1",
              storeId: "s1",
              price: 3500,
              originalPrice: 4000,
              discount: 12,
              currency: Currency.SAR,
              url: "http://store.com/iphone",
              inStock: true,
              rating: null,
              reviewCount: null,
              updatedAt: new Date(),
              store: { id: "s1", name: "Store 1", slug: "store-1" },
            },
          ],
        },
      ] as any);

      const deals = await searchDeals("iPhone");

      expect(deals).toHaveLength(1);
      expect(deals[0].productName).toContain("iPhone");
    });
  });

  describe("getPersonalizedDeals", () => {
    it("should return deals based on user preferences", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPersonalizedDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          product: { category: "Electronics", brand: "Apple" },
        },
      ] as any);

      vi.mocked(prisma.searchHistory.findMany).mockResolvedValue([]);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "AirPods Pro",
          slug: "airpods-pro",
          nameAr: null,
          image: null,
          category: "Electronics",
          brand: "Apple",
          storeProducts: [
            {
              id: "sp1",
              storeId: "s1",
              price: 800,
              originalPrice: 1000,
              discount: 20,
              currency: Currency.SAR,
              url: "http://store.com/airpods",
              inStock: true,
              rating: null,
              reviewCount: null,
              updatedAt: new Date(),
              store: { id: "s1", name: "Store 1", slug: "store-1" },
            },
          ],
        },
      ] as any);

      const deals = await getPersonalizedDeals("user1", 30);

      expect(deals).toHaveLength(1);
    });
  });

  describe("getTrendingDeals", () => {
    it("should return trending deals based on clicks", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTrendingDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.affiliateClick.groupBy).mockResolvedValue([
        { productId: "p1", _count: { productId: 50 } },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "Trending Product",
          slug: "trending-product",
          nameAr: null,
          image: null,
          storeProducts: [
            {
              id: "sp1",
              storeId: "s1",
              price: 100,
              originalPrice: 120,
              discount: 17,
              currency: Currency.SAR,
              url: "http://store.com/trending",
              inStock: true,
              rating: null,
              reviewCount: null,
              updatedAt: new Date(),
              store: { id: "s1", name: "Store 1", slug: "store-1" },
            },
          ],
        },
      ] as any);

      const deals = await getTrendingDeals(24, 20);

      expect(deals).toHaveLength(1);
      expect(deals[0].productName).toBe("Trending Product");
    });

    it("should fallback to regular deals if no trending data", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTrendingDeals } = await import("@/lib/services/deal-aggregator");

      vi.mocked(prisma.affiliateClick.groupBy).mockResolvedValue([]);

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          storeId: "s1",
          price: 80,
          originalPrice: 100,
          discount: 20,
          currency: Currency.SAR,
          url: "http://store.com/p1",
          inStock: true,
          rating: null,
          reviewCount: null,
          updatedAt: new Date(),
          product: { id: "p1", name: "Regular Product", slug: "regular", nameAr: null, image: null },
          store: { id: "s1", name: "Store 1", slug: "store-1" },
        },
      ] as any);

      const deals = await getTrendingDeals(24, 20);

      expect(deals).toHaveLength(1);
    });
  });
});
