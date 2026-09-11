const { test, expect } = require("@playwright/test");


const APP_SHELL_CSS = [
  "/gui/vendor/zizai-app-shell/src/00_tokens.css",
  "/gui/vendor/zizai-app-shell/src/ui-shell.css",
];
const APP_SHELL_SCRIPTS = [
  "/gui/vendor/zizai-app-shell/src/shell_types.js",
  "/gui/vendor/zizai-app-shell/src/shell_events.js",
  "/gui/vendor/zizai-app-shell/src/shell_dom.js",
  "/gui/vendor/zizai-app-shell/src/shell_layout.js",
  "/gui/vendor/zizai-app-shell/src/shell_regions.js",
  "/gui/vendor/zizai-app-shell/src/shell_tabs.js",
  "/gui/vendor/zizai-app-shell/src/shell_tab_interactions.js",
  "/gui/vendor/zizai-app-shell/src/shell_activitybar.js",
  "/gui/vendor/zizai-app-shell/src/shell_shortcuts.js",
  "/gui/vendor/zizai-app-shell/src/app_shell.js",
  "/gui/js/app-shell.js",
];


async function readLoadOrder(page) {
  return page.evaluate(() => ({
    styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((link) => new URL(link.href).pathname),
    scripts: Array.from(document.scripts).map((script) => (script.src ? new URL(script.src).pathname : "")).filter(Boolean),
  }));
}

function assertOrdered(list, expectedSubsequence) {
  const indexes = expectedSubsequence.map((item) => list.indexOf(item));
  expect(indexes.every((index) => index >= 0)).toBe(true);
  for (let i = 1; i < indexes.length; i += 1) {
    expect(indexes[i]).toBeGreaterThan(indexes[i - 1]);
  }
}


test("home shell renders and navigates without a backend", async ({ page }) => {
  await page.goto("/gui/home.html");

  const loadOrder = await readLoadOrder(page);
  assertOrdered(loadOrder.styles, APP_SHELL_CSS);
  assertOrdered(loadOrder.scripts, APP_SHELL_SCRIPTS);

  await expect(page.locator(".zui-shell")).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator(".sidebar")).toHaveCount(0);

  const hasUiShellFactory = await page.evaluate(
    () => typeof window.zizPackages?.uiShell?.createAppShell === "function"
  );
  expect(hasUiShellFactory).toBe(true);

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

  await page.locator('.zui-shell__activity[data-activity-id="explorer"]').first().click();
  await expect(page).toHaveURL(/\/gui\/dataflow\.html/);
});


test("dataflow and settings pages mount the shared AppShell without legacy duplicate shell DOM", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await expect(page.locator(".zui-shell")).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator(".workspace-tab-header")).toHaveCount(0);
  await expect(page.locator("#flowchart")).toBeAttached();
  await expect(page.locator(".zui-shell__tabbar")).toBeAttached();

  await page.goto("/gui/settings.html");
  await expect(page.locator(".zui-shell")).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await expect(page.locator(".home-screen__empty")).toContainText("設定画面");
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


