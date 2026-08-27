const { test, expect } = require("@playwright/test");


const MARKDOWN_EDITOR_CSS = ["/gui/vendor/zizai-editor-markdown/src/markdown_editor.css"];
const MARKDOWN_EDITOR_SCRIPTS = ["/gui/vendor/zizai-editor-markdown/src/markdown_editor.js"];


function assertOrdered(list, expectedSubsequence) {
  const indexes = expectedSubsequence.map((item) => list.indexOf(item));
  expect(indexes.every((index) => index >= 0)).toBe(true);
  for (let i = 1; i < indexes.length; i += 1) {
    expect(indexes[i]).toBeGreaterThan(indexes[i - 1]);
  }
}

// Stubs only the external Bridge boundary (installed before bridge.js loads, matching
// ui-shell.spec.js) so the real workspace.manager Adapter runs unmodified.
// isAllowedExternalUrl/openExternal mirror bridge.js's real contract (scheme+hostname
// allowlist, then a tracked app.openExternal call) so external-link assertions target
// the same Bridge boundary the production Adapter is expected to call.
function workspaceBridgeStub(files = {}) {
  const filesJson = JSON.stringify(files);
  return `
    (() => {
      const files = ${filesJson};
      const EXTERNAL_URL_ALLOWED_SCHEMES = new Set(["http:", "https:"]);
      function isAllowedExternalUrl(value) {
        const text = String(value || "").trim();
        if (!text) return false;
        try {
          const parsed = new URL(text);
          return EXTERNAL_URL_ALLOWED_SCHEMES.has(String(parsed.protocol || "").toLowerCase()) && !!parsed.hostname;
        } catch (_) {
          return false;
        }
      }
      const bridgeApi = {
        available() { return true; },
        status() { return { state: "ready", ready: true }; },
        unavailableMessage() { return ""; },
        isAllowedExternalUrl,
        openExternal(url, options = {}) {
          const href = String(url || "").trim();
          if (!isAllowedExternalUrl(href)) {
            return Promise.reject({ code: "E_ACCESS_DENIED", message: "http または https のリンクだけを開けます。" });
          }
          return bridgeApi.call("app.openExternal", { url: href, prefer: String(options.prefer || "chrome") });
        },
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

function workspaceTabId(relPath) {
  return `tab-text:root:${relPath.toLowerCase()}`;
}

async function openWorkspaceMarkdownTab(page, relPath) {
  await page.evaluate((path) => window.zizWorkspace.openTextFile("root", path), relPath);
  await page.waitForSelector(`.workspace-text-view[data-tab-id="${workspaceTabId(relPath)}"] .mce-root`);
}

async function closeWorkspaceTab(page, relPath, { discardDirty = false } = {}) {
  const tabId = workspaceTabId(relPath);
  await page.locator(`.zui-shell__tab[data-tab-id="${tabId}"]`).click({ button: "right" });
  const closeMenuItem = page.locator('.zui-shell__tab-context-menu-item[data-action-id="close"]');
  await expect(closeMenuItem).toBeVisible();
  await closeMenuItem.click();
  if (discardDirty) {
    // Workspace routes the unsaved-changes prompt through the Application #appDialog
    // choice dialog, where "保存しない" (#appDialogCancel) resolves to "discard".
    await expect(page.locator("#appDialog.is-open")).toBeVisible();
    await page.locator("#appDialogCancel").click();
  }
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${tabId}"]`)).toHaveCount(0);
}

function markdownEditorLocator(page, relPath) {
  return page.locator(`.workspace-text-view[data-tab-id="${workspaceTabId(relPath)}"] .mce-root`);
}

function markdownInputLocator(page, relPath) {
  return markdownEditorLocator(page, relPath).locator(".mce-input");
}

function markdownModeButtonLocator(page, relPath, mode) {
  return page.locator(
    `.workspace-text-view[data-tab-id="${workspaceTabId(relPath)}"] [data-markdown-mode="${mode}"]`
  );
}


