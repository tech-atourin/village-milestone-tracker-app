import { test, expect } from "@playwright/test";

test.describe("auth gating", () => {
  test("root path redirects unauthenticated users to /login", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    expect(res?.status() ?? 0).toBeLessThan(500);
  });

  test("/login renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("scoped paths redirect unauth users to /login", async ({ page }) => {
    for (const p of [
      "/atourin/dashboard",
      "/mitra/dashboard",
      "/peserta/home",
      "/desa/dashboard",
    ]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/login(\?.*)?$/, { timeout: 5000 });
    }
  });

  test("invalid credentials surface a visible error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nope@example.com");
    await page.getByLabel(/password/i).fill("definitely-not-the-password");
    await page.getByRole("button", { name: /masuk|login|sign in/i }).click();
    await expect(
      page.locator("text=/akun|tidak|invalid|gagal/i").first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test("/forbidden renders", async ({ page }) => {
    const res = await page.goto("/forbidden");
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(
      page.locator("text=/akses|forbidden|tidak punya/i").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("robots.txt blocks crawlers (private app)", async ({ request }) => {
    const r = await request.get("/robots.txt");
    expect(r.ok()).toBeTruthy();
    const body = await r.text();
    expect(body.toLowerCase()).toContain("disallow: /");
  });
});
