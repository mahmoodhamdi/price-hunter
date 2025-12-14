import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addItemToList } from "@/lib/services/shopping-list";

// POST /api/shopping-lists/[id]/items - Add item to list
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
    const { productId, quantity, notes } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const item = await addItemToList(session.user.id, id, {
      productId,
      quantity,
      notes,
    });

    if (!item) {
      return NextResponse.json(
        { error: "Shopping list or product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error adding item to list:", error);
    return NextResponse.json(
      { error: "Failed to add item to list" },
      { status: 500 }
    );
  }
}
