import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeProduct: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Price Analysis Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("analyzePriceForStoreProduct", () => {
    it("should return null for non-existent store product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePriceForStoreProduct } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue(null);

      const result = await analyzePriceForStoreProduct("non-existent");

      expect(result).toBeNull();
    });

    it("should return basic analysis for product with no history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePriceForStoreProduct } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 100,
        priceHistory: [],
      } as any);

      const result = await analyzePriceForStoreProduct("sp1");

      expect(result).toEqual({
        currentPrice: 100,
        lowestEver: 100,
        highestEver: 100,
        averagePrice: 100,
        isAtLowest: true,
      });
    });

    it("should calculate price analysis with history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePriceForStoreProduct } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 80,
        priceHistory: [
          { price: 80, recordedAt: new Date() },
          { price: 100, recordedAt: new Date(Date.now() - 86400000) },
          { price: 120, recordedAt: new Date(Date.now() - 172800000) },
        ],
      } as any);

      const result = await analyzePriceForStoreProduct("sp1");

      expect(result?.currentPrice).toBe(80);
      expect(result?.lowestEver).toBe(80);
      expect(result?.highestEver).toBe(120);
      expect(result?.isAtLowest).toBe(true);
    });

    it("should detect price drop", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePriceForStoreProduct } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 80,
        priceHistory: [
          { price: 80, recordedAt: new Date() },
          { price: 100, recordedAt: new Date(Date.now() - 86400000) },
        ],
      } as any);

      const result = await analyzePriceForStoreProduct("sp1");

      expect(result?.priceChange).toBeDefined();
      expect(result?.priceChange?.direction).toBe("down");
      expect(result?.priceChange?.percentage).toBe(20);
    });

    it("should detect price increase", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePriceForStoreProduct } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 120,
        priceHistory: [
          { price: 120, recordedAt: new Date() },
          { price: 100, recordedAt: new Date(Date.now() - 86400000) },
        ],
      } as any);

      const result = await analyzePriceForStoreProduct("sp1");

      expect(result?.priceChange).toBeDefined();
      expect(result?.priceChange?.direction).toBe("up");
      expect(result?.priceChange?.percentage).toBe(20);
    });

    it("should calculate days ago correctly", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePriceForStoreProduct } = await import(
        "@/lib/services/price-analysis"
      );

      const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 80,
        priceHistory: [
          { price: 80, recordedAt: new Date() },
          { price: 100, recordedAt: threeDaysAgo },
        ],
      } as any);

      const result = await analyzePriceForStoreProduct("sp1");

      expect(result?.priceChange?.daysAgo).toBe(3);
    });
  });

  describe("analyzePricesForProduct", () => {
    it("should return analysis map for multiple store products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePricesForProduct } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          price: 100,
          store: { slug: "amazon-sa" },
          priceHistory: [],
        },
        {
          id: "sp2",
          price: 90,
          store: { slug: "noon-sa" },
          priceHistory: [
            { price: 90, recordedAt: new Date() },
            { price: 110, recordedAt: new Date(Date.now() - 86400000) },
          ],
        },
      ] as any);

      const result = await analyzePricesForProduct("p1");

      expect(result.size).toBe(2);
      expect(result.get("amazon-sa")).toBeDefined();
      expect(result.get("noon-sa")).toBeDefined();
      expect(result.get("noon-sa")?.priceChange?.direction).toBe("down");
    });

    it("should handle empty store products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { analyzePricesForProduct } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      const result = await analyzePricesForProduct("p1");

      expect(result.size).toBe(0);
    });
  });

  describe("isAtLowestPrice", () => {
    it("should return true when price is at lowest", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { isAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 80,
        priceHistory: [
          { price: 80, recordedAt: new Date() },
          { price: 100, recordedAt: new Date(Date.now() - 86400000) },
        ],
      } as any);

      const result = await isAtLowestPrice("sp1");

      expect(result).toBe(true);
    });

    it("should return false when price is not at lowest", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { isAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 120,
        priceHistory: [
          { price: 120, recordedAt: new Date() },
          { price: 80, recordedAt: new Date(Date.now() - 86400000) },
        ],
      } as any);

      const result = await isAtLowestPrice("sp1");

      expect(result).toBe(false);
    });

    it("should return false for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { isAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue(null);

      const result = await isAtLowestPrice("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("getProductsAtLowestPrice", () => {
    it("should return products at their lowest price", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getProductsAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          price: 80,
          currency: "SAR",
          product: { name: "iPhone 15", image: "/img.jpg" },
          store: { name: "Amazon" },
          priceHistory: [
            { price: 80, recordedAt: new Date() },
            { price: 100, recordedAt: new Date(Date.now() - 86400000) },
          ],
        },
      ] as any);

      const result = await getProductsAtLowestPrice({ limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("iPhone 15");
      expect(result[0].currentPrice).toBe(80);
      expect(result[0].previousLowest).toBe(100);
    });

    it("should exclude products without sufficient history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getProductsAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          price: 80,
          currency: "SAR",
          product: { name: "iPhone 15", image: "/img.jpg" },
          store: { name: "Amazon" },
          priceHistory: [{ price: 80, recordedAt: new Date() }], // Only one entry
        },
      ] as any);

      const result = await getProductsAtLowestPrice({ limit: 10 });

      expect(result).toHaveLength(0);
    });

    it("should exclude products not at their lowest", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getProductsAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          price: 120, // Current is higher
          currency: "SAR",
          product: { name: "iPhone 15", image: "/img.jpg" },
          store: { name: "Amazon" },
          priceHistory: [
            { price: 120, recordedAt: new Date() },
            { price: 100, recordedAt: new Date(Date.now() - 86400000) },
          ],
        },
      ] as any);

      const result = await getProductsAtLowestPrice({ limit: 10 });

      expect(result).toHaveLength(0);
    });

    it("should sort by savings percentage", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getProductsAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          id: "sp1",
          productId: "p1",
          price: 90, // 10% savings
          currency: "SAR",
          product: { name: "Product A", image: null },
          store: { name: "Store" },
          priceHistory: [
            { price: 90, recordedAt: new Date() },
            { price: 100, recordedAt: new Date(Date.now() - 86400000) },
          ],
        },
        {
          id: "sp2",
          productId: "p2",
          price: 50, // 50% savings
          currency: "SAR",
          product: { name: "Product B", image: null },
          store: { name: "Store" },
          priceHistory: [
            { price: 50, recordedAt: new Date() },
            { price: 100, recordedAt: new Date(Date.now() - 86400000) },
          ],
        },
      ] as any);

      const result = await getProductsAtLowestPrice({ limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Product B"); // Higher savings first
      expect(result[1].name).toBe("Product A");
    });

    it("should filter by country", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getProductsAtLowestPrice } = await import(
        "@/lib/services/price-analysis"
      );

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getProductsAtLowestPrice({ country: "SA", limit: 10 });

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
  });
});
