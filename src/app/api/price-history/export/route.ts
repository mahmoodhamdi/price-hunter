import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Currency } from "@prisma/client";
import {
  exportPriceHistory,
  exportUserPriceData,
  ExportFormat,
} from "@/lib/services/price-export";

// GET /api/price-history/export - Export price history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get("format") || "csv") as ExportFormat;
    const productId = searchParams.get("productId");
    const productSlug = searchParams.get("productSlug");
    const storeId = searchParams.get("storeId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const currency = searchParams.get("currency") as Currency | null;
    const userDataOnly = searchParams.get("userDataOnly") === "true";

    // Validate format
    if (!["csv", "json", "excel"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use csv, json, or excel" },
        { status: 400 }
      );
    }

    // If exporting user data, require authentication
    if (userDataOnly) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const result = await exportUserPriceData(session.user.id, format);

      return new NextResponse(result.data, {
        headers: {
          "Content-Type": result.mimeType,
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "X-Record-Count": result.recordCount.toString(),
        },
      });
    }

    // Require at least productId or productSlug for non-user exports
    if (!productId && !productSlug) {
      return NextResponse.json(
        { error: "productId or productSlug is required" },
        { status: 400 }
      );
    }

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const result = await exportPriceHistory({
      format,
      productId: productId || undefined,
      productSlug: productSlug || undefined,
      storeId: storeId || undefined,
      startDate,
      endDate,
      currency: currency || undefined,
      includeHeaders: true,
    });

    return new NextResponse(result.data, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Record-Count": result.recordCount.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting price history:", error);
    return NextResponse.json(
      { error: "Failed to export price history" },
      { status: 500 }
    );
  }
}
