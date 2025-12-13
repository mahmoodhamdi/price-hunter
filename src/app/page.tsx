import { useTranslations } from "next-intl";
import { SearchBar } from "@/components/search/SearchBar";

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          {t("app.name")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("app.tagline")}</p>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-2xl mx-auto mb-16">
        <SearchBar />
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <FeatureCard
          icon="🔍"
          title="Compare Prices"
          description="Search any product and compare prices across 15+ stores"
        />
        <FeatureCard
          icon="💱"
          title="Currency Conversion"
          description="View prices in your preferred currency automatically"
        />
        <FeatureCard
          icon="🔔"
          title="Price Alerts"
          description="Get notified when prices drop to your target"
        />
      </div>

      {/* Supported Stores */}
      <div className="mt-20 text-center">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          {t("stores.title")}
        </h2>
        <div className="flex flex-wrap justify-center gap-8 opacity-60">
          {["Amazon", "Noon", "Jarir", "Extra", "Jumia", "B.Tech"].map(
            (store) => (
              <span key={store} className="text-lg font-medium">
                {store}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
