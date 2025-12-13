"use client";

import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

interface PriceHistoryPoint {
  recordedAt: string | Date;
  price: unknown; // Prisma Decimal
  currency: string;
}

interface StoreWithHistory {
  store: {
    name: string;
    nameAr: string;
  };
  priceHistory: PriceHistoryPoint[];
}

interface PriceHistoryProps {
  storeProducts: StoreWithHistory[];
  currency?: string;
  locale?: string;
}

// Generate distinct colors for each store
const COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#dc2626", // red
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
  "#be185d", // pink
  "#65a30d", // lime
];

export function PriceHistory({
  storeProducts,
  currency = "SAR",
  locale = "en",
}: PriceHistoryProps) {
  const t = useTranslations();

  // Combine all price history into a unified dataset
  const allDates = new Set<string>();
  storeProducts.forEach((sp) => {
    sp.priceHistory.forEach((ph) => {
      allDates.add(new Date(ph.recordedAt).toISOString().split("T")[0]);
    });
  });

  const sortedDates = Array.from(allDates).sort();

  // Create chart data
  const chartData = sortedDates.map((date) => {
    const dataPoint: Record<string, string | number | undefined> = {
      date,
      dateFormatted: formatDate(new Date(date), locale),
    };

    storeProducts.forEach((sp, index) => {
      const pricePoint = sp.priceHistory.find(
        (ph) => new Date(ph.recordedAt).toISOString().split("T")[0] === date
      );
      if (pricePoint) {
        dataPoint[`store_${index}`] = Number(pricePoint.price);
      }
    });

    return dataPoint;
  });

  // If no history, show message
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("product.priceHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No price history available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("product.priceHistory")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatPrice(value, currency, locale)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <p className="font-medium mb-2">{label}</p>
                        {payload.map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}:</span>
                            <span className="font-medium">
                              {formatPrice(
                                entry.value as number,
                                currency,
                                locale
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {storeProducts.map((sp, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={`store_${index}`}
                  name={locale === "ar" ? sp.store.nameAr : sp.store.name}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
