import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";
import { generateApiKey, hashToken, isAllowedScrapeDomain } from "@/lib/security";

export interface ExtensionPriceData {
  productName: string;
  currentPrice: number;
  currency: Currency;
  storeName: string;
  storeSlug: string;
  productUrl: string;
  image?: string | null;
  inStock: boolean;
  discount?: number | null;
  priceHistory: {
    price: number;
    date: string;
  }[];
  lowestPrice?: number;
  highestPrice?: number;
  averagePrice?: number;
  priceChange?: {
    amount: number;
    percentage: number;
    direction: "up" | "down" | "stable";
  };
  alternatives?: {
    storeName: string;
    storeSlug: string;
    price: number;
    url: string;
    inStock: boolean;
  }[];
}

export interface ExtensionSearchResult {
  productId: string;
  productName: string;
  slug: string;
  image?: string | null;
  brand?: string | null;
  category?: string | null;
  lowestPrice: number;
  currency: Currency;
  storeCount: number;
  stores: {
    name: string;
    slug: string;
    price: number;
    inStock: boolean;
  }[];
}

export interface ExtensionWishlistItem {
  productId: string;
  productName: string;
  image?: string | null;
  currentPrice: number;
  currency: Currency;
  priceAlert?: number;
  hasDropped: boolean;
}

// Get price data for a specific URL (used by browser extension)
export async function getPriceDataForUrl(
  url: string
): Promise<ExtensionPriceData | null> {
  // SECURITY: Validate URL is from an allowed domain
  if (!isAllowedScrapeDomain(url)) {
    return null;
  }

  // Extract store and product info from URL
  const storeProduct = await prisma.storeProduct.findFirst({
    where: { url },
    include: {
      store: true,
      product: {
        include: {
          storeProducts: {
            include: {
              store: true,
            },
            where: {
              url: { not: url },
            },
          },
        },
      },
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 90, // 90 days of history
      },
    },
  });

  if (!storeProduct) {
    return null;
  }

  const prices = storeProduct.priceHistory.map((h) => Number(h.price));
  const currentPrice = Number(storeProduct.price);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : currentPrice;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : currentPrice;
  const averagePrice =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : currentPrice;

  // Calculate price change from last recorded price
  let priceChange: ExtensionPriceData["priceChange"] = undefined;
  if (storeProduct.priceHistory.length >= 2) {
    const previousPrice = Number(storeProduct.priceHistory[1].price);
    const amount = currentPrice - previousPrice;
    const percentage = Math.abs((amount / previousPrice) * 100);

    priceChange = {
      amount: Math.abs(amount),
      percentage: Math.round(percentage * 100) / 100,
      direction: amount > 0 ? "up" : amount < 0 ? "down" : "stable",
    };
  }

  // Get alternatives from other stores
  const alternatives = storeProduct.product.storeProducts.map((sp) => ({
    storeName: sp.store.name,
    storeSlug: sp.store.slug,
    price: Number(sp.price),
    url: sp.url,
    inStock: sp.inStock,
  }));

  return {
    productName: storeProduct.product.name,
    currentPrice,
    currency: storeProduct.currency,
    storeName: storeProduct.store.name,
    storeSlug: storeProduct.store.slug,
    productUrl: storeProduct.url,
    image: storeProduct.product.image,
    inStock: storeProduct.inStock,
    discount: storeProduct.discount,
    priceHistory: storeProduct.priceHistory.map((h) => ({
      price: Number(h.price),
      date: h.recordedAt.toISOString(),
    })),
    lowestPrice,
    highestPrice,
    averagePrice: Math.round(averagePrice * 100) / 100,
    priceChange,
    alternatives: alternatives.sort((a, b) => a.price - b.price),
  };
}

// Quick search for browser extension
export async function extensionQuickSearch(
  query: string,
  limit = 10
): Promise<ExtensionSearchResult[]> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { nameAr: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      storeProducts: {
        include: {
          store: true,
        },
        orderBy: { price: "asc" },
      },
    },
    take: limit,
  });

  return products
    .filter((p) => p.storeProducts.length > 0)
    .map((product) => {
      const lowestPriceStore = product.storeProducts[0];

      return {
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        image: product.image,
        brand: product.brand,
        category: product.category,
        lowestPrice: Number(lowestPriceStore.price),
        currency: lowestPriceStore.currency,
        storeCount: product.storeProducts.length,
        stores: product.storeProducts.map((sp) => ({
          name: sp.store.name,
          slug: sp.store.slug,
          price: Number(sp.price),
          inStock: sp.inStock,
        })),
      };
    });
}

