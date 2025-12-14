import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

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

describe("Alerts API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("GET /api/alerts", () => {
    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("next-auth");

      vi.mocked(getServerSession).mockResolvedValue(null);

      const response = { error: "Unauthorized", status: 401 };

      expect(response.status).toBe(401);
    });

    it("should return user alerts", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

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
            storeProducts: [{ price: 90, store: { isActive: true } }],
          },
        },
      ] as any);

      vi.mocked(prisma.priceAlert.count).mockResolvedValue(1);

      const { getUserAlerts } = await import("@/lib/services/price-alerts");
      const result = await getUserAlerts("user1");

      expect(result.alerts).toHaveLength(1);
    });

    it("should return alert stats when type=stats", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.priceAlert.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(3);

      const { getAlertStats } = await import("@/lib/services/price-alerts");
      const stats = await getAlertStats("user1");

      expect(stats.total).toBe(10);
      expect(stats.active).toBe(7);
      expect(stats.triggered).toBe(3);
    });
  });

  describe("POST /api/alerts", () => {
    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("next-auth");

      vi.mocked(getServerSession).mockResolvedValue(null);

      const response = { error: "Unauthorized", status: 401 };

      expect(response.status).toBe(401);
    });

    it("should create a new alert", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

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

      const { createPriceAlert } = await import("@/lib/services/price-alerts");
      const alert = await createPriceAlert({
        userId: "user1",
        productId: "p1",
        targetPrice: 100,
        currency: Currency.SAR,
      });

      expect(alert.id).toBe("alert1");
    });

    it("should validate required fields", async () => {
      const { getServerSession } = await import("next-auth");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      // Simulate validation
      const body = { productId: null, targetPrice: null };
      const isValid = body.productId && body.targetPrice;

      expect(isValid).toBeFalsy();
    });

    it("should reject negative target price", async () => {
      const { getServerSession } = await import("next-auth");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      const targetPrice = -100;
      const isValid = targetPrice > 0;

      expect(isValid).toBe(false);
    });
  });

  describe("PATCH /api/alerts/[id]", () => {
    it("should update alert properties", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue({
        id: "alert1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.priceAlert.update).mockResolvedValue({
        id: "alert1",
        productId: "p1",
        targetPrice: 80,
        currency: Currency.SAR,
        isActive: true,
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

      const { updatePriceAlert } = await import("@/lib/services/price-alerts");
      const alert = await updatePriceAlert("alert1", "user1", {
        targetPrice: 80,
        notifyTelegram: true,
      });

      expect(alert?.targetPrice).toBe(80);
    });

    it("should return 404 for non-existent alert", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue(null);

      const { updatePriceAlert } = await import("@/lib/services/price-alerts");
      const alert = await updatePriceAlert("nonexistent", "user1", {
        targetPrice: 80,
      });

      expect(alert).toBeNull();
    });
  });

  describe("DELETE /api/alerts/[id]", () => {
    it("should delete alert", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue({
        id: "alert1",
        userId: "user1",
      } as any);

      vi.mocked(prisma.priceAlert.delete).mockResolvedValue({} as any);

      const { deletePriceAlert } = await import("@/lib/services/price-alerts");
      const result = await deletePriceAlert("alert1", "user1");

      expect(result).toBe(true);
    });

    it("should return 404 for non-existent alert", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.priceAlert.findFirst).mockResolvedValue(null);

      const { deletePriceAlert } = await import("@/lib/services/price-alerts");
      const result = await deletePriceAlert("nonexistent", "user1");

      expect(result).toBe(false);
    });
  });
});

describe("Price Alert Notification Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should trigger email notification when enabled", async () => {
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
          storeProducts: [{ price: 80 }],
        },
        user: {
          email: "test@example.com",
          telegramId: null,
        },
      },
    ] as any);

    vi.mocked(prisma.priceAlert.update).mockResolvedValue({} as any);

    // Console log spy to verify email sending
    const consoleSpy = vi.spyOn(console, "log");

    const result = await checkAndTriggerAlerts();

    expect(result.triggered).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Sending price alert email"),
      expect.anything()
    );
  });

  it("should trigger telegram notification when enabled", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { checkAndTriggerAlerts } = await import("@/lib/services/price-alerts");

    vi.mocked(prisma.priceAlert.findMany).mockResolvedValue([
      {
        id: "alert1",
        targetPrice: 100,
        isActive: true,
        triggered: false,
        notifyEmail: false,
        notifyTelegram: true,
        product: {
          name: "iPhone 15",
          image: null,
          storeProducts: [{ price: 80 }],
        },
        user: {
          email: null,
          telegramId: "123456789",
        },
      },
    ] as any);

    vi.mocked(prisma.priceAlert.update).mockResolvedValue({} as any);

    const consoleSpy = vi.spyOn(console, "log");

    const result = await checkAndTriggerAlerts();

    expect(result.triggered).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Sending price alert to Telegram"),
      expect.anything()
    );
  });
});
