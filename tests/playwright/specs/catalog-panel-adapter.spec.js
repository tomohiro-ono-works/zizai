const { test, expect } = require("@playwright/test");


// WP-10D: connects the vendored zizai-catalog-panel (CatalogPanel) to a new,
// independent AppShell left-sidebar "catalog" activity. The Catalog Adapter
// (apps/gui/js/catalog.adapter.js) projects the read-only apps/common/config/
// catalog_samples.json payload -- delivered only through the existing
// app.getStatus Bridge command -- into the active workspace tab's extension
// (.zizd/.sql/.md), and routes item activation to either the OS clipboard
// (.sql/.md) or the active flow's zizEmbeddedApi.setNodeTemplate() (.zizd).
//
// WP-10C already owns and tests setNodeTemplate()'s own validation/exclusivity
// against the internal node-template clipboard (tests/playwright/specs/
// workflow-designer-adapter.spec.js). The ".zizd" tests below therefore double
// only that one boundary -- window.zizWorkspace.getActiveFlowEmbeddedApi() --
// with a recording fake, so they verify the Adapter's own wiring (which
// template shape it builds and forwards, and that it never also touches the
// OS clipboard) without re-booting a full embedded flow iframe.

const CATALOG_SAMPLES = {
  version: 1,
  extensions: {
    zizd: {
      folders: [{ id: "workflow-nodes", label: "ワークフローノード", order: 1 }],
      items: [
        {
          id: "define-values",
          folderId: "workflow-nodes",
          label: "変数定義",
          kind: "node",
          connector: "WindowsConnector",
          action: "define_values",
          description: "変数を定義する",
          descriptionAuto: true,
          order: 1,
          form: { define_values: [] },
        },
      ],
    },
    sql: {
      folders: [{ id: "sql-samples", label: "SQLサンプル", order: 1 }],
      items: [
        {
          id: "select-one",
          folderId: "sql-samples",
          label: "SELECT 1",
          kind: "text",
          text: "SELECT 1 AS value;",
          order: 1,
        },
      ],
    },
    md: {
      folders: [{ id: "markdown-samples", label: "Markdownサンプル", order: 1 }],
      items: [
        {
          id: "document-outline",
          folderId: "markdown-samples",
          label: "文書のひな形",
          kind: "text",
          text: "# タイトル\n\n## セクション\n\n本文",
          order: 1,
        },
      ],
    },
  },
};

