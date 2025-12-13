import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product/ProductCard";
import { Percent } from "lucide-react";

export default async function DealsPage() {
  const t = await getTranslations();

  // Find products with highest discounts
  const dealsProducts = await prisma.product.findMany({
    where: {
      storeProducts: {
        some: {
          discount: {
            gte: 10, // At least 10% off
          },
          store: {
            isActive: true,
          },
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Percent className="h-8 w-8 text-destructive" />
        <h1 className="text-3xl font-bold">{t("nav.deals")}</h1>
      </div>

      {dealsProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dealsProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
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
