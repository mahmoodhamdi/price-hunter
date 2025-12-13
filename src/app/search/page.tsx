"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface StoreProduct {
  price: string | number;
  originalPrice?: string | number | null;
  currency: string;
  discount?: number | null;
  inStock: boolean;
  store: {
    name: string;
    nameAr: string;
  };
}

interface Product {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  image?: string | null;
  brand?: string | null;
  storeProducts: StoreProduct[];
}

interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResults(null);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(t("common.error"));
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, t]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <SearchBar className="w-full" />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-16">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && query && results && (
        <>
          {/* Search Results Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {t("search.resultsCount", { count: results.total })}
            </h1>
            <p className="text-muted-foreground">
              {t("common.from")} &quot;{query}&quot;
            </p>
          </div>

          {/* Results Grid */}
          {results.products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {results.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold mb-2">
                {t("search.noResults")}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                No products found for &quot;{query}&quot;. Try searching for a
                different product or check the spelling.
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty State (no query) */}
      {!isLoading && !error && !query && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2">
            Start searching for products
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Enter a product name, paste a URL, or scan a barcode to compare
            prices across stores.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto mb-8">
            <div className="h-14 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
