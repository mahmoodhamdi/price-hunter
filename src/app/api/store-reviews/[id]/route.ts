import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  deleteStoreReview,
  markReviewHelpful,
  reportReview,
  getStoreReviewStats,
  getUserStoreReview,
} from "@/lib/services/store-reviews";

// GET /api/store-reviews/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    // Get store statistics
    if (type === "stats") {
      const stats = await getStoreReviewStats(id);

      if (!stats) {
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(stats);
    }

    // Get user's review for a store
    if (type === "user-review") {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const review = await getUserStoreReview(session.user.id, id);
      return NextResponse.json({ review });
    }

    return NextResponse.json(
      { error: "Invalid type parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching store review:", error);
    return NextResponse.json(
      { error: "Failed to fetch store review" },
      { status: 500 }
    );
  }
}

// DELETE /api/store-reviews/[id]
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

    const deleted = await deleteStoreReview(session.user.id, id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Review not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting store review:", error);
    return NextResponse.json(
      { error: "Failed to delete store review" },
      { status: 500 }
    );
  }
}

// PATCH /api/store-reviews/[id]
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
    const body = await request.json();
    const { action, reason } = body;

    if (action === "helpful") {
      const result = await markReviewHelpful(session.user.id, id);
      return NextResponse.json(result);
    }

    if (action === "report") {
      if (!reason) {
        return NextResponse.json(
          { error: "Reason is required for report" },
          { status: 400 }
        );
      }
      const reported = await reportReview(session.user.id, id, reason);
      return NextResponse.json({ success: reported });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating store review:", error);
    return NextResponse.json(
      { error: "Failed to update store review" },
      { status: 500 }
    );
  }
}
