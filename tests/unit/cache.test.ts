import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ioredis before importing cache module
const mockGet = vi.fn();
const mockSetex = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();
const mockOn = vi.fn();

vi.mock("ioredis", () => {
  const RedisMock = function () {
    return {
      get: mockGet,
      setex: mockSetex,
      del: mockDel,
      keys: mockKeys,
      on: mockOn,
    };
  };
  return { default: RedisMock };
});

// Set REDIS_URL before importing
process.env.REDIS_URL = "redis://localhost:6379";

import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  withCache,
  productCache,
  storeCache,
  searchCache,
  dealsCache,
  ratesCache,
  CACHE_CONFIG,
} from "@/lib/cache";

describe("Cache Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cacheGet", () => {
    it("should return parsed JSON for existing key", async () => {
      mockGet.mockResolvedValue(JSON.stringify({ name: "test" }));
      const result = await cacheGet<{ name: string }>("test-key");
      expect(result).toEqual({ name: "test" });
      expect(mockGet).toHaveBeenCalledWith("test-key");
    });

    it("should return null for missing key", async () => {
      mockGet.mockResolvedValue(null);
      const result = await cacheGet("missing-key");
      expect(result).toBeNull();
    });

    it("should return null on error (graceful degradation)", async () => {
      mockGet.mockRejectedValue(new Error("Connection refused"));
      const result = await cacheGet("error-key");
      expect(result).toBeNull();
    });
  });

  describe("cacheSet", () => {
    it("should store JSON with TTL", async () => {
      mockSetex.mockResolvedValue("OK");
      const result = await cacheSet("key", { data: 123 }, 60);
      expect(result).toBe(true);
      expect(mockSetex).toHaveBeenCalledWith("key", 60, JSON.stringify({ data: 123 }));
    });

    it("should use medium TTL by default", async () => {
      mockSetex.mockResolvedValue("OK");
      await cacheSet("key", "value");
      expect(mockSetex).toHaveBeenCalledWith(
        "key",
        CACHE_CONFIG.ttl.medium,
        JSON.stringify("value")
      );
    });

    it("should return false on error", async () => {
      mockSetex.mockRejectedValue(new Error("Connection refused"));
      const result = await cacheSet("key", "value");
      expect(result).toBe(false);
    });
  });

  describe("cacheDelete", () => {
    it("should delete a key", async () => {
      mockDel.mockResolvedValue(1);
      const result = await cacheDelete("key");
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith("key");
    });

    it("should return false on error", async () => {
      mockDel.mockRejectedValue(new Error("Error"));
      const result = await cacheDelete("key");
      expect(result).toBe(false);
    });
  });

  describe("cacheDeletePattern", () => {
    it("should delete matching keys", async () => {
      mockKeys.mockResolvedValue(["product:1", "product:2"]);
      mockDel.mockResolvedValue(2);
      const result = await cacheDeletePattern("product:*");
      expect(result).toBe(true);
      expect(mockKeys).toHaveBeenCalledWith("product:*");
      expect(mockDel).toHaveBeenCalledWith("product:1", "product:2");
    });

    it("should handle no matching keys", async () => {
      mockKeys.mockResolvedValue([]);
      const result = await cacheDeletePattern("nonexistent:*");
      expect(result).toBe(true);
      // del should not be called when there are no keys
    });

    it("should return false on error", async () => {
      mockKeys.mockRejectedValue(new Error("Error"));
      const result = await cacheDeletePattern("error:*");
      expect(result).toBe(false);
    });
  });

  describe("withCache", () => {
    it("should return cached value when available", async () => {
      mockGet.mockResolvedValue(JSON.stringify({ cached: true }));
      const fetchFn = vi.fn().mockResolvedValue({ cached: false });

      const result = await withCache("key", fetchFn);
      expect(result).toEqual({ cached: true });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("should fetch and cache on miss", async () => {
      mockGet.mockResolvedValue(null);
      mockSetex.mockResolvedValue("OK");
      const fetchFn = vi.fn().mockResolvedValue({ fresh: true });

      const result = await withCache("key", fetchFn, 120);
      expect(result).toEqual({ fresh: true });
      expect(fetchFn).toHaveBeenCalled();
    });
  });

  describe("productCache", () => {
    it("should generate correct key format", () => {
      expect(productCache.key("abc123")).toBe("product:abc123");
    });

    it("should get product from cache", async () => {
      mockGet.mockResolvedValue(JSON.stringify({ name: "iPhone" }));
      const result = await productCache.get("abc123");
      expect(result).toEqual({ name: "iPhone" });
    });

    it("should set product in cache", async () => {
      mockSetex.mockResolvedValue("OK");
      const result = await productCache.set("abc123", { name: "iPhone" });
      expect(result).toBe(true);
    });

    it("should invalidate a product", async () => {
      mockDel.mockResolvedValue(1);
      const result = await productCache.invalidate("abc123");
      expect(result).toBe(true);
    });

    it("should invalidate all products", async () => {
      mockKeys.mockResolvedValue(["product:1", "product:2"]);
      mockDel.mockResolvedValue(2);
      const result = await productCache.invalidateAll();
      expect(result).toBe(true);
    });
  });

  describe("storeCache", () => {
    it("should generate correct key format", () => {
      expect(storeCache.key("store1")).toBe("store:store1");
      expect(storeCache.listKey()).toBe("store:list");
    });

    it("should get store list from cache", async () => {
      mockGet.mockResolvedValue(JSON.stringify([{ name: "Amazon" }]));
      const result = await storeCache.getList();
      expect(result).toEqual([{ name: "Amazon" }]);
    });

    it("should set store list in cache", async () => {
      mockSetex.mockResolvedValue("OK");
      const result = await storeCache.setList([{ name: "Amazon" }]);
      expect(result).toBe(true);
    });

    it("should invalidate store and list", async () => {
      mockDel.mockResolvedValue(1);
      await storeCache.invalidate("store1");
      // Should call del for both list key and store key
      expect(mockDel).toHaveBeenCalledWith("store:list");
      expect(mockDel).toHaveBeenCalledWith("store:store1");
    });
  });

  describe("searchCache", () => {
    it("should generate key with country", () => {
      expect(searchCache.key("iphone", "SA")).toBe("search:SA:iphone");
    });

    it("should generate key without country", () => {
      expect(searchCache.key("iphone")).toBe("search:all:iphone");
    });

    it("should lowercase and trim query in key", () => {
      expect(searchCache.key("  iPhone 15  ", "SA")).toBe("search:SA:iphone 15");
    });
  });

  describe("dealsCache", () => {
    it("should generate key with country and category", () => {
      expect(dealsCache.key("SA", "electronics")).toBe("deals:SA:electronics");
    });

    it("should generate default key", () => {
      expect(dealsCache.key()).toBe("deals:all:all");
    });

    it("should invalidate all deals", async () => {
      mockKeys.mockResolvedValue(["deals:SA:all"]);
      mockDel.mockResolvedValue(1);
      const result = await dealsCache.invalidateAll();
      expect(result).toBe(true);
    });
  });

  describe("ratesCache", () => {
    it("should generate correct key", () => {
      expect(ratesCache.key()).toBe("rates:latest");
    });

    it("should set rates in cache", async () => {
      mockSetex.mockResolvedValue("OK");
      const result = await ratesCache.set({ USD: 1, SAR: 3.75 });
      expect(result).toBe(true);
      expect(mockSetex).toHaveBeenCalledWith(
        "rates:latest",
        CACHE_CONFIG.ttl.daily,
        expect.any(String)
      );
    });
  });

  describe("CACHE_CONFIG", () => {
    it("should have correct TTL values", () => {
      expect(CACHE_CONFIG.ttl.short).toBe(60);
      expect(CACHE_CONFIG.ttl.medium).toBe(300);
      expect(CACHE_CONFIG.ttl.long).toBe(3600);
      expect(CACHE_CONFIG.ttl.daily).toBe(86400);
    });

    it("should have correct prefixes", () => {
      expect(CACHE_CONFIG.prefix.product).toBe("product:");
      expect(CACHE_CONFIG.prefix.store).toBe("store:");
      expect(CACHE_CONFIG.prefix.search).toBe("search:");
      expect(CACHE_CONFIG.prefix.deals).toBe("deals:");
      expect(CACHE_CONFIG.prefix.rates).toBe("rates:");
    });
  });
});
