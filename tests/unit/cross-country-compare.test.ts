import { describe, it, expect } from "vitest";
import { maxSavingsPercent, type CrossCountryQuote } from "@/lib/services/cross-country-compare";

const baseQuote: Omit<CrossCountryQuote, "country" | "usdPrice" | "localPrice" | "currency"> = {
  countryName: "X",
  flag: "🌍",
  storeName: "Store",
  storeSlug: "store",
  url: "https://example.com",
  inStock: true,
};

describe("maxSavingsPercent", () => {
  it("returns 0 with fewer than 2 quotes", () => {
    expect(maxSavingsPercent([])).toBe(0);
    expect(
      maxSavingsPercent([
        { ...baseQuote, country: "SA", currency: "SAR", localPrice: 1000, usdPrice: 270 },
      ])
    ).toBe(0);
  });

  it("computes percentage from cheapest to dearest", () => {
    const quotes: CrossCountryQuote[] = [
      { ...baseQuote, country: "EG", currency: "EGP", localPrice: 4000, usdPrice: 80 },
      { ...baseQuote, country: "SA", currency: "SAR", localPrice: 400, usdPrice: 100 },
      { ...baseQuote, country: "AE", currency: "AED", localPrice: 400, usdPrice: 110 },
    ];
    // Cheapest 80, dearest 110 → 27%
    expect(maxSavingsPercent(quotes)).toBe(27);
  });

  it("handles zero dearest price without dividing by zero", () => {
    const quotes: CrossCountryQuote[] = [
      { ...baseQuote, country: "EG", currency: "EGP", localPrice: 0, usdPrice: 0 },
      { ...baseQuote, country: "SA", currency: "SAR", localPrice: 0, usdPrice: 0 },
    ];
    expect(maxSavingsPercent(quotes)).toBe(0);
  });
});
