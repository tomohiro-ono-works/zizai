(function () {
  'use strict';

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('embedded') === '1') return;

  const bridge = (window.zizPackages || {}).core?.bridge || window.zizBridge || null;
  if (!bridge) return;

  const SUPPORTED_EXTENSIONS = ['zizd', 'sql', 'md'];
  const READ_ONLY_PERMISSIONS = Object.freeze({
    createFolder: false,
    createItem: false,
    editItem: false,
    deleteItem: false,
    deleteFolder: false,
  });

  let panelInstance = null;
  let panelHostEl = null;
  let catalogExtensionsPromise = null;

  function normalizeIconPath(iconRaw) {
    const value = String(iconRaw || '').trim();
    if (!value) return '';
    return value.startsWith('./') ? value : `./${value.replace(/^\/+/, '')}`;
  }

  function resolveIcon(iconName) {
    return normalizeIconPath(iconName);
  }

  function buildFolder(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || '').trim();
    const label = String(raw.label || '').trim();
    if (!id || !label) return null;
    const folder = { id, label };
    if (Number.isFinite(raw.order)) folder.order = raw.order;
    const icon = normalizeIconPath(raw.icon);
    if (icon) folder.icon = icon;
    return folder;
  }

  function applyCommonItemFields(item, raw) {
    if (raw.folderId) item.folderId = String(raw.folderId);
    if (typeof raw.description === 'string') item.description = raw.description;
    if (Number.isFinite(raw.order)) item.order = raw.order;
    const icon = normalizeIconPath(raw.icon);
    if (icon) item.icon = icon;
    return item;
  }

  // Text items (.sql/.md) carry their sample text as clipboard.value; onActivateItem
  // below writes it to the OS clipboard itself (never returning false), so the
  // library's own default clipboard path never runs for these items.
  function buildTextItem(raw) {
    const id = String(raw.id || '').trim();
    const label = String(raw.label || '').trim();
    if (!id || !label) return null;
    const item = applyCommonItemFields(
      { id, label, kind: 'text', clipboard: { type: 'text/plain', value: String(raw.text || '') } },
      raw
    );
    return item;
  }

  // Node items (.zizd) carry only the allowed node-template fields as a JSON string in
  // clipboard.value. onActivateItem below always intercepts kind === 'node' and reports
  // handled, so the library's default OS clipboard write never runs for these items.
  function buildNodeItem(raw) {
    const id = String(raw.id || '').trim();
    const label = String(raw.label || '').trim();
    if (!id || !label) return null;
    const template = {
      connector: String(raw.connector || ''),
      action: String(raw.action || ''),
      description: typeof raw.description === 'string' ? raw.description : '',
      descriptionAuto: raw.descriptionAuto !== false,
      form: (raw.form && typeof raw.form === 'object') ? raw.form : {},
    };
    const item = applyCommonItemFields(
      { id, label, kind: 'node', clipboard: { type: 'application/json', value: JSON.stringify(template) } },
      raw
    );
    return item;
  }

  function buildCatalogData(extensionPayload) {
    const folders = Array.isArray(extensionPayload?.folders)
      ? extensionPayload.folders.map(buildFolder).filter(Boolean)
      : [];
    const items = Array.isArray(extensionPayload?.items)
      ? extensionPayload.items
        .map((raw) => {
          if (!raw || typeof raw !== 'object') return null;
          if (raw.kind === 'node') return buildNodeItem(raw);
          if (raw.kind === 'text') return buildTextItem(raw);
          return null;
        })
        .filter(Boolean)
      : [];
    return {
      version: 1,
      permissions: { ...READ_ONLY_PERMISSIONS },
      folders,
      items,
    };
  }

  function emptyCatalogData() {
    return { version: 1, permissions: { ...READ_ONLY_PERMISSIONS }, folders: [], items: [] };
  }

  async function fetchCatalogExtensions() {
    if (catalogExtensionsPromise) return catalogExtensionsPromise;
    const promise = (async () => {
      if (!bridge?.available?.()) return {};
      try {
        const status = await bridge.call('app.getStatus', {});
        const extensions = status?.catalog_samples?.extensions;
        return (extensions && typeof extensions === 'object') ? extensions : {};
      } catch (_) {
        return {};
      }
    })();
    catalogExtensionsPromise = promise;
    const extensions = await promise;
    // A failed/empty lookup (Bridge not yet ready, or a transient app.getStatus
    // rejection) must not be cached, so the next activity reopen or catalog
    // context change retries instead of staying empty forever.
    if (Object.keys(extensions).length === 0) catalogExtensionsPromise = null;
    return extensions;
  }

  // .zizd items are exclusive with the OS clipboard: handled node items always return
  // {handled:true} (or throw, which the library turns into catalog:error without ever
  // falling back to navigator.clipboard.writeText). Text items are always handled too,
  // so this Adapter -- not the library's own default clipboard path -- owns the OS
  // clipboard write; a write failure is reported back as a handled message so it
  // surfaces through the library's existing toast instead of the silent catalog:error
  // event the library has no visible UI for.
  async function onActivateItem(item) {
    if (!item) return false;
    if (item.kind === 'node') {
      const template = JSON.parse(item.clipboard.value);
      const workspaceApi = window.zizWorkspace || null;
      const flowApi = workspaceApi?.getActiveFlowEmbeddedApi?.() || null;
      const applied = !!flowApi?.setNodeTemplate?.(template);
      if (!applied) {
        throw new Error('現在アクティブなフローが見つからないため、ノードを追加できません。');
      }
      // Move keyboard focus off this Catalog <button> and onto the active flow's own
      // canvas, so an immediate Ctrl+V reaches the workflow designer's own paste shortcut
      // instead of being stranded on the Catalog item that triggered this activation.
      workspaceApi?.focusActiveFlowCanvas?.();
      return { handled: true, message: `「${item.label || item.id}」をワークフローへ貼り付け準備しました` };
    }
    const label = item.label || item.id;
    try {
      await navigator.clipboard.writeText(item.clipboard.value);
    } catch (_) {
      return { handled: true, message: `「${label}」のコピーに失敗しました` };
    }
    return { handled: true, message: `「${label}」をコピーしました` };
  }

  function ensurePanel() {
    if (panelInstance) return panelInstance;
    const CatalogPanelCtor = window.CatalogPanel;
    if (typeof CatalogPanelCtor !== 'function') return null;
    panelHostEl = document.createElement('div');
    panelHostEl.className = 'catalog-adapter-host';
    panelInstance = new CatalogPanelCtor(panelHostEl, {
      title: 'カタログ',
      data: emptyCatalogData(),
      resolveIcon,
      onActivateItem,
    });
    return panelInstance;
  }

  async function refresh() {
    const panel = ensurePanel();
    if (!panel) return;
    const workspaceApi = window.zizWorkspace || null;
    const extension = String(workspaceApi?.getActiveCatalogExtension?.() || '');
    const extensions = await fetchCatalogExtensions();
    const data = SUPPORTED_EXTENSIONS.includes(extension)
      ? buildCatalogData(extensions[extension])
      : emptyCatalogData();
    panel.setData(data);
  }

  function mount(host) {
    const panel = ensurePanel();
    if (!panel || !host) return;
    if (panelHostEl.parentElement !== host) {
      host.innerHTML = '';
      host.appendChild(panelHostEl);
    }
    void refresh();
  }

  function destroy() {
    if (!panelInstance) return;
    panelInstance.destroy?.();
    panelHostEl?.remove?.();
    panelInstance = null;
    panelHostEl = null;
    catalogExtensionsPromise = null;
  }

  window.addEventListener('ziz:workspace-catalog-context-changed', () => {
    if (!panelInstance) return;
    void refresh();
  });

  window.zizCatalogAdapter = { mount, refresh, destroy };

  window.addEventListener('pagehide', () => {
    window.zizCatalogAdapter.destroy();
  }, { once: true });
})();
