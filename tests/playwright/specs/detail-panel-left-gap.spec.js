const { test, expect } = require("@playwright/test");


function bridgeStub() {
  return `
    (() => {
      const bridgeApi = {
        available() { return true; },
        status() { return { state: "ready", ready: true }; },
        unavailableMessage() { return ""; },
        call(type, payload = {}) {
          if (type === "app.getStatus") return Promise.resolve({ gui_mode: "webview", host: "qt" });
          if (type === "flow.list") return Promise.resolve({ scope: payload.scope || "local", kind: payload.kind || "recent", items: [] });
          if (type === "workspace.getRoot") return Promise.resolve({ has_root: false, root_path: "", config_path: "C:/zizai/config" });
          if (type === "workspace.list") return Promise.resolve({ scope: payload.scope || "root", entries: [] });
          return Promise.resolve({});
        },
      };
      window.zizBridge = bridgeApi;
      window.zizPackages = window.zizPackages || {};
      window.zizPackages.core = window.zizPackages.core || {};
      window.zizPackages.core.bridge = bridgeApi;
      setTimeout(() => window.dispatchEvent(new CustomEvent("ziz:bridge-ready")), 0);
    })();
  `;
}


test("bottom detail area is flush with its container", async ({ page }) => {
  await page.route("**/gui/js/bridge.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: bridgeStub(),
    });
  });
  await page.goto("/gui/dataflow.html?mode=dataflow&embedded=1");
  await expect(page.locator(".detail-panel")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const detailPanel = document.querySelector(".detail-panel")?.getBoundingClientRect();
    const detailContent = document.querySelector("#nodeDetailBottom")?.getBoundingClientRect();
    return {
      panelLeft: Math.round(detailPanel?.left ?? -1),
      contentLeft: Math.round(detailContent?.left ?? -2),
    };
  });

  expect(metrics.contentLeft).toBe(metrics.panelLeft);
});
