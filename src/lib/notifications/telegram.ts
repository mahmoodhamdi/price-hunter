interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown";
}

const TELEGRAM_API_URL = "https://api.telegram.org/bot";

export async function sendTelegramMessage({
  chatId,
  text,
  parseMode = "HTML",
}: TelegramMessage): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || botToken === "your-telegram-bot-token") {
    console.warn("Telegram bot token not configured, skipping notification");
    return false;
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_URL}${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API error:", error);
      return false;
    }

    console.log(`Telegram message sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

export function generatePriceAlertTelegramMessage(data: {
  productName: string;
  productUrl: string;
  currentPrice: number;
  targetPrice: number;
  currency: string;
  storeName: string;
}): string {
  return `
🎉 <b>Price Alert!</b>

<b>${data.productName}</b>

💰 Current Price: <b>${data.currency} ${data.currentPrice.toFixed(2)}</b>
🎯 Your Target: ${data.currency} ${data.targetPrice.toFixed(2)}
🏪 Store: ${data.storeName}

<a href="${data.productUrl}">View Product →</a>
  `.trim();
}

export function generateWelcomeTelegramMessage(name: string): string {
  return `
👋 <b>Welcome to Price Hunter, ${name}!</b>

You'll receive notifications here when:
• Products drop below your target price
• There are special deals on your wishlist
• Price changes on items you're tracking

Happy hunting! 🎯
  `.trim();
}
