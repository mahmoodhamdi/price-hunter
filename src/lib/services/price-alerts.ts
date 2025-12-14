import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  targetPrice: number;
  currentPrice?: number;
  currency: Currency;
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: Date | null;
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifyPush: boolean;
  createdAt: Date;
}

export interface CreateAlertInput {
  userId: string;
  productId: string;
  targetPrice: number;
  currency: Currency;
  notifyEmail?: boolean;
  notifyTelegram?: boolean;
  notifyPush?: boolean;
}

// Get user's price alerts
export async function getUserAlerts(
  userId: string,
  options: {
    active?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ alerts: PriceAlert[]; total: number }> {
  const { active, limit = 20, offset = 0 } = options;

  const where = {
    userId,
    ...(active !== undefined && { isActive: active }),
  };

  const [alerts, total] = await Promise.all([
    prisma.priceAlert.findMany({
      where,
      include: {
        product: {
          include: {
            storeProducts: {
              orderBy: { price: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.priceAlert.count({ where }),
  ]);

  return {
    alerts: alerts.map((alert) => {
      const lowestPrice = alert.product.storeProducts[0];
      return {
        id: alert.id,
        productId: alert.productId,
        productName: alert.product.name,
        productImage: alert.product.image,
        targetPrice: Number(alert.targetPrice),
        currentPrice: lowestPrice ? Number(lowestPrice.price) : undefined,
        currency: alert.currency,
        isActive: alert.isActive,
        triggered: alert.triggered,
        triggeredAt: alert.triggeredAt,
        notifyEmail: alert.notifyEmail,
        notifyTelegram: alert.notifyTelegram,
        notifyPush: alert.notifyPush,
        createdAt: alert.createdAt,
      };
    }),
    total,
  };
}

// Create a new price alert
export async function createPriceAlert(
  input: CreateAlertInput
): Promise<PriceAlert> {
  const { userId, productId, targetPrice, currency, notifyEmail = true, notifyTelegram = false, notifyPush = false } = input;

  // Check if alert already exists
  const existing = await prisma.priceAlert.findFirst({
    where: {
      userId,
      productId,
      isActive: true,
    },
  });

  if (existing) {
    // Update existing alert
    const alert = await prisma.priceAlert.update({
      where: { id: existing.id },
      data: {
        targetPrice,
        currency,
        notifyEmail,
        notifyTelegram,
        notifyPush,
        triggered: false,
        triggeredAt: null,
      },
      include: {
        product: {
          include: {
            storeProducts: {
              orderBy: { price: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    const lowestPrice = alert.product.storeProducts[0];
    return {
      id: alert.id,
      productId: alert.productId,
      productName: alert.product.name,
      productImage: alert.product.image,
      targetPrice: Number(alert.targetPrice),
      currentPrice: lowestPrice ? Number(lowestPrice.price) : undefined,
      currency: alert.currency,
      isActive: alert.isActive,
      triggered: alert.triggered,
      triggeredAt: alert.triggeredAt,
      notifyEmail: alert.notifyEmail,
      notifyTelegram: alert.notifyTelegram,
      notifyPush: alert.notifyPush,
      createdAt: alert.createdAt,
    };
  }

  // Create new alert
  const alert = await prisma.priceAlert.create({
    data: {
      userId,
      productId,
      targetPrice,
      currency,
      notifyEmail,
      notifyTelegram,
      notifyPush,
    },
    include: {
      product: {
        include: {
          storeProducts: {
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  const lowestPrice = alert.product.storeProducts[0];
  return {
    id: alert.id,
    productId: alert.productId,
    productName: alert.product.name,
    productImage: alert.product.image,
    targetPrice: Number(alert.targetPrice),
    currentPrice: lowestPrice ? Number(lowestPrice.price) : undefined,
    currency: alert.currency,
    isActive: alert.isActive,
    triggered: alert.triggered,
    triggeredAt: alert.triggeredAt,
    notifyEmail: alert.notifyEmail,
    notifyTelegram: alert.notifyTelegram,
    notifyPush: alert.notifyPush,
    createdAt: alert.createdAt,
  };
}

// Update price alert
export async function updatePriceAlert(
  alertId: string,
  userId: string,
  updates: {
    targetPrice?: number;
    isActive?: boolean;
    notifyEmail?: boolean;
    notifyTelegram?: boolean;
    notifyPush?: boolean;
  }
): Promise<PriceAlert | null> {
  const alert = await prisma.priceAlert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) return null;

  const updated = await prisma.priceAlert.update({
    where: { id: alertId },
    data: updates,
    include: {
      product: {
        include: {
          storeProducts: {
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  const lowestPrice = updated.product.storeProducts[0];
  return {
    id: updated.id,
    productId: updated.productId,
    productName: updated.product.name,
    productImage: updated.product.image,
    targetPrice: Number(updated.targetPrice),
    currentPrice: lowestPrice ? Number(lowestPrice.price) : undefined,
    currency: updated.currency,
    isActive: updated.isActive,
    triggered: updated.triggered,
    triggeredAt: updated.triggeredAt,
    notifyEmail: updated.notifyEmail,
    notifyTelegram: updated.notifyTelegram,
    notifyPush: updated.notifyPush,
    createdAt: updated.createdAt,
  };
}

// Delete price alert
export async function deletePriceAlert(
  alertId: string,
  userId: string
): Promise<boolean> {
  const alert = await prisma.priceAlert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) return false;

  await prisma.priceAlert.delete({
    where: { id: alertId },
  });

  return true;
}

// Check and trigger alerts (called by cron job)
export async function checkAndTriggerAlerts(): Promise<{
  checked: number;
  triggered: number;
}> {
  // Get all active alerts
  const alerts = await prisma.priceAlert.findMany({
    where: {
      isActive: true,
      triggered: false,
    },
    include: {
      product: {
        include: {
          storeProducts: {
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
      user: {
        select: {
          email: true,
          telegramId: true,
        },
      },
    },
  });

  // Collect alerts that need to be triggered
  const alertsToTrigger: typeof alerts = [];

  for (const alert of alerts) {
    const lowestPrice = alert.product.storeProducts[0];
    if (!lowestPrice) continue;

    const currentPrice = Number(lowestPrice.price);
    const targetPrice = Number(alert.targetPrice);

    if (currentPrice <= targetPrice) {
      alertsToTrigger.push(alert);
    }
  }

  if (alertsToTrigger.length === 0) {
    return {
      checked: alerts.length,
      triggered: 0,
    };
  }

  // Batch update all triggered alerts (fixes N+1 query)
  const alertIdsToTrigger = alertsToTrigger.map((a) => a.id);
  await prisma.priceAlert.updateMany({
    where: { id: { in: alertIdsToTrigger } },
    data: {
      triggered: true,
      triggeredAt: new Date(),
    },
  });

  // Send notifications in parallel (in a real app, this would queue jobs)
  const notificationPromises = alertsToTrigger.map(async (alert) => {
    const lowestPrice = alert.product.storeProducts[0];
    const currentPrice = Number(lowestPrice.price);
    const targetPrice = Number(alert.targetPrice);

    const promises: Promise<void>[] = [];

    if (alert.notifyEmail && alert.user.email) {
      promises.push(
        sendPriceAlertEmail({
          email: alert.user.email,
          productName: alert.product.name,
          targetPrice,
          currentPrice,
          currency: alert.currency,
          productImage: alert.product.image,
        })
      );
    }

    if (alert.notifyTelegram && alert.user.telegramId) {
      promises.push(
        sendPriceAlertTelegram({
          telegramId: alert.user.telegramId,
          productName: alert.product.name,
          targetPrice,
          currentPrice,
          currency: alert.currency,
        })
      );
    }

    return Promise.all(promises);
  });

  // Wait for all notifications (but don't fail if some fail)
  await Promise.allSettled(notificationPromises);

  return {
    checked: alerts.length,
    triggered: alertsToTrigger.length,
  };
}

// Helper to send email notification
async function sendPriceAlertEmail(data: {
  email: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  currency: Currency;
  productImage?: string | null;
}): Promise<void> {
  // In a real implementation, this would use the email service
  console.log(`Sending price alert email to ${data.email}:`, {
    product: data.productName,
    target: data.targetPrice,
    current: data.currentPrice,
  });
}

// Helper to send Telegram notification
async function sendPriceAlertTelegram(data: {
  telegramId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  currency: Currency;
}): Promise<void> {
  // In a real implementation, this would use the Telegram bot API
  console.log(`Sending price alert to Telegram ${data.telegramId}:`, {
    product: data.productName,
    target: data.targetPrice,
    current: data.currentPrice,
  });
}

// Get alert statistics for user
export async function getAlertStats(userId: string): Promise<{
  total: number;
  active: number;
  triggered: number;
}> {
  const [total, active, triggered] = await Promise.all([
    prisma.priceAlert.count({ where: { userId } }),
    prisma.priceAlert.count({ where: { userId, isActive: true } }),
    prisma.priceAlert.count({ where: { userId, triggered: true } }),
  ]);

  return { total, active, triggered };
}

// Get products with price below user's alert threshold
export async function getTriggeredAlerts(userId: string): Promise<PriceAlert[]> {
  const alerts = await prisma.priceAlert.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      product: {
        include: {
          storeProducts: {
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  return alerts
    .filter((alert) => {
      const lowestPrice = alert.product.storeProducts[0];
      if (!lowestPrice) return false;
      return Number(lowestPrice.price) <= Number(alert.targetPrice);
    })
    .map((alert) => {
      const lowestPrice = alert.product.storeProducts[0];
      return {
        id: alert.id,
        productId: alert.productId,
        productName: alert.product.name,
        productImage: alert.product.image,
        targetPrice: Number(alert.targetPrice),
        currentPrice: lowestPrice ? Number(lowestPrice.price) : undefined,
        currency: alert.currency,
        isActive: alert.isActive,
        triggered: alert.triggered,
        triggeredAt: alert.triggeredAt,
        notifyEmail: alert.notifyEmail,
        notifyTelegram: alert.notifyTelegram,
        notifyPush: alert.notifyPush,
        createdAt: alert.createdAt,
      };
    });
}
