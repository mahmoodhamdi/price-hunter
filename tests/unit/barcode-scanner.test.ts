import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    barcodeScan: {
      findMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("Barcode Scanner Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("isValidBarcode", () => {
    it("should validate EAN-13 barcodes", async () => {
      const { isValidBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(isValidBarcode("4006381333931")).toBe(true); // Valid EAN-13
      expect(isValidBarcode("4006381333932")).toBe(false); // Invalid check digit
    });

    it("should validate EAN-8 barcodes", async () => {
      const { isValidBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(isValidBarcode("96385074")).toBe(true); // Valid EAN-8
    });

    it("should validate UPC-A barcodes", async () => {
      const { isValidBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(isValidBarcode("012345678905")).toBe(true); // Valid UPC-A
    });

    it("should validate ISBN-10 barcodes", async () => {
      const { isValidBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(isValidBarcode("0306406152")).toBe(true); // Valid ISBN-10
    });

    it("should reject invalid formats", async () => {
      const { isValidBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(isValidBarcode("123")).toBe(false);
      expect(isValidBarcode("abcdefgh")).toBe(false);
    });
  });

  describe("getBarcodeType", () => {
    it("should identify EAN-13 barcode", async () => {
      const { getBarcodeType } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(getBarcodeType("4006381333931")).toBe("EAN-13");
    });

    it("should identify ISBN-13 barcode", async () => {
      const { getBarcodeType } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(getBarcodeType("9780306406157")).toBe("ISBN-13");
    });

    it("should identify UPC-A barcode", async () => {
      const { getBarcodeType } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(getBarcodeType("012345678905")).toBe("UPC-A");
    });

    it("should identify EAN-8 barcode", async () => {
      const { getBarcodeType } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(getBarcodeType("12345670")).toBe("EAN-8");
    });

    it("should identify ISBN-10 barcode", async () => {
      const { getBarcodeType } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(getBarcodeType("0306406152")).toBe("ISBN-10");
    });

    it("should return null for unknown format", async () => {
      const { getBarcodeType } = await import(
        "@/lib/services/barcode-scanner"
      );

      expect(getBarcodeType("123")).toBeNull();
    });
  });

  describe("searchByBarcode", () => {
    it("should find product in database", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { searchByBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
        name: "Test Product",
        nameAr: null,
        slug: "test-product",
        barcode: "4006381333931",
        image: "/test.jpg",
        brand: "TestBrand",
        category: "Electronics",
        storeProducts: [
          { price: 100, currency: Currency.SAR },
        ],
      } as any);

      const result = await searchByBarcode("4006381333931");

      expect(result.found).toBe(true);
      expect(result.source).toBe("database");
      expect(result.product?.name).toBe("Test Product");
    });

    it("should search external database if not in local", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { searchByBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          status: 1,
          product: {
            product_name: "External Product",
            brands: "ExternalBrand",
            categories: "Food",
            image_url: "/external.jpg",
          },
        }),
      } as Response);

      const result = await searchByBarcode("4006381333931");

      expect(result.found).toBe(true);
      expect(result.source).toBe("external");
      expect(result.external?.name).toBe("External Product");
    });

    it("should return not_found for invalid barcode", async () => {
      const { searchByBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      const result = await searchByBarcode("123");

      expect(result.found).toBe(false);
      expect(result.source).toBe("not_found");
    });
  });

  describe("getBarcodePriceComparison", () => {
    it("should return price comparison for known barcode", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getBarcodePriceComparison } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        name: "Test Product",
        image: "/test.jpg",
        storeProducts: [
          { price: 100, currency: Currency.SAR, url: "http://store1.com", inStock: true, discount: null, store: { name: "Store1", slug: "store1" } },
          { price: 120, currency: Currency.SAR, url: "http://store2.com", inStock: true, discount: 10, store: { name: "Store2", slug: "store2" } },
        ],
      } as any);

      const result = await getBarcodePriceComparison("4006381333931");

      expect(result).toBeDefined();
      expect(result?.lowestPrice).toBe(100);
      expect(result?.highestPrice).toBe(120);
      expect(result?.savings).toBe(20);
      expect(result?.stores).toHaveLength(2);
    });

    it("should return null for unknown barcode", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getBarcodePriceComparison } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

      const result = await getBarcodePriceComparison("4006381333931");

      expect(result).toBeNull();
    });
  });

  describe("registerBarcode", () => {
    it("should register new barcode", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { registerBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.product.create).mockResolvedValue({
        id: "p1",
      } as any);

      const result = await registerBarcode("4006381333931", {
        name: "New Product",
        brand: "Brand",
      });

      expect(result.success).toBe(true);
      expect(result.productId).toBe("p1");
    });

    it("should reject invalid barcode", async () => {
      const { registerBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      const result = await registerBarcode("123", {
        name: "Product",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("should reject duplicate barcode", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { registerBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "existing",
      } as any);

      const result = await registerBarcode("4006381333931", {
        name: "Product",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already registered");
    });
  });

  describe("getScanHistory", () => {
    it("should return user scan history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getScanHistory } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.barcodeScan.findMany).mockResolvedValue([
        {
          barcode: "4006381333931",
          scannedAt: new Date(),
          product: {
            name: "Test Product",
            image: "/test.jpg",
            storeProducts: [{ price: 100, currency: Currency.SAR }],
          },
        },
      ] as any);

      const history = await getScanHistory("user1");

      expect(history).toHaveLength(1);
      expect(history[0].barcode).toBe("4006381333931");
      expect(history[0].productName).toBe("Test Product");
    });
  });

  describe("recordBarcodeScan", () => {
    it("should record scan with product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { recordBarcodeScan } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: "p1",
      } as any);

      vi.mocked(prisma.barcodeScan.create).mockResolvedValue({} as any);

      await recordBarcodeScan("user1", "4006381333931");

      expect(prisma.barcodeScan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user1",
          barcode: "4006381333931",
          productId: "p1",
        }),
      });
    });

    it("should record scan without product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { recordBarcodeScan } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.barcodeScan.create).mockResolvedValue({} as any);

      await recordBarcodeScan("user1", "4006381333931");

      expect(prisma.barcodeScan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: undefined,
        }),
      });
    });
  });

  describe("getPopularScannedProducts", () => {
    it("should return popular scanned products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPopularScannedProducts } = await import(
        "@/lib/services/barcode-scanner"
      );

      vi.mocked(prisma.barcodeScan.groupBy).mockResolvedValue([
        { barcode: "4006381333931", _count: { barcode: 50 } },
      ] as any);

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        name: "Popular Product",
        image: "/popular.jpg",
      } as any);

      const products = await getPopularScannedProducts(10);

      expect(products).toHaveLength(1);
      expect(products[0].scanCount).toBe(50);
      expect(products[0].productName).toBe("Popular Product");
    });
  });

  describe("generateBarcode", () => {
    it("should generate valid EAN-13 barcode", async () => {
      const { generateBarcode, isValidBarcode } = await import(
        "@/lib/services/barcode-scanner"
      );

      const barcode = generateBarcode("123456789");

      expect(barcode).toHaveLength(13);
      expect(isValidBarcode(barcode)).toBe(true);
    });
  });
});
