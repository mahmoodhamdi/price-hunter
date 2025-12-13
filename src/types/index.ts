import type {
  User,
  Store,
  Product,
  StoreProduct,
  PriceHistory,
  Wishlist,
  PriceAlert,
  ExchangeRate,
  Country,
  Currency,
} from "@prisma/client";

// Re-export Prisma types
export type {
  User,
  Store,
  Product,
  StoreProduct,
  PriceHistory,
  Wishlist,
  PriceAlert,
  ExchangeRate,
  Country,
  Currency,
};

// Extended types with relations
export type ProductWithPrices = Product & {
  storeProducts: (StoreProduct & {
    store: Store;
    priceHistory: PriceHistory[];
  })[];
};

export type StoreProductWithDetails = StoreProduct & {
  store: Store;
  product: Product;
  priceHistory: PriceHistory[];
};

export type PriceComparison = {
  product: Product;
  prices: {
    store: Store;
    price: number;
    originalPrice?: number;
    currency: Currency;
    priceUSD: number;
    discount?: number;
    inStock: boolean;
    rating?: number;
    reviewCount?: number;
    url: string;
    lastScraped: Date;
  }[];
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  priceRange: {
    currency: Currency;
    min: number;
    max: number;
  };
};

export type PriceHistoryPoint = {
  date: Date;
  price: number;
  priceUSD: number;
  currency: Currency;
};

export type SearchResult = {
  products: ProductWithPrices[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// API Response types
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

// Currency conversion
export type ConversionResult = {
  amount: number;
  from: Currency;
  to: Currency;
  rate: number;
  convertedAmount: number;
};

// Scraper types
export type ScrapedProduct = {
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
};

export type ScrapeResult = {
  success: boolean;
  products?: ScrapedProduct[];
  error?: string;
  itemsProcessed: number;
  duration: number;
};

// Notification types
export type NotificationChannel = "email" | "telegram" | "push";

export type NotificationPayload = {
  userId: string;
  type: "price_alert" | "wishlist_update" | "deal";
  title: string;
  message: string;
  productId?: string;
  url?: string;
  channels: NotificationChannel[];
};

// User preferences
export type UserPreferences = {
  country: Country;
  currency: Currency;
  language: "en" | "ar";
  theme: "light" | "dark" | "system";
  notifications: {
    email: boolean;
    telegram: boolean;
    push: boolean;
  };
};
