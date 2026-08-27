(function (root) {
  const packages = root.zizPackages = root.zizPackages || {};
  const modules = packages.__uiShellModules || {};
  const types = modules.shellTypes;

  function createAppShell(options = {}) {
    const mountRoot = options.root;
    if (!mountRoot || mountRoot.nodeType !== 1) {
      throw new TypeError("createAppShell requires an HTMLElement root");
    }

    const documentRef = mountRoot.ownerDocument;
    const emitter = modules.createEmitter();
    const labels = { closeTab: "Close", dirty: "Modified", ...(options.labels || {}) };
    const regionContent = { ...(options.regions || {}) };

    let activities = types.normalizeActivities(options.activities);
    let commands = types.normalizeCommands(options.commands);
    let tabs = [];
    let activeTabId = "";
    let status = [];
    let layout = types.normalizeLayout(options.layout);
    let mounted = false;
    let destroyed = false;
    let refs = null;
    let regionController = null;
    let layoutController = null;
    let shortcutController = null;
    let tabInteractionsController = null;

    function ensureActive() {
      if (destroyed) throw new Error("AppShell instance has been destroyed");
    }

    function syncVisibility() {
      if (!mounted) return;
      const hasTopbar = !!refs.regionHosts.topbar.childNodes.length
        || !!refs.commandHosts.topbar.childNodes.length;
      const hasActivitybar = !!refs.regionHosts.activitybar.childNodes.length
        || !!refs.activityItems.childNodes.length;
      const hasStatusbar = !!refs.regionHosts.statusbar.childNodes.length
        || !!refs.statusItems.childNodes.length
        || !!refs.commandHosts.status.childNodes.length;

      refs.topbar.hidden = !hasTopbar;
      refs.activitybar.hidden = !hasActivitybar;
      refs.tabbar.hidden = !refs.tabs.childNodes.length
        && !refs.commandHosts.tabbar.childNodes.length;
      refs.statusbar.hidden = !hasStatusbar;
      refs.root.classList.toggle("has-topbar", hasTopbar);
      refs.root.classList.toggle("has-activitybar", hasActivitybar);
      refs.root.classList.toggle("has-statusbar", hasStatusbar);
    }

    function renderActivities() {
      if (!mounted) return;
      modules.renderActivitybar(
        documentRef,
        refs.activityItems,
        activities,
        layout.activeActivityId,
        (activityId) => {
          layout = layoutController.set({ activeActivityId: activityId });
          renderActivities();
          emitter.emit("activity:select", { activityId });
        }
      );
      syncVisibility();
    }

    function renderCommands() {
      if (!mounted) return;
      modules.shellRegions.renderCommands(
        documentRef,
        refs.commandHosts,
        commands,
        (payload) => emitter.emit("command:execute", payload)
      );
      syncVisibility();
    }

    function renderTabs() {
      if (!mounted) return;
      modules.renderTabs(documentRef, refs.tabs, tabs, activeTabId, labels, {
        onActivate(tabId) {
          activeTabId = tabId;
          renderTabs();
          emitter.emit("tab:activate", { tabId });
        },
        onClose(tabId) {
          emitter.emit("tab:close-request", { tabId });
        }
      });
      syncVisibility();
    }

    function renderStatus() {
      if (!mounted) return;
      modules.shellRegions.renderStatus(documentRef, refs.statusItems, status);
      syncVisibility();
    }

    function mount() {
      ensureActive();
      if (mounted) return api;

      refs = modules.shellDom.buildShell(documentRef);
      mountRoot.replaceChildren(refs.root);
      regionController = modules.shellRegions.createRegionController(refs.regionHosts);
      layoutController = modules.createLayoutController({
        refs,
        initialLayout: layout,
        onChange(nextLayout) {
          layout = nextLayout;
          emitter.emit("layout:change", { layout: { ...layout } });
        }
      });
      shortcutController = modules.shellShortcuts.createShortcutController({
        target: refs.root,
        getCommands: () => commands,
        onExecute(payload) {
          emitter.emit("command:execute", payload);
        }
      });
      tabInteractionsController = modules.shellTabInteractions.createTabInteractionsController({
        documentRef,
        host: refs.tabs,
        getTabs: () => tabs,
        onReorderRequest(payload) {
          emitter.emit("tab:reorder-request", payload);
        },
        onContextAction(payload) {
          emitter.emit("tab:context-action", payload);
        }
      });

      types.REGION_NAMES.forEach((region) => {
        if (Object.prototype.hasOwnProperty.call(regionContent, region)) {
          regionController.set(region, regionContent[region]);
        }
      });

      mounted = true;
      renderActivities();
      renderCommands();
      renderTabs();
      renderStatus();
      syncVisibility();
      return api;
    }

    function destroy() {
      if (destroyed) return;
      tabInteractionsController?.destroy();
      shortcutController?.destroy();
      layoutController?.destroy();
      regionController?.destroy();
      refs?.root.remove();
      emitter.clear();
      refs = null;
      mounted = false;
      destroyed = true;
    }

    function setActivities(items) {
      ensureActive();
      activities = types.normalizeActivities(items);
      renderActivities();
      return api;
    }

    function setCommands(items) {
      ensureActive();
      commands = types.normalizeCommands(items);
      renderCommands();
      return api;
    }

    function setTabs(items, requestedActiveTabId) {
      ensureActive();
      tabs = types.normalizeTabs(items);
      const requested = String(requestedActiveTabId || "").trim();
      const preserved = tabs.some((tab) => tab.id === activeTabId) ? activeTabId : "";
      activeTabId = tabs.some((tab) => tab.id === requested)
        ? requested
        : (preserved || tabs[0]?.id || "");
      renderTabs();
      return api;
    }

    function openTab(tab) {
      ensureActive();
      const normalized = types.normalizeTabs([tab])[0];
      if (!normalized) throw new TypeError("tab.id is required");
      const index = tabs.findIndex((item) => item.id === normalized.id);
      if (index >= 0) tabs[index] = normalized;
      else tabs.push(normalized);
      activeTabId = normalized.id;
      renderTabs();
      return api;
    }

    function updateTab(tabId, patch = {}) {
      ensureActive();
      const id = String(tabId || "").trim();
      const index = tabs.findIndex((tab) => tab.id === id);
      if (index < 0) return false;
      tabs[index] = types.normalizeTabs([{ ...tabs[index], ...patch, id }])[0];
      renderTabs();
      return true;
    }

    function closeTab(tabId) {
      ensureActive();
      const id = String(tabId || "").trim();
      if (!tabs.some((tab) => tab.id === id)) return false;
      emitter.emit("tab:close-request", { tabId: id });
      return true;
    }

    function activateTab(tabId) {
      ensureActive();
      const id = String(tabId || "").trim();
      if (!tabs.some((tab) => tab.id === id)) return false;
      activeTabId = id;
      renderTabs();
      return true;
    }

    function setRegion(region, content) {
      ensureActive();
      if (!types.REGION_NAMES.includes(region)) {
        throw new RangeError(`unknown shell region: ${region}`);
      }
      regionContent[region] = content;
      if (mounted) {
        regionController.set(region, content);
        syncVisibility();
      }
      return api;
    }

    function setStatus(items) {
      ensureActive();
      status = types.normalizeStatus(items);
      renderStatus();
      return api;
    }

    function setLayout(nextLayout) {
      ensureActive();
      layout = mounted
        ? layoutController.set(nextLayout)
        : types.normalizeLayout(nextLayout, layout);
      renderActivities();
      return api;
    }

    function getLayout() {
      return mounted ? layoutController.get() : { ...layout };
    }

    function focusRegion(region) {
      ensureActive();
      const host = refs?.regionHosts?.[region];
      if (!host) return false;
      if (!host.hasAttribute("tabindex")) host.tabIndex = -1;
      host.focus({ preventScroll: true });
      emitter.emit("region:focus", { region });
      return true;
    }

    const api = Object.freeze({
      mount,
      destroy,
      setActivities,
      setCommands,
      setTabs,
      openTab,
      updateTab,
      closeTab,
      activateTab,
      setRegion,
      setStatus,
      setLayout,
      getLayout,
      focusRegion,
      on: emitter.on,
      off: emitter.off
    });

    return api;
  }

  packages.uiShell = Object.freeze({ createAppShell });
  delete packages.__uiShellModules;
})(window);
