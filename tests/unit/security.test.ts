import { describe, it, expect } from "vitest";
import {
  isAllowedScrapeDomain,
  ALLOWED_SCRAPE_DOMAINS,
  sanitizeUrl,
  isSafeRedirectUrl,
  sanitizeText,
  sanitizeTextArray,
  sanitizeSearchQuery,
  hashToken,
  generateSecureToken,
  generateApiKey,
  hashIpAddress,
  isValidEmail,
  normalizeEmail,
  checkPasswordStrength,
  validateNumericBounds,
  isUrl,
  createEmailRateLimitKey,
} from "@/lib/security";

describe("isAllowedScrapeDomain", () => {
  it("should allow all valid store domains", () => {
    const testUrls = [
      "https://www.amazon.sa/dp/B09V3KXJPB",
      "https://www.amazon.eg/dp/B09V3KXJPB",
      "https://www.amazon.ae/dp/B09V3KXJPB",
      "https://www.amazon.com/dp/B09V3KXJPB",
      "https://www.noon.com/saudi-en/product/123",
      "https://www.jarir.com/sa-en/product/123",
      "https://www.extra.com/sa-en/product/123",
      "https://www.jumia.com.eg/product/123",
      "https://www.jumia.com/product/123",
      "https://www.btech.com/en/product/123",
      "https://www.sharafdg.com/product/123",
      "https://www.carrefour.com/product/123",
      "https://www.lulu.com/product/123",
      "https://www.xcite.com/product/123",
      "https://www.2b.com.sa/product/123",
    ];
    testUrls.forEach((url) => {
      expect(isAllowedScrapeDomain(url)).toBe(true);
    });
  });

  it("should allow subdomains of allowed domains", () => {
    expect(isAllowedScrapeDomain("https://shop.amazon.sa/item")).toBe(true);
    expect(isAllowedScrapeDomain("https://m.noon.com/product")).toBe(true);
  });

  it("should reject unknown domains", () => {
    expect(isAllowedScrapeDomain("https://evil.com/product")).toBe(false);
    expect(isAllowedScrapeDomain("https://google.com")).toBe(false);
    expect(isAllowedScrapeDomain("https://phishing-amazon.sa.evil.com")).toBe(false);
  });

  it("should reject invalid URLs", () => {
    expect(isAllowedScrapeDomain("not a url")).toBe(false);
    expect(isAllowedScrapeDomain("")).toBe(false);
  });

  it("should reject javascript: URLs", () => {
    expect(isAllowedScrapeDomain("javascript:alert(1)")).toBe(false);
  });

  it("should have at least 14 allowed domains", () => {
    expect(ALLOWED_SCRAPE_DOMAINS.length).toBeGreaterThanOrEqual(14);
  });
});

describe("sanitizeUrl", () => {
  it("should accept valid http URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("should accept valid https URLs", () => {
    expect(sanitizeUrl("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1"
    );
  });

  it("should reject ftp URLs", () => {
    expect(sanitizeUrl("ftp://files.example.com")).toBeNull();
  });

  it("should reject javascript: URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("should return null for invalid URLs", () => {
    expect(sanitizeUrl("not a url")).toBeNull();
    expect(sanitizeUrl("")).toBeNull();
  });
});

describe("isUrl", () => {
  it("should return true for valid http/https URLs", () => {
    expect(isUrl("https://example.com")).toBe(true);
    expect(isUrl("http://example.com/path")).toBe(true);
  });

  it("should return false for non-URLs", () => {
    expect(isUrl("not a url")).toBe(false);
    expect(isUrl("ftp://files.com")).toBe(false);
  });
});

describe("isSafeRedirectUrl", () => {
  it("should allow relative paths", () => {
    expect(isSafeRedirectUrl("/dashboard")).toBe(true);
    expect(isSafeRedirectUrl("/login?next=/dashboard")).toBe(true);
  });

  it("should reject absolute URLs", () => {
    expect(isSafeRedirectUrl("https://evil.com")).toBe(false);
    expect(isSafeRedirectUrl("http://evil.com")).toBe(false);
  });

  it("should reject protocol-relative URLs", () => {
    expect(isSafeRedirectUrl("//evil.com")).toBe(false);
  });

  it("should reject javascript: URLs encoded as paths", () => {
    expect(isSafeRedirectUrl("/javascript:alert(1)")).toBe(false);
  });
});

describe("sanitizeText", () => {
  it("should strip HTML tags", () => {
    expect(sanitizeText("<script>alert('xss')</script>")).toBe(
      "alert(&#x27;xss&#x27;)"
    );
    expect(sanitizeText("<b>bold</b>")).toBe("bold");
  });

  it("should escape special characters", () => {
    const result = sanitizeText('Hello & "world" <test>');
    expect(result).not.toContain("<test>");
    expect(result).toContain("&amp;");
    expect(result).toContain("&quot;");
  });

  it("should trim whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("should handle empty input", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("should handle falsy input", () => {
    expect(sanitizeText(null as unknown as string)).toBe("");
    expect(sanitizeText(undefined as unknown as string)).toBe("");
  });
});

