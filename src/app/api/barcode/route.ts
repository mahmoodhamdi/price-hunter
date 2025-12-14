import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  searchByBarcode,
  getBarcodePriceComparison,
  registerBarcode,
  recordBarcodeScan,
  getScanHistory,
  getPopularScannedProducts,
  isValidBarcode,
  getBarcodeType,
} from "@/lib/services/barcode-scanner";

// GET /api/barcode?code=...&type=search|compare|history|popular|validate
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const type = searchParams.get("type") || "search";

    // Get scan history
    if (type === "history") {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const limit = parseInt(searchParams.get("limit") || "20");
      const history = await getScanHistory(session.user.id, limit);
      return NextResponse.json({ history });
    }

    // Get popular scanned products
    if (type === "popular") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const products = await getPopularScannedProducts(limit);
      return NextResponse.json({ products });
    }

    if (!code) {
      return NextResponse.json(
        { error: "Barcode code is required" },
        { status: 400 }
      );
    }

    // Validate barcode
    if (type === "validate") {
      const valid = isValidBarcode(code);
      const barcodeType = getBarcodeType(code);
      return NextResponse.json({
        valid,
        type: barcodeType,
        code: code.replace(/[^0-9X]/gi, ""),
      });
    }

    // Search by barcode
    if (type === "search") {
      const result = await searchByBarcode(code);

      // Record scan if user is logged in
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await recordBarcodeScan(session.user.id, code);
      }

      return NextResponse.json(result);
    }

    // Get price comparison
    if (type === "compare") {
      const comparison = await getBarcodePriceComparison(code);

      if (!comparison) {
        return NextResponse.json(
          { error: "Product not found for this barcode" },
          { status: 404 }
        );
      }

      // Record scan if user is logged in
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await recordBarcodeScan(session.user.id, code);
      }

      return NextResponse.json(comparison);
    }

    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing barcode:", error);
    return NextResponse.json(
      { error: "Failed to process barcode" },
      { status: 500 }
    );
  }
}

// POST /api/barcode - Register a new barcode
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { barcode, name, nameAr, brand, category, image, description } = body;

    if (!barcode || !name) {
      return NextResponse.json(
        { error: "barcode and name are required" },
        { status: 400 }
      );
    }

    const result = await registerBarcode(barcode, {
      name,
      nameAr,
      brand,
      category,
      image,
      description,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, productId: result.productId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error registering barcode:", error);
    return NextResponse.json(
      { error: "Failed to register barcode" },
      { status: 500 }
    );
  }
}
