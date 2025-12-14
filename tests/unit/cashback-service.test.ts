import { describe, it, expect, vi, beforeEach } from "vitest";
import { CashbackStatus, Currency } from "@prisma/client";

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

describe("Cashback Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getCashbackSummary", () => {
    it("should return cashback summary for user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackSummary } = await import("@/lib/services/cashback");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user1",
        currency: Currency.SAR,
      } as any);

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([
        { amount: 50, status: CashbackStatus.PENDING },
        { amount: 100, status: CashbackStatus.APPROVED },
        { amount: 200, status: CashbackStatus.PAID },
      ] as any);

      const summary = await getCashbackSummary("user1");

      expect(summary.totalEarned).toBe(350);
      expect(summary.totalPending).toBe(50);
      expect(summary.totalApproved).toBe(100);
      expect(summary.totalPaid).toBe(200);
      expect(summary.currency).toBe(Currency.SAR);
    });

    it("should use default currency when user not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackSummary } = await import("@/lib/services/cashback");

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([]);

      const summary = await getCashbackSummary("user1");

      expect(summary.currency).toBe(Currency.SAR);
    });

    it("should return zeros when no transactions", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackSummary } = await import("@/lib/services/cashback");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user1",
        currency: Currency.EGP,
      } as any);

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([]);

      const summary = await getCashbackSummary("user1");

      expect(summary.totalEarned).toBe(0);
      expect(summary.totalPending).toBe(0);
      expect(summary.totalApproved).toBe(0);
      expect(summary.totalPaid).toBe(0);
    });
  });

  describe("getCashbackTransactions", () => {
    it("should return paginated transactions", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackTransactions } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([
        {
          id: "t1",
          amount: 100,
          currency: Currency.SAR,
          status: CashbackStatus.PENDING,
          createdAt: new Date(),
          paidAt: null,
          affiliateClickId: null,
          user: { currency: Currency.SAR },
        },
      ] as any);

      vi.mocked(prisma.cashbackTransaction.count).mockResolvedValue(1);
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      const result = await getCashbackTransactions("user1", { limit: 10, offset: 0 });

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter by status", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackTransactions } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashbackTransaction.count).mockResolvedValue(0);
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([]);

      await getCashbackTransactions("user1", { status: CashbackStatus.APPROVED });

      expect(prisma.cashbackTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CashbackStatus.APPROVED,
          }),
        })
      );
    });

    it("should include store info from affiliate clicks", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackTransactions } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.findMany).mockResolvedValue([
        {
          id: "t1",
          amount: 100,
          currency: Currency.SAR,
          status: CashbackStatus.PENDING,
          createdAt: new Date(),
          paidAt: null,
          affiliateClickId: "click1",
          user: { currency: Currency.SAR },
        },
      ] as any);

      vi.mocked(prisma.cashbackTransaction.count).mockResolvedValue(1);
      vi.mocked(prisma.affiliateClick.findMany).mockResolvedValue([
        {
          id: "click1",
          store: { name: "Amazon", logo: "/logo.png" },
        },
      ] as any);

      const result = await getCashbackTransactions("user1");

      expect(result.transactions[0].store?.name).toBe("Amazon");
    });
  });

  describe("createCashbackTransaction", () => {
    it("should create a new pending transaction", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createCashbackTransaction } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.create).mockResolvedValue({
        id: "t1",
        amount: 50,
        currency: Currency.SAR,
        status: CashbackStatus.PENDING,
        createdAt: new Date(),
        paidAt: null,
      } as any);

      const transaction = await createCashbackTransaction({
        userId: "user1",
        amount: 50,
        currency: Currency.SAR,
      });

      expect(transaction.id).toBe("t1");
      expect(transaction.amount).toBe(50);
      expect(transaction.status).toBe(CashbackStatus.PENDING);
    });

    it("should link to affiliate click when provided", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createCashbackTransaction } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.create).mockResolvedValue({
        id: "t1",
        amount: 50,
        currency: Currency.SAR,
        status: CashbackStatus.PENDING,
        createdAt: new Date(),
        paidAt: null,
      } as any);

      await createCashbackTransaction({
        userId: "user1",
        affiliateClickId: "click1",
        amount: 50,
        currency: Currency.SAR,
      });

      expect(prisma.cashbackTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            affiliateClickId: "click1",
          }),
        })
      );
    });
  });

  describe("updateCashbackStatus", () => {
    it("should update transaction status", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateCashbackStatus } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.update).mockResolvedValue({
        id: "t1",
        amount: 50,
        currency: Currency.SAR,
        status: CashbackStatus.APPROVED,
        createdAt: new Date(),
        paidAt: null,
      } as any);

      const transaction = await updateCashbackStatus("t1", CashbackStatus.APPROVED);

      expect(transaction.status).toBe(CashbackStatus.APPROVED);
    });

    it("should set paidAt when status is PAID", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateCashbackStatus } = await import("@/lib/services/cashback");

      const paidDate = new Date();
      vi.mocked(prisma.cashbackTransaction.update).mockResolvedValue({
        id: "t1",
        amount: 50,
        currency: Currency.SAR,
        status: CashbackStatus.PAID,
        createdAt: new Date(),
        paidAt: paidDate,
      } as any);

      await updateCashbackStatus("t1", CashbackStatus.PAID);

      expect(prisma.cashbackTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CashbackStatus.PAID,
            paidAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("processApprovedCashback", () => {
    it("should approve pending transactions older than specified days", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { processApprovedCashback } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.updateMany).mockResolvedValue({
        count: 5,
      });

      const count = await processApprovedCashback(30);

      expect(count).toBe(5);
      expect(prisma.cashbackTransaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CashbackStatus.PENDING,
          }),
          data: {
            status: CashbackStatus.APPROVED,
          },
        })
      );
    });
  });

  describe("getPendingWithdrawals", () => {
    it("should return total approved amount", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPendingWithdrawals } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 250 },
      } as any);

      const amount = await getPendingWithdrawals("user1");

      expect(amount).toBe(250);
    });

    it("should return 0 when no approved transactions", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPendingWithdrawals } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.aggregate).mockResolvedValue({
        _sum: { amount: null },
      } as any);

      const amount = await getPendingWithdrawals("user1");

      expect(amount).toBe(0);
    });
  });

  describe("requestWithdrawal", () => {
    it("should succeed when sufficient balance", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { requestWithdrawal } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 500 },
      } as any);

      const result = await requestWithdrawal("user1", 200);

      expect(result.success).toBe(true);
    });

    it("should fail when insufficient balance", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { requestWithdrawal } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 100 },
      } as any);

      const result = await requestWithdrawal("user1", 200);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Insufficient");
    });
  });

  describe("getCashbackLeaderboard", () => {
    it("should return top earners", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackLeaderboard } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.groupBy).mockResolvedValue([
        { userId: "user1", _sum: { amount: 500 } },
        { userId: "user2", _sum: { amount: 300 } },
      ] as any);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user1", name: "John" },
        { id: "user2", name: "Jane" },
      ] as any);

      const leaderboard = await getCashbackLeaderboard(10);

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].name).toBe("John");
      expect(leaderboard[0].totalEarned).toBe(500);
    });

    it("should handle users without names", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getCashbackLeaderboard } = await import("@/lib/services/cashback");

      vi.mocked(prisma.cashbackTransaction.groupBy).mockResolvedValue([
        { userId: "user1", _sum: { amount: 500 } },
      ] as any);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "user1", name: null },
      ] as any);

      const leaderboard = await getCashbackLeaderboard(10);

      expect(leaderboard[0].name).toBe("Anonymous");
    });
  });

  describe("calculateCashback", () => {
    it("should calculate correct cashback amount", async () => {
      const { calculateCashback } = await import("@/lib/services/cashback");

      // 1000 purchase, 5% affiliate rate, 50% to user = 25
      const cashback = calculateCashback(1000, 5);

      expect(cashback).toBe(25);
    });

    it("should round to 2 decimal places", async () => {
      const { calculateCashback } = await import("@/lib/services/cashback");

      const cashback = calculateCashback(333, 3);

      // 333 * 0.03 * 0.5 = 4.995 -> 5.00
      expect(cashback).toBe(5);
    });
  });
});
