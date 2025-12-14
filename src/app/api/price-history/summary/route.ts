import { NextRequest, NextResponse } from "next/server";
import {
  getPriceHistorySummary,
  calculatePriceStats,
} from "@/lib/services/price-export";

// GET /api/price-history/summary - Get price history summary
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const storeId = searchParams.get("storeId");
    const days = parseInt(searchParams.get("days") || "90");
    const includeStats = searchParams.get("stats") === "true";

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    const summary = await getPriceHistorySummary(
      productId,
      storeId || undefined
    );

    let stats = null;
    if (includeStats) {
      try {
        stats = await calculatePriceStats(productId, days);
      } catch {
        // Stats calculation may fail if not enough data
      }
    }

    return NextResponse.json({
      summary,
      stats,
    });
  } catch (error) {
    console.error("Error fetching price summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch price summary" },
      { status: 500 }
    );
  }
}
