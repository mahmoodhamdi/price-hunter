"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, Plus, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  image?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  storeProducts: {
    id: string;
    price: number;
    currency: string;
    inStock: boolean;
    discount?: number | null;
    store: {
      name: string;
      slug: string;
    };
  }[];
}

export default function ComparePage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Load products from URL params
  useEffect(() => {
    const productIds = searchParams.get("products")?.split(",") || [];
    if (productIds.length > 0) {
      fetchProducts(productIds);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchProducts = async (ids: string[]) => {
    setLoading(true);
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/products/${id}`).then((r) => (r.ok ? r.json() : null))
        )
      );
      setProducts(responses.filter(Boolean));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setSearchResults(data.products || []);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setSearching(false);
    }
  };

  const addProduct = (product: Product) => {
    if (products.length >= 4) return;
    if (products.find((p) => p.id === product.id)) return;

    const newProducts = [...products, product];
    setProducts(newProducts);
    setSearchQuery("");
    setSearchResults([]);

    // Update URL
    const ids = newProducts.map((p) => p.slug).join(",");
    window.history.replaceState({}, "", `/compare?products=${ids}`);
  };

  const removeProduct = (productId: string) => {
    const newProducts = products.filter((p) => p.id !== productId);
    setProducts(newProducts);

    // Update URL
    if (newProducts.length > 0) {
      const ids = newProducts.map((p) => p.slug).join(",");
      window.history.replaceState({}, "", `/compare?products=${ids}`);
    } else {
      window.history.replaceState({}, "", "/compare");
    }
  };

  const getLowestPrice = (product: Product) => {
    if (!product.storeProducts.length) return null;
    return product.storeProducts.reduce((min, sp) =>
      sp.price < min.price ? sp : min
    );
  };

  const getStores = () => {
    const storeSet = new Set<string>();
    products.forEach((p) =>
      p.storeProducts.forEach((sp) => storeSet.add(sp.store.slug))
    );
    return Array.from(storeSet);
  };

  const getProductPriceAtStore = (product: Product, storeSlug: string) => {
    return product.storeProducts.find((sp) => sp.store.slug === storeSlug);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Compare Products</h1>

      {/* Add Product Section */}
      {products.length < 4 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Product to Compare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                placeholder="Search for a product to compare..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchProducts(e.target.value);
                }}
              />
              {searching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      className="w-full p-3 text-left hover:bg-muted flex items-center gap-3"
                      onClick={() => addProduct(product)}
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          📦
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {products.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">No products to compare</h2>
          <p className="text-muted-foreground mb-4">
            Search for products above to start comparing prices
          </p>
          <Button asChild>
            <Link href="/search">
              Go to Search <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Product Headers */}
            <thead>
              <tr>
                <th className="p-4 text-left bg-muted/50 w-40">Product</th>
                {products.map((product) => (
                  <th key={product.id} className="p-4 text-center bg-muted/50 min-w-[200px]">
                    <div className="relative">
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <Link href={`/product/${product.slug}`} className="block hover:opacity-80">
                        <div className="relative w-20 h-20 mx-auto mb-2">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded flex items-center justify-center text-2xl">
                              📦
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Brand Row */}
              <tr className="border-b">
                <td className="p-4 font-medium text-muted-foreground">Brand</td>
                {products.map((product) => (
                  <td key={product.id} className="p-4 text-center">
                    {product.brand || "-"}
                  </td>
                ))}
              </tr>

              {/* Category Row */}
              <tr className="border-b">
                <td className="p-4 font-medium text-muted-foreground">Category</td>
                {products.map((product) => (
                  <td key={product.id} className="p-4 text-center">
                    {product.category || "-"}
                  </td>
                ))}
              </tr>

              {/* Lowest Price Row */}
              <tr className="border-b bg-primary/5">
                <td className="p-4 font-medium text-muted-foreground">Best Price</td>
                {products.map((product) => {
                  const lowest = getLowestPrice(product);
                  return (
                    <td key={product.id} className="p-4 text-center">
                      {lowest ? (
                        <div>
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(lowest.price, lowest.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            at {lowest.store.name}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Store Prices */}
              {getStores().map((storeSlug) => (
                <tr key={storeSlug} className="border-b">
                  <td className="p-4 font-medium text-muted-foreground capitalize">
                    {storeSlug.replace("-", " ")}
                  </td>
                  {products.map((product) => {
                    const sp = getProductPriceAtStore(product, storeSlug);
                    const lowest = getLowestPrice(product);
                    const isLowest = sp && lowest && sp.id === lowest.id;

                    return (
                      <td key={product.id} className="p-4 text-center">
                        {sp ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className={isLowest ? "text-green-600 font-bold" : ""}>
                              {formatPrice(sp.price, sp.currency)}
                            </span>
                            {isLowest && <Check className="h-4 w-4 text-green-600" />}
                            {!sp.inStock && (
                              <span className="text-xs text-destructive">(Out of stock)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* In Stock Row */}
              <tr className="border-b">
                <td className="p-4 font-medium text-muted-foreground">Availability</td>
                {products.map((product) => {
                  const inStockCount = product.storeProducts.filter((sp) => sp.inStock).length;
                  return (
                    <td key={product.id} className="p-4 text-center">
                      <span className={inStockCount > 0 ? "text-green-600" : "text-destructive"}>
                        {inStockCount} of {product.storeProducts.length} stores
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