test("dataflow loads the vendored Markdown Editor assets in order and performs no runtime fetch", async ({ page }) => {
  // Catches: dataflow.html never loading the pinned vendor Markdown Editor assets, so
  // workspace .md tabs would have no MarkdownEditor constructor available.
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
  assertOrdered(loadOrder.styles, MARKDOWN_EDITOR_CSS);
  assertOrdered(loadOrder.scripts, MARKDOWN_EDITOR_SCRIPTS);

  const hasCtor = await page.evaluate(() => typeof window.MarkdownEditor === "function");
  expect(hasCtor).toBe(true);
  expect(externalRequests).toEqual([]);
});


test("workspace .md tabs start in 表示 mode and render the first H1 in the viewer with the article-title background", async ({ page }) => {
  // Catches: workspace .md tabs still rendering the plain textarea fallback instead of
  // MarkdownEditor, or showing the library's own save/edit action button.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "# タイトル\n\n本文です。", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  const root = markdownEditorLocator(page, "notes.md");
  await expect(root).toHaveClass(/mce-mode-view/);
  await expect(root.locator("[data-mce-action]")).toHaveCount(0);
  const title = root.locator(".mce-viewer > h1.mce-article-title");
  await expect(title).toBeVisible();
  await expect(title).toHaveText("タイトル");
  await expect(title).toHaveCSS("background-color", "rgb(242, 243, 244)");
  await expect(markdownInputLocator(page, "notes.md")).toHaveValue("# タイトル\n\n本文です。");
});


