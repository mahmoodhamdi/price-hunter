import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

describe("Auth API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("POST /api/auth/forgot-password", () => {
    it("should return success for valid email", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { POST } = await import("@/app/api/auth/forgot-password/route");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
    });

    it("should return success even for non-existent email (security)", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { POST } = await import("@/app/api/auth/forgot-password/route");

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "nonexistent@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
    });

    it("should return 400 when email is missing", async () => {
      const { POST } = await import("@/app/api/auth/forgot-password/route");

      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should generate reset token for valid user", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { POST } = await import("@/app/api/auth/forgot-password/route");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user1" },
          data: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExpiry: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("GET /api/auth/verify-reset-token", () => {
    it("should return valid: true for valid token", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/auth/verify-reset-token/route");

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
        resetToken: "valid_token",
        resetTokenExpiry: new Date(Date.now() + 3600000),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/auth/verify-reset-token?token=valid_token"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(true);
    });

    it("should return valid: false for invalid token", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { GET } = await import("@/app/api/auth/verify-reset-token/route");

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/auth/verify-reset-token?token=invalid_token"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(false);
    });

    it("should return valid: false when token is missing", async () => {
      const { GET } = await import("@/app/api/auth/verify-reset-token/route");

      const request = new NextRequest(
        "http://localhost:3000/api/auth/verify-reset-token"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.valid).toBe(false);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("should reset password with valid token", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { POST } = await import("@/app/api/auth/reset-password/route");
      const { hashToken } = await import("@/lib/security");

      // The token is hashed before comparison
      const plainToken = "valid_token_abc123";
      const hashedToken = hashToken(plainToken);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 3600000),
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: plainToken,
          // Password must meet strength requirements: uppercase, lowercase, number, 8+ chars
          password: "NewPassword123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBeDefined();
    });

    it("should return 400 for invalid token", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { POST } = await import("@/app/api/auth/reset-password/route");

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "invalid_token",
          password: "newpassword123",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 when token is missing", async () => {
      const { POST } = await import("@/app/api/auth/reset-password/route");

      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ password: "newpassword123" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 when password is too short", async () => {
      const { POST } = await import("@/app/api/auth/reset-password/route");

      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "valid_token",
          password: "short",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should clear reset token after successful reset", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { POST } = await import("@/app/api/auth/reset-password/route");
      const { hashToken } = await import("@/lib/security");

      // The token is hashed before comparison
      const plainToken = "valid_token_xyz789";
      const hashedToken = hashToken(plainToken);

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 3600000),
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: plainToken,
          // Password must meet strength requirements
          password: "SecurePass123",
        }),
      });

      await POST(request);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetToken: null,
            resetTokenExpiry: null,
          }),
        })
      );
    });
  });
});
