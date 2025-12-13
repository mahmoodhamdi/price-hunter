import { prisma } from "@/lib/prisma";
import { sendEmail, generatePriceAlertEmail } from "@/lib/notifications/email";
import {
  sendTelegramMessage,
  generatePriceAlertTelegramMessage,
} from "@/lib/notifications/telegram";

interface AlertCheckResult {
  checked: number;
  triggered: number;
  errors: number;
}

export async function checkPriceAlerts(): Promise<AlertCheckResult> {
  const result: AlertCheckResult = {
    checked: 0,
    triggered: 0,
    errors: 0,
  };

  try {
    // Get all active, non-triggered alerts
    const activeAlerts = await prisma.priceAlert.findMany({
      where: {
        isActive: true,
        triggered: false,
      },
      include: {
        user: true,
        product: {
          include: {
            storeProducts: {
              where: {
                store: { isActive: true },
              },
              include: { store: true },
              orderBy: { price: "asc" },
            },
          },
        },
      },
    });

    console.log(`Checking ${activeAlerts.length} active alerts...`);

    for (const alert of activeAlerts) {
      result.checked++;

      try {
        // Get the lowest price for this product
        const lowestPriceProduct = alert.product.storeProducts[0];

        if (!lowestPriceProduct) {
          console.log(`No prices found for product ${alert.product.id}`);
          continue;
        }

        const currentPrice = Number(lowestPriceProduct.price);
        const targetPrice = Number(alert.targetPrice);

        // Check if current price is at or below target
        if (currentPrice <= targetPrice) {
          console.log(
            `Alert triggered for ${alert.product.name}: ${currentPrice} <= ${targetPrice}`
          );

          // Mark alert as triggered
          await prisma.priceAlert.update({
            where: { id: alert.id },
            data: {
              triggered: true,
              triggeredAt: new Date(),
            },
          });

          result.triggered++;

          // Send notifications
          const notificationData = {
            productName: alert.product.name,
            productUrl: lowestPriceProduct.url,
            currentPrice,
            targetPrice,
            currency: lowestPriceProduct.currency,
            storeName: lowestPriceProduct.store.name,
          };

          // Send email notification
          if (alert.notifyEmail && alert.user.email) {
            try {
              await sendEmail({
                to: alert.user.email,
                subject: `Price Alert: ${alert.product.name} is now ${lowestPriceProduct.currency} ${currentPrice}!`,
                html: generatePriceAlertEmail(notificationData),
              });
            } catch (emailError) {
              console.error("Failed to send email notification:", emailError);
            }
          }

          // Send Telegram notification
          if (alert.notifyTelegram && alert.user.telegramId) {
            try {
              await sendTelegramMessage({
                chatId: alert.user.telegramId,
                text: generatePriceAlertTelegramMessage(notificationData),
              });
            } catch (telegramError) {
              console.error("Failed to send Telegram notification:", telegramError);
            }
          }
        }
      } catch (alertError) {
        console.error(`Error processing alert ${alert.id}:`, alertError);
        result.errors++;
      }
    }

    console.log(
      `Alert check complete: ${result.checked} checked, ${result.triggered} triggered, ${result.errors} errors`
    );
  } catch (error) {
    console.error("Failed to check alerts:", error);
    throw error;
  }

  return result;
}

// Function to update exchange rates from an API
export async function updateExchangeRates(): Promise<void> {
  const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

  if (!API_KEY) {
    console.warn("Exchange rate API key not configured, skipping update");
    return;
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = data.conversion_rates;

    const currencies = ["SAR", "EGP", "AED", "KWD"];

    for (const currency of currencies) {
      if (rates[currency]) {
        const rate = 1 / rates[currency]; // Convert to USD

        await prisma.exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: {
              fromCurrency: currency as "SAR" | "EGP" | "AED" | "KWD",
              toCurrency: "USD",
            },
          },
          update: { rate, updatedAt: new Date() },
          create: {
            fromCurrency: currency as "SAR" | "EGP" | "AED" | "KWD",
            toCurrency: "USD",
            rate,
          },
        });
      }
    }

    console.log("Exchange rates updated successfully");
  } catch (error) {
    console.error("Failed to update exchange rates:", error);
  }
}