test("表示 mode shows the library page tree for H2-H6 headings and its links scroll to the heading", async ({ page }) => {
  // Catches: the Application adapter passing pageTree:false, which removes the
  // library-owned heading navigation even though visual view is enabled.
  const longBody = Array.from({ length: 120 }, (_, index) => `本文 ${index + 1}`).join("\n");
  await gotoDataflowWithWorkspace(page, {
    "guide.md": {
      content: `# ガイド\n\n## 準備\n\n${longBody}\n\n### 詳細\n\n完了`,
      file_name: "guide.md",
    },
  });

  await openWorkspaceMarkdownTab(page, "guide.md");
  const root = markdownEditorLocator(page, "guide.md");
  const tree = root.locator(".mce-page-tree");
  await expect(tree).toBeVisible();
  await expect(tree.locator(".mce-page-tree-link")).toHaveText(["1. 準備", "1.1. 詳細"]);
  await expect(tree.locator(".mce-page-tree-level-2")).toHaveCount(1);
  await expect(tree.locator(".mce-page-tree-level-3")).toHaveCount(1);

  const host = root;
  await expect.poll(() => host.evaluate((element) => element.scrollTop)).toBe(0);
  await tree.locator(".mce-page-tree-link", { hasText: "詳細" }).click();
  await expect.poll(() => host.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});


test("typing markdown source updates the library's own syntax highlight", async ({ page }) => {
  // Catches: bypassing MarkdownEditor's highlight pane and re-implementing Application
  // source highlighting for .md content.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  await markdownModeButtonLocator(page, "notes.md", "edit").click();
  await markdownInputLocator(page, "notes.md").fill("## 見出し\n\n本文");

  const highlightHtml = await markdownEditorLocator(page, "notes.md").locator(".mce-highlight").innerHTML();
  expect(highlightHtml).toContain('class="mce-md-heading"');
});


test("typing '/' shows the library's slash-command suggestions and inserting one edits the source", async ({ page }) => {
  // Catches: the Application not wiring MarkdownEditor's `/`-command suggestion popup,
  // or the popup failing to update the tracked Markdown source on selection.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  await markdownModeButtonLocator(page, "notes.md", "edit").click();
  const input = markdownInputLocator(page, "notes.md");
  await input.click();
  await input.pressSequentially("/heading1");

  const suggestions = markdownEditorLocator(page, "notes.md").locator(".mce-suggestion");
  await expect(suggestions).toHaveCount(1);
  await expect(suggestions.first()).toContainText("見出し1");

  await suggestions.first().click();
  await expect(input).toHaveValue("# ");
});


test("no document-suggestion affordance appears for '[[' since Application passes no documents", async ({ page }) => {
  // Catches: introducing document suggestion/link navigation, which is out of the
  // approved source-only scope for this Work Package.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  await markdownModeButtonLocator(page, "notes.md", "edit").click();
  const input = markdownInputLocator(page, "notes.md");
  await input.click();
  await input.pressSequentially("[[gui");
  await page.waitForTimeout(150);

  await expect(markdownEditorLocator(page, "notes.md").locator(".mce-suggestions")).toHaveClass(/mce-hidden/);
});


test("editing a markdown tab marks it dirty, saves through the existing icon, and never auto-switches to view mode", async ({ page }) => {
  // Catches: relying on MarkdownEditor's own save()/view-mode switch instead of the
  // Application save icon and existing dirty/save Adapter wiring.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "before", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  const tabId = workspaceTabId("notes.md");
  await page.locator(`.workspace-text-view[data-tab-id="${tabId}"] [data-markdown-mode="edit"]`).click();
  await markdownInputLocator(page, "notes.md").fill("after edit");
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${tabId}"] .zui-shell__tab-dirty`)).toBeVisible();

  await page.locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-save-btn`).click();

  await expect(page.locator(`.zui-shell__tab[data-tab-id="${tabId}"] .zui-shell__tab-dirty`)).toHaveCount(0);
  const savePayload = await page.evaluate(() => {
    const calls = window.__bridgeCalls || [];
    const write = calls.filter(
      (entry) => entry.type === "workspace.writeText" && String(entry.payload.rel_path || "").endsWith("notes.md")
    );
    return write.length ? write[write.length - 1].payload : null;
  });
  expect(savePayload).not.toBeNull();
  expect(savePayload.content).toBe("after edit");

  const root = markdownEditorLocator(page, "notes.md");
  await expect(root).toHaveClass(/mce-mode-edit/);
  await expect(root).not.toHaveClass(/mce-mode-view/);
  await expect(root.locator(".mce-viewer")).toHaveClass(/mce-hidden/);
});


test("closing and reopening a markdown tab destroys and remounts MarkdownEditor without leaking listeners", async ({ page }) => {
  // Catches: MarkdownEditor instances not destroyed on tab close, leaving stale host
  // listeners or duplicate suggestion popups across mount/destroy/remount cycles.
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "first", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  await markdownModeButtonLocator(page, "notes.md", "edit").click();
  await markdownInputLocator(page, "notes.md").fill("dirty before close");
  await closeWorkspaceTab(page, "notes.md", { discardDirty: true });

  await expect(page.locator(".mce-root")).toHaveCount(0);
  await expect(page.locator(".mce-suggestions")).toHaveCount(0);

  await openWorkspaceMarkdownTab(page, "notes.md");
  await expect(markdownInputLocator(page, "notes.md")).toHaveValue("first");
  await expect(page.locator(".mce-root")).toHaveCount(1);

  await markdownModeButtonLocator(page, "notes.md", "edit").click();
  await markdownInputLocator(page, "notes.md").fill("second mount edit");
  const tabId = workspaceTabId("notes.md");
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${tabId}"] .zui-shell__tab-dirty`)).toBeVisible();
  await expect(markdownInputLocator(page, "notes.md")).toHaveValue("second mount edit");

  await page.waitForTimeout(200);
  expect(pageErrors).toEqual([]);
});


