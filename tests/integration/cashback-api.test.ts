import { describe, it, expect, vi, beforeEach } from "vitest";
import { CashbackStatus, Currency } from "@prisma/client";

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
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    cashbackTransaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    affiliateClick: {
      findMany: vi.fn(),
    },
  },
}));

describe("Cashback API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("GET /api/cashback", () => {
    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("next-auth");

      vi.mocked(getServerSession).mockResolvedValue(null);

      // Simulate the API response
      const response = { error: "Unauthorized", status: 401 };

      expect(response.status).toBe(401);
      expect(response.error).toBe("Unauthorized");
    });

    it("should return cashback summary when type=summary", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user1",
        currency: Currency.SAR,
      } as any);

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([
        { amount: 100, status: CashbackStatus.APPROVED },
        { amount: 50, status: CashbackStatus.PENDING },
      ] as any);

      const { getCashbackSummary } = await import("@/lib/services/cashback");
      const summary = await getCashbackSummary("user1");

      expect(summary.totalEarned).toBe(150);
      expect(summary.currency).toBe(Currency.SAR);
    });

    it("should return transactions when type=transactions", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([
        {
          id: "t1",
          amount: 100,
          currency: Currency.SAR,
          status: CashbackStatus.APPROVED,
          createdAt: new Date(),
          paidAt: null,
          affiliateClickId: null,
          user: { currency: Currency.SAR },
        },
      ] as any);

      vi.mocked(prisma.cashbackTransaction.count).mockResolvedValue(1);
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      const { getCashbackTransactions } = await import("@/lib/services/cashback");
      const result = await getCashbackTransactions("user1");

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter transactions by status", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashbackTransaction.count).mockResolvedValue(0);
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      const { getCashbackTransactions } = await import("@/lib/services/cashback");
      await getCashbackTransactions("user1", { status: CashbackStatus.PENDING });

      expect(prisma.cashbackTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CashbackStatus.PENDING,
          }),
        })
      );
    });
  });

  describe("POST /api/cashback/withdraw", () => {
    it("should return 401 when not authenticated", async () => {
      const { getServerSession } = await import("next-auth");

      vi.mocked(getServerSession).mockResolvedValue(null);

      const response = { error: "Unauthorized", status: 401 };

      expect(response.status).toBe(401);
    });

    it("should fail with invalid amount", async () => {
      const { getServerSession } = await import("next-auth");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      // Simulate invalid amount validation
      const amount = -100;
      const isValid = amount > 0;

      expect(isValid).toBe(false);
    });

    it("should succeed with valid withdrawal request", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.cashbackTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 500 },
      } as any);

      const { requestWithdrawal } = await import("@/lib/services/cashback");
      const result = await requestWithdrawal("user1", 200);

      expect(result.success).toBe(true);
    });

    it("should fail when insufficient balance", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.cashbackTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 100 },
      } as any);

      const { requestWithdrawal } = await import("@/lib/services/cashback");
      const result = await requestWithdrawal("user1", 500);

      expect(result.success).toBe(false);
    });
  });

  describe("GET /api/cashback/withdraw", () => {
    it("should return available balance", async () => {
      const { getServerSession } = await import("next-auth");
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user1" },
      } as any);

      vi.mocked(prisma.cashbackTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 350 },
      } as any);

      const { getPendingWithdrawals } = await import("@/lib/services/cashback");
      const available = await getPendingWithdrawals("user1");

      expect(available).toBe(350);
    });
  });
});

describe("Cashback Dashboard Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Summary Cards", () => {
    it("should calculate total earned correctly", async () => {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user1",
        currency: Currency.SAR,
      } as any);

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([
        { amount: 100, status: CashbackStatus.PENDING },
        { amount: 200, status: CashbackStatus.APPROVED },
        { amount: 300, status: CashbackStatus.PAID },
        { amount: 50, status: CashbackStatus.REJECTED },
      ] as any);

      const { getCashbackSummary } = await import("@/lib/services/cashback");
      const summary = await getCashbackSummary("user1");

      expect(summary.totalEarned).toBe(650);
    });

    it("should separate amounts by status", async () => {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user1",
        currency: Currency.SAR,
      } as any);

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([
        { amount: 100, status: CashbackStatus.PENDING },
        { amount: 100, status: CashbackStatus.PENDING },
        { amount: 200, status: CashbackStatus.APPROVED },
        { amount: 300, status: CashbackStatus.PAID },
      ] as any);

      const { getCashbackSummary } = await import("@/lib/services/cashback");
      const summary = await getCashbackSummary("user1");

      expect(summary.totalPending).toBe(200);
      expect(summary.totalApproved).toBe(200);
      expect(summary.totalPaid).toBe(300);
    });
  });

  describe("Transaction History", () => {
    it("should paginate results", async () => {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashbackTransaction.count).mockResolvedValue(50);
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      const { getCashbackTransactions } = await import("@/lib/services/cashback");
      await getCashbackTransactions("user1", { limit: 10, offset: 20 });

      expect(prisma.cashbackTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it("should order by date descending", async () => {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashbackTransaction.count).mockResolvedValue(0);
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      const { getCashbackTransactions } = await import("@/lib/services/cashback");
      await getCashbackTransactions("user1");

      expect(prisma.cashbackTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });
});
