import { BaseScraper, ScrapedProduct } from "./base";
import { AmazonScraper } from "./amazon";
import { NoonScraper } from "./noon";
import { JarirScraper } from "./jarir";
import { ExtraScraper } from "./extra";
import { JumiaScraper } from "./jumia";
import { BTechScraper } from "./btech";

export { BaseScraper };
export type { ScrapedProduct };
export { AmazonScraper } from "./amazon";
export { NoonScraper } from "./noon";
export { JarirScraper } from "./jarir";
export { ExtraScraper } from "./extra";
export { JumiaScraper } from "./jumia";
export { BTechScraper } from "./btech";

export type StoreSlug =
  | "amazon-sa"
  | "amazon-eg"
  | "amazon-ae"
  | "noon-sa"
  | "noon-eg"
  | "noon-ae"
  | "jarir"
  | "extra"
  | "jumia-eg"
  | "btech"
  | "2b"
  | "sharaf-dg"
  | "carrefour-ae"
  | "lulu-sa";

const scraperCache: Map<string, BaseScraper> = new Map();

export function getScraperForStore(slug: StoreSlug): BaseScraper | null {
  if (scraperCache.has(slug)) {
    return scraperCache.get(slug)!;
  }

  let scraper: BaseScraper | null = null;

  switch (slug) {
    case "amazon-sa":
      scraper = new AmazonScraper("sa", "SAR");
      break;
    case "amazon-eg":
      scraper = new AmazonScraper("eg", "EGP");
      break;
    case "amazon-ae":
      scraper = new AmazonScraper("ae", "AED");
      break;
    case "noon-sa":
      scraper = new NoonScraper("saudi", "SAR");
      break;
    case "noon-eg":
      scraper = new NoonScraper("egypt", "EGP");
      break;
    case "noon-ae":
      scraper = new NoonScraper("uae", "AED");
      break;
    case "jarir":
      scraper = new JarirScraper();
      break;
    case "extra":
      scraper = new ExtraScraper();
      break;
    case "jumia-eg":
      scraper = new JumiaScraper();
      break;
    case "btech":
      scraper = new BTechScraper();
      break;
    default:
      console.log(`No scraper implemented for store: ${slug}`);
      return null;
  }

  if (scraper) {
    scraperCache.set(slug, scraper);
  }

  return scraper;
}

export async function scrapeProductFromUrl(url: string): Promise<{
  scraper: BaseScraper | null;
  product: ScrapedProduct | null;
  storeSlug: StoreSlug | null;
}> {
  // Determine which store the URL belongs to
  const domain = new URL(url).hostname.replace("www.", "");

  let storeSlug: StoreSlug | null = null;

  if (domain.includes("amazon.sa")) {
    storeSlug = "amazon-sa";
  } else if (domain.includes("amazon.eg")) {
    storeSlug = "amazon-eg";
  } else if (domain.includes("amazon.ae")) {
    storeSlug = "amazon-ae";
  } else if (domain.includes("noon.com")) {
    // Determine country from URL path
    if (url.includes("/saudi") || url.includes("saudi-ar")) {
      storeSlug = "noon-sa";
    } else if (url.includes("/egypt") || url.includes("egypt-ar")) {
      storeSlug = "noon-eg";
    } else if (url.includes("/uae") || url.includes("uae-ar")) {
      storeSlug = "noon-ae";
    } else {
      storeSlug = "noon-sa"; // Default to Saudi
    }
  } else if (domain.includes("jarir.com")) {
    storeSlug = "jarir";
  } else if (domain.includes("extra.com")) {
    storeSlug = "extra";
  } else if (domain.includes("jumia.com.eg")) {
    storeSlug = "jumia-eg";
  } else if (domain.includes("btech.com")) {
    storeSlug = "btech";
  } else if (domain.includes("2b.com.eg")) {
    storeSlug = "2b";
  } else if (domain.includes("sharafdg.com")) {
    storeSlug = "sharaf-dg";
  } else if (domain.includes("carrefouruae.com")) {
    storeSlug = "carrefour-ae";
  } else if (domain.includes("luluhypermarket.com")) {
    storeSlug = "lulu-sa";
  }

  if (!storeSlug) {
    return { scraper: null, product: null, storeSlug: null };
  }

  const scraper = getScraperForStore(storeSlug);
  if (!scraper) {
    return { scraper: null, product: null, storeSlug };
  }

  const product = await scraper.scrapeProduct(url);
  return { scraper, product, storeSlug };
}

export async function searchAllStores(
  query: string,
  stores: StoreSlug[] = ["amazon-sa", "noon-sa", "amazon-eg", "noon-eg"]
): Promise<Map<StoreSlug, ScrapedProduct[]>> {
  const results = new Map<StoreSlug, ScrapedProduct[]>();

  const searchPromises = stores.map(async (slug) => {
    const scraper = getScraperForStore(slug);
    if (scraper) {
      try {
        const products = await scraper.searchProducts(query);
        results.set(slug, products);
      } catch (error) {
        console.error(`Error searching ${slug}:`, error);
        results.set(slug, []);
      }
    }
  });

  await Promise.all(searchPromises);
  return results;
}
