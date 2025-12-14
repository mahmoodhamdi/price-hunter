"use client";

import { TrendingDown, TrendingUp, Award, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceIndicatorProps {
  priceChange?: {
    amount: number;
    percentage: number;
    direction: "up" | "down" | "same";
    daysAgo: number;
  };
  isAtLowest?: boolean;
  currency?: string;
  compact?: boolean;
}

export function PriceIndicator({
  priceChange,
  isAtLowest,
  currency = "SAR",
  compact = false,
}: PriceIndicatorProps) {
  if (!priceChange && !isAtLowest) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", compact ? "text-xs" : "text-sm")}>
      {isAtLowest && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium",
            compact ? "px-1.5 py-0.5" : "px-2 py-1"
          )}
        >
          <Award className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          {!compact && "Lowest Ever!"}
        </span>
      )}

      {priceChange && priceChange.direction !== "same" && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full font-medium",
            compact ? "px-1.5 py-0.5" : "px-2 py-1",
            priceChange.direction === "down"
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
          )}
        >
          {priceChange.direction === "down" ? (
            <TrendingDown className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          ) : (
            <TrendingUp className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          )}
          {priceChange.percentage}%
          {!compact && (
            <span className="text-muted-foreground ml-1">
              {priceChange.daysAgo === 0
                ? "today"
                : priceChange.daysAgo === 1
                ? "vs yesterday"
                : `vs ${priceChange.daysAgo}d ago`}
            </span>
          )}
        </span>
      )}

      {priceChange && priceChange.direction === "same" && !compact && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1">
          <Minus className="h-4 w-4" />
          No change
        </span>
      )}
    </div>
  );
}

interface PriceBadgesProps {
  discount?: number | null;
  isAtLowest?: boolean;
}

export function PriceBadges({ discount, isAtLowest }: PriceBadgesProps) {
  if (!discount && !isAtLowest) return null;

  return (
    <div className="absolute top-2 left-2 flex flex-col gap-1">
      {discount && discount > 0 && (
        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
          -{discount}%
        </span>
      )}
      {isAtLowest && (
        <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
          <Award className="h-3 w-3" />
          Lowest
        </span>
      )}
    </div>
  );
}

interface PriceComparisonProps {
  currentPrice: number;
  lowestEver: number;
  highestEver: number;
  averagePrice: number;
  currency: string;
}

export function PriceComparison({
  currentPrice,
  lowestEver,
  highestEver,
  averagePrice,
  currency,
}: PriceComparisonProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const range = highestEver - lowestEver;
  const position = range > 0 ? ((currentPrice - lowestEver) / range) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Lowest: {formatPrice(lowestEver)}</span>
        <span>Avg: {formatPrice(averagePrice)}</span>
        <span>Highest: {formatPrice(highestEver)}</span>
      </div>

      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-30" />

        {/* Current price marker */}
        <div
          className="absolute top-0 h-full w-1 bg-primary"
          style={{ left: `${Math.min(Math.max(position, 0), 100)}%` }}
        />
      </div>

      <div className="text-center text-sm font-medium">
        Current: {formatPrice(currentPrice)}
        {currentPrice === lowestEver && (
          <span className="text-green-600 ml-2">(Best price!)</span>
        )}
      </div>
    </div>
  );
}
