import { NextRequest, NextResponse } from "next/server";
import {
  getExtensionWishlist,
  addToWishlistFromExtension,
  validateExtensionApiKey,
} from "@/lib/services/browser-extension";

// GET /api/extension/wishlist
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-Extension-Key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const validation = await validateExtensionApiKey(apiKey);
    if (!validation.valid || !validation.userId) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const wishlist = await getExtensionWishlist(validation.userId);

    return NextResponse.json({ wishlist, count: wishlist.length });
  } catch (error) {
    console.error("Error fetching extension wishlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

// POST /api/extension/wishlist
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-Extension-Key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const validation = await validateExtensionApiKey(apiKey);
    if (!validation.valid || !validation.userId) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, targetPrice } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const result = await addToWishlistFromExtension(
      validation.userId,
      url,
      targetPrice
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, productId: result.productId });
  } catch (error) {
    console.error("Error adding to extension wishlist:", error);
    return NextResponse.json(
      { error: "Failed to add to wishlist" },
      { status: 500 }
    );
  }
}
