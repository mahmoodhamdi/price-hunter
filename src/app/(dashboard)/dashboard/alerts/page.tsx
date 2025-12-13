import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Bell, BellOff, Check, ExternalLink, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/alerts");
  }

  const t = await getTranslations();

  const alerts = await prisma.priceAlert.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          storeProducts: {
            where: { store: { isActive: true } },
            include: { store: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t("alerts.title")}</h1>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const currentLowestPrice = alert.product.storeProducts[0]
              ? Number(alert.product.storeProducts[0].price)
              : null;
            const targetPrice = Number(alert.targetPrice);
            const isTriggered = currentLowestPrice !== null && currentLowestPrice <= targetPrice;

            return (
              <Card
                key={alert.id}
                className={cn(
                  "transition-colors",
                  isTriggered && "border-success bg-success/5",
                  !alert.isActive && "opacity-60"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isTriggered ? (
                          <span className="flex items-center gap-1 text-sm text-success">
                            <Check className="h-4 w-4" />
                            {t("alerts.triggered")}
                          </span>
                        ) : alert.isActive ? (
                          <span className="flex items-center gap-1 text-sm text-primary">
                            <Bell className="h-4 w-4" />
                            {t("alerts.active")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <BellOff className="h-4 w-4" />
                            Inactive
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/product/${alert.product.slug}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        {alert.product.name}
                      </Link>

                      {/* Notification Channels */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {alert.notifyEmail && <span>Email</span>}
                        {alert.notifyTelegram && <span>Telegram</span>}
                        {alert.notifyPush && <span>Push</span>}
                      </div>
                    </div>

                    {/* Prices */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("alerts.targetPrice")}
                        </p>
                        <p className="font-bold">
                          {formatPrice(targetPrice, alert.currency)}
                        </p>
                      </div>

                      <TrendingDown className="h-5 w-5 text-muted-foreground" />

                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("alerts.currentPrice")}
                        </p>
                        <p
                          className={cn(
                            "font-bold",
                            currentLowestPrice && currentLowestPrice <= targetPrice
                              ? "text-success"
                              : ""
                          )}
                        >
                          {currentLowestPrice
                            ? formatPrice(currentLowestPrice, alert.currency)
                            : "-"}
                        </p>
                      </div>

                      {/* Actions */}
                      {currentLowestPrice && currentLowestPrice <= targetPrice && (
                        <Button asChild size="sm" variant="success">
                          <a
                            href={alert.product.storeProducts[0]?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("product.visitStore")}
                            <ExternalLink className="h-4 w-4 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t("alerts.noAlerts")}</h2>
          <p className="text-muted-foreground">
            Set price alerts on products to get notified when prices drop.
          </p>
        </div>
      )}
    </div>
  );
}
