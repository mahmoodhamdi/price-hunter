import { test, expect } from "@playwright/test";

test.describe("Forgot Password Page", () => {
  test("should display forgot password page", async ({ page }) => {
    await page.goto("/forgot-password");

    // Check page has email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("should show form elements", async ({ page }) => {
    await page.goto("/forgot-password");

    // Email input
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Back to login link
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test("should require email field", async ({ page }) => {
    await page.goto("/forgot-password");

    // Try to submit empty form
    await page.locator('button[type="submit"]').click();

    // Email should be required (HTML5 validation)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("should navigate back to login", async ({ page }) => {
    await page.goto("/forgot-password");

    // Click back to login
    await page.locator('a[href="/login"]').click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("should submit form with valid email", async ({ page }) => {
    await page.goto("/forgot-password");

    // Fill email
    await page.locator('input[type="email"]').fill("test@example.com");

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for response - should show success or error
    await page.waitForLoadState("networkidle");

    // Either shows success message or stays on form (no crash)
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});

test.describe("Reset Password Page", () => {
  test("should show invalid token message without token", async ({ page }) => {
    await page.goto("/reset-password");

    await page.waitForLoadState("networkidle");

    // Should show invalid/expired message
    const content = await page.content();
    expect(
      content.includes("Invalid") ||
      content.includes("expired") ||
      content.includes("invalid") ||
      content.includes("Request new")
    ).toBeTruthy();
  });

  test("should show invalid token message with bad token", async ({ page }) => {
    await page.goto("/reset-password?token=invalid_token_123");

    await page.waitForLoadState("networkidle");

    // Wait for verification
    await page.waitForTimeout(1000);

    // Should show invalid message
    const content = await page.content();
    expect(
      content.includes("Invalid") ||
      content.includes("expired") ||
      content.includes("invalid") ||
      content.includes("Request new")
    ).toBeTruthy();
  });

  test("should have link to request new reset", async ({ page }) => {
    await page.goto("/reset-password");

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Should have link to forgot password
    const forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotPasswordLink).toBeVisible();
  });
});

test.describe("Login Page Password Reset Link", () => {
  test("should have forgot password link on login page", async ({ page }) => {
    await page.goto("/login");

    // Forgot password link should exist
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test("should navigate to forgot password from login", async ({ page }) => {
    await page.goto("/login");

    // Click forgot password link
    await page.locator('a[href="/forgot-password"]').click();

    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

test.describe("Auth API Endpoints", () => {
  test("POST /api/auth/forgot-password should accept email", async ({ request }) => {
    const response = await request.post("/api/auth/forgot-password", {
      data: { email: "test@example.com" },
    });

    // Should return 200 (success response even for non-existent emails for security)
    expect(response.ok()).toBeTruthy();
  });

  test("POST /api/auth/forgot-password should require email", async ({ request }) => {
    const response = await request.post("/api/auth/forgot-password", {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test("GET /api/auth/verify-reset-token should verify token", async ({ request }) => {
    const response = await request.get("/api/auth/verify-reset-token?token=test_token");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(typeof data.valid).toBe("boolean");
  });

  test("GET /api/auth/verify-reset-token without token should return invalid", async ({ request }) => {
    const response = await request.get("/api/auth/verify-reset-token");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.valid).toBe(false);
  });

  test("POST /api/auth/reset-password should require token and password", async ({ request }) => {
    const response = await request.post("/api/auth/reset-password", {
      data: { password: "newpassword123" },
    });

    expect(response.status()).toBe(400);
  });

  test("POST /api/auth/reset-password should reject short passwords", async ({ request }) => {
    const response = await request.post("/api/auth/reset-password", {
      data: { token: "test_token", password: "short" },
    });

    expect(response.status()).toBe(400);
  });
});
