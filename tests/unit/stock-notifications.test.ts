import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    stockNotification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    storeProduct: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
    },
    stockHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock("@/lib/notifications/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("Stock Notifications Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getStockNotifications", () => {
    it("should return user stock notifications", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStockNotifications } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.findMany).mockResolvedValue([
        {
          id: "sn1",
          userId: "user1",
          storeProductId: "sp1",
          isActive: true,
          notifyEmail: true,
          notifyPush: false,
          createdAt: new Date(),
          lastNotifiedAt: null,
          storeProduct: {
            url: "https://amazon.sa/product/123",
            price: 100,
            currency: Currency.SAR,
            product: { name: "Test Product", image: "/test.jpg" },
            store: { name: "Amazon SA" },
          },
        },
      ] as any);

      const notifications = await getStockNotifications("user1");

      expect(notifications).toHaveLength(1);
      expect(notifications[0].productName).toBe("Test Product");
      expect(notifications[0].storeName).toBe("Amazon SA");
    });
  });

  describe("createStockNotification", () => {
    it("should create a new stock notification", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createStockNotification } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        price: 100,
        currency: Currency.SAR,
        product: { name: "Test Product", image: null },
        store: { name: "Amazon" },
      } as any);

      vi.mocked(prisma.stockNotification.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.stockNotification.create).mockResolvedValue({
        id: "sn1",
        userId: "user1",
        storeProductId: "sp1",
        isActive: true,
        notifyEmail: true,
        notifyPush: false,
        createdAt: new Date(),
        lastNotifiedAt: null,
        storeProduct: {
          url: "https://amazon.sa/product/123",
          price: 100,
          currency: Currency.SAR,
          product: { name: "Test Product", image: null },
          store: { name: "Amazon" },
        },
      } as any);

      const notification = await createStockNotification({
        userId: "user1",
        storeProductId: "sp1",
      });

      expect(notification).toBeDefined();
      expect(notification?.isActive).toBe(true);
    });

    it("should return null for non-existent store product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createStockNotification } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue(null);

      const notification = await createStockNotification({
        userId: "user1",
        storeProductId: "non-existent",
      });

      expect(notification).toBeNull();
    });

    it("should update existing notification if exists", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createStockNotification } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        product: { name: "Test Product" },
        store: { name: "Amazon" },
      } as any);

      vi.mocked(prisma.stockNotification.findUnique).mockResolvedValue({
        id: "existing",
        isActive: false,
      } as any);

      vi.mocked(prisma.stockNotification.update).mockResolvedValue({
        id: "existing",
        userId: "user1",
        storeProductId: "sp1",
        isActive: true,
        notifyEmail: true,
        notifyPush: false,
        createdAt: new Date(),
        lastNotifiedAt: null,
        storeProduct: {
          url: "https://amazon.sa/product/123",
          price: 100,
          currency: Currency.SAR,
          product: { name: "Test Product", image: null },
          store: { name: "Amazon" },
        },
      } as any);

      const notification = await createStockNotification({
        userId: "user1",
        storeProductId: "sp1",
      });

      expect(prisma.stockNotification.update).toHaveBeenCalled();
      expect(notification?.id).toBe("existing");
    });
  });

  describe("deleteStockNotification", () => {
    it("should delete notification", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deleteStockNotification } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.findFirst).mockResolvedValue({
        id: "sn1",
      } as any);

      vi.mocked(prisma.stockNotification.delete).mockResolvedValue({} as any);

      const result = await deleteStockNotification("user1", "sn1");

      expect(result).toBe(true);
    });

    it("should return false if notification not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deleteStockNotification } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.findFirst).mockResolvedValue(null);

      const result = await deleteStockNotification("user1", "non-existent");

      expect(result).toBe(false);
    });
  });

  describe("toggleStockNotification", () => {
    it("should toggle notification active status", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { toggleStockNotification } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.findFirst).mockResolvedValue({
        id: "sn1",
        isActive: true,
        storeProduct: {
          url: "https://amazon.sa/product/123",
          price: 100,
          currency: Currency.SAR,
          product: { name: "Test Product", image: null },
          store: { name: "Amazon" },
        },
      } as any);

      vi.mocked(prisma.stockNotification.update).mockResolvedValue({
        id: "sn1",
        userId: "user1",
        storeProductId: "sp1",
        isActive: false,
        notifyEmail: true,
        notifyPush: false,
        createdAt: new Date(),
        lastNotifiedAt: null,
        storeProduct: {
          url: "https://amazon.sa/product/123",
          price: 100,
          currency: Currency.SAR,
          product: { name: "Test Product", image: null },
          store: { name: "Amazon" },
        },
      } as any);

      const notification = await toggleStockNotification("user1", "sn1");

      expect(notification?.isActive).toBe(false);
    });

    it("should return null if notification not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { toggleStockNotification } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.findFirst).mockResolvedValue(null);

      const notification = await toggleStockNotification("user1", "non-existent");

      expect(notification).toBeNull();
    });
  });

  describe("getStockStatus", () => {
    it("should return stock status with history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStockStatus } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue({
        id: "sp1",
        inStock: true,
        lastScraped: new Date(),
        stockHistory: [
          { inStock: true, checkedAt: new Date() },
          { inStock: false, checkedAt: new Date(Date.now() - 86400000) },
        ],
      } as any);

      const status = await getStockStatus("sp1");

      expect(status).toBeDefined();
      expect(status?.inStock).toBe(true);
      expect(status?.stockHistory).toHaveLength(2);
    });

    it("should return null for non-existent product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStockStatus } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.storeProduct.findUnique).mockResolvedValue(null);

      const status = await getStockStatus("non-existent");

      expect(status).toBeNull();
    });
  });

  describe("getStockNotificationStats", () => {
    it("should return notification statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStockNotificationStats } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const stats = await getStockNotificationStats("user1");

      expect(stats.totalNotifications).toBe(10);
      expect(stats.activeNotifications).toBe(5);
      expect(stats.notificationsTriggered).toBe(3);
    });
  });

  describe("getOutOfStockWishlistItems", () => {
    it("should return out of stock wishlist items", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getOutOfStockWishlistItems } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          productId: "p1",
          product: {
            name: "Test Product",
            storeProducts: [
              {
                id: "sp1",
                price: 100,
                currency: Currency.SAR,
                store: { name: "Amazon" },
              },
            ],
          },
        },
      ] as any);

      vi.mocked(prisma.stockNotification.findUnique).mockResolvedValue(null);

      const items = await getOutOfStockWishlistItems("user1");

      expect(items).toHaveLength(1);
      expect(items[0].productName).toBe("Test Product");
      expect(items[0].hasNotification).toBe(false);
    });
  });

  describe("recordStockCheck", () => {
    it("should record stock check and update product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { recordStockCheck } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockHistory.create).mockResolvedValue({} as any);
      vi.mocked(prisma.storeProduct.update).mockResolvedValue({} as any);

      await recordStockCheck("sp1", true);

      expect(prisma.stockHistory.create).toHaveBeenCalledWith({
        data: {
          storeProductId: "sp1",
          inStock: true,
        },
      });
      expect(prisma.storeProduct.update).toHaveBeenCalled();
    });
  });

  describe("getRecentlyRestockedProducts", () => {
    it("should return recently restocked products", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getRecentlyRestockedProducts } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockHistory.findMany).mockResolvedValue([
        {
          id: "sh1",
          storeProductId: "sp1",
          inStock: true,
          checkedAt: new Date(),
          storeProduct: {
            price: 100,
            currency: Currency.SAR,
            url: "https://amazon.sa/product/123",
            product: { name: "Test Product" },
            store: { name: "Amazon" },
          },
        },
      ] as any);

      vi.mocked(prisma.stockHistory.findFirst).mockResolvedValue({
        inStock: false,
        checkedAt: new Date(Date.now() - 86400000),
      } as any);

      const products = await getRecentlyRestockedProducts(10);

      expect(products).toHaveLength(1);
      expect(products[0].productName).toBe("Test Product");
    });
  });

  describe("processStockNotifications", () => {
    it("should process and send notifications", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { processStockNotifications } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.findMany).mockResolvedValue([
        {
          id: "sn1",
          notifyEmail: true,
          notifyPush: false,
          user: { email: "test@example.com", name: "Test User" },
          storeProduct: {
            url: "https://amazon.sa/product/123",
            price: 100,
            currency: Currency.SAR,
            product: { name: "Test Product", image: null },
            store: { name: "Amazon" },
          },
        },
      ] as any);

      vi.mocked(prisma.stockNotification.update).mockResolvedValue({} as any);

      const result = await processStockNotifications();

      expect(result.processed).toBe(1);
      expect(result.notified).toBe(1);
    });

    it("should handle empty notifications", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { processStockNotifications } = await import(
        "@/lib/services/stock-notifications"
      );

      vi.mocked(prisma.stockNotification.findMany).mockResolvedValue([]);

      const result = await processStockNotifications();

      expect(result.processed).toBe(0);
      expect(result.notified).toBe(0);
    });
  });
});
