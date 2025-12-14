import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface Deal {
  id: string;
  productId: string;
  productName: string;
  productNameAr?: string | null;
  productImage?: string | null;
  productSlug: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  discountPercentage: number;
  currency: Currency;
  url: string;
  inStock: boolean;
  dealType: DealType;
  expiresAt?: Date | null;
  rating?: number | null;
  reviewCount?: number | null;
  createdAt: Date;
}

export type DealType =
  | "flash_sale"
  | "clearance"
  | "coupon"
  | "price_drop"
  | "new_low"
  | "daily_deal"
  | "bundle";

export interface DealFilter {
  type?: DealType | DealType[];
  storeIds?: string[];
  category?: string;
  minDiscount?: number;
  maxPrice?: number;
  currency?: Currency;
  inStockOnly?: boolean;
}

export interface DealSummary {
  totalDeals: number;
  byType: Record<DealType, number>;
  byStore: { storeId: string; storeName: string; count: number }[];
  topCategories: { category: string; count: number }[];
  averageDiscount: number;
  maxDiscount: number;
}

export interface DealAlert {
  id: string;
  userId: string;
  minDiscount: number;
  categories: string[];
  storeIds: string[];
  notifyEmail: boolean;
  notifyPush: boolean;
  isActive: boolean;
}

// Get active deals with filtering
export async function getDeals(
  filter: DealFilter = {},
  limit = 50,
  offset = 0
): Promise<Deal[]> {
  const where: any = {
    inStock: filter.inStockOnly ? true : undefined,
    discount: filter.minDiscount ? { gte: filter.minDiscount } : { gt: 0 },
    price: filter.maxPrice ? { lte: filter.maxPrice } : undefined,
    currency: filter.currency || undefined,
    storeId: filter.storeIds?.length ? { in: filter.storeIds } : undefined,
  };

  // Remove undefined values
  Object.keys(where).forEach((key) => {
    if (where[key] === undefined) delete where[key];
  });

  const storeProducts = await prisma.storeProduct.findMany({
    where,
    include: {
      product: true,
      store: true,
    },
    orderBy: [{ discount: "desc" }, { updatedAt: "desc" }],
    take: limit,
    skip: offset,
  });

  return storeProducts.map((sp) => {
    const originalPrice = sp.originalPrice
      ? Number(sp.originalPrice)
      : Number(sp.price) / (1 - (sp.discount || 0) / 100);

    return {
      id: sp.id,
      productId: sp.productId,
      productName: sp.product.name,
      productNameAr: sp.product.nameAr,
      productImage: sp.product.image,
      productSlug: sp.product.slug,
      storeId: sp.storeId,
      storeName: sp.store.name,
      storeSlug: sp.store.slug,
      originalPrice: Math.round(originalPrice * 100) / 100,
      currentPrice: Number(sp.price),
      discount: sp.discount || 0,
      discountPercentage: sp.discount || 0,
      currency: sp.currency,
      url: sp.url,
      inStock: sp.inStock,
      dealType: categorizeDeal(sp.discount || 0, sp.originalPrice),
      expiresAt: null, // Would be set for flash sales
      rating: sp.rating ? Number(sp.rating) : null,
      reviewCount: sp.reviewCount,
      createdAt: sp.updatedAt,
    };
  });
}

// Categorize deal based on discount and other factors
function categorizeDeal(
  discount: number,
  originalPrice: any
): DealType {
  if (discount >= 50) return "clearance";
  if (discount >= 30) return "flash_sale";
  if (discount >= 15) return "price_drop";
  return "daily_deal";
}

// Get flash sales (time-limited high discount deals)
export async function getFlashSales(limit = 20): Promise<Deal[]> {
  return getDeals({ minDiscount: 30, inStockOnly: true }, limit);
}

// Get clearance deals (very high discounts)
export async function getClearanceDeals(limit = 20): Promise<Deal[]> {
  return getDeals({ minDiscount: 50, inStockOnly: true }, limit);
}

