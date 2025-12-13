import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createAlertSchema = z.object({
  productId: z.string(),
  targetPrice: z.number().positive(),
  currency: z.enum(["SAR", "EGP", "AED", "KWD", "USD"]),
  notifyEmail: z.boolean().optional().default(true),
  notifyTelegram: z.boolean().optional().default(false),
  notifyPush: z.boolean().optional().default(false),
});

// GET - Get user's alerts
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            storeProducts: {
              where: { store: { isActive: true } },
              include: { store: true },
              orderBy: { price: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// POST - Create new price alert
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createAlertSchema.parse(body);

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if alert already exists for this product
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        userId: session.user.id,
        productId: data.productId,
        isActive: true,
      },
    });

    if (existingAlert) {
      return NextResponse.json(
        { error: "You already have an active alert for this product" },
        { status: 400 }
      );
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: session.user.id,
        productId: data.productId,
        targetPrice: data.targetPrice,
        currency: data.currency,
        notifyEmail: data.notifyEmail,
        notifyTelegram: data.notifyTelegram,
        notifyPush: data.notifyPush,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
