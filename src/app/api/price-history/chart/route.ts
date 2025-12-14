import { NextRequest, NextResponse } from "next/server";
import { getPriceChartData } from "@/lib/services/price-export";

// GET /api/price-history/chart - Get price chart data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const days = parseInt(searchParams.get("days") || "30");
    const storeIds = searchParams.get("storeIds");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    const storeIdArray = storeIds ? storeIds.split(",") : undefined;

    const chartData = await getPriceChartData(productId, days, storeIdArray);

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
