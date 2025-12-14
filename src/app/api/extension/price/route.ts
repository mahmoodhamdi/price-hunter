import { NextRequest, NextResponse } from "next/server";
import {
  getPriceDataForUrl,
  validateExtensionApiKey,
} from "@/lib/services/browser-extension";

// GET /api/extension/price?url=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    const apiKey = request.headers.get("X-Extension-Key");

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate API key if provided (optional for public price data)
    if (apiKey) {
      const validation = await validateExtensionApiKey(apiKey);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 401 }
        );
      }
    }

    const priceData = await getPriceDataForUrl(url);

    if (!priceData) {
      return NextResponse.json(
        { error: "Product not found for this URL", tracked: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...priceData, tracked: true });
  } catch (error) {
    console.error("Error fetching extension price data:", error);
    return NextResponse.json(
      { error: "Failed to fetch price data" },
      { status: 500 }
    );
  }
}
