import { describe, it, expect } from "vitest";
import {
  cn,
  formatPrice,
  slugify,
  calculateDiscount,
  truncate,
  isValidUrl,
  extractDomain,
  getInitials,
} from "@/lib/utils";

describe("cn (className merge)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});

describe("formatPrice", () => {
  it("should format price with SAR currency", () => {
    const result = formatPrice(100, "SAR", "en");
    expect(result).toContain("100");
    expect(result).toContain("SAR");
  });

  it("should format price with EGP currency", () => {
    const result = formatPrice(1500, "EGP", "en");
    expect(result).toContain("1,500");
  });

  it("should handle decimal values", () => {
    const result = formatPrice(99.99, "USD", "en");
    expect(result).toContain("99.99");
  });
});

describe("slugify", () => {
  it("should convert text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should handle special characters", () => {
    expect(slugify("Product Name!@#$%")).toBe("product-name");
  });

  it("should handle multiple spaces", () => {
    expect(slugify("Multiple   Spaces")).toBe("multiple-spaces");
  });

  it("should trim leading and trailing dashes", () => {
    expect(slugify(" -Test- ")).toBe("test");
  });
});

describe("calculateDiscount", () => {
  it("should calculate discount percentage", () => {
    expect(calculateDiscount(100, 75)).toBe(25);
  });

  it("should return 0 for same prices", () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });

  it("should return 0 for zero original price", () => {
    expect(calculateDiscount(0, 50)).toBe(0);
  });

  it("should round to nearest integer", () => {
    expect(calculateDiscount(100, 66.67)).toBe(33);
  });
});

describe("truncate", () => {
  it("should truncate long strings", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
  });

  it("should not truncate short strings", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });

  it("should handle exact length", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });
});

describe("isValidUrl", () => {
  it("should return true for valid URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://test.com/path")).toBe(true);
  });

  it("should return false for invalid URLs", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("example.com")).toBe(false);
  });
});

describe("extractDomain", () => {
  it("should extract domain from URL", () => {
    expect(extractDomain("https://www.amazon.sa/product/123")).toBe(
      "amazon.sa"
    );
  });

  it("should remove www prefix", () => {
    expect(extractDomain("https://www.noon.com")).toBe("noon.com");
  });

  it("should return null for invalid URLs", () => {
    expect(extractDomain("not a url")).toBe(null);
  });
});

describe("getInitials", () => {
  it("should get initials from name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("should handle single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("should limit to 2 characters", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });
});
