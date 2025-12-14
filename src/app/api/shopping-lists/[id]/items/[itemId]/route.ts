import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  updateListItem,
  removeItemFromList,
} from "@/lib/services/shopping-list";

// PATCH /api/shopping-lists/[id]/items/[itemId] - Update item in list
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    const body = await request.json();
    const { quantity, notes, isPurchased } = body;

    const item = await updateListItem(session.user.id, itemId, {
      quantity,
      notes,
      isPurchased,
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating list item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE /api/shopping-lists/[id]/items/[itemId] - Remove item from list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    const deleted = await removeItemFromList(session.user.id, itemId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Item not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing item from list:", error);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}
