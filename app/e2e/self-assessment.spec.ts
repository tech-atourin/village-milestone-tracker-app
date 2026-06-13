import { test, expect } from "@playwright/test";

// =====================================================
// Self-assessment shell smoke — no actual login (would
// need test fixture). Verifies routes serve correctly
// for unauth users (redirect to /login).
// =====================================================

test.describe("self-assessment routes", () => {
  test("/desa/self-assessment redirects unauth to /login", async ({ page }) => {
    await page.goto("/desa/self-assessment");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("/desa/self-assessment?v=v2 redirects unauth to /login", async ({ page }) => {
    await page.goto("/desa/self-assessment?v=v2");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("/atourin/klasifikasi redirects unauth to /login", async ({ page }) => {
    await page.goto("/atourin/klasifikasi");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("/narasumber/dashboard redirects unauth to /login", async ({ page }) => {
    await page.goto("/narasumber/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("/atourin/desa redirects unauth to /login", async ({ page }) => {
    await page.goto("/atourin/desa");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("/desa/pengelola redirects unauth to /login", async ({ page }) => {
    await page.goto("/desa/pengelola");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
