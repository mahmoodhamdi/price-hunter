import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export type ExportFormat = "csv" | "json" | "excel";

export interface PriceHistoryRecord {
  date: string;
  price: number;
  priceUSD: number;
  currency: Currency;
  storeName: string;
  storeSlug: string;
  productName: string;
  productSlug: string;
  inStock: boolean;
  discount: number | null;
}

export interface ExportOptions {
  productId?: string;
  productSlug?: string;
  storeId?: string;
  startDate?: Date;
  endDate?: Date;
  currency?: Currency;
  format: ExportFormat;
  includeHeaders?: boolean;
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  recordCount: number;
}

// Get price history data
export async function getPriceHistoryData(
  options: Omit<ExportOptions, "format">
): Promise<PriceHistoryRecord[]> {
  const where: any = {};

  if (options.startDate || options.endDate) {
    where.recordedAt = {};
    if (options.startDate) where.recordedAt.gte = options.startDate;
    if (options.endDate) where.recordedAt.lte = options.endDate;
  }

  const storeProductWhere: any = {};

  if (options.productId) {
    storeProductWhere.productId = options.productId;
  }

  if (options.storeId) {
    storeProductWhere.storeId = options.storeId;
  }

  if (options.currency) {
    storeProductWhere.currency = options.currency;
  }

  if (Object.keys(storeProductWhere).length > 0) {
    where.storeProduct = storeProductWhere;
  }

  // If productSlug is provided, resolve it first
  if (options.productSlug) {
    const product = await prisma.product.findUnique({
      where: { slug: options.productSlug },
    });
    if (product) {
      where.storeProduct = { ...where.storeProduct, productId: product.id };
    } else {
      return [];
    }
  }

  const history = await prisma.priceHistory.findMany({
    where,
    include: {
      storeProduct: {
        include: {
          store: true,
          product: true,
        },
      },
    },
    orderBy: { recordedAt: "desc" },
    take: 10000, // Limit to prevent memory issues
  });

  return history.map((h) => ({
    date: h.recordedAt.toISOString(),
    price: Number(h.price),
    priceUSD: Number(h.priceUSD),
    currency: h.currency,
    storeName: h.storeProduct.store.name,
    storeSlug: h.storeProduct.store.slug,
    productName: h.storeProduct.product.name,
    productSlug: h.storeProduct.product.slug,
    inStock: h.storeProduct.inStock,
    discount: h.storeProduct.discount,
  }));
}

// Export to CSV format
export function exportToCSV(
  records: PriceHistoryRecord[],
  includeHeaders = true
): string {
  const headers = [
    "Date",
    "Product",
    "Store",
    "Price",
    "Price (USD)",
    "Currency",
    "In Stock",
    "Discount (%)",
  ];

  const rows = records.map((r) => [
    r.date,
    `"${r.productName.replace(/"/g, '""')}"`,
    `"${r.storeName.replace(/"/g, '""')}"`,
    r.price.toString(),
    r.priceUSD.toString(),
    r.currency,
    r.inStock ? "Yes" : "No",
    r.discount?.toString() || "",
  ]);

  if (includeHeaders) {
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  return rows.map((r) => r.join(",")).join("\n");
}

// Export to JSON format
export function exportToJSON(records: PriceHistoryRecord[]): string {
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      recordCount: records.length,
      records: records.map((r) => ({
        date: r.date,
        product: {
          name: r.productName,
          slug: r.productSlug,
        },
        store: {
          name: r.storeName,
          slug: r.storeSlug,
        },
        price: {
          amount: r.price,
          amountUSD: r.priceUSD,
          currency: r.currency,
        },
        inStock: r.inStock,
        discount: r.discount,
      })),
    },
    null,
    2
  );
}