// Get new price drops (recently reduced prices)
export async function getPriceDrops(
  hours = 24,
  minDropPercentage = 10,
  limit = 50
): Promise<Deal[]> {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  const recentPriceHistory = await prisma.priceHistory.findMany({
    where: {
      recordedAt: { gte: cutoffDate },
    },
    include: {
      storeProduct: {
        include: {
          product: true,
          store: true,
        },
      },
    },
    orderBy: { recordedAt: "desc" },
    take: limit * 2,
  });

  const dealMap = new Map<string, Deal>();

  for (const history of recentPriceHistory) {
    const sp = history.storeProduct;
    if (!sp || dealMap.has(sp.id)) continue;

    const previousPrice = Number(history.price);
    const currentPrice = Number(sp.price);

    if (currentPrice >= previousPrice) continue;

    const dropPercentage = Math.round(
      ((previousPrice - currentPrice) / previousPrice) * 100
    );

    if (dropPercentage < minDropPercentage) continue;

    dealMap.set(sp.id, {
      id: sp.id,
      productId: sp.productId,
      productName: sp.product.name,
      productNameAr: sp.product.nameAr,
      productImage: sp.product.image,
      productSlug: sp.product.slug,
      storeId: sp.storeId,
      storeName: sp.store.name,
      storeSlug: sp.store.slug,
      originalPrice: previousPrice,
      currentPrice,
      discount: dropPercentage,
      discountPercentage: dropPercentage,
      currency: sp.currency,
      url: sp.url,
      inStock: sp.inStock,
      dealType: "price_drop",
      expiresAt: null,
      rating: sp.rating ? Number(sp.rating) : null,
      reviewCount: sp.reviewCount,
      createdAt: history.recordedAt,
    });
  }

  return Array.from(dealMap.values())
    .sort((a, b) => b.discountPercentage - a.discountPercentage)
    .slice(0, limit);
}

// Get deals by store
export async function getDealsByStore(
  storeId: string,
  limit = 50
): Promise<Deal[]> {
  return getDeals({ storeIds: [storeId], inStockOnly: true }, limit);
}

// Get deals by category
export async function getDealsByCategory(
  category: string,
  limit = 50
): Promise<Deal[]> {
  const products = await prisma.product.findMany({
    where: {
      category: { contains: category, mode: "insensitive" },
    },
    include: {
      storeProducts: {
        where: {
          discount: { gt: 0 },
          inStock: true,
        },
        include: { store: true },
        orderBy: { discount: "desc" },
      },
    },
    take: limit,
  });

  const deals: Deal[] = [];

  for (const product of products) {
    for (const sp of product.storeProducts) {
      const originalPrice = sp.originalPrice
        ? Number(sp.originalPrice)
        : Number(sp.price) / (1 - (sp.discount || 0) / 100);

      deals.push({
        id: sp.id,
        productId: product.id,
        productName: product.name,
        productNameAr: product.nameAr,
        productImage: product.image,
        productSlug: product.slug,
        storeId: sp.storeId,
        storeName: sp.store.name,
        storeSlug: sp.store.slug,
        originalPrice: Math.round(originalPrice * 100) / 100,
        currentPrice: Number(sp.price),
        discount: sp.discount || 0,
        discountPercentage: sp.discount || 0,
        currency: sp.currency,
        url: sp.url,
        inStock: sp.inStock,
        dealType: categorizeDeal(sp.discount || 0, sp.originalPrice),
        expiresAt: null,
        rating: sp.rating ? Number(sp.rating) : null,
        reviewCount: sp.reviewCount,
        createdAt: sp.updatedAt,
      });
    }
  }

  return deals.sort((a, b) => b.discountPercentage - a.discountPercentage);
}

