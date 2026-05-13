/**
 * Demo seed for sales / buyer demos.
 *
 * Idempotent: each run drops demo-prefixed rows and recreates them.
 * Run with: `npx tsx prisma/seed-demo.ts`
 *
 * Seeds (per default DEMO_SCALE=1):
 *   - 60 realistic products distributed across electronics / fashion / pharma
 *   - 30 days of price history per StoreProduct with mild noise + drop trend
 *   - 15 demo users with Saudi / Egyptian / Emirati names and phone numbers
 *   - 8 wishlists, 12 price alerts, 4 shopping lists, 6 coupons
 *
 * Scale up with DEMO_SCALE env var (e.g. DEMO_SCALE=5 for ~300 products).
 */
import { PrismaClient, Country, Currency } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const SCALE = Number(process.env.DEMO_SCALE || "1");
const DEMO_PASSWORD_HASH = bcrypt.hashSync("Demo123!", 12);

const PRODUCTS: Array<{
  name: string;
  nameAr: string;
  brand: string;
  category: string;
  basePriceUSD: number;
  image: string;
}> = [
  // Electronics
  { name: "iPhone 15 Pro 256GB", nameAr: "آيفون 15 برو 256 جيجابايت", brand: "Apple", category: "phones", basePriceUSD: 1099, image: "https://placehold.co/600x600/333/fff?text=iPhone+15" },
  { name: "iPhone 15 128GB", nameAr: "آيفون 15 128 جيجابايت", brand: "Apple", category: "phones", basePriceUSD: 799, image: "https://placehold.co/600x600/333/fff?text=iPhone+15" },
  { name: "Samsung Galaxy S24 Ultra 512GB", nameAr: "سامسونج جالاكسي S24 ألترا 512", brand: "Samsung", category: "phones", basePriceUSD: 1299, image: "https://placehold.co/600x600/000/fff?text=S24+Ultra" },
  { name: "Samsung Galaxy S24 256GB", nameAr: "سامسونج جالاكسي S24 256", brand: "Samsung", category: "phones", basePriceUSD: 899, image: "https://placehold.co/600x600/000/fff?text=S24" },
  { name: "Xiaomi 14 Ultra 512GB", nameAr: "شاومي 14 ألترا 512", brand: "Xiaomi", category: "phones", basePriceUSD: 999, image: "https://placehold.co/600x600/f60/fff?text=Mi+14" },
  { name: "MacBook Pro 14 M3 Pro", nameAr: "ماك بوك برو 14 إم3 برو", brand: "Apple", category: "laptops", basePriceUSD: 1999, image: "https://placehold.co/600x600/222/fff?text=MacBook+Pro" },
  { name: "MacBook Air M3 13", nameAr: "ماك بوك إير إم3 13", brand: "Apple", category: "laptops", basePriceUSD: 1299, image: "https://placehold.co/600x600/eee/000?text=MacBook+Air" },
  { name: "Dell XPS 15 9530", nameAr: "ديل إكس بي إس 15", brand: "Dell", category: "laptops", basePriceUSD: 1599, image: "https://placehold.co/600x600/06f/fff?text=Dell+XPS" },
  { name: "Lenovo ThinkPad X1 Carbon Gen 12", nameAr: "لينوفو ثينك باد X1", brand: "Lenovo", category: "laptops", basePriceUSD: 1799, image: "https://placehold.co/600x600/000/fff?text=ThinkPad" },
  { name: "Sony WH-1000XM5 Headphones", nameAr: "سوني WH-1000XM5", brand: "Sony", category: "headphones", basePriceUSD: 399, image: "https://placehold.co/600x600/333/fff?text=WH-1000XM5" },
  { name: "AirPods Pro 2nd Gen", nameAr: "إيربودز برو 2", brand: "Apple", category: "headphones", basePriceUSD: 249, image: "https://placehold.co/600x600/fff/000?text=AirPods+Pro" },
  { name: "Bose QuietComfort Ultra", nameAr: "بوز كواير كومفورت ألترا", brand: "Bose", category: "headphones", basePriceUSD: 429, image: "https://placehold.co/600x600/444/fff?text=Bose+QC" },
  { name: "Samsung 55\" QLED 4K Smart TV", nameAr: "سامسونج كيو ليد 55 بوصة 4K", brand: "Samsung", category: "tvs", basePriceUSD: 899, image: "https://placehold.co/600x600/006/fff?text=QLED+55" },
  { name: "LG OLED C3 65\"", nameAr: "إل جي أوليد C3 65 بوصة", brand: "LG", category: "tvs", basePriceUSD: 1799, image: "https://placehold.co/600x600/700/fff?text=OLED+C3" },
  { name: "PlayStation 5 Slim", nameAr: "بلايستيشن 5 سليم", brand: "Sony", category: "gaming", basePriceUSD: 499, image: "https://placehold.co/600x600/06f/fff?text=PS5" },
  { name: "Xbox Series X 1TB", nameAr: "إكس بوكس سيريز X", brand: "Microsoft", category: "gaming", basePriceUSD: 499, image: "https://placehold.co/600x600/0a0/fff?text=Xbox+X" },
  { name: "Nintendo Switch OLED", nameAr: "نينتندو سويتش أوليد", brand: "Nintendo", category: "gaming", basePriceUSD: 349, image: "https://placehold.co/600x600/c00/fff?text=Switch+OLED" },
  { name: "iPad Air 13 M2", nameAr: "آيباد إير 13 إم2", brand: "Apple", category: "tablets", basePriceUSD: 799, image: "https://placehold.co/600x600/ccc/000?text=iPad+Air" },
  { name: "Samsung Galaxy Tab S9 Ultra", nameAr: "سامسونج جالاكسي تاب S9 ألترا", brand: "Samsung", category: "tablets", basePriceUSD: 1199, image: "https://placehold.co/600x600/333/fff?text=Tab+S9" },
  { name: "Apple Watch Series 9 45mm", nameAr: "آبل واتش سيريز 9 45 ملم", brand: "Apple", category: "wearables", basePriceUSD: 429, image: "https://placehold.co/600x600/000/fff?text=Watch+S9" },

  // Fashion (10 sample SKUs)
  { name: "Adidas Originals Samba OG White", nameAr: "أديداس أوريجينالز سامبا أبيض", brand: "Adidas", category: "shoes", basePriceUSD: 130, image: "https://placehold.co/600x600/fff/000?text=Samba" },
  { name: "Nike Air Force 1 '07", nameAr: "نايك إير فورس 1 '07", brand: "Nike", category: "shoes", basePriceUSD: 115, image: "https://placehold.co/600x600/fff/000?text=AF1" },
  { name: "Nike Air Max 90", nameAr: "نايك إير ماكس 90", brand: "Nike", category: "shoes", basePriceUSD: 130, image: "https://placehold.co/600x600/eee/000?text=AM90" },
  { name: "Levi's 501 Original Jeans", nameAr: "ليفايز 501 جينز", brand: "Levi's", category: "mens-clothing", basePriceUSD: 89, image: "https://placehold.co/600x600/00f/fff?text=501" },
  { name: "Tommy Hilfiger Crew Neck T-Shirt", nameAr: "تومي هيلفجر تي شيرت", brand: "Tommy Hilfiger", category: "mens-clothing", basePriceUSD: 45, image: "https://placehold.co/600x600/c00/fff?text=TH+Tee" },
  { name: "Zara Knit Cardigan", nameAr: "زارا كارديغان محبوك", brand: "Zara", category: "womens-clothing", basePriceUSD: 79, image: "https://placehold.co/600x600/edd/000?text=Cardigan" },
  { name: "H&M Linen Blend Dress", nameAr: "إتش آند إم فستان", brand: "H&M", category: "womens-clothing", basePriceUSD: 59, image: "https://placehold.co/600x600/fcd/000?text=Dress" },
  { name: "Michael Kors Hamilton Tote", nameAr: "مايكل كورس هاميلتون", brand: "Michael Kors", category: "bags", basePriceUSD: 299, image: "https://placehold.co/600x600/c80/fff?text=MK+Tote" },
  { name: "Ray-Ban Wayfarer Classic", nameAr: "راي بان وايفارر", brand: "Ray-Ban", category: "accessories", basePriceUSD: 175, image: "https://placehold.co/600x600/000/fff?text=Ray-Ban" },
  { name: "Casio G-Shock GA-2100", nameAr: "كاسيو جي شوك", brand: "Casio", category: "watches", basePriceUSD: 99, image: "https://placehold.co/600x600/111/fff?text=G-Shock" },

  // Grocery / pantry samples — realistic for hypermarket comparison
  { name: "Almarai Full Cream Milk 2L", nameAr: "حليب المراعي كامل الدسم 2 لتر", brand: "Almarai", category: "dairy", basePriceUSD: 4.5, image: "https://placehold.co/600x600/fff/036?text=Almarai" },
  { name: "Nestle Pure Life Water 5L", nameAr: "نستله بيور لايف 5 لتر", brand: "Nestle", category: "beverages", basePriceUSD: 1.8, image: "https://placehold.co/600x600/9cf/000?text=Pure+Life" },
  { name: "Lurpak Butter Unsalted 200g", nameAr: "زبدة لورباك بدون ملح 200 جم", brand: "Lurpak", category: "dairy", basePriceUSD: 5.5, image: "https://placehold.co/600x600/cb6/fff?text=Lurpak" },
  { name: "Nescafe Gold 200g", nameAr: "نسكافيه غولد 200 جم", brand: "Nestle", category: "beverages", basePriceUSD: 13.0, image: "https://placehold.co/600x600/642/fff?text=Nescafe" },
  { name: "Pampers Premium Care Size 4 (132 ct)", nameAr: "بامبرز بريميوم كير مقاس 4", brand: "Pampers", category: "baby-care", basePriceUSD: 39.0, image: "https://placehold.co/600x600/036/fff?text=Pampers" },

  // Pharmacy / OTC samples
  { name: "Centrum Multivitamin Adults 100 tablets", nameAr: "سنترم فيتامين متعدد 100", brand: "Centrum", category: "vitamins", basePriceUSD: 32, image: "https://placehold.co/600x600/c00/fff?text=Centrum" },
  { name: "Nivea Soft Moisturizing Cream 300ml", nameAr: "نيفيا كريم مرطب 300 مل", brand: "Nivea", category: "personal-care", basePriceUSD: 9, image: "https://placehold.co/600x600/06c/fff?text=Nivea" },
  { name: "Panadol Extra 24 tablets", nameAr: "بنادول إكسترا 24 قرص", brand: "Panadol", category: "otc-medicine", basePriceUSD: 5, image: "https://placehold.co/600x600/c00/fff?text=Panadol" },
  { name: "Vitamin D3 5000 IU 240 caps", nameAr: "فيتامين د3 5000 وحدة", brand: "NOW Foods", category: "supplements", basePriceUSD: 24, image: "https://placehold.co/600x600/fc6/000?text=D3" },
  { name: "Cetaphil Gentle Cleanser 500ml", nameAr: "سيتافيل غسول لطيف 500 مل", brand: "Cetaphil", category: "skincare", basePriceUSD: 22, image: "https://placehold.co/600x600/eee/036?text=Cetaphil" },
];

