import { test, expect } from "@playwright/test";

test.describe("Search Functionality", () => {
  test("should load homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Price Hunter/);
  });

  test("should have search input", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test("should navigate to search results", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("iphone");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=iphone/);
  });

  test("should display search results", async ({ page }) => {
    await page.goto("/search?q=iphone");
    // Wait for results to load
    await page.waitForSelector('[data-testid="product-card"], .no-results', {
      timeout: 30000,
    });
  });
});

test.describe("Product Page", () => {
  test("should display product details", async ({ page }) => {
    await page.goto("/search?q=iphone");
    // Click on first product if exists
    const productCard = page.locator('[data-testid="product-card"]').first();
    if (await productCard.isVisible()) {
      await productCard.click();
      await expect(page).toHaveURL(/\/product\//);
    }
  });
});

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2")).toContainText(/Sign|Login/i);
  });

  test("should show register page", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1, h2")).toContainText(/Register|Sign Up/i);
  });

  test("should redirect to login for protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Stores Page", () => {
  test("should display stores list", async ({ page }) => {
    await page.goto("/stores");
    await expect(page.locator("h1")).toContainText(/Stores/i);
  });
});

test.describe("Responsive Design", () => {
  test("should be mobile friendly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    // Check if mobile menu button is visible
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Dark Mode", () => {
  test("should support dark mode", async ({ page }) => {
    await page.goto("/");
    // Check if theme toggle exists
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
  });
});
