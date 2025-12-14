import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface RecommendedProduct {
  id: string;
  name: string;
  nameAr?: string | null;
  image?: string | null;
  slug: string;
  brand?: string | null;
  category?: string | null;
  lowestPrice?: number;
  currency?: Currency;
  storeName?: string;
  discount?: number | null;
  score: number;
  reason: string;
}

type RecommendationReason =
  | "similar_category"
  | "same_brand"
  | "price_drop"
  | "trending"
  | "viewed_together"
  | "wishlist_similar"
  | "popular";

// Get personalized recommendations for user
export async function getPersonalizedRecommendations(
  userId: string,
  options: {
    limit?: number;
    excludeIds?: string[];
  } = {}
): Promise<RecommendedProduct[]> {
  const { limit = 10, excludeIds = [] } = options;

  // Get user's search history and wishlist for context
  const [searchHistory, wishlist] = await Promise.all([
    prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { product: true },
    }),
    prisma.wishlist.findMany({
      where: { userId },
      include: { product: true },
    }),
  ]);

  // Extract categories and brands from user's activity
  const userCategories = new Set<string>();
  const userBrands = new Set<string>();

  [...searchHistory, ...wishlist].forEach((item) => {
    if (item.product?.category) userCategories.add(item.product.category);
    if (item.product?.brand) userBrands.add(item.product.brand);
  });

  const recommendations: RecommendedProduct[] = [];
  const seenIds = new Set<string>(excludeIds);

  // Add wishlist product IDs to exclude
  wishlist.forEach((w) => seenIds.add(w.productId));

  // 1. Get products from similar categories
  if (userCategories.size > 0) {
    const categoryProducts = await prisma.product.findMany({
      where: {
        category: { in: Array.from(userCategories) },
        id: { notIn: Array.from(seenIds) },
      },
      include: {
        storeProducts: {
          where: { store: { isActive: true }, inStock: true },
          orderBy: { price: "asc" },
          take: 1,
          include: { store: true },
        },
      },
      take: limit,
    });

    categoryProducts.forEach((product) => {
      if (seenIds.has(product.id)) return;
      seenIds.add(product.id);

      const sp = product.storeProducts[0];
      recommendations.push({
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        image: product.image,
        slug: product.slug,
        brand: product.brand,
        category: product.category,
        lowestPrice: sp ? Number(sp.price) : undefined,
        currency: sp?.currency,
        storeName: sp?.store.name,
        discount: sp?.discount,
        score: 0.8,
        reason: "Based on your interests",
      });
    });
  }

  // 2. Get products from same brands
  if (userBrands.size > 0 && recommendations.length < limit) {
    const brandProducts = await prisma.product.findMany({
      where: {
        brand: { in: Array.from(userBrands) },
        id: { notIn: Array.from(seenIds) },
      },
      include: {
        storeProducts: {
          where: { store: { isActive: true }, inStock: true },
          orderBy: { price: "asc" },
          take: 1,
          include: { store: true },
        },
      },
      take: limit - recommendations.length,
    });

    brandProducts.forEach((product) => {
      if (seenIds.has(product.id)) return;
      seenIds.add(product.id);

      const sp = product.storeProducts[0];
      recommendations.push({
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        image: product.image,
        slug: product.slug,
        brand: product.brand,
        category: product.category,
        lowestPrice: sp ? Number(sp.price) : undefined,
        currency: sp?.currency,
        storeName: sp?.store.name,
        discount: sp?.discount,
        score: 0.7,
        reason: `More from ${product.brand}`,
      });
    });
  }

  // 3. Fill remaining with trending products
  if (recommendations.length < limit) {
    const trendingProducts = await getTrendingRecommendations(
      limit - recommendations.length,
      Array.from(seenIds)
    );
    recommendations.push(...trendingProducts);
  }

  // Sort by score
  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Get trending recommendations
export async function getTrendingRecommendations(
  limit: number = 10,
  excludeIds: string[] = []
): Promise<RecommendedProduct[]> {
  // Get products with most searches in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const trendingSearches = await prisma.searchHistory.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null, notIn: excludeIds },
      createdAt: { gte: sevenDaysAgo },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit,
  });

  const productIds = trendingSearches
    .map((s) => s.productId)
    .filter(Boolean) as string[];

  if (productIds.length === 0) {
    // Fallback to recent products with good deals
    return getPopularRecommendations(limit, excludeIds);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      storeProducts: {
        where: { store: { isActive: true }, inStock: true },
        orderBy: { price: "asc" },
        take: 1,
        include: { store: true },
      },
    },
  });

  const searchCountMap = new Map(
    trendingSearches.map((s) => [s.productId, s._count.productId])
  );

  return products.map((product) => {
    const sp = product.storeProducts[0];
    const searchCount = searchCountMap.get(product.id) || 0;

    return {
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      image: product.image,
      slug: product.slug,
      brand: product.brand,
      category: product.category,
      lowestPrice: sp ? Number(sp.price) : undefined,
      currency: sp?.currency,
      storeName: sp?.store.name,
      discount: sp?.discount,
      score: Math.min(0.9, 0.5 + searchCount * 0.01),
      reason: "Trending now",
    };
  });
}

