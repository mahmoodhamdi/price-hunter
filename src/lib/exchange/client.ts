import { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc: string;
}

export interface ConversionResult {
  amount: number;
  from: Currency;
  to: Currency;
  rate: number;
  convertedAmount: number;
}

// Cache exchange rates in memory for 1 hour
const rateCache: Map<string, { rate: number; timestamp: number }> = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchExchangeRates(): Promise<Record<Currency, number>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey || apiKey === "your-api-key") {
    // Return fallback rates if no API key
    console.warn("No exchange rate API key configured, using fallback rates");
    return {
      SAR: 0.2666,
      EGP: 0.0204,
      AED: 0.2723,
      KWD: 3.252,
      USD: 1.0,
    };
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();

    if (data.result !== "success") {
      throw new Error("Exchange rate API returned unsuccessful result");
    }

    // Convert to our format (currency -> USD rate)
    const rates: Record<Currency, number> = {
      SAR: 1 / data.conversion_rates.SAR,
      EGP: 1 / data.conversion_rates.EGP,
      AED: 1 / data.conversion_rates.AED,
      KWD: 1 / data.conversion_rates.KWD,
      USD: 1.0,
    };

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    // Return fallback rates on error
    return {
      SAR: 0.2666,
      EGP: 0.0204,
      AED: 0.2723,
      KWD: 3.252,
      USD: 1.0,
    };
  }
}

export async function updateExchangeRatesInDb(): Promise<void> {
  const rates = await fetchExchangeRates();

  for (const [currency, rate] of Object.entries(rates)) {
    await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: currency as Currency,
          toCurrency: "USD",
        },
      },
      update: { rate, updatedAt: new Date() },
      create: {
        fromCurrency: currency as Currency,
        toCurrency: "USD",
        rate,
      },
    });
  }

  console.log("Exchange rates updated in database");
}

export async function getExchangeRate(
  from: Currency,
  to: Currency = "USD"
): Promise<number> {
  const cacheKey = `${from}_${to}`;
  const cached = rateCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rate;
  }

  // Try to get from database first
  try {
    if (to === "USD") {
      const dbRate = await prisma.exchangeRate.findUnique({
        where: {
          fromCurrency_toCurrency: {
            fromCurrency: from,
            toCurrency: "USD",
          },
        },
      });

      if (dbRate) {
        const rate = Number(dbRate.rate);
        rateCache.set(cacheKey, { rate, timestamp: Date.now() });
        return rate;
      }
    } else {
      // Convert through USD
      const fromToUsd = await getExchangeRate(from, "USD");
      const toToUsd = await getExchangeRate(to, "USD");
      const rate = fromToUsd / toToUsd;
      rateCache.set(cacheKey, { rate, timestamp: Date.now() });
      return rate;
    }
  } catch (error) {
    console.error("Error getting exchange rate from DB:", error);
  }

  // Fallback rates
  const fallbackRates: Record<Currency, number> = {
    SAR: 0.2666,
    EGP: 0.0204,
    AED: 0.2723,
    KWD: 3.252,
    USD: 1.0,
  };

  const rate = fallbackRates[from] / fallbackRates[to];
  rateCache.set(cacheKey, { rate, timestamp: Date.now() });
  return rate;
}

export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency = "USD"
): Promise<ConversionResult> {
  const rate = await getExchangeRate(from, to);

  return {
    amount,
    from,
    to,
    rate,
    convertedAmount: amount * rate,
  };
}

export async function normalizeToUSD(
  price: number,
  currency: Currency
): Promise<number> {
  if (currency === "USD") return price;
  const result = await convertCurrency(price, currency, "USD");
  return result.convertedAmount;
}

export async function convertFromUSD(
  priceUSD: number,
  toCurrency: Currency
): Promise<number> {
  if (toCurrency === "USD") return priceUSD;
  const rate = await getExchangeRate("USD", toCurrency);
  return priceUSD * rate;
}
