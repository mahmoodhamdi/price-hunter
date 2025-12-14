import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    priceHistory: {
      findMany: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    storeProduct: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    priceAlert: {
      findMany: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
    },
  },
}));

describe("Price Export Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getPriceHistoryData", () => {
    it("should return price history records", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceHistoryData } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([
        {
          id: "ph1",
          recordedAt: new Date("2024-01-15"),
          price: 100,
          priceUSD: 27,
          currency: Currency.SAR,
          storeProduct: {
            inStock: true,
            discount: 10,
            store: { name: "Amazon", slug: "amazon" },
            product: { name: "iPhone 15", slug: "iphone-15" },
          },
        },
      ] as any);

      const records = await getPriceHistoryData({});

      expect(records).toHaveLength(1);
      expect(records[0].productName).toBe("iPhone 15");
      expect(records[0].storeName).toBe("Amazon");
      expect(records[0].price).toBe(100);
    });

    it("should filter by date range", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceHistoryData } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      await getPriceHistoryData({ startDate, endDate });

      expect(prisma.priceHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it("should filter by product ID", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceHistoryData } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      await getPriceHistoryData({ productId: "p1" });

      expect(prisma.priceHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeProduct: expect.objectContaining({
              productId: "p1",
            }),
          }),
        })
      );
    });

    it("should filter by product slug", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceHistoryData } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        slug: "iphone-15",
      } as any);

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      await getPriceHistoryData({ productSlug: "iphone-15" });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { slug: "iphone-15" },
      });
    });
  });

  describe("exportToCSV", () => {
    it("should export records to CSV format with headers", async () => {
      const { exportToCSV } = await import("@/lib/services/price-export");

      const records = [
        {
          date: "2024-01-15T10:00:00.000Z",
          price: 100,
          priceUSD: 27,
          currency: Currency.SAR,
          storeName: "Amazon",
          storeSlug: "amazon",
          productName: "iPhone 15",
          productSlug: "iphone-15",
          inStock: true,
          discount: 10,
        },
      ];

      const csv = exportToCSV(records, true);

      expect(csv).toContain("Date,Product,Store,Price");
      expect(csv).toContain('"iPhone 15"');
      expect(csv).toContain('"Amazon"');
      expect(csv).toContain("100");
      expect(csv).toContain("Yes"); // inStock
    });

    it("should export records without headers", async () => {
      const { exportToCSV } = await import("@/lib/services/price-export");

      const records = [
        {
          date: "2024-01-15T10:00:00.000Z",
          price: 100,
          priceUSD: 27,
          currency: Currency.SAR,
          storeName: "Amazon",
          storeSlug: "amazon",
          productName: "iPhone 15",
          productSlug: "iphone-15",
          inStock: true,
          discount: null,
        },
      ];

      const csv = exportToCSV(records, false);

      expect(csv).not.toContain("Date,Product,Store");
      expect(csv).toContain('"iPhone 15"');
    });

    it("should escape quotes in product names", async () => {
      const { exportToCSV } = await import("@/lib/services/price-export");

      const records = [
        {
          date: "2024-01-15T10:00:00.000Z",
          price: 100,
          priceUSD: 27,
          currency: Currency.SAR,
          storeName: 'Store "Best"',
          storeSlug: "store-best",
          productName: 'Product "Special"',
          productSlug: "product-special",
          inStock: true,
          discount: null,
        },
      ];

      const csv = exportToCSV(records, false);

      expect(csv).toContain('""Special""');
      expect(csv).toContain('""Best""');
    });
  });

  describe("exportToJSON", () => {
    it("should export records to JSON format", async () => {
      const { exportToJSON } = await import("@/lib/services/price-export");

      const records = [
        {
          date: "2024-01-15T10:00:00.000Z",
          price: 100,
          priceUSD: 27,
          currency: Currency.SAR,
          storeName: "Amazon",
          storeSlug: "amazon",
          productName: "iPhone 15",
          productSlug: "iphone-15",
          inStock: true,
          discount: 10,
        },
      ];

      const json = exportToJSON(records);
      const parsed = JSON.parse(json);

      expect(parsed.recordCount).toBe(1);
      expect(parsed.records[0].product.name).toBe("iPhone 15");
      expect(parsed.records[0].price.amount).toBe(100);
      expect(parsed.records[0].store.name).toBe("Amazon");
    });
  });

  describe("exportToExcel", () => {
    it("should export records to TSV format", async () => {
      const { exportToExcel } = await import("@/lib/services/price-export");

      const records = [
        {
          date: "2024-01-15T10:00:00.000Z",
          price: 100,
          priceUSD: 27,
          currency: Currency.SAR,
          storeName: "Amazon",
          storeSlug: "amazon",
          productName: "iPhone 15",
          productSlug: "iphone-15",
          inStock: true,
          discount: 10,
        },
      ];

      const tsv = exportToExcel(records, true);

      expect(tsv).toContain("Date\tProduct\tStore");
      expect(tsv).toContain("iPhone 15");
      expect(tsv).toContain("Amazon");
      expect(tsv).toContain("\t");
    });
  });

  describe("exportPriceHistory", () => {
    it("should export to CSV with correct filename and mime type", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { exportPriceHistory } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      const result = await exportPriceHistory({
        format: "csv",
        productId: "p1",
      });

      expect(result.filename).toContain(".csv");
      expect(result.mimeType).toBe("text/csv");
    });

    it("should export to JSON with correct filename and mime type", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { exportPriceHistory } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      const result = await exportPriceHistory({
        format: "json",
        productId: "p1",
      });

      expect(result.filename).toContain(".json");
      expect(result.mimeType).toBe("application/json");
    });

    it("should export to Excel/TSV with correct filename and mime type", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { exportPriceHistory } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      const result = await exportPriceHistory({
        format: "excel",
        productId: "p1",
      });

      expect(result.filename).toContain(".tsv");
      expect(result.mimeType).toBe("text/tab-separated-values");
    });
  });

  describe("getPriceHistorySummary", () => {
    it("should return price history summary", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceHistorySummary } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue({
        price: 90,
        currency: Currency.SAR,
        product: { name: "iPhone 15" },
        store: { name: "Amazon" },
        priceHistory: [
          { price: 90, recordedAt: new Date() },
          { price: 100, recordedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          { price: 110, recordedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        ],
      } as any);

      const summary = await getPriceHistorySummary("p1");

      expect(summary.productName).toBe("iPhone 15");
      expect(summary.currentPrice).toBe(90);
      expect(summary.lowestPrice).toBe(90);
      expect(summary.highestPrice).toBe(110);
      expect(summary.recordCount).toBe(3);
    });

    it("should throw error if no price history found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceHistorySummary } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue(null);

      await expect(getPriceHistorySummary("p1")).rejects.toThrow(
        "No price history found"
      );
    });
  });

  describe("getPriceChartData", () => {
    it("should return chart data with labels and datasets", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceChartData } = await import("@/lib/services/price-export");

      const today = new Date();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([
        {
          storeId: "s1",
          store: { name: "Amazon" },
          priceHistory: [
            { price: 100, recordedAt: yesterday },
            { price: 95, recordedAt: today },
          ],
        },
      ] as any);

      const chartData = await getPriceChartData("p1", 30);

      expect(chartData.labels).toHaveLength(30);
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].storeName).toBe("Amazon");
      expect(chartData.datasets[0].color).toBeDefined();
    });

    it("should filter by store IDs", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceChartData } = await import("@/lib/services/price-export");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      await getPriceChartData("p1", 30, ["s1", "s2"]);

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId: { in: ["s1", "s2"] },
          }),
        })
      );
    });
  });

  describe("getPriceAlertsHistory", () => {
    it("should return user price alerts history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceAlertsHistory } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([
        {
          targetPrice: 100,
          currency: Currency.SAR,
          isActive: true,
          triggered: false,
          triggeredAt: null,
          createdAt: new Date(),
          product: {
            name: "iPhone 15",
            slug: "iphone-15",
            storeProducts: [{ price: 110 }],
          },
        },
      ] as any);

      const alerts = await getPriceAlertsHistory("user1");

      expect(alerts).toHaveLength(1);
      expect(alerts[0].productName).toBe("iPhone 15");
      expect(alerts[0].targetPrice).toBe(100);
      expect(alerts[0].triggered).toBe(false);
    });
  });

  describe("exportUserPriceData", () => {
    it("should export user wishlist price history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { exportUserPriceData } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          product: {
            name: "iPhone 15",
            slug: "iphone-15",
            storeProducts: [
              {
                inStock: true,
                discount: 10,
                store: { name: "Amazon", slug: "amazon" },
                priceHistory: [
                  {
                    price: 100,
                    priceUSD: 27,
                    currency: Currency.SAR,
                    recordedAt: new Date(),
                  },
                ],
              },
            ],
          },
        },
      ] as any);

      const result = await exportUserPriceData("user1", "csv");

      expect(result.recordCount).toBe(1);
      expect(result.filename).toContain("my-price-history");
      expect(result.mimeType).toBe("text/csv");
    });
  });

  describe("calculatePriceStats", () => {
    it("should calculate price statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { calculatePriceStats } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([
        { price: 100, recordedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        { price: 95, recordedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { price: 90, recordedAt: new Date() },
      ] as any);

      const stats = await calculatePriceStats("p1", 90);

      expect(stats.min).toBe(90);
      expect(stats.max).toBe(100);
      expect(stats.avg).toBeGreaterThan(0);
      expect(stats.trend).toBe("down");
      expect(stats.trendPercentage).toBe(-10);
    });

    it("should identify stable trend", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { calculatePriceStats } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([
        { price: 100, recordedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        { price: 99, recordedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { price: 100, recordedAt: new Date() },
      ] as any);

      const stats = await calculatePriceStats("p1", 90);

      expect(stats.trend).toBe("stable");
    });

    it("should calculate volatility", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { calculatePriceStats } = await import(
        "@/lib/services/price-export"
      );

      // High volatility prices
      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([
        { price: 50, recordedAt: new Date() },
        { price: 150, recordedAt: new Date() },
        { price: 50, recordedAt: new Date() },
        { price: 150, recordedAt: new Date() },
      ] as any);

      const stats = await calculatePriceStats("p1", 90);

      expect(stats.volatility).toBe("high");
    });

    it("should throw error if no price history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { calculatePriceStats } = await import(
        "@/lib/services/price-export"
      );

      vi.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      await expect(calculatePriceStats("p1", 90)).rejects.toThrow(
        "No price history found"
      );
    });
  });
});
