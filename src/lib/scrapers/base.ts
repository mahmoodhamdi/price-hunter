import axios, { AxiosInstance, AxiosError } from "axios";
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

// Multiple user agents for rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
];

export abstract class BaseScraper {
  protected client: AxiosInstance;
  protected storeName: string;
  protected domain: string;
  protected currency: Currency;
  protected config: ScrapeConfig;
  protected maxRetries: number = 3;
  protected retryDelay: number = 2000;

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
      timeout: 15000,
      headers: {
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        ...config.headers,
      },
    });
  }

  protected getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  protected async fetchPage(url: string, retryCount = 0): Promise<cheerio.CheerioAPI> {
    try {
      // Add random delay before request to avoid rate limiting
      await this.delay(this.getRandomDelay());

      const response = await this.client.get(url, {
        headers: {
          "User-Agent": this.getRandomUserAgent(),
          "Referer": `https://www.${this.domain}/`,
        },
      });
      return cheerio.load(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;

      // Retry on timeout or 5xx errors
      const shouldRetry =
        retryCount < this.maxRetries &&
        (axiosError.code === "ECONNABORTED" ||
         axiosError.code === "ETIMEDOUT" ||
         (axiosError.response?.status && axiosError.response.status >= 500));

      if (shouldRetry) {
        const waitTime = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`[${this.storeName}] Retrying ${url} in ${waitTime}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.delay(waitTime);
        return this.fetchPage(url, retryCount + 1);
      }

      console.error(`[${this.storeName}] Error fetching ${url}:`, axiosError.message);
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
