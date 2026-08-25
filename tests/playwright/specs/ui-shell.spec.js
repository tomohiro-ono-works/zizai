const { test, expect } = require("@playwright/test");


test("home shell renders and navigates without a backend", async ({ page }) => {
  await page.goto("/gui/home.html");

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
  await expect(page).toHaveURL(/\/gui\/dataflow\.html/);
});


test("external URL adapter rejects unsafe schemes before Bridge call", async ({ page }) => {
  await page.goto("/gui/home.html");

  const result = await page.evaluate(async () => {
    const bridge = window.zizBridge;
    const calls = [];
    bridge.call = async (type, payload) => {
      calls.push({ type, payload });
      return { accepted: true };
    };

    const rejected = [];
    for (const url of ["file:///C:/outside.html", "ftp://example.com/file", "example.com/file"]) {
      try {
        await bridge.openExternal(url, { prefer: "chrome" });
      } catch (error) {
        rejected.push({ url, code: error?.code || "" });
      }
    }
    await bridge.openExternal("https://example.com/allowed/page", { prefer: "chrome" });
    return { calls, rejected };
  });

  expect(result.rejected).toEqual([
    { url: "file:///C:/outside.html", code: "E_ACCESS_DENIED" },
    { url: "ftp://example.com/file", code: "E_ACCESS_DENIED" },
    { url: "example.com/file", code: "E_ACCESS_DENIED" },
  ]);
  expect(result.calls).toEqual([
    {
      type: "app.openExternal",
      payload: { url: "https://example.com/allowed/page", prefer: "chrome" },
    },
  ]);
});
