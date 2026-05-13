import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { recordConversion } from "@/lib/services/affiliate";

/**
 * Affiliate-conversion webhook receiver (Phase 10).
 *
 * Stores POST here when an outbound affiliate click results in a sale.
 * The route validates the per-store HMAC signature and records the
 * conversion + revenue on the AffiliateClick row.
 *
 * Each store has its own envelope. We normalise to a tiny shape:
 *   { clickId: string, revenue: number, currency: string, signature: string }
 *
 * The signature is HMAC-SHA256 of `${clickId}:${revenue}:${currency}` keyed
 * by `AFFILIATE_WEBHOOK_SECRET__<STORE_SLUG>` (uppercase + dashes-to-underscores).
 *
 * Buyers configure per-store secrets in their environment and share the
 * webhook URL when applying to each affiliate program.
 */

interface NormalizedPayload {
  clickId: string;
  revenue: number;
  currency: string;
  signature: string;
}

function envKey(storeSlug: string): string {
  const norm = storeSlug.toUpperCase().replace(/-/g, "_");
  return `AFFILIATE_WEBHOOK_SECRET__${norm}`;
}

function verifySignature(
  payload: { clickId: string; revenue: number; currency: string },
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${payload.clickId}:${payload.revenue}:${payload.currency}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// Minimal per-store adapters. Each one shapes the incoming JSON into
// NormalizedPayload. Add more here as buyers enrol in additional programs.
const ADAPTERS: Record<
  string,
  (body: Record<string, unknown>) => NormalizedPayload | null
> = {
  default: (body) => {
    if (
      typeof body.clickId !== "string" ||
      typeof body.revenue !== "number" ||
      typeof body.currency !== "string" ||
      typeof body.signature !== "string"
    ) {
      return null;
    }
    return {
      clickId: body.clickId,
      revenue: body.revenue,
      currency: body.currency,
      signature: body.signature,
    };
  },
  "amazon-sa": (body) => ADAPTERS.default(body),
  "amazon-eg": (body) => ADAPTERS.default(body),
  "amazon-ae": (body) => ADAPTERS.default(body),
  "noon-sa": (body) => ADAPTERS.default(body),
  "noon-eg": (body) => ADAPTERS.default(body),
  "noon-ae": (body) => ADAPTERS.default(body),
};

export async function POST(
  request: NextRequest,
  { params }: { params: { storeSlug: string } }
): Promise<NextResponse> {
  const { storeSlug } = params;
  const adapter = ADAPTERS[storeSlug] || ADAPTERS.default;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const payload = adapter(body);
  if (!payload) {
    return NextResponse.json(
      { error: "payload shape rejected by adapter" },
      { status: 400 }
    );
  }

  const secret = process.env[envKey(storeSlug)];
  if (!secret) {
    return NextResponse.json(
      { error: `no webhook secret configured for ${storeSlug}` },
      { status: 503 }
    );
  }

  if (
    !verifySignature(
      {
        clickId: payload.clickId,
        revenue: payload.revenue,
        currency: payload.currency,
      },
      payload.signature,
      secret
    )
  ) {
    return NextResponse.json({ error: "signature mismatch" }, { status: 401 });
  }

  if (payload.revenue < 0) {
    return NextResponse.json({ error: "negative revenue" }, { status: 400 });
  }

  // Verify the click exists and isn't already converted
  const existing = await prisma.affiliateClick.findUnique({
    where: { id: payload.clickId },
    select: { id: true, converted: true, storeId: true, store: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "click not found" }, { status: 404 });
  }
  if (existing.store.slug !== storeSlug) {
    return NextResponse.json(
      { error: "click does not belong to this store" },
      { status: 400 }
    );
  }
  if (existing.converted) {
    // Idempotent: treat duplicate webhook fires as success.
    return NextResponse.json({ ok: true, idempotent: true });
  }

  await recordConversion(payload.clickId, payload.revenue);

  return NextResponse.json({ ok: true });
}
