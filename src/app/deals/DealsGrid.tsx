"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import {
  SmartDealFilters,
  type FilterableDeal,
} from "@/components/product/SmartDealFilters";

type StoreProductShape = {
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number | null;
  inStock: boolean;
  store: { name: string; nameAr: string };
};

type DealProduct = {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  image?: string | null;
  brand?: string | null;
  storeProducts: StoreProductShape[];
};

interface DealsGridProps {
  products: DealProduct[];
  filterables: FilterableDeal[];
}

/**
 * Client wrapper that joins the smart-filter band to the ProductCard grid.
 *
 * Kept thin: the server page computes `filterables` (cheap numeric metadata)
 * alongside the renderable product list and passes both. The grid filters
 * the rendered list using the matching `id`s the filter component emits.
 */
export function DealsGrid({ products, filterables }: DealsGridProps) {
  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  return (
    <SmartDealFilters
      items={filterables}
      render={(filtered) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center py-12 text-muted-foreground">
              No deals match these filters.
            </p>
          ) : (
            filtered.map((f) => {
              const p = byId.get(f.id);
              if (!p) return null;
              return <ProductCard key={p.id} product={p} />;
            })
          )}
        </div>
      )}
    />
  );
}
