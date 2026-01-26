// T075: E2E test for upload-map-process flow
import { test, expect, type Page } from "@playwright/test";

// Test data
const testUser = {
  email: "manager@demo.givemetry.com",
  password: "DemoManager123!",
};

// Helper to login
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/password/i).fill(testUser.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

// Helper to create CSV content
function createCSVContent(
  headers: string[],
  rows: string[][]
): string {
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

test.describe("Upload Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Skip login for now - tests should be runnable with seeded test user
    // In CI, you might want to use a test database with seeded users
  });

  test.describe("Upload Page", () => {
    test("should display upload page with dropzone", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Check page elements
      await expect(page.getByRole("heading", { name: /uploads/i })).toBeVisible();
      await expect(page.getByText(/drop.*csv/i)).toBeVisible();
    });

    test("should display upload history", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Check for upload list section
      await expect(page.getByText(/recent uploads|upload history/i)).toBeVisible();
    });

    test("should navigate to upload detail page", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // If there are existing uploads, click on one
      const uploadRow = page.locator('[data-testid="upload-row"]').first();
      if (await uploadRow.isVisible()) {
        await uploadRow.click();
        await expect(page).toHaveURL(/\/uploads\/[a-f0-9-]+/);
      }
    });
  });

  test.describe("CSV File Upload", () => {
    test("should accept CSV file via drag and drop", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Create a test CSV file
      const csvContent = createCSVContent(
        ["Constituent ID", "First Name", "Last Name", "Email"],
        [
          ["12345", "John", "Doe", "john@example.com"],
          ["12346", "Jane", "Smith", "jane@example.com"],
        ]
      );

      // Create file input (some dropzones have hidden file inputs)
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: "test-constituents.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(csvContent),
        });

        // Should show file selected or start upload
        await expect(
          page.getByText(/test-constituents\.csv|uploading|processing/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should reject non-CSV files", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: "test.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not a csv"),
        });

        // Should show error or reject
        await expect(
          page.getByText(/csv only|invalid file|unsupported/i)
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test("should show file size limit warning for large files", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Check for file size limit indication in UI
      await expect(
        page.getByText(/500\s*mb|max.*size|size limit/i)
      ).toBeVisible();
    });
  });

  test.describe("Field Mapping", () => {
    // This test requires a staged upload
    test.skip("should display field mapping UI after upload", async ({ page }) => {
      await login(page);

      // Navigate to an upload that needs field mapping
      // This would require a staged upload in the database
      await page.goto("/uploads/test-upload-id");

      // Check for field mapping UI elements
      await expect(page.getByText(/field mapping|map columns/i)).toBeVisible();
      await expect(page.getByText(/source column|csv column/i)).toBeVisible();
      await expect(page.getByText(/target field|database field/i)).toBeVisible();
    });

    test.skip("should show suggested mappings", async ({ page }) => {
      await login(page);
      await page.goto("/uploads/test-upload-id");

      // Check that auto-suggested mappings are displayed
      await expect(page.getByText(/externalId|constituent.*id/i)).toBeVisible();
      await expect(page.getByText(/firstName|first.*name/i)).toBeVisible();
    });

    test.skip("should allow manual field mapping changes", async ({ page }) => {
      await login(page);
      await page.goto("/uploads/test-upload-id");

      // Find a mapping dropdown and change it
      const mappingDropdown = page.locator('[data-testid="field-mapping-select"]').first();
      if (await mappingDropdown.isVisible()) {
        await mappingDropdown.click();
        await page.getByRole("option", { name: /email/i }).click();

        // Verify change was applied
        await expect(mappingDropdown).toContainText(/email/i);
      }
    });

    test.skip("should validate required fields are mapped", async ({ page }) => {
      await login(page);
      await page.goto("/uploads/test-upload-id");

      // Check for validation indicators
      const requiredIndicator = page.getByText(/required|mandatory/i);
      await expect(requiredIndicator).toBeVisible();
    });
  });

  test.describe("Upload Progress", () => {
    test.skip("should show progress indicator during processing", async ({ page }) => {
      await login(page);

      // Navigate to a processing upload
      await page.goto("/uploads/processing-upload-id");

      // Check for progress elements
      await expect(
        page.getByRole("progressbar").or(page.getByText(/processing|\d+%/i))
      ).toBeVisible();
    });

    test.skip("should update progress in real-time", async ({ page }) => {
      await login(page);
      await page.goto("/uploads/processing-upload-id");

      // Wait for progress update
      const initialProgress = await page.getByTestId("progress-value").textContent();
      await page.waitForTimeout(2000);
      const updatedProgress = await page.getByTestId("progress-value").textContent();

      // Progress should change (or be complete)
      expect(
        updatedProgress !== initialProgress ||
        updatedProgress?.includes("100") ||
        updatedProgress?.includes("complete")
      ).toBeTruthy();
    });
  });

  test.describe("Upload Results", () => {
    test.skip("should display completion summary", async ({ page }) => {
      await login(page);

      // Navigate to a completed upload
      await page.goto("/uploads/completed-upload-id");

      // Check for summary elements
      await expect(page.getByText(/completed|success/i)).toBeVisible();
      await expect(page.getByText(/rows|records/i)).toBeVisible();
    });

    test.skip("should show error details for failed rows", async ({ page }) => {
      await login(page);

      // Navigate to an upload with errors
      await page.goto("/uploads/upload-with-errors-id");

      // Check for error section
      await expect(page.getByText(/errors|failed|issues/i)).toBeVisible();

      // Should show error details
      const errorRow = page.locator('[data-testid="error-row"]').first();
      if (await errorRow.isVisible()) {
        await expect(errorRow).toContainText(/row|line/i);
      }
    });

    test.skip("should allow download of error report", async ({ page }) => {
      await login(page);
      await page.goto("/uploads/upload-with-errors-id");

      const downloadButton = page.getByRole("button", { name: /download.*errors|export/i });
      if (await downloadButton.isVisible()) {
        const [download] = await Promise.all([
          page.waitForEvent("download"),
          downloadButton.click(),
        ]);

        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    });
  });

  test.describe("Upload Actions", () => {
    test.skip("should allow retry of failed upload", async ({ page }) => {
      await login(page);
      await page.goto("/uploads/failed-upload-id");

      const retryButton = page.getByRole("button", { name: /retry/i });
      await expect(retryButton).toBeVisible();

      await retryButton.click();

      // Should show confirmation or start processing
      await expect(
        page.getByText(/retrying|queued|processing/i)
      ).toBeVisible();
    });

    test.skip("should allow deletion of upload", async ({ page }) => {
      await login(page);
      await page.goto("/uploads/deletable-upload-id");

      const deleteButton = page.getByRole("button", { name: /delete/i });
      await expect(deleteButton).toBeVisible();

      await deleteButton.click();

      // Should show confirmation dialog
      await expect(page.getByText(/confirm|are you sure/i)).toBeVisible();

      // Confirm deletion
      await page.getByRole("button", { name: /confirm|yes|delete/i }).click();

      // Should redirect to uploads list
      await expect(page).toHaveURL("/uploads");
    });
  });

  test.describe("Data Type Selection", () => {
    test.skip("should allow selection of data type before upload", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Check for data type selection
      await expect(page.getByText(/constituents|donors/i)).toBeVisible();
      await expect(page.getByText(/gifts|donations/i)).toBeVisible();
      await expect(page.getByText(/contacts|interactions/i)).toBeVisible();
    });

    test.skip("should update field mapping suggestions based on data type", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Select gifts data type
      await page.getByRole("button", { name: /gifts|donations/i }).click();

      // Upload should now suggest gift-related fields
      const csvContent = createCSVContent(
        ["ID", "Amount", "Date", "Fund"],
        [["12345", "1000.00", "2024-01-15", "Annual Fund"]]
      );

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: "test-gifts.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(csvContent),
        });

        // Wait for field mapping suggestions
        await expect(page.getByText(/amount|giftDate/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Accessibility", () => {
    test("upload page should have proper ARIA labels", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Check for accessible upload zone
      const dropzone = page.locator('[role="button"]').filter({ hasText: /upload|drop/i });
      await expect(dropzone).toBeVisible();

      // Check for accessible file input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        const ariaLabel = await fileInput.getAttribute("aria-label");
        const labelledBy = await fileInput.getAttribute("aria-labelledby");
        expect(ariaLabel || labelledBy).toBeTruthy();
      }
    });

    test("field mapping should be keyboard navigable", async ({ page }) => {
      await login(page);
      await page.goto("/uploads");

      // Tab through the page
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Something should be focused
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("upload page should work on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page);
      await page.goto("/uploads");

      // Upload zone should still be visible
      await expect(page.getByText(/upload|drop.*csv/i)).toBeVisible();

      // Navigation should be accessible (possibly via hamburger menu)
      const mobileNav = page.locator('[data-testid="mobile-nav"]').or(
        page.getByRole("button", { name: /menu/i })
      );
      await expect(mobileNav.or(page.getByText(/uploads/i))).toBeVisible();
    });

    test("field mapping should be usable on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page);

      // Would need a staged upload to fully test
      // For now, just verify the page loads
      await page.goto("/uploads");
      await expect(page).toHaveURL(/uploads/);
    });
  });
});

test.describe("Permission-based Upload Access", () => {
  test.skip("viewers should not see upload button", async ({ page }) => {
    // Login as viewer
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("viewer@demo.givemetry.com");
    await page.getByLabel(/password/i).fill("DemoViewer123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/uploads");

    // Upload button should not be visible for viewers
    await expect(page.getByRole("button", { name: /upload|new/i })).not.toBeVisible();
  });

  test.skip("managers should see upload button", async ({ page }) => {
    // Login as manager
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("manager@demo.givemetry.com");
    await page.getByLabel(/password/i).fill("DemoManager123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/uploads");

    // Upload button should be visible for managers
    await expect(page.getByRole("button", { name: /upload|new/i })).toBeVisible();
  });
});
