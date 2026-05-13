import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { PriceComparison } from "@/components/product/PriceComparison";
import { PriceHistory } from "@/components/product/PriceHistory";
import { CouponHint } from "@/components/product/CouponHint";
import { PriceTrendBadge } from "@/components/product/PriceTrendBadge";
import { analyzePriceTrend } from "@/lib/services/price-trend";
import { getCrossCountryQuotes } from "@/lib/services/cross-country-compare";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, Store, Globe } from "lucide-react";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      storeProducts: {
        where: {
          store: {
            isActive: true,
          },
        },
        include: {
          store: true,
          priceHistory: {
            orderBy: {
              recordedAt: "desc",
            },
            take: 30,
          },
        },
        orderBy: {
          price: "asc",
        },
      },
    },
  });

  return product;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: product.name,
    description: product.description || `Compare prices for ${product.name} across multiple stores`,
    openGraph: {
      title: product.name,
      description: product.description || `Compare prices for ${product.name}`,
      images: product.image ? [product.image] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const t = await getTranslations();
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Calculate price statistics
  const prices = product.storeProducts.map((sp) => Number(sp.price));
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const averagePrice =
    prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  const currency = product.storeProducts[0]?.currency || "SAR";

  // Differentiation enrichments (Phase 6 wiring)
  const cheapestStoreProduct = product.storeProducts[0];
  const priceTrend = cheapestStoreProduct
    ? analyzePriceTrend(
        Number(cheapestStoreProduct.price),
        cheapestStoreProduct.priceHistory.map((h) => ({
          price: Number(h.price),
          recordedAt: h.recordedAt,
        }))
      )
    : null;

  const storeIdsForCoupons = product.storeProducts.map((sp) => sp.storeId);
  const activeCoupons =
    storeIdsForCoupons.length > 0
      ? await prisma.coupon.findMany({
          where: {
            storeId: { in: storeIdsForCoupons },
            isActive: true,
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          orderBy: { isFeatured: "desc" },
          take: 5,
        })
      : [];

  const crossCountryQuotes = await getCrossCountryQuotes(slug);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Product Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Product Image */}
        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain p-8"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Store className="h-32 w-32 text-muted-foreground/20" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.brand && (
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
              {product.brand}
            </p>
          )}

          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          {product.nameAr && (
            <p className="text-xl text-muted-foreground mb-4" dir="rtl">
              {product.nameAr}
            </p>
          )}

          {product.description && (
            <p className="text-muted-foreground mb-6">{product.description}</p>
          )}

          {/* Price Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className="h-5 w-5 text-success mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">
                  {t("product.lowestPrice")}
                </p>
                <p className="text-lg font-bold text-success">
                  {formatPrice(lowestPrice, currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Minus className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">
                  {t("product.averagePrice")}
                </p>
                <p className="text-lg font-bold">
                  {formatPrice(averagePrice, currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 text-destructive mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">
                  {t("product.highestPrice")}
                </p>
                <p className="text-lg font-bold text-destructive">
                  {formatPrice(highestPrice, currency)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trend badge */}
          {priceTrend && (
            <div className="mb-4">
              <PriceTrendBadge trend={priceTrend} />
            </div>
          )}

          {/* Store Count */}
          <p className="text-sm text-muted-foreground mb-4">
            {t("stores.title")}: {product.storeProducts.length}{" "}
            {product.storeProducts.length === 1 ? "store" : "stores"}
          </p>

          {/* Coupon hint */}
          {activeCoupons.length > 0 && (
            <div className="mb-4">
              <CouponHint coupons={activeCoupons} />
            </div>
          )}
        </div>
      </div>

      {/* Cross-country compare */}
      {crossCountryQuotes.length > 1 && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Compare across countries</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {crossCountryQuotes.map((q) => (
                <a
                  key={q.country}
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border rounded-lg p-3 hover:bg-muted transition-colors block"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl" aria-hidden>
                      {q.flag}
                    </span>
                    <span className="text-sm font-medium">{q.countryName}</span>
                  </div>
                  <p className="text-lg font-bold">
                    {formatPrice(q.localPrice, q.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${q.usdPrice.toFixed(2)} · {q.storeName}
                  </p>
                  {!q.inStock && (
                    <p className="text-xs text-destructive mt-1">
                      out of stock
                    </p>
                  )}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Comparison Table */}
      <div className="mb-8">
        <PriceComparison storeProducts={product.storeProducts} />
      </div>

      {/* Price History Chart */}
      <div>
        <PriceHistory
          storeProducts={product.storeProducts}
          currency={currency}
        />
      </div>
    </div>
  );
}
