import { PrismaClient } from "@prisma/client";
import { sendEmail, generatePriceAlertEmail } from "../src/lib/notifications/email";
import {
  sendTelegramMessage,
  generatePriceAlertTelegramMessage,
} from "../src/lib/notifications/telegram";

const prisma = new PrismaClient();

async function checkAlerts() {
  console.log("🔔 Checking price alerts...");

  // Get all active, non-triggered alerts
  const alerts = await prisma.priceAlert.findMany({
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

  console.log(`Found ${alerts.length} active alerts to check`);

  let triggeredCount = 0;

  for (const alert of alerts) {
    const lowestPriceProduct = alert.product.storeProducts[0];

    if (!lowestPriceProduct) {
      continue;
    }

    const currentPrice = Number(lowestPriceProduct.price);
    const targetPrice = Number(alert.targetPrice);

    if (currentPrice <= targetPrice) {
      console.log(
        `✅ Alert triggered! ${alert.product.name} is now ${currentPrice} (target: ${targetPrice})`
      );

      // Mark alert as triggered
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: {
          triggered: true,
          triggeredAt: new Date(),
        },
      });

      // Send notifications
      const notificationData = {
        productName: alert.product.name,
        productUrl: lowestPriceProduct.url,
        currentPrice,
        targetPrice,
        currency: alert.currency,
        storeName: lowestPriceProduct.store.name,
      };

      // Email notification
      if (alert.notifyEmail && alert.user.email) {
        const emailHtml = generatePriceAlertEmail(notificationData);
        await sendEmail({
          to: alert.user.email,
          subject: `🎉 Price Alert: ${alert.product.name} is now ${alert.currency} ${currentPrice}!`,
          html: emailHtml,
        });
      }

      // Telegram notification
      if (alert.notifyTelegram && alert.user.telegramId) {
        const telegramMessage =
          generatePriceAlertTelegramMessage(notificationData);
        await sendTelegramMessage({
          chatId: alert.user.telegramId,
          text: telegramMessage,
        });
      }

      triggeredCount++;
    }
  }

  console.log(`🔔 Alert check complete. ${triggeredCount} alerts triggered.`);
}

checkAlerts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
