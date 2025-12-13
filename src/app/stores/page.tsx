import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Globe } from "lucide-react";

export default async function StoresPage() {
  const t = await getTranslations();

  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: [{ country: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  // Group stores by country
  const storesByCountry = stores.reduce(
    (acc, store) => {
      if (!acc[store.country]) {
        acc[store.country] = [];
      }
      acc[store.country].push(store);
      return acc;
    },
    {} as Record<string, typeof stores>
  );

  const countryOrder = ["SA", "EG", "AE", "KW"];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Store className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t("stores.title")}</h1>
      </div>

      <div className="space-y-8">
        {countryOrder.map((country) => {
          const countryStores = storesByCountry[country];
          if (!countryStores || countryStores.length === 0) return null;

          return (
            <div key={country}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">
                  {country === "SA" && "🇸🇦"}
                  {country === "EG" && "🇪🇬"}
                  {country === "AE" && "🇦🇪"}
                  {country === "KW" && "🇰🇼"}
                </span>
                {t(`countries.${country}`)}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {countryStores.map((store) => (
                  <Card key={store.id} className="card-hover">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Store className="h-5 w-5 text-muted-foreground" />
                        {store.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {store.nameAr}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <a
                          href={`https://${store.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          {store.domain}
                        </a>
                        <span className="text-muted-foreground">
                          {store._count.products} products
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs bg-muted rounded">
                          {store.currency}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
