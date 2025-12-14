import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getShoppingList,
  updateShoppingList,
  deleteShoppingList,
  getShoppingListSummary,
  copyShoppingList,
  shareShoppingList,
} from "@/lib/services/shopping-list";

// GET /api/shopping-lists/[id] - Get a shopping list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeSummary = searchParams.get("summary") === "true";

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (includeSummary) {
      const summary = await getShoppingListSummary(id, userId);
      if (!summary) {
        return NextResponse.json(
          { error: "Shopping list not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ summary });
    }

    const list = await getShoppingList(id, userId);

    if (!list) {
      return NextResponse.json(
        { error: "Shopping list not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ list });
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping list" },
      { status: 500 }
    );
  }
}

// PATCH /api/shopping-lists/[id] - Update a shopping list
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
    const { name, description, isPublic } = body;

    const list = await updateShoppingList(session.user.id, id, {
      name,
      description,
      isPublic,
    });

    if (!list) {
      return NextResponse.json(
        { error: "Shopping list not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ list });
  } catch (error) {
    console.error("Error updating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to update shopping list" },
      { status: 500 }
    );
  }
}

// DELETE /api/shopping-lists/[id] - Delete a shopping list
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
    const deleted = await deleteShoppingList(session.user.id, id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Shopping list not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping list:", error);
    return NextResponse.json(
      { error: "Failed to delete shopping list" },
      { status: 500 }
    );
  }
}

// POST /api/shopping-lists/[id] - Copy or share a shopping list
export async function POST(
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
    const { action, newName } = body;

    if (action === "copy") {
      const list = await copyShoppingList(id, session.user.id, newName);

      if (!list) {
        return NextResponse.json(
          { error: "Shopping list not found or not accessible" },
          { status: 404 }
        );
      }

      return NextResponse.json({ list }, { status: 201 });
    }

    if (action === "share") {
      const result = await shareShoppingList(session.user.id, id);

      if (!result) {
        return NextResponse.json(
          { error: "Shopping list not found or not authorized" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'copy' or 'share'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing shopping list action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
