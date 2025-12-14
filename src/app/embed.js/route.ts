import { NextResponse } from "next/server";
import { generateWidgetScript } from "@/lib/services/embed-widget";

// GET /embed.js
export async function GET() {
  try {
    const script = generateWidgetScript();

    const response = new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600", // 1 hour cache
        "Access-Control-Allow-Origin": "*",
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating widget script:", error);
    return new NextResponse("console.error('Price Hunter widget error');", {
      status: 500,
      headers: { "Content-Type": "application/javascript" },
    });
  }
}
