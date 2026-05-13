import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product/ProductCard";
import { Percent } from "lucide-react";
import { DealsGrid } from "./DealsGrid";

const HOT_WINDOW_MS = 24 * 60 * 60 * 1000;

export default async function DealsPage() {
  const t = await getTranslations();

  // Find products with highest discounts
  const dealsProducts = await prisma.product.findMany({
    where: {
      storeProducts: {
        some: {
          discount: { gte: 10 },
          store: { isActive: true },
        },
      },
    },
    include: {
      storeProducts: {
        where: {
          store: { isActive: true },
          discount: { gte: 10 },
        },
        include: { store: true },
        orderBy: { discount: "desc" },
      },
    },
    take: 24,
  });

  // Pre-compute filterable metadata server-side so the client filter
  // band has cheap numbers to filter on.
  const cutoff = Date.now() - HOT_WINDOW_MS;
  const enriched = dealsProducts.map((product) => {
    const discounts = product.storeProducts.map((sp) => Number(sp.discount) || 0);
    const ratings = product.storeProducts
      .map((sp) => Number(sp.rating) || 0)
      .filter((r) => r > 0);
    const minDiscount = discounts.length ? Math.max(...discounts) : 0;
    const rating = ratings.length ? Math.max(...ratings) : 0;
    const inStockCount = product.storeProducts.filter((sp) => sp.inStock).length;
    const totalStores = product.storeProducts.length;
    const isHotDeal = product.storeProducts.some(
      (sp) => new Date(sp.lastScraped).getTime() > cutoff
    );
    return {
      id: product.id,
      minDiscount,
      rating,
      inStockCount,
      totalStores,
      isHotDeal,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Percent className="h-8 w-8 text-destructive" />
        <h1 className="text-3xl font-bold">{t("nav.deals")}</h1>
      </div>

      {dealsProducts.length > 0 ? (
        <DealsGrid
          products={dealsProducts.map((p) => ({
            id: p.id,
            name: p.name,
            nameAr: p.nameAr,
            slug: p.slug,
            image: p.image,
            brand: p.brand,
            storeProducts: p.storeProducts.map((sp) => ({
              price: Number(sp.price),
              originalPrice: sp.originalPrice ? Number(sp.originalPrice) : undefined,
              currency: sp.currency,
              discount: sp.discount,
              inStock: sp.inStock,
              store: { name: sp.store.name, nameAr: sp.store.nameAr },
            })),
          }))}
          filterables={enriched}
        />
      ) : (
        <div className="text-center py-16">
          <Percent className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No deals available</h2>
          <p className="text-muted-foreground">
            Check back later for the best deals and discounts.
          </p>
        </div>
      )}
    </div>
  );
}