// Stubs only the external Bridge boundary (installed before bridge.js loads, matching
// detail-panel-left-gap.spec.js) so the real AppShell, workspace.shell, and
// workspace.manager Adapters run unmodified against dataflow.html. Every field below
// mirrors what workspace.manager.js actually reads from each Bridge response.
function workspaceBridgeStub(files = {}) {
  const filesJson = JSON.stringify(files);
  return `
    (() => {
      const files = ${filesJson};
      const bridgeApi = {
        available() { return true; },
        status() { return { state: "ready", ready: true }; },
        unavailableMessage() { return ""; },
        call(type, payload = {}) {
          if (type === "workspace.getRoot") {
            return Promise.resolve({ root_path: "C:/ziz-workspace", config_path: "C:/ziz-workspace/.zizai" });
          }
          if (type === "app.getStatus") {
            return Promise.resolve({ gui_mode: "webview", host: "qt", file_icon_map: {} });
          }
          if (type === "workspace.readText") {
            if (payload.scope === "runtime" && payload.rel_path === "recent_roots.json") {
              return Promise.resolve({ content: "" });
            }
            const entry = files[payload.rel_path];
            if (!entry) return Promise.reject({ code: "E_NOT_FOUND", message: "not found" });
            return Promise.resolve({ content: entry.content, file_name: entry.file_name, mtime_ns: "1" });
          }
          if (type === "workspace.writeText") {
            return Promise.resolve({
              saved: true,
              mtime_ns: "2",
              size: String(payload.content || "").length,
              file_name: String(payload.rel_path || "").split("/").pop(),
            });
          }
          if (type === "workspace.list") {
            return Promise.resolve({ scope: payload.scope || "root", entries: [] });
          }
          return Promise.resolve({});
        },
      };
      const call = bridgeApi.call;
      window.__bridgeCalls = [];
      bridgeApi.call = (type, payload = {}) => {
        window.__bridgeCalls.push({ type, payload });
        return call(type, payload);
      };
      window.zizBridge = bridgeApi;
      window.zizPackages = window.zizPackages || {};
      window.zizPackages.core = window.zizPackages.core || {};
      window.zizPackages.core.bridge = bridgeApi;
      setTimeout(() => window.dispatchEvent(new CustomEvent("ziz:bridge-ready")), 0);
    })();
  `;
}

const WINDOW_COMMAND_IDS = ["diagnostics", "window-minimize", "window-maximize", "window-close"];

// Reads the real Adapter -> Bridge boundary (the only stubbed seam, matching the
// existing external-URL test) to tell an actual window-drag request apart from a
// tab interaction. Everything else in these tests is real DOM/mouse behaviour.
async function takeWindowControlActions(page) {
  return page.evaluate(() => {
    const calls = window.__bridgeCalls || [];
    window.__bridgeCalls = [];
    return calls.filter((entry) => entry.type === "app.windowControl").map((entry) => entry.payload.action);
  });
}

async function gotoDataflowWithWorkspace(page, files) {
  await page.route("**/gui/js/bridge.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: workspaceBridgeStub(files),
    });
  });
  await page.goto("/gui/dataflow.html");
  await expect(page.locator(".zui-shell")).toBeVisible();
  await page.waitForFunction(() => typeof window.zizWorkspace?.openTextFile === "function");
}

async function openWorkspaceTextTab(page, relPath) {
  await page.evaluate((path) => window.zizWorkspace.openTextFile("root", path), relPath);
}

function workspaceTabId(relPath) {
  return `tab-text:root:${relPath.toLowerCase()}`;
}

async function visibleTabTitles(page) {
  return page.locator(".zui-shell__tabs .zui-shell__tab .zui-shell__tab-title").allTextContents();
}

async function dragReorderTab(page, sourceTabId, targetTabId, placement) {
  await page.evaluate(({ sourceTabId, targetTabId, placement }) => {
    const host = document.querySelector(".zui-shell__tabs");
    const source = host.querySelector(`.zui-shell__tab[data-tab-id="${sourceTabId}"]`);
    const target = host.querySelector(`.zui-shell__tab[data-tab-id="${targetTabId}"]`);
    const rect = target.getBoundingClientRect();
    const clientX = placement === "before" ? rect.left + 2 : rect.right - 2;
    const clientY = rect.top + rect.height / 2;
    source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, clientX, clientY }));
    target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, clientX, clientY }));
    target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, clientX, clientY }));
    source.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true }));
  }, { sourceTabId, targetTabId, placement });
}


test("dataflow tab drag reorders the shared AppShell tab order via tab:reorder-request", async ({ page }) => {
  // Catches: workspace.manager.js never sets `reorderable: true` on tab descriptors and
  // never listens for `tab:reorder-request`, so AppShell drag reorder requests are dropped
  // and the real workspace tab order never changes.
  await gotoDataflowWithWorkspace(page, {
    "a.md": { content: "A", file_name: "a.md" },
    "b.md": { content: "B", file_name: "b.md" },
    "c.md": { content: "C", file_name: "c.md" },
  });

  await openWorkspaceTextTab(page, "a.md");
  await openWorkspaceTextTab(page, "b.md");
  await openWorkspaceTextTab(page, "c.md");
  expect(await visibleTabTitles(page)).toEqual(["a", "b", "c"]);

  await dragReorderTab(page, workspaceTabId("c.md"), workspaceTabId("a.md"), "before");
  expect(await visibleTabTitles(page)).toEqual(["c", "a", "b"]);

  await dragReorderTab(page, workspaceTabId("c.md"), workspaceTabId("b.md"), "after");
  expect(await visibleTabTitles(page)).toEqual(["a", "b", "c"]);
});


