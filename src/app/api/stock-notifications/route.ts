import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getStockNotifications,
  createStockNotification,
  getStockNotificationStats,
  getOutOfStockWishlistItems,
} from "@/lib/services/stock-notifications";

// GET /api/stock-notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    if (type === "stats") {
      const stats = await getStockNotificationStats(session.user.id);
      return NextResponse.json(stats);
    }

    if (type === "out-of-stock-wishlist") {
      const items = await getOutOfStockWishlistItems(session.user.id);
      return NextResponse.json({ items });
    }

    const notifications = await getStockNotifications(session.user.id);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching stock notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock notifications" },
      { status: 500 }
    );
  }
}

// POST /api/stock-notifications
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
    const { storeProductId, notifyEmail, notifyPush } = body;

    if (!storeProductId) {
      return NextResponse.json(
        { error: "storeProductId is required" },
        { status: 400 }
      );
    }

    const notification = await createStockNotification({
      userId: session.user.id,
      storeProductId,
      notifyEmail,
      notifyPush,
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Store product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("Error creating stock notification:", error);
    return NextResponse.json(
      { error: "Failed to create stock notification" },
      { status: 500 }
    );
  }
}
