"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    country: "SA",
    currency: "SAR",
    telegramId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully" });
        await update();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("settings")}</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t("country")}</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) =>
                    setFormData({ ...formData, country: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SA">Saudi Arabia</SelectItem>
                    <SelectItem value="EG">Egypt</SelectItem>
                    <SelectItem value="AE">UAE</SelectItem>
                    <SelectItem value="KW">Kuwait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t("currency")}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram Chat ID</Label>
                <Input
                  id="telegram"
                  value={formData.telegramId}
                  onChange={(e) =>
                    setFormData({ ...formData, telegramId: e.target.value })
                  }
                  placeholder="Your Telegram chat ID for notifications"
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded-md ${
                    message.type === "success"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : t("save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("notifications")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Configure how you want to receive price drop notifications.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Email Notifications</span>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <span>Telegram Notifications</span>
                <input type="checkbox" className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <span>Browser Push Notifications</span>
                <input type="checkbox" className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">{t("dangerZone")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Once you delete your account, there is no going back.
            </p>
            <Button variant="destructive">{t("deleteAccount")}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
