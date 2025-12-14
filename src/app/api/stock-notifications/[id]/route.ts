import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  deleteStockNotification,
  toggleStockNotification,
  getStockStatus,
} from "@/lib/services/stock-notifications";

// GET /api/stock-notifications/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    if (type === "status") {
      const status = await getStockStatus(id);

      if (!status) {
        return NextResponse.json(
          { error: "Store product not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(status);
    }

    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching stock notification:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock notification" },
      { status: 500 }
    );
  }
}

// PATCH /api/stock-notifications/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const notification = await toggleStockNotification(session.user.id, id);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Error toggling stock notification:", error);
    return NextResponse.json(
      { error: "Failed to toggle stock notification" },
      { status: 500 }
    );
  }
}

// DELETE /api/stock-notifications/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const deleted = await deleteStockNotification(session.user.id, id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock notification:", error);
    return NextResponse.json(
      { error: "Failed to delete stock notification" },
      { status: 500 }
    );
  }
}
