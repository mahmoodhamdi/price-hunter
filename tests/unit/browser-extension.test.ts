import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeProduct: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    store: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    priceHistory: {
      create: vi.fn(),
    },
  },
}));

describe("Browser Extension Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getPriceDataForUrl", () => {
    it("should return price data for tracked URL", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDataForUrl } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue({
        id: "sp1",
        url: "https://amazon.sa/product/123",
        price: 100,
        currency: Currency.SAR,
        inStock: true,
        discount: 10,
        store: {
          name: "Amazon SA",
          slug: "amazon-sa",
        },
        product: {
          name: "Test Product",
          image: "/test.jpg",
          storeProducts: [
            {
              store: { name: "Noon", slug: "noon-sa" },
              price: 95,
              url: "https://noon.com/product/123",
              inStock: true,
            },
          ],
        },
        priceHistory: [
          { price: 100, recordedAt: new Date() },
          { price: 110, recordedAt: new Date(Date.now() - 86400000) },
        ],
      } as any);

      const result = await getPriceDataForUrl("https://amazon.sa/product/123");

      expect(result).toBeDefined();
      expect(result?.productName).toBe("Test Product");
      expect(result?.currentPrice).toBe(100);
      expect(result?.storeName).toBe("Amazon SA");
      expect(result?.alternatives).toHaveLength(1);
      expect(result?.priceChange?.direction).toBe("down");
    });

    it("should return null for untracked URL", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDataForUrl } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue(null);

      const result = await getPriceDataForUrl("https://unknown.com/product");

      expect(result).toBeNull();
    });

    it("should calculate price statistics correctly", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceDataForUrl } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue({
        id: "sp1",
        url: "https://amazon.sa/product/123",
        price: 100,
        currency: Currency.SAR,
        inStock: true,
        discount: null,
        store: { name: "Amazon SA", slug: "amazon-sa" },
        product: {
          name: "Test Product",
          image: null,
          storeProducts: [],
        },
        priceHistory: [
          { price: 100, recordedAt: new Date() },
          { price: 120, recordedAt: new Date(Date.now() - 86400000) },
          { price: 80, recordedAt: new Date(Date.now() - 172800000) },
        ],
      } as any);

      const result = await getPriceDataForUrl("https://amazon.sa/product/123");

      expect(result?.lowestPrice).toBe(80);
      expect(result?.highestPrice).toBe(120);
      expect(result?.averagePrice).toBe(100);
    });
  });

  describe("extensionQuickSearch", () => {
    it("should return search results with lowest prices", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { extensionQuickSearch } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "iPhone 15",
          slug: "iphone-15",
          image: "/iphone.jpg",
          brand: "Apple",
          category: "Smartphones",
          storeProducts: [
            { price: 4000, currency: Currency.SAR, store: { name: "Amazon", slug: "amazon" }, inStock: true },
            { price: 4200, currency: Currency.SAR, store: { name: "Noon", slug: "noon" }, inStock: true },
          ],
        },
      ] as any);

      const results = await extensionQuickSearch("iPhone");

      expect(results).toHaveLength(1);
      expect(results[0].lowestPrice).toBe(4000);
      expect(results[0].storeCount).toBe(2);
    });

    it("should filter products without store products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { extensionQuickSearch } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "iPhone 15",
          slug: "iphone-15",
          storeProducts: [],
        },
      ] as any);

      const results = await extensionQuickSearch("iPhone");

      expect(results).toHaveLength(0);
    });
  });

  describe("getExtensionWishlist", () => {
    it("should return user wishlist items", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getExtensionWishlist } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          productId: "p1",
          targetPrice: 3500,
          product: {
            name: "iPhone 15",
            image: "/iphone.jpg",
            storeProducts: [
              {
                price: 4000,
                currency: Currency.SAR,
                priceHistory: [
                  { price: 4000, recordedAt: new Date() },
                  { price: 4500, recordedAt: new Date(Date.now() - 86400000) },
                ],
              },
            ],
          },
        },
      ] as any);

      const wishlist = await getExtensionWishlist("user1");

      expect(wishlist).toHaveLength(1);
      expect(wishlist[0].productName).toBe("iPhone 15");
      expect(wishlist[0].priceAlert).toBe(3500);
      expect(wishlist[0].hasDropped).toBe(true);
    });
  });

  describe("addToWishlistFromExtension", () => {
    it("should add product to wishlist by URL", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addToWishlistFromExtension } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue({
        productId: "p1",
        product: { name: "Test Product" },
      } as any);

      vi.mocked(prisma.wishlist.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.wishlist.create).mockResolvedValue({
        id: "w1",
        productId: "p1",
      } as any);

      const result = await addToWishlistFromExtension(
        "user1",
        "https://amazon.sa/product/123",
        3500
      );

      expect(result.success).toBe(true);
      expect(result.productId).toBe("p1");
    });

    it("should return error for non-existent product URL", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addToWishlistFromExtension } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue(null);

      const result = await addToWishlistFromExtension(
        "user1",
        "https://unknown.com/product"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should update target price for existing wishlist item", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { addToWishlistFromExtension } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue({
        productId: "p1",
        product: { name: "Test Product" },
      } as any);

      vi.mocked(prisma.wishlist.findUnique).mockResolvedValue({
        id: "existing",
      } as any);

      vi.mocked(prisma.wishlist.update).mockResolvedValue({} as any);

      const result = await addToWishlistFromExtension(
        "user1",
        "https://amazon.sa/product/123",
        3000
      );

      expect(result.success).toBe(true);
      expect(prisma.wishlist.update).toHaveBeenCalled();
    });
  });

  describe("isUrlTracked", () => {
    it("should return true for tracked URL", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { isUrlTracked } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.count).mockResolvedValue(1);

      const result = await isUrlTracked("https://amazon.sa/product/123");

      expect(result).toBe(true);
    });

    it("should return false for untracked URL", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { isUrlTracked } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.storeProduct.count).mockResolvedValue(0);

      const result = await isUrlTracked("https://unknown.com/product");

      expect(result).toBe(false);
    });
  });

  describe("getQuickComparison", () => {
    it("should return comparison data", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getQuickComparison } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: "p1",
          name: "iPhone 15 Pro",
          storeProducts: [
            { price: 4000, store: { name: "Noon" } },
            { price: 4200, store: { name: "Amazon" } },
          ],
        },
      ] as any);

      const result = await getQuickComparison("iPhone 15 Pro", "Jarir", 4500);

      expect(result).toBeDefined();
      expect(result?.cheapestPrice).toBe(4000);
      expect(result?.cheapestStore).toBe("Noon");
      expect(result?.savings).toBe(500);
    });

    it("should return null for no matches", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getQuickComparison } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.product.findMany).mockResolvedValue([]);

      const result = await getQuickComparison("Unknown Product", "Store", 100);

      expect(result).toBeNull();
    });
  });

  describe("trackProductFromExtension", () => {
    it("should create new product and store product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { trackProductFromExtension } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.store.findFirst).mockResolvedValue({
        id: "store1",
        name: "Amazon",
      } as any);

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.product.create).mockResolvedValue({
        id: "p1",
        name: "New Product",
      } as any);

      vi.mocked(prisma.storeProduct.create).mockResolvedValue({
        id: "sp1",
      } as any);

      const result = await trackProductFromExtension(
        "https://amazon.sa/product/new",
        {
          name: "New Product",
          price: 100,
          currency: Currency.SAR,
          storeName: "Amazon SA",
        }
      );

      expect(result.success).toBe(true);
      expect(result.storeProductId).toBe("sp1");
    });

    it("should update existing product price", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { trackProductFromExtension } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.store.findFirst).mockResolvedValue({
        id: "store1",
      } as any);

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue({
        id: "sp1",
        price: 100,
      } as any);

      vi.mocked(prisma.priceHistory.create).mockResolvedValue({} as any);
      vi.mocked(prisma.storeProduct.update).mockResolvedValue({} as any);

      const result = await trackProductFromExtension(
        "https://amazon.sa/product/123",
        {
          name: "Product",
          price: 90, // Different price
          currency: Currency.SAR,
          storeName: "Amazon",
        }
      );

      expect(result.success).toBe(true);
      expect(prisma.priceHistory.create).toHaveBeenCalled();
    });

    it("should create new store if not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { trackProductFromExtension } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.store.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.store.create).mockResolvedValue({
        id: "new-store",
      } as any);

      vi.mocked(prisma.storeProduct.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.product.create).mockResolvedValue({
        id: "p1",
      } as any);

      vi.mocked(prisma.storeProduct.create).mockResolvedValue({
        id: "sp1",
      } as any);

      // Use allowed domain for SSRF validation
      const result = await trackProductFromExtension(
        "https://extra.com/product/123",
        {
          name: "Product",
          price: 100,
          currency: Currency.SAR,
          storeName: "Extra",
        }
      );

      expect(result.success).toBe(true);
      expect(prisma.store.create).toHaveBeenCalled();
    });

    it("should reject URL from non-allowed domain", async () => {
      const { trackProductFromExtension } = await import(
        "@/lib/services/browser-extension"
      );

      const result = await trackProductFromExtension(
        "https://malicious-site.com/product/123",
        {
          name: "Product",
          price: 100,
          currency: Currency.SAR,
          storeName: "Malicious",
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not supported");
    });
  });

  describe("validateExtensionApiKey", () => {
    it("should return valid for correct API key", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { validateExtensionApiKey } = await import(
        "@/lib/services/browser-extension"
      );
      const { hashToken } = await import("@/lib/security");

      // Store the hashed version, validation will hash the input and compare
      const apiKey = "ph_test123456789";
      const hashedKey = hashToken(apiKey);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user1",
        extensionApiKey: hashedKey,
      } as any);

      const result = await validateExtensionApiKey(apiKey);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe("user1");
    });

    it("should return invalid for incorrect API key", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { validateExtensionApiKey } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const result = await validateExtensionApiKey("invalid-key");

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
    });
  });

  describe("generateExtensionApiKey", () => {
    it("should generate and store hashed API key", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { generateExtensionApiKey } = await import(
        "@/lib/services/browser-extension"
      );

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const apiKey = await generateExtensionApiKey("user1");

      // The returned key starts with ph_
      expect(apiKey).toMatch(/^ph_/);
      // But the stored key is a hash (64 hex characters)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user1" },
          data: expect.objectContaining({
            extensionApiKey: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        })
      );
    });
  });

  describe("getExtensionConfig", () => {
    it("should return extension configuration", async () => {
      const { getExtensionConfig } = await import(
        "@/lib/services/browser-extension"
      );

      const config = getExtensionConfig();

      expect(config.supportedStores).toBeDefined();
      expect(config.supportedStores.length).toBeGreaterThan(0);
      expect(config.features.priceTracking).toBe(true);
      expect(config.apiEndpoints.priceData).toBe("/api/extension/price");
    });
  });
});
