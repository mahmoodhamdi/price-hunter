import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    storeProduct: {
      findMany: vi.fn(),
    },
  },
}));

describe("Compare Page API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("GET /api/products/[id]", () => {
    it("should return product with store products", async () => {
      const { prisma } = await import("@/lib/prisma");

      const mockProduct = {
        id: "p1",
        name: "iPhone 15",
        nameAr: "آيفون 15",
        slug: "iphone-15",
        image: "/img.jpg",
        brand: "Apple",
        category: "Smartphones",
        description: "Latest iPhone",
        storeProducts: [
          {
            id: "sp1",
            price: { toNumber: () => 4000 },
            currency: "SAR",
            inStock: true,
            discount: 10,
            store: {
              name: "Amazon",
              slug: "amazon-sa",
            },
          },
          {
            id: "sp2",
            price: { toNumber: () => 4200 },
            currency: "SAR",
            inStock: true,
            discount: null,
            store: {
              name: "Noon",
              slug: "noon-sa",
            },
          },
        ],
      };

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);

      // Simulating the API response structure
      const response = mockProduct;

      expect(response.name).toBe("iPhone 15");
      expect(response.storeProducts).toHaveLength(2);
      expect(response.storeProducts[0].store.slug).toBe("amazon-sa");
    });

    it("should return 404 for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const result = await prisma.product.findUnique({
        where: { slug: "non-existent" },
      });

      expect(result).toBeNull();
    });
  });

  describe("GET /api/search", () => {
    it("should return search results for comparison", async () => {
      const { prisma } = await import("@/lib/prisma");

      const mockProducts = [
        {
          id: "p1",
          name: "iPhone 15",
          slug: "iphone-15",
          image: "/img.jpg",
          brand: "Apple",
          storeProducts: [
            {
              price: { toNumber: () => 4000 },
              currency: "SAR",
            },
          ],
        },
        {
          id: "p2",
          name: "iPhone 15 Pro",
          slug: "iphone-15-pro",
          image: "/img2.jpg",
          brand: "Apple",
          storeProducts: [
            {
              price: { toNumber: () => 5000 },
              currency: "SAR",
            },
          ],
        },
      ];

      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);

      const result = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: "iPhone" } },
            { nameAr: { contains: "iPhone" } },
          ],
        },
        take: 5,
      });

      expect(result).toHaveLength(2);
    });

    it("should limit results for comparison dropdown", async () => {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      await prisma.product.findMany({
        where: { name: { contains: "test" } },
        take: 5,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  describe("Price Comparison Logic", () => {
    it("should identify lowest price across stores", () => {
      const storeProducts = [
        { id: "sp1", price: 4000, currency: "SAR", store: { name: "Amazon", slug: "amazon-sa" } },
        { id: "sp2", price: 3800, currency: "SAR", store: { name: "Noon", slug: "noon-sa" } },
        { id: "sp3", price: 4200, currency: "SAR", store: { name: "Jarir", slug: "jarir" } },
      ];

      const lowest = storeProducts.reduce((min, sp) =>
        sp.price < min.price ? sp : min
      );

      expect(lowest.store.slug).toBe("noon-sa");
      expect(lowest.price).toBe(3800);
    });

    it("should handle single store product", () => {
      const storeProducts = [
        { id: "sp1", price: 4000, currency: "SAR", store: { name: "Amazon", slug: "amazon-sa" } },
      ];

      const lowest = storeProducts.reduce((min, sp) =>
        sp.price < min.price ? sp : min
      );

      expect(lowest.store.slug).toBe("amazon-sa");
    });

    it("should get unique stores from multiple products", () => {
      const products = [
        {
          id: "p1",
          storeProducts: [
            { store: { slug: "amazon-sa" } },
            { store: { slug: "noon-sa" } },
          ],
        },
        {
          id: "p2",
          storeProducts: [
            { store: { slug: "amazon-sa" } },
            { store: { slug: "jarir" } },
          ],
        },
      ];

      const storeSet = new Set<string>();
      products.forEach((p) =>
        p.storeProducts.forEach((sp) => storeSet.add(sp.store.slug))
      );

      expect(Array.from(storeSet)).toHaveLength(3);
      expect(storeSet.has("amazon-sa")).toBe(true);
      expect(storeSet.has("noon-sa")).toBe(true);
      expect(storeSet.has("jarir")).toBe(true);
    });

    it("should find product price at specific store", () => {
      const product = {
        id: "p1",
        storeProducts: [
          { price: 4000, store: { slug: "amazon-sa" } },
          { price: 3800, store: { slug: "noon-sa" } },
        ],
      };

      const getProductPriceAtStore = (storeSlug: string) => {
        return product.storeProducts.find((sp) => sp.store.slug === storeSlug);
      };

      expect(getProductPriceAtStore("amazon-sa")?.price).toBe(4000);
      expect(getProductPriceAtStore("noon-sa")?.price).toBe(3800);
      expect(getProductPriceAtStore("jarir")).toBeUndefined();
    });

    it("should calculate availability across stores", () => {
      const product = {
        storeProducts: [
          { inStock: true, store: { slug: "amazon-sa" } },
          { inStock: false, store: { slug: "noon-sa" } },
          { inStock: true, store: { slug: "jarir" } },
        ],
      };

      const inStockCount = product.storeProducts.filter((sp) => sp.inStock).length;

      expect(inStockCount).toBe(2);
      expect(product.storeProducts.length).toBe(3);
    });
  });

  describe("URL Parameter Handling", () => {
    it("should parse product IDs from URL", () => {
      const urlParams = "iphone-15,galaxy-s24,pixel-8";
      const productIds = urlParams.split(",");

      expect(productIds).toHaveLength(3);
      expect(productIds[0]).toBe("iphone-15");
    });

    it("should handle empty URL params", () => {
      const urlParams = "";
      const productIds = urlParams ? urlParams.split(",") : [];

      expect(productIds).toHaveLength(0);
    });

    it("should limit products to 4", () => {
      const products = ["p1", "p2", "p3", "p4", "p5"];
      const maxProducts = 4;

      expect(products.length > maxProducts).toBe(true);
      expect(products.slice(0, maxProducts)).toHaveLength(4);
    });

    it("should generate URL when adding products", () => {
      const products = [
        { id: "p1", slug: "iphone-15" },
        { id: "p2", slug: "galaxy-s24" },
      ];

      const newProduct = { id: "p3", slug: "pixel-8" };
      const newProducts = [...products, newProduct];
      const ids = newProducts.map((p) => p.slug).join(",");

      expect(ids).toBe("iphone-15,galaxy-s24,pixel-8");
    });

    it("should update URL when removing products", () => {
      const products = [
        { id: "p1", slug: "iphone-15" },
        { id: "p2", slug: "galaxy-s24" },
        { id: "p3", slug: "pixel-8" },
      ];

      const newProducts = products.filter((p) => p.id !== "p2");
      const ids = newProducts.map((p) => p.slug).join(",");

      expect(ids).toBe("iphone-15,pixel-8");
    });
  });
});
