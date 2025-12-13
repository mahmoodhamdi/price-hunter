import { describe, it, expect } from "vitest";
import { getScraperForStore, StoreSlug } from "@/lib/scrapers";

describe("Scraper Factory", () => {
  describe("getScraperForStore", () => {
    it("should return AmazonScraper for amazon-sa", () => {
      const scraper = getScraperForStore("amazon-sa");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("AmazonScraper");
    });

    it("should return AmazonScraper for amazon-eg", () => {
      const scraper = getScraperForStore("amazon-eg");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("AmazonScraper");
    });

    it("should return AmazonScraper for amazon-ae", () => {
      const scraper = getScraperForStore("amazon-ae");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("AmazonScraper");
    });

    it("should return NoonScraper for noon-sa", () => {
      const scraper = getScraperForStore("noon-sa");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("NoonScraper");
    });

    it("should return NoonScraper for noon-eg", () => {
      const scraper = getScraperForStore("noon-eg");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("NoonScraper");
    });

    it("should return NoonScraper for noon-ae", () => {
      const scraper = getScraperForStore("noon-ae");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("NoonScraper");
    });

    it("should return JarirScraper for jarir", () => {
      const scraper = getScraperForStore("jarir");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("JarirScraper");
    });

    it("should return ExtraScraper for extra", () => {
      const scraper = getScraperForStore("extra");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("ExtraScraper");
    });

    it("should return JumiaScraper for jumia-eg", () => {
      const scraper = getScraperForStore("jumia-eg");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("JumiaScraper");
    });

    it("should return BTechScraper for btech", () => {
      const scraper = getScraperForStore("btech");
      expect(scraper).not.toBeNull();
      expect(scraper?.constructor.name).toBe("BTechScraper");
    });

    it("should return null for unimplemented stores", () => {
      const scraper = getScraperForStore("2b" as StoreSlug);
      expect(scraper).toBeNull();
    });

    it("should cache scrapers", () => {
      const scraper1 = getScraperForStore("amazon-sa");
      const scraper2 = getScraperForStore("amazon-sa");
      expect(scraper1).toBe(scraper2);
    });
  });
});

describe("BaseScraper utilities", () => {
  const scraper = getScraperForStore("amazon-sa");

  it("should have required methods", () => {
    expect(scraper).toHaveProperty("scrapeProduct");
    expect(scraper).toHaveProperty("searchProducts");
    expect(typeof scraper?.scrapeProduct).toBe("function");
    expect(typeof scraper?.searchProducts).toBe("function");
  });
});
