import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    exchangeRate: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock fetch for external API
global.fetch = vi.fn();

describe("Currency Converter Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getExchangeRates", () => {
    it("should return exchange rates from database", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getExchangeRates } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([
        { fromCurrency: Currency.SAR, toCurrency: Currency.USD, rate: 0.27, updatedAt: new Date() },
        { fromCurrency: Currency.EGP, toCurrency: Currency.USD, rate: 0.032, updatedAt: new Date() },
      ] as any);

      const rates = await getExchangeRates(Currency.USD);

      expect(rates.base).toBe(Currency.USD);
      expect(rates.rates).toBeDefined();
      expect(rates.lastUpdated).toBeInstanceOf(Date);
    });

    it("should return default rates when database is empty", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getExchangeRates } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const rates = await getExchangeRates(Currency.USD);

      expect(rates.base).toBe(Currency.USD);
      expect(rates.rates[Currency.USD]).toBe(1.0);
      expect(rates.rates[Currency.SAR]).toBe(3.75);
    });

    it("should convert rates to different base currency", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getExchangeRates } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const rates = await getExchangeRates(Currency.SAR);

      expect(rates.base).toBe(Currency.SAR);
      expect(rates.rates[Currency.SAR]).toBe(1.0);
    });
  });

  describe("convertCurrency", () => {
    it("should convert between currencies", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { convertCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const result = await convertCurrency(100, Currency.USD, Currency.SAR);

      expect(result.originalAmount).toBe(100);
      expect(result.originalCurrency).toBe(Currency.USD);
      expect(result.convertedAmount).toBeGreaterThan(0);
      expect(result.targetCurrency).toBe(Currency.SAR);
      expect(result.rate).toBeGreaterThan(0);
    });

    it("should return same amount for same currency", async () => {
      const { convertCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      const result = await convertCurrency(100, Currency.USD, Currency.USD);

      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1);
    });

    it("should calculate inverse rate", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { convertCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const result = await convertCurrency(100, Currency.USD, Currency.SAR);

      expect(result.rate * result.inverseRate).toBeCloseTo(1, 2);
    });
  });

  describe("convertMultipleCurrencies", () => {
    it("should convert to multiple currencies", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { convertMultipleCurrencies } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const results = await convertMultipleCurrencies(100, Currency.USD, [
        Currency.SAR,
        Currency.EGP,
        Currency.AED,
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].targetCurrency).toBe(Currency.SAR);
      expect(results[1].targetCurrency).toBe(Currency.EGP);
      expect(results[2].targetCurrency).toBe(Currency.AED);
    });
  });

  describe("updateExchangeRates", () => {
    it("should update rates from external API", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { updateExchangeRates } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({
          rates: {
            SAR: 3.75,
            EGP: 30.9,
            AED: 3.67,
            KWD: 0.31,
          },
        }),
      } as Response);

      vi.mocked(prisma.exchangeRate.upsert).mockResolvedValue({} as any);

      const result = await updateExchangeRates();

      expect(result.success).toBe(true);
      expect(result.updated).toBeGreaterThan(0);
    });

    it("should handle API errors", async () => {
      const { updateExchangeRates } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await updateExchangeRates();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle invalid API response", async () => {
      const { updateExchangeRates } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(fetch).mockResolvedValue({
        json: async () => ({ invalid: "response" }),
      } as Response);

      const result = await updateExchangeRates();

      expect(result.success).toBe(false);
    });
  });

  describe("getRateHistory", () => {
    it("should return rate history", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getRateHistory } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const history = await getRateHistory(Currency.USD, Currency.SAR, 7);

      expect(history).toHaveLength(7);
      expect(history[0].date).toBeInstanceOf(Date);
      expect(history[0].rate).toBeGreaterThan(0);
    });
  });

  describe("formatCurrency", () => {
    it("should format with symbol", async () => {
      const { formatCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      const formatted = formatCurrency(100, Currency.USD, { showSymbol: true });

      expect(formatted).toContain("$");
      expect(formatted).toContain("100");
    });

    it("should format with code", async () => {
      const { formatCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      const formatted = formatCurrency(100, Currency.SAR, {
        showSymbol: false,
        showCode: true,
      });

      expect(formatted).toContain("SAR");
    });

    it("should format with custom decimals", async () => {
      const { formatCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      const formatted = formatCurrency(100.123, Currency.USD, { decimals: 0 });

      expect(formatted).toContain("100");
      expect(formatted).not.toContain("123");
    });
  });

  describe("getSupportedCurrencies", () => {
    it("should return all supported currencies", async () => {
      const { getSupportedCurrencies } = await import(
        "@/lib/services/currency-converter"
      );

      const currencies = getSupportedCurrencies();

      expect(currencies.length).toBe(5);
      expect(currencies.map((c) => c.code)).toContain(Currency.USD);
      expect(currencies.map((c) => c.code)).toContain(Currency.SAR);
    });

    it("should include currency metadata", async () => {
      const { getSupportedCurrencies } = await import(
        "@/lib/services/currency-converter"
      );

      const currencies = getSupportedCurrencies();
      const usd = currencies.find((c) => c.code === Currency.USD);

      expect(usd?.name).toBe("US Dollar");
      expect(usd?.symbol).toBe("$");
      expect(usd?.flag).toBeDefined();
    });
  });

  describe("getCurrencyForCountry", () => {
    it("should return correct currency for country", async () => {
      const { getCurrencyForCountry } = await import(
        "@/lib/services/currency-converter"
      );

      expect(getCurrencyForCountry("SA")).toBe(Currency.SAR);
      expect(getCurrencyForCountry("EG")).toBe(Currency.EGP);
      expect(getCurrencyForCountry("AE")).toBe(Currency.AED);
    });

    it("should return USD for unknown country", async () => {
      const { getCurrencyForCountry } = await import(
        "@/lib/services/currency-converter"
      );

      expect(getCurrencyForCountry("XX")).toBe(Currency.USD);
    });
  });

  describe("getPriceInUserCurrency", () => {
    it("should convert price to user currency", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { getPriceInUserCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const result = await getPriceInUserCurrency(
        100,
        Currency.USD,
        Currency.SAR
      );

      expect(result.originalPrice).toBe(100);
      expect(result.originalCurrency).toBe(Currency.USD);
      expect(result.convertedPrice).toBeGreaterThan(0);
      expect(result.userCurrency).toBe(Currency.SAR);
      expect(result.formattedConverted).toBeDefined();
    });

    it("should return same price for same currency", async () => {
      const { getPriceInUserCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      const result = await getPriceInUserCurrency(
        100,
        Currency.USD,
        Currency.USD
      );

      expect(result.convertedPrice).toBe(100);
    });
  });

  describe("comparePricesInCurrency", () => {
    it("should compare prices across currencies", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { comparePricesInCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const prices = [
        { amount: 100, currency: Currency.USD, storeName: "Amazon" },
        { amount: 380, currency: Currency.SAR, storeName: "Noon" },
        { amount: 3100, currency: Currency.EGP, storeName: "Jumia" },
      ];

      const compared = await comparePricesInCurrency(prices, Currency.USD);

      expect(compared).toHaveLength(3);
      expect(compared[0].isCheapest).toBe(true);
      expect(compared[0].convertedAmount).toBeLessThanOrEqual(
        compared[1].convertedAmount
      );
    });

    it("should sort by converted price", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { comparePricesInCurrency } = await import(
        "@/lib/services/currency-converter"
      );

      vi.mocked(prisma.exchangeRate.findMany).mockResolvedValue([]);

      const prices = [
        { amount: 200, currency: Currency.USD, storeName: "Expensive" },
        { amount: 50, currency: Currency.USD, storeName: "Cheap" },
      ];

      const compared = await comparePricesInCurrency(prices, Currency.USD);

      expect(compared[0].storeName).toBe("Cheap");
      expect(compared[1].storeName).toBe("Expensive");
    });
  });
});

describe("Currency Constants", () => {
  it("should have CURRENCY_INFO for all currencies", async () => {
    const { CURRENCY_INFO } = await import(
      "@/lib/services/currency-converter"
    );

    expect(CURRENCY_INFO[Currency.USD]).toBeDefined();
    expect(CURRENCY_INFO[Currency.SAR]).toBeDefined();
    expect(CURRENCY_INFO[Currency.EGP]).toBeDefined();
    expect(CURRENCY_INFO[Currency.AED]).toBeDefined();
    expect(CURRENCY_INFO[Currency.KWD]).toBeDefined();
  });
});
