import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateAlertSchema = z.object({
  targetPrice: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifyTelegram: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
});

// GET - Get single alert
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const alert = await prisma.priceAlert.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        product: {
          include: {
            storeProducts: {
              where: { store: { isActive: true } },
              include: { store: true },
              orderBy: { price: "asc" },
            },
          },
        },
      },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Error fetching alert:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert" },
      { status: 500 }
    );
  }
}

// PUT - Update alert
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if alert belongs to user
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateAlertSchema.parse(body);

    const alert = await prisma.priceAlert.update({
      where: { id },
      data,
      include: {
        product: true,
      },
    });

    return NextResponse.json({ alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

// DELETE - Delete alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if alert belongs to user
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    await prisma.priceAlert.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
