import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  generateSecureToken,
  hashToken,
  normalizeEmail,
  isValidEmail,
  createEmailRateLimitKey,
} from "@/lib/security";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate limit by IP
    const ipLimit = checkRateLimit(
      `forgot-password:ip:${ip}`,
      RATE_LIMITS.AUTH_FORGOT_PASSWORD
    );
    if (!ipLimit.success) {
      return rateLimitResponse(ipLimit.resetTime);
    }

    const body = await request.json();

    // Validate input
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(result.data.email);

    // Rate limit by email (to prevent targeted attacks)
    const emailLimit = checkRateLimit(
      `forgot-password:${createEmailRateLimitKey(email)}`,
      { windowMs: 60 * 60 * 1000, max: 3 } // 3 per hour per email
    );
    if (!emailLimit.success) {
      // Still return success message to prevent enumeration
      return NextResponse.json({
        message: "If an account with that email exists, we sent a reset link",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, we sent a reset link",
      });
    }

    // Generate reset token
    const resetToken = generateSecureToken(32);
    const hashedToken = hashToken(resetToken);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save HASHED token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // Build reset URL (token is NOT hashed - user receives plain token)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // In development, log a hint (not the actual token)
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Password reset requested for ${email}`);
    }

    // TODO: Implement email sending
    // await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json({
      message: "If an account with that email exists, we sent a reset link",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
