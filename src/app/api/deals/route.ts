import { NextRequest, NextResponse } from "next/server";
import { getDeals, getPriceDrops } from "@/lib/services/deals";
import { Country } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") as Country | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const minDiscount = parseInt(searchParams.get("minDiscount") || "10");
    const category = searchParams.get("category") || undefined;
    const type = searchParams.get("type") || "deals"; // deals or price-drops

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
