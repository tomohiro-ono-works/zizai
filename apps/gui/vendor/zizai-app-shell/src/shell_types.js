(function (root) {
  const packages = root.zizPackages = root.zizPackages || {};
  const modules = packages.__uiShellModules = packages.__uiShellModules || {};

  const REGION_NAMES = Object.freeze([
    "topbar",
    "activitybar",
    "sidebar",
    "main",
    "rightPanel",
    "bottomPanel",
    "statusbar"
  ]);
  const COMMAND_REGIONS = new Set(["topbar", "tabbar", "panel", "status"]);
  const BOTTOM_PANEL_ALIGNMENTS = new Set(["center", "justify"]);
  const DEFAULT_LAYOUT = Object.freeze({
    sidebarVisible: false,
    rightPanelVisible: false,
    bottomPanelVisible: false,
    sidebarWidth: 280,
    rightPanelWidth: 320,
    bottomPanelHeight: 220,
    bottomPanelAlignment: "center",
    activeActivityId: ""
  });

  function text(value) {
    return String(value ?? "").trim();
  }

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.round(number)));
  }

  function normalizeContextAction(value) {
    const source = value && typeof value === "object" ? value : {};
    const id = text(source.id);
    if (!id) return null;
    return {
      id,
      label: text(source.label) || id,
      disabled: !!source.disabled
    };
  }

  function normalizeTab(value) {
    const source = value && typeof value === "object" ? value : {};
    const id = text(source.id);
    if (!id) return null;
    return {
      id,
      title: text(source.title) || id,
      kind: text(source.kind),
      icon: text(source.icon),
      dirty: !!source.dirty,
      closable: source.closable !== false,
      contentKey: text(source.contentKey),
      badge: source.badge === undefined || source.badge === null ? "" : String(source.badge),
      reorderable: !!source.reorderable,
      contextActions: normalizeItems(source.contextActions, normalizeContextAction)
    };
  }

  function normalizeActivity(value) {
    const source = value && typeof value === "object" ? value : {};
    const id = text(source.id);
    if (!id) return null;
    return {
      id,
      label: text(source.label) || id,
      icon: text(source.icon),
      badge: source.badge === undefined || source.badge === null ? "" : String(source.badge),
      disabled: !!source.disabled
    };
  }

  function normalizeCommand(value) {
    const source = value && typeof value === "object" ? value : {};
    const id = text(source.id);
    if (!id) return null;
    return {
      id,
      label: text(source.label) || id,
      icon: text(source.icon),
      region: COMMAND_REGIONS.has(source.region) ? source.region : "topbar",
      shortcut: text(source.shortcut),
      disabled: !!source.disabled
    };
  }

  function normalizeItems(values, normalizer) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).reduce((items, value) => {
      const item = normalizer(value);
      if (!item || seen.has(item.id)) return items;
      seen.add(item.id);
      items.push(item);
      return items;
    }, []);
  }

  function normalizeBottomPanelAlignment(value, fallback) {
    const normalized = text(value);
    if (BOTTOM_PANEL_ALIGNMENTS.has(normalized)) return normalized;
    const fallbackValue = text(fallback);
    return BOTTOM_PANEL_ALIGNMENTS.has(fallbackValue) ? fallbackValue : "center";
  }

  function normalizeLayout(value, base = DEFAULT_LAYOUT) {
    const source = value && typeof value === "object" ? value : {};
    return {
      sidebarVisible: source.sidebarVisible === undefined
        ? !!base.sidebarVisible
        : !!source.sidebarVisible,
      rightPanelVisible: source.rightPanelVisible === undefined
        ? !!base.rightPanelVisible
        : !!source.rightPanelVisible,
      bottomPanelVisible: source.bottomPanelVisible === undefined
        ? !!base.bottomPanelVisible
        : !!source.bottomPanelVisible,
      sidebarWidth: clamp(source.sidebarWidth, 160, 720, base.sidebarWidth),
      rightPanelWidth: clamp(source.rightPanelWidth, 180, 720, base.rightPanelWidth),
      bottomPanelHeight: clamp(source.bottomPanelHeight, 120, 640, base.bottomPanelHeight),
      bottomPanelAlignment: source.bottomPanelAlignment === undefined
        ? normalizeBottomPanelAlignment(base.bottomPanelAlignment, DEFAULT_LAYOUT.bottomPanelAlignment)
        : normalizeBottomPanelAlignment(source.bottomPanelAlignment, base.bottomPanelAlignment),
      activeActivityId: source.activeActivityId === undefined
        ? text(base.activeActivityId)
        : text(source.activeActivityId)
    };
  }

  function normalizeStatus(values) {
    return (Array.isArray(values) ? values : []).map((value, index) => {
      if (value && typeof value === "object") {
        return {
          id: text(value.id) || `status-${index + 1}`,
          label: text(value.label),
          value: text(value.value)
        };
      }
      return { id: `status-${index + 1}`, label: text(value), value: "" };
    }).filter((item) => item.label || item.value);
  }

  modules.shellTypes = Object.freeze({
    REGION_NAMES,
    DEFAULT_LAYOUT,
    normalizeTabs: (values) => normalizeItems(values, normalizeTab),
    normalizeActivities: (values) => normalizeItems(values, normalizeActivity),
    normalizeCommands: (values) => normalizeItems(values, normalizeCommand),
    normalizeLayout,
    normalizeStatus
  });
})(window);
