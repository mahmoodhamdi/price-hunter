import type { Country, Currency } from "@prisma/client";
import type { StoreSlug } from "@/lib/scrapers";

export type VerticalSlug =
  | "general"
  | "electronics"
  | "fashion"
  | "grocery"
  | "pharma";

export type CountrySlug = "ksa" | "eg" | "uae" | "all";

export type EditionSlug = `${CountrySlug}-${VerticalSlug}`;

export interface VerticalConfig {
  slug: VerticalSlug;
  name: { en: string; ar: string };
  tagline: { en: string; ar: string };
  categories: string[];
  primaryColor: string;
  accentColor: string;
  defaultStores: StoreSlug[];
  heroEmoji: string;
}

export interface CountryConfig {
  slug: CountrySlug;
  countries: Country[];
  name: { en: string; ar: string };
  defaultLocale: "en" | "ar";
  defaultCurrency: Currency;
  stores: StoreSlug[];
  phonePrefix: string;
  flagEmoji: string;
}

export interface EditionConfig {
  slug: EditionSlug;
  vertical: VerticalConfig;
  country: CountryConfig;
  name: { en: string; ar: string };
  stores: StoreSlug[];
  categories: string[];
  basePrice: number;
  pricingTier:
    | "single-sku"
    | "country-bundle"
    | "vertical-bundle"
    | "regional";
}
