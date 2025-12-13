import { NextRequest, NextResponse } from "next/server";
import { updateExchangeRates } from "@/lib/workers/check-alerts";

// This endpoint updates exchange rates - call daily via cron
export async function GET(request: NextRequest) {
  // Verify authorization token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await updateExchangeRates();

    return NextResponse.json({
      success: true,
      message: "Exchange rates updated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Exchange rate update failed:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
