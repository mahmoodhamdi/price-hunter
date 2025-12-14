import { NextRequest, NextResponse } from "next/server";
import { Currency } from "@prisma/client";
import {
  getExchangeRates,
  convertCurrency,
  getSupportedCurrencies,
  updateExchangeRates,
} from "@/lib/services/currency-converter";

// GET /api/currency?from=USD&to=SAR&amount=100
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    // Get list of supported currencies
    if (type === "list") {
      const currencies = getSupportedCurrencies();
      return NextResponse.json({ currencies });
    }

    // Get exchange rates
    if (type === "rates") {
      const base = (searchParams.get("base") as Currency) || Currency.USD;
      const rates = await getExchangeRates(base);
      return NextResponse.json(rates);
    }

    // Convert currency
    const from = searchParams.get("from") as Currency;
    const to = searchParams.get("to") as Currency;
    const amount = parseFloat(searchParams.get("amount") || "1");

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to currencies are required" },
        { status: 400 }
      );
    }

    if (!Object.values(Currency).includes(from) || !Object.values(Currency).includes(to)) {
      return NextResponse.json(
        { error: "Invalid currency code" },
        { status: 400 }
      );
    }

    const result = await convertCurrency(amount, from, to);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in currency API:", error);
    return NextResponse.json(
      { error: "Failed to process currency request" },
      { status: 500 }
    );
  }
}

// POST /api/currency - Update exchange rates (admin only)
export async function POST(request: NextRequest) {
  try {
    // In production, add admin authentication here
    const result = await updateExchangeRates();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update rates" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Exchange rates updated",
      updated: result.updated,
    });
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
