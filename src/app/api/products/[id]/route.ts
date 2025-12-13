import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        storeProducts: {
          where: {
            store: {
              isActive: true,
            },
          },
          include: {
            store: true,
            priceHistory: {
              orderBy: {
                recordedAt: "desc",
              },
              take: 30, // Last 30 price points
            },
          },
          orderBy: {
            price: "asc",
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate price statistics
    const prices = product.storeProducts.map((sp) => Number(sp.price));
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    return NextResponse.json({
      product,
      stats: {
        lowestPrice,
        highestPrice,
        averagePrice,
        storeCount: product.storeProducts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
