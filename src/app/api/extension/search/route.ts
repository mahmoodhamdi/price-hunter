import { NextRequest, NextResponse } from "next/server";
import { extensionQuickSearch } from "@/lib/services/browser-extension";

// GET /api/extension/search?q=...&limit=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const results = await extensionQuickSearch(query, Math.min(limit, 50));

    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    console.error("Error in extension search:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
