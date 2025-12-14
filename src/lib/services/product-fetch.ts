import { prisma } from "@/lib/prisma";
import { getScraperForStore, StoreSlug, ScrapedProduct } from "@/lib/scrapers";
import { Currency, Country } from "@prisma/client";
import { slugify } from "@/lib/utils";
import { isAllowedScrapeDomain } from "@/lib/security";

// Get active stores for a country
export async function getActiveStoresForCountry(country: Country): Promise<string[]> {
  const stores = await prisma.store.findMany({
    where: {
      country,
      isActive: true,
    },
    select: {
      slug: true,
    },
  });
  return stores.map((s) => s.slug);
}

// Get all active stores
export async function getAllActiveStores(): Promise<string[]> {
  const stores = await prisma.store.findMany({
    where: {
      isActive: true,
    },
    select: {
      slug: true,
    },
  });
  return stores.map((s) => s.slug);
}

// Convert currency to USD
async function convertToUSD(price: number, currency: Currency): Promise<number> {
  if (currency === "USD") return price;

  const rate = await prisma.exchangeRate.findUnique({
    where: {
      fromCurrency_toCurrency: {
        fromCurrency: currency,
        toCurrency: "USD",
      },
    },
  });

  if (!rate) {
    // Fallback rates if not in DB
    const fallbackRates: Record<Currency, number> = {
      SAR: 0.267,
      EGP: 0.032,
      AED: 0.272,
      KWD: 3.26,
      USD: 1,
    };
    return price * (fallbackRates[currency] || 1);
  }

  return price * Number(rate.rate);
}

