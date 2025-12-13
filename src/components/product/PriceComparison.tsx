"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, Check, X, Star, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StoreProduct {
  id: string;
  url: string;
  price: unknown; // Prisma Decimal
  originalPrice?: unknown;
  currency: string;
  priceUSD?: unknown;
  discount?: number | null;
  inStock: boolean;
  rating?: unknown;
  reviewCount?: number | null;
  lastScraped: string | Date;
  store: {
    id: string;
    name: string;
    nameAr: string;
    slug: string;
    logo?: string | null;
    country: string;
  };
}

interface PriceComparisonProps {
  storeProducts: StoreProduct[];
  locale?: string;
}

export function PriceComparison({
  storeProducts,
  locale = "en",
}: PriceComparisonProps) {
  const t = useTranslations();

  if (storeProducts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t("comparison.noComparisons")}</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by price (lowest first)
  const sortedProducts = [...storeProducts].sort(
    (a, b) => Number(a.price) - Number(b.price)
  );

  const lowestPrice = Number(sortedProducts[0].price);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-success" />
          {t("comparison.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedProducts.map((sp, index) => {
            const price = Number(sp.price);
            const originalPrice = sp.originalPrice ? Number(sp.originalPrice) : null;
            const isLowest = price === lowestPrice;
            const savings = originalPrice ? originalPrice - price : 0;

            return (
              <div
                key={sp.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-colors",
                  isLowest && "border-success bg-success/5",
                  !sp.inStock && "opacity-60"
                )}
              >
                {/* Store Info */}
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  {/* Rank Badge */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                      index === 0
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Store Logo/Name */}
                  <div>
                    <h3 className="font-semibold">
                      {locale === "ar" ? sp.store.nameAr : sp.store.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {sp.rating !== null && sp.rating !== undefined && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {Number(sp.rating).toFixed(1)}
                          {sp.reviewCount && (
                            <span>({sp.reviewCount.toLocaleString()})</span>
                          )}
                        </span>
                      )}
                      {sp.inStock ? (
                        <span className="flex items-center gap-1 text-success">
                          <Check className="h-3 w-3" />
                          {t("product.inStock")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive">
                          <X className="h-3 w-3" />
                          {t("product.outOfStock")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price Info */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xl font-bold",
                          isLowest && "text-success"
                        )}
                      >
                        {formatPrice(price, sp.currency, locale)}
                      </span>
                      {sp.discount && Number(sp.discount) > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded">
                          -{sp.discount}%
                        </span>
                      )}
                    </div>
                    {originalPrice && originalPrice > price && (
                      <div className="text-sm text-muted-foreground">
                        <span className="line-through">
                          {formatPrice(originalPrice, sp.currency, locale)}
                        </span>
                        <span className="text-success ml-2">
                          {t("comparison.savings")}{" "}
                          {formatPrice(savings, sp.currency, locale)}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("comparison.lastUpdated")}:{" "}
                      {formatRelativeTime(new Date(sp.lastScraped), locale)}
                    </p>
                  </div>

                  {/* Visit Store Button */}
                  <Button
                    asChild
                    variant={isLowest ? "default" : "outline"}
                    className={cn(isLowest && "bg-success hover:bg-success/90")}
                  >
                    <a
                      href={sp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      {t("product.visitStore")}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