// Export to Excel format (simplified - returns tab-separated values)
export function exportToExcel(
  records: PriceHistoryRecord[],
  includeHeaders = true
): string {
  const headers = [
    "Date",
    "Product",
    "Store",
    "Price",
    "Price (USD)",
    "Currency",
    "In Stock",
    "Discount (%)",
  ];

  const rows = records.map((r) => [
    r.date,
    r.productName,
    r.storeName,
    r.price.toString(),
    r.priceUSD.toString(),
    r.currency,
    r.inStock ? "Yes" : "No",
    r.discount?.toString() || "",
  ]);

  if (includeHeaders) {
    return [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
  }

  return rows.map((r) => r.join("\t")).join("\n");
}

// Main export function
export async function exportPriceHistory(
  options: ExportOptions
): Promise<ExportResult> {
  const records = await getPriceHistoryData(options);

  let data: string;
  let filename: string;
  let mimeType: string;

  const timestamp = new Date().toISOString().split("T")[0];
  const productSlug = options.productSlug || options.productId || "all";

  switch (options.format) {
    case "csv":
      data = exportToCSV(records, options.includeHeaders !== false);
      filename = `price-history-${productSlug}-${timestamp}.csv`;
      mimeType = "text/csv";
      break;

    case "json":
      data = exportToJSON(records);
      filename = `price-history-${productSlug}-${timestamp}.json`;
      mimeType = "application/json";
      break;

    case "excel":
      data = exportToExcel(records, options.includeHeaders !== false);
      filename = `price-history-${productSlug}-${timestamp}.tsv`;
      mimeType = "text/tab-separated-values";
      break;

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  return {
    data,
    filename,
    mimeType,
    recordCount: records.length,
  };
}

// Get price history summary
export async function getPriceHistorySummary(
  productId: string,
  storeId?: string
): Promise<{
  productName: string;
  storeName?: string;
  currency: Currency;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  priceChange30Days: number;
  priceChangePercent30Days: number;
  recordCount: number;
  dateRange: { start: Date; end: Date };
}> {
  const storeProduct = await prisma.storeProduct.findFirst({
    where: {
      productId,
      storeId: storeId || undefined,
    },
    include: {
      product: true,
      store: true,
      priceHistory: {
        orderBy: { recordedAt: "desc" },
      },
    },
    orderBy: { price: "asc" },
  });

  if (!storeProduct || storeProduct.priceHistory.length === 0) {
    throw new Error("No price history found");
  }

  const prices = storeProduct.priceHistory.map((h) => Number(h.price));
  const dates = storeProduct.priceHistory.map((h) => h.recordedAt);

  const currentPrice = Number(storeProduct.price);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice =
    Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

  // Calculate 30-day price change
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldPriceRecord = storeProduct.priceHistory.find(
    (h) => h.recordedAt <= thirtyDaysAgo
  );
  const oldPrice = oldPriceRecord ? Number(oldPriceRecord.price) : currentPrice;
  const priceChange30Days = Math.round((currentPrice - oldPrice) * 100) / 100;
  const priceChangePercent30Days =
    oldPrice > 0
      ? Math.round(((currentPrice - oldPrice) / oldPrice) * 10000) / 100
      : 0;

  return {
    productName: storeProduct.product.name,
    storeName: storeProduct.store.name,
    currency: storeProduct.currency,
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice,
    priceChange30Days,
    priceChangePercent30Days,
    recordCount: storeProduct.priceHistory.length,
    dateRange: {
      start: dates[dates.length - 1],
      end: dates[0],
    },
  };
}

// Get price chart data for visualization
export async function getPriceChartData(
  productId: string,
  days = 30,
  storeIds?: string[]
): Promise<{
  labels: string[];
  datasets: {
    storeId: string;
    storeName: string;
    data: (number | null)[];
    color: string;
  }[];
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const storeProductWhere: any = {
    productId,
  };

  if (storeIds?.length) {
    storeProductWhere.storeId = { in: storeIds };
  }

  const storeProducts = await prisma.storeProduct.findMany({
    where: storeProductWhere,
    include: {
      store: true,
      priceHistory: {
        where: {
          recordedAt: { gte: startDate },
        },
        orderBy: { recordedAt: "asc" },
      },
    },
  });

  // Generate date labels
  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    labels.push(date.toISOString().split("T")[0]);
  }

  // Chart colors
  const colors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#FF6384",
    "#C9CBCF",
  ];

  const datasets = storeProducts.map((sp, index) => {
    const priceMap = new Map<string, number>();

    for (const h of sp.priceHistory) {
      const dateKey = h.recordedAt.toISOString().split("T")[0];
      priceMap.set(dateKey, Number(h.price));
    }

    const data = labels.map((label) => priceMap.get(label) || null);

    return {
      storeId: sp.storeId,
      storeName: sp.store.name,
      data,
      color: colors[index % colors.length],
    };
  });

  return { labels, datasets };
}

