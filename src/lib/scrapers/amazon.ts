import { Currency } from "@prisma/client";
import { BaseScraper, ScrapedProduct, ScrapeConfig } from "./base";

export class AmazonScraper extends BaseScraper {
  private countryCode: string;

  constructor(
    countryCode: "sa" | "eg" | "ae",
    currency: Currency
  ) {
    const domain = `amazon.${countryCode}`;
    const config: ScrapeConfig = {
      selectors: {
        title: "#productTitle",
        price: ".a-price-whole",
        originalPrice: ".a-text-price .a-offscreen",
        image: "#landingImage, #imgBlkFront",
        rating: "span.a-icon-alt",
        reviewCount: "#acrCustomerReviewText",
        inStock: "#availability span",
        description: "#productDescription p, #feature-bullets li",
      },
    };

    super(`Amazon ${countryCode.toUpperCase()}`, domain, currency, config);
    this.countryCode = countryCode;
  }

  async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      const $ = await this.fetchPage(url);

      const title = $(this.config.selectors.title!).text().trim();
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

      const originalPriceText = $(this.config.selectors.originalPrice!).first().text();
      const originalPrice = this.parsePrice(originalPriceText);

      const image = $(this.config.selectors.image!)
        .attr("src") || $(this.config.selectors.image!).attr("data-old-hires");

      const ratingText = $(this.config.selectors.rating!).first().text();
      const rating = this.parseRating(ratingText);

      const reviewCountText = $(this.config.selectors.reviewCount!).text();
      const reviewCount = this.parseReviewCount(reviewCountText);

      const stockText = $(this.config.selectors.inStock!).text();
      const inStock = this.checkInStock(stockText);

      // Extract ASIN from URL
      const asinMatch = url.match(/\/dp\/([A-Z0-9]+)/i);
      const barcode = asinMatch ? asinMatch[1] : undefined;

      // Extract brand
      const brand = $("#bylineInfo").text().replace(/Visit the|Brand:|Store/gi, "").trim() ||
        $('tr:contains("Brand") td').last().text().trim();

      // Extract description
      const descriptionParts: string[] = [];
      $(this.config.selectors.description!).each((_, el) => {
        const text = $(el).text().trim();
        if (text) descriptionParts.push(text);
      });
      const description = descriptionParts.slice(0, 5).join(" ");

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
        description: description.slice(0, 500),
      };
    } catch (error) {
      console.error(`Error scraping Amazon product ${url}:`, error);
      return null;
    }
  }

  async searchProducts(query: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    const searchUrl = `https://www.${this.domain}/s?k=${encodeURIComponent(query)}`;

    try {
      const $ = await this.fetchPage(searchUrl);

      const productElements = $('[data-component-type="s-search-result"]');

      for (let i = 0; i < Math.min(productElements.length, 20); i++) {
        const el = productElements.eq(i);

        const titleEl = el.find("h2 a span");
        const title = titleEl.text().trim();
        if (!title) continue;

        const linkEl = el.find("h2 a");
        const href = linkEl.attr("href");
        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://www.${this.domain}${href}`;

        const priceWhole = el.find(".a-price-whole").first().text();
        const priceFraction = el.find(".a-price-fraction").first().text();
        const price = this.parsePrice(`${priceWhole}${priceFraction}`);
        if (price === 0) continue;

        const image = el.find("img.s-image").attr("src");

        const ratingText = el.find(".a-icon-star-small .a-icon-alt").text();
        const rating = this.parseRating(ratingText);

        const reviewCountText = el.find('[aria-label*="stars"] + span').text();
        const reviewCount = this.parseReviewCount(reviewCountText);

        products.push({
          name: title,
          price,
          currency: this.currency,
          url,
          image,
          inStock: true,
          rating,
          reviewCount,
        });

        // Add delay between processing
        if (i < productElements.length - 1) {
          await this.delay(100);
        }
      }
    } catch (error) {
      console.error(`Error searching Amazon for "${query}":`, error);
    }

    return products;
  }
}
