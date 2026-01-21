import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Currency } from "@prisma/client";
import {
  getDeals,
  getFlashSales,
  getClearanceDeals,
  getPriceDrops,
  getDealsByStore,
  getDealsByCategory,
  getDealSummary,
  getBestDeals,
  getDealsWithCoupons,
  getNewLowestPrices,
  searchDeals,
  getPersonalizedDeals,
  getTrendingDeals,
  DealFilter,
  DealType,
} from "@/lib/services/deal-aggregator";

// GET /api/deals/aggregate - Get aggregated deals
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const query = searchParams.get("query");

    // Get filter parameters
    const filter: DealFilter = {};

    const minDiscount = searchParams.get("minDiscount");
    if (minDiscount) filter.minDiscount = parseInt(minDiscount);

    const maxPrice = searchParams.get("maxPrice");
    if (maxPrice) filter.maxPrice = parseFloat(maxPrice);

    const currency = searchParams.get("currency") as Currency;
    if (currency) filter.currency = currency;

    const storeIds = searchParams.get("storeIds");
    if (storeIds) filter.storeIds = storeIds.split(",");

    const inStockOnly = searchParams.get("inStockOnly");
    if (inStockOnly === "true") filter.inStockOnly = true;

    const dealTypes = searchParams.get("dealTypes");
    if (dealTypes) filter.type = dealTypes.split(",") as DealType[];

    let deals;

    switch (type) {
      case "flash":
        deals = await getFlashSales(limit);
        break;

      case "clearance":
        deals = await getClearanceDeals(limit);
        break;

      case "drops": {
        const hours = parseInt(searchParams.get("hours") || "24");
        const minDrop = parseInt(searchParams.get("minDrop") || "10");
        deals = await getPriceDrops(hours, minDrop, limit);
        break;
      }

      case "store": {
        const storeId = searchParams.get("storeId");
        if (!storeId) {
          return NextResponse.json(
            { error: "storeId is required" },
            { status: 400 }
          );
        }
        deals = await getDealsByStore(storeId, limit);
        break;
      }

      case "category": {
        const category = searchParams.get("category");
        if (!category) {
          return NextResponse.json(
            { error: "category is required" },
            { status: 400 }
          );
        }
        deals = await getDealsByCategory(category, limit);
        break;
      }

      case "best":
        deals = await getBestDeals(currency || Currency.SAR, limit);
        break;

      case "coupons":
        deals = await getDealsWithCoupons(limit);
        break;

      case "lowest":
        deals = await getNewLowestPrices(limit);
        break;

      case "trending": {
        const trendingHours = parseInt(searchParams.get("hours") || "24");
        deals = await getTrendingDeals(trendingHours, limit);
        break;
      }

      case "personalized": {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: "Authentication required for personalized deals" },
            { status: 401 }
          );
        }
        deals = await getPersonalizedDeals(session.user.id, limit);
        break;
      }

      case "search":
        if (!query) {
          return NextResponse.json(
            { error: "query is required for search" },
            { status: 400 }
          );
        }
        deals = await searchDeals(query, filter, limit);
        break;

      case "summary": {
        const summary = await getDealSummary();
        return NextResponse.json({ summary });
      }

      default:
        deals = await getDeals(filter, limit, offset);
    }

    return NextResponse.json({
      deals,
      count: deals.length,
      type,
      filter,
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}
