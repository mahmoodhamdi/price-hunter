import { NextRequest, NextResponse } from "next/server";
import { Currency } from "@prisma/client";
import { getRateHistory } from "@/lib/services/currency-converter";

// GET /api/currency/history?from=USD&to=SAR&days=30
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from") as Currency;
    const to = searchParams.get("to") as Currency;
    const days = parseInt(searchParams.get("days") || "30");

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

    const history = await getRateHistory(from, to, Math.min(days, 365));

    return NextResponse.json({
      from,
      to,
      days: history.length,
      history,
    });
  } catch (error) {
    console.error("Error fetching rate history:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate history" },
      { status: 500 }
    );
  }
}
