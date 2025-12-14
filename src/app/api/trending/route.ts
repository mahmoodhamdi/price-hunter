import { NextRequest, NextResponse } from "next/server";
import { getTrendingProducts, getNewProducts } from "@/lib/services/deals";
import { Country } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") as Country | null;
    const limit = parseInt(searchParams.get("limit") || "10");
    const days = parseInt(searchParams.get("days") || "7");
    const type = searchParams.get("type") || "trending"; // trending or new

    if (type === "new") {
      const newProducts = await getNewProducts({
        country: country || undefined,
        limit,
        days,
      });

      return NextResponse.json({
        type: "new",
        count: newProducts.length,
        products: newProducts,
      });
    }

    const trending = await getTrendingProducts({
      country: country || undefined,
      limit,
      days,
    });

    return NextResponse.json({
      type: "trending",
      count: trending.length,
      products: trending,
    });
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending products" },
      { status: 500 }
    );
  }
}
