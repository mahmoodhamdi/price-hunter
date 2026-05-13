import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { getDeals } from "@/lib/services/deals";
import { formatPrice } from "@/lib/utils";

/**
 * Telegram bot webhook (Phase 6 — differentiation feature).
 *
 * Set up via the Telegram BotFather, then point the bot's webhook at
 * `https://<your-host>/api/telegram/webhook?secret=<TELEGRAM_WEBHOOK_SECRET>`.
 *
 * Supported commands:
 *   /start                  — welcome + how-to-link
 *   /link <code>            — link this Telegram account to a Price Hunter user
 *   /unlink                 — break the link
 *   /alerts                 — list active price alerts
 *   /deals [country]        — show top deals (default: user's country)
 *   /help                   — show available commands
 *
 * Authentication: Telegram passes the configured secret in
 * `?secret=...` so the receiver can verify only Telegram is calling it.
 * The user-to-chat link uses a short "linking code" the user generates
 * inside the dashboard; this avoids exposing the user's email over the
 * bot DM.
 */

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; username?: string };
    text?: string;
  };
}

const HELP_TEXT = [
  "<b>Price Hunter bot</b>",
  "",
  "Commands:",
  "  /start — welcome",
  "  /link &lt;code&gt; — link your account",
  "  /alerts — your active price alerts",
  "  /deals [country] — top deals (sa, eg, ae)",
  "  /unlink — break this Telegram link",
  "  /help — this menu",
].join("\n");

async function ensureChatLinked(chatId: string) {
  return prisma.user.findFirst({
    where: { telegramId: chatId },
    select: { id: true, name: true, country: true, currency: true },
  });
}

async function handleStart(chatId: string): Promise<string> {
  return [
    "Welcome to <b>Price Hunter</b> 🛒",
    "",
    "Get price-drop alerts, search 14 stores, see deals.",
    "",
    "To start: open https://pricehunter.app/dashboard/settings,",
    "generate your linking code, and send it here as:",
    "<code>/link YOUR_CODE</code>",
  ].join("\n");
}

async function handleLink(chatId: string, args: string[]): Promise<string> {
  const code = (args[0] || "").trim();
  if (!code) return "Usage: <code>/link YOUR_CODE</code>";

  // The "code" is the resetToken format — short-lived secure token issued
  // by /api/telegram/link on the dashboard. Reusing reset-token infra here
  // keeps the surface small.
  const user = await prisma.user.findFirst({
    where: {
      resetToken: code,
      resetTokenExpiry: { gte: new Date() },
    },
    select: { id: true, name: true },
  });

  if (!user) {
    return "Code not recognised or expired. Generate a new one in the dashboard.";
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramId: chatId,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return `Linked! Hi ${user.name || "there"} — you'll now receive price alerts here.`;
}

async function handleUnlink(chatId: string): Promise<string> {
  const user = await ensureChatLinked(chatId);
  if (!user) return "This Telegram account isn't linked.";
  await prisma.user.update({
    where: { id: user.id },
    data: { telegramId: null },
  });
  return "Unlinked. You won't receive alerts here anymore.";
}

async function handleAlerts(chatId: string): Promise<string> {
  const user = await ensureChatLinked(chatId);
  if (!user) {
    return "Link your account first with <code>/link YOUR_CODE</code>.";
  }
  const alerts = await prisma.priceAlert.findMany({
    where: { userId: user.id, isActive: true },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (alerts.length === 0) {
    return "You have no active price alerts.";
  }
  const lines = ["<b>Your active alerts:</b>", ""];
  for (const a of alerts) {
    lines.push(
      `• ${a.product.name} — target ${formatPrice(Number(a.targetPrice), a.currency)}`
    );
  }
  return lines.join("\n");
}

async function handleDeals(chatId: string, args: string[]): Promise<string> {
  const user = await ensureChatLinked(chatId);
  const requested = (args[0] || "").toUpperCase();
  const country =
    requested === "SA" || requested === "EG" || requested === "AE"
      ? requested
      : user?.country || undefined;

  const deals = await getDeals({ country, limit: 5, minDiscount: 20 });
  if (deals.length === 0) {
    return "No deals over 20% off right now.";
  }

  const lines = [`<b>Top deals${country ? " — " + country : ""}:</b>`, ""];
  for (const d of deals) {
    lines.push(
      `• ${d.name} — ${formatPrice(d.price, d.currency)} (-${d.discount}%) at ${d.store.name}`
    );
  }
  return lines.join("\n");
}

function parse(text: string): { cmd: string; args: string[] } {
  const trimmed = text.trim();
  const space = trimmed.indexOf(" ");
  if (space < 0) return { cmd: trimmed.toLowerCase(), args: [] };
  return {
    cmd: trimmed.slice(0, space).toLowerCase(),
    args: trimmed.slice(space + 1).split(/\s+/).filter(Boolean),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secretQs = request.nextUrl.searchParams.get("secret");
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && secretQs !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const message = update.message;
  if (!message?.text) {
    // Non-text message; acknowledge silently so Telegram doesn't retry.
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const { cmd, args } = parse(message.text);

  let reply: string;
  switch (cmd) {
    case "/start":
      reply = await handleStart(chatId);
      break;
    case "/link":
      reply = await handleLink(chatId, args);
      break;
    case "/unlink":
      reply = await handleUnlink(chatId);
      break;
    case "/alerts":
      reply = await handleAlerts(chatId);
      break;
    case "/deals":
      reply = await handleDeals(chatId, args);
      break;
    case "/help":
      reply = HELP_TEXT;
      break;
    default:
      reply = `Unknown command. Try /help.`;
  }

  await sendTelegramMessage({ chatId, text: reply });
  return NextResponse.json({ ok: true });
}

// Telegram only POSTs to the webhook; GET is a health probe for buyers.
export function GET() {
  return NextResponse.json({ ok: true, configured: !!process.env.TELEGRAM_BOT_TOKEN });
}