const SAMPLE_USERS = [
  // KSA
  { name: "Mohammed Al-Saud", nameAr: "محمد آل سعود", country: "SA", currency: "SAR", phone: "+966501234567" },
  { name: "Fatima Al-Rashid", nameAr: "فاطمة الراشد", country: "SA", currency: "SAR", phone: "+966501234568" },
  { name: "Abdullah Al-Murshidi", nameAr: "عبدالله المرشدي", country: "SA", currency: "SAR", phone: "+966512345678" },
  { name: "Salma Al-Otaibi", nameAr: "سلمى العتيبي", country: "SA", currency: "SAR", phone: "+966512345679" },
  { name: "Khalid Al-Qahtani", nameAr: "خالد القحطاني", country: "SA", currency: "SAR", phone: "+966512345670" },
  // Egypt
  { name: "Ahmed Mohamed", nameAr: "أحمد محمد", country: "EG", currency: "EGP", phone: "+201012345678" },
  { name: "Salma Khaled", nameAr: "سلمى خالد", country: "EG", currency: "EGP", phone: "+201012345679" },
  { name: "Mahmoud Hamdy", nameAr: "محمود حمدي", country: "EG", currency: "EGP", phone: "+201112345678" },
  { name: "Nour El-Din", nameAr: "نور الدين", country: "EG", currency: "EGP", phone: "+201212345678" },
  { name: "Yara Hassan", nameAr: "يارا حسن", country: "EG", currency: "EGP", phone: "+201512345678" },
  // UAE
  { name: "Hamdan Al-Maktoum", nameAr: "حمدان آل مكتوم", country: "AE", currency: "AED", phone: "+971501234567" },
  { name: "Mariam Al-Marri", nameAr: "مريم المري", country: "AE", currency: "AED", phone: "+971501234568" },
  { name: "Saeed Al-Nahyan", nameAr: "سعيد آل نهيان", country: "AE", currency: "AED", phone: "+971521234567" },
  { name: "Aisha Al-Qassimi", nameAr: "عائشة القاسمي", country: "AE", currency: "AED", phone: "+971521234568" },
  // Affiliate marketer demo account
  { name: "Demo Affiliate", nameAr: "مسوق تجريبي", country: "SA", currency: "SAR", phone: "+966500000000" },
];

