import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product/ProductCard";
import { TrendingUp } from "lucide-react";

export default async function TrendingPage() {
  const t = await getTranslations();

  // Compute date threshold for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get most searched products (based on search history)
  const trendingSearches = await prisma.searchHistory.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      createdAt: {
        gte: sevenDaysAgo,
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
    take: 24,
  });

  const productIds = trendingSearches
    .filter((s) => s.productId)
    .map((s) => s.productId as string);

  // Fetch trending products
  let trendingProducts = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    include: {
      storeProducts: {
        where: { store: { isActive: true } },
        include: { store: true },
        orderBy: { price: "asc" },
      },
    },
  });

  // If no trending data, show recently updated products
  if (trendingProducts.length === 0) {
    trendingProducts = await prisma.product.findMany({
      where: {
        storeProducts: {
          some: {
            store: { isActive: true },
          },
        },
      },
      include: {
        storeProducts: {
          where: { store: { isActive: true } },
          include: { store: true },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t("nav.trending")}</h1>
      </div>

      {trendingProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No trending products</h2>
          <p className="text-muted-foreground">
            Start searching for products to see trending items.
          </p>
        </div>
      )}
    </div>
  );
}