test("dataflow right-click Close on a clean tab removes the real workspace tab", async ({ page }) => {
  // Catches: workspace.manager.js never passes `contextActions` to AppShell, so no
  // right-click menu renders and `tab:context-action` has no adapter wired to
  // requestTabClose().
  await gotoDataflowWithWorkspace(page, {
    "a.md": { content: "A", file_name: "a.md" },
    "b.md": { content: "B", file_name: "b.md" },
  });
  await openWorkspaceTextTab(page, "a.md");
  await openWorkspaceTextTab(page, "b.md");

  const targetTabId = workspaceTabId("a.md");
  await page.locator(`.zui-shell__tab[data-tab-id="${targetTabId}"]`).click({ button: "right" });

  const closeMenuItem = page.locator('.zui-shell__tab-context-menu-item[data-action-id="close"]');
  await expect(closeMenuItem).toBeVisible();
  await closeMenuItem.click();

  await expect(page.locator(`.zui-shell__tab[data-tab-id="${targetTabId}"]`)).toHaveCount(0);
  expect(await visibleTabTitles(page)).toEqual(["b"]);
});


test("dataflow right-click Close on a dirty tab shows the unsaved confirmation and keeps the tab on cancel", async ({ page }) => {
  // Catches: the same missing `contextActions` wiring also blocks requestTabClose()'s
  // dirty/close confirmation path, since `tab:context-action` never reaches it.
  await gotoDataflowWithWorkspace(page, {
    "d.md": { content: "D", file_name: "d.md" },
  });
  await openWorkspaceTextTab(page, "d.md");

  const targetTabId = workspaceTabId("d.md");
  await page.locator(`.workspace-text-view[data-tab-id="${targetTabId}"] [data-markdown-mode="edit"]`).click();
  const editor = page.locator(`.workspace-text-view[data-tab-id="${targetTabId}"] textarea`);
  await editor.fill("dirty change");
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${targetTabId}"] .zui-shell__tab-dirty`)).toBeVisible();

  await page.locator(`.zui-shell__tab[data-tab-id="${targetTabId}"]`).click({ button: "right" });
  const closeMenuItem = page.locator('.zui-shell__tab-context-menu-item[data-action-id="close"]');
  await expect(closeMenuItem).toBeVisible();
  await closeMenuItem.click();

  await expect(page.locator("#appDialog.is-open")).toBeVisible();
  await expect(page.locator("#appDialogTitle")).toHaveText("未保存の変更");
  await page.locator("#appDialogExtra").click();

  await expect(page.locator("#appDialog")).not.toHaveClass(/is-open/);
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${targetTabId}"]`)).toHaveCount(1);
});


test("dataflow pagehide synchronously destroys the mounted AppShell", async ({ page }) => {
  // Catches: app-shell.js never listens for `pagehide`, so AppShell.destroy() is never
  // invoked on page teardown and `.zui-shell` (with its listeners) stays mounted. Also
  // catches the Catalog Adapter (apps/gui/js/catalog.adapter.js) not tearing itself down
  // alongside AppShell, or doing so more than once, on the same `pagehide`.
  await gotoDataflowWithWorkspace(page, {});

  await page.evaluate(() => {
    window.__catalogDestroyCalls = 0;
    const originalDestroy = window.zizCatalogAdapter.destroy;
    window.zizCatalogAdapter.destroy = (...args) => {
      window.__catalogDestroyCalls += 1;
      return originalDestroy.apply(window.zizCatalogAdapter, args);
    };
  });

  const removedImmediately = await page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    return !document.querySelector(".zui-shell");
  });

  expect(removedImmediately).toBe(true);
  expect(await page.evaluate(() => window.__catalogDestroyCalls)).toBe(1);
});


