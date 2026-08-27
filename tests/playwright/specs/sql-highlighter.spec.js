const { test, expect } = require("@playwright/test");


const SQL_HIGHLIGHTER_CSS = ["/gui/vendor/zizai-highlighter-sql/src/sql-highlighter.css"];
const SQL_HIGHLIGHTER_SCRIPTS = [
  "/gui/vendor/zizai-highlighter-sql/src/sql-highlighter.js",
  "/gui/vendor/zizai-highlighter-sql/src/dictionaries/bigquery.js",
  "/gui/vendor/zizai-highlighter-sql/src/dictionaries/duckdb.js",
];

// `#` is a BigQuery line comment and plain text in DuckDB, so the rendered token
// classes prove which vendored dialect the editor actually tokenized with.
const DIALECT_PROBE_SQL = "# note\nSELECT id FROM sales";


function assertOrdered(list, expectedSubsequence) {
  const indexes = expectedSubsequence.map((item) => list.indexOf(item));
  expect(indexes.every((index) => index >= 0)).toBe(true);
  for (let i = 1; i < indexes.length; i += 1) {
    expect(indexes[i]).toBeGreaterThan(indexes[i - 1]);
  }
}

// Stubs only the external Bridge boundary (installed before bridge.js loads, matching
// ui-shell.spec.js) so the real workspace.manager Adapter runs unmodified.
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

async function openWorkspaceTextTab(page, relPath) {
  await page.evaluate((path) => window.zizWorkspace.openTextFile("root", path), relPath);
  await page.waitForFunction((tabId) => {
    const view = document.querySelector(`.workspace-text-view[data-tab-id="${tabId}"]`);
    return !!view && !!view.querySelector(".code-editor.is-code-editor-ready");
  }, workspaceTabId(relPath));
}

async function readWorkspaceEditor(page, relPath) {
  return page.evaluate((tabId) => {
    const view = document.querySelector(`.workspace-text-view[data-tab-id="${tabId}"]`);
    if (!view) return null;
    const host = view.querySelector(".workspace-text-editor-host");
    const select = view.querySelector("select.workspace-text-dialect");
    return {
      dialect: host?.dataset.sqlDialect || "",
      selectCount: view.querySelectorAll("select.workspace-text-dialect").length,
      selectValue: select ? select.value : "",
      selectOptions: select ? Array.from(select.options).map((option) => option.value) : [],
      inFloatingActions: !!select && !!select.closest(".workspace-text-floating-actions"),
      html: view.querySelector(".code-editor-highlight")?.innerHTML || "",
      text: view.querySelector("textarea")?.value || "",
    };
  }, workspaceTabId(relPath));
}

async function openWorkspacePlainTextTab(page, relPath) {
  await page.evaluate((path) => window.zizWorkspace.openTextFile("root", path), relPath);
  await page.waitForSelector(`.workspace-text-view[data-tab-id="${workspaceTabId(relPath)}"]`);
}

async function readWorkspaceEditorChrome(page, relPath) {
  return page.evaluate((tabId) => {
    const view = document.querySelector(`.workspace-text-view[data-tab-id="${tabId}"]`);
    if (!view) return null;
    const floating = view.querySelector(".workspace-text-floating-actions");
    const saveButtons = Array.from(view.querySelectorAll(".workspace-text-save-btn"));
    const saveButton = saveButtons[0] || null;
    const saveIcon = saveButton?.querySelector("img");
    const contentEl = view.querySelector(".workspace-text-editor-host")
      || view.querySelector(".workspace-markdown-editor-host")
      || view.querySelector("textarea");
    const floatingRect = floating ? floating.getBoundingClientRect() : null;
    const contentRect = contentEl ? contentEl.getBoundingClientRect() : null;
    return {
      hasToolbar: !!view.querySelector(".workspace-text-toolbar"),
      hasPathRow: !!view.querySelector(".workspace-text-path"),
      hasReloadButton: !!view.querySelector('[data-action="reload"]'),
      firstChildIsFrame: view.firstElementChild?.classList.contains("workspace-text-editor-frame") || false,
      saveButtonCount: saveButtons.length,
      saveIconSrc: saveIcon ? new URL(saveIcon.src).pathname : "",
      saveTitle: saveButton?.getAttribute("title") || "",
      saveAriaLabel: saveButton?.getAttribute("aria-label") || "",
      saveButtonText: (saveButton?.textContent || "").trim(),
      floatingSelectCount: floating ? floating.querySelectorAll("select.workspace-text-dialect").length : 0,
      floatingRect: floatingRect
        ? { top: floatingRect.top, right: floatingRect.right, bottom: floatingRect.bottom, left: floatingRect.left }
        : null,
      contentTop: contentRect ? contentRect.top : null,
    };
  }, workspaceTabId(relPath));
}

