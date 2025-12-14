import { prisma } from "@/lib/prisma";
import { CashbackStatus, Currency } from "@prisma/client";

export interface CashbackSummary {
  totalEarned: number;
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  currency: Currency;
}

export interface CashbackTransaction {
  id: string;
  amount: number;
  currency: Currency;
  status: CashbackStatus;
  createdAt: Date;
  paidAt?: Date | null;
  store?: {
    name: string;
    logo: string | null;
  };
}

// Get user's cashback summary
export async function getCashbackSummary(userId: string): Promise<CashbackSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });

  const currency = user?.currency || Currency.SAR;

  const transactions = await prisma.cashbackTransaction.findMany({
    where: { userId },
    select: {
      amount: true,
      status: true,
    },
  });

  const summary = transactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount);
      acc.totalEarned += amount;

      switch (t.status) {
        case CashbackStatus.PENDING:
          acc.totalPending += amount;
          break;
        case CashbackStatus.APPROVED:
          acc.totalApproved += amount;
          break;
        case CashbackStatus.PAID:
          acc.totalPaid += amount;
          break;
      }

      return acc;
    },
    { totalEarned: 0, totalPending: 0, totalApproved: 0, totalPaid: 0 }
  );

  return {
    ...summary,
    currency,
  };
}

// Get user's cashback transactions
export async function getCashbackTransactions(
  userId: string,
  options: {
    status?: CashbackStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ transactions: CashbackTransaction[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  const where = {
    userId,
    ...(status && { status }),
  };

  const [transactions, total] = await Promise.all([
    prisma.cashbackTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { currency: true },
        },
      },
    }),
    prisma.cashbackTransaction.count({ where }),
  ]);

  // Get affiliate click info for store details
  const affiliateClickIds = transactions
    .map((t) => t.affiliateClickId)
    .filter(Boolean) as string[];

  const affiliateClicks =
    affiliateClickIds.length > 0
      ? await prisma.affiliateClick.findMany({
          where: { id: { in: affiliateClickIds } },
          include: {
            store: {
              select: { name: true, logo: true },
            },
          },
        })
      : [];

  const clicksMap = new Map(affiliateClicks.map((c) => [c.id, c]));

  return {
    transactions: transactions.map((t) => {
      const click = t.affiliateClickId ? clicksMap.get(t.affiliateClickId) : null;
      return {
        id: t.id,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt,
        paidAt: t.paidAt,
        store: click?.store || undefined,
      };
    }),
    total,
  };
}

// Create a new cashback transaction (when affiliate click converts)
export async function createCashbackTransaction(data: {
  userId: string;
  affiliateClickId?: string;
  amount: number;
  currency: Currency;
}): Promise<CashbackTransaction> {
  const transaction = await prisma.cashbackTransaction.create({
    data: {
      userId: data.userId,
      affiliateClickId: data.affiliateClickId,
      amount: data.amount,
      currency: data.currency,
      status: CashbackStatus.PENDING,
    },
  });

  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    status: transaction.status,
    createdAt: transaction.createdAt,
    paidAt: transaction.paidAt,
  };
}

// Update cashback transaction status (admin function)
export async function updateCashbackStatus(
  transactionId: string,
  status: CashbackStatus
): Promise<CashbackTransaction> {
  const transaction = await prisma.cashbackTransaction.update({
    where: { id: transactionId },
    data: {
      status,
      ...(status === CashbackStatus.PAID && { paidAt: new Date() }),
    },
  });

  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    status: transaction.status,
    createdAt: transaction.createdAt,
    paidAt: transaction.paidAt,
  };
}

// Process pending cashback (mark as approved after verification period)
export async function processApprovedCashback(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.cashbackTransaction.updateMany({
    where: {
      status: CashbackStatus.PENDING,
      createdAt: { lt: cutoffDate },
    },
    data: {
      status: CashbackStatus.APPROVED,
    },
  });

  return result.count;
}

// Get total pending withdrawals
export async function getPendingWithdrawals(userId: string): Promise<number> {
  const result = await prisma.cashbackTransaction.aggregate({
    where: {
      userId,
      status: CashbackStatus.APPROVED,
    },
    _sum: {
      amount: true,
    },
  });

  return Number(result._sum.amount || 0);
}

// Request withdrawal (mark approved cashback as pending payout)
export async function requestWithdrawal(
  userId: string,
  amount: number
): Promise<{ success: boolean; message: string }> {
  const available = await getPendingWithdrawals(userId);

  if (amount > available) {
    return {
      success: false,
      message: "Insufficient approved cashback balance",
    };
  }

  // In a real system, this would create a withdrawal request
  // For now, we just return success
  return {
    success: true,
    message: `Withdrawal request for ${amount} submitted successfully`,
  };
}

// Get cashback leaderboard (for gamification)
export async function getCashbackLeaderboard(
  limit: number = 10
): Promise<{ userId: string; name: string; totalEarned: number }[]> {
  const result = await prisma.cashbackTransaction.groupBy({
    by: ["userId"],
    where: {
      status: { in: [CashbackStatus.APPROVED, CashbackStatus.PAID] },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
    take: limit,
  });

  const userIds = result.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const usersMap = new Map(users.map((u) => [u.id, u]));

  return result.map((r) => ({
    userId: r.userId,
    name: usersMap.get(r.userId)?.name || "Anonymous",
    totalEarned: Number(r._sum.amount || 0),
  }));
}

// Calculate cashback for a purchase
export function calculateCashback(
  purchaseAmount: number,
  affiliateRate: number
): number {
  // Typically, cashback is a percentage of the affiliate commission
  // For example, if affiliate rate is 5% and we give back 50% of that
  const commission = purchaseAmount * (affiliateRate / 100);
  const cashbackPercentage = 0.5; // 50% of commission goes to user
  return Math.round(commission * cashbackPercentage * 100) / 100;
}
