import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { localeDirection, type Locale } from "@/i18n/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Price Hunter - Compare Prices Across Stores",
    template: "%s | Price Hunter",
  },
  description:
    "Find the best prices for products across multiple online stores in Saudi Arabia, Egypt, and UAE. Compare prices, track price history, and get alerts when prices drop.",
  keywords: [
    "price comparison",
    "مقارنة أسعار",
    "amazon",
    "noon",
    "jarir",
    "best price",
    "price tracker",
    "تتبع الأسعار",
  ],
  authors: [{ name: "Price Hunter Team" }],
  creator: "Price Hunter",
  metadataBase: new URL(
    process.env.NEXTAUTH_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "ar_SA",
    url: "https://pricehunter.app",
    siteName: "Price Hunter",
    title: "Price Hunter - Compare Prices Across Stores",
    description:
      "Find the best prices for products across multiple online stores.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Price Hunter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Price Hunter - Compare Prices Across Stores",
    description:
      "Find the best prices for products across multiple online stores.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const direction = localeDirection[locale];

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body className={inter.variable} suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages}>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </NextIntlClientProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
