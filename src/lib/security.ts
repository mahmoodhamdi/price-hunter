/**
 * Security utilities for the Price Hunter application
 */

import { createHash, randomBytes } from "crypto";

// Allowed domains for scraping (prevents SSRF)
export const ALLOWED_SCRAPE_DOMAINS = [
  "amazon.sa",
  "amazon.eg",
  "amazon.ae",
  "amazon.com",
  "noon.com",
  "jarir.com",
  "extra.com",
  "jumia.com.eg",
  "jumia.com",
  "btech.com",
  "sharafdg.com",
  "carrefour.com",
  "lulu.com",
  "xcite.com",
  "2b.com.sa",
];

/**
 * Check if a URL is from an allowed domain for scraping
 */
export function isAllowedScrapeDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_SCRAPE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize a URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like a URL
 */
export function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate that a redirect URL is safe (internal only)
 */
export function isSafeRedirectUrl(url: string): boolean {
  // Only allow relative URLs starting with /
  if (!url.startsWith("/")) {
    return false;
  }
  // Prevent protocol-relative URLs
  if (url.startsWith("//")) {
    return false;
  }
  // Prevent javascript: URLs encoded as paths
  if (url.toLowerCase().includes("javascript:")) {
    return false;
  }
  return true;
}

/**
 * Sanitize user input to prevent XSS
 * For basic text fields - strips all HTML tags
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/**
 * Sanitize an array of strings
 */
export function sanitizeTextArray(inputs: string[]): string[] {
  return inputs.map(sanitizeText).filter((s) => s.length > 0);
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Generate a secure API key
 */
export function generateApiKey(prefix = "ph"): string {
  const token = randomBytes(32).toString("hex");
  return `${prefix}_${token}`;
}

/**
 * Hash an IP address for privacy-preserving storage
 */
export function hashIpAddress(ip: string, salt: string): string {
  if (!salt) {
    throw new Error("IP salt is required for hashing");
  }
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize email for consistent storage
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limit key generators
 */
export function createEmailRateLimitKey(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const hashedEmail = createHash("sha256")
    .update(normalizedEmail)
    .digest("hex")
    .slice(0, 16);
  return `email:${hashedEmail}`;
}

/**
 * Validate numeric input is within bounds
 */
export function validateNumericBounds(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 200); // Limit length
}
