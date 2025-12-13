import { NextRequest, NextResponse } from "next/server";
import { checkPriceAlerts } from "@/lib/workers/check-alerts";

// This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions)
// Add authorization to prevent unauthorized access
export async function GET(request: NextRequest) {
  // Verify authorization token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkPriceAlerts();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Failed to check alerts" },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
