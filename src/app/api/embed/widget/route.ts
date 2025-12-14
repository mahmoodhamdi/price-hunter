import { NextRequest, NextResponse } from "next/server";
import {
  getEmbedWidgetData,
  getEmbedWidgetDataById,
  trackWidgetImpression,
  validateEmbedDomain,
} from "@/lib/services/embed-widget";

// GET /api/embed/widget?slug=...&id=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");
    const referrer = request.headers.get("referer");

    // Validate referrer domain
    if (referrer) {
      try {
        const domain = new URL(referrer).hostname;
        const validation = await validateEmbedDomain(domain);
        if (!validation.allowed) {
          return NextResponse.json(
            { error: validation.reason || "Domain not allowed" },
            { status: 403 }
          );
        }
      } catch {
        // Invalid referrer URL, continue anyway
      }
    }

    let data;

    if (slug) {
      data = await getEmbedWidgetData(slug);
      if (data) {
        await trackWidgetImpression(slug, referrer);
      }
    } else if (id) {
      data = await getEmbedWidgetDataById(id);
      if (data) {
        await trackWidgetImpression(data.productSlug, referrer);
      }
    } else {
      return NextResponse.json(
        { error: "slug or id is required" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Add CORS headers for cross-origin access
    const response = NextResponse.json(data);
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Cache-Control", "public, max-age=300"); // 5 min cache

    return response;
  } catch (error) {
    console.error("Error fetching embed widget data:", error);
    return NextResponse.json(
      { error: "Failed to fetch widget data" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
