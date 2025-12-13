"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Heart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, cn } from "@/lib/utils";

interface StoreProduct {
  price: unknown; // Prisma Decimal or number
  originalPrice?: unknown;
  currency: string;
  discount?: number | null;
  inStock: boolean;
  store: {
    name: string;
    nameAr: string;
  };
}

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    nameAr?: string | null;
    slug: string;
    image?: string | null;
    brand?: string | null;
    storeProducts: StoreProduct[];
  };
  locale?: string;
  onWishlistClick?: (productId: string) => void;
  isInWishlist?: boolean;
}

export function ProductCard({
  product,
  locale = "en",
  onWishlistClick,
  isInWishlist = false,
}: ProductCardProps) {
  const t = useTranslations();

  // Get lowest price
  const sortedPrices = [...product.storeProducts].sort(
    (a, b) => Number(a.price) - Number(b.price)
  );
  const lowestPriceProduct = sortedPrices[0];
  const lowestPrice = lowestPriceProduct
    ? Number(lowestPriceProduct.price)
    : null;
  const currency = lowestPriceProduct?.currency || "SAR";

  // Get price range
  const highestPrice =
    sortedPrices.length > 0
      ? Number(sortedPrices[sortedPrices.length - 1].price)
      : null;

  const hasDiscount =
    lowestPriceProduct?.discount && Number(lowestPriceProduct.discount) > 0;

  return (
    <Card className="group overflow-hidden card-hover">
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-square bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={locale === "ar" && product.nameAr ? product.nameAr : product.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Store className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <div className="absolute top-2 left-2 px-2 py-1 text-xs font-bold bg-destructive text-destructive-foreground rounded">
              -{lowestPriceProduct.discount}%
            </div>
          )}

          {/* Wishlist Button */}
          {onWishlistClick && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 hover:bg-background"
              onClick={(e) => {
                e.preventDefault();
                onWishlistClick(product.id);
              }}
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  isInWishlist && "fill-destructive text-destructive"
                )}
              />
            </Button>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {product.brand}
          </p>
        )}

        {/* Product Name */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
            {locale === "ar" && product.nameAr ? product.nameAr : product.name}
          </h3>
        </Link>

        {/* Price Section */}
        {lowestPrice !== null && (
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-success">
                {formatPrice(lowestPrice, currency, locale)}
              </span>
              {lowestPriceProduct?.originalPrice !== null &&
                lowestPriceProduct?.originalPrice !== undefined &&
                Number(lowestPriceProduct.originalPrice) > lowestPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(
                      Number(lowestPriceProduct.originalPrice),
                      currency,
                      locale
                    )}
                  </span>
                )}
            </div>

            {/* Price Range */}
            {highestPrice && highestPrice !== lowestPrice && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("product.highestPrice")}:{" "}
                {formatPrice(highestPrice, currency, locale)}
              </p>
            )}

            {/* Store Count */}
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Store className="h-3 w-3" />
              <span>
                {product.storeProducts.length}{" "}
                {product.storeProducts.length === 1 ? "store" : "stores"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
