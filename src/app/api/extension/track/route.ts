import { NextRequest, NextResponse } from "next/server";
import {
  trackProductFromExtension,
  isUrlTracked,
  validateExtensionApiKey,
} from "@/lib/services/browser-extension";
import { Currency } from "@prisma/client";

// GET /api/extension/track?url=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const tracked = await isUrlTracked(url);

    return NextResponse.json({ tracked });
  } catch (error) {
    console.error("Error checking track status:", error);
    return NextResponse.json(
      { error: "Failed to check track status" },
      { status: 500 }
    );
  }
}

// POST /api/extension/track
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-Extension-Key");

    // API key is optional for tracking, but recommended
    if (apiKey) {
      const validation = await validateExtensionApiKey(apiKey);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { url, name, price, currency, image, inStock, storeName } = body;

    if (!url || !name || !price || !storeName) {
      return NextResponse.json(
        { error: "url, name, price, and storeName are required" },
        { status: 400 }
      );
    }

    // Validate currency
    const validCurrency = Object.values(Currency).includes(currency)
      ? currency
      : Currency.SAR;

    const result = await trackProductFromExtension(url, {
      name,
      price: parseFloat(price),
      currency: validCurrency,
      image,
      inStock: inStock ?? true,
      storeName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      storeProductId: result.storeProductId,
    });
  } catch (error) {
    console.error("Error tracking product:", error);
    return NextResponse.json(
      { error: "Failed to track product" },
      { status: 500 }
    );
  }
}
