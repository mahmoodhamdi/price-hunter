import { NextRequest, NextResponse } from "next/server";
import { Currency } from "@prisma/client";
import { comparePricesInCurrency } from "@/lib/services/currency-converter";

// POST /api/currency/compare
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prices, targetCurrency } = body;

    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json(
        { error: "prices array is required" },
        { status: 400 }
      );
    }

    if (!targetCurrency || !Object.values(Currency).includes(targetCurrency)) {
      return NextResponse.json(
        { error: "Valid targetCurrency is required" },
        { status: 400 }
      );
    }

    // Validate prices
    for (const price of prices) {
      if (
        typeof price.amount !== "number" ||
        !price.currency ||
        !price.storeName
      ) {
        return NextResponse.json(
          { error: "Each price must have amount, currency, and storeName" },
          { status: 400 }
        );
      }
    }

    const compared = await comparePricesInCurrency(prices, targetCurrency);

    return NextResponse.json({
      targetCurrency,
      prices: compared,
      cheapestStore: compared[0]?.storeName,
      cheapestPrice: compared[0]?.convertedAmount,
    });
  } catch (error) {
    console.error("Error comparing prices:", error);
    return NextResponse.json(
      { error: "Failed to compare prices" },
      { status: 500 }
    );
  }
}
