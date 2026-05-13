import { NextRequest, NextResponse } from "next/server";
import { processStockNotifications } from "@/lib/services/stock-notifications";

/**
 * Cron endpoint: check for restocked products and dispatch stock-back
 * notifications to users who subscribed. Phase 6 / Phase 10.
 *
 * Authorized via Bearer <CRON_SECRET>. Cron job recommended every 15-30
 * minutes during business hours.
 *
 * Returns a summary of how many notifications were fired so the cron
 * service's log shows useful detail.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processStockNotifications();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Stock notification cron failed:", error);
    return NextResponse.json(
      { error: "Failed to process stock notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
