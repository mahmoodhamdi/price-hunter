import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { SearchBar } from "@/components/search/SearchBar";
import { prisma } from "@/lib/prisma";
import { ArrowRight, TrendingUp, Percent, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export default async function HomePage() {
  const t = await getTranslations();

  // Fetch deals (products with discounts)
  const deals = await prisma.storeProduct.findMany({
    where: {
      discount: { gte: 10 },
      inStock: true,
      store: { isActive: true },
    },
    include: {
      product: true,
      store: true,
    },
    orderBy: { discount: "desc" },
    take: 4,
  });

  // Fetch recently added products
  const newProducts = await prisma.product.findMany({
    where: {
      storeProducts: {
        some: { store: { isActive: true } },
      },
    },
    include: {
      storeProducts: {
        where: { store: { isActive: true } },
        include: { store: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            {t("app.name")}
          </h1>
          <p className="text-xl text-muted-foreground">{t("app.tagline")}</p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl mx-auto mb-16">
          <SearchBar />
          <p className="text-sm text-muted-foreground text-center mt-3">
            Search for any product and we will find the best prices for you
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon="🔍"
            title="Compare Prices"
            description="Search any product and compare prices across 14+ stores"
          />
          <FeatureCard
            icon="💱"
            title="Currency Conversion"
            description="View prices in your preferred currency automatically"
          />
          <FeatureCard
            icon="🔔"
            title="Price Alerts"
            description="Get notified when prices drop to your target"
          />
        </div>
      </section>

      {/* Deals Section */}
      {deals.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Percent className="h-6 w-6 text-destructive" />
              <h2 className="text-2xl font-bold">{t("nav.deals")}</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/deals" className="flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}

      {/* New Products Section */}
      {newProducts.length > 0 && (
        <section className="container mx-auto px-4 py-12 bg-muted/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Recently Added</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/trending?type=new" className="flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {newProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">{t("nav.trending")}</h2>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/trending" className="flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Search for products to see trending items</p>
        </div>
      </section>

      {/* Supported Stores */}
      <section className="container mx-auto px-4 py-12 text-center border-t">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          {t("stores.title")}
        </h2>
        <div className="flex flex-wrap justify-center gap-8 opacity-60">
          {["Amazon", "Noon", "Jarir", "Extra", "Jumia", "B.Tech", "Sharaf DG", "Carrefour"].map(
            (store) => (
              <span key={store} className="text-lg font-medium">
                {store}
              </span>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function DealCard({
  deal,
}: {
  deal: {
    id: string;
    discount: number | null;
    price: number | { toNumber(): number };
    originalPrice: number | { toNumber(): number } | null;
    currency: string;
    url: string;
    product: {
      id: string;
      name: string;
      slug: string;
      image: string | null;
    };
    store: {
      name: string;
      logo: string | null;
    };
  };
}) {
  return (
    <Card className="group hover:shadow-lg transition-shadow overflow-hidden">
      <Link href={`/product/${deal.product.slug}`}>
        <div className="relative aspect-square bg-muted">
          {deal.product.image ? (
            <Image
              src={deal.product.image}
              alt={deal.product.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">
              📦
            </div>
          )}
          {deal.discount && deal.discount > 0 && (
            <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
              -{deal.discount}%
            </span>
          )}
        </div>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">{deal.store.name}</p>
          <h3 className="font-medium text-sm line-clamp-2 mb-2">
            {deal.product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {formatPrice(Number(deal.price), deal.currency)}
            </span>
            {deal.originalPrice && Number(deal.originalPrice) > Number(deal.price) && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(Number(deal.originalPrice), deal.currency)}
              </span>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function ProductCard({
  product,
}: {
  product: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    storeProducts: {
      price: number | { toNumber(): number };
      currency: string;
      store: {
        name: string;
      };
    }[];
  };
}) {
  const lowestPrice = product.storeProducts[0];

  return (
    <Card className="group hover:shadow-lg transition-shadow overflow-hidden">
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-square bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">
              📦
            </div>
          )}
        </div>
        <CardContent className="p-4">
          {lowestPrice && (
            <p className="text-xs text-muted-foreground mb-1">
              {lowestPrice.store.name}
            </p>
          )}
          <h3 className="font-medium text-sm line-clamp-2 mb-2">
            {product.name}
          </h3>
          {lowestPrice && (
            <span className="text-lg font-bold text-primary">
              {formatPrice(Number(lowestPrice.price), lowestPrice.currency)}
            </span>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
