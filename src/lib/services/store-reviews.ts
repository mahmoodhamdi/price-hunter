import { prisma } from "@/lib/prisma";
import { sanitizeText, sanitizeTextArray } from "@/lib/security";

export interface StoreReview {
  id: string;
  userId: string;
  userName: string | null;
  storeId: string;
  storeName: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  deliveryRating?: number;
  priceRating?: number;
  serviceRating?: number;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreReviewCreate {
  userId: string;
  storeId: string;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  deliveryRating?: number;
  priceRating?: number;
  serviceRating?: number;
}

export interface StoreReviewStats {
  storeId: string;
  storeName: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number; percentage: number }[];
  averageDeliveryRating?: number;
  averagePriceRating?: number;
  averageServiceRating?: number;
  recommendationRate: number;
}

// Get reviews for a store
export async function getStoreReviews(
  storeId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: "recent" | "helpful" | "rating_high" | "rating_low";
    minRating?: number;
  } = {}
): Promise<{ reviews: StoreReview[]; total: number }> {
  const { limit = 10, offset = 0, sortBy = "recent", minRating } = options;

  const where: any = { storeId };
  if (minRating) {
    where.rating = { gte: minRating };
  }

  const orderBy: any = {};
  switch (sortBy) {
    case "helpful":
      orderBy.helpfulCount = "desc";
      break;
    case "rating_high":
      orderBy.rating = "desc";
      break;
    case "rating_low":
      orderBy.rating = "asc";
      break;
    default:
      orderBy.createdAt = "desc";
  }

  const [reviews, total] = await Promise.all([
    prisma.storeReview.findMany({
      where,
      include: {
        user: { select: { name: true } },
        store: { select: { name: true } },
      },
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.storeReview.count({ where }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      storeId: r.storeId,
      storeName: r.store.name,
      rating: r.rating,
      title: r.title,
      content: r.content,
      pros: r.pros as string[],
      cons: r.cons as string[],
      deliveryRating: r.deliveryRating || undefined,
      priceRating: r.priceRating || undefined,
      serviceRating: r.serviceRating || undefined,
      verifiedPurchase: r.verifiedPurchase,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total,
  };
}

// Create a new store review
export async function createStoreReview(
  data: StoreReviewCreate
): Promise<StoreReview | null> {
  // SECURITY: Sanitize user input to prevent XSS
  const sanitizedTitle = sanitizeText(data.title);
  const sanitizedContent = sanitizeText(data.content);
  const sanitizedPros = data.pros ? sanitizeTextArray(data.pros) : [];
  const sanitizedCons = data.cons ? sanitizeTextArray(data.cons) : [];

  // Validate rating bounds
  const rating = Math.min(5, Math.max(1, Math.round(data.rating)));
  const deliveryRating = data.deliveryRating
    ? Math.min(5, Math.max(1, Math.round(data.deliveryRating)))
    : undefined;
  const priceRating = data.priceRating
    ? Math.min(5, Math.max(1, Math.round(data.priceRating)))
    : undefined;
  const serviceRating = data.serviceRating
    ? Math.min(5, Math.max(1, Math.round(data.serviceRating)))
    : undefined;

  // Check if store exists
  const store = await prisma.store.findUnique({
    where: { id: data.storeId },
  });

  if (!store) {
    return null;
  }

  // Check if user already reviewed this store
  const existing = await prisma.storeReview.findUnique({
    where: {
      userId_storeId: {
        userId: data.userId,
        storeId: data.storeId,
      },
    },
  });

  if (existing) {
    // Update existing review
    const updated = await prisma.storeReview.update({
      where: { id: existing.id },
      data: {
        rating,
        title: sanitizedTitle,
        content: sanitizedContent,
        pros: sanitizedPros,
        cons: sanitizedCons,
        deliveryRating,
        priceRating,
        serviceRating,
      },
      include: {
        user: { select: { name: true } },
        store: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user.name,
      storeId: updated.storeId,
      storeName: updated.store.name,
      rating: updated.rating,
      title: updated.title,
      content: updated.content,
      pros: updated.pros as string[],
      cons: updated.cons as string[],
      deliveryRating: updated.deliveryRating || undefined,
      priceRating: updated.priceRating || undefined,
      serviceRating: updated.serviceRating || undefined,
      verifiedPurchase: updated.verifiedPurchase,
      helpfulCount: updated.helpfulCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // Check if user has made a purchase from this store (for verified badge)
  const verifiedPurchase = await checkVerifiedPurchase(data.userId, data.storeId);

  const review = await prisma.storeReview.create({
    data: {
      userId: data.userId,
      storeId: data.storeId,
      rating,
      title: sanitizedTitle,
      content: sanitizedContent,
      pros: sanitizedPros,
      cons: sanitizedCons,
      deliveryRating,
      priceRating,
      serviceRating,
      verifiedPurchase,
    },
    include: {
      user: { select: { name: true } },
      store: { select: { name: true } },
    },
  });

  return {
    id: review.id,
    userId: review.userId,
    userName: review.user.name,
    storeId: review.storeId,
    storeName: review.store.name,
    rating: review.rating,
    title: review.title,
    content: review.content,
    pros: review.pros as string[],
    cons: review.cons as string[],
    deliveryRating: review.deliveryRating || undefined,
    priceRating: review.priceRating || undefined,
    serviceRating: review.serviceRating || undefined,
    verifiedPurchase: review.verifiedPurchase,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

// Check if user has made a verified purchase
async function checkVerifiedPurchase(
  userId: string,
  storeId: string
): Promise<boolean> {
  // Check affiliate clicks that were converted
  const convertedClick = await prisma.affiliateClick.findFirst({
    where: {
      userId,
      storeId,
      converted: true,
    },
  });

  return !!convertedClick;
}

// Delete a store review
export async function deleteStoreReview(
  userId: string,
  reviewId: string
): Promise<boolean> {
  const review = await prisma.storeReview.findFirst({
    where: { id: reviewId, userId },
  });

  if (!review) {
    return false;
  }

  await prisma.storeReview.delete({
    where: { id: reviewId },
  });

  return true;
}

// Mark review as helpful
export async function markReviewHelpful(
  userId: string,
  reviewId: string
): Promise<{ success: boolean; helpfulCount: number }> {
  try {
    // Use a transaction with upsert-like pattern to prevent race conditions
    // We try to create the mark - if it fails due to unique constraint, we know it exists
    const result = await prisma.$transaction(async (tx) => {
      // Try to create the helpful mark
      // This will throw if the unique constraint is violated
      await tx.reviewHelpful.create({
        data: { userId, reviewId },
      });

      // Increment the count atomically
      const review = await tx.storeReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
        select: { helpfulCount: true },
      });

      return { success: true, helpfulCount: review.helpfulCount };
    });

    return result;
  } catch (error) {
    // Unique constraint violation means user already marked this review
    // Return current count without error
    return {
      success: false,
      helpfulCount: await getReviewHelpfulCount(reviewId),
    };
  }
}

async function getReviewHelpfulCount(reviewId: string): Promise<number> {
  const review = await prisma.storeReview.findUnique({
    where: { id: reviewId },
    select: { helpfulCount: true },
  });
  return review?.helpfulCount || 0;
}

// Get store review statistics
export async function getStoreReviewStats(
  storeId: string
): Promise<StoreReviewStats | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return null;
  }

  const reviews = await prisma.storeReview.findMany({
    where: { storeId },
    select: {
      rating: true,
      deliveryRating: true,
      priceRating: true,
      serviceRating: true,
    },
  });

  if (reviews.length === 0) {
    return {
      storeId,
      storeName: store.name,
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: 0,
        percentage: 0,
      })),
      recommendationRate: 0,
    };
  }

  const totalReviews = reviews.length;
  const averageRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

  // Calculate rating distribution
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) {
    ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
  }

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratingCounts[rating],
    percentage: Math.round((ratingCounts[rating] / totalReviews) * 100),
  }));

  // Calculate sub-ratings
  const deliveryRatings = reviews
    .filter((r) => r.deliveryRating)
    .map((r) => r.deliveryRating!);
  const priceRatings = reviews
    .filter((r) => r.priceRating)
    .map((r) => r.priceRating!);
  const serviceRatings = reviews
    .filter((r) => r.serviceRating)
    .map((r) => r.serviceRating!);

  const averageDeliveryRating =
    deliveryRatings.length > 0
      ? deliveryRatings.reduce((a, b) => a + b, 0) / deliveryRatings.length
      : undefined;
  const averagePriceRating =
    priceRatings.length > 0
      ? priceRatings.reduce((a, b) => a + b, 0) / priceRatings.length
      : undefined;
  const averageServiceRating =
    serviceRatings.length > 0
      ? serviceRatings.reduce((a, b) => a + b, 0) / serviceRatings.length
      : undefined;

  // Recommendation rate (4+ stars)
  const recommendCount = reviews.filter((r) => r.rating >= 4).length;
  const recommendationRate = Math.round((recommendCount / totalReviews) * 100);

  return {
    storeId,
    storeName: store.name,
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution,
    averageDeliveryRating: averageDeliveryRating
      ? Math.round(averageDeliveryRating * 10) / 10
      : undefined,
    averagePriceRating: averagePriceRating
      ? Math.round(averagePriceRating * 10) / 10
      : undefined,
    averageServiceRating: averageServiceRating
      ? Math.round(averageServiceRating * 10) / 10
      : undefined,
    recommendationRate,
  };
}

