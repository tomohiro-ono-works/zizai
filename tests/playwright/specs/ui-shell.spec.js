const { test, expect } = require("@playwright/test");


test("home shell renders and navigates without a backend", async ({ page }) => {
  await page.goto("/static/home.html");

  await expect(page.locator(".home-screen")).toBeVisible();
  await expect(page.locator(".home-screen__title")).toContainText("ziz ai craft");
  await expect(page.getByRole("heading", { name: "最近使ったプロジェクト" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "テンプレートから作成する" })).toBeVisible();
  await expect(page.getByText("プロジェクトがありません。")).toHaveCount(1);

  await page.getByRole("button", { name: "診断" }).click();
  await expect(page.locator("#appDialog.is-open")).toBeVisible();
  await expect(page.locator("#appDialogTitle")).toHaveText("診断");
  await page.keyboard.press("Escape");
  await expect(page.locator("#appDialog")).not.toHaveClass(/is-open/);

  await page.locator('[data-sidebar-action="explorer"]').first().click();
  await expect(page).toHaveURL(/\/static\/dataflow\.html/);
});