async function selectWorkspaceDialect(page, relPath, dialect) {
  await page
    .locator(`.workspace-text-view[data-tab-id="${workspaceTabId(relPath)}"] select.workspace-text-dialect`)
    .selectOption(dialect);
}

async function closeWorkspaceTab(page, relPath) {
  const tabId = workspaceTabId(relPath);
  await page.locator(`.zui-shell__tab[data-tab-id="${tabId}"]`).click({ button: "right" });
  const closeMenuItem = page.locator('.zui-shell__tab-context-menu-item[data-action-id="close"]');
  await expect(closeMenuItem).toBeVisible();
  await closeMenuItem.click();
  await expect(page.locator(`.zui-shell__tab[data-tab-id="${tabId}"]`)).toHaveCount(0);
}

async function mountNodeDetailCodeEditor(page, { connector, language, value }) {
  return page.evaluate(async ({ connector, language, value }) => {
    const host = document.createElement("div");
    host.className = "right-sidebar-content";
    document.body.appendChild(host);

    const node = { id: "n1", connector, action: "execute_sql", form: { code: value } };
    const field = {
      key: "code",
      label: "SQL",
      kind: "textarea",
      codeLanguage: language,
      required: true,
      allowVars: true,
    };
    const row = window.zizPackages.ui.fields.renderField({
      node,
      field,
      upstreamSteps: [],
      availableVariableNames: [],
      hiddenBindings: {},
      state: {},
      config: window.CONFIG || {},
      onStateChanged: () => {},
    });
    host.appendChild(row);

    const editor = row.querySelector(".code-editor");
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && !editor.classList.contains("is-code-editor-ready")) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    const result = {
      ready: editor.classList.contains("is-code-editor-ready"),
      dialect: editor.dataset.sqlDialect || "",
      dialectSelectCount: row.querySelectorAll("select").length,
      html: row.querySelector(".code-editor-highlight")?.innerHTML || "",
    };
    host.remove();
    return result;
  }, { connector, language, value });
}


test("dataflow resolves both SQL dialects from the vendored registrations without any runtime fetch", async ({ page }) => {
  // Catches: dataflow.html never loads the pinned vendor SQL Highlighter assets, so the
  // editors would have to fall back to SqlHighlighter.loadDialect(url) at runtime.
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
  assertOrdered(loadOrder.styles, SQL_HIGHLIGHTER_CSS);
  assertOrdered(loadOrder.scripts, SQL_HIGHLIGHTER_SCRIPTS);

  const dialects = await page.evaluate(() => ({
    bigquery: window.SqlHighlighter?.getDialect("bigquery")?.id || "",
    duckdb: window.SqlHighlighter?.getDialect("duckdb")?.id || "",
  }));
  expect(dialects).toEqual({ bigquery: "bigquery", duckdb: "duckdb" });

  expect(requestedPaths.filter((path) => path.includes("/dictionaries/") && path.endsWith(".json"))).toEqual([]);
  expect(externalRequests).toEqual([]);
});


