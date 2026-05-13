import type {
  CountrySlug,
  EditionConfig,
  EditionSlug,
  VerticalSlug,
} from "./types";
import type { StoreSlug } from "@/lib/scrapers";
import { COUNTRIES } from "./countries";
import { VERTICALS } from "./verticals";

function intersectStores(
  countryStores: StoreSlug[],
  verticalStores: StoreSlug[]
): StoreSlug[] {
  if (verticalStores.length === 0) return countryStores;
  const set = new Set(verticalStores);
  const result = countryStores.filter((s) => set.has(s));
  return result.length > 0 ? result : countryStores;
}

function buildEdition(
  countrySlug: CountrySlug,
  verticalSlug: VerticalSlug
): EditionConfig {
  const country = COUNTRIES[countrySlug];
  const vertical = VERTICALS[verticalSlug];
  const slug = `${countrySlug}-${verticalSlug}` as EditionSlug;
  const stores = intersectStores(country.stores, vertical.defaultStores);

  const isAllCountries = countrySlug === "all";
  const isGeneralVertical = verticalSlug === "general";

  let basePrice: number;
  let pricingTier: EditionConfig["pricingTier"];
  if (isAllCountries && isGeneralVertical) {
    basePrice = 9000;
    pricingTier = "regional";
  } else if (isAllCountries) {
    basePrice = 5000;
    pricingTier = "vertical-bundle";
  } else if (isGeneralVertical) {
    basePrice = 4000;
    pricingTier = "country-bundle";
  } else {
    basePrice = 1500;
    pricingTier = "single-sku";
  }

  return {
    slug,
    vertical,
    country,
    name: {
      en: `${country.name.en} ${vertical.name.en}`,
      ar: `${vertical.name.ar} - ${country.name.ar}`,
    },
    stores,
    categories: vertical.categories,
    basePrice,
    pricingTier,
  };
}

const COUNTRY_KEYS: CountrySlug[] = ["ksa", "eg", "uae", "all"];
const VERTICAL_KEYS: VerticalSlug[] = [
  "general",
  "electronics",
  "fashion",
  "grocery",
  "pharma",
];

export const EDITIONS: Record<EditionSlug, EditionConfig> = Object.fromEntries(
  COUNTRY_KEYS.flatMap((c) =>
    VERTICAL_KEYS.map((v) => {
      const ed = buildEdition(c, v);
      return [ed.slug, ed] as const;
    })
  )
) as Record<EditionSlug, EditionConfig>;

export const DEFAULT_EDITION: EditionSlug = "all-general";

export function getEditionFromEnv(): EditionConfig {
  const raw = process.env.NEXT_PUBLIC_EDITION || DEFAULT_EDITION;
  const normalized = raw.toLowerCase() as EditionSlug;
  if (EDITIONS[normalized]) return EDITIONS[normalized];
  return EDITIONS[DEFAULT_EDITION];
}

export function listEditions(): EditionConfig[] {
  return Object.values(EDITIONS);
}

export function listSingleSkuEditions(): EditionConfig[] {
  return listEditions().filter((e) => e.pricingTier === "single-sku");
}