// Get deal summary statistics
export async function getDealSummary(): Promise<DealSummary> {
  const deals = await getDeals({}, 1000);

  const byType: Record<DealType, number> = {
    flash_sale: 0,
    clearance: 0,
    coupon: 0,
    price_drop: 0,
    new_low: 0,
    daily_deal: 0,
    bundle: 0,
  };

  const storeMap = new Map<string, { name: string; count: number }>();
  const categoryMap = new Map<string, number>();
  let totalDiscount = 0;
  let maxDiscount = 0;

  for (const deal of deals) {
    byType[deal.dealType]++;

    if (!storeMap.has(deal.storeId)) {
      storeMap.set(deal.storeId, { name: deal.storeName, count: 0 });
    }
    storeMap.get(deal.storeId)!.count++;

    totalDiscount += deal.discountPercentage;
    maxDiscount = Math.max(maxDiscount, deal.discountPercentage);
  }

  // Get categories from products
  const products = await prisma.product.findMany({
    where: {
      storeProducts: {
        some: { discount: { gt: 0 } },
      },
    },
    select: { category: true },
  });

  for (const p of products) {
    if (p.category) {
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
    }
  }

  return {
    totalDeals: deals.length,
    byType,
    byStore: Array.from(storeMap.entries())
      .map(([storeId, data]) => ({
        storeId,
        storeName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count),
    topCategories: Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    averageDiscount: deals.length
      ? Math.round(totalDiscount / deals.length)
      : 0,
    maxDiscount,
  };
}

// Get best deals (highest savings in absolute value)
export async function getBestDeals(
  currency: Currency = Currency.SAR,
  limit = 20
): Promise<Deal[]> {
  const deals = await getDeals({ currency, inStockOnly: true }, 200);

  // Sort by absolute savings (originalPrice - currentPrice)
  return deals
    .sort(
      (a, b) =>
        b.originalPrice - b.currentPrice - (a.originalPrice - a.currentPrice)
    )
    .slice(0, limit);
}

// Get deals with coupons available
export async function getDealsWithCoupons(limit = 50): Promise<Deal[]> {
  const storesWithCoupons = await prisma.store.findMany({
    where: {
      coupons: {
        some: {
          isActive: true,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
      },
    },
    select: { id: true },
  });

  const storeIds = storesWithCoupons.map((s) => s.id);

  if (storeIds.length === 0) return [];

  return getDeals({ storeIds, inStockOnly: true }, limit);
}

// Compare deal across stores for same product
export async function compareDealAcrossStores(
  productId: string
): Promise<Deal[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      storeProducts: {
        include: { store: true },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product) return [];

  return product.storeProducts.map((sp) => {
    const originalPrice = sp.originalPrice
      ? Number(sp.originalPrice)
      : Number(sp.price);
    const discount = sp.discount || 0;

    return {
      id: sp.id,
      productId: product.id,
      productName: product.name,
      productNameAr: product.nameAr,
      productImage: product.image,
      productSlug: product.slug,
      storeId: sp.storeId,
      storeName: sp.store.name,
      storeSlug: sp.store.slug,
      originalPrice,
      currentPrice: Number(sp.price),
      discount,
      discountPercentage: discount,
      currency: sp.currency,
      url: sp.url,
      inStock: sp.inStock,
      dealType: categorizeDeal(discount, sp.originalPrice),
      expiresAt: null,
      rating: sp.rating ? Number(sp.rating) : null,
      reviewCount: sp.reviewCount,
      createdAt: sp.updatedAt,
    };
  });
}

// Get new lowest prices (products at all-time low)
export async function getNewLowestPrices(limit = 30): Promise<Deal[]> {
  // Get products with price history
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      inStock: true,
    },
    include: {
      product: true,
      store: true,
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 30,
      },
    },
    take: 500,
  });

  const newLows: Deal[] = [];

  for (const sp of storeProducts) {
    if (sp.priceHistory.length < 2) continue;

    const currentPrice = Number(sp.price);
    const historicalPrices = sp.priceHistory.map((h) => Number(h.price));
    const minHistoricalPrice = Math.min(...historicalPrices);

    // Current price is lower than all historical prices
    if (currentPrice < minHistoricalPrice) {
      const maxPrice = Math.max(...historicalPrices);
      const discount = Math.round(((maxPrice - currentPrice) / maxPrice) * 100);

      newLows.push({
        id: sp.id,
        productId: sp.productId,
        productName: sp.product.name,
        productNameAr: sp.product.nameAr,
        productImage: sp.product.image,
        productSlug: sp.product.slug,
        storeId: sp.storeId,
        storeName: sp.store.name,
        storeSlug: sp.store.slug,
        originalPrice: maxPrice,
        currentPrice,
        discount,
        discountPercentage: discount,
        currency: sp.currency,
        url: sp.url,
        inStock: sp.inStock,
        dealType: "new_low",
        expiresAt: null,
        rating: sp.rating ? Number(sp.rating) : null,
        reviewCount: sp.reviewCount,
        createdAt: sp.updatedAt,
      });
    }
  }

  return newLows
    .sort((a, b) => b.discountPercentage - a.discountPercentage)
    .slice(0, limit);
}

// Search deals
export async function searchDeals(
  query: string,
  filter: DealFilter = {},
  limit = 50
): Promise<Deal[]> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { nameAr: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      storeProducts: {
        where: {
          discount: filter.minDiscount ? { gte: filter.minDiscount } : { gt: 0 },
          inStock: filter.inStockOnly ? true : undefined,
          storeId: filter.storeIds?.length
            ? { in: filter.storeIds }
            : undefined,
        },
        include: { store: true },
        orderBy: { discount: "desc" },
      },
    },
    take: limit,
  });

  const deals: Deal[] = [];

  for (const product of products) {
    for (const sp of product.storeProducts) {
      const originalPrice = sp.originalPrice
        ? Number(sp.originalPrice)
        : Number(sp.price) / (1 - (sp.discount || 0) / 100);

      deals.push({
        id: sp.id,
        productId: product.id,
        productName: product.name,
        productNameAr: product.nameAr,
        productImage: product.image,
        productSlug: product.slug,
        storeId: sp.storeId,
        storeName: sp.store.name,
        storeSlug: sp.store.slug,
        originalPrice: Math.round(originalPrice * 100) / 100,
        currentPrice: Number(sp.price),
        discount: sp.discount || 0,
        discountPercentage: sp.discount || 0,
        currency: sp.currency,
        url: sp.url,
        inStock: sp.inStock,
        dealType: categorizeDeal(sp.discount || 0, sp.originalPrice),
        expiresAt: null,
        rating: sp.rating ? Number(sp.rating) : null,
        reviewCount: sp.reviewCount,
        createdAt: sp.updatedAt,
      });
    }
  }

  return deals.sort((a, b) => b.discountPercentage - a.discountPercentage);
}