// Generate unique slug for product
function generateProductSlug(name: string): string {
  const base = slugify(name);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

// Match scraped product to existing product in DB
async function findExistingProduct(
  scraped: ScrapedProduct
): Promise<string | null> {
  // Try to match by barcode first (most reliable)
  if (scraped.barcode) {
    const byBarcode = await prisma.product.findUnique({
      where: { barcode: scraped.barcode },
      select: { id: true },
    });
    if (byBarcode) return byBarcode.id;
  }

  // Try to match by exact name
  const byName = await prisma.product.findFirst({
    where: {
      OR: [
        { name: { equals: scraped.name, mode: "insensitive" } },
        scraped.nameAr
          ? { nameAr: { equals: scraped.nameAr, mode: "insensitive" } }
          : {},
      ],
    },
    select: { id: true },
  });
  if (byName) return byName.id;

  return null;
}

// Save a single scraped product to database
async function saveScrapedProduct(
  scraped: ScrapedProduct,
  storeSlug: string
): Promise<{ productId: string; isNew: boolean }> {
  // Find the store
  const store = await prisma.store.findUnique({
    where: { slug: storeSlug },
    select: { id: true, currency: true },
  });

  if (!store) {
    throw new Error(`Store not found: ${storeSlug}`);
  }

  // Check if product already exists
  let productId = await findExistingProduct(scraped);
  let isNew = false;

  if (!productId) {
    // Create new product
    isNew = true;
    const product = await prisma.product.create({
      data: {
        name: scraped.name,
        nameAr: scraped.nameAr,
        slug: generateProductSlug(scraped.name),
        barcode: scraped.barcode,
        brand: scraped.brand,
        category: scraped.category,
        image: scraped.image,
        description: scraped.description,
      },
    });
    productId = product.id;
  }

  // Convert price to USD
  const priceUSD = await convertToUSD(scraped.price, scraped.currency);

  // Calculate discount percentage
  let discount: number | null = null;
  if (scraped.originalPrice && scraped.originalPrice > scraped.price) {
    discount = Math.round(
      ((scraped.originalPrice - scraped.price) / scraped.originalPrice) * 100
    );
  }

  // Upsert store product (update if exists, create if not)
  const storeProduct = await prisma.storeProduct.upsert({
    where: {
      productId_storeId: {
        productId,
        storeId: store.id,
      },
    },
    create: {
      productId,
      storeId: store.id,
      url: scraped.url,
      price: scraped.price,
      currency: scraped.currency,
      priceUSD,
      originalPrice: scraped.originalPrice,
      discount,
      inStock: scraped.inStock,
      rating: scraped.rating,
      reviewCount: scraped.reviewCount,
      lastScraped: new Date(),
    },
    update: {
      url: scraped.url,
      price: scraped.price,
      currency: scraped.currency,
      priceUSD,
      originalPrice: scraped.originalPrice,
      discount,
      inStock: scraped.inStock,
      rating: scraped.rating,
      reviewCount: scraped.reviewCount,
      lastScraped: new Date(),
    },
  });

  // Record price history
  await prisma.priceHistory.create({
    data: {
      storeProductId: storeProduct.id,
      price: scraped.price,
      priceUSD,
      currency: scraped.currency,
    },
  });

  return { productId, isNew };
}

export interface FetchResult {
  query: string;
  totalScraped: number;
  newProducts: number;
  updatedProducts: number;
  storeResults: Record<string, { success: boolean; count: number; error?: string }>;
  duration: number;
}

// Main function to fetch and save products from all stores
export async function fetchAndSaveProducts(
  query: string,
  options: {
    country?: Country;
    stores?: string[];
    timeout?: number;
  } = {}
): Promise<FetchResult> {
  const startTime = Date.now();
  const result: FetchResult = {
    query,
    totalScraped: 0,
    newProducts: 0,
    updatedProducts: 0,
    storeResults: {},
    duration: 0,
  };

  // Get stores to scrape
  let storeSlugs: string[];
  if (options.stores && options.stores.length > 0) {
    storeSlugs = options.stores;
  } else if (options.country) {
    storeSlugs = await getActiveStoresForCountry(options.country);
  } else {
    storeSlugs = await getAllActiveStores();
  }

  // Create a scrape job record
  const job = await prisma.scrapeJob.create({
    data: {
      type: "FULL_SCRAPE",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  // Scrape all stores in parallel
  const scrapePromises = storeSlugs.map(async (slug) => {
    const scraper = getScraperForStore(slug as StoreSlug);
    if (!scraper) {
      result.storeResults[slug] = {
        success: false,
        count: 0,
        error: "No scraper available",
      };
      return;
    }

    try {
      const products = await Promise.race([
        scraper.searchProducts(query),
        new Promise<ScrapedProduct[]>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), options.timeout || 30000)
        ),
      ]);

      let savedCount = 0;
      let newCount = 0;

      for (const product of products) {
        try {
          const { isNew } = await saveScrapedProduct(product, slug);
          savedCount++;
          if (isNew) newCount++;
        } catch (error) {
          console.error(`Error saving product from ${slug}:`, error);
        }
      }

      result.storeResults[slug] = {
        success: true,
        count: savedCount,
      };
      result.totalScraped += savedCount;
      result.newProducts += newCount;
      result.updatedProducts += savedCount - newCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Error scraping ${slug}:`, errorMessage);
      result.storeResults[slug] = {
        success: false,
        count: 0,
        error: errorMessage,
      };
    }
  });

  await Promise.all(scrapePromises);

  // Update scrape job
  await prisma.scrapeJob.update({
    where: { id: job.id },
    data: {
      status: result.totalScraped > 0 ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      itemsProcessed: result.totalScraped,
      error:
        result.totalScraped === 0
          ? "No products scraped from any store"
          : undefined,
    },
  });

  result.duration = Date.now() - startTime;
  return result;
}

// Fetch a single product from URL
export async function fetchProductFromUrl(url: string): Promise<{
  productId: string | null;
  isNew: boolean;
  error?: string;
}> {
  // SECURITY: Validate URL is from an allowed domain to prevent SSRF
  if (!isAllowedScrapeDomain(url)) {
    return {
      productId: null,
      isNew: false,
      error: "URL domain not allowed for scraping",
    };
  }

  const { scrapeProductFromUrl } = await import("@/lib/scrapers");

  try {
    const { product, storeSlug } = await scrapeProductFromUrl(url);

    if (!product || !storeSlug) {
      return {
        productId: null,
        isNew: false,
        error: "Could not scrape product from URL",
      };
    }

    const result = await saveScrapedProduct(product, storeSlug);
    return result;
  } catch (error) {
    return {
      productId: null,
      isNew: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
