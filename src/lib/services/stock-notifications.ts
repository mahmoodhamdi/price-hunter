import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";
import { sendEmail } from "@/lib/notifications/email";

export interface StockNotification {
  id: string;
  userId: string;
  storeProductId: string;
  productName: string;
  storeName: string;
  productUrl: string;
  image?: string | null;
  currentPrice: number;
  currency: Currency;
  isActive: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  createdAt: Date;
  lastNotifiedAt?: Date | null;
}

export interface StockNotificationCreate {
  userId: string;
  storeProductId: string;
  notifyEmail?: boolean;
  notifyPush?: boolean;
}

export interface StockStatus {
  inStock: boolean;
  lastChecked: Date;
  lastInStock?: Date;
  estimatedRestockDate?: Date;
  stockHistory: {
    inStock: boolean;
    date: Date;
  }[];
}

// Get all stock notifications for a user
export async function getStockNotifications(
  userId: string
): Promise<StockNotification[]> {
  const notifications = await prisma.stockNotification.findMany({
    where: { userId },
    include: {
      storeProduct: {
        include: {
          product: true,
          store: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    storeProductId: n.storeProductId,
    productName: n.storeProduct.product.name,
    storeName: n.storeProduct.store.name,
    productUrl: n.storeProduct.url,
    image: n.storeProduct.product.image,
    currentPrice: Number(n.storeProduct.price),
    currency: n.storeProduct.currency,
    isActive: n.isActive,
    notifyEmail: n.notifyEmail,
    notifyPush: n.notifyPush,
    createdAt: n.createdAt,
    lastNotifiedAt: n.lastNotifiedAt,
  }));
}

// Create a stock notification
export async function createStockNotification(
  data: StockNotificationCreate
): Promise<StockNotification | null> {
  // Check if store product exists and is out of stock
  const storeProduct = await prisma.storeProduct.findUnique({
    where: { id: data.storeProductId },
    include: {
      product: true,
      store: true,
    },
  });

  if (!storeProduct) {
    return null;
  }

  // Check if notification already exists
  const existing = await prisma.stockNotification.findUnique({
    where: {
      userId_storeProductId: {
        userId: data.userId,
        storeProductId: data.storeProductId,
      },
    },
  });

  if (existing) {
    // Update existing notification
    const updated = await prisma.stockNotification.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        notifyEmail: data.notifyEmail ?? true,
        notifyPush: data.notifyPush ?? false,
      },
      include: {
        storeProduct: {
          include: {
            product: true,
            store: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      storeProductId: updated.storeProductId,
      productName: updated.storeProduct.product.name,
      storeName: updated.storeProduct.store.name,
      productUrl: updated.storeProduct.url,
      image: updated.storeProduct.product.image,
      currentPrice: Number(updated.storeProduct.price),
      currency: updated.storeProduct.currency,
      isActive: updated.isActive,
      notifyEmail: updated.notifyEmail,
      notifyPush: updated.notifyPush,
      createdAt: updated.createdAt,
      lastNotifiedAt: updated.lastNotifiedAt,
    };
  }

  // Create new notification
  const notification = await prisma.stockNotification.create({
    data: {
      userId: data.userId,
      storeProductId: data.storeProductId,
      notifyEmail: data.notifyEmail ?? true,
      notifyPush: data.notifyPush ?? false,
    },
    include: {
      storeProduct: {
        include: {
          product: true,
          store: true,
        },
      },
    },
  });

  return {
    id: notification.id,
    userId: notification.userId,
    storeProductId: notification.storeProductId,
    productName: notification.storeProduct.product.name,
    storeName: notification.storeProduct.store.name,
    productUrl: notification.storeProduct.url,
    image: notification.storeProduct.product.image,
    currentPrice: Number(notification.storeProduct.price),
    currency: notification.storeProduct.currency,
    isActive: notification.isActive,
    notifyEmail: notification.notifyEmail,
    notifyPush: notification.notifyPush,
    createdAt: notification.createdAt,
    lastNotifiedAt: notification.lastNotifiedAt,
  };
}

// Delete a stock notification
export async function deleteStockNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const notification = await prisma.stockNotification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return false;
  }

  await prisma.stockNotification.delete({
    where: { id: notificationId },
  });

  return true;
}

// Toggle stock notification active status
export async function toggleStockNotification(
  userId: string,
  notificationId: string
): Promise<StockNotification | null> {
  const notification = await prisma.stockNotification.findFirst({
    where: { id: notificationId, userId },
    include: {
      storeProduct: {
        include: {
          product: true,
          store: true,
        },
      },
    },
  });

  if (!notification) {
    return null;
  }

  const updated = await prisma.stockNotification.update({
    where: { id: notificationId },
    data: { isActive: !notification.isActive },
    include: {
      storeProduct: {
        include: {
          product: true,
          store: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    storeProductId: updated.storeProductId,
    productName: updated.storeProduct.product.name,
    storeName: updated.storeProduct.store.name,
    productUrl: updated.storeProduct.url,
    image: updated.storeProduct.product.image,
    currentPrice: Number(updated.storeProduct.price),
    currency: updated.storeProduct.currency,
    isActive: updated.isActive,
    notifyEmail: updated.notifyEmail,
    notifyPush: updated.notifyPush,
    createdAt: updated.createdAt,
    lastNotifiedAt: updated.lastNotifiedAt,
  };
}

// Check stock status for a store product
export async function getStockStatus(
  storeProductId: string
): Promise<StockStatus | null> {
  const storeProduct = await prisma.storeProduct.findUnique({
    where: { id: storeProductId },
    include: {
      stockHistory: {
        orderBy: { checkedAt: "desc" },
        take: 30, // Last 30 checks
      },
    },
  });

  if (!storeProduct) {
    return null;
  }

  const history = storeProduct.stockHistory || [];
  const lastInStockEntry = history.find((h) => h.inStock);

  // Try to estimate restock date based on history patterns
  let estimatedRestockDate: Date | undefined;
  if (!storeProduct.inStock && history.length >= 10) {
    const outOfStockPeriods = analyzeOutOfStockPeriods(history);
    if (outOfStockPeriods.averageDays > 0) {
      const daysSinceOutOfStock = history[0]
        ? Math.floor(
            (Date.now() - history[0].checkedAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
      const daysUntilRestock = Math.max(
        1,
        outOfStockPeriods.averageDays - daysSinceOutOfStock
      );
      estimatedRestockDate = new Date(
        Date.now() + daysUntilRestock * 24 * 60 * 60 * 1000
      );
    }
  }

  return {
    inStock: storeProduct.inStock,
    lastChecked: storeProduct.lastScraped,
    lastInStock: lastInStockEntry?.checkedAt,
    estimatedRestockDate,
    stockHistory: history.map((h) => ({
      inStock: h.inStock,
      date: h.checkedAt,
    })),
  };
}

// Helper function to analyze out of stock periods
function analyzeOutOfStockPeriods(
  history: { inStock: boolean; checkedAt: Date }[]
): { averageDays: number; count: number } {
  const periods: number[] = [];
  let outOfStockStart: Date | null = null;

  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].inStock && outOfStockStart === null) {
      outOfStockStart = history[i].checkedAt;
    } else if (history[i].inStock && outOfStockStart !== null) {
      const days = Math.floor(
        (history[i].checkedAt.getTime() - outOfStockStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (days > 0) {
        periods.push(days);
      }
      outOfStockStart = null;
    }
  }

  if (periods.length === 0) {
    return { averageDays: 0, count: 0 };
  }

  const averageDays =
    periods.reduce((sum, days) => sum + days, 0) / periods.length;
  return { averageDays: Math.round(averageDays), count: periods.length };
}

// Process all stock notifications (called by cron job)
export async function processStockNotifications(): Promise<{
  processed: number;
  notified: number;
}> {
  // Find all products that are now in stock that have active notifications
  const notifications = await prisma.stockNotification.findMany({
    where: {
      isActive: true,
      storeProduct: {
        inStock: true,
      },
    },
    include: {
      user: true,
      storeProduct: {
        include: {
          product: true,
          store: true,
        },
      },
    },
  });

  let notified = 0;

  for (const notification of notifications) {
    try {
      // Send email notification
      if (notification.notifyEmail && notification.user.email) {
        await sendStockNotificationEmail(notification);
        notified++;
      }

      // Update last notified timestamp and deactivate
      await prisma.stockNotification.update({
        where: { id: notification.id },
        data: {
          lastNotifiedAt: new Date(),
          isActive: false, // Deactivate after notifying
        },
      });
    } catch (error) {
      console.error(`Error processing stock notification ${notification.id}:`, error);
    }
  }

  return { processed: notifications.length, notified };
}

// Send stock notification email
async function sendStockNotificationEmail(notification: {
  user: { email: string; name: string | null };
  storeProduct: {
    url: string;
    price: number | any;
    currency: Currency;
    product: { name: string; image: string | null };
    store: { name: string };
  };
}): Promise<void> {
  const { user, storeProduct } = notification;

  await sendEmail({
    to: user.email,
    subject: `🎉 ${storeProduct.product.name} is back in stock!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22c55e;">Good news! Your item is back in stock!</h1>

        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          ${storeProduct.product.image ? `<img src="${storeProduct.product.image}" alt="${storeProduct.product.name}" style="max-width: 200px; margin-bottom: 16px;">` : ""}

          <h2 style="margin: 0 0 8px 0;">${storeProduct.product.name}</h2>
          <p style="color: #6b7280; margin: 0 0 8px 0;">Available at ${storeProduct.store.name}</p>
          <p style="font-size: 24px; font-weight: bold; color: #22c55e; margin: 0;">
            ${Number(storeProduct.price).toFixed(2)} ${storeProduct.currency}
          </p>
        </div>

        <a href="${storeProduct.url}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Buy Now
        </a>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          You received this email because you signed up for stock notifications on Price Hunter.
        </p>
      </div>
    `,
  });
}

// Get out of stock products from user's wishlist
export async function getOutOfStockWishlistItems(
  userId: string
): Promise<
  {
    productId: string;
    productName: string;
    storeProductId: string;
    storeName: string;
    lastPrice: number;
    currency: Currency;
    hasNotification: boolean;
  }[]
> {
  const wishlistItems = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          storeProducts: {
            where: { inStock: false },
            include: {
              store: true,
            },
          },
        },
      },
    },
  });

  const outOfStockItems: {
    productId: string;
    productName: string;
    storeProductId: string;
    storeName: string;
    lastPrice: number;
    currency: Currency;
    hasNotification: boolean;
  }[] = [];

  for (const item of wishlistItems) {
    for (const sp of item.product.storeProducts) {
      // Check if user already has a notification for this
      const existingNotification = await prisma.stockNotification.findUnique({
        where: {
          userId_storeProductId: {
            userId,
            storeProductId: sp.id,
          },
        },
      });

      outOfStockItems.push({
        productId: item.productId,
        productName: item.product.name,
        storeProductId: sp.id,
        storeName: sp.store.name,
        lastPrice: Number(sp.price),
        currency: sp.currency,
        hasNotification: !!existingNotification,
      });
    }
  }

  return outOfStockItems;
}

// Get stock notification statistics for a user
export async function getStockNotificationStats(userId: string): Promise<{
  totalNotifications: number;
  activeNotifications: number;
  notificationsTriggered: number;
}> {
  const [total, active, triggered] = await Promise.all([
    prisma.stockNotification.count({ where: { userId } }),
    prisma.stockNotification.count({ where: { userId, isActive: true } }),
    prisma.stockNotification.count({
      where: { userId, lastNotifiedAt: { not: null } },
    }),
  ]);

  return {
    totalNotifications: total,
    activeNotifications: active,
    notificationsTriggered: triggered,
  };
}

// Record stock check (called during scraping)
export async function recordStockCheck(
  storeProductId: string,
  inStock: boolean
): Promise<void> {
  await prisma.stockHistory.create({
    data: {
      storeProductId,
      inStock,
    },
  });

  // Update the store product's stock status
  await prisma.storeProduct.update({
    where: { id: storeProductId },
    data: {
      inStock,
      lastScraped: new Date(),
    },
  });
}

// Get products that were recently restocked
export async function getRecentlyRestockedProducts(
  limit = 10
): Promise<
  {
    productName: string;
    storeName: string;
    price: number;
    currency: Currency;
    url: string;
    restockedAt: Date;
  }[]
> {
  // Find stock history entries where product went from out of stock to in stock
  const recentRestocks = await prisma.stockHistory.findMany({
    where: {
      inStock: true,
      checkedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    include: {
      storeProduct: {
        include: {
          product: true,
          store: true,
        },
      },
    },
    orderBy: { checkedAt: "desc" },
    take: limit * 2, // Get more to filter duplicates
  });

  // Filter to only include transitions from out of stock to in stock
  const seen = new Set<string>();
  const result: {
    productName: string;
    storeName: string;
    price: number;
    currency: Currency;
    url: string;
    restockedAt: Date;
  }[] = [];

  for (const restock of recentRestocks) {
    if (seen.has(restock.storeProductId)) continue;

    // Check if previous state was out of stock
    const previousCheck = await prisma.stockHistory.findFirst({
      where: {
        storeProductId: restock.storeProductId,
        checkedAt: { lt: restock.checkedAt },
      },
      orderBy: { checkedAt: "desc" },
    });

    if (previousCheck && !previousCheck.inStock) {
      seen.add(restock.storeProductId);
      result.push({
        productName: restock.storeProduct.product.name,
        storeName: restock.storeProduct.store.name,
        price: Number(restock.storeProduct.price),
        currency: restock.storeProduct.currency,
        url: restock.storeProduct.url,
        restockedAt: restock.checkedAt,
      });

      if (result.length >= limit) break;
    }
  }

  return result;
}
