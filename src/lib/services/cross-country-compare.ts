import { prisma } from "@/lib/prisma";
import type { Country, Currency } from "@prisma/client";

/**
 * Cross-country price compare (Phase 6 differentiation).
 *
 * For a given product, returns the lowest price available in each
 * country alongside the USD-normalised price for direct comparison.
 *
 * Use case: a Saudi shopper considering a phone can see whether buying
 * it in the UAE saves money once shipping is included. The component
 * that consumes this should add a friendly "shipping varies" note.
 */

export interface CrossCountryQuote {
  country: Country;
  countryName: string;
  flag: string;
  currency: Currency;
  localPrice: number;
  usdPrice: number;
  storeName: string;
  storeSlug: string;
  url: string;
  inStock: boolean;
}

const COUNTRY_META: Record<Country, { name: string; flag: string }> = {
  SA: { name: "Saudi Arabia", flag: "🇸🇦" },
  EG: { name: "Egypt", flag: "🇪🇬" },
  AE: { name: "United Arab Emirates", flag: "🇦🇪" },
  KW: { name: "Kuwait", flag: "🇰🇼" },
};

/**
 * For a product slug, return one CrossCountryQuote per country in which
 * the product is listed. Sorted ascending by USD price so the cheapest
 * appears first.
 */
export async function getCrossCountryQuotes(
  productSlug: string
): Promise<CrossCountryQuote[]> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: {
      id: true,
      storeProducts: {
        where: { store: { isActive: true } },
        include: { store: true },
        orderBy: { priceUSD: "asc" },
      },
    },
  });

  if (!product) return [];

  // For each country pick the cheapest in-stock listing (fall back to
  // any listing if nothing's in stock).
  const byCountry = new Map<Country, CrossCountryQuote>();
  for (const sp of product.storeProducts) {
    const country = sp.store.country;
    const candidate: CrossCountryQuote = {
      country,
      countryName: COUNTRY_META[country]?.name ?? country,
      flag: COUNTRY_META[country]?.flag ?? "🌍",
      currency: sp.currency,
      localPrice: Number(sp.price),
      usdPrice: Number(sp.priceUSD),
      storeName: sp.store.name,
      storeSlug: sp.store.slug,
      url: sp.url,
      inStock: sp.inStock,
    };
    const existing = byCountry.get(country);
    if (!existing) {
      byCountry.set(country, candidate);
      continue;
    }
    // Prefer in-stock over OOS; among same stock status, prefer cheaper USD.
    if (!existing.inStock && candidate.inStock) {
      byCountry.set(country, candidate);
    } else if (
      existing.inStock === candidate.inStock &&
      candidate.usdPrice < existing.usdPrice
    ) {
      byCountry.set(country, candidate);
    }
  }

  return Array.from(byCountry.values()).sort((a, b) => a.usdPrice - b.usdPrice);
}

/**
 * Returns the percentage savings between the cheapest and most expensive
 * country quotes. Returns 0 when fewer than 2 quotes exist.
 */
export function maxSavingsPercent(quotes: CrossCountryQuote[]): number {
  if (quotes.length < 2) return 0;
  const cheapest = quotes[0].usdPrice;
  const dearest = quotes[quotes.length - 1].usdPrice;
  if (dearest <= 0) return 0;
  return Math.round(((dearest - cheapest) / dearest) * 100);
}
