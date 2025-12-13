import { Currency } from "@prisma/client";
import { BaseScraper, ScrapedProduct, ScrapeConfig } from "./base";

export class BTechScraper extends BaseScraper {
  constructor() {
    const config: ScrapeConfig = {
      selectors: {
        title: ".product-name, h1.title",
        price: ".price-box .price, .special-price .price",
        originalPrice: ".old-price .price",
        image: ".product-image img, .gallery-image img",
        rating: ".rating-summary .rating-result",
        reviewCount: ".reviews-actions",
        inStock: ".stock.available, .availability.in-stock",
        description: ".product-description, .description-content",
      },
    };

    super("B.Tech", "btech.com", "EGP" as Currency, config);
  }

  async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      const $ = await this.fetchPage(url);

      const title = $(this.config.selectors.title!).first().text().trim();
      if (!title) {
        console.log(`No title found for ${url}`);
        return null;
      }

      const priceText = $(this.config.selectors.price!).first().text();
      const price = this.parsePrice(priceText);

      if (price === 0) {
        console.log(`No valid price found for ${url}`);
        return null;
      }

      const originalPriceText = $(this.config.selectors.originalPrice!).text();
      const originalPrice = this.parsePrice(originalPriceText);

      let image = $(this.config.selectors.image!).first().attr("src") ||
        $(this.config.selectors.image!).first().attr("data-src");
      if (image && !image.startsWith("http")) {
        image = `https://btech.com${image}`;
      }

      const stockElement = $(this.config.selectors.inStock!);
      const inStock = stockElement.length > 0;

      const ratingText = $(this.config.selectors.rating!).attr("style") || "";
      const widthMatch = ratingText.match(/width:\s*(\d+)%/);
      const rating = widthMatch ? parseFloat(widthMatch[1]) / 20 : undefined;

      const reviewCountText = $(this.config.selectors.reviewCount!).text();
      const reviewCount = this.parseReviewCount(reviewCountText);

      const brand = $(".product-brand a, .brand-name").first().text().trim();

      const description = $(this.config.selectors.description!)
        .first()
        .text()
        .trim()
        .slice(0, 500);

      // Extract SKU from URL
      const skuMatch = url.match(/\/p\/([^\/]+)/);
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
        reviewCount,
        barcode,
        brand,
        description,
      };
    } catch (error) {
      console.error(`Error scraping B.Tech product ${url}:`, error);
      return null;
    }
  }

  async searchProducts(query: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    const searchUrl = `https://btech.com/en/catalogsearch/result/?q=${encodeURIComponent(query)}`;

    try {
      const $ = await this.fetchPage(searchUrl);

      const productElements = $(".product-item, .product-card");

      for (let i = 0; i < Math.min(productElements.length, 20); i++) {
        const el = productElements.eq(i);

        const title = el.find(".product-item-link, .product-name a").text().trim();
        if (!title) continue;

        const href = el.find(".product-item-link, a").first().attr("href");
        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://btech.com${href}`;

        const priceText = el.find(".price, .special-price .price").text();
        const price = this.parsePrice(priceText);
        if (price === 0) continue;

        const image = el.find(".product-image-photo, img").first().attr("src") ||
          el.find("img").first().attr("data-src");

        products.push({
          name: title,
          price,
          currency: this.currency,
          url,
          image: image?.startsWith("http") ? image : image ? `https://btech.com${image}` : undefined,
          inStock: true,
        });

        if (i < productElements.length - 1) {
          await this.delay(100);
        }
      }
    } catch (error) {
      console.error(`Error searching B.Tech for "${query}":`, error);
    }

    return products;
  }
}
