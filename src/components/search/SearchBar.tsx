"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Camera, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleClear = () => {
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className="absolute left-4 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          className={cn(
            "w-full h-14 pl-12 pr-24 rounded-full",
            "bg-background border border-input",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-shadow duration-200",
            "shadow-sm hover:shadow-md focus:shadow-lg"
          )}
          disabled={isLoading}
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-20 p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Barcode Scanner Button */}
        <button
          type="button"
          className="absolute right-12 p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Scan barcode"
        >
          <Camera className="h-5 w-5" />
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={cn(
            "absolute right-2 h-10 px-4 rounded-full",
            "bg-primary text-primary-foreground",
            "font-medium text-sm",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {t("button")}
        </button>
      </div>
    </form>
  );
}