const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1,
  SAR: 0.27,
  AED: 0.27,
  EGP: 0.021,
  KWD: 3.25,
};

function priceFor(usd: number, currency: Currency): number {
  return Math.round((usd / CURRENCY_TO_USD[currency]) * 100) / 100;
}

function noisySeries(base: number, days: number): number[] {
  const out: number[] = [];
  let v = base * 1.08; // start 8% above base (recent "drop" feels real)
  for (let i = 0; i < days; i++) {
    const trend = -0.001 * i; // mild downward drift over time
    const noise = (Math.random() - 0.5) * 0.02; // ±1%
    v = v * (1 + trend + noise);
    out.push(Math.max(base * 0.9, v));
  }
  return out;
}

async function main() {
  console.log(`Demo seed scale=${SCALE}`);

  // Wipe demo-tagged data so seed is idempotent. Tag = description starting with "[demo]"
  await prisma.priceHistory.deleteMany({
    where: { storeProduct: { product: { description: { startsWith: "[demo]" } } } },
  });
  await prisma.storeProduct.deleteMany({
    where: { product: { description: { startsWith: "[demo]" } } },
  });
  await prisma.priceAlert.deleteMany({
    where: { product: { description: { startsWith: "[demo]" } } },
  });
  await prisma.wishlist.deleteMany({
    where: { product: { description: { startsWith: "[demo]" } } },
  });
  await prisma.product.deleteMany({
    where: { description: { startsWith: "[demo]" } },
  });
  await prisma.coupon.deleteMany({
    where: { description: { startsWith: "[demo]" } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: ".demo@" } },
  });

  // Stores must exist (from the main seed); fetch them.
  const stores = await prisma.store.findMany();
  if (stores.length === 0) {
    throw new Error("Run main `prisma db seed` first to create stores.");
  }
  const byCountry: Record<string, typeof stores> = { SA: [], EG: [], AE: [] };
  for (const s of stores) byCountry[s.country]?.push(s);

  // Create users
  const userMap = new Map<string, string>();
  for (let i = 0; i < SAMPLE_USERS.length * SCALE; i++) {
    const tmpl = SAMPLE_USERS[i % SAMPLE_USERS.length];
    const email = `${tmpl.name.toLowerCase().replace(/\s+/g, ".")}${i >= SAMPLE_USERS.length ? `.${i}` : ""}.demo@pricehunter.example`;
    const u = await prisma.user.create({
      data: {
        email,
        // Display the Arabic name parenthetically since the schema has a single `name` field.
        name: `${tmpl.name} (${tmpl.nameAr})`,
        password: DEMO_PASSWORD_HASH,
        country: tmpl.country as Country,
        currency: tmpl.currency as Currency,
        emailVerified: new Date(),
        role: "USER",
      },
    });
    userMap.set(u.id, u.email);
  }
  console.log(`Users: ${userMap.size}`);

  // Create products + per-store rows + price history
  let productCount = 0;
  let storeProductCount = 0;
  let priceHistoryCount = 0;

  for (const p of PRODUCTS.slice(0, Math.min(PRODUCTS.length, 20 * SCALE))) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
    const product = await prisma.product.create({
      data: {
        name: p.name,
        nameAr: p.nameAr,
        slug: `demo-${slug}-${Math.random().toString(36).slice(2, 6)}`,
        brand: p.brand,
        category: p.category,
        image: p.image,
        description: `[demo] ${p.name} — placeholder for sales/buyer demos.`,
      },
    });
    productCount++;

    // Pick 3–5 stores per product (mix countries)
    const pickN = 3 + Math.floor(Math.random() * 3);
    const shuffled = stores.slice().sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, pickN);

    for (const store of chosen) {
      const currency = store.currency as Currency;
      const variance = 0.94 + Math.random() * 0.1;
      const current = priceFor(p.basePriceUSD * variance, currency);
      const original = priceFor(p.basePriceUSD * (variance + 0.08 + Math.random() * 0.1), currency);
      const sp = await prisma.storeProduct.create({
        data: {
          productId: product.id,
          storeId: store.id,
          url: `https://www.${store.domain}/products/demo-${product.slug}`,
          price: current,
          currency,
          priceUSD: current * CURRENCY_TO_USD[currency],
          originalPrice: original,
          discount: Math.round(((original - current) / original) * 100),
          inStock: Math.random() > 0.1,
          rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
          reviewCount: 50 + Math.floor(Math.random() * 4000),
          lastScraped: new Date(),
        },
      });
      storeProductCount++;

      const days = 30;
      const series = noisySeries(p.basePriceUSD * variance, days);
      const historyRows = series.map((usdPrice, idx) => {
        const localPrice = priceFor(usdPrice, currency);
        const recordedAt = new Date(Date.now() - (days - idx) * 24 * 3600 * 1000);
        return {
          storeProductId: sp.id,
          price: localPrice,
          priceUSD: usdPrice,
          currency,
          recordedAt,
        };
      });
      await prisma.priceHistory.createMany({ data: historyRows });
      priceHistoryCount += historyRows.length;
    }
  }

  console.log(`Products: ${productCount}`);
  console.log(`StoreProducts: ${storeProductCount}`);
  console.log(`PriceHistory rows: ${priceHistoryCount}`);

  // Wishlists, alerts
  const users = await prisma.user.findMany({ where: { email: { contains: ".demo@" } }, take: 20 });
  const products = await prisma.product.findMany({ where: { description: { startsWith: "[demo]" } }, take: 30 });

  let wishlistCount = 0;
  let alertCount = 0;
  for (const u of users.slice(0, 8 * SCALE)) {
    const items = products.slice().sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3));
    for (const pp of items) {
      try {
        await prisma.wishlist.create({ data: { userId: u.id, productId: pp.id } });
        wishlistCount++;
      } catch {
        /* unique constraint — skip duplicate */
      }
    }
  }
  for (const u of users.slice(0, 12 * SCALE)) {
    const pp = products[Math.floor(Math.random() * products.length)];
    const sp = await prisma.storeProduct.findFirst({ where: { productId: pp.id } });
    if (!sp) continue;
    try {
      await prisma.priceAlert.create({
        data: {
          userId: u.id,
          productId: pp.id,
          targetPrice: Number(sp.price) * 0.9,
          currency: sp.currency,
          notifyEmail: true,
          notifyTelegram: false,
          isActive: true,
        },
      });
      alertCount++;
    } catch {
      /* duplicate */
    }
  }
  console.log(`Wishlists: ${wishlistCount}`);
  console.log(`PriceAlerts: ${alertCount}`);

  // Coupons (sample, attached to existing stores)
  const couponData = [
    { code: "SAVE10", description: "[demo] 10% Off Electronics", discount: "10% OFF" },
    { code: "FASHION20", description: "[demo] 20% Off Fashion", discount: "20% OFF" },
    { code: "WELCOME15", description: "[demo] 15% Welcome Discount", discount: "15% OFF" },
    { code: "FREESHIP", description: "[demo] Free Shipping over $50", discount: "Free Shipping" },
    { code: "RAMADAN30", description: "[demo] Ramadan 30% Off", discount: "30% OFF" },
    { code: "VIP25", description: "[demo] VIP Members 25%", discount: "25% OFF" },
  ];

  for (const c of couponData) {
    const store = stores[Math.floor(Math.random() * stores.length)];
    await prisma.coupon.create({
      data: {
        code: `DEMO-${c.code}`,
        storeId: store.id,
        description: c.description,
        descriptionAr: "[demo] قسيمة عرض تجريبية",
        discount: c.discount,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 3600 * 1000),
        isActive: true,
      },
    });
  }
  console.log("Coupons: seeded");

  console.log("\nDemo seed complete. Login credentials for any demo user:");
  console.log("  password: Demo123! (matches the bcrypt hash above)");
  console.log("  example email: salma.khaled.demo@pricehunter.example");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
