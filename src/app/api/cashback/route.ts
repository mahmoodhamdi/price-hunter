import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCashbackSummary,
  getCashbackTransactions,
} from "@/lib/services/cashback";
import { CashbackStatus } from "@prisma/client";

// GET /api/cashback - Get user's cashback data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "summary";
    const status = searchParams.get("status") as CashbackStatus | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (type === "summary") {
      const summary = await getCashbackSummary(session.user.id);
      return NextResponse.json(summary);
    }

    if (type === "transactions") {
      const result = await getCashbackTransactions(session.user.id, {
        status: status || undefined,
        limit,
        offset,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching cashback:", error);
    return NextResponse.json(
      { error: "Failed to fetch cashback data" },
      { status: 500 }
    );
  }
}