test("node detail SQL editors derive the dialect from the connector and expose no dialect picker", async ({ page }) => {
  // Catches: renderCodeTextarea still renders the duplicated Application SQL tokenizer,
  // so BigQuery and DuckDB nodes produce identical `cm-token` markup and no dialect at all.
  await page.goto("/gui/dataflow.html");

  const bigQuery = await mountNodeDetailCodeEditor(page, {
    connector: "BQConnector",
    language: "sql",
    value: DIALECT_PROBE_SQL,
  });
  expect(bigQuery.ready).toBe(true);
  expect(bigQuery.dialect).toBe("bigquery");
  expect(bigQuery.html).toContain('class="sqhl-keyword"');
  expect(bigQuery.html).toContain('class="sqhl-comment"># note');
  expect(bigQuery.html).not.toContain("cm-token");
  expect(bigQuery.dialectSelectCount).toBe(0);

  const duckDb = await mountNodeDetailCodeEditor(page, {
    connector: "DuckConnector",
    language: "sql",
    value: DIALECT_PROBE_SQL,
  });
  expect(duckDb.ready).toBe(true);
  expect(duckDb.dialect).toBe("duckdb");
  expect(duckDb.html).toContain('class="sqhl-keyword"');
  expect(duckDb.html).not.toContain("sqhl-comment");
  expect(duckDb.html).not.toContain("cm-token");
  expect(duckDb.dialectSelectCount).toBe(0);
});


test("SQL editors keep the existing {{variable}} highlighting on top of the library tokens", async ({ page }) => {
  // Catches: delegating SQL to the library while dropping the Application template
  // decoration, or re-highlighting template text inside SQL strings and comments.
  await page.goto("/gui/dataflow.html");

  const rendered = await mountNodeDetailCodeEditor(page, {
    connector: "BQConnector",
    language: "sql",
    value: "SELECT {{step1.value}} FROM sales WHERE note = '{{literal}}' -- {{commented}}",
  });

  expect(rendered.ready).toBe(true);
  expect(rendered.html).toContain('class="cm-token cm-variable-template">{{step1.value}}</span>');
  expect(rendered.html).toContain('class="sqhl-keyword"');
  // Templates inside strings and comments stay part of their SQL token, as before.
  expect(rendered.html).toContain("<span class=\"sqhl-string\">'{{literal}}'</span>");
  expect(rendered.html).toContain('<span class="sqhl-comment">-- {{commented}}</span>');
  expect(rendered.html.match(/cm-variable-template/g)).toHaveLength(1);
});


test("node detail Python editors keep the Application highlighter", async ({ page }) => {
  // Catches: removing the Application SQL tokenizer also breaking the retained
  // Python/JSON highlighting responsibility.
  await page.goto("/gui/dataflow.html");

  const python = await mountNodeDetailCodeEditor(page, {
    connector: "PythonConnector",
    language: "python",
    value: "def main():\n    return None  # done",
  });

  expect(python.ready).toBe(true);
  expect(python.dialect).toBe("");
  expect(python.html).toContain("cm-token cm-keyword");
  expect(python.html).toContain("cm-token cm-comment");
  expect(python.html).not.toContain("sqhl-");
});


test("workspace .sql tabs default to BigQuery and offer a DuckDB choice in the SQL toolbar", async ({ page }) => {
  // Catches: createTextView renders no dialect control for .sql tabs and mounts the
  // editor without any dialect, so BigQuery cannot be the observable default.
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: DIALECT_PROBE_SQL, file_name: "query.sql" },
    "script.py": { content: "def main():\n    return None", file_name: "script.py" },
  });

  await openWorkspaceTextTab(page, "query.sql");
  const sqlEditor = await readWorkspaceEditor(page, "query.sql");
  expect(sqlEditor.dialect).toBe("bigquery");
  expect(sqlEditor.selectCount).toBe(1);
  expect(sqlEditor.selectValue).toBe("bigquery");
  expect(sqlEditor.selectOptions).toEqual(["bigquery", "duckdb"]);
  expect(sqlEditor.inFloatingActions).toBe(true);
  expect(sqlEditor.html).toContain('class="sqhl-comment"># note');

  await openWorkspaceTextTab(page, "script.py");
  const pythonEditor = await readWorkspaceEditor(page, "script.py");
  expect(pythonEditor.selectCount).toBe(0);
  expect(pythonEditor.html).toContain("cm-token cm-keyword");
});


