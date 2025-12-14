import { NextRequest, NextResponse } from "next/server";
import { getQuickComparison } from "@/lib/services/browser-extension";

// GET /api/extension/compare?name=...&store=...&price=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productName = searchParams.get("name");
    const currentStore = searchParams.get("store");
    const currentPrice = parseFloat(searchParams.get("price") || "0");

    if (!productName || !currentStore || !currentPrice) {
      return NextResponse.json(
        { error: "name, store, and price are required" },
        { status: 400 }
      );
    }

    const comparison = await getQuickComparison(
      productName,
      currentStore,
      currentPrice
    );

    if (!comparison) {
      return NextResponse.json({
        found: false,
        message: "No price comparison data available for this product",
      });
    }

    return NextResponse.json({
      found: true,
      ...comparison,
      currentPrice,
      currentStore,
    });
  } catch (error) {
    console.error("Error getting comparison:", error);
    return NextResponse.json(
      { error: "Failed to get comparison" },
      { status: 500 }
    );
  }
}
