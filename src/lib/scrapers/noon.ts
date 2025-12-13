import { Currency } from "@prisma/client";
import { BaseScraper, ScrapedProduct, ScrapeConfig } from "./base";

export class NoonScraper extends BaseScraper {
  private countryCode: string;
  private locale: string;

  constructor(
    countryCode: "saudi" | "egypt" | "uae",
    currency: Currency
  ) {
    const config: ScrapeConfig = {
      selectors: {
        title: '[data-qa="pdp-name"], .productTitle',
        price: '[data-qa="pdp-price"], .priceNow',
        originalPrice: '[data-qa="pdp-was-price"], .priceWas',
        image: '[data-qa="pdp-image-main"] img, .swiper-slide img',
        rating: '[data-qa="pdp-rating"], .stars',
        inStock: '[data-qa="pdp-add-to-cart"]',
      },
    };

    super(`Noon ${countryCode}`, "noon.com", currency, config);
    this.countryCode = countryCode;
    this.locale = countryCode === "egypt" ? "egypt-ar" :
                  countryCode === "saudi" ? "saudi-ar" : "uae-ar";
  }

  async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      const $ = await this.fetchPage(url);

      // Try multiple selectors for title
      let title = $('[data-qa="pdp-name"]').text().trim();
      if (!title) {
        title = $("h1").first().text().trim();
      }
      if (!title) {
        console.log(`No title found for ${url}`);
        return null;
      }

      // Extract price from various possible locations
      let priceText = $('[data-qa="pdp-price"]').text();
      if (!priceText) {
        priceText = $(".priceNow").text();
      }
      if (!priceText) {
        priceText = $('span:contains("SAR"), span:contains("EGP"), span:contains("AED")')
          .first()
          .text();
      }

      const price = this.parsePrice(priceText);
      if (price === 0) {
        console.log(`No valid price found for ${url}`);
        return null;
      }

      const originalPriceText = $('[data-qa="pdp-was-price"], .priceWas').text();
      const originalPrice = this.parsePrice(originalPriceText);

      // Extract image
      let image = $('[data-qa="pdp-image-main"] img').attr("src");
      if (!image) {
        image = $(".swiper-slide img").first().attr("src");
      }
      if (image && !image.startsWith("http")) {
        image = `https:${image}`;
      }

      // Check stock availability
      const addToCartExists = $('[data-qa="pdp-add-to-cart"]').length > 0;
      const inStock = addToCartExists;

      // Extract rating
      const ratingText = $('[data-qa="pdp-rating"]').text();
      const rating = this.parseRating(ratingText);

      // Extract brand
      const brand = $('[data-qa="pdp-brand"]').text().trim() ||
        $('a[href*="/brand/"]').first().text().trim();

      // Extract SKU/barcode from URL
      const skuMatch = url.match(/\/p\/([A-Z0-9]+)/i);
      const barcode = skuMatch ? skuMatch[1] : undefined;

      return {
        name: title,
        price,
        originalPrice: originalPrice > price ? originalPrice : undefined,
        currency: this.currency,
        url,
        image,
        inStock,
        rating,
        barcode,
        brand,
      };
    } catch (error) {
      console.error(`Error scraping Noon product ${url}:`, error);
      return null;
    }
  }

  async searchProducts(query: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    const searchUrl = `https://www.noon.com/${this.locale}/search/?q=${encodeURIComponent(query)}`;

    try {
      const $ = await this.fetchPage(searchUrl);

      // Noon uses a grid layout for search results
      const productElements = $('[data-qa="product-block"], .productContainer');

      for (let i = 0; i < Math.min(productElements.length, 20); i++) {
        const el = productElements.eq(i);

        const title = el.find('[data-qa="product-name"], .productTitle').text().trim();
        if (!title) continue;

        const href = el.find("a").first().attr("href");
        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://www.noon.com${href}`;

        const priceText = el.find('[data-qa="product-price"], .price').text();
        const price = this.parsePrice(priceText);
        if (price === 0) continue;

        const image = el.find("img").first().attr("src");

        const ratingText = el.find('[data-qa="product-rating"]').text();
        const rating = this.parseRating(ratingText);

        products.push({
          name: title,
          price,
          currency: this.currency,
          url,
          image: image?.startsWith("http") ? image : image ? `https:${image}` : undefined,
          inStock: true,
          rating,
        });

        if (i < productElements.length - 1) {
          await this.delay(100);
        }
      }
    } catch (error) {
      console.error(`Error searching Noon for "${query}":`, error);
    }

    return products;
  }
}
