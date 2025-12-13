import { describe, it, expect, vi, beforeEach } from "vitest";
import { Currency } from "@prisma/client";

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

describe("Amazon Scraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create scraper for Saudi Arabia", async () => {
    const { AmazonScraper } = await import("@/lib/scrapers/amazon");
    const scraper = new AmazonScraper("sa", "SAR");
    expect(scraper).toBeDefined();
  });

  it("should create scraper for Egypt", async () => {
    const { AmazonScraper } = await import("@/lib/scrapers/amazon");
    const scraper = new AmazonScraper("eg", "EGP");
    expect(scraper).toBeDefined();
  });

  it("should create scraper for UAE", async () => {
    const { AmazonScraper } = await import("@/lib/scrapers/amazon");
    const scraper = new AmazonScraper("ae", "AED");
    expect(scraper).toBeDefined();
  });
});

describe("Noon Scraper", () => {
  it("should create scraper for Saudi Arabia", async () => {
    const { NoonScraper } = await import("@/lib/scrapers/noon");
    const scraper = new NoonScraper("saudi", "SAR");
    expect(scraper).toBeDefined();
  });

  it("should create scraper for Egypt", async () => {
    const { NoonScraper } = await import("@/lib/scrapers/noon");
    const scraper = new NoonScraper("egypt", "EGP");
    expect(scraper).toBeDefined();
  });

  it("should create scraper for UAE", async () => {
    const { NoonScraper } = await import("@/lib/scrapers/noon");
    const scraper = new NoonScraper("uae", "AED");
    expect(scraper).toBeDefined();
  });
});

describe("Jarir Scraper", () => {
  it("should create scraper instance", async () => {
    const { JarirScraper } = await import("@/lib/scrapers/jarir");
    const scraper = new JarirScraper();
    expect(scraper).toBeDefined();
  });
});

describe("Extra Scraper", () => {
  it("should create scraper instance", async () => {
    const { ExtraScraper } = await import("@/lib/scrapers/extra");
    const scraper = new ExtraScraper();
    expect(scraper).toBeDefined();
  });
});

describe("Jumia Scraper", () => {
  it("should create scraper instance", async () => {
    const { JumiaScraper } = await import("@/lib/scrapers/jumia");
    const scraper = new JumiaScraper();
    expect(scraper).toBeDefined();
  });
});

describe("B.Tech Scraper", () => {
  it("should create scraper instance", async () => {
    const { BTechScraper } = await import("@/lib/scrapers/btech");
    const scraper = new BTechScraper();
    expect(scraper).toBeDefined();
  });
});

describe("Scraper URL Detection", () => {
  it("should detect Amazon SA URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    // Mock the scraper
    const result = await scrapeProductFromUrl("https://www.amazon.sa/dp/B09V3KXJPB");
    expect(result.storeSlug).toBe("amazon-sa");
  });

  it("should detect Amazon EG URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    const result = await scrapeProductFromUrl("https://www.amazon.eg/dp/B09V3KXJPB");
    expect(result.storeSlug).toBe("amazon-eg");
  });

  it("should detect Noon SA URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    const result = await scrapeProductFromUrl(
      "https://www.noon.com/saudi-en/product/123"
    );
    expect(result.storeSlug).toBe("noon-sa");
  });

  it("should detect Jarir URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    const result = await scrapeProductFromUrl(
      "https://www.jarir.com/sa-en/product/123"
    );
    expect(result.storeSlug).toBe("jarir");
  });

  it("should detect Extra URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    const result = await scrapeProductFromUrl(
      "https://www.extra.com/sa-en/product/123"
    );
    expect(result.storeSlug).toBe("extra");
  });

  it("should detect Jumia EG URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    const result = await scrapeProductFromUrl(
      "https://www.jumia.com.eg/product/123"
    );
    expect(result.storeSlug).toBe("jumia-eg");
  });

  it("should detect B.Tech URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    const result = await scrapeProductFromUrl(
      "https://www.btech.com/en/product/123"
    );
    expect(result.storeSlug).toBe("btech");
  });

  it("should return null for unknown URLs", async () => {
    const { scrapeProductFromUrl } = await import("@/lib/scrapers");

    const result = await scrapeProductFromUrl("https://unknown-store.com/product");
    expect(result.storeSlug).toBeNull();
  });
});

describe("searchAllStores", () => {
  it("should search multiple stores in parallel", async () => {
    const { searchAllStores } = await import("@/lib/scrapers");

    const results = await searchAllStores("test", ["amazon-sa"]);
    expect(results).toBeInstanceOf(Map);
  });
});
