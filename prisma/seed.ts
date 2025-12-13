import { PrismaClient, Country, Currency } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "Admin123!",
    12
  );

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@pricehunter.com" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@pricehunter.com",
      name: process.env.ADMIN_NAME || "Admin",
      password: adminPassword,
      role: "ADMIN",
      country: "SA",
      currency: "SAR",
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // Create stores
  const stores = [
    // Saudi Arabia
    {
      name: "Amazon Saudi",
      nameAr: "أمازون السعودية",
      slug: "amazon-sa",
      domain: "amazon.sa",
      logo: "/stores/amazon.svg",
      country: "SA" as Country,
      currency: "SAR" as Currency,
      scrapeConfig: {
        selectors: {
          title: "#productTitle",
          price: ".a-price-whole",
          originalPrice: ".a-text-price",
          image: "#landingImage",
          rating: ".a-icon-star",
          reviewCount: "#acrCustomerReviewText",
          inStock: "#availability",
        },
      },
    },
    {
      name: "Noon Saudi",
      nameAr: "نون السعودية",
      slug: "noon-sa",
      domain: "noon.com/saudi",
      logo: "/stores/noon.svg",
      country: "SA" as Country,
      currency: "SAR" as Currency,
      scrapeConfig: {
        selectors: {
          title: '[data-qa="pdp-name"]',
          price: '[data-qa="pdp-price"]',
          originalPrice: '[data-qa="pdp-was-price"]',
          image: '[data-qa="pdp-image"]',
          rating: '[data-qa="pdp-rating"]',
        },
      },
    },
    {
      name: "Jarir Bookstore",
      nameAr: "مكتبة جرير",
      slug: "jarir",
      domain: "jarir.com",
      logo: "/stores/jarir.svg",
      country: "SA" as Country,
      currency: "SAR" as Currency,
      scrapeConfig: {
        selectors: {
          title: ".product-name h1",
          price: ".price",
          image: "#image-main",
        },
      },
    },
    {
      name: "Extra",
      nameAr: "اكسترا",
      slug: "extra",
      domain: "extra.com",
      logo: "/stores/extra.svg",
      country: "SA" as Country,
      currency: "SAR" as Currency,
      scrapeConfig: {
        selectors: {
          title: ".product-name",
          price: ".price-wrapper",
          image: ".product-image-main",
        },
      },
    },
    {
      name: "Lulu Hypermarket",
      nameAr: "لولو هايبر ماركت",
      slug: "lulu-sa",
      domain: "luluhypermarket.com",
      logo: "/stores/lulu.svg",
      country: "SA" as Country,
      currency: "SAR" as Currency,
      scrapeConfig: {},
    },
    // Egypt
    {
      name: "Amazon Egypt",
      nameAr: "أمازون مصر",
      slug: "amazon-eg",
      domain: "amazon.eg",
      logo: "/stores/amazon.svg",
      country: "EG" as Country,
      currency: "EGP" as Currency,
      scrapeConfig: {
        selectors: {
          title: "#productTitle",
          price: ".a-price-whole",
          originalPrice: ".a-text-price",
          image: "#landingImage",
          rating: ".a-icon-star",
          reviewCount: "#acrCustomerReviewText",
          inStock: "#availability",
        },
      },
    },
    {
      name: "Noon Egypt",
      nameAr: "نون مصر",
      slug: "noon-eg",
      domain: "noon.com/egypt",
      logo: "/stores/noon.svg",
      country: "EG" as Country,
      currency: "EGP" as Currency,
      scrapeConfig: {
        selectors: {
          title: '[data-qa="pdp-name"]',
          price: '[data-qa="pdp-price"]',
          originalPrice: '[data-qa="pdp-was-price"]',
          image: '[data-qa="pdp-image"]',
        },
      },
    },
    {
      name: "Jumia Egypt",
      nameAr: "جوميا مصر",
      slug: "jumia-eg",
      domain: "jumia.com.eg",
      logo: "/stores/jumia.svg",
      country: "EG" as Country,
      currency: "EGP" as Currency,
      scrapeConfig: {
        selectors: {
          title: ".-fs20",
          price: ".-b.-ltr",
          originalPrice: ".-tal.-gy5.-lthr",
          image: ".-phs.-pvs img",
        },
      },
    },
    {
      name: "B.Tech",
      nameAr: "بي تك",
      slug: "btech",
      domain: "btech.com",
      logo: "/stores/btech.svg",
      country: "EG" as Country,
      currency: "EGP" as Currency,
      scrapeConfig: {},
    },
    {
      name: "2B",
      nameAr: "تو بي",
      slug: "2b",
      domain: "2b.com.eg",
      logo: "/stores/2b.svg",
      country: "EG" as Country,
      currency: "EGP" as Currency,
      scrapeConfig: {},
    },
    // UAE
    {
      name: "Amazon UAE",
      nameAr: "أمازون الإمارات",
      slug: "amazon-ae",
      domain: "amazon.ae",
      logo: "/stores/amazon.svg",
      country: "AE" as Country,
      currency: "AED" as Currency,
      scrapeConfig: {
        selectors: {
          title: "#productTitle",
          price: ".a-price-whole",
          originalPrice: ".a-text-price",
          image: "#landingImage",
          rating: ".a-icon-star",
          reviewCount: "#acrCustomerReviewText",
          inStock: "#availability",
        },
      },
    },
    {
      name: "Noon UAE",
      nameAr: "نون الإمارات",
      slug: "noon-ae",
      domain: "noon.com/uae",
      logo: "/stores/noon.svg",
      country: "AE" as Country,
      currency: "AED" as Currency,
      scrapeConfig: {
        selectors: {
          title: '[data-qa="pdp-name"]',
          price: '[data-qa="pdp-price"]',
          originalPrice: '[data-qa="pdp-was-price"]',
          image: '[data-qa="pdp-image"]',
        },
      },
    },
    {
      name: "Sharaf DG",
      nameAr: "شرف دي جي",
      slug: "sharaf-dg",
      domain: "sharafdg.com",
      logo: "/stores/sharafdg.svg",
      country: "AE" as Country,
      currency: "AED" as Currency,
      scrapeConfig: {},
    },
    {
      name: "Carrefour UAE",
      nameAr: "كارفور الإمارات",
      slug: "carrefour-ae",
      domain: "carrefouruae.com",
      logo: "/stores/carrefour.svg",
      country: "AE" as Country,
      currency: "AED" as Currency,
      scrapeConfig: {},
    },
  ];

  for (const store of stores) {
    await prisma.store.upsert({
      where: { slug: store.slug },
      update: store,
      create: store,
    });
  }
  console.log(`✅ ${stores.length} stores created`);

  // Create exchange rates (approximate rates)
  const exchangeRates = [
    { fromCurrency: "SAR" as Currency, toCurrency: "USD" as Currency, rate: 0.2666 },
    { fromCurrency: "EGP" as Currency, toCurrency: "USD" as Currency, rate: 0.0204 },
    { fromCurrency: "AED" as Currency, toCurrency: "USD" as Currency, rate: 0.2723 },
    { fromCurrency: "KWD" as Currency, toCurrency: "USD" as Currency, rate: 3.2520 },
    { fromCurrency: "USD" as Currency, toCurrency: "USD" as Currency, rate: 1.0 },
  ];

  for (const rate of exchangeRates) {
    await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
        },
      },
      update: { rate: rate.rate },
      create: rate,
    });
  }
  console.log(`✅ ${exchangeRates.length} exchange rates created`);

  // Create sample products for testing
  const sampleProducts = [
    {
      name: "Apple iPhone 15 Pro Max 256GB",
      nameAr: "آيفون 15 برو ماكس 256 جيجابايت",
      slug: "iphone-15-pro-max-256gb",
      brand: "Apple",
      category: "Smartphones",
      image: "https://m.media-amazon.com/images/I/81dT7CUY6GL._AC_SL1500_.jpg",
      description: "iPhone 15 Pro Max with A17 Pro chip, titanium design, and 48MP camera system",
    },
    {
      name: "Samsung Galaxy S24 Ultra 256GB",
      nameAr: "سامسونج جالكسي S24 الترا 256 جيجابايت",
      slug: "samsung-galaxy-s24-ultra-256gb",
      brand: "Samsung",
      category: "Smartphones",
      image: "https://m.media-amazon.com/images/I/71lD7eGdj-L._AC_SL1500_.jpg",
      description: "Samsung Galaxy S24 Ultra with AI features, S Pen, and 200MP camera",
    },
    {
      name: 'Sony PlayStation 5 Console',
      nameAr: "سوني بلايستيشن 5",
      slug: "sony-playstation-5",
      brand: "Sony",
      category: "Gaming",
      image: "https://m.media-amazon.com/images/I/51mWHXY8hyL._AC_SL1500_.jpg",
      description: "PlayStation 5 console with DualSense controller and 825GB SSD",
    },
    {
      name: "MacBook Pro 14-inch M3 Pro",
      nameAr: "ماك بوك برو 14 انش M3 برو",
      slug: "macbook-pro-14-m3-pro",
      brand: "Apple",
      category: "Laptops",
      image: "https://m.media-amazon.com/images/I/61lYIKPieDL._AC_SL1500_.jpg",
      description: "MacBook Pro with M3 Pro chip, 18GB RAM, and 512GB SSD",
    },
    {
      name: "LG 65-inch OLED 4K Smart TV",
      nameAr: "تلفزيون ال جي 65 بوصة OLED 4K",
      slug: "lg-65-oled-4k-tv",
      brand: "LG",
      category: "TVs",
      image: "https://m.media-amazon.com/images/I/81PJjK-b2YL._AC_SL1500_.jpg",
      description: "LG OLED 65-inch 4K UHD Smart TV with webOS and Dolby Vision",
    },
  ];

  const amazonSA = await prisma.store.findUnique({ where: { slug: "amazon-sa" } });
  const noonSA = await prisma.store.findUnique({ where: { slug: "noon-sa" } });
  const jarirStore = await prisma.store.findUnique({ where: { slug: "jarir" } });

  if (amazonSA && noonSA && jarirStore) {
    for (const productData of sampleProducts) {
      const product = await prisma.product.upsert({
        where: { slug: productData.slug },
        update: productData,
        create: productData,
      });

      // Add sample prices for each store
      const basePrices = [
        { store: amazonSA, priceMultiplier: 1.0 },
        { store: noonSA, priceMultiplier: 0.95 },
        { store: jarirStore, priceMultiplier: 1.05 },
      ];

      const basePrice = Math.floor(Math.random() * 5000) + 1000;

      for (const { store, priceMultiplier } of basePrices) {
        const price = Math.round(basePrice * priceMultiplier);
        const originalPrice = Math.round(price * 1.15);

        await prisma.storeProduct.upsert({
          where: {
            productId_storeId: {
              productId: product.id,
              storeId: store.id,
            },
          },
          update: {
            price,
            priceUSD: price * 0.2666,
            originalPrice,
            discount: 15,
            inStock: Math.random() > 0.1,
            rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
            reviewCount: Math.floor(Math.random() * 5000),
          },
          create: {
            productId: product.id,
            storeId: store.id,
            url: `https://${store.domain}/product/${product.slug}`,
            price,
            currency: "SAR",
            priceUSD: price * 0.2666,
            originalPrice,
            discount: 15,
            inStock: Math.random() > 0.1,
            rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
            reviewCount: Math.floor(Math.random() * 5000),
          },
        });
      }
    }
    console.log(`✅ ${sampleProducts.length} sample products with prices created`);
  }

  console.log("🌱 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
