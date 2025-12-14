import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
    },
    storeProduct: {
      count: vi.fn(),
    },
  },
}));

describe("Embed Widget Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getEmbedWidgetData", () => {
    it("should return widget data for valid product slug", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getEmbedWidgetData } = await import(
        "@/lib/services/embed-widget"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "iPhone 15",
        slug: "iphone-15",
        image: "/iphone.jpg",
        brand: "Apple",
        category: "Smartphones",
        updatedAt: new Date(),
        storeProducts: [
          {
            price: 4000,
            currency: Currency.SAR,
            url: "https://amazon.sa/product/123",
            inStock: true,
            discount: null,
            store: { name: "Amazon", slug: "amazon-sa" },
          },
          {
            price: 4200,
            currency: Currency.SAR,
            url: "https://noon.com/product/123",
            inStock: true,
            discount: 5,
            store: { name: "Noon", slug: "noon-sa" },
          },
        ],
      } as any);

      const data = await getEmbedWidgetData("iphone-15");

      expect(data).toBeDefined();
      expect(data?.productName).toBe("iPhone 15");
      expect(data?.lowestPrice).toBe(4000);
      expect(data?.highestPrice).toBe(4200);
      expect(data?.stores).toHaveLength(2);
    });

    it("should return null for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getEmbedWidgetData } = await import(
        "@/lib/services/embed-widget"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const data = await getEmbedWidgetData("non-existent");

      expect(data).toBeNull();
    });

    it("should return null for product without store products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getEmbedWidgetData } = await import(
        "@/lib/services/embed-widget"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "Product",
        slug: "product",
        storeProducts: [],
      } as any);

      const data = await getEmbedWidgetData("product");

      expect(data).toBeNull();
    });
  });

  describe("getEmbedWidgetDataById", () => {
    it("should return widget data for valid product ID", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getEmbedWidgetDataById } = await import(
        "@/lib/services/embed-widget"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "iPhone 15",
        slug: "iphone-15",
        image: null,
        brand: "Apple",
        category: "Smartphones",
        updatedAt: new Date(),
        storeProducts: [
          {
            price: 4000,
            currency: Currency.SAR,
            url: "https://amazon.sa/product/123",
            inStock: true,
            discount: null,
            store: { name: "Amazon", slug: "amazon-sa" },
          },
        ],
      } as any);

      const data = await getEmbedWidgetDataById("p1");

      expect(data).toBeDefined();
      expect(data?.productId).toBe("p1");
    });
  });

  describe("generateEmbedCode", () => {
    it("should generate HTML embed code", async () => {
      const { generateEmbedCode } = await import(
        "@/lib/services/embed-widget"
      );

      const code = generateEmbedCode("iphone-15");

      expect(code.html).toContain("price-hunter-widget");
      expect(code.html).toContain('data-product="iphone-15"');
      expect(code.html).toContain("embed.js");
    });

    it("should generate JavaScript embed code", async () => {
      const { generateEmbedCode } = await import(
        "@/lib/services/embed-widget"
      );

      const code = generateEmbedCode("iphone-15");

      expect(code.javascript).toContain("price-hunter-widget");
      expect(code.javascript).toContain("iphone-15");
    });

    it("should generate iframe embed code", async () => {
      const { generateEmbedCode } = await import(
        "@/lib/services/embed-widget"
      );

      const code = generateEmbedCode("iphone-15");

      expect(code.iframe).toContain("<iframe");
      expect(code.iframe).toContain("/embed/iphone-15");
    });

    it("should apply custom config", async () => {
      const { generateEmbedCode } = await import(
        "@/lib/services/embed-widget"
      );

      const code = generateEmbedCode("iphone-15", {
        theme: "dark",
        primaryColor: "#ff0000",
        showLogo: false,
        maxStores: 3,
        language: "ar",
      });

      expect(code.html).toContain('data-theme="dark"');
      expect(code.html).toContain('data-color="#ff0000"');
      expect(code.html).toContain('data-show-logo="false"');
      expect(code.html).toContain('data-max-stores="3"');
      expect(code.html).toContain('data-lang="ar"');
    });
  });

  describe("generateWidgetScript", () => {
    it("should generate valid JavaScript", async () => {
      const { generateWidgetScript } = await import(
        "@/lib/services/embed-widget"
      );

      const script = generateWidgetScript();

      expect(script).toContain("(function()");
      expect(script).toContain("WIDGET_API");
      expect(script).toContain("initWidget");
      expect(script).toContain("renderWidget");
    });

    it("should include widget styles", async () => {
      const { generateWidgetScript } = await import(
        "@/lib/services/embed-widget"
      );

      const script = generateWidgetScript();

      expect(script).toContain(".ph-widget");
      expect(script).toContain(".ph-widget-header");
      expect(script).toContain(".ph-widget-prices");
    });

    it("should handle dark theme", async () => {
      const { generateWidgetScript } = await import(
        "@/lib/services/embed-widget"
      );

      const script = generateWidgetScript();

      expect(script).toContain(".ph-dark");
    });
  });

  describe("getCompactWidgetData", () => {
    it("should return compact widget data", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCompactWidgetData } = await import(
        "@/lib/services/embed-widget"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "iPhone 15",
        slug: "iphone-15",
        storeProducts: [
          {
            price: 4000,
            currency: Currency.SAR,
          },
        ],
      } as any);

      vi.mocked(prisma.storeProduct.count).mockResolvedValue(5);

      const data = await getCompactWidgetData("iphone-15");

      expect(data).toBeDefined();
      expect(data?.name).toBe("iPhone 15");
      expect(data?.lowestPrice).toBe(4000);
      expect(data?.storeCount).toBe(5);
    });

    it("should return null for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCompactWidgetData } = await import(
        "@/lib/services/embed-widget"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const data = await getCompactWidgetData("non-existent");

      expect(data).toBeNull();
    });
  });

  describe("validateEmbedDomain", () => {
    it("should allow valid domains", async () => {
      const { validateEmbedDomain } = await import(
        "@/lib/services/embed-widget"
      );

      const result = await validateEmbedDomain("myblog.com");

      expect(result.allowed).toBe(true);
    });

    it("should block blacklisted domains", async () => {
      const { validateEmbedDomain } = await import(
        "@/lib/services/embed-widget"
      );

      const result = await validateEmbedDomain("spam.com");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("generatePriceBadge", () => {
    it("should generate minimal badge", async () => {
      const { generatePriceBadge } = await import(
        "@/lib/services/embed-widget"
      );

      const badge = generatePriceBadge(100, Currency.SAR, 5, {
        style: "minimal",
        color: "#3b82f6",
      });

      expect(badge).toContain("100.00");
      expect(badge).toContain("SAR");
      expect(badge).toContain("#3b82f6");
    });

    it("should generate detailed badge", async () => {
      const { generatePriceBadge } = await import(
        "@/lib/services/embed-widget"
      );

      const badge = generatePriceBadge(100, Currency.SAR, 5, {
        style: "detailed",
        color: "#16a34a",
      });

      expect(badge).toContain("100.00");
      expect(badge).toContain("SAR");
      expect(badge).toContain("5 stores");
    });
  });

  describe("trackWidgetImpression", () => {
    it("should track impressions without error", async () => {
      const { trackWidgetImpression } = await import(
        "@/lib/services/embed-widget"
      );

      // Should not throw
      await expect(
        trackWidgetImpression("iphone-15", "https://myblog.com")
      ).resolves.toBeUndefined();
    });

    it("should handle null referrer", async () => {
      const { trackWidgetImpression } = await import(
        "@/lib/services/embed-widget"
      );

      await expect(
        trackWidgetImpression("iphone-15", null)
      ).resolves.toBeUndefined();
    });
  });

  describe("trackWidgetClick", () => {
    it("should track clicks without error", async () => {
      const { trackWidgetClick } = await import(
        "@/lib/services/embed-widget"
      );

      await expect(
        trackWidgetClick("iphone-15", "amazon-sa", "https://myblog.com")
      ).resolves.toBeUndefined();
    });
  });
});
