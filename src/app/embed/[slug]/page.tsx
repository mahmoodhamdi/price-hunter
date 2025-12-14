"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Currency } from "@prisma/client";

interface StoreData {
  name: string;
  slug: string;
  price: number;
  currency: Currency;
  url: string;
  inStock: boolean;
  discount?: number | null;
}

interface WidgetData {
  productId: string;
  productName: string;
  productSlug: string;
  image?: string | null;
  brand?: string | null;
  stores: StoreData[];
  lowestPrice: number;
  currency: Currency;
}

export default function EmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config from query params
  const theme = searchParams.get("theme") || "light";
  const primaryColor = searchParams.get("color")
    ? `#${searchParams.get("color")}`
    : "#3b82f6";
  const showLogo = searchParams.get("logo") !== "0";
  const maxStores = parseInt(searchParams.get("maxStores") || "5");
  const lang = searchParams.get("lang") || "en";

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/embed/widget?slug=${slug}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const result = await res.json();
        setData(result);
      } catch {
        setError(lang === "ar" ? "فشل تحميل البيانات" : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug, lang]);

  const isDark = theme === "dark";

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center min-h-[200px] ${
          isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-500"
        }`}
      >
        {lang === "ar" ? "جاري التحميل..." : "Loading..."}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={`flex items-center justify-center min-h-[200px] text-red-500 ${
          isDark ? "bg-gray-800" : "bg-white"
        }`}
      >
        {error || (lang === "ar" ? "المنتج غير موجود" : "Product not found")}
      </div>
    );
  }

  const stores = data.stores.slice(0, maxStores);

  return (
    <html>
      <head>
        <title>{data.productName} - Price Hunter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${isDark ? "#1f2937" : "#ffffff"};
            color: ${isDark ? "#f9fafb" : "#1f2937"};
          }
        `}</style>
      </head>
      <body>
        <div className="p-0">
          {/* Header */}
          <div
            className={`flex items-center gap-3 p-4 border-b ${
              isDark ? "border-gray-700" : "border-gray-200"
            }`}
          >
            {data.image && (
              <img
                src={data.image}
                alt={data.productName}
                className={`w-16 h-16 object-contain rounded ${
                  isDark ? "bg-gray-700" : "bg-gray-100"
                }`}
              />
            )}
            <div>
              <h2 className="font-semibold text-sm leading-tight">
                {data.productName}
              </h2>
              {data.brand && (
                <p className="text-xs text-gray-500 mt-1">{data.brand}</p>
              )}
            </div>
          </div>

          {/* Prices */}
          <div className="p-3">
            {stores.map((store, index) => (
              <div
                key={store.slug}
                className={`flex justify-between items-center py-2 ${
                  index < stores.length - 1
                    ? `border-b ${isDark ? "border-gray-700" : "border-gray-100"}`
                    : ""
                }`}
              >
                <span className="text-sm font-medium">{store.name}</span>
                {store.inStock ? (
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold hover:underline"
                    style={{
                      color: index === 0 ? "#16a34a" : primaryColor,
                    }}
                  >
                    {store.price.toFixed(2)} {store.currency}
                    {store.discount && (
                      <span className="text-xs ml-1">(-{store.discount}%)</span>
                    )}
                  </a>
                ) : (
                  <span className="text-xs text-red-500">
                    {lang === "ar" ? "غير متوفر" : "Out of Stock"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          {showLogo && (
            <div
              className={`text-center py-3 text-xs ${
                isDark ? "bg-gray-700 text-gray-400" : "bg-gray-50 text-gray-500"
              }`}
            >
              {lang === "ar" ? "مقارنة بواسطة " : "Powered by "}
              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL || ""}/product/${data.productSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: primaryColor }}
                className="hover:underline"
              >
                Price Hunter
              </a>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