// Get personalized deals based on user's wishlist and history
export async function getPersonalizedDeals(
  userId: string,
  limit = 30
): Promise<Deal[]> {
  // Get user's wishlist and search history for preferences
  const [wishlist, searchHistory] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId },
      include: { product: true },
    }),
    prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Extract categories and brands from user preferences
  const categories = new Set<string>();
  const brands = new Set<string>();

  for (const w of wishlist) {
    if (w.product.category) categories.add(w.product.category);
    if (w.product.brand) brands.add(w.product.brand);
  }

  // Get deals matching user preferences
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { category: { in: Array.from(categories) } },
        { brand: { in: Array.from(brands) } },
      ],
    },
    include: {
      storeProducts: {
        where: {
          discount: { gt: 0 },
          inStock: true,
        },
        include: { store: true },
        orderBy: { discount: "desc" },
      },
    },
    take: limit * 2,
  });

  const deals: Deal[] = [];

  for (const product of products) {
    for (const sp of product.storeProducts) {
      const originalPrice = sp.originalPrice
        ? Number(sp.originalPrice)
        : Number(sp.price) / (1 - (sp.discount || 0) / 100);

      deals.push({
        id: sp.id,
        productId: product.id,
        productName: product.name,
        productNameAr: product.nameAr,
        productImage: product.image,
        productSlug: product.slug,
        storeId: sp.storeId,
        storeName: sp.store.name,
        storeSlug: sp.store.slug,
        originalPrice: Math.round(originalPrice * 100) / 100,
        currentPrice: Number(sp.price),
        discount: sp.discount || 0,
        discountPercentage: sp.discount || 0,
        currency: sp.currency,
        url: sp.url,
        inStock: sp.inStock,
        dealType: categorizeDeal(sp.discount || 0, sp.originalPrice),
        expiresAt: null,
        rating: sp.rating ? Number(sp.rating) : null,
        reviewCount: sp.reviewCount,
        createdAt: sp.updatedAt,
      });
    }
  }

  return deals
    .sort((a, b) => b.discountPercentage - a.discountPercentage)
    .slice(0, limit);
}

// Get trending deals (most viewed/clicked)
export async function getTrendingDeals(
  hours = 24,
  limit = 20
): Promise<Deal[]> {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Get most clicked products from affiliate clicks
  const clicks = await prisma.affiliateClick.groupBy({
    by: ["productId"],
    where: {
      createdAt: { gte: cutoffDate },
      productId: { not: null },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit,
  });

  const productIds = clicks
    .map((c) => c.productId)
    .filter((id): id is string => id !== null);

  if (productIds.length === 0) {
    return getDeals({ inStockOnly: true }, limit);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      storeProducts: {
        where: { inStock: true },
        include: { store: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
  });

  const deals: Deal[] = [];

  for (const product of products) {
    const sp = product.storeProducts[0];
    if (!sp) continue;

    const originalPrice = sp.originalPrice
      ? Number(sp.originalPrice)
      : Number(sp.price);
    const discount = sp.discount || 0;

    deals.push({
      id: sp.id,
      productId: product.id,
      productName: product.name,
      productNameAr: product.nameAr,
      productImage: product.image,
      productSlug: product.slug,
      storeId: sp.storeId,
      storeName: sp.store.name,
      storeSlug: sp.store.slug,
      originalPrice,
      currentPrice: Number(sp.price),
      discount,
      discountPercentage: discount,
      currency: sp.currency,
      url: sp.url,
      inStock: sp.inStock,
      dealType: categorizeDeal(discount, sp.originalPrice),
      expiresAt: null,
      rating: sp.rating ? Number(sp.rating) : null,
      reviewCount: sp.reviewCount,
      createdAt: sp.updatedAt,
    });
  }

  return deals;
}
