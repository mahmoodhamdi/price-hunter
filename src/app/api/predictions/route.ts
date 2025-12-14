import { NextRequest, NextResponse } from "next/server";
import {
  predictPrice,
  getPredictionsForProduct,
  getBestTimeToBuy,
} from "@/lib/services/price-prediction";

// GET /api/predictions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeProductId = searchParams.get("storeProductId");
    const productId = searchParams.get("productId");
    const type = searchParams.get("type") || "prediction";
    const daysAhead = parseInt(searchParams.get("days") || "7");

    if (type === "best-time" && storeProductId) {
      const recommendation = await getBestTimeToBuy(storeProductId);
      return NextResponse.json(recommendation);
    }

    if (storeProductId) {
      const prediction = await predictPrice(storeProductId, daysAhead);

      if (!prediction) {
        return NextResponse.json(
          { error: "Store product not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ prediction });
    }

    if (productId) {
      const predictions = await getPredictionsForProduct(productId, daysAhead);
      const predictionsObj = Object.fromEntries(predictions);
      return NextResponse.json({ predictions: predictionsObj });
    }

    return NextResponse.json(
      { error: "storeProductId or productId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    );
  }
}
