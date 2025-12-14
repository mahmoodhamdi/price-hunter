import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPersonalizedRecommendations,
  getTrendingRecommendations,
  getSimilarProducts,
  getPriceDropRecommendations,
} from "@/lib/services/recommendations";

// GET /api/recommendations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "personalized";
    const productId = searchParams.get("productId");
    const limit = parseInt(searchParams.get("limit") || "10");

    // For personalized recommendations, we need authentication
    if (type === "personalized") {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        // Fall back to trending for non-authenticated users
        const recommendations = await getTrendingRecommendations(limit);
        return NextResponse.json({ recommendations, type: "trending" });
      }

      const recommendations = await getPersonalizedRecommendations(
        session.user.id,
        { limit }
      );
      return NextResponse.json({ recommendations, type: "personalized" });
    }

    if (type === "similar" && productId) {
      const recommendations = await getSimilarProducts(productId, limit);
      return NextResponse.json({ recommendations, type: "similar" });
    }

    if (type === "trending") {
      const recommendations = await getTrendingRecommendations(limit);
      return NextResponse.json({ recommendations, type: "trending" });
    }

    if (type === "price-drops") {
      const recommendations = await getPriceDropRecommendations(limit);
      return NextResponse.json({ recommendations, type: "price-drops" });
    }

    return NextResponse.json(
      { error: "Invalid recommendation type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
