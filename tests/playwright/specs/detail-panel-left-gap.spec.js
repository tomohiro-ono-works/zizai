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


async function gotoEmbeddedDataflow(page) {
  await page.route("**/gui/js/bridge.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: bridgeStub(),
    });
  });
  await page.goto("/gui/dataflow.html?mode=dataflow&embedded=1");
  await expect(page.locator(".detail-panel")).toBeVisible();
}


// The dead space the user sees is between the bottom of the panel and the bottom of the
// stretched AppShell main host. Measuring against <main> cannot see it, because <main> is
// sized by its own children and therefore always hugs them.
async function measureFlowLayout(page) {
  return page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
    const host = document.querySelector(".zui-shell__main-content");
    const hostRect = host.getBoundingClientRect();
    const hostClientBottom = hostRect.top + host.clientHeight;
    const doc = document.scrollingElement;
    const main = rect("main");
    const panel = rect(".detail-panel");
    const flow = rect("#flowchart");
    return {
      hostHeight: Math.round(host.clientHeight),
      mainHeight: Math.round(main.height),
      panelHeight: Math.round(panel.height),
      flowHeight: Math.round(flow.height),
      unfilledHostSpace: Math.round(hostClientBottom - main.bottom),
      gapBelowPanel: Math.round(hostClientBottom - panel.bottom),
      hostOverflowY: host.scrollHeight - host.clientHeight,
      documentOverflowY: doc.scrollHeight - doc.clientHeight,
    };
  });
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


test("dataflow flow layout produces no document or shell main-host scrollbars", async ({ page }) => {
  // Catches: the vendored `.zui-shell__main-content { overflow: auto }` turns the page
  // layout's leftover overflow into real scrollbars instead of the clip the Application
  // layout was written against.
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoEmbeddedDataflow(page);

  const overflow = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const host = document.querySelector(".zui-shell__main-content");
    return {
      documentX: doc.scrollWidth - doc.clientWidth,
      documentY: doc.scrollHeight - doc.clientHeight,
      mainHostX: host.scrollWidth - host.clientWidth,
      mainHostY: host.scrollHeight - host.clientHeight,
    };
  });

  expect(overflow).toEqual({ documentX: 0, documentY: 0, mainHostX: 0, mainHostY: 0 });
});


test("deliberate inner scroll regions keep scrolling after the outer overflow fix", async ({ page }) => {
  // Guards the fix for the test above against being made by blanket-hiding overflow:
  // the canvas and the bottom detail body own their scrolling and must keep it.
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoEmbeddedDataflow(page);

  const innerScrollability = await page.evaluate(() => {
    const overflowY = (selector) => window.getComputedStyle(document.querySelector(selector)).overflowY;
    return {
      flowchart: overflowY("#flowchart"),
      detailBody: overflowY("#nodeDetailBottom"),
    };
  });

  expect(innerScrollability).toEqual({ flowchart: "auto", detailBody: "auto" });
});


test("dragging the bottom splitter smaller grows the flow area and leaves no dead space", async ({ page }) => {
  // Catches: applyFlowViewportHeight() sizes the canvas from <main>'s own box and
  // subtracts a fixed 10px, so shrinking the panel cannot hand the space back.
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoEmbeddedDataflow(page);

  const before = await measureFlowLayout(page);

  const handle = await page.locator("#detailPanelResizer").boundingBox();
  const originX = handle.x + handle.width / 2;
  const originY = handle.y + handle.height / 2;
  await page.mouse.move(originX, originY);
  await page.mouse.down();
  await page.mouse.move(originX, originY + 160, { steps: 12 });
  await page.mouse.up();

  const after = await measureFlowLayout(page);

  // The flow column must consume the whole stretched host before and after the drag.
  // A negative gap means it overflowed instead, so the bound is two-sided.
  expect(before.unfilledHostSpace).toBeLessThanOrEqual(1);
  expect(before.gapBelowPanel).toBeGreaterThanOrEqual(0);
  expect(before.gapBelowPanel).toBeLessThanOrEqual(1);
  expect(after.panelHeight).toBeLessThan(before.panelHeight);
  expect(after.flowHeight).toBeGreaterThan(before.flowHeight);
  expect(after.unfilledHostSpace).toBeLessThanOrEqual(1);
  expect(after.gapBelowPanel).toBeGreaterThanOrEqual(0);
  expect(after.gapBelowPanel).toBeLessThanOrEqual(1);
});


test("dragging the bottom splitter larger respects the flow canvas minimum height", async ({ page }) => {
  // Catches: getDetailPanelHeightBounds() derives maxH from `rootHeight * 0.75` without
  // reserving the canvas minimum, so growing the panel overflows the layout host.
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoEmbeddedDataflow(page);

  const before = await measureFlowLayout(page);
  const handle = await page.locator("#detailPanelResizer").boundingBox();
  const originX = handle.x + handle.width / 2;
  const originY = handle.y + handle.height / 2;
  await page.mouse.move(originX, originY);
  await page.mouse.down();
  await page.mouse.move(originX, originY - 400, { steps: 20 });
  await page.mouse.up();

  const after = await measureFlowLayout(page);
  const flowMinHeight = await page.evaluate(
    () => parseFloat(window.getComputedStyle(document.querySelector("#flowchart")).minHeight)
  );
  const hostOverflowY = after.hostOverflowY;

  expect(after.panelHeight).toBeGreaterThan(before.panelHeight);
  expect(after.flowHeight).toBeGreaterThanOrEqual(flowMinHeight);
  // Growing the panel must not push the layout past the viewport-sized host.
  expect(after.hostHeight).toBe(before.hostHeight);
  expect(after.documentOverflowY).toBe(0);
  expect(after.gapBelowPanel).toBeGreaterThanOrEqual(0);
  expect(after.gapBelowPanel).toBeLessThanOrEqual(1);
  expect(hostOverflowY).toBe(0);
});
