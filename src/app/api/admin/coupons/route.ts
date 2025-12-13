import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const couponSchema = z.object({
  storeId: z.string(),
  code: z.string().min(1),
  description: z.string().min(1),
  descriptionAr: z.string().optional(),
  discount: z.string().min(1),
  minPurchase: z.number().optional(),
  maxDiscount: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        store: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = couponSchema.parse(body);

    const coupon = await prisma.coupon.create({
      data: {
        storeId: data.storeId,
        code: data.code,
        description: data.description,
        descriptionAr: data.descriptionAr,
        discount: data.discount,
        minPurchase: data.minPurchase,
        maxDiscount: data.maxDiscount,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isActive: data.isActive,
        isVerified: data.isVerified,
        isFeatured: data.isFeatured,
      },
      include: {
        store: {
          select: { name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating coupon:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
