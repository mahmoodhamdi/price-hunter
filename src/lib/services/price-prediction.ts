import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface PricePrediction {
  currentPrice: number;
  predictedPrice: number;
  confidence: number; // 0-1
  direction: "up" | "down" | "stable";
  changePercentage: number;
  recommendation: "buy_now" | "wait" | "neutral";
  reasoning: string;
  predictedDate: Date;
  historicalTrend: "rising" | "falling" | "stable" | "volatile";
}

export interface PriceHistoryPoint {
  date: Date;
  price: number;
}

// Predict future price based on historical data
export async function predictPrice(
  storeProductId: string,
  daysAhead: number = 7
): Promise<PricePrediction | null> {
  const storeProduct = await prisma.storeProduct.findUnique({
    where: { id: storeProductId },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 90, // Last 90 days of data
      },
    },
  });

  if (!storeProduct) return null;

  const currentPrice = Number(storeProduct.price);
  const history = storeProduct.priceHistory.map((h) => ({
    date: h.recordedAt,
    price: Number(h.price),
  }));

  // Need at least 7 data points for prediction
  if (history.length < 7) {
    return {
      currentPrice,
      predictedPrice: currentPrice,
      confidence: 0.3,
      direction: "stable",
      changePercentage: 0,
      recommendation: "neutral",
      reasoning: "Insufficient price history for accurate prediction",
      predictedDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
      historicalTrend: "stable",
    };
  }

  // Calculate trend analysis
  const trend = analyzeTrend(history);
  const volatility = calculateVolatility(history);
  const seasonality = detectSeasonality(history);

  // Simple linear regression for prediction
  const regression = linearRegression(history);
  const predictedPrice = Math.max(
    0,
    regression.slope * (history.length + daysAhead) + regression.intercept
  );

  // Adjust prediction based on volatility
  const adjustedPrediction = applyVolatilityAdjustment(
    predictedPrice,
    volatility,
    trend
  );

  // Calculate confidence based on data quality
  const confidence = calculateConfidence(history, volatility, regression.r2);

  // Determine direction and recommendation
  const changePercentage =
    ((adjustedPrediction - currentPrice) / currentPrice) * 100;
  const direction =
    changePercentage > 2 ? "up" : changePercentage < -2 ? "down" : "stable";

  const recommendation = getRecommendation(
    direction,
    changePercentage,
    confidence,
    trend
  );

  const reasoning = generateReasoning(
    trend,
    changePercentage,
    confidence,
    seasonality
  );

  return {
    currentPrice,
    predictedPrice: Math.round(adjustedPrediction * 100) / 100,
    confidence,
    direction,
    changePercentage: Math.round(changePercentage * 10) / 10,
    recommendation,
    reasoning,
    predictedDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
    historicalTrend: trend,
  };
}

// Analyze price trend
function analyzeTrend(
  history: PriceHistoryPoint[]
): "rising" | "falling" | "stable" | "volatile" {
  if (history.length < 3) return "stable";

  const recentPrices = history.slice(0, Math.min(14, history.length));
  const olderPrices = history.slice(
    Math.min(14, history.length),
    Math.min(30, history.length)
  );

  if (olderPrices.length === 0) return "stable";

  const recentAvg =
    recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
  const olderAvg =
    olderPrices.reduce((sum, p) => sum + p.price, 0) / olderPrices.length;

  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
  const volatility = calculateVolatility(history);

  if (volatility > 0.15) return "volatile";
  if (changePercent > 5) return "rising";
  if (changePercent < -5) return "falling";
  return "stable";
}

// Calculate price volatility (standard deviation / mean)
function calculateVolatility(history: PriceHistoryPoint[]): number {
  if (history.length < 2) return 0;

  const prices = history.map((h) => h.price);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  return stdDev / mean;
}

// Detect seasonal patterns
function detectSeasonality(history: PriceHistoryPoint[]): {
  hasSeasonality: boolean;
  pattern?: string;
} {
  if (history.length < 30) {
    return { hasSeasonality: false };
  }

  // Check for weekly patterns (sales often happen on weekends)
  const dayOfWeekPrices: { [key: number]: number[] } = {};

  history.forEach((h) => {
    const day = h.date.getDay();
    if (!dayOfWeekPrices[day]) dayOfWeekPrices[day] = [];
    dayOfWeekPrices[day].push(h.price);
  });

  const dayAverages = Object.entries(dayOfWeekPrices).map(([day, prices]) => ({
    day: parseInt(day),
    avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
  }));

  const overallAvg =
    dayAverages.reduce((sum, d) => sum + d.avg, 0) / dayAverages.length;
  const maxDeviation = Math.max(
    ...dayAverages.map((d) => Math.abs(d.avg - overallAvg) / overallAvg)
  );

  if (maxDeviation > 0.05) {
    const lowestDay = dayAverages.reduce((min, d) =>
      d.avg < min.avg ? d : min
    );
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      hasSeasonality: true,
      pattern: `Best prices typically on ${dayNames[lowestDay.day]}`,
    };
  }

  return { hasSeasonality: false };
}

