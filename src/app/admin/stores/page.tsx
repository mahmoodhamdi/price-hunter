"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Search, RefreshCw, Power, PowerOff } from "lucide-react";

interface StoreData {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  domain: string;
  country: string;
  currency: string;
  isActive: boolean;
  _count: {
    products: number;
  };
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch("/api/admin/stores");
      const data = await response.json();
      setStores(data.stores || []);
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStore = async (storeId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchStores();
    } catch (error) {
      console.error("Failed to toggle store:", error);
    }
  };

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.domain.toLowerCase().includes(search.toLowerCase())
  );

  const countryGroups = filteredStores.reduce(
    (acc, store) => {
      if (!acc[store.country]) {
        acc[store.country] = [];
      }
      acc[store.country].push(store);
      return acc;
    },
    {} as Record<string, StoreData[]>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Store className="h-8 w-8" />
          Stores Management
        </h1>
        <Button onClick={fetchStores} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(countryGroups).map(([country, countryStores]) => (
            <div key={country}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">
                  {country === "SA" && "🇸🇦"}
                  {country === "EG" && "🇪🇬"}
                  {country === "AE" && "🇦🇪"}
                  {country === "KW" && "🇰🇼"}
                </span>
                {country === "SA" && "Saudi Arabia"}
                {country === "EG" && "Egypt"}
                {country === "AE" && "UAE"}
                {country === "KW" && "Kuwait"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {countryStores.map((store) => (
                  <Card key={store.id} className={!store.isActive ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{store.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStore(store.id, store.isActive)}
                        >
                          {store.isActive ? (
                            <Power className="h-4 w-4 text-success" />
                          ) : (
                            <PowerOff className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {store.nameAr}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{store.domain}</span>
                        <span className="bg-muted px-2 py-1 rounded">
                          {store._count.products} products
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {store.currency}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            store.isActive
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {store.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