test("workspace .md tab hides the library toolbar and keeps the Application save button visible and hit-testable", async ({ page }) => {
  // Catches: removing the Application-scoped CSS rule that hides the unused library
  // toolbar under .workspace-markdown-editor-host, or the Application save button
  // rendering outside/behind the visible header area of the editor frame.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "# タイトル", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  const tabId = workspaceTabId("notes.md");

  const toolbar = markdownEditorLocator(page, "notes.md").locator(".mce-toolbar");
  await expect(toolbar).toHaveCSS("display", "none");

  const saveButton = page.locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-save-btn`);
  await expect(saveButton).toBeVisible();

  const frameBox = await page
    .locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-editor-frame`)
    .boundingBox();
  const buttonBox = await saveButton.boundingBox();
  const viewport = page.viewportSize();

  expect(frameBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox.x).toBeGreaterThanOrEqual(frameBox.x);
  expect(buttonBox.y).toBeGreaterThanOrEqual(frameBox.y);
  expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width);
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(frameBox.y + frameBox.height);
  expect(buttonBox.x).toBeGreaterThanOrEqual(0);
  expect(buttonBox.y).toBeGreaterThanOrEqual(0);
  expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(viewport.width);
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(viewport.height);

  const hitTargetIsSaveButton = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return !!(element && element.closest(".workspace-text-save-btn"));
  }, { x: buttonBox.x + buttonBox.width / 2, y: buttonBox.y + buttonBox.height / 2 });

  expect(hitTargetIsSaveButton).toBe(true);
});


test("workspace .md header starts in 表示 and switching 編集→表示 previews unsaved source without saving", async ({ page }) => {
  // Catches: workspace.manager.js never rendering an Application-owned data-markdown-mode
  // 編集/表示 header for .md tabs, so no real MarkdownEditor.setMode() wiring exists and a
  // tab always renders with only the library's own (removed) toolbar.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "# タイトル\n\n本文です。", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  const tabId = workspaceTabId("notes.md");
  const frame = page.locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-editor-frame`);
  const editButton = frame.locator('[data-markdown-mode="edit"]');
  const viewButton = frame.locator('[data-markdown-mode="view"]');
  const saveButton = frame.locator(".workspace-text-save-btn");

  await expect(editButton).toBeVisible();
  await expect(viewButton).toBeVisible();
  await expect(saveButton).toBeVisible();
  await expect(editButton).toHaveAttribute("aria-pressed", "false");
  await expect(viewButton).toHaveAttribute("aria-pressed", "true");

  await editButton.click();
  await markdownInputLocator(page, "notes.md").fill("# タイトル\n\n未保存の変更");
  await viewButton.click();

  const root = markdownEditorLocator(page, "notes.md");
  await expect(root).toHaveClass(/mce-mode-view/);
  await expect(root).not.toHaveClass(/mce-mode-edit/);
  await expect(viewButton).toHaveAttribute("aria-pressed", "true");
  await expect(editButton).toHaveAttribute("aria-pressed", "false");
  await expect(root.locator(".mce-viewer")).toContainText("未保存の変更");

  const writeCallsAfterViewSwitch = await page.evaluate(() =>
    (window.__bridgeCalls || []).filter((entry) => (
      entry.type === "workspace.writeText" && entry.payload?.rel_path === "notes.md"
    ))
  );
  expect(writeCallsAfterViewSwitch).toEqual([]);

  await editButton.click();
  await expect(root).toHaveClass(/mce-mode-edit/);
  await expect(root).not.toHaveClass(/mce-mode-view/);
  await expect(editButton).toHaveAttribute("aria-pressed", "true");
  await expect(viewButton).toHaveAttribute("aria-pressed", "false");
  await expect(markdownInputLocator(page, "notes.md")).toHaveValue("# タイトル\n\n未保存の変更");
});


test("closing and discarding a markdown tab, then reopening it, starts in 表示 mode again", async ({ page }) => {
  // Catches: mode state leaking across close/reopen (for example surviving on a reused
  // tab id) instead of the mode being Tab-session-only state that defaults back to 表示
  // every time the file is reopened.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "first", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  const tabId = workspaceTabId("notes.md");
  const frame = page.locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-editor-frame`);

  await frame.locator('[data-markdown-mode="edit"]').click();
  await markdownInputLocator(page, "notes.md").fill("dirty before close");
  await frame.locator('[data-markdown-mode="view"]').click();
  await expect(markdownEditorLocator(page, "notes.md")).toHaveClass(/mce-mode-view/);

  await closeWorkspaceTab(page, "notes.md", { discardDirty: true });
  await expect(page.locator(".mce-root")).toHaveCount(0);

  await openWorkspaceMarkdownTab(page, "notes.md");
  const reopenedFrame = page.locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-editor-frame`);
  await expect(markdownEditorLocator(page, "notes.md")).toHaveClass(/mce-mode-view/);
  await expect(reopenedFrame.locator('[data-markdown-mode="edit"]')).toHaveAttribute("aria-pressed", "false");
  await expect(reopenedFrame.locator('[data-markdown-mode="view"]')).toHaveAttribute("aria-pressed", "true");
});


test("表示 mode intercepts an http/https Markdown link and routes it through the real Bridge external boundary instead of navigating in the WebView", async ({ page }) => {
  // Catches: an http/https link rendered by the library viewer being left to the
  // WebView's default target="_blank" navigation instead of the Application Adapter
  // intercepting the click and calling the real bridge.openExternal() -> app.openExternal
  // Bridge boundary with prefer "chrome".
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "[external](https://example.com/allowed)", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  const tabId = workspaceTabId("notes.md");
  const frame = page.locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-editor-frame`);
  await frame.locator('[data-markdown-mode="view"]').click();

  const root = markdownEditorLocator(page, "notes.md");
  const link = root.locator(".mce-viewer a", { hasText: "external" });
  await expect(link).toBeVisible();

  const originalLocation = await page.evaluate(() => window.location.pathname + window.location.search);
  const popupPromise = page.waitForEvent("popup", { timeout: 800 }).catch(() => null);
  await link.click();
  const popup = await popupPromise;

  expect(popup).toBeNull();
  expect(await page.evaluate(() => window.location.pathname + window.location.search)).toBe(originalLocation);

  const openExternalCalls = await page.evaluate(() =>
    (window.__bridgeCalls || []).filter((entry) => entry.type === "app.openExternal")
  );
  expect(openExternalCalls).toEqual([
    { type: "app.openExternal", payload: { url: "https://example.com/allowed", prefer: "chrome" } },
  ]);
});