describe("sanitizeTextArray", () => {
  it("should sanitize all strings and filter empty", () => {
    const result = sanitizeTextArray(["<b>hello</b>", "", "world"]);
    expect(result).toEqual(["hello", "world"]);
  });
});

describe("sanitizeSearchQuery", () => {
  it("should remove angle brackets", () => {
    expect(sanitizeSearchQuery("<script>test</script>")).toBe("scripttest/script");
  });

  it("should normalize whitespace", () => {
    expect(sanitizeSearchQuery("multiple   spaces   here")).toBe("multiple spaces here");
  });

  it("should limit to 200 characters", () => {
    const longQuery = "a".repeat(300);
    expect(sanitizeSearchQuery(longQuery).length).toBe(200);
  });

  it("should trim", () => {
    expect(sanitizeSearchQuery("  test  ")).toBe("test");
  });
});

describe("hashToken", () => {
  it("should return consistent hash for same input", () => {
    const hash1 = hashToken("my-token");
    const hash2 = hashToken("my-token");
    expect(hash1).toBe(hash2);
  });

  it("should return different hashes for different inputs", () => {
    const hash1 = hashToken("token-a");
    const hash2 = hashToken("token-b");
    expect(hash1).not.toBe(hash2);
  });

  it("should return 64 character hex string", () => {
    const hash = hashToken("test");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("generateSecureToken", () => {
  it("should generate unique tokens", () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toBe(token2);
  });

  it("should generate 64 char hex by default (32 bytes)", () => {
    const token = generateSecureToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should respect custom byte length", () => {
    const token = generateSecureToken(16);
    expect(token).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("generateApiKey", () => {
  it("should have ph_ prefix by default", () => {
    const key = generateApiKey();
    expect(key.startsWith("ph_")).toBe(true);
  });

  it("should use custom prefix", () => {
    const key = generateApiKey("test");
    expect(key.startsWith("test_")).toBe(true);
  });

  it("should generate unique keys", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

describe("hashIpAddress", () => {
  it("should return consistent hash for same IP and salt", () => {
    const hash1 = hashIpAddress("192.168.1.1", "salt");
    const hash2 = hashIpAddress("192.168.1.1", "salt");
    expect(hash1).toBe(hash2);
  });

  it("should return different hashes for different IPs", () => {
    const hash1 = hashIpAddress("192.168.1.1", "salt");
    const hash2 = hashIpAddress("192.168.1.2", "salt");
    expect(hash1).not.toBe(hash2);
  });

  it("should return different hashes for different salts", () => {
    const hash1 = hashIpAddress("192.168.1.1", "salt-a");
    const hash2 = hashIpAddress("192.168.1.1", "salt-b");
    expect(hash1).not.toBe(hash2);
  });

  it("should throw when salt is empty", () => {
    expect(() => hashIpAddress("192.168.1.1", "")).toThrow("IP salt is required");
  });
});

describe("isValidEmail", () => {
  it("should accept valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user+tag@example.com")).toBe(true);
    expect(isValidEmail("user@sub.domain.com")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("should lowercase and trim", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("checkPasswordStrength", () => {
  it("should accept strong passwords", () => {
    const result = checkPasswordStrength("Admin123!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject short passwords", () => {
    const result = checkPasswordStrength("Ab1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters");
  });

  it("should require uppercase", () => {
    const result = checkPasswordStrength("abcdefg1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter"
    );
  });

  it("should require lowercase", () => {
    const result = checkPasswordStrength("ABCDEFG1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one lowercase letter"
    );
  });

  it("should require a number", () => {
    const result = checkPasswordStrength("Abcdefgh");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
  });

  it("should return multiple errors for very weak passwords", () => {
    const result = checkPasswordStrength("abc");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe("createEmailRateLimitKey", () => {
  it("should return consistent key for same email", () => {
    const key1 = createEmailRateLimitKey("User@Example.com");
    const key2 = createEmailRateLimitKey("user@example.com");
    expect(key1).toBe(key2);
  });

  it("should have email: prefix", () => {
    const key = createEmailRateLimitKey("test@test.com");
    expect(key.startsWith("email:")).toBe(true);
  });
});

describe("validateNumericBounds", () => {
  it("should clamp value within range", () => {
    expect(validateNumericBounds(50, 0, 100)).toBe(50);
  });

  it("should clamp to min", () => {
    expect(validateNumericBounds(-10, 0, 100)).toBe(0);
  });

  it("should clamp to max", () => {
    expect(validateNumericBounds(200, 0, 100)).toBe(100);
  });

  it("should handle exact boundaries", () => {
    expect(validateNumericBounds(0, 0, 100)).toBe(0);
    expect(validateNumericBounds(100, 0, 100)).toBe(100);
  });
});