test("changing the workspace dialect updates only the current tab and never leaves the session", async ({ page }) => {
  // Catches: a dialect change that re-renders nothing, leaks into sibling tabs, or is
  // written into the SQL source / save payload.
  await gotoDataflowWithWorkspace(page, {
    "first.sql": { content: DIALECT_PROBE_SQL, file_name: "first.sql" },
    "second.sql": { content: DIALECT_PROBE_SQL, file_name: "second.sql" },
  });

  await openWorkspaceTextTab(page, "first.sql");
  await openWorkspaceTextTab(page, "second.sql");

  await page.locator(`.zui-shell__tab[data-tab-id="${workspaceTabId("first.sql")}"] .zui-shell__tab-activate`).click();
  await selectWorkspaceDialect(page, "first.sql", "duckdb");

  const switched = await readWorkspaceEditor(page, "first.sql");
  expect(switched.dialect).toBe("duckdb");
  expect(switched.selectValue).toBe("duckdb");
  expect(switched.html).not.toContain("sqhl-comment");
  expect(switched.text).toBe(DIALECT_PROBE_SQL);

  const untouched = await readWorkspaceEditor(page, "second.sql");
  expect(untouched.dialect).toBe("bigquery");
  expect(untouched.selectValue).toBe("bigquery");
  expect(untouched.html).toContain('class="sqhl-comment"># note');

  await page.evaluate(() => window.zizWorkspace.saveActiveTab());
  const savePayload = await page.evaluate(() => {
    const calls = window.__bridgeCalls || [];
    const write = calls.filter(
      (entry) => entry.type === "workspace.writeText" && String(entry.payload.rel_path || "").endsWith("first.sql")
    );
    return write.length ? write[write.length - 1].payload : null;
  });
  expect(savePayload).not.toBeNull();
  expect(savePayload.content).toBe(DIALECT_PROBE_SQL);
  expect(JSON.stringify(savePayload)).not.toContain("duckdb");
  expect(JSON.stringify(savePayload)).not.toContain("dialect");
});


test("reopening a workspace .sql file falls back to the BigQuery default", async ({ page }) => {
  // Catches: persisting the session-only dialect choice anywhere that survives a tab close.
  await gotoDataflowWithWorkspace(page, {
    "first.sql": { content: DIALECT_PROBE_SQL, file_name: "first.sql" },
  });

  await openWorkspaceTextTab(page, "first.sql");
  await selectWorkspaceDialect(page, "first.sql", "duckdb");
  expect((await readWorkspaceEditor(page, "first.sql")).dialect).toBe("duckdb");

  await closeWorkspaceTab(page, "first.sql");
  await openWorkspaceTextTab(page, "first.sql");

  const reopened = await readWorkspaceEditor(page, "first.sql");
  expect(reopened.dialect).toBe("bigquery");
  expect(reopened.selectValue).toBe("bigquery");
  expect(reopened.html).toContain('class="sqhl-comment"># note');
});


test("workspace text editors start directly below the tab row with no path row or reload action", async ({ page }) => {
  // Catches: createTextView still renders the path-display toolbar row and a reload
  // button above the editor instead of starting the editor at the top of the pane.
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: DIALECT_PROBE_SQL, file_name: "query.sql" },
  });

  await openWorkspaceTextTab(page, "query.sql");
  const chrome = await readWorkspaceEditorChrome(page, "query.sql");
  expect(chrome.hasToolbar).toBe(false);
  expect(chrome.hasPathRow).toBe(false);
  expect(chrome.hasReloadButton).toBe(false);
  expect(chrome.firstChildIsFrame).toBe(true);
});


