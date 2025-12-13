import { Currency } from "@prisma/client";
import { BaseScraper, ScrapedProduct, ScrapeConfig } from "./base";

export class JumiaScraper extends BaseScraper {
  constructor() {
    const config: ScrapeConfig = {
      selectors: {
        title: ".-fs20, h1.-fs20, .name",
        price: ".-b.-ltr, .price .-b",
        originalPrice: ".-tal.-gy5.-lthr, .old-price",
        image: ".-phs.-pvs img, .sldr img, .img-cover",
        rating: ".-fs14 .-pvxs, .stars",
        reviewCount: ".-plxs.-fs14, .reviews",
        inStock: ".-oos-msg",
        description: ".markup.-pam, .description",
      },
    };

    super("Jumia Egypt", "jumia.com.eg", "EGP" as Currency, config);
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

      let image = $(this.config.selectors.image!).first().attr("data-src") ||
        $(this.config.selectors.image!).first().attr("src");
      if (image && !image.startsWith("http")) {
        image = `https:${image}`;
      }

      // Check if out of stock message exists
      const oosMessage = $(this.config.selectors.inStock!).text();
      const inStock = !oosMessage || oosMessage.length === 0;

      const ratingText = $(this.config.selectors.rating!).first().text();
      const rating = this.parseRating(ratingText);

      const reviewCountText = $(this.config.selectors.reviewCount!).text();
      const reviewCount = this.parseReviewCount(reviewCountText);

      const brand = $(".-mhm a, .brand").first().text().trim();

      const description = $(this.config.selectors.description!)
        .text()
        .trim()
        .slice(0, 500);

      // Extract SKU from URL
      const skuMatch = url.match(/-(\d+)\.html/);
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
      console.error(`Error scraping Jumia product ${url}:`, error);
      return null;
    }
  }

  async searchProducts(query: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    const searchUrl = `https://www.jumia.com.eg/catalog/?q=${encodeURIComponent(query)}`;

    try {
      const $ = await this.fetchPage(searchUrl);

      const productElements = $(".prd, article.prd");

      for (let i = 0; i < Math.min(productElements.length, 20); i++) {
        const el = productElements.eq(i);

        const title = el.find(".name, .core").text().trim();
        if (!title) continue;

        const href = el.find("a.core").attr("href");
        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://www.jumia.com.eg${href}`;

        const priceText = el.find(".prc, .price").text();
        const price = this.parsePrice(priceText);
        if (price === 0) continue;

        const image = el.find("img.img").attr("data-src") ||
          el.find("img").first().attr("src");

        const ratingText = el.find(".stars._s").text();
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
      console.error(`Error searching Jumia for "${query}":`, error);
    }

    return products;
  }
}
