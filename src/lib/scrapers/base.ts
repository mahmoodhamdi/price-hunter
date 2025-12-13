import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";
import { Currency } from "@prisma/client";

export interface ScrapedProduct {
  name: string;
  nameAr?: string;
  price: number;
  originalPrice?: number;
  currency: Currency;
  url: string;
  image?: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
  barcode?: string;
  brand?: string;
  category?: string;
  description?: string;
}

export interface ScrapeConfig {
  selectors: {
    title?: string;
    price?: string;
    originalPrice?: string;
    image?: string;
    rating?: string;
    reviewCount?: string;
    inStock?: string;
    description?: string;
  };
  headers?: Record<string, string>;
}

export abstract class BaseScraper {
  protected client: AxiosInstance;
  protected storeName: string;
  protected domain: string;
  protected currency: Currency;
  protected config: ScrapeConfig;

  constructor(
    storeName: string,
    domain: string,
    currency: Currency,
    config: ScrapeConfig
  ) {
    this.storeName = storeName;
    this.domain = domain;
    this.currency = currency;
    this.config = config;

    this.client = axios.create({
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        ...config.headers,
      },
    });
  }

  protected async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    try {
      const response = await this.client.get(url);
      return cheerio.load(response.data);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  protected parsePrice(priceText: string): number {
    // Remove currency symbols and non-numeric characters except decimal
    const cleaned = priceText
      .replace(/[^\d.,]/g, "")
      .replace(/,/g, "");
    return parseFloat(cleaned) || 0;
  }

  protected parseRating(ratingText: string): number | undefined {
    const match = ratingText.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : undefined;
  }

  protected parseReviewCount(countText: string): number | undefined {
    const match = countText.replace(/,/g, "").match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  }

  protected checkInStock(stockText: string): boolean {
    const outOfStockKeywords = [
      "out of stock",
      "unavailable",
      "غير متوفر",
      "نفذ",
      "sold out",
    ];
    const lowerText = stockText.toLowerCase();
    return !outOfStockKeywords.some((keyword) => lowerText.includes(keyword));
  }

  abstract scrapeProduct(url: string): Promise<ScrapedProduct | null>;

  abstract searchProducts(query: string): Promise<ScrapedProduct[]>;

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected getRandomDelay(): number {
    const min = parseInt(process.env.SCRAPE_DELAY_MIN || "1000");
    const max = parseInt(process.env.SCRAPE_DELAY_MAX || "3000");
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
