import { NextResponse } from "next/server";
import { getExtensionConfig } from "@/lib/services/browser-extension";

// GET /api/extension/config
export async function GET() {
  try {
    const config = getExtensionConfig();

    return NextResponse.json({
      version: "1.0.0",
      ...config,
    });
  } catch (error) {
    console.error("Error fetching extension config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}
