import { NextRequest, NextResponse } from "next/server";
import { compareDealAcrossStores } from "@/lib/services/deal-aggregator";

// GET /api/deals/compare?productId=... - Compare deal across stores
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    const deals = await compareDealAcrossStores(productId);

    if (deals.length === 0) {
      return NextResponse.json(
        { error: "Product not found or no deals available" },
        { status: 404 }
      );
    }

    // Calculate savings info
    const prices = deals.map((d) => d.currentPrice);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const savings = highestPrice - lowestPrice;
    const savingsPercentage = Math.round((savings / highestPrice) * 100);

    return NextResponse.json({
      productId,
      productName: deals[0].productName,
      productImage: deals[0].productImage,
      deals,
      comparison: {
        lowestPrice,
        highestPrice,
        savings,
        savingsPercentage,
        storeCount: deals.length,
        bestStore: deals[0].storeName,
      },
    });
  } catch (error) {
    console.error("Error comparing deals:", error);
    return NextResponse.json(
      { error: "Failed to compare deals" },
      { status: 500 }
    );
  }
}
