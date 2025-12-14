"use client";

import { useState } from "react";
import {
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  Mail,
  MessageCircle,
  Share2,
  Check,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  price?: string;
  variant?: "button" | "icon" | "dropdown";
}

export function SocialShare({
  url,
  title,
  description,
  image,
  price,
  variant = "dropdown",
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const shareText = price
    ? `${title} - ${price} on Price Hunter`
    : `${title} on Price Hunter`;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(shareText);
  const encodedDescription = encodeURIComponent(description || "");

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    const shareUrl = shareLinks[platform];
    if (platform === "email") {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    }
  };

  if (variant === "icon") {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleShare("facebook")}
          className="hover:bg-blue-100 hover:text-blue-600"
        >
          <Facebook className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleShare("twitter")}
          className="hover:bg-sky-100 hover:text-sky-500"
        >
          <Twitter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleShare("whatsapp")}
          className="hover:bg-green-100 hover:text-green-600"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={copyToClipboard}>
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this product</DialogTitle>
            <DialogDescription>
              Share this deal with friends and family
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleShare("facebook")}
                className="flex-1 hover:bg-blue-100 hover:text-blue-600 hover:border-blue-200"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleShare("twitter")}
                className="flex-1 hover:bg-sky-100 hover:text-sky-500 hover:border-sky-200"
              >
                <Twitter className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleShare("whatsapp")}
                className="flex-1 hover:bg-green-100 hover:text-green-600 hover:border-green-200"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleShare("telegram")}
                className="flex-1 hover:bg-blue-100 hover:text-blue-500 hover:border-blue-200"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input value={url} readOnly className="flex-1" />
              <Button onClick={copyToClipboard} variant="outline">
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {typeof navigator !== "undefined" && navigator.share && (
              <Button onClick={handleNativeShare} className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                More sharing options
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleShare("facebook")}>
          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("twitter")}>
          <Twitter className="h-4 w-4 mr-2 text-sky-500" />
          Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("linkedin")}>
          <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
          <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleShare("email")}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Link2 className="h-4 w-4 mr-2" />
          )}
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Share price drop component
interface SharePriceDropProps {
  productName: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
  url: string;
}

export function SharePriceDrop({
  productName,
  oldPrice,
  newPrice,
  currency,
  url,
}: SharePriceDropProps) {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  const savings = oldPrice - newPrice;

  const shareText = `Price Drop Alert! ${productName} is now ${discount}% off! Save ${currency} ${savings.toFixed(2)}`;

  return (
    <SocialShare
      url={url}
      title={shareText}
      description={`The price dropped from ${currency} ${oldPrice.toFixed(2)} to ${currency} ${newPrice.toFixed(2)}. Check it out on Price Hunter!`}
      price={`${currency} ${newPrice.toFixed(2)}`}
      variant="button"
    />
  );
}
