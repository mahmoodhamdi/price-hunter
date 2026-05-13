import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecureToken } from "@/lib/security";

/**
 * Wishlist sharing endpoints (Phase 6 — viral mechanic).
 *
 *   POST /api/wishlist/share   → generate or rotate the share token
 *   GET  /api/wishlist/share   → fetch the current token (if any)
 *   DELETE /api/wishlist/share → revoke sharing
 *
 * Public view lives at /share/wishlist/<token>. The token is the only
 * credential, so this is a "soft" share — anyone with the link can see.
 */

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = generateSecureToken(24);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { wishlistShareToken: token },
  });

  return NextResponse.json({
    token,
    url: `/share/wishlist/${token}`,
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { wishlistShareToken: true },
  });

  return NextResponse.json({
    token: user?.wishlistShareToken ?? null,
    url: user?.wishlistShareToken
      ? `/share/wishlist/${user.wishlistShareToken}`
      : null,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { wishlistShareToken: null },
  });

  return NextResponse.json({ ok: true });
}
