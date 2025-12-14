import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserShoppingLists,
  createShoppingList,
  getPublicShoppingLists,
} from "@/lib/services/shopping-list";

// GET /api/shopping-lists - Get user's shopping lists or public lists
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const publicOnly = searchParams.get("public") === "true";

    if (publicOnly) {
      const limit = parseInt(searchParams.get("limit") || "10");
      const lists = await getPublicShoppingLists(limit);
      return NextResponse.json({ lists });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const lists = await getUserShoppingLists(session.user.id);
    return NextResponse.json({ lists });
  } catch (error) {
    console.error("Error fetching shopping lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping lists" },
      { status: 500 }
    );
  }
}

// POST /api/shopping-lists - Create a new shopping list
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
    const { name, description, isPublic } = body;

    if (!name) {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    const list = await createShoppingList({
      userId: session.user.id,
      name,
      description,
      isPublic,
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    console.error("Error creating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to create shopping list" },
      { status: 500 }
    );
  }
}
