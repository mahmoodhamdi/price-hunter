import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidUrl, extractDomain } from "@/lib/utils";
import {
  fetchAndSaveProducts,
  fetchProductFromUrl,
} from "@/lib/services/product-fetch";
import { Country } from "@prisma/client";

const MIN_RESULTS_THRESHOLD = 3;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const country = (searchParams.get("country") || "SA") as Country;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const fresh = searchParams.get("fresh") === "true";
  const store = searchParams.get("store");

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }

  try {
    // Check if query is a URL
    if (isValidUrl(query)) {
      const domain = extractDomain(query);

      // Find product by URL in store_products
      const storeProduct = await prisma.storeProduct.findFirst({
        where: {
          url: { contains: domain || "" },
        },
        include: {
          product: {
            include: {
              storeProducts: {
                include: {
                  store: true,
                },
              },
            },
          },
          store: true,
        },
      });

      if (storeProduct) {
        return NextResponse.json({
          products: [storeProduct.product],
          total: 1,
          page: 1,
          pageSize: 1,
          totalPages: 1,
          source: "database",
        });
      }

      // Not found in DB - auto-scrape from URL
      const scrapeResult = await fetchProductFromUrl(query);
      if (scrapeResult.productId) {
        const product = await prisma.product.findUnique({
          where: { id: scrapeResult.productId },
          include: {
            storeProducts: {
              include: { store: true },
            },
          },
        });

        return NextResponse.json({
          products: product ? [product] : [],
          total: product ? 1 : 0,
          page: 1,
          pageSize: 1,
          totalPages: product ? 1 : 0,
          source: "scraped",
          meta: {
            isNew: scrapeResult.isNew,
          },
        });
      }

      return NextResponse.json({
        products: [],
        total: 0,
        page: 1,
        pageSize: 1,
        totalPages: 0,
        source: "url",
        message: scrapeResult.error || "Could not fetch product from URL",
      });
    }

    // Search by name/barcode in database
    const skip = (page - 1) * pageSize;

    // Build search conditions
    const searchConditions = {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { nameAr: { contains: query, mode: "insensitive" as const } },
        { barcode: { contains: query, mode: "insensitive" as const } },
        { brand: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
      ],
    };

    // Get products with their prices from stores in the selected country
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: searchConditions,
        include: {
          storeProducts: {
            where: {
              store: {
                country: country as "SA" | "EG" | "AE" | "KW",
                isActive: true,
              },
            },
            include: {
              store: true,
            },
            orderBy: {
              price: "asc",
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.product.count({
        where: searchConditions,
      }),
    ]);

    // Filter out products with no prices in the selected country
    const productsWithPrices = products.filter(
      (p) => p.storeProducts.length > 0
    );

    // Auto-fetch from scrapers if results are below threshold or fresh is requested
    if (fresh || productsWithPrices.length < MIN_RESULTS_THRESHOLD) {
      const fetchResult = await fetchAndSaveProducts(query, {
        country,
        stores: store ? [store] : undefined,
        timeout: 30000,
      });

      // Re-fetch from database with new results
      if (fetchResult.totalScraped > 0) {
        const [updatedProducts, updatedTotal] = await Promise.all([
          prisma.product.findMany({
            where: searchConditions,
            include: {
              storeProducts: {
                where: {
                  store: {
                    country: country as "SA" | "EG" | "AE" | "KW",
                    isActive: true,
                  },
                },
                include: {
                  store: true,
                },
                orderBy: {
                  price: "asc",
                },
              },
            },
            skip,
            take: pageSize,
            orderBy: {
              updatedAt: "desc",
            },
          }),
          prisma.product.count({
            where: searchConditions,
          }),
        ]);

        const updatedProductsWithPrices = updatedProducts.filter(
          (p) => p.storeProducts.length > 0
        );

        // Record search history
        prisma.searchHistory
          .create({
            data: {
              query,
              results: updatedProductsWithPrices.length,
            },
          })
          .catch(console.error);

        return NextResponse.json({
          products: updatedProductsWithPrices,
          total: updatedTotal,
          page,
          pageSize,
          totalPages: Math.ceil(updatedTotal / pageSize),
          source: "scraped",
          meta: {
            fromDatabase: productsWithPrices.length,
            newlyScraped: fetchResult.newProducts,
            updated: fetchResult.updatedProducts,
            storeResults: fetchResult.storeResults,
            duration: fetchResult.duration,
          },
        });
      }
    }

    // Record search history (async, don't wait)
    prisma.searchHistory
      .create({
        data: {
          query,
          results: productsWithPrices.length,
        },
      })
      .catch(console.error);

    return NextResponse.json({
      products: productsWithPrices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: "database",
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
