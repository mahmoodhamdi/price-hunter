import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    storeReview: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    affiliateClick: {
      findFirst: vi.fn(),
    },
    reviewHelpful: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Store Reviews Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getStoreReviews", () => {
    it("should return store reviews", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStoreReviews } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findMany).mockResolvedValue([
        {
          id: "r1",
          userId: "u1",
          storeId: "s1",
          rating: 5,
          title: "Great store",
          content: "Excellent service",
          pros: ["Fast delivery", "Good prices"],
          cons: [],
          deliveryRating: 5,
          priceRating: 4,
          serviceRating: 5,
          verifiedPurchase: true,
          helpfulCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { name: "John Doe" },
          store: { name: "Amazon" },
        },
      ] as any);

      vi.mocked(prisma.storeReview.count).mockResolvedValue(1);

      const { reviews, total } = await getStoreReviews("s1");

      expect(reviews).toHaveLength(1);
      expect(reviews[0].rating).toBe(5);
      expect(reviews[0].userName).toBe("John Doe");
      expect(total).toBe(1);
    });

    it("should sort by helpful count", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStoreReviews } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.storeReview.count).mockResolvedValue(0);

      await getStoreReviews("s1", { sortBy: "helpful" });

      expect(prisma.storeReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { helpfulCount: "desc" },
        })
      );
    });

    it("should filter by minimum rating", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStoreReviews } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.storeReview.count).mockResolvedValue(0);

      await getStoreReviews("s1", { minRating: 4 });

      expect(prisma.storeReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: { gte: 4 },
          }),
        })
      );
    });
  });

  describe("createStoreReview", () => {
    it("should create a new review", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        id: "s1",
        name: "Amazon",
      } as any);

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.affiliateClick.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.storeReview.create).mockResolvedValue({
        id: "r1",
        userId: "u1",
        storeId: "s1",
        rating: 5,
        title: "Great",
        content: "Amazing store",
        pros: [],
        cons: [],
        deliveryRating: null,
        priceRating: null,
        serviceRating: null,
        verifiedPurchase: false,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "John" },
        store: { name: "Amazon" },
      } as any);

      const review = await createStoreReview({
        userId: "u1",
        storeId: "s1",
        rating: 5,
        title: "Great",
        content: "Amazing store",
      });

      expect(review).toBeDefined();
      expect(review?.rating).toBe(5);
    });

    it("should return null for non-existent store", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findUnique).mockResolvedValue(null);

      const review = await createStoreReview({
        userId: "u1",
        storeId: "non-existent",
        rating: 5,
        title: "Test",
        content: "Test",
      });

      expect(review).toBeNull();
    });

    it("should update existing review", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        id: "s1",
      } as any);

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue({
        id: "existing",
      } as any);

      vi.mocked(prisma.storeReview.update).mockResolvedValue({
        id: "existing",
        userId: "u1",
        storeId: "s1",
        rating: 4,
        title: "Updated",
        content: "Updated content",
        pros: [],
        cons: [],
        deliveryRating: null,
        priceRating: null,
        serviceRating: null,
        verifiedPurchase: false,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "John" },
        store: { name: "Amazon" },
      } as any);

      const review = await createStoreReview({
        userId: "u1",
        storeId: "s1",
        rating: 4,
        title: "Updated",
        content: "Updated content",
      });

      expect(review?.id).toBe("existing");
      expect(prisma.storeReview.update).toHaveBeenCalled();
    });

    it("should mark as verified purchase if user has converted click", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { createStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        id: "s1",
      } as any);

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.affiliateClick.findFirst).mockResolvedValue({
        converted: true,
      } as any);

      vi.mocked(prisma.storeReview.create).mockResolvedValue({
        id: "r1",
        userId: "u1",
        storeId: "s1",
        rating: 5,
        title: "Great",
        content: "Test",
        pros: [],
        cons: [],
        deliveryRating: null,
        priceRating: null,
        serviceRating: null,
        verifiedPurchase: true,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "John" },
        store: { name: "Amazon" },
      } as any);

      const review = await createStoreReview({
        userId: "u1",
        storeId: "s1",
        rating: 5,
        title: "Great",
        content: "Test",
      });

      expect(review?.verifiedPurchase).toBe(true);
    });
  });

  describe("deleteStoreReview", () => {
    it("should delete review", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deleteStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findFirst).mockResolvedValue({
        id: "r1",
      } as any);

      vi.mocked(prisma.storeReview.delete).mockResolvedValue({} as any);

      const result = await deleteStoreReview("u1", "r1");

      expect(result).toBe(true);
    });

    it("should return false if review not found", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { deleteStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findFirst).mockResolvedValue(null);

      const result = await deleteStoreReview("u1", "non-existent");

      expect(result).toBe(false);
    });
  });

  describe("markReviewHelpful", () => {
    it("should mark review as helpful", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { markReviewHelpful } = await import(
        "@/lib/services/store-reviews"
      );

      // Transaction callback pattern - mock executes the callback with the prisma client
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        if (typeof callback === "function") {
          // Mock the transaction context
          const tx = {
            reviewHelpful: {
              create: vi.fn().mockResolvedValue({ id: "h1" }),
            },
            storeReview: {
              update: vi.fn().mockResolvedValue({ helpfulCount: 1 }),
            },
          };
          return callback(tx);
        }
        return [{}];
      });

      const result = await markReviewHelpful("u1", "r1");

      expect(result.success).toBe(true);
      expect(result.helpfulCount).toBe(1);
    });

    it("should return false if already marked", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { markReviewHelpful } = await import(
        "@/lib/services/store-reviews"
      );

      // Simulate unique constraint violation
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error("Unique constraint failed")
      );

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue({
        helpfulCount: 5,
      } as any);

      const result = await markReviewHelpful("u1", "r1");

      expect(result.success).toBe(false);
      expect(result.helpfulCount).toBe(5);
    });
  });

  describe("getStoreReviewStats", () => {
    it("should return store review statistics", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStoreReviewStats } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        id: "s1",
        name: "Amazon",
      } as any);

      vi.mocked(prisma.storeReview.findMany).mockResolvedValue([
        { rating: 5, deliveryRating: 5, priceRating: 4, serviceRating: 5 },
        { rating: 4, deliveryRating: 4, priceRating: 4, serviceRating: 4 },
        { rating: 5, deliveryRating: null, priceRating: null, serviceRating: null },
      ] as any);

      const stats = await getStoreReviewStats("s1");

      expect(stats).toBeDefined();
      expect(stats?.totalReviews).toBe(3);
      expect(stats?.averageRating).toBeGreaterThan(0);
      expect(stats?.recommendationRate).toBe(100); // All ratings >= 4
    });

    it("should return null for non-existent store", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStoreReviewStats } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findUnique).mockResolvedValue(null);

      const stats = await getStoreReviewStats("non-existent");

      expect(stats).toBeNull();
    });

    it("should return zero stats for store with no reviews", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getStoreReviewStats } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findUnique).mockResolvedValue({
        id: "s1",
        name: "Amazon",
      } as any);

      vi.mocked(prisma.storeReview.findMany).mockResolvedValue([]);

      const stats = await getStoreReviewStats("s1");

      expect(stats?.totalReviews).toBe(0);
      expect(stats?.averageRating).toBe(0);
    });
  });

  describe("getUserStoreReview", () => {
    it("should return user's review for a store", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue({
        id: "r1",
        userId: "u1",
        storeId: "s1",
        rating: 5,
        title: "Great",
        content: "Excellent",
        pros: [],
        cons: [],
        deliveryRating: null,
        priceRating: null,
        serviceRating: null,
        verifiedPurchase: false,
        helpfulCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "John" },
        store: { name: "Amazon" },
      } as any);

      const review = await getUserStoreReview("u1", "s1");

      expect(review).toBeDefined();
      expect(review?.rating).toBe(5);
    });

    it("should return null if no review exists", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserStoreReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue(null);

      const review = await getUserStoreReview("u1", "s1");

      expect(review).toBeNull();
    });
  });

  describe("getUserReviews", () => {
    it("should return all reviews by a user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getUserReviews } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findMany).mockResolvedValue([
        {
          id: "r1",
          userId: "u1",
          storeId: "s1",
          rating: 5,
          title: "Great",
          content: "Test",
          pros: [],
          cons: [],
          deliveryRating: null,
          priceRating: null,
          serviceRating: null,
          verifiedPurchase: false,
          helpfulCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { name: "John" },
          store: { name: "Amazon" },
        },
      ] as any);

      const reviews = await getUserReviews("u1");

      expect(reviews).toHaveLength(1);
    });
  });

  describe("getTopRatedStores", () => {
    it("should return top rated stores", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTopRatedStores } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findMany).mockResolvedValue([
        {
          id: "s1",
          name: "Amazon",
          isActive: true,
          storeReviews: [{ rating: 5 }, { rating: 5 }, { rating: 4 }],
        },
        {
          id: "s2",
          name: "Noon",
          isActive: true,
          storeReviews: [{ rating: 4 }, { rating: 4 }, { rating: 4 }],
        },
      ] as any);

      const stores = await getTopRatedStores(10);

      expect(stores).toHaveLength(2);
      expect(stores[0].storeName).toBe("Amazon"); // Higher average
    });

    it("should filter stores with less than 3 reviews", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getTopRatedStores } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.store.findMany).mockResolvedValue([
        {
          id: "s1",
          name: "Amazon",
          isActive: true,
          storeReviews: [{ rating: 5 }, { rating: 5 }], // Only 2 reviews
        },
      ] as any);

      const stores = await getTopRatedStores(10);

      expect(stores).toHaveLength(0);
    });
  });

  describe("reportReview", () => {
    it("should report a review", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { reportReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue({
        id: "r1",
      } as any);

      const result = await reportReview("u1", "r1", "Inappropriate content");

      expect(result).toBe(true);
    });

    it("should return false for non-existent review", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { reportReview } = await import(
        "@/lib/services/store-reviews"
      );

      vi.mocked(prisma.storeReview.findUnique).mockResolvedValue(null);

      const result = await reportReview("u1", "non-existent", "Spam");

      expect(result).toBe(false);
    });
  });
});
