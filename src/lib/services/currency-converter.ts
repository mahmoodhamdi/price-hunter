import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

// Default exchange rates (fallback if API fails)
const DEFAULT_RATES: Record<Currency, number> = {
  [Currency.USD]: 1.0,
  [Currency.SAR]: 3.75,
  [Currency.EGP]: 30.9,
  [Currency.AED]: 3.67,
  [Currency.KWD]: 0.31,
};

export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  lastUpdated: Date;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: Currency;
  convertedAmount: number;
  targetCurrency: Currency;
  rate: number;
  inverseRate: number;
}

export interface CurrencyInfo {
  code: Currency;
  name: string;
  nameAr: string;
  symbol: string;
  country: string;
  flag: string;
}

// Currency metadata
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  [Currency.USD]: {
    code: Currency.USD,
    name: "US Dollar",
    nameAr: "دولار أمريكي",
    symbol: "$",
    country: "United States",
    flag: "🇺🇸",
  },
  [Currency.SAR]: {
    code: Currency.SAR,
    name: "Saudi Riyal",
    nameAr: "ريال سعودي",
    symbol: "﷼",
    country: "Saudi Arabia",
    flag: "🇸🇦",
  },
  [Currency.EGP]: {
    code: Currency.EGP,
    name: "Egyptian Pound",
    nameAr: "جنيه مصري",
    symbol: "E£",
    country: "Egypt",
    flag: "🇪🇬",
  },
  [Currency.AED]: {
    code: Currency.AED,
    name: "UAE Dirham",
    nameAr: "درهم إماراتي",
    symbol: "د.إ",
    country: "United Arab Emirates",
    flag: "🇦🇪",
  },
  [Currency.KWD]: {
    code: Currency.KWD,
    name: "Kuwaiti Dinar",
    nameAr: "دينار كويتي",
    symbol: "د.ك",
    country: "Kuwait",
    flag: "🇰🇼",
  },
};

// Get current exchange rates
export async function getExchangeRates(
  baseCurrency: Currency = Currency.USD
): Promise<ExchangeRates> {
  try {
    // Get rates from database
    const dbRates = await prisma.exchangeRate.findMany({
      where: { toCurrency: Currency.USD },
    });

    if (dbRates.length > 0) {
      const rates: Record<Currency, number> = { ...DEFAULT_RATES };

      // Convert to base currency rates
      for (const rate of dbRates) {
        rates[rate.fromCurrency] = Number(rate.rate);
      }

      // If base is not USD, convert all rates
      if (baseCurrency !== Currency.USD) {
        const baseToUsd = rates[baseCurrency];
        for (const currency of Object.keys(rates) as Currency[]) {
          rates[currency] = rates[currency] / baseToUsd;
        }
      }

      return {
        base: baseCurrency,
        rates,
        lastUpdated: dbRates[0]?.updatedAt || new Date(),
      };
    }

    // Return default rates
    const rates = { ...DEFAULT_RATES };
    if (baseCurrency !== Currency.USD) {
      const baseToUsd = rates[baseCurrency];
      for (const currency of Object.keys(rates) as Currency[]) {
        rates[currency] = rates[currency] / baseToUsd;
      }
    }

    return {
      base: baseCurrency,
      rates,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return {
      base: baseCurrency,
      rates: DEFAULT_RATES,
      lastUpdated: new Date(),
    };
  }
}

// Convert amount between currencies
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<ConversionResult> {
  if (fromCurrency === toCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount,
      targetCurrency: toCurrency,
      rate: 1,
      inverseRate: 1,
    };
  }

  const rates = await getExchangeRates(Currency.USD);

  // Convert from source to USD, then to target
  const fromRate = rates.rates[fromCurrency];
  const toRate = rates.rates[toCurrency];

  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  const rate = toRate / fromRate;

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    targetCurrency: toCurrency,
    rate: Math.round(rate * 10000) / 10000,
    inverseRate: Math.round((1 / rate) * 10000) / 10000,
  };
}

// Convert multiple amounts at once
export async function convertMultipleCurrencies(
  amount: number,
  fromCurrency: Currency,
  toCurrencies: Currency[]
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];

  for (const toCurrency of toCurrencies) {
    const result = await convertCurrency(amount, fromCurrency, toCurrency);
    results.push(result);
  }

  return results;
}