test("save is an icon-only button reusing the existing save icon asset, and save behavior is unchanged", async ({ page }) => {
  // Catches: the save control losing its accessible label/icon, or the icon-only button
  // failing to write through Bridge and clear the tab's dirty state.
  await gotoDataflowWithWorkspace(page, {
    "notes.md": { content: "before", file_name: "notes.md" },
  });

  await openWorkspacePlainTextTab(page, "notes.md");
  const chrome = await readWorkspaceEditorChrome(page, "notes.md");
  expect(chrome.saveButtonCount).toBe(1);
  expect(chrome.saveIconSrc).toBe("/gui/icons/save.svg");
  expect(chrome.saveTitle).not.toBe("");
  expect(chrome.saveAriaLabel).not.toBe("");
  expect(chrome.saveButtonText).toBe("");

  const tabId = workspaceTabId("notes.md");
  await page.locator(`.workspace-text-view[data-tab-id="${tabId}"] [data-markdown-mode="edit"]`).click();
  const textarea = page.locator(`.workspace-text-view[data-tab-id="${tabId}"] textarea`);
  await textarea.fill("after edit");
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
});


test("SQL editors overlay a fixed top-right control group with the dialect select and save icon", async ({ page }) => {
  // Catches: the dialect select and save icon staying inline in a removed toolbar, or
  // the floating group scrolling away with the editor's textarea content.
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: DIALECT_PROBE_SQL, file_name: "query.sql" },
  });

  await openWorkspaceTextTab(page, "query.sql");
  const chrome = await readWorkspaceEditorChrome(page, "query.sql");
  expect(chrome.floatingSelectCount).toBe(1);
  expect(chrome.saveButtonCount).toBe(1);
  expect(chrome.floatingRect).not.toBeNull();

  const tabId = workspaceTabId("query.sql");
  const longSql = Array.from({ length: 200 }, (_, i) => `SELECT ${i} FROM sales`).join("\n");
  await page.locator(`.workspace-text-view[data-tab-id="${tabId}"] textarea`).fill(longSql);

  const before = (await readWorkspaceEditorChrome(page, "query.sql")).floatingRect;
  await page.evaluate((id) => {
    const textarea = document.querySelector(`.workspace-text-view[data-tab-id="${id}"] textarea`);
    textarea.scrollTop = 400;
    textarea.dispatchEvent(new Event("scroll", { bubbles: false }));
  }, tabId);
  const after = (await readWorkspaceEditorChrome(page, "query.sql")).floatingRect;
  expect(after).toEqual(before);
});


test("non-SQL text editors show only the save icon in the same floating position without a dialect select", async ({ page }) => {
  // Catches: the floating group always rendering a dialect select regardless of file
  // type, instead of restricting it to .sql tabs.
  await gotoDataflowWithWorkspace(page, {
    "script.py": { content: "def main():\n    return None", file_name: "script.py" },
    "notes.md": { content: "hello", file_name: "notes.md" },
  });

  await openWorkspaceTextTab(page, "script.py");
  const pythonChrome = await readWorkspaceEditorChrome(page, "script.py");
  expect(pythonChrome.floatingSelectCount).toBe(0);
  expect(pythonChrome.saveButtonCount).toBe(1);

  await openWorkspacePlainTextTab(page, "notes.md");
  const mdChrome = await readWorkspaceEditorChrome(page, "notes.md");
  expect(mdChrome.floatingSelectCount).toBe(0);
  expect(mdChrome.saveButtonCount).toBe(1);
});


test("the editor reserves top space so the floating controls never obscure the rendered content", async ({ page }) => {
  // Catches: overlaying the floating controls without reserving space, so the first
  // line of code or text renders underneath them.
  await gotoDataflowWithWorkspace(page, {
    "query.sql": { content: DIALECT_PROBE_SQL, file_name: "query.sql" },
    "notes.md": { content: "hello", file_name: "notes.md" },
  });

  await openWorkspaceTextTab(page, "query.sql");
  const sqlChrome = await readWorkspaceEditorChrome(page, "query.sql");
  expect(sqlChrome.contentTop).toBeGreaterThanOrEqual(sqlChrome.floatingRect.bottom);

  await openWorkspacePlainTextTab(page, "notes.md");
  const mdChrome = await readWorkspaceEditorChrome(page, "notes.md");
  expect(mdChrome.contentTop).toBeGreaterThanOrEqual(mdChrome.floatingRect.bottom);
});
