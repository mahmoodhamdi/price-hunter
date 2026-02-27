import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Resend module - must use a proper constructor function
const mockSend = vi.fn().mockResolvedValue({ id: "email-1" });
vi.mock("resend", () => {
  function ResendMock() {
    return { emails: { send: mockSend } };
  }
  return { Resend: ResendMock };
});

describe("Email Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("generatePriceAlertEmail", () => {
    it("should generate valid HTML with product details", async () => {
      const { generatePriceAlertEmail } = await import("@/lib/notifications/email");

      const html = generatePriceAlertEmail({
        productName: "iPhone 15 Pro",
        productUrl: "https://amazon.sa/dp/123",
        currentPrice: 3499.99,
        targetPrice: 3999.99,
        currency: "SAR",
        storeName: "Amazon SA",
      });

      expect(html).toContain("iPhone 15 Pro");
      expect(html).toContain("3499.99");
      expect(html).toContain("3999.99");
      expect(html).toContain("SAR");
      expect(html).toContain("Amazon SA");
      expect(html).toContain("https://amazon.sa/dp/123");
      expect(html).toContain("Price Alert");
    });

    it("should include proper HTML structure", async () => {
      const { generatePriceAlertEmail } = await import("@/lib/notifications/email");

      const html = generatePriceAlertEmail({
        productName: "Test",
        productUrl: "https://example.com",
        currentPrice: 100,
        targetPrice: 150,
        currency: "USD",
        storeName: "Store",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html>");
      expect(html).toContain("</html>");
    });
  });

  describe("generateWelcomeEmail", () => {
    it("should include user name", async () => {
      const { generateWelcomeEmail } = await import("@/lib/notifications/email");

      const html = generateWelcomeEmail("John Doe");
      expect(html).toContain("John Doe");
      expect(html).toContain("Welcome to Price Hunter");
    });

    it("should include feature descriptions", async () => {
      const { generateWelcomeEmail } = await import("@/lib/notifications/email");

      const html = generateWelcomeEmail("Test User");
      expect(html).toContain("compare prices");
      expect(html).toContain("price alerts");
      expect(html).toContain("price history");
      expect(html).toContain("wishlist");
    });
  });

  describe("sendEmail", () => {
    it("should return false when Resend not configured", async () => {
      // When RESEND_API_KEY is not set, sendEmail returns false
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const { sendEmail } = await import("@/lib/notifications/email");

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
      expect(result).toBe(false);

      process.env.RESEND_API_KEY = origKey;
    });

    it("should send email when Resend is configured", async () => {
      process.env.RESEND_API_KEY = "re_test_key";

      const { sendEmail } = await import("@/lib/notifications/email");

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Price Alert",
        html: "<h1>Price dropped!</h1>",
      });
      expect(result).toBe(true);
    });
  });
});

describe("Telegram Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("sendTelegramMessage", () => {
    it("should return false when bot token not configured", async () => {
      const originalToken = process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_BOT_TOKEN;

      const { sendTelegramMessage } = await import("@/lib/notifications/telegram");

      const result = await sendTelegramMessage({
        chatId: "123",
        text: "test",
      });
      expect(result).toBe(false);

      process.env.TELEGRAM_BOT_TOKEN = originalToken;
    });

    it("should return false when bot token is placeholder", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "your-telegram-bot-token";

      const { sendTelegramMessage } = await import("@/lib/notifications/telegram");

      const result = await sendTelegramMessage({
        chatId: "123",
        text: "test",
      });
      expect(result).toBe(false);
    });

    it("should send message when token is configured", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGhIJKlmnOPQRsTUVwxyZ";
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      } as Response);

      const { sendTelegramMessage } = await import("@/lib/notifications/telegram");

      const result = await sendTelegramMessage({
        chatId: "chat-123",
        text: "Hello!",
      });

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("sendMessage"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("chat-123"),
        })
      );
    });

    it("should return false on API error", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGhIJKlmnOPQRsTUVwxyZ";
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "bad request" }),
      } as Response);

      const { sendTelegramMessage } = await import("@/lib/notifications/telegram");

      const result = await sendTelegramMessage({
        chatId: "123",
        text: "test",
      });
      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGhIJKlmnOPQRsTUVwxyZ";
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const { sendTelegramMessage } = await import("@/lib/notifications/telegram");

      const result = await sendTelegramMessage({
        chatId: "123",
        text: "test",
      });
      expect(result).toBe(false);
    });
  });

  describe("generatePriceAlertTelegramMessage", () => {
    it("should generate message with product details", async () => {
      const { generatePriceAlertTelegramMessage } = await import(
        "@/lib/notifications/telegram"
      );

      const msg = generatePriceAlertTelegramMessage({
        productName: "iPhone 15",
        productUrl: "https://amazon.sa/dp/123",
        currentPrice: 3499.99,
        targetPrice: 3999.99,
        currency: "SAR",
        storeName: "Amazon SA",
      });

      expect(msg).toContain("iPhone 15");
      expect(msg).toContain("3499.99");
      expect(msg).toContain("3999.99");
      expect(msg).toContain("SAR");
      expect(msg).toContain("Amazon SA");
      expect(msg).toContain("Price Alert");
    });
  });

  describe("generateWelcomeTelegramMessage", () => {
    it("should include user name", async () => {
      const { generateWelcomeTelegramMessage } = await import(
        "@/lib/notifications/telegram"
      );

      const msg = generateWelcomeTelegramMessage("John");
      expect(msg).toContain("John");
      expect(msg).toContain("Welcome to Price Hunter");
    });
  });
});
