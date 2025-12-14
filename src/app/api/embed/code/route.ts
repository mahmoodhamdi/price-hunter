import { NextRequest, NextResponse } from "next/server";
import { generateEmbedCode } from "@/lib/services/embed-widget";

// GET /api/embed/code?slug=...&theme=...&color=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Product slug is required" },
        { status: 400 }
      );
    }

    const config = {
      theme: (searchParams.get("theme") as "light" | "dark" | "auto") || "light",
      primaryColor: searchParams.get("color")
        ? `#${searchParams.get("color")}`
        : "#3b82f6",
      showLogo: searchParams.get("logo") !== "0",
      showPriceHistory: searchParams.get("history") === "1",
      showStoreLogos: searchParams.get("storeLogos") !== "0",
      maxStores: parseInt(searchParams.get("maxStores") || "5"),
      width: searchParams.get("width") || "100%",
      height: searchParams.get("height") || "auto",
      borderRadius: searchParams.get("radius") || "8px",
      language: (searchParams.get("lang") as "en" | "ar") || "en",
    };

    const embedCode = generateEmbedCode(slug, config);

    return NextResponse.json({
      ...embedCode,
      config,
    });
  } catch (error) {
    console.error("Error generating embed code:", error);
    return NextResponse.json(
      { error: "Failed to generate embed code" },
      { status: 500 }
    );
  }
}
