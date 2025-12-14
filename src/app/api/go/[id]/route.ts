import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAffiliateUrl, trackAffiliateClick } from "@/lib/services/affiliate";
import { isAllowedScrapeDomain } from "@/lib/security";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeProductId = params.id;

  try {
    // Get store product with store info
    const storeProduct = await prisma.storeProduct.findUnique({
      where: { id: storeProductId },
      include: {
        store: true,
        product: { select: { id: true } },
      },
    });

    if (!storeProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get session for user tracking
    const session = await getServerSession(authOptions);

    // Generate affiliate URL
    const affiliateUrl = await generateAffiliateUrl(
      storeProduct.store.slug,
      storeProduct.url
    );

    // Track the click
    await trackAffiliateClick({
      storeId: storeProduct.storeId,
      productId: storeProduct.productId,
      userId: session?.user?.id,
      url: affiliateUrl,
      referrer: request.headers.get("referer") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          undefined,
    });

    // Redirect to affiliate URL
    return NextResponse.redirect(affiliateUrl);
  } catch (error) {
    console.error("Affiliate redirect error:", error);
    // Fallback: redirect to original URL if tracking fails
    const storeProduct = await prisma.storeProduct.findUnique({
      where: { id: storeProductId },
      select: { url: true },
    });

    // SECURITY: Validate URL before redirecting to prevent open redirect
    if (storeProduct && isAllowedScrapeDomain(storeProduct.url)) {
      return NextResponse.redirect(storeProduct.url);
    }

    return NextResponse.json(
      { error: "Redirect failed" },
      { status: 500 }
    );
  }
}
