"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Owner-facing button for managing the wishlist share link (Phase 6).
 *
 * - First click: generates a fresh token via POST /api/wishlist/share
 * - Subsequent: copies the absolute URL to clipboard
 * - Trash icon revokes sharing
 */
export function WishlistShareButton() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/wishlist/share")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.token) setToken(data.token);
      })
      .catch(() => {
        /* not logged in or 404 — silently ignore */
      });
  }, []);

  const fullUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/wishlist/${token}`
    : "";

  const enable = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/wishlist/share", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — silently ignore */
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await fetch("/api/wishlist/share", { method: "DELETE" });
      setToken(null);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={enable}
        disabled={busy}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share wishlist
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={copy} className="font-mono text-xs">
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 mr-2 text-emerald-600" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy share link
          </>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={revoke}
        disabled={busy}
        aria-label="Revoke wishlist sharing"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
