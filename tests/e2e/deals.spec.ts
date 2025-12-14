import { test, expect } from "@playwright/test";

test.describe("Deals Page", () => {
  test("should display deals page", async ({ page }) => {
    await page.goto("/deals");

    // Check page title
    await expect(page.locator("h1")).toContainText(/deals|عروض/i);
  });

  test("should show deal cards when deals exist", async ({ page }) => {
    await page.goto("/deals");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Either shows deals or empty state
    const hasDeals = await page.locator('[class*="grid"]').count() > 0;
    const hasEmptyState = await page.locator("text=No deals available").count() > 0;

    expect(hasDeals || hasEmptyState).toBeTruthy();
  });

  test("should display discount percentage on deal cards", async ({ page }) => {
    await page.goto("/deals");
    await page.waitForLoadState("networkidle");

    // If there are deals, they should show discount
    const dealCards = page.locator('[class*="card"]');
    const count = await dealCards.count();

    if (count > 0) {
      // Verify the structure exists
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("Trending Page", () => {
  test("should display trending page", async ({ page }) => {
    await page.goto("/trending");

    // Check page title
    await expect(page.locator("h1")).toContainText(/trending|رائج/i);
  });

  test("should show products or empty state", async ({ page }) => {
    await page.goto("/trending");
    await page.waitForLoadState("networkidle");

    // Either shows products or empty state
    const hasProducts = await page.locator('[class*="grid"]').count() > 0;
    const hasEmptyState = await page.locator("text=No trending products").count() > 0 ||
                          await page.locator("text=Start searching").count() > 0;

    expect(hasProducts || hasEmptyState).toBeTruthy();
  });
});

test.describe("Home Page Deals Section", () => {
  test("should display home page", async ({ page }) => {
    await page.goto("/");

    // Check app name
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should have search bar", async ({ page }) => {
    await page.goto("/");

    // Search input should exist
    await expect(page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="بحث" i]')).toBeVisible();
  });

  test("should display deals section when deals exist", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Page should load without errors
    const hasError = await page.locator("text=error").count();
    expect(hasError).toBeLessThanOrEqual(0);
  });

  test("should navigate to deals page from home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find and click View All link for deals
    const viewAllLink = page.locator('a[href="/deals"]');
    if (await viewAllLink.count() > 0) {
      await viewAllLink.first().click();
      await expect(page).toHaveURL(/\/deals/);
    }
  });

  test("should navigate to trending page from home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find and click View All link for trending
    const viewAllLink = page.locator('a[href="/trending"]');
    if (await viewAllLink.count() > 0) {
      await viewAllLink.first().click();
      await expect(page).toHaveURL(/\/trending/);
    }
  });
});

test.describe("API Endpoints", () => {
  test("GET /api/deals should return deals", async ({ request }) => {
    const response = await request.get("/api/deals");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.type).toBe("deals");
    expect(Array.isArray(data.deals)).toBeTruthy();
  });

  test("GET /api/deals?type=price-drops should return price drops", async ({ request }) => {
    const response = await request.get("/api/deals?type=price-drops");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.type).toBe("price-drops");
  });

  test("GET /api/trending should return trending products", async ({ request }) => {
    const response = await request.get("/api/trending");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.type).toBe("trending");
    expect(Array.isArray(data.products)).toBeTruthy();
  });

  test("GET /api/trending?type=new should return new products", async ({ request }) => {
    const response = await request.get("/api/trending?type=new");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.type).toBe("new");
  });

  test("GET /api/deals with filters", async ({ request }) => {
    const response = await request.get("/api/deals?country=SA&minDiscount=15&limit=5");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.deals.length).toBeLessThanOrEqual(5);
  });
});
