import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productNameAr?: string | null;
  productImage?: string | null;
  productSlug: string;
  brand?: string | null;
  category?: string | null;
  lowestPrice?: number;
  currency?: Currency;
  storeName?: string;
  inStock?: boolean;
  priceChange?: {
    direction: "up" | "down" | "same";
    percentage: number;
  };
  addedAt: Date;
}

export interface WishlistStats {
  totalItems: number;
  inStockItems: number;
  priceDrops: number;
  totalSavings: number;
}

// Get user's wishlist
export async function getWishlist(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ items: WishlistItem[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const [wishlistItems, total] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            storeProducts: {
              where: { store: { isActive: true } },
              orderBy: { price: "asc" },
              take: 1,
              include: {
                store: true,
                priceHistory: {
                  orderBy: { recordedAt: "desc" },
                  take: 2,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.wishlist.count({ where: { userId } }),
  ]);

  const items: WishlistItem[] = wishlistItems.map((item) => {
    const lowestStoreProduct = item.product.storeProducts[0];
    let priceChange: WishlistItem["priceChange"];

    if (lowestStoreProduct?.priceHistory.length >= 2) {
      const currentPrice = Number(lowestStoreProduct.price);
      const previousPrice = Number(lowestStoreProduct.priceHistory[1]?.price);

      if (previousPrice && previousPrice !== currentPrice) {
        const change = currentPrice - previousPrice;
        const percentage = Math.abs(Math.round((change / previousPrice) * 100));
        priceChange = {
          direction: change > 0 ? "up" : change < 0 ? "down" : "same",
          percentage,
        };
      }
    }

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productNameAr: item.product.nameAr,
      productImage: item.product.image,
      productSlug: item.product.slug,
      brand: item.product.brand,
      category: item.product.category,
      lowestPrice: lowestStoreProduct ? Number(lowestStoreProduct.price) : undefined,
      currency: lowestStoreProduct?.currency,
      storeName: lowestStoreProduct?.store.name,
      inStock: lowestStoreProduct?.inStock,
      priceChange,
      addedAt: item.createdAt,
    };
  });

  return { items, total };
}

// Add product to wishlist
export async function addToWishlist(
  userId: string,
  productId: string
): Promise<WishlistItem | null> {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) return null;

  // Use upsert to prevent race conditions (atomic operation)
  const wishlistItem = await prisma.wishlist.upsert({
    where: {
      userId_productId: { userId, productId },
    },
    create: { userId, productId },
    update: {}, // No update needed, just return existing
    include: {
      product: {
        include: {
          storeProducts: {
            where: { store: { isActive: true } },
            orderBy: { price: "asc" },
            take: 1,
            include: { store: true },
          },
        },
      },
    },
  });

  const lowestStoreProduct = wishlistItem.product.storeProducts[0];
  return {
    id: wishlistItem.id,
    productId: wishlistItem.productId,
    productName: wishlistItem.product.name,
    productNameAr: wishlistItem.product.nameAr,
    productImage: wishlistItem.product.image,
    productSlug: wishlistItem.product.slug,
    brand: wishlistItem.product.brand,
    category: wishlistItem.product.category,
    lowestPrice: lowestStoreProduct ? Number(lowestStoreProduct.price) : undefined,
    currency: lowestStoreProduct?.currency,
    storeName: lowestStoreProduct?.store.name,
    inStock: lowestStoreProduct?.inStock,
    addedAt: wishlistItem.createdAt,
  };
}

// Remove from wishlist
export async function removeFromWishlist(
  userId: string,
  productId: string
): Promise<boolean> {
  try {
    // Use deleteMany with compound key to prevent race conditions
    // This is atomic and won't throw if the item doesn't exist
    const result = await prisma.wishlist.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    return result.count > 0;
  } catch {
    return false;
  }
}

// Check if product is in wishlist
export async function isInWishlist(
  userId: string,
  productId: string
): Promise<boolean> {
  const item = await prisma.wishlist.findUnique({
    where: {
      userId_productId: { userId, productId },
    },
  });

  return !!item;
}

// Get wishlist statistics
export async function getWishlistStats(userId: string): Promise<WishlistStats> {
  const wishlistItems = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          storeProducts: {
            where: { store: { isActive: true } },
            orderBy: { price: "asc" },
            take: 1,
            include: {
              priceHistory: {
                orderBy: { recordedAt: "desc" },
                take: 2,
              },
            },
          },
        },
      },
    },
  });

  let inStockItems = 0;
  let priceDrops = 0;
  let totalSavings = 0;

  for (const item of wishlistItems) {
    const lowestStoreProduct = item.product.storeProducts[0];
    if (!lowestStoreProduct) continue;

    if (lowestStoreProduct.inStock) {
      inStockItems++;
    }

    if (lowestStoreProduct.priceHistory.length >= 2) {
      const currentPrice = Number(lowestStoreProduct.price);
      const previousPrice = Number(lowestStoreProduct.priceHistory[1]?.price);

      if (previousPrice && currentPrice < previousPrice) {
        priceDrops++;
        totalSavings += previousPrice - currentPrice;
      }
    }
  }

  return {
    totalItems: wishlistItems.length,
    inStockItems,
    priceDrops,
    totalSavings,
  };
}

// Get wishlist items with price drops
export async function getWishlistPriceDrops(
  userId: string
): Promise<WishlistItem[]> {
  const { items } = await getWishlist(userId, { limit: 100 });

  return items.filter(
    (item) => item.priceChange && item.priceChange.direction === "down"
  );
}

// Bulk add to wishlist
export async function bulkAddToWishlist(
  userId: string,
  productIds: string[]
): Promise<{ added: number; skipped: number }> {
  // First, verify which products exist
  const validProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  const validProductIds = new Set(validProducts.map((p) => p.id));

  // Filter to only valid product IDs
  const productsToAdd = productIds.filter((id) => validProductIds.has(id));

  // Use createMany with skipDuplicates to prevent race conditions
  // This is atomic and efficiently handles duplicates
  const result = await prisma.wishlist.createMany({
    data: productsToAdd.map((productId) => ({ userId, productId })),
    skipDuplicates: true,
  });

  const skipped = productIds.length - result.count;

  return { added: result.count, skipped };
}

// Clear wishlist
export async function clearWishlist(userId: string): Promise<number> {
  const result = await prisma.wishlist.deleteMany({
    where: { userId },
  });

  return result.count;
}
