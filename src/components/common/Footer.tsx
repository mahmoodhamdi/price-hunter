"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">💰</span>
              <span className="font-bold text-xl">{t("app.name")}</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("app.tagline")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">{t("nav.home")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/deals"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("nav.deals")}
                </Link>
              </li>
              <li>
                <Link
                  href="/trending"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("nav.trending")}
                </Link>
              </li>
              <li>
                <Link
                  href="/stores"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("nav.stores")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Stores */}
          <div>
            <h3 className="font-semibold mb-4">{t("stores.title")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground">Amazon</span>
              </li>
              <li>
                <span className="text-muted-foreground">Noon</span>
              </li>
              <li>
                <span className="text-muted-foreground">Jarir</span>
              </li>
              <li>
                <span className="text-muted-foreground">Extra</span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">{t("footer.about")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.contact")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          {t("footer.copyright", { year: currentYear })}
        </div>
      </div>
    </footer>
  );
}