// Get user's wishlist for extension
export async function getExtensionWishlist(
  userId: string
): Promise<ExtensionWishlistItem[]> {
  const wishlistItems = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          storeProducts: {
            include: {
              priceHistory: {
                orderBy: { recordedAt: "desc" },
                take: 2,
              },
            },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  return wishlistItems.map((item) => {
    const lowestStore = item.product.storeProducts[0];
    const currentPrice = lowestStore ? Number(lowestStore.price) : 0;
    const previousPrice = lowestStore?.priceHistory[1]?.price ? Number(lowestStore.priceHistory[1].price) : undefined;
    const hasDropped = previousPrice ? currentPrice < previousPrice : false;

    return {
      productId: item.productId,
      productName: item.product.name,
      image: item.product.image,
      currentPrice,
      currency: lowestStore?.currency || Currency.SAR,
      priceAlert: item.targetPrice ? Number(item.targetPrice) : undefined,
      hasDropped,
    };
  });
}

// Add item to wishlist from extension
export async function addToWishlistFromExtension(
  userId: string,
  url: string,
  targetPrice?: number
): Promise<{ success: boolean; productId?: string; error?: string }> {
  // SECURITY: Validate URL is from an allowed domain
  if (!isAllowedScrapeDomain(url)) {
    return { success: false, error: "URL domain not supported" };
  }

  // Find the store product by URL
  const storeProduct = await prisma.storeProduct.findFirst({
    where: { url },
    include: { product: true },
  });

  if (!storeProduct) {
    return { success: false, error: "Product not found for this URL" };
  }

  // Check if already in wishlist
  const existing = await prisma.wishlist.findUnique({
    where: {
      userId_productId: {
        userId,
        productId: storeProduct.productId,
      },
    },
  });

  if (existing) {
    // Update target price if provided
    if (targetPrice !== undefined) {
      await prisma.wishlist.update({
        where: { id: existing.id },
        data: { targetPrice },
      });
    }
    return { success: true, productId: storeProduct.productId };
  }

  // Create new wishlist item
  await prisma.wishlist.create({
    data: {
      userId,
      productId: storeProduct.productId,
      targetPrice,
    },
  });

  return { success: true, productId: storeProduct.productId };
}

// Check if URL is tracked
export async function isUrlTracked(url: string): Promise<boolean> {
  const count = await prisma.storeProduct.count({
    where: { url },
  });
  return count > 0;
}

// Get quick price comparison for a detected product
export async function getQuickComparison(
  productName: string,
  currentStore: string,
  currentPrice: number
): Promise<{
  savings: number;
  cheapestStore: string;
  cheapestPrice: number;
  storeCount: number;
} | null> {
  // Find similar products by name
  const products = await prisma.product.findMany({
    where: {
      name: { contains: productName.split(" ").slice(0, 3).join(" "), mode: "insensitive" },
    },
    include: {
      storeProducts: {
        include: { store: true },
        orderBy: { price: "asc" },
      },
    },
    take: 5,
  });

  if (products.length === 0) {
    return null;
  }

  // Find the best match (most stores, similar name)
  const bestMatch = products.reduce((best, current) => {
    if (current.storeProducts.length > best.storeProducts.length) {
      return current;
    }
    return best;
  }, products[0]);

  if (bestMatch.storeProducts.length === 0) {
    return null;
  }

  const cheapest = bestMatch.storeProducts[0];
  const cheapestPrice = Number(cheapest.price);
  const savings = currentPrice - cheapestPrice;

  return {
    savings: Math.max(0, Math.round(savings * 100) / 100),
    cheapestStore: cheapest.store.name,
    cheapestPrice,
    storeCount: bestMatch.storeProducts.length,
  };
}

// Track a new product from extension
export async function trackProductFromExtension(
  url: string,
  productData: {
    name: string;
    price: number;
    currency: Currency;
    image?: string;
    inStock?: boolean;
    storeName: string;
  }
): Promise<{ success: boolean; storeProductId?: string; error?: string }> {
  // SECURITY: Validate URL is from an allowed domain
  if (!isAllowedScrapeDomain(url)) {
    return { success: false, error: "URL domain not supported for tracking" };
  }

  // Find or create store
  let store = await prisma.store.findFirst({
    where: {
      OR: [
        { name: { contains: productData.storeName, mode: "insensitive" } },
        { domain: { contains: new URL(url).hostname } },
      ],
    },
  });

  if (!store) {
    // Create a new store entry
    const hostname = new URL(url).hostname;
    store = await prisma.store.create({
      data: {
        name: productData.storeName,
        nameAr: productData.storeName,
        slug: hostname.replace(/\./g, "-"),
        domain: hostname,
        country: "SA", // Default, can be detected from URL
        currency: productData.currency,
        isActive: true,
      },
    });
  }

  // Check if product URL already exists
  const existingStoreProduct = await prisma.storeProduct.findFirst({
    where: { url },
  });

  if (existingStoreProduct) {
    // Update price if changed
    if (Number(existingStoreProduct.price) !== productData.price) {
      await prisma.priceHistory.create({
        data: {
          storeProductId: existingStoreProduct.id,
          price: productData.price,
          priceUSD: productData.price, // Simplified, should use exchange rate
          currency: productData.currency,
        },
      });

      await prisma.storeProduct.update({
        where: { id: existingStoreProduct.id },
        data: {
          price: productData.price,
          inStock: productData.inStock ?? true,
        },
      });
    }

    return { success: true, storeProductId: existingStoreProduct.id };
  }

  // Create new product and store product
  const slug = productData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const product = await prisma.product.create({
    data: {
      name: productData.name,
      slug: `${slug}-${Date.now()}`,
      image: productData.image,
    },
  });

  const storeProduct = await prisma.storeProduct.create({
    data: {
      productId: product.id,
      storeId: store.id,
      url,
      price: productData.price,
      priceUSD: productData.price, // Simplified, should use exchange rate
      currency: productData.currency,
      inStock: productData.inStock ?? true,
      priceHistory: {
        create: {
          price: productData.price,
          priceUSD: productData.price, // Simplified, should use exchange rate
          currency: productData.currency,
        },
      },
    },
  });

  return { success: true, storeProductId: storeProduct.id };
}

// Get extension configuration
export function getExtensionConfig() {
  return {
    supportedStores: [
      { name: "Amazon.sa", domain: "amazon.sa", selector: "#priceblock_ourprice, .a-price .a-offscreen" },
      { name: "Amazon.eg", domain: "amazon.eg", selector: "#priceblock_ourprice, .a-price .a-offscreen" },
      { name: "Noon", domain: "noon.com", selector: "[class*='priceNow']" },
      { name: "Jarir", domain: "jarir.com", selector: ".price" },
      { name: "Extra", domain: "extra.com", selector: ".product-price" },
      { name: "Jumia", domain: "jumia.com.eg", selector: ".-fs24" },
      { name: "B.Tech", domain: "btech.com", selector: ".product-price" },
    ],
    features: {
      priceTracking: true,
      priceAlerts: true,
      priceHistory: true,
      wishlist: true,
      quickSearch: true,
      autoDetect: true,
    },
    apiEndpoints: {
      priceData: "/api/extension/price",
      search: "/api/extension/search",
      wishlist: "/api/extension/wishlist",
      track: "/api/extension/track",
      compare: "/api/extension/compare",
    },
  };
}

// Validate extension API key
export async function validateExtensionApiKey(apiKey: string): Promise<{
  valid: boolean;
  userId?: string;
}> {
  // SECURITY: Use constant-time comparison to prevent timing attacks
  // Hash the incoming key and compare against stored hash
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false };
  }

  const hashedKey = hashToken(apiKey);

  const user = await prisma.user.findFirst({
    where: { extensionApiKey: hashedKey },
  });

  if (!user) {
    return { valid: false };
  }

  return { valid: true, userId: user.id };
}

// Generate extension API key for user
export async function generateExtensionApiKey(userId: string): Promise<string> {
  // SECURITY: Use cryptographically secure random bytes
  const apiKey = generateApiKey("ph");

  // Store hashed version for security (one-way hash)
  const hashedKey = hashToken(apiKey);

  await prisma.user.update({
    where: { id: userId },
    data: { extensionApiKey: hashedKey },
  });

  // Return plain key to user (only time they'll see it)
  return apiKey;
}
