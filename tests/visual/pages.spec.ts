import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
  test("home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("home.png");
  });

  test("login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveScreenshot("login.png");
  });

  test("register page", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveScreenshot("register.png");
  });

  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveScreenshot("dashboard.png");
  });

  test("campaigns", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page).toHaveScreenshot("campaigns.png");
  });
});
