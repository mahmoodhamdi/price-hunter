"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface PricePoint {
  date: string;
  price: number;
  store?: string;
}

interface PriceHistoryChartProps {
  data: PricePoint[];
  currency: string;
  currentPrice: number;
  showStats?: boolean;
  height?: number;
  variant?: "line" | "area";
}

export function PriceHistoryChart({
  data,
  currency,
  currentPrice,
  showStats = true,
  height = 300,
  variant = "area",
}: PriceHistoryChartProps) {
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const prices = data.map((d) => d.price);
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;

    const firstPrice = data[0]?.price || currentPrice;
    const priceChange = currentPrice - firstPrice;
    const percentChange = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

    return {
      lowest,
      highest,
      average,
      priceChange,
      percentChange,
      isAtLowest: currentPrice <= lowest,
      isAtHighest: currentPrice >= highest,
    };
  }, [data, currentPrice]);

  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      formattedDate: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">
            {formatPrice(payload[0].value, currency)}
          </p>
          {payload[0].payload.store && (
            <p className="text-xs text-muted-foreground">
              {payload[0].payload.store}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">No price history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Price History</CardTitle>
          {stats && (
            <div className="flex items-center gap-2">
              {stats.percentChange !== 0 && (
                <Badge
                  variant={stats.percentChange < 0 ? "default" : "destructive"}
                  className={
                    stats.percentChange < 0
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : ""
                  }
                >
                  {stats.percentChange < 0 ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(stats.percentChange).toFixed(1)}%
                </Badge>
              )}
              {stats.isAtLowest && (
                <Badge className="bg-green-600">Lowest Price!</Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showStats && stats && (
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Lowest</p>
              <p className="font-semibold text-green-600">
                {formatPrice(stats.lowest, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-semibold">{formatPrice(stats.average, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Highest</p>
              <p className="font-semibold text-red-600">
                {formatPrice(stats.highest, currency)}
              </p>
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={height}>
          {variant === "area" ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => formatPrice(value, currency)}
                width={80}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {stats && (
                <ReferenceLine
                  y={stats.average}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  label={{
                    value: "Avg",
                    position: "right",
                    fontSize: 10,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                fill="url(#priceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => formatPrice(value, currency)}
                width={80}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {stats && (
                <ReferenceLine
                  y={stats.average}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                />
              )}
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Multi-store price comparison chart
interface MultiStorePriceChartProps {
  data: {
    date: string;
    [storeName: string]: number | string;
  }[];
  stores: { name: string; color: string }[];
  currency: string;
  height?: number;
}

const STORE_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function MultiStorePriceChart({
  data,
  stores,
  currency,
  height = 300,
}: MultiStorePriceChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      formattedDate: new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.dataKey}:</span>
              <span className="font-medium">
                {formatPrice(entry.value, currency)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">No price data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Price Comparison Across Stores</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              tickLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) => formatPrice(value, currency)}
              width={80}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            {stores.map((store, index) => (
              <Line
                key={store.name}
                type="monotone"
                dataKey={store.name}
                stroke={store.color || STORE_COLORS[index % STORE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {stores.map((store, index) => (
            <div key={store.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    store.color || STORE_COLORS[index % STORE_COLORS.length],
                }}
              />
              <span className="text-sm text-muted-foreground">{store.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact sparkline chart for product cards
interface PriceSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function PriceSparkline({
  data,
  width = 100,
  height = 30,
  color = "hsl(var(--primary))",
}: PriceSparklineProps) {
  if (data.length < 2) return null;

  const chartData = data.map((price, index) => ({ index, price }));
  const isDown = data[data.length - 1] < data[0];

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={isDown ? "#22c55e" : "#ef4444"}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