// Stubs only the external Bridge boundary (installed before bridge.js loads,
// matching markdown-editor.spec.js/ui-shell.spec.js) so the real Catalog
// Adapter, real workspace.manager.js Tab/left-sidebar wiring, and the real
// vendored CatalogPanel run unmodified.
function workspaceBridgeStub(files = {}, flows = {}) {
  const filesJson = JSON.stringify(files);
  const flowsJson = JSON.stringify(flows);
  const catalogSamplesJson = JSON.stringify(CATALOG_SAMPLES);
  return `
    (() => {
      const files = ${filesJson};
      const flows = ${flowsJson};
      const catalogSamples = ${catalogSamplesJson};
      let failNextAppGetStatus = false;
      window.__failNextAppGetStatus = () => { failNextAppGetStatus = true; };
      const bridgeApi = {
        available() { return true; },
        status() { return { state: "ready", ready: true }; },
        unavailableMessage() { return ""; },
        call(type, payload = {}) {
          if (type === "workspace.getRoot") {
            return Promise.resolve({ root_path: "C:/ziz-workspace", config_path: "C:/ziz-workspace/.zizai" });
          }
          if (type === "app.getStatus") {
            if (failNextAppGetStatus) {
              failNextAppGetStatus = false;
              return Promise.reject({ code: "E_RESPONSE_TIMEOUT", message: "ネイティブ応答がタイムアウトしました。" });
            }
            return Promise.resolve({ gui_mode: "webview", host: "qt", file_icon_map: {}, catalog_samples: catalogSamples });
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
            if ((payload.scope || "root") === "root" && !payload.rel_path) {
              const entries = [
                ...Object.keys(files).map((relPath) => ({ kind: "file", name: relPath, rel_path: relPath })),
                ...Object.keys(flows).map((relPath) => ({ kind: "file", name: relPath, rel_path: relPath })),
              ];
              return Promise.resolve({ scope: "root", entries });
            }
            return Promise.resolve({ scope: payload.scope || "root", entries: [] });
          }
          if (type === "workspace.stat") {
            return Promise.resolve({ mtime_ns: "1" });
          }
          if (type === "flow.load") {
            const flow = flows[payload.rel_path];
            if (!flow) return Promise.resolve({ selected: false });
            return Promise.resolve({
              selected: true,
              mode: "dataflow",
              file_name: String(payload.rel_path || "").split("/").pop(),
              flow,
              hidden_bindings: {},
            });
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

async function gotoDataflowWithWorkspace(page, files, flows = {}) {
  await page.addInitScript(() => {
    window.__unhandledRejections = [];
    window.addEventListener("unhandledrejection", (event) => {
      window.__unhandledRejections.push(String(event.reason));
    });
  });
  await page.route("**/gui/js/bridge.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: workspaceBridgeStub(files, flows),
    });
  });
  await page.goto("/gui/dataflow.html");
  await expect(page.locator(".zui-shell")).toBeVisible();
  await page.waitForFunction(() => typeof window.zizWorkspace?.openTextFile === "function");
}

function workspaceTabId(relPath) {
  return `tab-text:root:${relPath.toLowerCase()}`;
}

async function openWorkspaceTextTab(page, relPath) {
  await page.evaluate((path) => window.zizWorkspace.openTextFile("root", path), relPath);
  await page.waitForSelector(`.workspace-text-view[data-tab-id="${workspaceTabId(relPath)}"]`);
}

function activityButton(page, activityId) {
  return page.locator(`.zui-shell__activity[data-activity-id="${activityId}"]`);
}

function catalogRoot(page) {
  return page.locator(".workspace-global-left-area__body .cp-root");
}

async function openCatalogActivity(page) {
  await activityButton(page, "catalog").click();
  await expect(catalogRoot(page)).toBeVisible();
}


test("catalog activity opens independently of explorer, toggles its own active state, and shows the library empty state with no tab open", async ({ page }) => {
  // Catches: wiring "catalog" into the same leftMode slot without keeping it a
  // distinct id from "explorer", or reusing explorer's toggle/active bookkeeping.
  await gotoDataflowWithWorkspace(page, {});

  await activityButton(page, "explorer").click();
  await expect(page.locator(".workspace-explorer-panel")).toBeVisible();
  await expect(activityButton(page, "explorer")).toHaveClass(/is-active/);
  await expect(activityButton(page, "catalog")).not.toHaveClass(/is-active/);

  await openCatalogActivity(page);
  await expect(activityButton(page, "catalog")).toHaveClass(/is-active/);
  await expect(activityButton(page, "explorer")).not.toHaveClass(/is-active/);
  await expect(page.locator(".workspace-explorer-panel")).toHaveCount(0);
  await expect(catalogRoot(page).locator(".cp-empty")).toHaveText("カタログは空です");

  // Toggling the same activity again closes the sidebar (existing explorer/project-select contract).
  await activityButton(page, "catalog").click();
  await expect(page.locator(".workspace-global-left-area__body .cp-root")).toHaveCount(0);
  await expect(activityButton(page, "catalog")).not.toHaveClass(/is-active/);
});


test("switching the active tab updates the mounted catalog panel's data live, including unsupported extensions and the same instance being reused", async ({ page }) => {
  // Catches: rebuilding CatalogPanel per activation/tab (losing "same instance"), or
  // failing to refresh already-visible data when the active tab changes underneath it.
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: "", file_name: "query.sql" },
    "notes.md": { content: "", file_name: "notes.md" },
    "script.py": { content: "", file_name: "script.py" },
  });

  await openWorkspaceTextTab(page, "query.sql");
  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["SELECT 1"]);

  await openWorkspaceTextTab(page, "notes.md");
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["文書のひな形"]);

  await openWorkspaceTextTab(page, "script.py");
  await expect(catalogRoot(page).locator(".cp-empty")).toHaveText("カタログは空です");

  await page.evaluate(() => window.zizWorkspace.openTextFile("root", "query.sql"));
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["SELECT 1"]);

  const rootCount = await page.locator(".cp-root").count();
  expect(rootCount).toBe(1);
});


test("a transient initial app.getStatus failure shows an empty Catalog with no unhandled rejection, and a later activity reopen retries and shows the configured samples", async ({ page }) => {
  // Catches: permanently caching a failed/empty app.getStatus source lookup, which
  // would strand the Catalog empty forever instead of retrying on the next activity
  // reopen once the transient failure has cleared.
  await gotoDataflowWithWorkspace(page, { "query.sql": { content: "", file_name: "query.sql" } });
  await openWorkspaceTextTab(page, "query.sql");

  // Arm the failure only for the Catalog Adapter's own upcoming app.getStatus call,
  // after any unrelated startup lookups (file icon map, runtime context defaults)
  // have already settled.
  await page.evaluate(() => window.__failNextAppGetStatus());
  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-empty")).toHaveText("カタログは空です");
  expect(await page.evaluate(() => window.__unhandledRejections)).toEqual([]);

  // Close and reopen the activity to trigger a retry.
  await activityButton(page, "catalog").click();
  await expect(page.locator(".workspace-global-left-area__body .cp-root")).toHaveCount(0);
  await openCatalogActivity(page);

  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["SELECT 1"]);
  expect(await page.evaluate(() => window.__unhandledRejections)).toEqual([]);
});


test("catalog items are read-only: right-click on an item shows only copy, and folders/empty area show no create/edit/delete commands", async ({ page }) => {
  // Catches: forgetting to pass permissions:{all false}, which would surface the
  // library's own create/edit/delete UI even though WP-10 forbids write affordances.
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: "", file_name: "query.sql" },
  });
  await openWorkspaceTextTab(page, "query.sql");
  await openCatalogActivity(page);

  const item = catalogRoot(page).locator(".cp-item", { hasText: "SELECT 1" });
  await item.click({ button: "right" });
  const menu = page.locator(".cp-context-menu");
  await expect(menu).toBeVisible();
  await expect(menu.locator(".cp-context-command")).toHaveText(["コピー"]);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);

  const folderRow = catalogRoot(page).locator(".cp-folder-row");
  await folderRow.click({ button: "right" });
  await expect(page.locator(".cp-context-menu")).toHaveCount(0);

  // Below the (default-expanded) folder header and its one item, so this lands on
  // empty .cp-tree background rather than re-hitting .cp-folder-row/.cp-item.
  await catalogRoot(page).locator(".cp-tree").click({ button: "right", position: { x: 5, y: 300 } });
  await expect(page.locator(".cp-context-menu")).toHaveCount(0);
});


test("clicking a .sql catalog item has the Adapter itself write the registered text to the OS clipboard, excluding the library's own default clipboard path, with no write Bridge command invoked", async ({ page, context, baseURL }) => {
  // Catches: the Adapter's onActivateItem returning false for text (kind !== 'node')
  // items, which would let the library's own default navigator.clipboard.writeText()
  // own the copy (surfaced as a "catalog:copy" event) instead of the Adapter owning it
  // (surfaced as "catalog:activate").
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: "", file_name: "query.sql" },
  });
  await openWorkspaceTextTab(page, "query.sql");
  await openCatalogActivity(page);

  await page.evaluate(() => {
    // catalog:copy/catalog:activate are dispatched (bubbles:true) on the library's own
    // root element (the adapter's host div, an ancestor of ".cp-root"), so listen on
    // document to catch them regardless of that internal DOM structure.
    window.__catalogEvents = [];
    document.addEventListener("catalog:copy", () => window.__catalogEvents.push("catalog:copy"));
    document.addEventListener("catalog:activate", () => window.__catalogEvents.push("catalog:activate"));
  });
  const bridgeCallsBeforeClick = (await page.evaluate(() => window.__bridgeCalls)).length;

  await catalogRoot(page).locator(".cp-item", { hasText: "SELECT 1" }).click();
  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「SELECT 1」をコピーしました");
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe("SELECT 1 AS value;");

  const catalogEvents = await page.evaluate(() => window.__catalogEvents);
  expect(catalogEvents).toEqual(["catalog:activate"]);

  const bridgeCallsFromClick = (await page.evaluate(() => window.__bridgeCalls)).slice(bridgeCallsBeforeClick);
  expect(bridgeCallsFromClick.some((entry) => entry.type === "workspace.writeText")).toBe(false);
});


test("when the OS clipboard write fails for a .sql catalog item, the Adapter surfaces a user-visible Catalog toast and invokes no write Bridge command", async ({ page, context, baseURL }) => {
  // Catches: the Adapter swallowing a rejected navigator.clipboard.writeText() (or
  // leaving it to the library's own default path, whose failure is only reported via
  // the invisible "catalog:error" event) instead of surfacing failure through the
  // existing Catalog toast.
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: "", file_name: "query.sql" },
  });
  await openWorkspaceTextTab(page, "query.sql");
  await openCatalogActivity(page);

  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("clipboard write blocked"));
  });
  const bridgeCallsBeforeClick = (await page.evaluate(() => window.__bridgeCalls)).length;

  await catalogRoot(page).locator(".cp-item", { hasText: "SELECT 1" }).click();
  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「SELECT 1」のコピーに失敗しました");

  const bridgeCallsFromClick = (await page.evaluate(() => window.__bridgeCalls)).slice(bridgeCallsBeforeClick);
  expect(bridgeCallsFromClick.some((entry) => entry.type === "workspace.writeText")).toBe(false);
});


test("clicking a .zizd catalog item forwards only the allowed node-template fields to the active flow's setNodeTemplate and never touches the OS clipboard", async ({ page, context, baseURL }) => {
  // Catches: the Adapter leaking extra catalog_samples fields (id/folderId/order/icon)
  // into the node template, or falling back to OS clipboard copy for a node item.
  //
  // WP-10C's own tests already cover setNodeTemplate()'s internal-clipboard validation
  // and exclusivity; this test doubles only window.zizWorkspace's two Catalog-facing
  // accessors to verify what the Adapter itself builds and calls.
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await gotoDataflowWithWorkspace(page, {});
  await page.evaluate(() => navigator.clipboard.writeText("sentinel-untouched"));

  await page.evaluate(() => {
    window.zizWorkspace.getActiveCatalogExtension = () => "zizd";
    window.__setNodeTemplateCalls = [];
    window.zizWorkspace.getActiveFlowEmbeddedApi = () => ({
      setNodeTemplate: (template) => {
        window.__setNodeTemplateCalls.push(template);
        return true;
      },
    });
  });

  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["変数定義"]);
  await catalogRoot(page).locator(".cp-item", { hasText: "変数定義" }).click();

  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「変数定義」をワークフローへ貼り付け準備しました");
  const calls = await page.evaluate(() => window.__setNodeTemplateCalls);
  expect(calls).toEqual([
    {
      connector: "WindowsConnector",
      action: "define_values",
      description: "変数を定義する",
      descriptionAuto: true,
      form: { define_values: [] },
    },
  ]);
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe("sentinel-untouched");
});


test("zizCatalogAdapter.destroy() is idempotent, tears down the vendor CatalogPanel, is never invoked by normal activity switching, and permits a clean remount", async ({ page }) => {
  // Catches: destroy() missing entirely, not being safe to call twice, not calling the
  // vendor CatalogPanel's own destroy(), leaving stale panel/host/cache references that
  // break a later remount, or (wrongly) being wired into ordinary activity switching.
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: "", file_name: "query.sql" },
  });
  await openWorkspaceTextTab(page, "query.sql");
  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["SELECT 1"]);

  await page.evaluate(() => {
    window.__panelDestroyCalls = 0;
    const proto = window.CatalogPanel.prototype;
    const originalDestroy = proto.destroy;
    proto.destroy = function (...args) {
      window.__panelDestroyCalls += 1;
      return originalDestroy.apply(this, args);
    };
  });

  // Two catalog<->explorer round trips must keep reusing the one instance untouched.
  for (let i = 0; i < 2; i += 1) {
    await activityButton(page, "explorer").click();
    await openCatalogActivity(page);
  }
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["SELECT 1"]);
  expect(await page.locator(".cp-root").count()).toBe(1);
  expect(await page.evaluate(() => window.__panelDestroyCalls)).toBe(0);

  // Explicit destroy() (as pagehide will call) is idempotent: a second call is a no-op.
  await page.evaluate(() => {
    window.zizCatalogAdapter.destroy();
    window.zizCatalogAdapter.destroy();
  });
  expect(await page.evaluate(() => window.__panelDestroyCalls)).toBe(1);
  await expect(page.locator(".cp-root")).toHaveCount(0);

  // A clean remount after destroy works normally, with exactly one panel instance.
  await activityButton(page, "explorer").click();
  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["SELECT 1"]);
  expect(await page.locator(".cp-root").count()).toBe(1);
});


test("dataflow loads the vendored CatalogPanel assets in order and performs no runtime fetch", async ({ page }) => {
  // Catches: dataflow.html never loading the pinned vendor CatalogPanel assets, so
  // the Catalog activity would have no CatalogPanel constructor available.
  const requestedPaths = [];
  const externalRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    requestedPaths.push(url.pathname);
    if (url.host !== "127.0.0.1:4173") externalRequests.push(request.url());
  });

  await page.goto("/gui/dataflow.html");

  const loadOrder = await page.evaluate(() => ({
    styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (link) => new URL(link.href).pathname
    ),
    scripts: Array.from(document.scripts)
      .map((script) => (script.src ? new URL(script.src).pathname : ""))
      .filter(Boolean),
  }));
  const scriptIndex = (path) => loadOrder.scripts.indexOf(path);
  expect(loadOrder.styles).toContain("/gui/vendor/zizai-catalog-panel/src/catalog-panel.css");
  expect(scriptIndex("/gui/vendor/zizai-catalog-panel/src/catalog-store.js")).toBeGreaterThanOrEqual(0);
  expect(scriptIndex("/gui/vendor/zizai-catalog-panel/src/catalog-panel.js"))
    .toBeGreaterThan(scriptIndex("/gui/vendor/zizai-catalog-panel/src/catalog-store.js"));
  expect(scriptIndex("/gui/js/catalog.adapter.js"))
    .toBeGreaterThan(scriptIndex("/gui/vendor/zizai-catalog-panel/src/catalog-panel.js"));

  const hasCtor = await page.evaluate(() => typeof window.CatalogPanel === "function");
  expect(hasCtor).toBe(true);
  expect(externalRequests).toEqual([]);
});


// WP-10D-R4: regression coverage for the real WorkspaceManager wiring behind the
// zizd tests above. A minimal flow document good enough for flow.load / applyLoadedFlowPayload,
// not asserted on for its own shape.
const REGRESSION_FLOW_DOC = {
  metadata: { mode: "dataflow", name: "flow" },
  variables: { start: [] },
  steps: [{
    step_id: "step1",
    connector: "windows_connector",
    action: "define_values",
    params: {},
    output_variable: "step1",
    ui_position: { x: 140, y: 40 },
  }],
  flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
  notes: [],
};

async function openRealZizdFlowTab(page) {
  await activityButton(page, "explorer").click();
  await expect(page.locator(".workspace-explorer-panel")).toBeVisible();
  await page.locator(".workspace-tree-file", { hasText: "flow.zizd" }).click();
  // Confirms the real openFlowFile()/createFlowView() path actually mounted a live
  // embedded flow iframe (not just a tab record), without depending on the full
  // flow-open/ack round trip that ensureFlowTabLoaded runs in the background.
  await page.waitForFunction(() => (
    typeof window.zizWorkspace.getActiveFlowEmbeddedApi()?.setNodeTemplate === "function"
  ));
}

// Bridge commands that mutate persisted workspace/root/flow state. Every other
// recorded call type (workspace.getRoot, workspace.readText, workspace.list,
// workspace.stat, app.getStatus, flow.load, ...) is a read/query command and is
// allowed during pure Catalog browsing, tab switching, and item activation.
const WRITE_BRIDGE_COMMAND_TYPES = new Set([
  "workspace.writeText",
  "workspace.mkdir",
  "workspace.delete",
  "workspace.setRoot",
  "flow.save",
]);

function assertNoWriteBridgeCalls(calls) {
  const writeCalls = calls.filter((call) => WRITE_BRIDGE_COMMAND_TYPES.has(call.type));
  expect(writeCalls).toEqual([]);
}


test("opening a real .zizd flow tab through the real openFlowFile/activateTab WorkspaceManager path (no getActiveCatalogExtension double) refreshes the already-mounted CatalogPanel with the real .zizd items", async ({ page }) => {
  // Catches: the existing ".zizd" Adapter tests above proving only that the Adapter
  // itself forwards window.zizWorkspace.getActiveCatalogExtension()'s answer
  // correctly -- they double that accessor rather than exercising the real
  // Explorer-click -> openWorkspaceFile -> openFlowFile -> addTab -> activateTab ->
  // notifyCatalogContextChanged production chain that must produce "zizd" for a
  // real, freshly opened flow tab.
  await gotoDataflowWithWorkspace(page, {}, { "flow.zizd": REGRESSION_FLOW_DOC });

  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-empty")).toHaveText("カタログは空です");
  expect(await page.locator(".cp-root").count()).toBe(1);

  // Spy on the already-mounted vendor panel's own setData() so the assertion below
  // proves the refresh happens at the real tab-activation event itself, not merely
  // because reopening the activity below calls mount()'s own refresh() again.
  await page.evaluate(() => {
    window.__catalogSetDataCalls = [];
    const proto = window.CatalogPanel.prototype;
    const original = proto.setData;
    proto.setData = function (data, ...rest) {
      window.__catalogSetDataCalls.push(data);
      return original.call(this, data, ...rest);
    };
  });

  await openRealZizdFlowTab(page);

  await expect.poll(() => page.evaluate(() => window.__catalogSetDataCalls.length)).toBeGreaterThan(0);
  const latestSetData = await page.evaluate(() => (
    window.__catalogSetDataCalls[window.__catalogSetDataCalls.length - 1]
  ));
  expect(latestSetData.items.map((item) => item.label)).toEqual(["変数定義"]);

  // The library-visible outcome: reopening the same, still-mounted panel shows it.
  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["変数定義"]);
  expect(await page.locator(".cp-root").count()).toBe(1);
});


test("Catalog activity open, supported/unsupported tab switches, and SQL/Markdown/ZIZD item activation never invoke a write Bridge command", async ({ page, context, baseURL }) => {
  // Catches: any of these Catalog-adjacent paths (activity open, tab-driven catalog
  // refresh across a real .zizd flow tab and text tabs, or activating an item of any
  // of the three supported extensions) starting to persist state through the Bridge,
  // which the per-item tests elsewhere in this file only check in isolation.
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: "", file_name: "query.sql" },
    "notes.md": { content: "", file_name: "notes.md" },
    "script.py": { content: "", file_name: "script.py" },
  }, { "flow.zizd": REGRESSION_FLOW_DOC });

  const callsBefore = (await page.evaluate(() => window.__bridgeCalls)).length;

  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-empty")).toHaveText("カタログは空です");

  await openWorkspaceTextTab(page, "query.sql");
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["SELECT 1"]);
  await catalogRoot(page).locator(".cp-item", { hasText: "SELECT 1" }).click();
  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「SELECT 1」をコピーしました");

  await openWorkspaceTextTab(page, "notes.md");
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["文書のひな形"]);
  await catalogRoot(page).locator(".cp-item", { hasText: "文書のひな形" }).click();
  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「文書のひな形」をコピーしました");

  await openWorkspaceTextTab(page, "script.py");
  await expect(catalogRoot(page).locator(".cp-empty")).toHaveText("カタログは空です");

  await openRealZizdFlowTab(page);
  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["変数定義"]);
  await catalogRoot(page).locator(".cp-item", { hasText: "変数定義" }).click();
  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「変数定義」をワークフローへ貼り付け準備しました");

  const callsDuringScenario = (await page.evaluate(() => window.__bridgeCalls)).slice(callsBefore);
  assertNoWriteBridgeCalls(callsDuringScenario);
});


// WP-10D-R5: Windows manual smoke found that an ordinary Ctrl+V immediately after
// selecting a .zizd Catalog node item did nothing. The Catalog item is a <button> in the
// parent document; clicking it (and the library's own internal handling) leaves keyboard
// focus there, so the embedded flow iframe's own keydown-driven "selection.paste" command
// (bound to its .zwd shell element) never receives the Ctrl+V event at all.
test("selecting a .zizd catalog node item returns keyboard focus to the active flow canvas so an immediate Ctrl+V pastes exactly one node through the existing paste/history/anchor path", async ({ page }) => {
  await gotoDataflowWithWorkspace(page, {}, { "flow.zizd": REGRESSION_FLOW_DOC });
  await openRealZizdFlowTab(page);
  const flowNodes = page.frameLocator(".workspace-flow-frame").locator(".zwd-node--step[data-node-id]");
  await expect(flowNodes).toHaveCount(1);

  await openCatalogActivity(page);
  await expect(catalogRoot(page).locator(".cp-item-label")).toHaveText(["変数定義"]);
  await catalogRoot(page).locator(".cp-item", { hasText: "変数定義" }).click();
  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「変数定義」をワークフローへ貼り付け準備しました");

  await page.keyboard.press("Control+v");
  await expect(flowNodes).toHaveCount(2);
});


// WP-10D-R5: right-click "コピー" reaches the same library _copyItem()/onActivateItem
// path as a plain click (both dispatch the "copy-item" action), so this guards that path
// against regressing independently of the plain-click test above.
test("right-clicking a .sql catalog item and choosing コピー also has the Adapter write the registered text to the OS clipboard", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: "", file_name: "query.sql" },
  });
  await openWorkspaceTextTab(page, "query.sql");
  await openCatalogActivity(page);

  const item = catalogRoot(page).locator(".cp-item", { hasText: "SELECT 1" });
  await item.click({ button: "right" });
  const menu = page.locator(".cp-context-menu");
  await expect(menu).toBeVisible();
  await menu.locator(".cp-context-command", { hasText: "コピー" }).click();

  await expect(catalogRoot(page).locator(".cp-toast")).toHaveText("「SELECT 1」をコピーしました");
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe("SELECT 1 AS value;");
});
