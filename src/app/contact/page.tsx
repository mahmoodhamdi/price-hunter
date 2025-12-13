"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">{t("contact")}</h1>

        {submitted ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-semibold mb-2">Thank you!</h2>
              <p className="text-muted-foreground">
                We&apos;ve received your message and will get back to you soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Get in Touch</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("name")}</Label>
                    <Input id="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input id="email" type="email" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">📧</div>
              <h3 className="font-semibold mb-1">Email</h3>
              <a
                href="mailto:support@pricehunter.app"
                className="text-primary hover:underline text-sm"
              >
                support@pricehunter.app
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-semibold mb-1">Telegram</h3>
              <a
                href="https://t.me/pricehunterbot"
                className="text-primary hover:underline text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                @pricehunterbot
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6 text-center">
              <div className="text-3xl mb-2">🐦</div>
              <h3 className="font-semibold mb-1">Twitter</h3>
              <a
                href="https://twitter.com/pricehunterapp"
                className="text-primary hover:underline text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                @pricehunterapp
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
