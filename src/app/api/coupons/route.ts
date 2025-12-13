import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const store = searchParams.get("store");
  const featured = searchParams.get("featured") === "true";

  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        ...(store && { store: { slug: store } }),
        ...(featured && { isFeatured: true }),
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        store: {
          select: {
            name: true,
            nameAr: true,
            slug: true,
            logo: true,
            domain: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}