test("表示 mode never calls app.openExternal or navigates for a javascript: link or a [[document link]]", async ({ page }) => {
  // Catches: a future external-link handler naively calling app.openExternal for any
  // clicked anchor instead of restricting the real Bridge boundary to http/https link
  // targets, and confirms [[document link]] syntax stays inert per the approved
  // source-only scope (no document navigation introduced).
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "[bad](javascript:alert(1)) and [[some-document]]", file_name: "notes.md" },
  });

  await openWorkspaceMarkdownTab(page, "notes.md");
  const tabId = workspaceTabId("notes.md");
  const frame = page.locator(`.workspace-text-view[data-tab-id="${tabId}"] .workspace-text-editor-frame`);
  await frame.locator('[data-markdown-mode="view"]').click();

  const root = markdownEditorLocator(page, "notes.md");
  const jsLink = root.locator(".mce-viewer a", { hasText: "bad" });
  const docLink = root.locator(".mce-viewer .mce-document-link", { hasText: "some-document" });
  await expect(jsLink).toBeVisible();
  await expect(docLink).toBeVisible();

  const originalLocation = await page.evaluate(() => window.location.pathname + window.location.search);
  const popupPromise = page.waitForEvent("popup", { timeout: 500 }).catch(() => null);
  await jsLink.click();
  await docLink.click();
  const popup = await popupPromise;

  expect(popup).toBeNull();
  expect(await page.evaluate(() => window.location.pathname + window.location.search)).toBe(originalLocation);

  const openExternalCalls = await page.evaluate(() =>
    (window.__bridgeCalls || []).filter((entry) => entry.type === "app.openExternal")
  );
  expect(openExternalCalls).toEqual([]);
});
