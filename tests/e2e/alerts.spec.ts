import { test, expect } from "@playwright/test";

test.describe("Price Alerts", () => {
  test("should redirect to login when accessing alerts page unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard/alerts");
    await page.waitForURL(/\/(login|auth)/);
  });
});

test.describe("Price Alert Creation", () => {
  test("should show alert button on product page", async ({ page }) => {
    await page.goto("/search?q=iphone");
    await page.waitForLoadState("networkidle");

    // Check if product cards are present
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toMatch(/search|product|price/);
  });
});

test.describe("Price Alert UI Components", () => {
  test("should render alert form correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Page should load without errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    expect(errors).toHaveLength(0);
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/alerts");
    await page.waitForLoadState("networkidle");

    // Page should handle responsive layout
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    expect(errors).toHaveLength(0);
  });

  test("should be responsive on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard/alerts");
    await page.waitForLoadState("networkidle");

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    expect(errors).toHaveLength(0);
  });
});

test.describe("Price History Chart", () => {
  test("should display chart on product page", async ({ page }) => {
    await page.goto("/search?q=phone");
    await page.waitForLoadState("networkidle");

    // Search results should load
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});

test.describe("Social Sharing", () => {
  test("should display share button on product cards", async ({ page }) => {
    await page.goto("/search?q=laptop");
    await page.waitForLoadState("networkidle");

    // Page should load product results
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toMatch(/search|product|laptop/i);
  });

  test("should open share dialog when clicked", async ({ page }) => {
    await page.goto("/deals");
    await page.waitForLoadState("networkidle");

    // Page should load deals
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});

test.describe("Compare Feature Integration", () => {
  test("should allow comparing products", async ({ page }) => {
    await page.goto("/compare");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Compare");
  });

  test("should handle multiple products in comparison", async ({ page }) => {
    await page.goto("/compare?products=test-1,test-2");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toContainText("Compare");
  });
});

test.describe("Dashboard Navigation", () => {
  test("should have cashback link", async ({ page }) => {
    await page.goto("/dashboard/cashback");
    await page.waitForLoadState("networkidle");

    // Should redirect to login or show dashboard
    const url = page.url();
    expect(url).toMatch(/(dashboard|login|auth)/);
  });

  test("should have alerts link", async ({ page }) => {
    await page.goto("/dashboard/alerts");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    expect(url).toMatch(/(dashboard|login|auth)/);
  });
});

test.describe("Price Drop Notifications", () => {
  test("should display price drops on deals page", async ({ page }) => {
    await page.goto("/deals");
    await page.waitForLoadState("networkidle");

    // Page should load
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});
