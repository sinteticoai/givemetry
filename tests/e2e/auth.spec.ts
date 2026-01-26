// T045: E2E tests for complete auth flow
import { test, expect } from "@playwright/test";

// Test data
const testUser = {
  name: "E2E Test User",
  email: `e2e-test-${Date.now()}@example.com`,
  password: "TestPassword123",
  organizationName: "E2E Test Organization",
};

test.describe("Authentication Flow", () => {
  test.describe("Signup", () => {
    test("should display signup form", async ({ page }) => {
      await page.goto("/signup");

      // Check form elements are visible
      await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();
      await expect(page.getByLabel(/organization name/i)).toBeVisible();
      await expect(page.getByLabel(/your name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    });

    test("should show validation error for mismatched passwords", async ({ page }) => {
      await page.goto("/signup");

      await page.getByLabel(/organization name/i).fill("Test Org");
      await page.getByLabel(/your name/i).fill("Test User");
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.getByLabel(/^password$/i).fill("TestPassword123");
      await page.getByLabel(/confirm password/i).fill("DifferentPassword123");

      await page.getByRole("button", { name: /create account/i }).click();

      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test("should show validation error for weak password", async ({ page }) => {
      await page.goto("/signup");

      await page.getByLabel(/organization name/i).fill("Test Org");
      await page.getByLabel(/your name/i).fill("Test User");
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.getByLabel(/^password$/i).fill("weak");
      await page.getByLabel(/confirm password/i).fill("weak");

      await page.getByRole("button", { name: /create account/i }).click();

      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test("should navigate to login page", async ({ page }) => {
      await page.goto("/signup");

      await page.getByRole("link", { name: /sign in/i }).click();

      await expect(page).toHaveURL("/login");
    });

    // Note: Full signup test requires email verification which needs
    // test email infrastructure or mocking
    test.skip("should complete full signup flow", async ({ page }) => {
      await page.goto("/signup");

      await page.getByLabel(/organization name/i).fill(testUser.organizationName);
      await page.getByLabel(/your name/i).fill(testUser.name);
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/^password$/i).fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      await page.getByRole("button", { name: /create account/i }).click();

      // Should show success message
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Login", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel(/email/i).fill("invalid@example.com");
      await page.getByLabel(/password/i).fill("wrongpassword");

      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 5000 });
    });

    test("should navigate to signup page", async ({ page }) => {
      await page.goto("/login");

      await page.getByRole("link", { name: /sign up/i }).click();

      await expect(page).toHaveURL("/signup");
    });

    test("should navigate to forgot password page", async ({ page }) => {
      await page.goto("/login");

      await page.getByRole("link", { name: /forgot password/i }).click();

      await expect(page).toHaveURL("/forgot-password");
    });

    // Note: Full login test requires a seeded user
    test.skip("should complete login flow with valid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel(/email/i).fill("seeded@example.com");
      await page.getByLabel(/password/i).fill("SeededPassword123");

      await page.getByRole("button", { name: /sign in/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
    });
  });

  test.describe("Forgot Password", () => {
    test("should display forgot password form", async ({ page }) => {
      await page.goto("/forgot-password");

      await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
    });

    test("should show success message after submission", async ({ page }) => {
      await page.goto("/forgot-password");

      await page.getByLabel(/email/i).fill("anyemail@example.com");
      await page.getByRole("button", { name: /send reset link/i }).click();

      // Should always show success to prevent email enumeration
      await expect(page.getByText(/check your email|reset link|sent/i)).toBeVisible({ timeout: 5000 });
    });

    test("should navigate back to login", async ({ page }) => {
      await page.goto("/forgot-password");

      await page.getByRole("link", { name: /back|sign in|login/i }).click();

      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      await page.goto("/dashboard");

      // Should redirect to login with callback URL
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect from settings to login when unauthenticated", async ({ page }) => {
      await page.goto("/settings");

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Responsive Design", () => {
    test("login form should be accessible on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto("/login");

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });

    test("signup form should be accessible on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/signup");

      await expect(page.getByLabel(/organization name/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    });
  });
});

// Accessibility tests
test.describe("Accessibility", () => {
  test("login page should have proper form labels", async ({ page }) => {
    await page.goto("/login");

    // Check that inputs have associated labels
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check form is keyboard navigable
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await page.keyboard.press("Tab");
    // After email, should focus on forgot password link or password field
  });

  test("signup page should have proper form labels", async ({ page }) => {
    await page.goto("/signup");

    const orgInput = page.getByLabel(/organization name/i);
    const nameInput = page.getByLabel(/your name/i);
    const emailInput = page.getByLabel(/email/i);

    await expect(orgInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
  });
});
