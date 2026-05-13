import Redis from "ioredis";

// Cache configuration
const CACHE_CONFIG = {
  // TTL in seconds
  ttl: {
    short: 60, // 1 minute
    medium: 300, // 5 minutes
    long: 3600, // 1 hour
    daily: 86400, // 24 hours
  },
  // Key prefixes
  prefix: {
    product: "product:",
    store: "store:",
    search: "search:",
    deals: "deals:",
    rates: "rates:",
    user: "user:",
    session: "session:",
  },
};

// Singleton Redis client
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL not configured, caching disabled");
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          console.error("Redis max reconnection attempts reached");
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected");
    });
  }

  return redisClient;
}

// Generic cache functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const value = await client.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = CACHE_CONFIG.ttl.medium
): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
}

export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (!client) return false;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return true;
  } catch (error) {
    console.error(`Cache delete pattern error for ${pattern}:`, error);
    return false;
  }
}

// Wrapper for cache-aside pattern.
// In test envs we bypass the cache so unit/integration tests see the
// authoritative result of every invocation (no stale fixture data and no
// false negatives on assertions like "expected fn to be called once").
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = CACHE_CONFIG.ttl.medium
): Promise<T> {
  if (process.env.NODE_ENV === "test" || process.env.PH_DISABLE_CACHE === "1") {
    return fetchFn();
  }

  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache (async, don't wait)
  cacheSet(key, data, ttlSeconds);

  return data;
}

// Product-specific cache functions
export const productCache = {
  key: (productId: string) => `${CACHE_CONFIG.prefix.product}${productId}`,

  async get<T>(productId: string): Promise<T | null> {
    return cacheGet<T>(this.key(productId));
  },

  async set<T>(productId: string, data: T, ttl = CACHE_CONFIG.ttl.medium): Promise<boolean> {
    return cacheSet(this.key(productId), data, ttl);
  },

  async invalidate(productId: string): Promise<boolean> {
    return cacheDelete(this.key(productId));
  },

  async invalidateAll(): Promise<boolean> {
    return cacheDeletePattern(`${CACHE_CONFIG.prefix.product}*`);
  },
};

// Store-specific cache functions
export const storeCache = {
  key: (storeId: string) => `${CACHE_CONFIG.prefix.store}${storeId}`,
  listKey: () => `${CACHE_CONFIG.prefix.store}list`,

  async get<T>(storeId: string): Promise<T | null> {
    return cacheGet<T>(this.key(storeId));
  },

  async set<T>(storeId: string, data: T, ttl = CACHE_CONFIG.ttl.long): Promise<boolean> {
    return cacheSet(this.key(storeId), data, ttl);
  },

  async getList<T>(): Promise<T | null> {
    return cacheGet<T>(this.listKey());
  },

  async setList<T>(data: T, ttl = CACHE_CONFIG.ttl.long): Promise<boolean> {
    return cacheSet(this.listKey(), data, ttl);
  },

  async invalidate(storeId: string): Promise<boolean> {
    await cacheDelete(this.listKey());
    return cacheDelete(this.key(storeId));
  },
};

// Search results cache
export const searchCache = {
  key: (query: string, country?: string) =>
    `${CACHE_CONFIG.prefix.search}${country || "all"}:${query.toLowerCase().trim()}`,

  async get<T>(query: string, country?: string): Promise<T | null> {
    return cacheGet<T>(this.key(query, country));
  },

  async set<T>(
    query: string,
    data: T,
    country?: string,
    ttl = CACHE_CONFIG.ttl.short
  ): Promise<boolean> {
    return cacheSet(this.key(query, country), data, ttl);
  },
};

// Deals cache
export const dealsCache = {
  key: (country?: string, category?: string) =>
    `${CACHE_CONFIG.prefix.deals}${country || "all"}:${category || "all"}`,

  async get<T>(country?: string, category?: string): Promise<T | null> {
    return cacheGet<T>(this.key(country, category));
  },

  async set<T>(
    data: T,
    country?: string,
    category?: string,
    ttl = CACHE_CONFIG.ttl.medium
  ): Promise<boolean> {
    return cacheSet(this.key(country, category), data, ttl);
  },

  async invalidateAll(): Promise<boolean> {
    return cacheDeletePattern(`${CACHE_CONFIG.prefix.deals}*`);
  },
};

// Exchange rates cache
export const ratesCache = {
  key: () => `${CACHE_CONFIG.prefix.rates}latest`,

  async get<T>(): Promise<T | null> {
    return cacheGet<T>(this.key());
  },

  async set<T>(data: T, ttl = CACHE_CONFIG.ttl.daily): Promise<boolean> {
    return cacheSet(this.key(), data, ttl);
  },
};

// Export config for external use
export { CACHE_CONFIG };
