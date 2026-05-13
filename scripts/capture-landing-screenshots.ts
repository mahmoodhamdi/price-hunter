/**
 * Capture per-edition landing-page screenshots using Playwright.
 *
 *   npx tsx scripts/capture-landing-screenshots.ts
 *
 * Iterates every directory in landing-pages/, opens its index.html via the
 * file:// protocol, and writes a desktop-frame PNG to
 *   docs/marketing/screenshots/desktop/<edition-slug>.png
 *
 * For mobile screenshots set MOBILE=1.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

// Fall back to system Chrome on platforms Playwright doesn't ship a
// headless-shell binary for (e.g. Ubuntu 26.04 at time of writing).
const SYSTEM_CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";

const LANDING_ROOT = path.join(process.cwd(), "landing-pages");
const OUT_ROOT = path.join(
  process.cwd(),
  "docs",
  "marketing",
  "screenshots",
  process.env.MOBILE === "1" ? "mobile" : "desktop"
);

async function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });

  const editions = fs
    .readdirSync(LANDING_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const launchOpts = require("node:fs").existsSync(SYSTEM_CHROME)
    ? { executablePath: SYSTEM_CHROME }
    : {};
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext(
    process.env.MOBILE === "1"
      ? devices["iPhone 14 Pro"]
      : { viewport: { width: 1440, height: 900 } }
  );
  const page = await context.newPage();

  let captured = 0;
  for (const ed of editions) {
    const file = path.join(LANDING_ROOT, ed, "index.html");
    if (!fs.existsSync(file)) continue;
    const url = `file://${file}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    // Tailwind via CDN finishes after first paint; give it a moment.
    await page.waitForTimeout(800);
    const outPath = path.join(OUT_ROOT, `${ed}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`  ✓ ${ed} → ${path.relative(process.cwd(), outPath)}`);
    captured++;
  }

  await browser.close();
  console.log(`\nCaptured ${captured} screenshots → ${OUT_ROOT}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