// Get popular/deals recommendations
export async function getPopularRecommendations(
  limit: number = 10,
  excludeIds: string[] = []
): Promise<RecommendedProduct[]> {
  const products = await prisma.storeProduct.findMany({
    where: {
      store: { isActive: true },
      inStock: true,
      discount: { gte: 10 },
      productId: { notIn: excludeIds },
    },
    include: {
      product: true,
      store: true,
    },
    orderBy: { discount: "desc" },
    take: limit,
  });

  return products.map((sp) => ({
    id: sp.product.id,
    name: sp.product.name,
    nameAr: sp.product.nameAr,
    image: sp.product.image,
    slug: sp.product.slug,
    brand: sp.product.brand,
    category: sp.product.category,
    lowestPrice: Number(sp.price),
    currency: sp.currency,
    storeName: sp.store.name,
    discount: sp.discount,
    score: 0.6 + (sp.discount || 0) * 0.01,
    reason: `${sp.discount}% off`,
  }));
}

// Get similar products
export async function getSimilarProducts(
  productId: string,
  limit: number = 6
): Promise<RecommendedProduct[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) return [];

  const excludeIds = [productId];

  // Find products in same category and/or brand
  const similarProducts = await prisma.product.findMany({
    where: {
      id: { notIn: excludeIds },
      OR: [
        { category: product.category },
        { brand: product.brand },
      ],
    },
    include: {
      storeProducts: {
        where: { store: { isActive: true }, inStock: true },
        orderBy: { price: "asc" },
        take: 1,
        include: { store: true },
      },
    },
    take: limit * 2, // Get more to filter
  });

  return similarProducts
    .map((p) => {
      const sp = p.storeProducts[0];
      let score = 0.5;
      let reason = "You might also like";

      if (p.category === product.category && p.brand === product.brand) {
        score = 0.95;
        reason = "Same brand & category";
      } else if (p.brand === product.brand) {
        score = 0.85;
        reason = `More from ${p.brand}`;
      } else if (p.category === product.category) {
        score = 0.75;
        reason = "Similar products";
      }

      return {
        id: p.id,
        name: p.name,
        nameAr: p.nameAr,
        image: p.image,
        slug: p.slug,
        brand: p.brand,
        category: p.category,
        lowestPrice: sp ? Number(sp.price) : undefined,
        currency: sp?.currency,
        storeName: sp?.store.name,
        discount: sp?.discount,
        score,
        reason,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Get "frequently bought together" recommendations
export async function getFrequentlyBoughtTogether(
  productId: string,
  limit: number = 4
): Promise<RecommendedProduct[]> {
  // In a real implementation, this would use purchase data
  // For now, we use category-based recommendations
  return getSimilarProducts(productId, limit);
}

// Get price drop recommendations
export async function getPriceDropRecommendations(
  limit: number = 10,
  excludeIds: string[] = []
): Promise<RecommendedProduct[]> {
  const products = await prisma.storeProduct.findMany({
    where: {
      store: { isActive: true },
      inStock: true,
      productId: { notIn: excludeIds },
      priceHistory: {
        some: {},
      },
    },
    include: {
      product: true,
      store: true,
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 2,
      },
    },
    take: limit * 3, // Get more to filter price drops
  });

  const priceDropProducts: RecommendedProduct[] = [];

  for (const sp of products) {
    if (sp.priceHistory.length < 2) continue;

    const currentPrice = Number(sp.price);
    const previousPrice = Number(sp.priceHistory[1]?.price);

    if (previousPrice && currentPrice < previousPrice) {
      const dropPercentage = Math.round(
        ((previousPrice - currentPrice) / previousPrice) * 100
      );

      priceDropProducts.push({
        id: sp.product.id,
        name: sp.product.name,
        nameAr: sp.product.nameAr,
        image: sp.product.image,
        slug: sp.product.slug,
        brand: sp.product.brand,
        category: sp.product.category,
        lowestPrice: currentPrice,
        currency: sp.currency,
        storeName: sp.store.name,
        discount: sp.discount,
        score: 0.7 + dropPercentage * 0.01,
        reason: `Price dropped ${dropPercentage}%`,
      });
    }
  }

  return priceDropProducts.sort((a, b) => b.score - a.score).slice(0, limit);
}
