import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  country: z.enum(["SA", "EG", "AE", "KW"]).optional().default("SA"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, country } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Determine currency based on country
    const currencyMap: Record<string, "SAR" | "EGP" | "AED" | "KWD"> = {
      SA: "SAR",
      EG: "EGP",
      AE: "AED",
      KW: "KWD",
    };

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        country: country as "SA" | "EG" | "AE" | "KW",
        currency: currencyMap[country] || "SAR",
      },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        currency: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
