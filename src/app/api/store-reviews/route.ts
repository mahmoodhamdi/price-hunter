import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getStoreReviews,
  createStoreReview,
  getUserReviews,
  getTopRatedStores,
} from "@/lib/services/store-reviews";

// GET /api/store-reviews
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const storeId = searchParams.get("storeId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = (searchParams.get("sortBy") as "recent" | "helpful" | "rating_high" | "rating_low") || "recent";
    const minRating = searchParams.get("minRating")
      ? parseInt(searchParams.get("minRating")!)
      : undefined;

    // Get top rated stores
    if (type === "top-rated") {
      const stores = await getTopRatedStores(limit);
      return NextResponse.json({ stores });
    }

    // Get user's reviews
    if (type === "my-reviews") {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const reviews = await getUserReviews(session.user.id);
      return NextResponse.json({ reviews });
    }

    // Get store reviews
    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 }
      );
    }

    const { reviews, total } = await getStoreReviews(storeId, {
      limit,
      offset,
      sortBy,
      minRating,
    });

    return NextResponse.json({
      reviews,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + reviews.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching store reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch store reviews" },
      { status: 500 }
    );
  }
}

// POST /api/store-reviews
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      storeId,
      rating,
      title,
      content,
      pros,
      cons,
      deliveryRating,
      priceRating,
      serviceRating,
    } = body;

    if (!storeId || !rating || !title || !content) {
      return NextResponse.json(
        { error: "storeId, rating, title, and content are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const review = await createStoreReview({
      userId: session.user.id,
      storeId,
      rating,
      title,
      content,
      pros,
      cons,
      deliveryRating,
      priceRating,
      serviceRating,
    });

    if (!review) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Error creating store review:", error);
    return NextResponse.json(
      { error: "Failed to create store review" },
      { status: 500 }
    );
  }
}