// Simple linear regression
function linearRegression(history: PriceHistoryPoint[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = history.length;
  const prices = history.map((h) => h.price).reverse(); // Oldest first

  // x = index (time), y = price
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;

  prices.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  let ssTotal = 0,
    ssResidual = 0;

  prices.forEach((y, x) => {
    const yPred = slope * x + intercept;
    ssTotal += Math.pow(y - yMean, 2);
    ssResidual += Math.pow(y - yPred, 2);
  });

  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
}

// Adjust prediction based on volatility
function applyVolatilityAdjustment(
  prediction: number,
  volatility: number,
  trend: string
): number {
  // More volatile prices tend to revert to mean
  if (volatility > 0.1) {
    const adjustment = volatility * 0.5;
    if (trend === "rising") {
      return prediction * (1 - adjustment * 0.3);
    } else if (trend === "falling") {
      return prediction * (1 + adjustment * 0.3);
    }
  }
  return prediction;
}

// Calculate prediction confidence
function calculateConfidence(
  history: PriceHistoryPoint[],
  volatility: number,
  r2: number
): number {
  let confidence = 0.5;

  // More data = higher confidence
  if (history.length >= 30) confidence += 0.15;
  else if (history.length >= 14) confidence += 0.1;

  // Better regression fit = higher confidence
  confidence += r2 * 0.2;

  // Lower volatility = higher confidence
  confidence += Math.max(0, 0.15 - volatility);

  return Math.min(0.95, Math.max(0.2, confidence));
}

// Get buy/wait recommendation
function getRecommendation(
  direction: "up" | "down" | "stable",
  changePercentage: number,
  confidence: number,
  trend: string
): "buy_now" | "wait" | "neutral" {
  if (confidence < 0.4) return "neutral";

  if (direction === "up" && changePercentage > 3 && confidence > 0.6) {
    return "buy_now";
  }

  if (direction === "down" && changePercentage < -3 && confidence > 0.6) {
    return "wait";
  }

  if (trend === "falling" && confidence > 0.5) {
    return "wait";
  }

  if (trend === "rising" && confidence > 0.5) {
    return "buy_now";
  }

  return "neutral";
}

// Generate human-readable reasoning
function generateReasoning(
  trend: string,
  changePercentage: number,
  confidence: number,
  seasonality: { hasSeasonality: boolean; pattern?: string }
): string {
  const parts: string[] = [];

  if (trend === "rising") {
    parts.push("Prices have been trending upward recently");
  } else if (trend === "falling") {
    parts.push("Prices have been declining");
  } else if (trend === "volatile") {
    parts.push("Prices have been fluctuating significantly");
  } else {
    parts.push("Prices have been relatively stable");
  }

  if (Math.abs(changePercentage) > 5) {
    const direction = changePercentage > 0 ? "increase" : "decrease";
    parts.push(
      `We predict a ${Math.abs(changePercentage).toFixed(1)}% ${direction}`
    );
  }

  if (confidence > 0.7) {
    parts.push("with high confidence");
  } else if (confidence > 0.5) {
    parts.push("with moderate confidence");
  } else {
    parts.push("but prediction confidence is low");
  }

  if (seasonality.hasSeasonality && seasonality.pattern) {
    parts.push(`. ${seasonality.pattern}`);
  }

  return parts.join(" ");
}

// Get price predictions for multiple store products
export async function getPredictionsForProduct(
  productId: string,
  daysAhead: number = 7
): Promise<Map<string, PricePrediction>> {
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      productId,
      store: { isActive: true },
    },
    include: {
      store: true,
    },
  });

  const predictions = new Map<string, PricePrediction>();

  for (const sp of storeProducts) {
    const prediction = await predictPrice(sp.id, daysAhead);
    if (prediction) {
      predictions.set(sp.store.slug, prediction);
    }
  }

  return predictions;
}

// Get best time to buy recommendation
export async function getBestTimeToBuy(
  storeProductId: string
): Promise<{
  recommendation: string;
  bestDay?: string;
  expectedSavings?: number;
} | null> {
  const storeProduct = await prisma.storeProduct.findUnique({
    where: { id: storeProductId },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 60,
      },
    },
  });

  if (!storeProduct || storeProduct.priceHistory.length < 14) {
    return {
      recommendation:
        "Not enough data to determine the best time to buy. Consider setting a price alert.",
    };
  }

  const history = storeProduct.priceHistory.map((h) => ({
    date: h.recordedAt,
    price: Number(h.price),
  }));

  const seasonality = detectSeasonality(history);
  const prediction = await predictPrice(storeProductId, 7);

  if (prediction?.recommendation === "wait") {
    return {
      recommendation: `Wait for better prices. ${prediction.reasoning}`,
      expectedSavings: Math.abs(
        prediction.currentPrice - prediction.predictedPrice
      ),
    };
  }

  if (seasonality.hasSeasonality && seasonality.pattern) {
    return {
      recommendation: seasonality.pattern,
      bestDay: seasonality.pattern.split(" ").pop(),
    };
  }

  if (prediction?.recommendation === "buy_now") {
    return {
      recommendation: "Now is a good time to buy. Prices may increase soon.",
    };
  }

  return {
    recommendation:
      "Prices are stable. Set a price alert for when prices drop below your target.",
  };
}
