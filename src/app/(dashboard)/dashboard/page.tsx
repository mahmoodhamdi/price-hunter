import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Bell, TrendingDown, History } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const t = await getTranslations();

  // Fetch dashboard stats
  const [wishlistCount, activeAlertsCount, triggeredAlertsCount, recentSearches] =
    await Promise.all([
      prisma.wishlist.count({
        where: { userId: session.user.id },
      }),
      prisma.priceAlert.count({
        where: { userId: session.user.id, isActive: true, triggered: false },
      }),
      prisma.priceAlert.count({
        where: { userId: session.user.id, triggered: true },
      }),
      prisma.searchHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("dashboard.title")}</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/dashboard/wishlist">
          <Card className="card-hover cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard.wishlistItems")}
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{wishlistCount}</div>
              <p className="text-xs text-muted-foreground">
                {t("wishlist.title")}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/alerts">
          <Card className="card-hover cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard.activeAlerts")}
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAlertsCount}</div>
              <p className="text-xs text-muted-foreground">
                {t("alerts.active")}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("alerts.triggered")}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {triggeredAlertsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Prices dropped below target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalSaved")}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">-</div>
            <p className="text-xs text-muted-foreground">
              Start tracking to see savings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("search.recentSearches")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSearches.length > 0 ? (
            <ul className="space-y-2">
              {recentSearches.map((search) => (
                <li key={search.id}>
                  <Link
                    href={`/search?q=${encodeURIComponent(search.query)}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <span>{search.query}</span>
                    <span className="text-sm text-muted-foreground">
                      {search.results} results
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No recent searches
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
