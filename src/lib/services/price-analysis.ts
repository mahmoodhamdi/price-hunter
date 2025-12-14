import { prisma } from "@/lib/prisma";

export interface PriceAnalysis {
  currentPrice: number;
  previousPrice?: number;
  lowestEver: number;
  highestEver: number;
  averagePrice: number;
  isAtLowest: boolean;
  priceChange?: {
    amount: number;
    percentage: number;
    direction: "up" | "down" | "same";
    daysAgo: number;
  };
}

// Analyze price for a store product
export async function analyzePriceForStoreProduct(
  storeProductId: string
): Promise<PriceAnalysis | null> {
  const storeProduct = await prisma.storeProduct.findUnique({
    where: { id: storeProductId },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 100,
      },
    },
  });

  if (!storeProduct) return null;

  const currentPrice = Number(storeProduct.price);
  const history = storeProduct.priceHistory;

  if (history.length === 0) {
    return {
      currentPrice,
      lowestEver: currentPrice,
      highestEver: currentPrice,
      averagePrice: currentPrice,
      isAtLowest: true,
    };
  }

  const prices = history.map((h) => Number(h.price));
  const lowestEver = Math.min(...prices, currentPrice);
  const highestEver = Math.max(...prices, currentPrice);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  let priceChange: PriceAnalysis["priceChange"];

  // Find the most recent different price
  for (let i = 0; i < history.length; i++) {
    const historyPrice = Number(history[i].price);
    if (historyPrice !== currentPrice) {
      const amount = currentPrice - historyPrice;
      const percentage = Math.round((amount / historyPrice) * 100);
      const daysAgo = Math.floor(
        (Date.now() - new Date(history[i].recordedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      priceChange = {
        amount: Math.abs(amount),
        percentage: Math.abs(percentage),
        direction: amount > 0 ? "up" : amount < 0 ? "down" : "same",
        daysAgo,
      };
      break;
    }
  }

  return {
    currentPrice,
    previousPrice: history[0] ? Number(history[0].price) : undefined,
    lowestEver,
    highestEver,
    averagePrice,
    isAtLowest: currentPrice <= lowestEver,
    priceChange,
  };
}

// Get price analysis for multiple store products
export async function analyzePricesForProduct(
  productId: string
): Promise<Map<string, PriceAnalysis>> {
  const storeProducts = await prisma.storeProduct.findMany({
    where: { productId },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 100,
      },
      store: true,
    },
  });

  const analysisMap = new Map<string, PriceAnalysis>();

  for (const sp of storeProducts) {
    const currentPrice = Number(sp.price);
    const history = sp.priceHistory;

    if (history.length === 0) {
      analysisMap.set(sp.store.slug, {
        currentPrice,
        lowestEver: currentPrice,
        highestEver: currentPrice,
        averagePrice: currentPrice,
        isAtLowest: true,
      });
      continue;
    }

    const prices = history.map((h) => Number(h.price));
    const lowestEver = Math.min(...prices, currentPrice);
    const highestEver = Math.max(...prices, currentPrice);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    let priceChange: PriceAnalysis["priceChange"];

    for (let i = 0; i < history.length; i++) {
      const historyPrice = Number(history[i].price);
      if (historyPrice !== currentPrice) {
        const amount = currentPrice - historyPrice;
        const percentage = Math.round((amount / historyPrice) * 100);
        const daysAgo = Math.floor(
          (Date.now() - new Date(history[i].recordedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        priceChange = {
          amount: Math.abs(amount),
          percentage: Math.abs(percentage),
          direction: amount > 0 ? "up" : amount < 0 ? "down" : "same",
          daysAgo,
        };
        break;
      }
    }

    analysisMap.set(sp.store.slug, {
      currentPrice,
      previousPrice: history[0] ? Number(history[0].price) : undefined,
      lowestEver,
      highestEver,
      averagePrice,
      isAtLowest: currentPrice <= lowestEver,
      priceChange,
    });
  }

  return analysisMap;
}

// Check if current price is at historical low
export async function isAtLowestPrice(storeProductId: string): Promise<boolean> {
  const analysis = await analyzePriceForStoreProduct(storeProductId);
  return analysis?.isAtLowest ?? false;
}

// Get products at their lowest price
export async function getProductsAtLowestPrice(options: {
  limit?: number;
  country?: string;
}): Promise<
  {
    productId: string;
    name: string;
    image?: string | null;
    storeProductId: string;
    storeName: string;
    currentPrice: number;
    previousLowest: number;
    currency: string;
  }[]
> {
  const { limit = 20, country } = options;

  // Get store products with price history
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      inStock: true,
      store: country
        ? { country: country as any, isActive: true }
        : { isActive: true },
    },
    include: {
      product: true,
      store: true,
      priceHistory: {
        orderBy: { recordedAt: "desc" },
      },
    },
    take: limit * 5, // Get more to filter
  });

  const lowestPriceProducts: {
    productId: string;
    name: string;
    image?: string | null;
    storeProductId: string;
    storeName: string;
    currentPrice: number;
    previousLowest: number;
    currency: string;
  }[] = [];

  for (const sp of storeProducts) {
    if (sp.priceHistory.length < 2) continue;

    const currentPrice = Number(sp.price);
    const historicalPrices = sp.priceHistory.slice(1).map((h) => Number(h.price));
    const previousLowest = Math.min(...historicalPrices);

    // Check if current price is lower than all historical prices
    if (currentPrice < previousLowest) {
      lowestPriceProducts.push({
        productId: sp.productId,
        name: sp.product.name,
        image: sp.product.image,
        storeProductId: sp.id,
        storeName: sp.store.name,
        currentPrice,
        previousLowest,
        currency: sp.currency,
      });
    }
  }

  // Sort by savings percentage
  return lowestPriceProducts
    .sort((a, b) => {
      const savingsA = (a.previousLowest - a.currentPrice) / a.previousLowest;
      const savingsB = (b.previousLowest - b.currentPrice) / b.previousLowest;
      return savingsB - savingsA;
    })
    .slice(0, limit);
}
