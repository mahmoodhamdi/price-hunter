import { Currency } from "@prisma/client";
import { BaseScraper, ScrapedProduct, ScrapeConfig } from "./base";

export class ExtraScraper extends BaseScraper {
  constructor() {
    const config: ScrapeConfig = {
      selectors: {
        title: ".product-name, h1.title",
        price: ".price-wrapper .price, .final-price",
        originalPrice: ".old-price .price, .was-price",
        image: ".product-image-main img, .gallery-image",
        rating: ".rating-summary .rating-result",
        reviewCount: ".reviews-actions .action.view",
        inStock: ".stock.available, .in-stock",
        description: ".product-description, .overview",
      },
    };

    super("Extra", "extra.com", "SAR" as Currency, config);
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

      let image = $(this.config.selectors.image!).attr("src") ||
        $(this.config.selectors.image!).attr("data-src");
      if (image && !image.startsWith("http")) {
        image = `https://www.extra.com${image}`;
      }

      const stockText = $(this.config.selectors.inStock!).text();
      const inStock = stockText.length > 0 && !stockText.toLowerCase().includes("out of stock");

      const ratingText = $(this.config.selectors.rating!).attr("style") || "";
      const widthMatch = ratingText.match(/width:\s*(\d+)%/);
      const rating = widthMatch ? parseFloat(widthMatch[1]) / 20 : undefined;

      const reviewCountText = $(this.config.selectors.reviewCount!).text();
      const reviewCount = this.parseReviewCount(reviewCountText);

      const brand = $(".product-brand, .brand").first().text().trim();

      const description = $(this.config.selectors.description!)
        .first()
        .text()
        .trim()
        .slice(0, 500);

      // Extract SKU from URL
      const skuMatch = url.match(/\/p\/([^/]+)/);
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
      console.error(`Error scraping Extra product ${url}:`, error);
      return null;
    }
  }

  async searchProducts(query: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    const searchUrl = `https://www.extra.com/en-sa/search/?text=${encodeURIComponent(query)}`;

    try {
      const $ = await this.fetchPage(searchUrl);

      const productElements = $(".product-item, .product-tile");

      for (let i = 0; i < Math.min(productElements.length, 20); i++) {
        const el = productElements.eq(i);

        const title = el.find(".product-name, .product-title").text().trim();
        if (!title) continue;

        const href = el.find("a.product-link, a").first().attr("href");
        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://www.extra.com${href}`;

        const priceText = el.find(".price, .final-price").text();
        const price = this.parsePrice(priceText);
        if (price === 0) continue;

        const image = el.find("img.product-image, img").first().attr("src") ||
          el.find("img").first().attr("data-src");

        products.push({
          name: title,
          price,
          currency: this.currency,
          url,
          image: image?.startsWith("http") ? image : image ? `https://www.extra.com${image}` : undefined,
          inStock: true,
        });

        if (i < productElements.length - 1) {
          await this.delay(100);
        }
      }
    } catch (error) {
      console.error(`Error searching Extra for "${query}":`, error);
    }

    return products;
  }
}