test("dataflow tabs and window controls share one 40px AppShell tabbar row", async ({ page }) => {
  // Catches: app-shell.js registers the window/diagnostics commands with region "topbar",
  // so AppShell keeps `has-topbar` and spends a second 40px grid row above the tab strip.
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoDataflowWithWorkspace(page, {
    "a.md": { content: "A", file_name: "a.md" },
    "b.md": { content: "B", file_name: "b.md" },
  });
  await openWorkspaceTextTab(page, "a.md");
  await openWorkspaceTextTab(page, "b.md");

  await expect(page.locator(".zui-shell__topbar")).toBeHidden();

  const tabbarCommands = page.locator(".zui-shell__tabbar > .zui-shell__commands");
  for (const commandId of WINDOW_COMMAND_IDS) {
    await expect(tabbarCommands.locator(`[data-command-id="${commandId}"]`)).toHaveCount(1);
  }

  const geometry = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
    const shell = rect(".zui-shell");
    const tabbar = rect(".zui-shell__tabbar");
    const tab = rect(".zui-shell__tabs .zui-shell__tab");
    const close = rect('[data-command-id="window-close"]');
    return {
      chromeAboveTabbar: Math.round(tabbar.top - shell.top),
      tabbarHeight: Math.round(tabbar.height),
      controlWithinTabbar: close.top >= tabbar.top - 1 && close.bottom <= tabbar.bottom + 1,
      controlSharesRowWithTab: close.top < tab.bottom && tab.top < close.bottom,
    };
  });

  expect(geometry.chromeAboveTabbar).toBe(0);
  expect(geometry.tabbarHeight).toBeLessThanOrEqual(41);
  expect(geometry.controlWithinTabbar).toBe(true);
  expect(geometry.controlSharesRowWithTab).toBe(true);
});


test("window drag is requested from blank tabbar space only, and tabs stay interactive", async ({ page }) => {
  // Catches: app-shell.js binds the drag surface to `.zui-shell__topbar`, so once the
  // controls move into the single tab row no blank space requests a window drag.
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoDataflowWithWorkspace(page, {
    "a.md": { content: "A", file_name: "a.md" },
    "b.md": { content: "B", file_name: "b.md" },
  });
  await openWorkspaceTextTab(page, "a.md");
  await openWorkspaceTextTab(page, "b.md");

  const firstTabId = workspaceTabId("a.md");
  const secondTabId = workspaceTabId("b.md");
  await takeWindowControlActions(page);

  // A real click on a tab activates it and must not request a window drag.
  await page.locator(`.zui-shell__tab[data-tab-id="${firstTabId}"] .zui-shell__tab-activate`).click();
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${firstTabId}"]`)).toHaveClass(/is-active/);
  expect(await takeWindowControlActions(page)).toEqual([]);

  // A real press on blank tab-strip space requests exactly one window drag.
  const blank = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
    const tabbar = rect(".zui-shell__tabbar");
    const tabs = rect(".zui-shell__tabs");
    const commands = rect(".zui-shell__tabbar > .zui-shell__commands");
    return { x: (tabs.right + commands.left) / 2, y: tabbar.top + tabbar.height / 2 };
  });
  await page.mouse.move(blank.x, blank.y);
  await page.mouse.down();
  await page.mouse.up();
  expect(await takeWindowControlActions(page)).toEqual(["drag"]);

  // Controls stay interactive and the other tab is still activatable afterwards.
  await page.locator('[data-command-id="window-minimize"]').click();
  expect(await takeWindowControlActions(page)).toEqual(["minimize"]);

  await page.locator(`.zui-shell__tab[data-tab-id="${secondTabId}"] .zui-shell__tab-activate`).click();
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${secondTabId}"]`)).toHaveClass(/is-active/);
  expect(await takeWindowControlActions(page)).toEqual([]);
});
