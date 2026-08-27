(function () {
  const body = document.body;
  const main = body?.querySelector("[data-shell-main]");
  if (!body) return;

  const uiShell = window.zizPackages && window.zizPackages.uiShell;
  if (!uiShell || typeof uiShell.createAppShell !== "function") {
    console.error("[app-shell] zizai-app-shell library is not loaded");
    return;
  }

  const page = body.dataset.shellPage || "home";
  const isFlowLayoutPage = page === "dataflow";
  const embeddedMode = new URLSearchParams(window.location.search).get("embedded") === "1";
  const urls = {
    dataflow: body.dataset.dataflowUrl || "./dataflow.html",
    settings: body.dataset.settingsUrl || "./settings.html",
  };
  const runtimeVersion = new URLSearchParams(window.location.search).get("v") || "";
  const scriptLoadPromises = new Map();

  function toAbsoluteUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    try {
      const target = new URL(raw, window.location.href);
      if (runtimeVersion && !target.searchParams.has("v")) {
        target.searchParams.set("v", runtimeVersion);
      }
      return target.toString();
    } catch (_) {
      return String(url || "");
    }
  }

  function normalizeScriptSrc(url) {
    const target = new URL(String(url || ""), window.location.href);
    if (runtimeVersion && !target.searchParams.has("v")) {
      target.searchParams.set("v", runtimeVersion);
    }
    return target.toString();
  }

  function loadScriptOnce(url) {
    const src = normalizeScriptSrc(url);
    if (scriptLoadPromises.has(src)) {
      return scriptLoadPromises.get(src);
    }
    const existing = Array.from(document.scripts || []).find((script) => script.src === src);
    if (existing) {
      const resolved = Promise.resolve(existing);
      scriptLoadPromises.set(src, resolved);
      return resolved;
    }
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve(script);
      script.onerror = () => {
        scriptLoadPromises.delete(src);
        reject(new Error(`Script load failed: ${src}`));
      };
      document.head.appendChild(script);
    });
    scriptLoadPromises.set(src, promise);
    return promise;
  }

  if (embeddedMode) body.classList.add("embedded-mode");
  if (isFlowLayoutPage) body.classList.add("flow-layout-page");

  const shellRoot = document.createElement("div");
  shellRoot.id = "appShellRoot";
  body.insertBefore(shellRoot, body.firstChild);

  const appShell = uiShell.createAppShell({
    root: shellRoot,
    labels: { closeTab: "閉じる", dirty: "変更あり" },
  });
  appShell.mount();

  if (main) {
    main.removeAttribute("data-shell-main");
    appShell.setRegion("main", main);
  }

  if (isFlowLayoutPage) {
    const rightPanelContent = document.createElement("div");
    rightPanelContent.className = "right-sidebar-content";
    const nodeDetail = document.createElement("div");
    nodeDetail.id = "nodeDetail";
    rightPanelContent.appendChild(nodeDetail);
    appShell.setRegion("rightPanel", rightPanelContent);
  }

  let sidebarCallbacks = {};
  let headerCallbacks = {};

  function syncShellMetrics() {
    body.style.setProperty("--shell-header-height", "0px");
    body.style.setProperty("--shell-content-height", `${Math.max(0, window.innerHeight)}px`);
  }

  if (!embeddedMode) {
    appShell.setActivities([
      { id: "home", label: "トップ画面へ戻る", icon: "./icons/ziz_one.svg" },
      { id: "project-select", label: "プロジェクト選択", icon: "./icons/launch_project.svg" },
      { id: "explorer", label: "エクスプローラー", icon: "./icons/folder_open.svg" },
      { id: "settings", label: "設定", icon: "./icons/settings.svg" },
    ]);

    appShell.setCommands([
      { id: "diagnostics", label: "診断", icon: "./icons/healthcheck.svg", region: "tabbar" },
      { id: "window-minimize", label: "最小化", icon: "./icons/small.svg", region: "tabbar" },
      { id: "window-maximize", label: "拡大", icon: "./icons/middle.svg", region: "tabbar" },
      { id: "window-close", label: "閉じる", icon: "./icons/closel.svg", region: "tabbar" },
    ]);

    appShell.setLayout({ activeActivityId: page === "settings" ? "settings" : "" });

    appShell.on("activity:select", ({ activityId }) => {
      const id = String(activityId || "");
      const expanded = true;
      if (id === "home") {
        sidebarCallbacks.onToggle?.({ event: null, item: null, expanded });
        return;
      }
      if (id === "settings") {
        sidebarCallbacks.onActionItem?.({
          event: null,
          item: null,
          action: id,
          navUrl: toAbsoluteUrl(urls.settings),
          expanded,
        });
        return;
      }
      sidebarCallbacks.onActionItem?.({ event: null, item: null, action: id, navUrl: "", expanded });
    });

    appShell.on("command:execute", ({ commandId }) => {
      const id = String(commandId || "");
      if (id === "diagnostics") {
        headerCallbacks.onDiagnostics?.({ event: null, item: null });
        return;
      }
      if (id === "window-minimize") {
        headerCallbacks.onWindowControl?.({ event: null, item: null, action: "minimize" });
        return;
      }
      if (id === "window-maximize") {
        headerCallbacks.onWindowControl?.({ event: null, item: null, action: "maximize" });
        return;
      }
      if (id === "window-close") {
        headerCallbacks.onWindowControl?.({ event: null, item: null, action: "close" });
      }
    });

    const tabbarEl = shellRoot.querySelector(".zui-shell__tabbar");
    if (tabbarEl) {
      tabbarEl.addEventListener("mousedown", (event) => {
        headerCallbacks.onHeaderDrag?.({
          event,
          item: tabbarEl,
          isInteractiveTarget: !!event.target.closest("button, input, select, textarea, a, label"),
        });
      });
    }
  }

  function isSidebarExpanded() {
    return true;
  }

  function setSidebarExpanded(_expanded, onApplied) {
    window.requestAnimationFrame(() => {
      syncShellMetrics();
      if (typeof onApplied === "function") onApplied();
    });
  }

  function setActiveSidebar(_targetMode) {
    // Legacy [data-app-mode] hook retained for compatibility; no current page renders such items.
  }

  function setActiveActivity(activityId) {
    appShell.setLayout({ activeActivityId: String(activityId || "") });
  }

  function isRightSidebarCollapsed() {
    return !appShell.getLayout().rightPanelVisible;
  }

  function setRightSidebarCollapsed(collapsed, onApplied) {
    if (!isFlowLayoutPage) return;
    appShell.setLayout({ rightPanelVisible: !collapsed });
    window.requestAnimationFrame(() => {
      syncShellMetrics();
      if (typeof onApplied === "function") onApplied();
    });
  }

  function setRightSidebarWidth(px, onApplied) {
    if (!isFlowLayoutPage) return;
    const width = Math.max(1, Math.floor(Number(px) || 0));
    appShell.setLayout({ rightPanelWidth: width });
    window.requestAnimationFrame(() => {
      syncShellMetrics();
      if (typeof onApplied === "function") onApplied();
    });
  }

  function setActiveRightPanel(_panelKey) {
    // Legacy [data-right-panel] hook retained for compatibility; no current page renders such items.
  }

  function updateHeader(options = {}) {
    // No flowName/undo/redo/run/reset/save controls are currently rendered by any page;
    // this hook is retained so out-of-scope callers keep a stable no-op API surface.
    void options;
  }

  function bindSidebar(callbacks = {}) {
    sidebarCallbacks = callbacks || {};
  }

  function bindHeader(callbacks = {}) {
    headerCallbacks = callbacks || {};
  }

  function bindRightSidebar(_callbacks = {}) {
    // Legacy rightSidebarToggle/rightPanelItems hook retained for compatibility;
    // no current page renders such items.
  }

  function getRightSidebarRefs() {
    if (!isFlowLayoutPage) return { enabled: false };
    return {
      enabled: true,
      container: shellRoot.querySelector(".zui-shell__right-panel"),
      rail: null,
      toggle: null,
      resizer: shellRoot.querySelector(".zui-shell__resizer--right"),
      content: shellRoot.querySelector(".zui-shell__right-panel .right-sidebar-content"),
    };
  }

  window.zizShell = {
    appShell,
    bindSidebar,
    bindHeader,
    bindRightSidebar,
    updateHeader,
    isSidebarExpanded,
    setSidebarExpanded,
    setActiveSidebar,
    setActiveActivity,
    isRightSidebarCollapsed,
    setRightSidebarCollapsed,
    setRightSidebarWidth,
    setActiveRightPanel,
    getRightSidebarRefs,
    loadScriptOnce,
  };

  window.addEventListener("resize", () => {
    syncShellMetrics();
  });
  window.requestAnimationFrame(syncShellMetrics);

  window.addEventListener("pagehide", () => {
    appShell.destroy();
  }, { once: true });
})();
