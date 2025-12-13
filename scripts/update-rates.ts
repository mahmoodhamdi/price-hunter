import { PrismaClient } from "@prisma/client";
import { updateExchangeRatesInDb } from "../src/lib/exchange/client";

const prisma = new PrismaClient();

async function updateRates() {
  console.log("💱 Updating exchange rates...");

  try {
    await updateExchangeRatesInDb();
    console.log("✅ Exchange rates updated successfully");

    // Show current rates
    const rates = await prisma.exchangeRate.findMany();
    console.log("\nCurrent rates:");
    for (const rate of rates) {
      console.log(`  ${rate.fromCurrency} -> ${rate.toCurrency}: ${rate.rate}`);
    }
  } catch (error) {
    console.error("❌ Failed to update exchange rates:", error);
    process.exit(1);
  }
}

updateRates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
