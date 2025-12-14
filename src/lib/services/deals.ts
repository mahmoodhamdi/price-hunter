import { prisma } from "@/lib/prisma";
import { Country } from "@prisma/client";

export interface Deal {
  id: string;
  productId: string;
  name: string;
  nameAr?: string | null;
  image?: string | null;
  brand?: string | null;
  price: number;
  originalPrice: number;
  discount: number;
  currency: string;
  store: {
    name: string;
    nameAr: string;
    slug: string;
    logo?: string | null;
  };
  url: string;
}

// Get best deals (products with highest discounts)
export async function getDeals(options: {
  country?: Country;
  limit?: number;
  minDiscount?: number;
  category?: string;
}): Promise<Deal[]> {
  const { country, limit = 20, minDiscount = 10, category } = options;

  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      discount: {
        gte: minDiscount,
      },
      inStock: true,
      store: country
        ? {
            country,
            isActive: true,
          }
        : {
            isActive: true,
          },
      product: category
        ? {
            category: {
              contains: category,
              mode: "insensitive",
            },
          }
        : undefined,
    },
    include: {
      product: true,
      store: true,
    },
    orderBy: {
      discount: "desc",
    },
    take: limit,
  });

  return storeProducts.map((sp) => ({
    id: sp.id,
    productId: sp.productId,
    name: sp.product.name,
    nameAr: sp.product.nameAr,
    image: sp.product.image,
    brand: sp.product.brand,
    price: Number(sp.price),
    originalPrice: Number(sp.originalPrice) || Number(sp.price),
    discount: sp.discount || 0,
    currency: sp.currency,
    store: {
      name: sp.store.name,
      nameAr: sp.store.nameAr,
      slug: sp.store.slug,
      logo: sp.store.logo,
    },
    url: sp.url,
  }));
}

// Get trending products based on search history
export async function getTrendingProducts(options: {
  country?: Country;
  limit?: number;
  days?: number;
}): Promise<{
  productId: string;
  name: string;
  nameAr?: string | null;
  image?: string | null;
  searchCount: number;
  lowestPrice?: number;
  currency?: string;
}[]> {
  const { country, limit = 10, days = 7 } = options;

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get most searched products
  const searches = await prisma.searchHistory.groupBy({
    by: ["productId"],
    where: {
      productId: {
        not: null,
      },
      createdAt: {
        gte: since,
      },
    },
    _count: {
      productId: true,
    },
    orderBy: {
      _count: {
        productId: "desc",
      },
    },
    take: limit,
  });

  const productIds = searches
    .map((s) => s.productId)
    .filter((id): id is string => id !== null);

  if (productIds.length === 0) {
    // Fall back to recently updated products
    const recentProducts = await prisma.product.findMany({
      take: limit,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        storeProducts: {
          where: country
            ? {
                store: {
                  country,
                  isActive: true,
                },
              }
            : {
                store: {
                  isActive: true,
                },
              },
          orderBy: {
            price: "asc",
          },
          take: 1,
        },
      },
    });

    return recentProducts.map((p) => ({
      productId: p.id,
      name: p.name,
      nameAr: p.nameAr,
      image: p.image,
      searchCount: 0,
      lowestPrice: p.storeProducts[0]
        ? Number(p.storeProducts[0].price)
        : undefined,
      currency: p.storeProducts[0]?.currency,
    }));
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    include: {
      storeProducts: {
        where: country
          ? {
              store: {
                country,
                isActive: true,
              },
            }
          : {
              store: {
                isActive: true,
              },
            },
        orderBy: {
          price: "asc",
        },
        take: 1,
      },
    },
  });

  // Maintain the order from search counts
  const productMap = new Map(products.map((p) => [p.id, p]));
  const searchCountMap = new Map(
    searches.map((s) => [s.productId, s._count.productId])
  );

  return productIds
    .map((id) => {
      const product = productMap.get(id);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        nameAr: product.nameAr,
        image: product.image,
        searchCount: searchCountMap.get(id) || 0,
        lowestPrice: product.storeProducts[0]
          ? Number(product.storeProducts[0].price)
          : undefined,
        currency: product.storeProducts[0]?.currency,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

// Get recently added products
export async function getNewProducts(options: {
  country?: Country;
  limit?: number;
  days?: number;
}): Promise<Deal[]> {
  const { country, limit = 20, days = 7 } = options;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      createdAt: {
        gte: since,
      },
      inStock: true,
      store: country
        ? {
            country,
            isActive: true,
          }
        : {
            isActive: true,
          },
    },
    include: {
      product: true,
      store: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return storeProducts.map((sp) => ({
    id: sp.id,
    productId: sp.productId,
    name: sp.product.name,
    nameAr: sp.product.nameAr,
    image: sp.product.image,
    brand: sp.product.brand,
    price: Number(sp.price),
    originalPrice: Number(sp.originalPrice) || Number(sp.price),
    discount: sp.discount || 0,
    currency: sp.currency,
    store: {
      name: sp.store.name,
      nameAr: sp.store.nameAr,
      slug: sp.store.slug,
      logo: sp.store.logo,
    },
    url: sp.url,
  }));
}

// Get price drops (products whose price decreased recently)
export async function getPriceDrops(options: {
  country?: Country;
  limit?: number;
}): Promise<
  (Deal & { previousPrice: number; dropPercentage: number })[]
> {
  const { country, limit = 20 } = options;

  // Get products with price history
  const storeProducts = await prisma.storeProduct.findMany({
    where: {
      inStock: true,
      store: country
        ? {
            country,
            isActive: true,
          }
        : {
            isActive: true,
          },
    },
    include: {
      product: true,
      store: true,
      priceHistory: {
        orderBy: {
          recordedAt: "desc",
        },
        take: 2,
      },
    },
  });

  // Filter products where current price is lower than previous
  const priceDrops = storeProducts
    .filter((sp) => {
      if (sp.priceHistory.length < 2) return false;
      const currentPrice = Number(sp.priceHistory[0].price);
      const previousPrice = Number(sp.priceHistory[1].price);
      return currentPrice < previousPrice;
    })
    .map((sp) => {
      const currentPrice = Number(sp.priceHistory[0].price);
      const previousPrice = Number(sp.priceHistory[1].price);
      const dropPercentage = Math.round(
        ((previousPrice - currentPrice) / previousPrice) * 100
      );

      return {
        id: sp.id,
        productId: sp.productId,
        name: sp.product.name,
        nameAr: sp.product.nameAr,
        image: sp.product.image,
        brand: sp.product.brand,
        price: Number(sp.price),
        originalPrice: Number(sp.originalPrice) || Number(sp.price),
        discount: sp.discount || 0,
        currency: sp.currency,
        store: {
          name: sp.store.name,
          nameAr: sp.store.nameAr,
          slug: sp.store.slug,
          logo: sp.store.logo,
        },
        url: sp.url,
        previousPrice,
        dropPercentage,
      };
    })
    .sort((a, b) => b.dropPercentage - a.dropPercentage)
    .slice(0, limit);

  return priceDrops;
}
