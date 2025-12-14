import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

describe("Deals API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("GET /api/deals", () => {
    it("should return deals successfully", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/deals/route");

      const mockDeals = [
        {
          id: "sp1",
          productId: "p1",
          discount: 25,
          price: 750,
          originalPrice: 1000,
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

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockDeals as any);

      const request = new NextRequest("http://localhost:3000/api/deals");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("deals");
      expect(data.deals).toHaveLength(1);
      expect(data.deals[0].name).toBe("iPhone 15");
    });

    it("should filter by country", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/deals/route");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/deals?country=SA");
      await GET(request);

      expect(prisma.storeProduct.findMany).toHaveBeenCalled();
    });

    it("should filter by minDiscount", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/deals/route");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/deals?minDiscount=20");
      await GET(request);

      expect(prisma.storeProduct.findMany).toHaveBeenCalled();
    });

    it("should filter by category", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/deals/route");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/deals?category=Smartphones");
      await GET(request);

      expect(prisma.storeProduct.findMany).toHaveBeenCalled();
    });

    it("should return price-drops when type=price-drops", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/deals/route");

      const mockPriceDrops = [
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

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockPriceDrops as any);

      const request = new NextRequest("http://localhost:3000/api/deals?type=price-drops");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("price-drops");
    });

    it("should respect limit parameter", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/deals/route");

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/deals?limit=5");
      await GET(request);

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it("should handle errors gracefully", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/deals/route");

      vi.mocked(prisma.storeProduct.findMany).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/deals");
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });
});

describe("Trending API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("GET /api/trending", () => {
    it("should return trending products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/trending/route");

      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([
        { productId: "p1", _count: { productId: 50 } },
      ] as any);

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "Trending Product",
          nameAr: null,
          image: "/img.jpg",
          storeProducts: [{ price: 1000, currency: "SAR" }],
        },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/trending");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("trending");
      expect(data.products).toHaveLength(1);
    });

    it("should return new products when type=new", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/trending/route");

      const mockNewProducts = [
        {
          id: "sp1",
          productId: "p1",
          discount: 10,
          price: 900,
          originalPrice: 1000,
          currency: "SAR",
          url: "https://store.com/product",
          createdAt: new Date(),
          inStock: true,
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

      vi.mocked(prisma.storeProduct.findMany).mockResolvedValue(mockNewProducts as any);

      const request = new NextRequest("http://localhost:3000/api/trending?type=new");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe("new");
    });

    it("should filter by country", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/trending/route");

      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/trending?country=EG");
      await GET(request);

      expect(prisma.product.findMany).toHaveBeenCalled();
    });

    it("should respect days parameter", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/trending/route");

      vi.mocked(prisma.searchHistory.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/trending?days=30");
      await GET(request);

      expect(prisma.searchHistory.groupBy).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/trending/route");

      vi.mocked(prisma.searchHistory.groupBy).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/trending");
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });
});
