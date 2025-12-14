import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

export interface BarcodeProduct {
  barcode: string;
  name: string;
  nameAr?: string | null;
  brand?: string | null;
  category?: string | null;
  image?: string | null;
  description?: string | null;
}

export interface BarcodeSearchResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    nameAr?: string | null;
    slug: string;
    image?: string | null;
    brand?: string | null;
    category?: string | null;
    barcode: string;
    lowestPrice?: number;
    currency?: Currency;
    storeCount: number;
  };
  external?: BarcodeProduct;
  source: "database" | "external" | "not_found";
}

export interface BarcodePriceComparison {
  barcode: string;
  productName: string;
  image?: string | null;
  stores: {
    name: string;
    slug: string;
    price: number;
    currency: Currency;
    url: string;
    inStock: boolean;
    discount?: number | null;
  }[];
  lowestPrice: number;
  highestPrice: number;
  savings: number;
}

// Search for a product by barcode
export async function searchByBarcode(
  barcode: string
): Promise<BarcodeSearchResult> {
  // Clean barcode (remove any non-numeric characters except check digits)
  const cleanBarcode = barcode.replace(/[^0-9X]/gi, "");

  // Validate barcode format
  if (!isValidBarcode(cleanBarcode)) {
    return { found: false, source: "not_found" };
  }

  // Search in database first
  const product = await prisma.product.findUnique({
    where: { barcode: cleanBarcode },
    include: {
      storeProducts: {
        include: { store: true },
        orderBy: { price: "asc" },
      },
    },
  });

  if (product) {
    const lowestPrice =
      product.storeProducts.length > 0
        ? Number(product.storeProducts[0].price)
        : undefined;
    const currency =
      product.storeProducts.length > 0
        ? product.storeProducts[0].currency
        : undefined;

    return {
      found: true,
      product: {
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        slug: product.slug,
        image: product.image,
        brand: product.brand,
        category: product.category,
        barcode: product.barcode!,
        lowestPrice,
        currency,
        storeCount: product.storeProducts.length,
      },
      source: "database",
    };
  }

  // Search external barcode databases
  const external = await searchExternalBarcodeDatabase(cleanBarcode);

  if (external) {
    return {
      found: true,
      external,
      source: "external",
    };
  }

  return { found: false, source: "not_found" };
}

// Validate barcode format
export function isValidBarcode(barcode: string): boolean {
  // EAN-13
  if (/^\d{13}$/.test(barcode)) {
    return validateEAN13(barcode);
  }

  // EAN-8
  if (/^\d{8}$/.test(barcode)) {
    return validateEAN8(barcode);
  }

  // UPC-A
  if (/^\d{12}$/.test(barcode)) {
    return validateUPCA(barcode);
  }

  // ISBN-10
  if (/^\d{9}[\dX]$/i.test(barcode)) {
    return validateISBN10(barcode);
  }

  // ISBN-13
  if (/^97[89]\d{10}$/.test(barcode)) {
    return validateEAN13(barcode); // ISBN-13 uses same algorithm as EAN-13
  }

  return false;
}

// Validate EAN-13 checksum
function validateEAN13(barcode: string): boolean {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[12]);
}

// Validate EAN-8 checksum
function validateEAN8(barcode: string): boolean {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[7]);
}

// Validate UPC-A checksum
function validateUPCA(barcode: string): boolean {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[11]);
}

// Validate ISBN-10 checksum
function validateISBN10(barcode: string): boolean {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(barcode[i]) * (10 - i);
  }
  const lastChar = barcode[9].toUpperCase();
  const lastDigit = lastChar === "X" ? 10 : parseInt(lastChar);
  sum += lastDigit;
  return sum % 11 === 0;
}

// Search external barcode database
async function searchExternalBarcodeDatabase(
  barcode: string
): Promise<BarcodeProduct | null> {
  try {
    // Try Open Food Facts (for food products)
    const foodResult = await searchOpenFoodFacts(barcode);
    if (foodResult) return foodResult;

    // Try UPC Database
    const upcResult = await searchUPCDatabase(barcode);
    if (upcResult) return upcResult;

    return null;
  } catch (error) {
    console.error("Error searching external barcode database:", error);
    return null;
  }
}

