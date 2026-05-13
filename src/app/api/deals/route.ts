import { NextRequest, NextResponse } from "next/server";
import { getDeals, getPriceDrops } from "@/lib/services/deals";
import { Country } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") as Country | null;
    // Cap limit and minDiscount to prevent unbounded queries / silly inputs.
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100);
    const minDiscount = Math.min(
      Math.max(parseInt(searchParams.get("minDiscount") || "10"), 0),
      100
    );
    const category = searchParams.get("category") || undefined;
    const type = searchParams.get("type") || "deals";

    if (type === "price-drops") {
      const priceDrops = await getPriceDrops({
        country: country || undefined,
        limit,
      });

      return NextResponse.json({
        type: "price-drops",
        count: priceDrops.length,
        deals: priceDrops,
      });
    }

    const deals = await getDeals({
      country: country || undefined,
      limit,
      minDiscount,
      category,
    });

    return NextResponse.json({
      type: "deals",
      count: deals.length,
      deals,
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}
