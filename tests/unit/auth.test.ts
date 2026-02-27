import { describe, it, expect, vi, beforeEach } from "vitest";

// Must set env BEFORE any imports that reference it
process.env.NEXTAUTH_SECRET = "test-secret-for-testing";

// Mock prisma before importing auth
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { hashPassword, verifyPassword, authOptions } from "@/lib/auth";

describe("Auth Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const hash = await hashPassword("Admin123!");
      expect(hash).toBeDefined();
      expect(hash).not.toBe("Admin123!");
      expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
    });

    it("should produce different hashes for same password", async () => {
      const hash1 = await hashPassword("Admin123!");
      const hash2 = await hashPassword("Admin123!");
      expect(hash1).not.toBe(hash2); // different salts
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const hash = await hashPassword("Admin123!");
      const result = await verifyPassword("Admin123!", hash);
      expect(result).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const hash = await hashPassword("Admin123!");
      const result = await verifyPassword("WrongPassword1!", hash);
      expect(result).toBe(false);
    });
  });

  describe("authOptions", () => {
    it("should have JWT session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("should have 30 day max age", () => {
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it("should have /login as sign in page", () => {
      expect(authOptions.pages?.signIn).toBe("/login");
    });

    it("should have credentials provider", () => {
      expect(authOptions.providers).toHaveLength(1);
      expect(authOptions.providers[0].name).toBe("credentials");
    });

    describe("JWT callback", () => {
      it("should enrich token with user data", async () => {
        const jwtCallback = authOptions.callbacks?.jwt;
        if (!jwtCallback) throw new Error("JWT callback not found");

        const token = { sub: "user-1" };
        const user = {
          id: "user-1",
          role: "ADMIN",
          country: "SA",
          currency: "SAR",
        };

        const result = await jwtCallback({
          token,
          user: user as any,
          account: null,
          trigger: "signIn",
        } as any);

        expect(result.id).toBe("user-1");
        expect(result.role).toBe("ADMIN");
        expect(result.country).toBe("SA");
        expect(result.currency).toBe("SAR");
      });

      it("should return token unchanged when no user", async () => {
        const jwtCallback = authOptions.callbacks?.jwt;
        if (!jwtCallback) throw new Error("JWT callback not found");

        const token = { sub: "user-1", id: "user-1", role: "USER" };

        const result = await jwtCallback({
          token,
          user: undefined as any,
          account: null,
          trigger: "update",
        } as any);

        expect(result.id).toBe("user-1");
        expect(result.role).toBe("USER");
      });
    });

    describe("Session callback", () => {
      it("should extend session with token data", async () => {
        const sessionCallback = authOptions.callbacks?.session;
        if (!sessionCallback) throw new Error("Session callback not found");

        const session = { user: { name: "Test", email: "test@test.com" } };
        const token = {
          id: "user-1",
          role: "ADMIN",
          country: "SA",
          currency: "SAR",
        };

        const result = await sessionCallback({
          session: session as any,
          token: token as any,
          user: {} as any,
          trigger: "update",
          newSession: null,
        } as any);

        expect(result.user.id).toBe("user-1");
        expect(result.user.role).toBe("ADMIN");
        expect(result.user.country).toBe("SA");
        expect(result.user.currency).toBe("SAR");
      });
    });
  });
});