// Get price alerts history
export async function getPriceAlertsHistory(
  userId: string,
  limit = 50
): Promise<
  {
    productName: string;
    productSlug: string;
    targetPrice: number;
    triggeredPrice: number | null;
    currency: Currency;
    isActive: boolean;
    triggered: boolean;
    triggeredAt: Date | null;
    createdAt: Date;
  }[]
> {
  const alerts = await prisma.priceAlert.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          storeProducts: {
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return alerts.map((a) => ({
    productName: a.product.name,
    productSlug: a.product.slug,
    targetPrice: Number(a.targetPrice),
    triggeredPrice: a.triggered
      ? a.product.storeProducts[0]
        ? Number(a.product.storeProducts[0].price)
        : null
      : null,
    currency: a.currency,
    isActive: a.isActive,
    triggered: a.triggered,
    triggeredAt: a.triggeredAt,
    createdAt: a.createdAt,
  }));
}

// Export user's complete price tracking data
export async function exportUserPriceData(
  userId: string,
  format: ExportFormat
): Promise<ExportResult> {
  // Get wishlist products
  const wishlist = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          storeProducts: {
            include: {
              store: true,
              priceHistory: {
                orderBy: { recordedAt: "desc" },
                take: 100,
              },
            },
          },
        },
      },
    },
  });

  const records: PriceHistoryRecord[] = [];

  for (const w of wishlist) {
    for (const sp of w.product.storeProducts) {
      for (const h of sp.priceHistory) {
        records.push({
          date: h.recordedAt.toISOString(),
          price: Number(h.price),
          priceUSD: Number(h.priceUSD),
          currency: h.currency,
          storeName: sp.store.name,
          storeSlug: sp.store.slug,
          productName: w.product.name,
          productSlug: w.product.slug,
          inStock: sp.inStock,
          discount: sp.discount,
        });
      }
    }
  }

  // Sort by date descending
  records.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let data: string;
  let filename: string;
  let mimeType: string;

  const timestamp = new Date().toISOString().split("T")[0];

  switch (format) {
    case "csv":
      data = exportToCSV(records);
      filename = `my-price-history-${timestamp}.csv`;
      mimeType = "text/csv";
      break;

    case "json":
      data = exportToJSON(records);
      filename = `my-price-history-${timestamp}.json`;
      mimeType = "application/json";
      break;

    case "excel":
      data = exportToExcel(records);
      filename = `my-price-history-${timestamp}.tsv`;
      mimeType = "text/tab-separated-values";
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  return {
    data,
    filename,
    mimeType,
    recordCount: records.length,
  };
}

// Calculate price statistics for a product
export async function calculatePriceStats(
  productId: string,
  days = 90
): Promise<{
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
  volatility: "low" | "medium" | "high";
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await prisma.priceHistory.findMany({
    where: {
      storeProduct: { productId },
      recordedAt: { gte: startDate },
    },
    orderBy: { recordedAt: "asc" },
  });

  if (history.length === 0) {
    throw new Error("No price history found");
  }

  const prices = history.map((h) => Number(h.price));
  const sortedPrices = [...prices].sort((a, b) => a - b);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
  const median = sortedPrices[Math.floor(sortedPrices.length / 2)];

  // Calculate standard deviation
  const squaredDiffs = prices.map((p) => Math.pow(p - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = Math.round(Math.sqrt(avgSquaredDiff) * 100) / 100;

  // Calculate trend
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const priceChange = lastPrice - firstPrice;
  const trendPercentage =
    Math.round(((lastPrice - firstPrice) / firstPrice) * 10000) / 100;

  let trend: "up" | "down" | "stable" = "stable";
  if (trendPercentage > 5) trend = "up";
  else if (trendPercentage < -5) trend = "down";

  // Calculate volatility based on coefficient of variation
  const coefficientOfVariation = stdDev / avg;
  let volatility: "low" | "medium" | "high" = "low";
  if (coefficientOfVariation > 0.2) volatility = "high";
  else if (coefficientOfVariation > 0.1) volatility = "medium";

  return {
    min,
    max,
    avg,
    median,
    stdDev,
    trend,
    trendPercentage,
    volatility,
  };
}