// Get user's review for a store
export async function getUserStoreReview(
  userId: string,
  storeId: string
): Promise<StoreReview | null> {
  const review = await prisma.storeReview.findUnique({
    where: {
      userId_storeId: {
        userId,
        storeId,
      },
    },
    include: {
      user: { select: { name: true } },
      store: { select: { name: true } },
    },
  });

  if (!review) {
    return null;
  }

  return {
    id: review.id,
    userId: review.userId,
    userName: review.user.name,
    storeId: review.storeId,
    storeName: review.store.name,
    rating: review.rating,
    title: review.title,
    content: review.content,
    pros: review.pros as string[],
    cons: review.cons as string[],
    deliveryRating: review.deliveryRating || undefined,
    priceRating: review.priceRating || undefined,
    serviceRating: review.serviceRating || undefined,
    verifiedPurchase: review.verifiedPurchase,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

// Get all reviews by a user
export async function getUserReviews(
  userId: string
): Promise<StoreReview[]> {
  const reviews = await prisma.storeReview.findMany({
    where: { userId },
    include: {
      user: { select: { name: true } },
      store: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return reviews.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    storeId: r.storeId,
    storeName: r.store.name,
    rating: r.rating,
    title: r.title,
    content: r.content,
    pros: r.pros as string[],
    cons: r.cons as string[],
    deliveryRating: r.deliveryRating || undefined,
    priceRating: r.priceRating || undefined,
    serviceRating: r.serviceRating || undefined,
    verifiedPurchase: r.verifiedPurchase,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

// Get top rated stores
export async function getTopRatedStores(
  limit = 10
): Promise<
  {
    storeId: string;
    storeName: string;
    averageRating: number;
    reviewCount: number;
  }[]
> {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    include: {
      storeReviews: {
        select: { rating: true },
      },
    },
  });

  const storesWithStats = stores
    .filter((store) => store.storeReviews.length >= 3) // Minimum 3 reviews
    .map((store) => {
      const ratings = store.storeReviews.map((r) => r.rating);
      const averageRating =
        ratings.reduce((a, b) => a + b, 0) / ratings.length;

      return {
        storeId: store.id,
        storeName: store.name,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: ratings.length,
      };
    })
    .sort((a, b) => b.averageRating - a.averageRating);

  return storesWithStats.slice(0, limit);
}

// Report a review
export async function reportReview(
  userId: string,
  reviewId: string,
  reason: string
): Promise<boolean> {
  const review = await prisma.storeReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return false;
  }

  // SECURITY: Sanitize reason to prevent XSS
  const sanitizedReason = sanitizeText(reason);

  // In a real implementation, this would create a report entry
  // TODO: Create proper report model and save to database
  console.log(`Review ${reviewId} reported by ${userId}`);

  return true;
}
