import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    priceAlert: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Price Alerts Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getUserAlerts", () => {
    it("should return user alerts with product info", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserAlerts } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([
        {
          id: "alert1",
          productId: "p1",
          targetPrice: 100,
          currency: Currency.SAR,
          isActive: true,
          triggered: false,
          triggeredAt: null,
          notifyEmail: true,
          notifyTelegram: false,
          notifyPush: false,
          createdAt: new Date(),
          product: {
            name: "iPhone 15",
            image: "/img.jpg",
            storeProducts: [{ price: 90 }],
          },
        },
      ] as any);

      vi.mocked(prisma.priceAlert.count).mockResolvedValue(1);

      const result = await getUserAlerts("user1");

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].productName).toBe("iPhone 15");
      expect(result.alerts[0].currentPrice).toBe(90);
      expect(result.total).toBe(1);
    });

    it("should filter by active status", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserAlerts } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([]);
      vi.mocked(prisma.priceAlert.count).mockResolvedValue(0);

      await getUserAlerts("user1", { active: true });

      expect(prisma.priceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it("should paginate results", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserAlerts } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([]);
      vi.mocked(prisma.priceAlert.count).mockResolvedValue(0);

      await getUserAlerts("user1", { limit: 10, offset: 20 });

      expect(prisma.priceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe("createPriceAlert", () => {
    it("should create a new alert", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createPriceAlert } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.priceAlert.create).mockResolvedValue({
        id: "alert1",
        productId: "p1",
        targetPrice: 100,
        currency: Currency.SAR,
        isActive: true,
        triggered: false,
        triggeredAt: null,
        notifyEmail: true,
        notifyTelegram: false,
        notifyPush: false,
        createdAt: new Date(),
        product: {
          name: "iPhone 15",
          image: "/img.jpg",
          storeProducts: [{ price: 120 }],
        },
      } as any);

      const alert = await createPriceAlert({
        userId: "user1",
        productId: "p1",
        targetPrice: 100,
        currency: Currency.SAR,
      });

      expect(alert.id).toBe("alert1");
      expect(alert.targetPrice).toBe(100);
      expect(prisma.priceAlert.create).toHaveBeenCalled();
    });

    it("should update existing alert for same product", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createPriceAlert } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue({
        id: "existing-alert",
      } as any);

      vi.mocked(prisma.priceAlert.update).mockResolvedValue({
        id: "existing-alert",
        productId: "p1",
        targetPrice: 90,
        currency: Currency.SAR,
        isActive: true,
        triggered: false,
        triggeredAt: null,
        notifyEmail: true,
        notifyTelegram: false,
        notifyPush: false,
        createdAt: new Date(),
        product: {
          name: "iPhone 15",
          image: "/img.jpg",
          storeProducts: [{ price: 120 }],
        },
      } as any);

      const alert = await createPriceAlert({
        userId: "user1",
        productId: "p1",
        targetPrice: 90,
        currency: Currency.SAR,
      });

      expect(prisma.priceAlert.update).toHaveBeenCalled();
      expect(alert.targetPrice).toBe(90);
    });
  });

  describe("updatePriceAlert", () => {
    it("should update alert properties", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updatePriceAlert } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue({
        id: "alert1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.priceAlert.update).mockResolvedValue({
        id: "alert1",
        productId: "p1",
        targetPrice: 80,
        currency: Currency.SAR,
        isActive: false,
        triggered: false,
        triggeredAt: null,
        notifyEmail: true,
        notifyTelegram: true,
        notifyPush: false,
        createdAt: new Date(),
        product: {
          name: "iPhone 15",
          image: "/img.jpg",
          storeProducts: [{ price: 120 }],
        },
      } as any);

      const alert = await updatePriceAlert("alert1", "user1", {
        targetPrice: 80,
        isActive: false,
        notifyTelegram: true,
      });

      expect(alert?.targetPrice).toBe(80);
      expect(alert?.isActive).toBe(false);
    });

    it("should return null if alert not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updatePriceAlert } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue(null);

      const alert = await updatePriceAlert("nonexistent", "user1", {
        targetPrice: 80,
      });

      expect(alert).toBeNull();
    });
  });

  describe("deletePriceAlert", () => {
    it("should delete alert", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deletePriceAlert } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue({
        id: "alert1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.priceAlert.delete).mockResolvedValue({} as any);

      const result = await deletePriceAlert("alert1", "user1");

      expect(result).toBe(true);
      expect(prisma.priceAlert.delete).toHaveBeenCalled();
    });

    it("should return false if alert not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deletePriceAlert } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue(null);

      const result = await deletePriceAlert("nonexistent", "user1");

      expect(result).toBe(false);
    });
  });

  describe("checkAndTriggerAlerts", () => {
    it("should trigger alerts when price drops below target", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { checkAndTriggerAlerts } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([
        {
          id: "alert1",
          targetPrice: 100,
          isActive: true,
          triggered: false,
          notifyEmail: true,
          notifyTelegram: false,
          product: {
            name: "iPhone 15",
            image: null,
            storeProducts: [{ price: 90 }],
          },
          user: {
            email: "test@example.com",
            telegramId: null,
          },
        },
      ] as any);

      vi.mocked(prisma.priceAlert.update).mockResolvedValue({} as any);

      const result = await checkAndTriggerAlerts();

      expect(result.checked).toBe(1);
      expect(result.triggered).toBe(1);
      expect(prisma.priceAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            triggered: true,
          }),
        })
      );
    });

    it("should not trigger alerts when price is above target", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { checkAndTriggerAlerts } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([
        {
          id: "alert1",
          targetPrice: 100,
          isActive: true,
          triggered: false,
          notifyEmail: true,
          notifyTelegram: false,
          product: {
            name: "iPhone 15",
            image: null,
            storeProducts: [{ price: 150 }],
          },
          user: {
            email: "test@example.com",
            telegramId: null,
          },
        },
      ] as any);

      const result = await checkAndTriggerAlerts();

      expect(result.checked).toBe(1);
      expect(result.triggered).toBe(0);
    });
  });

  describe("getAlertStats", () => {
    it("should return alert statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getAlertStats } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // active
        .mockResolvedValueOnce(3); // triggered

      const stats = await getAlertStats("user1");

      expect(stats.total).toBe(10);
      expect(stats.active).toBe(7);
      expect(stats.triggered).toBe(3);
    });
  });

  describe("getTriggeredAlerts", () => {
    it("should return alerts where current price is below target", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTriggeredAlerts } = await import("@/lib/services/price-alerts");

      vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([
        {
          id: "alert1",
          productId: "p1",
          targetPrice: 100,
          currency: Currency.SAR,
          isActive: true,
          triggered: false,
          triggeredAt: null,
          notifyEmail: true,
          notifyTelegram: false,
          notifyPush: false,
          createdAt: new Date(),
          product: {
            name: "iPhone 15",
            image: "/img.jpg",
            storeProducts: [{ price: 80 }], // Below target
          },
        },
        {
          id: "alert2",
          productId: "p2",
          targetPrice: 100,
          currency: Currency.SAR,
          isActive: true,
          triggered: false,
          triggeredAt: null,
          notifyEmail: true,
          notifyTelegram: false,
          notifyPush: false,
          createdAt: new Date(),
          product: {
            name: "Galaxy S24",
            image: "/img2.jpg",
            storeProducts: [{ price: 120 }], // Above target
          },
        },
      ] as any);

      const triggered = await getTriggeredAlerts("user1");

      expect(triggered).toHaveLength(1);
      expect(triggered[0].productName).toBe("iPhone 15");
    });
  });
});