// Search Open Food Facts
async function searchOpenFoodFacts(
  barcode: string
): Promise<BarcodeProduct | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await response.json();

    if (data.status === 1 && data.product) {
      return {
        barcode,
        name: data.product.product_name || data.product.generic_name || "Unknown",
        brand: data.product.brands,
        category: data.product.categories,
        image: data.product.image_url,
        description: data.product.ingredients_text,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Search UPC Database (simplified - would need API key in production)
async function searchUPCDatabase(
  barcode: string
): Promise<BarcodeProduct | null> {
  // This is a placeholder - in production, use a real UPC database API
  // Options: Barcode Lookup API, UPC Database API, etc.
  return null;
}

// Get price comparison for a barcode
export async function getBarcodePriceComparison(
  barcode: string
): Promise<BarcodePriceComparison | null> {
  const cleanBarcode = barcode.replace(/[^0-9X]/gi, "");

  const product = await prisma.product.findUnique({
    where: { barcode: cleanBarcode },
    include: {
      storeProducts: {
        include: { store: true },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!product || product.storeProducts.length === 0) {
    return null;
  }

  const prices = product.storeProducts.map((sp) => Number(sp.price));
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);

  return {
    barcode: cleanBarcode,
    productName: product.name,
    image: product.image,
    stores: product.storeProducts.map((sp) => ({
      name: sp.store.name,
      slug: sp.store.slug,
      price: Number(sp.price),
      currency: sp.currency,
      url: sp.url,
      inStock: sp.inStock,
      discount: sp.discount,
    })),
    lowestPrice,
    highestPrice,
    savings: highestPrice - lowestPrice,
  };
}

// Register a new barcode with product data
export async function registerBarcode(
  barcode: string,
  productData: {
    name: string;
    nameAr?: string;
    brand?: string;
    category?: string;
    image?: string;
    description?: string;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  const cleanBarcode = barcode.replace(/[^0-9X]/gi, "");

  if (!isValidBarcode(cleanBarcode)) {
    return { success: false, error: "Invalid barcode format" };
  }

  // Check if barcode already exists
  const existing = await prisma.product.findUnique({
    where: { barcode: cleanBarcode },
  });

  if (existing) {
    return { success: false, error: "Barcode already registered" };
  }

  const slug = productData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const product = await prisma.product.create({
    data: {
      name: productData.name,
      nameAr: productData.nameAr,
      slug: `${slug}-${cleanBarcode}`,
      barcode: cleanBarcode,
      brand: productData.brand,
      category: productData.category,
      image: productData.image,
      description: productData.description,
    },
  });

  return { success: true, productId: product.id };
}

// Scan history for a user
export async function getScanHistory(
  userId: string,
  limit = 20
): Promise<
  {
    barcode: string;
    productName: string;
    image?: string | null;
    scannedAt: Date;
    lowestPrice?: number;
    currency?: Currency;
  }[]
> {
  const history = await prisma.barcodeScan.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          storeProducts: {
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { scannedAt: "desc" },
    take: limit,
  });

  return history.map((h) => ({
    barcode: h.barcode,
    productName: h.product?.name || h.barcode,
    image: h.product?.image,
    scannedAt: h.scannedAt,
    lowestPrice: h.product?.storeProducts[0]
      ? Number(h.product.storeProducts[0].price)
      : undefined,
    currency: h.product?.storeProducts[0]?.currency,
  }));
}

// Record a barcode scan
export async function recordBarcodeScan(
  userId: string | null,
  barcode: string
): Promise<void> {
  const cleanBarcode = barcode.replace(/[^0-9X]/gi, "");

  // Find the product
  const product = await prisma.product.findUnique({
    where: { barcode: cleanBarcode },
  });

  await prisma.barcodeScan.create({
    data: {
      userId,
      barcode: cleanBarcode,
      productId: product?.id,
    },
  });
}

// Get popular scanned products
export async function getPopularScannedProducts(
  limit = 10
): Promise<
  {
    barcode: string;
    productName: string;
    scanCount: number;
    image?: string | null;
  }[]
> {
  const scans = await prisma.barcodeScan.groupBy({
    by: ["barcode"],
    _count: { barcode: true },
    orderBy: { _count: { barcode: "desc" } },
    take: limit,
  });

  const results: {
    barcode: string;
    productName: string;
    scanCount: number;
    image?: string | null;
  }[] = [];

  for (const scan of scans) {
    const product = await prisma.product.findUnique({
      where: { barcode: scan.barcode },
    });

    results.push({
      barcode: scan.barcode,
      productName: product?.name || scan.barcode,
      scanCount: scan._count.barcode,
      image: product?.image,
    });
  }

  return results;
}

// Generate barcode for a product
export function generateBarcode(
  productId: string,
  type: "EAN13" | "EAN8" | "UPCA" = "EAN13"
): string {
  // Generate a unique barcode based on product ID
  // This is a simplified implementation - in production, use proper barcode allocation
  const numericId = productId.replace(/[^0-9]/g, "").slice(0, 11);
  const paddedId = numericId.padStart(12, "0");

  // Calculate check digit for EAN-13
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(paddedId[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return paddedId + checkDigit;
}

// Get barcode type
export function getBarcodeType(barcode: string): string | null {
  const clean = barcode.replace(/[^0-9X]/gi, "");

  if (/^\d{13}$/.test(clean)) {
    if (/^978|^979/.test(clean)) return "ISBN-13";
    return "EAN-13";
  }
  if (/^\d{12}$/.test(clean)) return "UPC-A";
  if (/^\d{8}$/.test(clean)) return "EAN-8";
  if (/^\d{9}[\dX]$/i.test(clean)) return "ISBN-10";

  return null;
}
