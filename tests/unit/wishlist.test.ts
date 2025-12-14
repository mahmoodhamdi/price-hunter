import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Wishlist Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getWishlist", () => {
    it("should return user wishlist items", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: "w1",
          productId: "p1",
          createdAt: new Date(),
          product: {
            name: "iPhone 15",
            nameAr: "آيفون 15",
            image: "/img.jpg",
            slug: "iphone-15",
            brand: "Apple",
            category: "Smartphones",
            storeProducts: [
              {
                price: 4000,
                currency: Currency.SAR,
                store: { name: "Amazon" },
                inStock: true,
                priceHistory: [],
              },
            ],
          },
        },
      ] as any);

      vi.mocked(prisma.wishlist.count).mockResolvedValue(1);

      const result = await getWishlist("user1");

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productName).toBe("iPhone 15");
      expect(result.total).toBe(1);
    });

    it("should calculate price change", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: "w1",
          productId: "p1",
          createdAt: new Date(),
          product: {
            name: "iPhone 15",
            nameAr: null,
            image: null,
            slug: "iphone-15",
            brand: "Apple",
            category: "Smartphones",
            storeProducts: [
              {
                price: 3600, // Current price
                currency: Currency.SAR,
                store: { name: "Amazon" },
                inStock: true,
                priceHistory: [
                  { price: 3600, recordedAt: new Date() },
                  { price: 4000, recordedAt: new Date(Date.now() - 86400000) }, // Previous price
                ],
              },
            ],
          },
        },
      ] as any);

      vi.mocked(prisma.wishlist.count).mockResolvedValue(1);

      const result = await getWishlist("user1");

      expect(result.items[0].priceChange).toBeDefined();
      expect(result.items[0].priceChange?.direction).toBe("down");
      expect(result.items[0].priceChange?.percentage).toBe(10);
    });

    it("should paginate results", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([]);
      vi.mocked(prisma.wishlist.count).mockResolvedValue(0);

      await getWishlist("user1", { limit: 10, offset: 20 });

      expect(prisma.wishlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe("addToWishlist", () => {
    it("should add product to wishlist", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addToWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "iPhone 15",
      } as any);

      vi.mocked(prisma.wishlist.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.wishlist.create).mockResolvedValue({
        id: "w1",
        productId: "p1",
        createdAt: new Date(),
        product: {
          name: "iPhone 15",
          nameAr: null,
          image: null,
          slug: "iphone-15",
          brand: "Apple",
          category: "Smartphones",
          storeProducts: [],
        },
      } as any);

      const result = await addToWishlist("user1", "p1");

      expect(result).toBeDefined();
      expect(result?.productName).toBe("iPhone 15");
    });

    it("should return existing item if already in wishlist", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addToWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "iPhone 15",
      } as any);

      vi.mocked(prisma.wishlist.findUnique)
        .mockResolvedValueOnce({ id: "existing" } as any)
        .mockResolvedValueOnce({
          id: "existing",
          productId: "p1",
          createdAt: new Date(),
          product: {
            name: "iPhone 15",
            nameAr: null,
            image: null,
            slug: "iphone-15",
            brand: null,
            category: null,
            storeProducts: [],
          },
        } as any);

      const result = await addToWishlist("user1", "p1");

      expect(result?.id).toBe("existing");
      expect(prisma.wishlist.create).not.toHaveBeenCalled();
    });

    it("should return null for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addToWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const result = await addToWishlist("user1", "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("removeFromWishlist", () => {
    it("should remove item from wishlist", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { removeFromWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findUnique).mockResolvedValue({
        id: "w1",
      } as any);

      vi.mocked(prisma.wishlist.delete).mockResolvedValue({} as any);

      const result = await removeFromWishlist("user1", "p1");

      expect(result).toBe(true);
    });

    it("should return false if not in wishlist", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { removeFromWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findUnique).mockResolvedValue(null);

      const result = await removeFromWishlist("user1", "p1");

      expect(result).toBe(false);
    });
  });

  describe("isInWishlist", () => {
    it("should return true if product is in wishlist", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { isInWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findUnique).mockResolvedValue({
        id: "w1",
      } as any);

      const result = await isInWishlist("user1", "p1");

      expect(result).toBe(true);
    });

    it("should return false if product is not in wishlist", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { isInWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findUnique).mockResolvedValue(null);

      const result = await isInWishlist("user1", "p1");

      expect(result).toBe(false);
    });
  });

  describe("getWishlistStats", () => {
    it("should return wishlist statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getWishlistStats } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          product: {
            storeProducts: [
              {
                inStock: true,
                price: 80,
                priceHistory: [
                  { price: 80 },
                  { price: 100 }, // Previous price higher
                ],
              },
            ],
          },
        },
        {
          product: {
            storeProducts: [
              {
                inStock: false,
                price: 200,
                priceHistory: [{ price: 200 }],
              },
            ],
          },
        },
      ] as any);

      const stats = await getWishlistStats("user1");

      expect(stats.totalItems).toBe(2);
      expect(stats.inStockItems).toBe(1);
      expect(stats.priceDrops).toBe(1);
      expect(stats.totalSavings).toBe(20);
    });
  });

  describe("clearWishlist", () => {
    it("should clear all wishlist items", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { clearWishlist } = await import("@/lib/services/wishlist");

      vi.mocked(prisma.wishlist.deleteMany).mockResolvedValue({ count: 5 });

      const result = await clearWishlist("user1");

      expect(result).toBe(5);
    });
  });
});
