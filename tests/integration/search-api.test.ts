import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeProduct: {
      findFirst: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    searchHistory: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/services/product-fetch", () => ({
  fetchAndSaveProducts: vi.fn(),
  fetchProductFromUrl: vi.fn(),
}));

describe("Search API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/search", () => {
    it("should return 400 when query is missing", async () => {
      const { GET } = await import("@/app/api/search/route");
      const request = new NextRequest("http://localhost:3000/api/search");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Search query is required");
    });

    it("should search database for text queries", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { fetchAndSaveProducts } = await import(
        "@/lib/services/product-fetch"
      );
      const { GET } = await import("@/app/api/search/route");

      // Return 5 products (above threshold)
      const mockProducts = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          name: `iPhone ${i}`,
          storeProducts: [{ id: `sp${i}`, price: 100, store: { name: "Amazon" } }],
        }));

      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
      vi.mocked(prisma.product.count).mockResolvedValue(5);
      vi.mocked(fetchAndSaveProducts).mockResolvedValue({
        query: "iphone",
        totalScraped: 0,
        newProducts: 0,
        updatedProducts: 0,
        storeResults: {},
        duration: 100,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/search?q=iphone"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(5);
      expect(data.source).toBe("database");
    });

    it("should auto-fetch when results below threshold", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { fetchAndSaveProducts } = await import(
        "@/lib/services/product-fetch"
      );
      const { GET } = await import("@/app/api/search/route");

      // First call returns no products
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.product.count).mockResolvedValueOnce(0);

      // fetchAndSaveProducts returns success
      vi.mocked(fetchAndSaveProducts).mockResolvedValue({
        query: "rtx 4090",
        totalScraped: 5,
        newProducts: 5,
        updatedProducts: 0,
        storeResults: { "amazon-sa": { success: true, count: 5 } },
        duration: 1000,
      });

      // Second call returns products
      const mockProducts = [
        {
          id: "1",
          name: "RTX 4090",
          storeProducts: [{ id: "sp1", price: 5000, store: { name: "Amazon" } }],
        },
      ];
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce(
        mockProducts as any
      );
      vi.mocked(prisma.product.count).mockResolvedValueOnce(1);

      const request = new NextRequest(
        "http://localhost:3000/api/search?q=rtx%204090"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(fetchAndSaveProducts).toHaveBeenCalled();
      expect(data.source).toBe("scraped");
      expect(data.meta.newlyScraped).toBe(5);
    });

    it("should force fresh scrape with fresh=true", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { fetchAndSaveProducts } = await import(
        "@/lib/services/product-fetch"
      );
      const { GET } = await import("@/app/api/search/route");

      // Return many products from DB
      const mockProducts = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          name: `Product ${i}`,
          storeProducts: [{ id: `sp${i}`, price: 100, store: { name: "Store" } }],
        }));

      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
      vi.mocked(prisma.product.count).mockResolvedValue(10);
      vi.mocked(fetchAndSaveProducts).mockResolvedValue({
        query: "test",
        totalScraped: 0,
        newProducts: 0,
        updatedProducts: 0,
        storeResults: {},
        duration: 100,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/search?q=test&fresh=true"
      );
      await GET(request);

      expect(fetchAndSaveProducts).toHaveBeenCalled();
    });

    it("should handle URL queries", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/search/route");

      const mockStoreProduct = {
        id: "sp1",
        product: {
          id: "1",
          name: "Test Product",
          storeProducts: [{ store: { name: "Amazon" } }],
        },
        store: { name: "Amazon" },
      };

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue(
        mockStoreProduct as any
      );

      const request = new NextRequest(
        "http://localhost:3000/api/search?q=https://amazon.sa/product/123"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products).toHaveLength(1);
    });

    it("should scrape URL when not in database", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { fetchProductFromUrl } = await import(
        "@/lib/services/product-fetch"
      );
      const { GET } = await import("@/app/api/search/route");

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue(null);
      vi.mocked(fetchProductFromUrl).mockResolvedValue({
        productId: "new-product-1",
        isNew: true,
      });
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "new-product-1",
        name: "Scraped Product",
        storeProducts: [],
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/search?q=https://amazon.sa/product/new"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(fetchProductFromUrl).toHaveBeenCalledWith(
        "https://amazon.sa/product/new"
      );
      expect(data.source).toBe("scraped");
      expect(data.meta.isNew).toBe(true);
    });
  });
});