// Update exchange rates from external API
export async function updateExchangeRates(): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  try {
    // Try fetching from exchangerate-api.com (free tier)
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const url = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      : "https://open.er-api.com/v6/latest/USD";

    const response = await fetch(url);
    const data = await response.json();

    if (!data.rates) {
      return { success: false, updated: 0, error: "Invalid API response" };
    }

    const currencies = Object.values(Currency);
    let updated = 0;

    for (const currency of currencies) {
      if (currency === Currency.USD) continue;

      const rate = data.rates[currency];
      if (rate) {
        await prisma.exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: {
              fromCurrency: currency,
              toCurrency: Currency.USD,
            },
          },
          update: {
            rate: 1 / rate, // Store as currency to USD rate
            updatedAt: new Date(),
          },
          create: {
            fromCurrency: currency,
            toCurrency: Currency.USD,
            rate: 1 / rate,
          },
        });
        updated++;
      }
    }

    return { success: true, updated };
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get rate history for a currency pair
export async function getRateHistory(
  fromCurrency: Currency,
  toCurrency: Currency,
  days = 30
): Promise<{ date: Date; rate: number }[]> {
  // In a real implementation, you would store historical rates
  // For now, return simulated data based on current rate
  const currentConversion = await convertCurrency(1, fromCurrency, toCurrency);
  const history: { date: Date; rate: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Add some variation to simulate historical rates
    const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
    const rate = currentConversion.rate * (1 + variation);

    history.push({
      date,
      rate: Math.round(rate * 10000) / 10000,
    });
  }

  return history;
}

// Format currency amount
export function formatCurrency(
  amount: number,
  currency: Currency,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
    locale?: string;
  } = {}
): string {
  const {
    showSymbol = true,
    showCode = false,
    decimals = 2,
    locale = "en-US",
  } = options;

  const info = CURRENCY_INFO[currency];
  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (showSymbol && showCode) {
    return `${info.symbol}${formatted} ${currency}`;
  } else if (showSymbol) {
    return `${info.symbol}${formatted}`;
  } else if (showCode) {
    return `${formatted} ${currency}`;
  }

  return formatted;
}

// Get all supported currencies
export function getSupportedCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCY_INFO);
}

// Detect currency from country code
export function getCurrencyForCountry(countryCode: string): Currency {
  const countryToCurrency: Record<string, Currency> = {
    SA: Currency.SAR,
    EG: Currency.EGP,
    AE: Currency.AED,
    KW: Currency.KWD,
    US: Currency.USD,
  };

  return countryToCurrency[countryCode.toUpperCase()] || Currency.USD;
}

// Calculate price in user's preferred currency
export async function getPriceInUserCurrency(
  price: number,
  priceCurrency: Currency,
  userCurrency: Currency
): Promise<{
  originalPrice: number;
  originalCurrency: Currency;
  convertedPrice: number;
  userCurrency: Currency;
  formattedOriginal: string;
  formattedConverted: string;
}> {
  if (priceCurrency === userCurrency) {
    const formatted = formatCurrency(price, priceCurrency);
    return {
      originalPrice: price,
      originalCurrency: priceCurrency,
      convertedPrice: price,
      userCurrency,
      formattedOriginal: formatted,
      formattedConverted: formatted,
    };
  }

  const conversion = await convertCurrency(price, priceCurrency, userCurrency);

  return {
    originalPrice: price,
    originalCurrency: priceCurrency,
    convertedPrice: conversion.convertedAmount,
    userCurrency,
    formattedOriginal: formatCurrency(price, priceCurrency),
    formattedConverted: formatCurrency(conversion.convertedAmount, userCurrency),
  };
}

// Compare prices across currencies
export async function comparePricesInCurrency(
  prices: { amount: number; currency: Currency; storeName: string }[],
  targetCurrency: Currency
): Promise<
  {
    storeName: string;
    originalAmount: number;
    originalCurrency: Currency;
    convertedAmount: number;
    targetCurrency: Currency;
    isCheapest: boolean;
  }[]
> {
  const converted = await Promise.all(
    prices.map(async (p) => {
      const conversion = await convertCurrency(
        p.amount,
        p.currency,
        targetCurrency
      );
      return {
        storeName: p.storeName,
        originalAmount: p.amount,
        originalCurrency: p.currency,
        convertedAmount: conversion.convertedAmount,
        targetCurrency,
        isCheapest: false,
      };
    })
  );

  // Find and mark cheapest
  const minPrice = Math.min(...converted.map((c) => c.convertedAmount));
  for (const item of converted) {
    if (item.convertedAmount === minPrice) {
      item.isCheapest = true;
      break;
    }
  }

  return converted.sort((a, b) => a.convertedAmount - b.convertedAmount);
}
