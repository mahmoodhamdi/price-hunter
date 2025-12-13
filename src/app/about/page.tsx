import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("about"),
    description: "Learn about Price Hunter - the best price comparison platform for Middle East",
  };
}

export default async function AboutPage() {
  const t = await getTranslations();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">{t("about")} Price Hunter</h1>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-4">
              Price Hunter was created with one goal in mind: to help shoppers in the Middle East
              find the best deals across multiple online stores. We believe everyone&apos;s right to
              access to transparent pricing information.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Price Comparison</h3>
                <p className="text-muted-foreground">
                  Compare prices across Amazon, Noon, Jarir, Extra, Jumia, and more stores
                  in Saudi Arabia, Egypt, and UAE.
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Price History</h3>
                <p className="text-muted-foreground">
                  Track how prices change over time to know if you&apos;re getting a good deal
                  or should wait for a better price.
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Price Alerts</h3>
                <p className="text-muted-foreground">
                  Set your target price and get notified via email or Telegram when
                  the price drops to your desired level.
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Multi-Currency</h3>
                <p className="text-muted-foreground">
                  View prices in your preferred currency with real-time exchange rates.
                  Support for SAR, EGP, AED, KWD, and USD.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Supported Stores</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "Amazon",
                "Noon",
                "Jarir",
                "Extra",
                "Jumia",
                "B.Tech",
                "Sharaf DG",
                "Carrefour",
              ].map((store) => (
                <div
                  key={store}
                  className="p-4 rounded-lg border bg-card text-center"
                >
                  {store}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Countries We Cover</h2>
            <div className="flex flex-wrap gap-4">
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary">
                Saudi Arabia
              </span>
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary">
                Egypt
              </span>
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary">
                UAE
              </span>
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary">
                Kuwait
              </span>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              Have questions or suggestions? We&apos;d love to hear from you!
              <br />
              Email: <a href="mailto:support@pricehunter.app" className="text-primary hover:underline">
                support@pricehunter.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
