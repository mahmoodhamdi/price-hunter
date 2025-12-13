"use client";

import Image from "next/image";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Coupon {
  id: string;
  code: string;
  description: string;
  descriptionAr?: string;
  discount: string;
  isVerified: boolean;
  isFeatured: boolean;
  endDate?: string;
  store: {
    name: string;
    nameAr: string;
    slug: string;
    logo?: string;
    domain: string;
  };
}

export default function CouponsPage() {
  const t = useTranslations();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch("/api/coupons");
      const data = await response.json();
      setCoupons(data.coupons || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);

    // Increment usage count
    fetch(`/api/coupons/${id}/use`, { method: "POST" }).catch(console.error);
  };

  const filteredCoupons = coupons.filter(
    (coupon) =>
      coupon.store.name.toLowerCase().includes(filter.toLowerCase()) ||
      coupon.description.toLowerCase().includes(filter.toLowerCase()) ||
      coupon.code.toLowerCase().includes(filter.toLowerCase())
  );

  const featuredCoupons = filteredCoupons.filter((c) => c.isFeatured);
  const regularCoupons = filteredCoupons.filter((c) => !c.isFeatured);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("coupons")}</h1>
          <p className="text-muted-foreground mt-1">
            Save money with exclusive discount codes
          </p>
        </div>
        <Input
          placeholder="Search coupons..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading coupons...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">No coupons available</p>
        </div>
      ) : (
        <>
          {featuredCoupons.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">⭐</span> Featured Deals
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredCoupons.map((coupon) => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    copied={copiedId === coupon.id}
                    onCopy={() => copyCode(coupon.code, coupon.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-4">All Coupons</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  copied={copiedId === coupon.id}
                  onCopy={() => copyCode(coupon.code, coupon.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CouponCard({
  coupon,
  copied,
  onCopy,
}: {
  coupon: Coupon;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card className={coupon.isFeatured ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {coupon.store.logo ? (
              <Image
                src={coupon.store.logo || ""} width={32} height={32}
                alt={coupon.store.name}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm font-bold">
                {coupon.store.name.charAt(0)}
              </div>
            )}
            <CardTitle className="text-lg">{coupon.store.name}</CardTitle>
          </div>
          {coupon.isVerified && (
            <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
              Verified
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-2xl font-bold text-primary">{coupon.discount}</p>
          <p className="text-sm text-muted-foreground">{coupon.description}</p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded px-3 py-2 font-mono text-center border-2 border-dashed">
            {coupon.code}
          </div>
          <Button onClick={onCopy} variant={copied ? "default" : "outline"}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {coupon.endDate && (
          <p className="text-xs text-muted-foreground mt-2">
            Expires: {new Date(coupon.endDate).toLocaleDateString()}
          </p>
        )}

        <Button variant="link" className="p-0 h-auto mt-2" asChild>
          <a
            href={`https://${coupon.store.domain}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Store →
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
