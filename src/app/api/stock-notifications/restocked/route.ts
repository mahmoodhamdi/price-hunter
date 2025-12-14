import { NextRequest, NextResponse } from "next/server";
import { getRecentlyRestockedProducts } from "@/lib/services/stock-notifications";

// GET /api/stock-notifications/restocked
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const products = await getRecentlyRestockedProducts(Math.min(limit, 50));

    return NextResponse.json({ products, count: products.length });
  } catch (error) {
    console.error("Error fetching restocked products:", error);
    return NextResponse.json(
      { error: "Failed to fetch restocked products" },
      { status: 500 }
    );
  }
}
