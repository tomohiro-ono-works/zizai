(function () {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get('embedded') === '1') return;
  const bridge = (window.zizPackages || {}).core?.bridge || window.zizBridge || null;
  const dialog = (window.zizPackages || {}).core?.dialog || window.zizDialog || null;
  const shell = window.zizWorkspaceShell || null;
  const appShell = shell?.appShell || (window.zizShell || {}).appShell || null;
  if (!bridge || !shell || !appShell) return;

  const STORAGE_KEY_PENDING_SIDEBAR_ACTION = 'ziz.workspace.pendingSidebarAction.v1';
  const RECENT_ROOTS_CONFIG_SCOPE = 'runtime';
  const RECENT_ROOTS_CONFIG_PATH = 'recent_roots.json';
  const MAX_OPEN_TABS = 4;
  const MAX_RECENT_ROOTS = 10;
  const TEXT_EXTENSIONS = new Set(['.md', '.sql', '.py', '.json', '.zizd']);
  const WORKSPACE_SQL_DIALECTS = [
    { id: 'bigquery', label: 'BigQuery' },
    { id: 'duckdb', label: 'DuckDB' },
  ];
  const DEFAULT_WORKSPACE_SQL_DIALECT = 'bigquery';
  const FLOW_EXTENSIONS = new Set(['.zizd']);
  const DEFAULT_FILE_ICON_MAP = {
    default: './icons/block.svg',
    csv: './img/CSVConnector.jpg',
    xls: './img/ExcelConnector.jpg',
    xlsx: './img/ExcelConnector.jpg',
    sql: './icons/database.svg',
    py: './img/PythonConnector.jpg',
    md: './icons/block.svg',
    json: './icons/block.svg',
    yml: './icons/block.svg',
    yaml: './icons/block.svg',
  };

  const state = {
    globalStore: {
      workspaceRoot: '',
      configRoot: '',
      leftMode: '',
      workspaceLocked: false,
      recentRoots: [],
    },
    tabOrder: [],
    activeTabId: '',
    tabStore: {},
  };

  let explorerContextMenuEl = null;
  let lockOverlayEl = null;
  let lockWatchdogTimer = 0;
  let fileIconMap = { ...DEFAULT_FILE_ICON_MAP };
  let fileIconMapLoaded = false;
  let runningFlowTabId = '';

  function getShellApi() {
    return window.zizShell || {};
  }

  function getCodeEditorsApi() {
    return (window.zizPackages && window.zizPackages.core && window.zizPackages.core.codeEditors)
      || window.codeEditors
      || null;
  }

  async function ensureCodeEditorsApi() {
    const existing = getCodeEditorsApi();
    if (existing && typeof existing.mountCodeEditor === 'function') return existing;
    const shellApi = getShellApi();
    if (typeof shellApi.loadScriptOnce === 'function') {
      await shellApi.loadScriptOnce('./js/code.editor.js');
    }
    return getCodeEditorsApi();
  }

  function logInfo(message, detail) {
    if (detail !== undefined) {
      console.info('[workspace]', message, detail);
      return;
    }
    console.info('[workspace]', message);
  }

  function toDebugJson(value) {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }

  function logSaveTrace(stage, detail) {
    const payload = (detail && typeof detail === 'object') ? detail : { value: detail };
    console.info(`[save-trace][workspace] ${String(stage || '')} ${toDebugJson(payload)}`);
  }

  function getTab(tabId) {
    return state.tabStore[String(tabId || '')] || null;
  }

  function allTabs() {
    return state.tabOrder.map((tabId) => getTab(tabId)).filter(Boolean);
  }

  function activeTab() {
    return getTab(state.activeTabId || '');
  }

  function addTab(tab, orderIndex) {
    state.tabStore[tab.id] = tab;
    const index = Number.isInteger(orderIndex)
      ? Math.max(0, Math.min(orderIndex, state.tabOrder.length))
      : state.tabOrder.length;
    state.tabOrder.splice(index, 0, tab.id);
    activateTab(tab.id);
  }

  function allClosableTabs() {
    return allTabs().filter((tab) => !!tab?.closable);
  }

  function isFlowTab(tab) {
    return !!tab && tab.kind === 'dataflow';
  }

  function isTabRunning(tabId) {
    return !!tabId && String(tabId) === String(runningFlowTabId || '');
  }

  function normalizeError(error) {
    if (!error) return { code: 'E_UNKNOWN', message: '不明なエラーです。' };
    const code = String(error.code || 'E_UNKNOWN');
    const message = String(error.message || error || 'エラーが発生しました。');
    return { code, message };
  }

  function normalizeMtimeNs(value) {
    if (value === null || value === undefined) return '';
    const text = String(value).trim();
    if (!text) return '';
    return /^\d+$/.test(text) ? text : '';
  }

  function stripExtension(nameValue) {
    const text = String(nameValue || '').trim();
    if (!text) return '';
    if (text.startsWith('.') && text.indexOf('.', 1) < 0) return text;
    const idx = text.lastIndexOf('.');
    if (idx <= 0) return text;
    return text.slice(0, idx);
  }

  function fileNameFromRelPath(relPath) {
    const normalized = String(relPath || '').replace(/\\/g, '/');
    const name = normalized.split('/').pop() || '';
    return String(name || '').trim();
  }

  function fileExtensionFromPath(pathValue) {
    const fileName = fileNameFromRelPath(pathValue);
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex === fileName.length - 1) return '';
    return String(fileName.slice(dotIndex + 1) || '').trim().toLowerCase();
  }

  function getWorkspaceEditorLanguage(tab) {
    const ext = fileExtensionFromPath(tab?.relPath || '');
    if (ext === 'sql') return 'sql';
    if (ext === 'py') return 'python';
    if (ext === 'json') return 'json';
    return '';
  }

  function isWorkspaceMarkdownTab(tab) {
    return fileExtensionFromPath(tab?.relPath || '') === 'md';
  }

  function getMarkdownEditorCtor() {
    return typeof window.MarkdownEditor === 'function' ? window.MarkdownEditor : null;
  }

  // Session-only SQL dialect choice. It lives on the open tab object and is never
  // written to the SQL file, a sidecar, Runtime config, or a Bridge payload.
  function normalizeWorkspaceSqlDialect(value) {
    const id = String(value || '').trim().toLowerCase();
    return WORKSPACE_SQL_DIALECTS.some((entry) => entry.id === id) ? id : DEFAULT_WORKSPACE_SQL_DIALECT;
  }

  function applyTabSqlDialect(tab) {
    const controller = tab?.codeEditorController;
    if (!controller || typeof controller.setSqlDialect !== 'function') return;
    controller.setSqlDialect(normalizeWorkspaceSqlDialect(tab.sqlDialect));
  }

  function createSqlDialectSelect(tab) {
    const select = document.createElement('select');
    select.className = 'workspace-text-dialect';
    select.setAttribute('aria-label', 'SQL方言');
    WORKSPACE_SQL_DIALECTS.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.label;
      select.appendChild(option);
    });
    select.value = normalizeWorkspaceSqlDialect(tab.sqlDialect);
    select.addEventListener('change', () => {
      tab.sqlDialect = normalizeWorkspaceSqlDialect(select.value);
      select.value = tab.sqlDialect;
      applyTabSqlDialect(tab);
    });
    return select;
  }

  function resolveTabIconPath(tab) {
    const ext = fileExtensionFromPath(tab?.relPath || '') || fileExtensionFromPath(tab?.name || '');
    return String(fileIconMap[ext] || fileIconMap.default || DEFAULT_FILE_ICON_MAP.default);
  }

  function canonicalNameFromTab(tab) {
    const fileName = fileNameFromRelPath(tab?.relPath || '');
    return stripExtension(fileName || tab?.name || '');
  }

  function tabDisplayName(tab) {
    const base = canonicalNameFromTab(tab);
    return base || '(無題)';
  }

  function showMessage(message, options = {}) {
    if (dialog?.show) {
      dialog.show(String(message || ''), options);
      return;
    }
    window.alert(String(message || ''));
  }

  async function askSaveDecision(tab) {
    const title = String(tab?.name || 'ファイル');
    if (dialog?.choose) {
      const result = await dialog.choose(`${title} を保存しますか？`, {
        title: '未保存の変更',
        kind: 'warning',
        labels: { ok: '保存', cancel: '保存しない', extra: 'キャンセル' },
        values: { ok: 'save', cancel: 'discard', extra: 'cancel' },
      });
      return String(result || 'cancel');
    }
    const input = window.prompt(`${title} を保存しますか？\n s:保存 / d:保存しない / c:キャンセル`, 's');
    if (input == null) return 'cancel';
    const value = String(input || '').trim().toLowerCase();
    if (value.startsWith('s')) return 'save';
    if (value.startsWith('d')) return 'discard';
    return 'cancel';
  }

  function askConflictDecision(tab) {
    const input = window.prompt(`${tab.name} は外部更新されています。\n r:再読み込み / o:上書き保存 / a:別名保存 / c:キャンセル`, 'c');
    if (input == null) return 'cancel';
    const value = String(input || '').trim().toLowerCase();
    if (value.startsWith('r')) return 'reload';
    if (value.startsWith('o')) return 'overwrite';
    if (value.startsWith('a')) return 'save-as';
    return 'cancel';
  }

  function ensureLockOverlay() {
    if (lockOverlayEl) return lockOverlayEl;
    lockOverlayEl = document.createElement('div');
    lockOverlayEl.className = 'workspace-global-lock-overlay';
    lockOverlayEl.hidden = true;
    lockOverlayEl.textContent = '処理中です...';
    document.body.appendChild(lockOverlayEl);
    return lockOverlayEl;
  }

  function setWorkspaceLock(locked, message = '処理中です...') {
    if (lockWatchdogTimer) {
      window.clearTimeout(lockWatchdogTimer);
      lockWatchdogTimer = 0;
    }
    state.globalStore.workspaceLocked = !!locked;
    const overlay = ensureLockOverlay();
    overlay.hidden = !locked;
    overlay.style.pointerEvents = locked ? 'auto' : 'none';
    overlay.textContent = String(message || '処理中です...');
    if (locked) {
      lockWatchdogTimer = window.setTimeout(() => {
        lockWatchdogTimer = 0;
        if (!state.globalStore.workspaceLocked) return;
        console.warn('[workspace] lock watchdog fired; force unlock');
        state.globalStore.workspaceLocked = false;
        if (lockOverlayEl) {
          lockOverlayEl.hidden = true;
          lockOverlayEl.style.pointerEvents = 'none';
        }
        showMessage('処理が長時間継続したためロックを解除しました。再度お試しください。', { kind: 'warning', title: 'タイムアウト' });
      }, 15000);
    }
  }

  async function withTimeout(promise, timeoutMs, timeoutMessage) {
    let timerId = 0;
    try {
      return await Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
          timerId = window.setTimeout(() => {
            reject(new Error(timeoutMessage || 'timeout'));
          }, Math.max(200, Number(timeoutMs) || 1500));
        })
      ]);
    } finally {
      if (timerId) window.clearTimeout(timerId);
    }
  }

  function normalizeRootPath(pathValue) {
    return String(pathValue || '').trim();
  }

  function sanitizeRecentRootTimestamp(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const ms = Date.parse(text);
    if (!Number.isFinite(ms)) return '';
    return new Date(ms).toISOString();
  }

  function nowRecentRootTimestamp() {
    return new Date().toISOString();
  }

  function normalizeRecentRootEntry(entry, fallbackTimestamp = '') {
    if (typeof entry === 'string') {
      const path = normalizeRootPath(entry);
      if (!path) return null;
      return {
        path,
        last_accessed_at: sanitizeRecentRootTimestamp(fallbackTimestamp) || nowRecentRootTimestamp(),
      };
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const path = normalizeRootPath(entry.path);
    if (!path) return null;
    return {
      path,
      last_accessed_at: sanitizeRecentRootTimestamp(entry.last_accessed_at) || sanitizeRecentRootTimestamp(fallbackTimestamp) || nowRecentRootTimestamp(),
    };
  }

  function normalizeRecentRootsList(entries) {
    const list = Array.isArray(entries) ? entries : [];
    let normalized = [];
    list.forEach((entry) => {
      const item = normalizeRecentRootEntry(entry);
      if (!item) return;
      const deduped = normalized.filter((existing) => !isSameRootPath(existing.path, item.path));
      normalized = [item, ...deduped];
    });
    normalized.sort((a, b) => {
      const aMs = Date.parse(String(a?.last_accessed_at || ''));
      const bMs = Date.parse(String(b?.last_accessed_at || ''));
      const av = Number.isFinite(aMs) ? aMs : 0;
      const bv = Number.isFinite(bMs) ? bMs : 0;
      return bv - av;
    });
    return normalized.slice(0, MAX_RECENT_ROOTS);
  }

  function mergeRecentRootsLists(primaryEntries, secondaryEntries) {
    const primary = normalizeRecentRootsList(primaryEntries);
    const secondary = normalizeRecentRootsList(secondaryEntries);
    const byPath = new Map();
    const put = (entry) => {
      const path = normalizeRootPath(entry?.path);
      if (!path) return;
      const key = toComparableRootPath(path);
      const current = byPath.get(key);
      if (!current) {
        byPath.set(key, { path, last_accessed_at: String(entry?.last_accessed_at || '') });
        return;
      }
      const currentMs = Date.parse(String(current.last_accessed_at || ''));
      const nextMs = Date.parse(String(entry?.last_accessed_at || ''));
      const cv = Number.isFinite(currentMs) ? currentMs : 0;
      const nv = Number.isFinite(nextMs) ? nextMs : 0;
      if (nv >= cv) {
        byPath.set(key, { path, last_accessed_at: String(entry?.last_accessed_at || '') });
      }
    };
    secondary.forEach(put);
    primary.forEach(put);
    return normalizeRecentRootsList(Array.from(byPath.values()));
  }

  function formatRecentRootDateTime(timestamp) {
    const ms = Date.parse(String(timestamp || ''));
    if (!Number.isFinite(ms)) return '';
    const date = new Date(ms);
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function toComparableRootPath(pathValue) {
    return normalizeRootPath(pathValue).replace(/\//g, '\\').toLowerCase();
  }

  function isSameRootPath(left, right) {
    return toComparableRootPath(left) === toComparableRootPath(right);
  }

  function getRootFolderName(rootPath) {
    const normalized = normalizeRootPath(rootPath).replace(/[\\/]+$/, '');
    if (!normalized) return '(未選択)';
    const parts = normalized.split(/[\\/]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : normalized;
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pushRecentRoot(pathValue, options = {}) {
    const normalized = normalizeRootPath(pathValue);
    if (!normalized) return;
    const normalizedEntries = normalizeRecentRootsList(state.globalStore.recentRoots);
    const deduped = normalizedEntries.filter((entry) => !isSameRootPath(entry.path, normalized));
    const timestamp = sanitizeRecentRootTimestamp(options.last_accessed_at) || nowRecentRootTimestamp();
    state.globalStore.recentRoots = [{ path: normalized, last_accessed_at: timestamp }, ...deduped].slice(0, MAX_RECENT_ROOTS);
    if (!options.skipScheduleSave) {
      void saveRecentRootsToConfig();
    }
  }

  async function readRecentRootsFromConfig() {
    if (!bridge?.call) return [];
    try {
      const payload = await bridge.call('workspace.readText', {
        scope: RECENT_ROOTS_CONFIG_SCOPE,
        rel_path: RECENT_ROOTS_CONFIG_PATH,
      });
      const raw = String(payload?.content || '').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return normalizeRecentRootsList(parsed);
    } catch (error) {
      const normalized = normalizeError(error);
      if (normalized.code === 'E_NOT_FOUND') return [];
      logInfo('readRecentRootsFromConfig failed', normalized);
      return [];
    }
  }

  async function loadRecentRootsFromConfig() {
    const entries = await readRecentRootsFromConfig();
    state.globalStore.recentRoots = entries;
  }

  async function saveRecentRootsToConfig() {
    if (!bridge?.call) return;
    const savedEntries = await readRecentRootsFromConfig();
    const mergedEntries = mergeRecentRootsLists(state.globalStore.recentRoots, savedEntries);
    state.globalStore.recentRoots = mergedEntries;
    const recentRootsPayload = mergedEntries
      .map((entry) => ({
        path: entry.path,
        last_accessed_at: entry.last_accessed_at,
      }));
    const payload = JSON.stringify(
      recentRootsPayload,
      null,
      2
    );
    try {
      await bridge.call('workspace.writeText', {
        scope: RECENT_ROOTS_CONFIG_SCOPE,
        rel_path: RECENT_ROOTS_CONFIG_PATH,
        content: payload,
        force: true,
      });
    } catch (error) {
      logInfo('saveRecentRootsToConfig failed', normalizeError(error));
    }
  }

  async function flushRecentRootsSaveToConfig() {
    await saveRecentRootsToConfig();
  }

  function waitForBridgeReady(timeoutMs = 12000) {
    if (!bridge?.call) return Promise.resolve(false);
    if (bridge?.available?.()) return Promise.resolve(true);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ready) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timerId);
        window.removeEventListener('ziz:bridge-ready', onReady);
        resolve(!!ready);
      };
      const onReady = () => finish(true);
      const timerId = window.setTimeout(() => {
        finish(!!bridge?.available?.());
      }, Math.max(1000, Number(timeoutMs) || 12000));
      window.addEventListener('ziz:bridge-ready', onReady, { once: true });
    });
  }

  function normalizeFileIconMap(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ...DEFAULT_FILE_ICON_MAP };
    }
    const normalized = {};
    Object.keys(payload).forEach((key) => {
      const ext = String(key || '').trim().toLowerCase().replace(/^\./, '');
      const icon = String(payload[key] || '').trim();
      if (!ext || !icon) return;
      normalized[ext] = icon;
    });
    if (!normalized.default) normalized.default = DEFAULT_FILE_ICON_MAP.default;
    return { ...DEFAULT_FILE_ICON_MAP, ...normalized };
  }

  async function loadFileIconMapFromConfig() {
    if (fileIconMapLoaded) return;
    if (!bridge?.available?.()) {
      fileIconMap = { ...DEFAULT_FILE_ICON_MAP };
      return;
    }
    try {
      const status = await bridge.call('app.getStatus', {});
      const iconMap = status?.file_icon_map;
      if (!iconMap || typeof iconMap !== 'object') {
        fileIconMap = { ...DEFAULT_FILE_ICON_MAP };
        return;
      }
      fileIconMap = normalizeFileIconMap(iconMap);
      fileIconMapLoaded = true;
    } catch (error) {
      logInfo('loadFileIconMapFromConfig failed', normalizeError(error));
      fileIconMap = { ...DEFAULT_FILE_ICON_MAP };
    }
  }

  function readAndClearPendingSidebarAction() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY_PENDING_SIDEBAR_ACTION);
      if (!raw) return '';
      window.sessionStorage.removeItem(STORAGE_KEY_PENDING_SIDEBAR_ACTION);
      const parsed = JSON.parse(raw);
      return String(parsed?.action || '').trim();
    } catch (_) {
      return '';
    }
  }

  function mountTabViews() {
    const body = shell.paneBody;
    if (!body) return;
    body.querySelectorAll('.workspace-pane-empty').forEach((row) => row.remove());

    state.tabOrder.forEach((tabId) => {
      const tab = getTab(tabId);
      if (!tab || !tab.viewEl) return;
      if (tab.viewEl.parentElement !== body) {
        body.appendChild(tab.viewEl);
      }
      const active = tab.id === state.activeTabId;
      tab.viewEl.hidden = !active;
      tab.viewEl.classList.toggle('is-active', active);
    });

    if (!state.tabOrder.length) {
      const empty = document.createElement('div');
      empty.className = 'workspace-pane-empty';
      empty.setAttribute('aria-label', 'ファイル未選択時の案内');

      const logo = document.createElement('img');
      logo.className = 'workspace-pane-empty__logo';
      logo.src = './icons/ziz_one.svg';
      logo.alt = '';
      logo.setAttribute('aria-hidden', 'true');

      const message = document.createElement('div');
      message.className = 'workspace-pane-empty__message';
      [
        '・左のサイドバーからファイルを選択できます',
        '・左のサイドバーで右クリックすると、メニューがでます。'
      ].forEach((text) => {
        const line = document.createElement('div');
        line.textContent = text;
        message.appendChild(line);
      });

      empty.appendChild(logo);
      empty.appendChild(message);
      body.appendChild(empty);
    }
  }

  // Catalog activity independently reads the active tab's extension and (for a flow
  // tab) its embedded API through window.zizWorkspace; this event lets a mounted
  // CatalogPanel refresh live without polling or reaching into Workspace internals.
  function activeTabCatalogExtension() {
    const tab = activeTab();
    if (!tab) return '';
    const ext = fileExtensionFromPath(tab.relPath || tab.name || '');
    return (ext === 'zizd' || ext === 'sql' || ext === 'md') ? ext : '';
  }

  function notifyCatalogContextChanged() {
    window.dispatchEvent(new CustomEvent('ziz:workspace-catalog-context-changed', {
      detail: { extension: activeTabCatalogExtension() },
    }));
  }

  function activateTab(tabId) {
    const tab = getTab(tabId);
    if (!tab) return;
    state.activeTabId = tabId;
    mountTabViews();
    renderTabs();
    if (isFlowTab(tab)) {
      syncGlobalFlowNameInput(tab);
      void ensureFlowTabLoaded(tab);
    }
    notifyCatalogContextChanged();
  }

  async function saveTab(tabId, options = {}) {
    const tab = getTab(tabId);
    if (!tab || tab.kind !== 'text') return true;
    try {
      const payload = {
        scope: tab.scope,
        rel_path: tab.relPath,
        content: String(tab.content || ''),
        expected_mtime_ns: options.force ? null : (tab.mtimeNs || null),
        force: !!options.force,
      };
      logSaveTrace('saveTab.request', {
        tab_id: tab.id,
        scope: payload.scope,
        rel_path: payload.rel_path,
        expected_mtime_ns: payload.expected_mtime_ns,
        force: payload.force,
        content_length: String(payload.content || '').length,
      });
      const result = await bridge.call('workspace.writeText', payload);
      logSaveTrace('saveTab.response', {
        tab_id: tab.id,
        saved: !!result?.saved,
        mtime_ns: result?.mtime_ns || '',
        size: Number(result?.size || 0),
        file_name: String(result?.file_name || ''),
      });
      tab.mtimeNs = normalizeMtimeNs(result?.mtime_ns) || tab.mtimeNs || '';
      tab.dirty = false;
      renderTabs();
      return true;
    } catch (error) {
      const normalized = normalizeError(error);
      logSaveTrace('saveTab.error', {
        tab_id: tab.id,
        code: normalized.code,
        message: normalized.message,
      });
      if (normalized.code !== 'E_CONFLICT') {
        showMessage(`保存に失敗しました。\n${normalized.message}`, { kind: 'error', title: '保存エラー' });
        return false;
      }
      const decision = askConflictDecision(tab);
      if (decision === 'reload') {
        const reloaded = await reloadTab(tab.id, { force: true });
        if (reloaded) {
          showMessage('外部更新版を再読み込みしました。', { kind: 'info', title: '再読み込み' });
        }
        return reloaded;
      }
      if (decision === 'overwrite') {
        return saveTab(tab.id, { force: true });
      }
      if (decision === 'save-as') {
        const nextRelPath = window.prompt('別名保存先 (相対パス) を入力してください', tab.relPath);
        if (!nextRelPath) return false;
        const oldRelPath = tab.relPath;
        tab.relPath = String(nextRelPath).replace(/\\/g, '/');
        tab.name = stripExtension(tab.relPath.split('/').pop() || tab.name);
        const saved = await saveTab(tab.id, { force: true });
        if (!saved) {
          tab.relPath = oldRelPath;
        }
        renderTabs();
        return saved;
      }
      return false;
    }
  }

  async function reloadTab(tabId, options = {}) {
    const tab = getTab(tabId);
    if (!tab || tab.kind !== 'text') return false;
    if (tab.dirty && !options.force) {
      const ok = await dialog?.confirm?.('未保存の変更があります。再読み込みしますか？', { title: '確認', kind: 'warning' });
      if (!ok) return false;
    }
    try {
      const result = await bridge.call('workspace.readText', {
        scope: tab.scope,
        rel_path: tab.relPath,
      });
      tab.content = String(result?.content || '');
      tab.mtimeNs = normalizeMtimeNs(result?.mtime_ns);
      tab.dirty = false;
      if (tab.markdownEditorController) {
        tab.markdownEditorController.setValue(tab.content);
        syncMarkdownArticleTitle(tab);
      } else if (tab.textareaEl) {
        tab.__suppressEditorInputSync = true;
        tab.textareaEl.value = tab.content;
        if (tab.codeEditorLanguage) {
          tab.textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        tab.__suppressEditorInputSync = false;
      }
      renderTabs();
      return true;
    } catch (error) {
      const normalized = normalizeError(error);
      showMessage(`再読み込みに失敗しました。\n${normalized.message}`, { kind: 'error', title: '再読み込みエラー' });
      return false;
    }
  }

  async function requestTabClose(tabId, options = {}) {
    const tab = getTab(tabId);
    if (!tab) return true;
    if (isTabRunning(tab.id)) {
      showMessage('実行中のタブは閉じられません。', { kind: 'warning', title: '実行中' });
      return false;
    }
    if (tab.dirty && !options.skipPrompt) {
      const decision = await askSaveDecision(tab);
      if (decision === 'cancel') return false;
      if (decision === 'save') {
        const saved = await saveTab(tab.id);
        if (!saved) return false;
      }
    }

    const tabIndex = state.tabOrder.indexOf(tab.id);
    if (tabIndex >= 0) state.tabOrder.splice(tabIndex, 1);
    if (state.activeTabId === tab.id) {
      state.activeTabId = state.tabOrder[tabIndex] || state.tabOrder[tabIndex - 1] || '';
    }
    if (isFlowTab(tab) && tab.iframeEl) {
      if (bridge?.available?.()) {
        try {
          await bridge.call('flow.tabClosed', {
            workspace_tab_id: String(tab.id || ''),
          });
        } catch (error) {
          logInfo('flow.tabClosed failed', normalizeError(error));
        }
      }
      try {
        tab.iframeEl.src = 'about:blank';
      } catch (_) {
        // ignore
      }
    }
    if (tab.viewEl) {
      tab.viewEl.remove();
    }
    tab.codeEditorController = null;
    if (tab.markdownEditorController) {
      if (tab.markdownEditorHost && tab.markdownLinkClickHandler) {
        tab.markdownEditorHost.removeEventListener('click', tab.markdownLinkClickHandler);
      }
      try {
        tab.markdownEditorController.destroy();
      } catch (error) {
        logInfo('markdownEditorController.destroy failed', normalizeError(error));
      }
      tab.markdownEditorController = null;
      tab.markdownEditorHost = null;
      tab.markdownLinkClickHandler = null;
      tab.markdownModeButtons = null;
    }
    if (runningFlowTabId === tab.id) runningFlowTabId = '';
    delete state.tabStore[tab.id];
    mountTabViews();
    renderTabs();
    const nextActive = activeTab();
    if (isFlowTab(nextActive)) {
      void ensureFlowTabLoaded(nextActive);
    }
    notifyCatalogContextChanged();
    return true;
  }

  function createSaveIconButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'workspace-text-save-btn';
    button.dataset.action = 'save';
    button.title = '保存';
    button.setAttribute('aria-label', '保存');
    const icon = document.createElement('img');
    icon.className = 'workspace-text-save-btn__icon';
    icon.src = './icons/save.svg';
    icon.alt = '';
    button.appendChild(icon);
    return button;
  }

  // Mode is tab-session-only Application state: it lives on the open tab object, is
  // never written to the Markdown file, a sidecar, or Runtime config, and always starts
  // at "view" for a freshly opened tab.
  function updateMarkdownModeButtons(tab) {
    const buttons = tab?.markdownModeButtons;
    if (!buttons) return;
    const mode = tab.markdownMode === 'view' ? 'view' : 'edit';
    Object.keys(buttons).forEach((key) => {
      const button = buttons[key];
      const pressed = key === mode;
      button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      button.classList.toggle('is-active', pressed);
    });
  }

  function applyMarkdownMode(tab, mode) {
    const nextMode = mode === 'view' ? 'view' : 'edit';
    tab.markdownMode = nextMode;
    const controller = tab.markdownEditorController;
    if (controller?.getMode?.() !== nextMode) {
      controller?.setMode?.(nextMode);
    }
    syncMarkdownArticleTitle(tab);
    updateMarkdownModeButtons(tab);
  }

  function syncMarkdownArticleTitle(tab) {
    const host = tab?.markdownEditorHost;
    const viewer = host?.querySelector?.('.mce-viewer');
    if (!viewer) return;
    viewer.querySelector(':scope > .workspace-markdown-article-title')?.remove();
    if (tab.markdownMode !== 'view') return;

    const titleText = String(host.querySelector('.mce-titlebar-title')?.textContent || '').trim();
    if (!titleText) return;
    const title = document.createElement('h1');
    title.className = 'mce-article-title workspace-markdown-article-title';
    title.textContent = titleText;
    viewer.prepend(title);
  }

  function createMarkdownModeToggle(tab) {
    const group = document.createElement('div');
    group.className = 'workspace-markdown-mode-toggle';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', '表示モード');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'workspace-markdown-mode-btn';
    editButton.dataset.markdownMode = 'edit';
    editButton.textContent = '編集';

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'workspace-markdown-mode-btn';
    viewButton.dataset.markdownMode = 'view';
    viewButton.textContent = '表示';

    group.appendChild(editButton);
    group.appendChild(viewButton);
    group.addEventListener('click', (event) => {
      const button = event.target?.closest?.('button[data-markdown-mode]');
      if (!button) return;
      applyMarkdownMode(tab, button.dataset.markdownMode);
    });

    tab.markdownMode = tab.markdownMode === 'edit' ? 'edit' : 'view';
    tab.markdownModeButtons = { edit: editButton, view: viewButton };
    updateMarkdownModeButtons(tab);
    return group;
  }

  function createFloatingEditorActions(tab, isSqlTab, isMarkdownTab) {
    const floating = document.createElement('div');
    floating.className = 'workspace-text-floating-actions';
    if (isSqlTab) {
      floating.appendChild(createSqlDialectSelect(tab));
    }
    if (isMarkdownTab) {
      floating.appendChild(createMarkdownModeToggle(tab));
    }
    floating.appendChild(createSaveIconButton());
    floating.addEventListener('click', async (event) => {
      const button = event.target?.closest?.('button[data-action="save"]');
      if (!button) return;
      await saveTab(tab.id);
    });
    return floating;
  }

  // Application Adapter boundary: only http/https URLs accepted by the real Bridge
  // isAllowedExternalUrl() are forwarded to openExternal(); every other anchor click
  // inside the viewer (javascript:, document links, etc.) is only ever prevented.
  function handleMarkdownViewerLinkClick(tab, event) {
    const anchor = event.target?.closest?.('a');
    if (!anchor || !anchor.closest('.mce-viewer')) return;
    event.preventDefault();
    const href = anchor.getAttribute('href') || '';
    if (!bridge?.isAllowedExternalUrl?.(href)) return;
    bridge.openExternal(href, { prefer: 'chrome' }).catch((error) => {
      const normalized = normalizeError(error);
      showMessage(`外部ブラウザで開けませんでした。\n${normalized.message}`, { kind: 'error', title: '外部リンクエラー' });
    });
  }

  function mountMarkdownEditorView(tab, frame) {
    const host = document.createElement('div');
    host.className = 'workspace-markdown-editor-host';
    frame.appendChild(host);

    const MarkdownEditorCtor = getMarkdownEditorCtor();
    if (!MarkdownEditorCtor) {
      console.warn('[workspace] MarkdownEditor library is not available');
      return;
    }

    const editor = new MarkdownEditorCtor(host, {
      value: tab.content,
      saveButton: false,
      pageTree: true,
      documents: [],
    });

    editor.addEventListener('md:change', () => {
      if (isTabRunning(tab.id)) {
        editor.setValue(tab.content);
        showMessage('実行中のタブは編集できません。', { kind: 'warning', title: '実行中' });
        return;
      }
      tab.content = editor.getValue();
      tab.dirty = true;
      renderTabs();
    });

    host.addEventListener('focusin', () => {
      if (state.activeTabId !== tab.id) activateTab(tab.id);
    });

    tab.markdownLinkClickHandler = (event) => handleMarkdownViewerLinkClick(tab, event);
    host.addEventListener('click', tab.markdownLinkClickHandler);
    tab.markdownEditorHost = host;
    tab.markdownEditorController = editor;
    applyMarkdownMode(tab, tab.markdownMode);
  }

  function createTextView(tab) {
    const wrap = document.createElement('div');
    wrap.className = 'workspace-text-view';
    wrap.dataset.tabId = tab.id;

    const isMarkdownTab = isWorkspaceMarkdownTab(tab);
    const language = isMarkdownTab ? '' : getWorkspaceEditorLanguage(tab);
    const isSqlTab = language === 'sql';
    if (isSqlTab) {
      tab.sqlDialect = normalizeWorkspaceSqlDialect(tab.sqlDialect);
    }

    const frame = document.createElement('div');
    frame.className = 'workspace-text-editor-frame';
    frame.appendChild(createFloatingEditorActions(tab, isSqlTab, isMarkdownTab));

    if (isMarkdownTab) {
      mountMarkdownEditorView(tab, frame);
      wrap.appendChild(frame);
      return wrap;
    }

    const textarea = document.createElement('textarea');
    textarea.className = language ? 'workspace-text-editor code-editor-fallback' : 'workspace-text-editor';
    textarea.spellcheck = false;
    textarea.value = tab.content;

    textarea.addEventListener('input', () => {
      if (tab.__suppressEditorInputSync) {
        tab.content = textarea.value;
        return;
      }
      if (isTabRunning(tab.id)) {
        textarea.value = tab.content;
        showMessage('実行中のタブは編集できません。', { kind: 'warning', title: '実行中' });
        return;
      }
      tab.content = textarea.value;
      tab.dirty = true;
      renderTabs();
    });

    textarea.addEventListener('focus', () => {
      if (state.activeTabId !== tab.id) activateTab(tab.id);
    });

    wrap.appendChild(frame);
    if (language) {
      tab.codeEditorLanguage = language;
      const editorHost = document.createElement('div');
      editorHost.className = 'workspace-text-editor-host code-editor';
      editorHost.appendChild(textarea);
      frame.appendChild(editorHost);
      ensureCodeEditorsApi()
        .then((codeEditorsApi) => {
          if (!codeEditorsApi || typeof codeEditorsApi.mountCodeEditor !== 'function') return;
          return codeEditorsApi.mountCodeEditor({
            input: textarea,
            value: textarea.value,
            language,
            sqlDialect: isSqlTab ? tab.sqlDialect : '',
            connectorId: '',
            variableNames: [],
            suggestionHost: editorHost,
          });
        })
        .then((mounted) => {
          if (!mounted) return;
          tab.codeEditorController = mounted;
          if (isSqlTab) applyTabSqlDialect(tab);
        })
        .catch((error) => {
          console.warn('[workspace] code editor mount failed', error);
        });
    } else {
      frame.appendChild(textarea);
    }
    tab.textareaEl = textarea;
    return wrap;
  }

  async function ensureTabCapacity() {
    if (allClosableTabs().length < MAX_OPEN_TABS) return true;
    const tab = allClosableTabs().slice().reverse().find((item) => !isTabRunning(item.id));
    if (!tab) {
      showMessage('実行中タブ以外を閉じられないため、新しいタブを開けません。', { kind: 'warning', title: '上限到達' });
      return false;
    }
    if (tab.kind === 'text' && tab.dirty) {
      const decision = await askSaveDecision(tab);
      if (decision === 'cancel') return false;
      if (decision === 'save') {
        const saved = await saveTab(tab.id);
        if (!saved) return false;
      }
    }
    return requestTabClose(tab.id, { skipPrompt: true });
  }

  function normalizeTabId(scope, relPath) {
    return `tab-text:${scope}:${String(relPath || '').replace(/\\/g, '/').toLowerCase()}`;
  }

  function normalizeFlowTabId(scope, relPath) {
    return `tab-flow:${scope}:${String(relPath || '').replace(/\\/g, '/').toLowerCase()}`;
  }

  function buildEmbeddedFlowUrl(tab) {
    const target = new URL('./dataflow.html', window.location.href);
    const runtimeVersion = new URLSearchParams(window.location.search).get('v');
    if (runtimeVersion) target.searchParams.set('v', runtimeVersion);
    target.searchParams.set('embedded', '1');
    target.searchParams.set('open_scope', tab.scope === 'config' ? 'config' : 'root');
    target.searchParams.set('open_rel_path', String(tab.relPath || '').replace(/\\/g, '/'));
    return target.toString();
  }

  function getFlowTabApi(tab) {
    const frameWindow = tab?.iframeEl?.contentWindow;
    return frameWindow?.zizEmbeddedApi || null;
  }

  // Catalog activation only sets the internal node-template clipboard (see
  // catalog.adapter.js); it never moves keyboard focus itself, which would otherwise
  // leave it on the Catalog's own <button> item. An immediate Ctrl+V needs the active
  // flow iframe's own workflow-designer shell (its keydown-driven "selection.paste"
  // command) to hold focus instead.
  function focusActiveFlowCanvas() {
    const canvas = activeTab()?.iframeEl?.contentDocument?.querySelector('[data-workflow-designer]') || null;
    if (!canvas || typeof canvas.focus !== 'function') return false;
    canvas.focus();
    return true;
  }

  function createFlowLoadError(message, code = 'E_FLOW_LOAD') {
    const error = new Error(String(message || 'フロー読込に失敗しました。'));
    error.code = String(code || 'E_FLOW_LOAD');
    return error;
  }

  async function waitForFlowTabApi(tab, options = {}) {
    const timeoutMs = Math.max(300, Number(options.timeoutMs) || 4000);
    const intervalMs = Math.max(20, Number(options.intervalMs) || 80);
    const startedAt = Date.now();
    while ((Date.now() - startedAt) < timeoutMs) {
      const api = getFlowTabApi(tab);
      if (api && typeof api === 'object') return api;
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
    return null;
  }

  function clearFlowLoadAck(tab) {
    if (!tab) return;
    if (tab.flowLoadAckTimer) {
      window.clearTimeout(tab.flowLoadAckTimer);
      tab.flowLoadAckTimer = 0;
    }
    tab.flowLoadPending = null;
  }

  function startFlowLoadAck(tab, requestId, timeoutMs = 6000) {
    clearFlowLoadAck(tab);
    return new Promise((resolve, reject) => {
      const normalizedRequestId = String(requestId || '').trim();
      tab.flowLoadPending = {
        requestId: normalizedRequestId,
        resolve,
        reject,
      };
      tab.flowLoadAckTimer = window.setTimeout(() => {
        const pending = tab.flowLoadPending;
        clearFlowLoadAck(tab);
        if (!pending) return;
        reject(createFlowLoadError('読込完了イベントが返らずタイムアウトしました。', 'E_FLOW_LOAD_TIMEOUT'));
      }, Math.max(500, Number(timeoutMs) || 6000));
    });
  }

  function settleFlowLoadAck(tab, status, detail = {}) {
    const pending = tab?.flowLoadPending;
    if (!pending) return false;
    const incomingRequestId = String(detail?.request_id || detail?.__workspace_request_id || '').trim();
    if (incomingRequestId && incomingRequestId !== String(pending.requestId || '')) return false;
    clearFlowLoadAck(tab);
    if (status === 'loaded') {
      pending.resolve(detail);
      return true;
    }
    pending.reject(createFlowLoadError(detail?.message || 'フロー読込に失敗しました。', detail?.code || 'E_FLOW_LOAD_CHILD'));
    return true;
  }

  function findTabIdByFrameWindow(sourceWindow) {
    const tabs = allTabs();
    for (let i = 0; i < tabs.length; i += 1) {
      const tab = tabs[i];
      if (!isFlowTab(tab)) continue;
      if (tab.iframeEl?.contentWindow === sourceWindow) return tab.id;
    }
    return '';
  }

  function createFlowView(tab) {
    const wrap = document.createElement('div');
    wrap.className = 'workspace-flow-view';
    wrap.dataset.tabId = tab.id;

    const frame = document.createElement('iframe');
    frame.className = 'workspace-flow-frame';
    frame.setAttribute('loading', 'eager');
    frame.setAttribute('allow', 'clipboard-read; clipboard-write');
    frame.src = buildEmbeddedFlowUrl(tab);
    frame.addEventListener('load', () => {
      tab.flowFrameReady = true;
      tab.flowPayloadApplied = false;
      tab.flowForceReload = true;
      void ensureFlowTabLoaded(tab);
    });
    wrap.appendChild(frame);
    tab.iframeEl = frame;
    tab.viewEl = wrap;
    return wrap;
  }

  function dispatchFlowPayloadToFrame(tab, payload, requestId = '') {
    const frameWindow = tab?.iframeEl?.contentWindow;
    if (!frameWindow) return false;
    try {
      const detail = {
        ...(payload && typeof payload === 'object' ? payload : {}),
        __workspace_tab_id: String(tab.id || ''),
        __workspace_request_id: String(requestId || ''),
      };
      frameWindow.dispatchEvent(new frameWindow.CustomEvent('ziz:workspace-flow-open', { detail }));
      frameWindow.dispatchEvent(new frameWindow.CustomEvent('ziz:workspace-flow-tab-activated', {
        detail: { tab_id: String(tab.id || '') },
      }));
      return true;
    } catch (error) {
      logInfo('dispatchFlowPayloadToFrame failed', normalizeError(error));
      return false;
    }
  }

  async function fetchFlowPayloadByPath(scope, relPath, workspaceTabId = '') {
    if (!bridge?.available?.()) return null;
    return bridge.call('flow.load', {
      scope: scope === 'config' ? 'config' : 'root',
      rel_path: String(relPath || '').replace(/\\/g, '/'),
      workspace_tab_id: String(workspaceTabId || ''),
    });
  }

  async function fetchFlowPayload(tab) {
    return fetchFlowPayloadByPath(tab.scope, tab.relPath, tab.id);
  }

  async function fetchFlowMtime(tab) {
    if (!bridge?.available?.()) return 0;
    const scope = tab.scope === 'config' ? 'config' : 'root';
    const relPath = String(tab.relPath || '').replace(/\\/g, '/');
    try {
      const stat = await bridge.call('workspace.stat', {
        scope,
        rel_path: relPath,
      });
      return Number(stat?.mtime_ns || 0);
    } catch (error) {
      const normalized = normalizeError(error);
      if (normalized.code !== 'E_ACCESS_DENIED' && normalized.code !== 'E_NOT_FOUND') {
        logInfo('workspace.stat failed; fallback to workspace.readText', normalized);
      }
      const text = await bridge.call('workspace.readText', {
        scope,
        rel_path: relPath,
      });
      return Number(text?.mtime_ns || 0);
    }
  }

  async function openTextFile(scope, relPath, options = {}) {
    if (state.globalStore.workspaceLocked) return false;
    const normalizedScope = scope === 'config' ? 'config' : 'root';
    const normalizedRelPath = String(relPath || '').replace(/\\/g, '/');
    const tabId = normalizeTabId(normalizedScope, normalizedRelPath);
    const existing = getTab(tabId);
    if (existing) {
      activateTab(tabId);
      return true;
    }

    if (!options.bypassLimit) {
      const ok = await ensureTabCapacity();
      if (!ok) return false;
    }

    try {
      const result = await bridge.call('workspace.readText', {
        scope: normalizedScope,
        rel_path: normalizedRelPath,
      });
      const tab = {
        id: tabId,
        kind: 'text',
        name: stripExtension(String(result?.file_name || normalizedRelPath.split('/').pop() || normalizedRelPath)),
        scope: normalizedScope,
        relPath: normalizedRelPath,
        dirty: false,
        closable: true,
        content: String(result?.content || ''),
        mtimeNs: normalizeMtimeNs(result?.mtime_ns),
      };
      tab.viewEl = createTextView(tab);
      addTab(tab, options.orderIndex);
      return true;
    } catch (error) {
      const normalized = normalizeError(error);
      showMessage(`ファイルを開けませんでした。\n${normalized.message}`, { kind: 'error', title: 'オープンエラー' });
      return false;
    }
  }

  async function ensureFlowTabLoaded(tab) {
    if (!tab || !isFlowTab(tab)) return false;
    if (!tab.iframeEl) return false;
    if (tab.flowPayloadApplied && !tab.flowForceReload) {
      try {
        const latestMtimeNs = await fetchFlowMtime(tab);
        if (latestMtimeNs > 0 && Number(tab.flowLastMtimeNs || 0) === latestMtimeNs) {
          return true;
        }
        tab.flowCurrentMtimeNs = latestMtimeNs;
      } catch (error) {
        logInfo('fetchFlowMtime failed; continue reload', normalizeError(error));
      }
    }
    if (tab.flowLoadPromise) return !!(await tab.flowLoadPromise);
    tab.flowLoadPromise = (async () => {
      try {
        if (!tab.flowCurrentMtimeNs || tab.flowForceReload || !tab.flowPayloadApplied) {
          tab.flowCurrentMtimeNs = await fetchFlowMtime(tab);
        }
        if (!tab.flowPayload || tab.flowForceReload || tab.flowPayloadApplied) {
          tab.flowPayload = await fetchFlowPayload(tab);
        }
        if (!tab.flowPayload) return false;
        const api = await waitForFlowTabApi(tab);
        if (!api) {
          throw new Error('データフロー画面の初期化待機がタイムアウトしました。');
        }
        const requestId = `${String(tab.id || '')}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
        const ackPromise = startFlowLoadAck(tab, requestId, 6000);
        const dispatched = dispatchFlowPayloadToFrame(tab, tab.flowPayload, requestId);
        if (!dispatched) {
          clearFlowLoadAck(tab);
          throw createFlowLoadError('データフロー画面への読込指示に失敗しました。', 'E_FLOW_DISPATCH');
        }
        await ackPromise;
        const canonicalName = canonicalNameFromTab(tab);
        try {
          api?.setFlowName?.(canonicalName);
        } catch (_) {
          // ignore sync failure
        }
        tab.flowPayloadApplied = true;
        tab.flowForceReload = false;
        tab.flowLastMtimeNs = Number(tab.flowCurrentMtimeNs || tab.flowLastMtimeNs || 0);
        tab.flowLoadErrorShown = false;
        return true;
      } catch (error) {
        clearFlowLoadAck(tab);
        tab.flowPayloadApplied = false;
        tab.flowForceReload = true;
        const normalized = normalizeError(error);
        logInfo('ensureFlowTabLoaded failed', normalized);
        if (!tab.flowLoadErrorShown) {
          showMessage(`フローを開けませんでした。\n${normalized.message}`, { kind: 'error', title: 'オープンエラー' });
          tab.flowLoadErrorShown = true;
        }
        return false;
      } finally {
        tab.flowLoadPromise = null;
      }
    })();
    return !!(await tab.flowLoadPromise);
  }

  async function openFlowFile(scope, relPath, options = {}) {
    if (state.globalStore.workspaceLocked) return false;
    const normalizedScope = scope === 'config' ? 'config' : 'root';
    const normalizedRelPath = String(relPath || '').replace(/\\/g, '/');
    const tabId = normalizeFlowTabId(normalizedScope, normalizedRelPath);
    const existing = getTab(tabId);
    if (existing) {
      activateTab(existing.id);
      return true;
    }
    let preloadedFlowPayload = null;
    try {
      preloadedFlowPayload = await fetchFlowPayloadByPath(normalizedScope, normalizedRelPath, tabId);
      if (!preloadedFlowPayload || preloadedFlowPayload.selected === false) {
        return false;
      }
    } catch (error) {
      const normalized = normalizeError(error);
      showMessage(`フローを開けませんでした。\n${normalized.message}`, { kind: 'error', title: 'オープンエラー' });
      return false;
    }
    if (!options.bypassLimit) {
      const ok = await ensureTabCapacity();
      if (!ok) return false;
    }
    const fallbackTab = activeTab();
    const name = stripExtension(normalizedRelPath.split('/').pop() || normalizedRelPath || 'Dataflow');
    const tab = {
      id: tabId,
      kind: 'dataflow',
      name,
      scope: normalizedScope,
      relPath: normalizedRelPath,
      dirty: false,
      closable: true,
      viewEl: null,
      iframeEl: null,
      flowPayload: preloadedFlowPayload,
      flowPayloadApplied: false,
      flowFrameReady: false,
      flowLoadPromise: null,
      flowLoadErrorShown: false,
      flowLoadPending: null,
      flowLoadAckTimer: 0,
      flowCurrentMtimeNs: 0,
      flowLastMtimeNs: 0,
      flowForceReload: false,
      flowHasLoadedOnce: false,
      flowFallbackTabId: String(fallbackTab?.id || ''),
    };
    createFlowView(tab);
    addTab(tab, options.orderIndex);
    return true;
  }

  function openWorkspaceFile(scope, relPath, options = {}) {
    const extension = `.${fileExtensionFromPath(relPath)}`;
    return FLOW_EXTENSIONS.has(extension)
      ? openFlowFile(scope, relPath, options)
      : openTextFile(scope, relPath, options);
  }

  function renderTabs() {
    appShell.setTabs(
      allTabs().map((tab) => ({
        id: tab.id,
        title: tabDisplayName(tab),
        icon: resolveTabIconPath(tab),
        dirty: !!tab.dirty,
        closable: !!tab.closable,
        badge: isTabRunning(tab.id) ? '実行中' : '',
        reorderable: true,
        contextActions: tab.closable ? [{ id: 'close', label: '閉じる' }] : [],
      })),
      state.activeTabId
    );
  }

  function reorderTab(tabId, targetTabId, placement) {
    const sourceId = String(tabId || '');
    const targetId = String(targetTabId || '');
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = state.tabOrder.indexOf(sourceId);
    if (sourceIndex < 0) return;
    state.tabOrder.splice(sourceIndex, 1);
    const targetIndex = state.tabOrder.indexOf(targetId);
    const insertIndex = targetIndex < 0
      ? sourceIndex
      : (placement === 'after' ? targetIndex + 1 : targetIndex);
    state.tabOrder.splice(insertIndex, 0, sourceId);
    mountTabViews();
    renderTabs();
  }

  function bindShellTabEvents() {
    appShell.on('tab:activate', ({ tabId }) => {
      if (String(tabId || '') === String(state.activeTabId || '')) return;
      activateTab(tabId);
    });
    appShell.on('tab:close-request', ({ tabId }) => {
      void requestTabClose(tabId);
    });
    appShell.on('tab:reorder-request', ({ tabId, targetTabId, placement }) => {
      reorderTab(tabId, targetTabId, placement);
    });
    appShell.on('tab:context-action', ({ tabId, actionId }) => {
      if (String(actionId || '') !== 'close') return;
      void requestTabClose(tabId);
    });
  }

  function getGlobalHeaderButton(action) {
    const map = {
      undo: 'btnUndo',
      redo: 'btnRedo',
      run: 'btnRun',
      import: 'btnReset',
      save: 'btnSave',
    };
    const id = map[String(action || '')];
    return id ? document.getElementById(id) : null;
  }

  function syncGlobalFlowNameInput(tab) {
    if (!tab || !isFlowTab(tab)) return;
    const input = document.getElementById('flowName');
    if (!input) return;
    const value = canonicalNameFromTab(tab);
    if (input.value !== value) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function invokeTabAction(tabId, action) {
    try {
      const tab = getTab(tabId);
      logSaveTrace('invokeTabAction.enter', {
        action: String(action || ''),
        tab_id: tab?.id || '',
        tab_kind: tab?.kind || '',
      });
      if (!tab) return false;
      activateTab(tab.id);
      if (action === 'save') {
        if (tab.kind === 'text') return saveTab(tab.id);
        const api = getFlowTabApi(tab);
        logSaveTrace('invokeTabAction.flow.save.call', {
          tab_id: tab.id,
          has_api: !!api,
          has_save_flow: !!api?.saveFlow,
          scope: tab.scope,
          rel_path: tab.relPath,
        });
        if (!api?.saveFlow) return false;
        const result = await api.saveFlow();
        logSaveTrace('invokeTabAction.flow.save.response', {
          tab_id: tab.id,
          saved: !(result && result.saved === false),
          raw_saved: result?.saved,
          raw_message: result?.message || '',
        });
        return !(result && result.saved === false);
      }
      if (tab.kind === 'text') return false;
      const api = getFlowTabApi(tab);
      if (!api) return false;
      if (action === 'undo') {
        await api.undo?.();
        return true;
      }
      if (action === 'redo') {
        await api.redo?.();
        return true;
      }
      if (action === 'import') {
        await api.importFlow?.();
        return true;
      }
      if (action === 'run') {
        if (runningFlowTabId && runningFlowTabId !== tab.id) return false;
        if (runningFlowTabId === tab.id) return false;
        runningFlowTabId = tab.id;
        renderTabs();
        try {
          const result = await api.runFlow?.();
          if (!result || !result.run_id) {
            runningFlowTabId = '';
            renderTabs();
          }
          return true;
        } catch (_) {
          runningFlowTabId = '';
          renderTabs();
          throw _;
        }
      }
      return false;
    } catch (error) {
      const normalized = normalizeError(error);
      logSaveTrace('invokeTabAction.error', {
        tab_id: String(tabId || ''),
        action: String(action || ''),
        code: normalized.code,
        message: normalized.message,
      });
      showMessage(`操作に失敗しました。\n${normalized.message}`, { kind: 'error', title: 'エラー' });
      logInfo('invokeTabAction failed', normalized);
      return false;
    }
  }

  function invokeActiveTabAction(action) {
    const tab = activeTab();
    return invokeTabAction(tab?.id || '', action);
  }

  function ensureExplorerContextMenu() {
    if (explorerContextMenuEl) return explorerContextMenuEl;
    explorerContextMenuEl = document.createElement('div');
    explorerContextMenuEl.className = 'workspace-tab-menu';
    explorerContextMenuEl.hidden = true;
    explorerContextMenuEl.style.pointerEvents = 'none';
    document.body.appendChild(explorerContextMenuEl);
    document.addEventListener('click', (event) => {
      if (!explorerContextMenuEl || explorerContextMenuEl.hidden) return;
      if (event.target && explorerContextMenuEl.contains(event.target)) return;
      hideExplorerContextMenu();
    });
    return explorerContextMenuEl;
  }

  function hideExplorerContextMenu() {
    if (!explorerContextMenuEl) return;
    explorerContextMenuEl.hidden = true;
    explorerContextMenuEl.style.pointerEvents = 'none';
    explorerContextMenuEl.innerHTML = '';
  }

  function showExplorerContextMenu(meta, x, y) {
    const scope = meta?.scope === 'config' ? 'config' : 'root';
    const relPath = String(meta?.relPath || '').replace(/\\/g, '/');
    const kind = meta?.kind === 'dir' ? 'dir' : 'file';
    const canDelete = !!relPath;
    const canRename = kind === 'file' && !!relPath;
    const menu = ensureExplorerContextMenu();
    menu.dataset.scope = scope;
    menu.dataset.relPath = relPath;
    menu.dataset.kind = kind;
    menu.innerHTML = [
      '<button type="button" data-action="create-flow">ワークフローを作成 (.zizd)</button>',
      '<button type="button" data-action="create-sql">SQLを作成 (.sql)</button>',
      '<button type="button" data-action="create-md">メモを作成 (.md)</button>',
      '<button type="button" data-action="create-folder">フォルダを作成</button>',
      canRename ? '<button type="button" data-action="rename-target">ファイル名を変更</button>' : '',
      canDelete ? '<button type="button" data-action="delete-target">ファイルを削除</button>' : '',
    ].join('');
    menu.hidden = false;
    menu.style.pointerEvents = 'auto';
    menu.style.left = `${Math.max(8, x)}px`;
    menu.style.top = `${Math.max(8, y)}px`;
  }

  function parentRelPath(relPath) {
    const normalized = String(relPath || '').replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    if (idx < 0) return '';
    return normalized.slice(0, idx);
  }

  function toChildRelPath(dirRelPath, fileName) {
    const base = String(dirRelPath || '').replace(/\\/g, '/').replace(/\/+$/g, '');
    const child = String(fileName || '').replace(/\\/g, '/').replace(/^\/+/g, '');
    return base ? `${base}/${child}` : child;
  }

  function createFlowFileContent(flowName) {
    const safeName = String(flowName || '新規データフロー').replace(/'/g, "''");
    return [
      'metadata:',
      '  mode: dataflow',
      `  name: '${safeName}'`,
      'variables:',
      '  start: []',
      'steps:',
      '  - step_id: step1',
      '    connector: windows_connector',
      '    action: define_values',
      '    params: {}',
      '    output_variable: step1',
      'flows:',
      '  edges:',
      '    - from: START',
      '      to: step1',
      '      kind: primary',
      '      order: 1',
      '    - from: step1',
      '      to: END',
      '      kind: primary',
      '      order: 1',
      'notes: []',
      ''
    ].join('\n');
  }

  async function generateUniqueFileName(scope, dirRelPath, baseName, extension) {
    const entries = await loadTreeEntries(scope, dirRelPath);
    const existing = new Set(entries.map((entry) => String(entry?.name || '').toLowerCase()));
    let index = 0;
    while (index < 1000) {
      const suffix = index === 0 ? '' : `_${index + 1}`;
      const candidate = `${baseName}${suffix}${extension}`;
      if (!existing.has(candidate.toLowerCase())) return candidate;
      index += 1;
    }
    return `${baseName}_${Date.now()}${extension}`;
  }

  async function generateUniqueDirName(scope, dirRelPath, baseName) {
    const entries = await loadTreeEntries(scope, dirRelPath);
    const existing = new Set(entries.map((entry) => String(entry?.name || '').toLowerCase()));
    let index = 0;
    while (index < 1000) {
      const suffix = index === 0 ? '' : `_${index + 1}`;
      const candidate = `${baseName}${suffix}`;
      if (!existing.has(candidate.toLowerCase())) return candidate;
      index += 1;
    }
    return `${baseName}_${Date.now()}`;
  }

  async function closeTabsForDeletedPath(scope, relPath, kind) {
    const normalizedScope = scope === 'config' ? 'config' : 'root';
    const normalizedRelPath = String(relPath || '').replace(/\\/g, '/');
    const prefix = normalizedRelPath ? `${normalizedRelPath}/` : '';
    const targets = allTabs().filter((tab) => {
      if (!tab || tab.scope !== normalizedScope) return false;
      const tabRelPath = String(tab.relPath || '').replace(/\\/g, '/');
      if (kind === 'dir') return !!prefix && tabRelPath.startsWith(prefix);
      return tabRelPath === normalizedRelPath;
    });
    for (let i = 0; i < targets.length; i += 1) {
      await requestTabClose(targets[i].id, { skipPrompt: true });
    }
  }

  async function createExplorerFile(action, scope, relPath, kind) {
    const targetScope = scope === 'config' ? 'config' : 'root';
    const targetKind = kind === 'dir' ? 'dir' : 'file';
    const baseDir = targetKind === 'dir' ? relPath : parentRelPath(relPath);
    const actionMap = {
      'create-flow': { baseName: 'new_flow', extension: '.zizd' },
      'create-sql': { baseName: 'new_sql', extension: '.sql' },
      'create-md': { baseName: 'new_memo', extension: '.md' },
    };
    const meta = actionMap[action];
    if (!meta) return;
    const fileName = await generateUniqueFileName(targetScope, baseDir, meta.baseName, meta.extension);
    const newRelPath = toChildRelPath(baseDir, fileName);
    const fileStem = fileName.replace(/\.[^.]+$/, '');
    let content = '';
    if (meta.extension === '.zizd') content = createFlowFileContent(fileStem);
    if (meta.extension === '.sql') content = '-- SQL\n';
    if (meta.extension === '.md') content = '# メモ\n';
    await bridge.call('workspace.writeText', {
      scope: targetScope,
      rel_path: newRelPath,
      content,
      force: false,
    });
    await openWorkspaceFile(targetScope, newRelPath);
  }

  async function createExplorerFolder(scope, relPath, kind) {
    const targetScope = scope === 'config' ? 'config' : 'root';
    const targetKind = kind === 'dir' ? 'dir' : 'file';
    const baseDir = targetKind === 'dir' ? relPath : parentRelPath(relPath);
    const dirName = await generateUniqueDirName(targetScope, baseDir, 'new_folder');
    const newRelPath = toChildRelPath(baseDir, dirName);
    await bridge.call('workspace.mkdir', {
      scope: targetScope,
      rel_path: newRelPath,
    });
  }

  async function deleteExplorerTarget(scope, relPath, kind) {
    const targetScope = scope === 'config' ? 'config' : 'root';
    const normalizedRelPath = String(relPath || '').replace(/\\/g, '/');
    if (!normalizedRelPath) return;
    const confirmed = window.confirm(`削除しますか？\n${normalizedRelPath}`);
    if (!confirmed) return;
    const result = await bridge.call('workspace.delete', {
      scope: targetScope,
      rel_path: normalizedRelPath,
    });
    await closeTabsForDeletedPath(targetScope, normalizedRelPath, kind === 'dir' ? 'dir' : String(result?.kind || 'file'));
  }

  async function renameExplorerTarget(scope, relPath, kind) {
    const targetScope = scope === 'config' ? 'config' : 'root';
    const targetKind = kind === 'dir' ? 'dir' : 'file';
    if (targetKind !== 'file') return;
    const oldRelPath = String(relPath || '').replace(/\\/g, '/');
    if (!oldRelPath) return;

    const oldName = fileNameFromRelPath(oldRelPath);
    const nextNameRaw = window.prompt('新しいファイル名を入力してください', oldName);
    if (nextNameRaw == null) return;
    const nextName = String(nextNameRaw || '').trim();
    if (!nextName) throw new Error('ファイル名が未入力です。');
    if (/[\\/]/.test(nextName)) throw new Error('ファイル名に / や \\ は使用できません。');
    if (nextName === '.' || nextName === '..') throw new Error('不正なファイル名です。');
    if (nextName === oldName) return;

    const baseDir = parentRelPath(oldRelPath);
    const nextRelPath = toChildRelPath(baseDir, nextName);
    if (String(nextRelPath).toLowerCase() === String(oldRelPath).toLowerCase()) return;

    const entries = await loadTreeEntries(targetScope, baseDir);
    const duplicate = entries.some((entry) => (
      String(entry?.kind || '') === 'file'
      && String(entry?.name || '').toLowerCase() === nextName.toLowerCase()
      && String(entry?.rel_path || '').replace(/\\/g, '/').toLowerCase() !== oldRelPath.toLowerCase()
    ));
    if (duplicate) throw new Error('同名のファイルが既に存在します。');

    const openedTabs = allTabs().filter((tab) => (
      !!tab
      && String(tab.scope || '') === targetScope
      && String(tab.relPath || '').replace(/\\/g, '/').toLowerCase() === oldRelPath.toLowerCase()
    ));
    const dirtyTab = openedTabs.find((tab) => !!tab?.dirty);
    if (dirtyTab) {
      throw new Error('対象ファイルに未保存の変更があります。先に保存してからリネームしてください。');
    }
    const reopenPlans = openedTabs.map((tab) => state.tabOrder.indexOf(tab.id));
    for (let i = 0; i < openedTabs.length; i += 1) {
      await requestTabClose(openedTabs[i].id, { skipPrompt: true });
    }

    const filePayload = await bridge.call('workspace.readText', {
      scope: targetScope,
      rel_path: oldRelPath,
    });
    await bridge.call('workspace.writeText', {
      scope: targetScope,
      rel_path: nextRelPath,
      content: String(filePayload?.content || ''),
      force: false,
    });
    await bridge.call('workspace.delete', {
      scope: targetScope,
      rel_path: oldRelPath,
    });

    for (let i = 0; i < reopenPlans.length; i += 1) {
      await openWorkspaceFile(targetScope, nextRelPath, {
        orderIndex: reopenPlans[i],
        bypassLimit: true,
      });
    }
  }

  function bindExplorerContextMenuActions() {
    const menu = ensureExplorerContextMenu();
    menu.addEventListener('click', async (event) => {
      const targetEl = event.target instanceof Element ? event.target : event.target?.parentElement;
      const button = targetEl?.closest?.('button[data-action]');
      if (!button) return;
      const action = String(button.getAttribute('data-action') || '').trim();
      const scope = String(menu.dataset.scope || 'root');
      const relPath = String(menu.dataset.relPath || '').replace(/\\/g, '/');
      const kind = String(menu.dataset.kind || 'file');
      hideExplorerContextMenu();
      try {
        if (action === 'delete-target') {
          await deleteExplorerTarget(scope, relPath, kind);
        } else if (action === 'rename-target') {
          await renameExplorerTarget(scope, relPath, kind);
        } else if (action === 'create-folder') {
          await createExplorerFolder(scope, relPath, kind);
        } else {
          await createExplorerFile(action, scope, relPath, kind);
        }
      } catch (error) {
        const normalized = normalizeError(error);
        showMessage(`処理に失敗しました。\n${normalized.message}`, { kind: 'error', title: 'エクスプローラー' });
      }
      await renderLeftArea();
    });
  }

  async function confirmAndCloseDirtyTabs(tabs) {
    for (let i = 0; i < tabs.length; i += 1) {
      const tab = tabs[i];
      if (!tab.dirty) continue;
      const decision = await askSaveDecision(tab);
      if (decision === 'cancel') return false;
      if (decision === 'save') {
        let saved = false;
        if (tab.kind === 'text') {
          saved = await saveTab(tab.id);
        } else if (tab.kind === 'dataflow') {
          const api = getFlowTabApi(tab);
          if (!api?.saveFlow) {
            saved = false;
          } else {
            try {
              const result = await api.saveFlow();
              saved = !(result && result.saved === false);
            } catch (_) {
              saved = false;
            }
          }
        }
        if (!saved) {
          showMessage(`${tabDisplayName(tab)} の保存に失敗したため、ルート変更を中止しました。`, { kind: 'error', title: '保存エラー' });
          return false;
        }
      }
    }
    return true;
  }

  async function closeAllTabsOnRootChange() {
    const tabs = allClosableTabs();
    for (let i = 0; i < tabs.length; i += 1) {
      const closed = await requestTabClose(tabs[i].id, { skipPrompt: true });
      if (!closed) return false;
    }
    hardResetWorkspaceTabState();
    return true;
  }

  function hardResetWorkspaceTabState() {
    state.tabStore = {};
    state.tabOrder = [];
    state.activeTabId = '';
    runningFlowTabId = '';
    if (shell.paneBody) shell.paneBody.innerHTML = '';
    mountTabViews();
    renderTabs();
  }

  async function changeWorkspaceRootByPicker() {
    if (!bridge?.available?.()) {
      showMessage('プロジェクト選択はアプリ起動時のみ利用できます。', { kind: 'warning', title: '利用不可' });
      return;
    }
    if (runningFlowTabId) {
      showMessage('実行中はルート変更できません。実行完了後に再実行してください。', { kind: 'warning', title: '実行中' });
      return;
    }
    const dirtyTabs = allClosableTabs().filter((tab) => tab.dirty);
    const okToProceed = await confirmAndCloseDirtyTabs(dirtyTabs);
    if (!okToProceed) return;
    let payload = null;
    try {
      // ダイアログ表示中はロックしない（固まって見えるのを防ぐ）
      payload = await bridge.call('workspace.pickRoot', {
        title: 'ワークスペースルートを選択',
        current_value: state.globalStore.workspaceRoot,
      });
    } catch (error) {
      const normalized = normalizeError(error);
      showMessage(`ルート選択に失敗しました。\n${normalized.message}`, { kind: 'error', title: 'ルート選択エラー' });
      return;
    }
    if (!payload?.selected) return;

    try {
      const closedAll = await closeAllTabsOnRootChange();
      if (!closedAll) return;
      const applied = await bridge.call('workspace.setRoot', { root_path: String(payload.root_path || '') });
      state.globalStore.workspaceRoot = String(applied?.root_path || payload.root_path || '');
      state.globalStore.configRoot = String(applied?.config_path || payload.config_path || '');
      pushRecentRoot(state.globalStore.workspaceRoot, { skipScheduleSave: true });
      await flushRecentRootsSaveToConfig();
      await renderLeftArea({ skipRecentRootsReload: true });
    } catch (error) {
      const normalized = normalizeError(error);
      showMessage(`ルート変更に失敗しました。\n${normalized.message}`, { kind: 'error', title: 'ルート変更エラー' });
    }
  }

  async function changeWorkspaceRootByPath(rootPath) {
    const targetRoot = normalizeRootPath(rootPath);
    if (!targetRoot) return;
    if (!bridge?.available?.()) {
      showMessage('プロジェクト選択はアプリ起動時のみ利用できます。', { kind: 'warning', title: '利用不可' });
      return;
    }
    if (runningFlowTabId) {
      showMessage('実行中はルート変更できません。実行完了後に再実行してください。', { kind: 'warning', title: '実行中' });
      return;
    }
    const dirtyTabs = allClosableTabs().filter((tab) => tab.dirty);
    const okToProceed = await confirmAndCloseDirtyTabs(dirtyTabs);
    if (!okToProceed) return;
    try {
      const closedAll = await closeAllTabsOnRootChange();
      if (!closedAll) return;
      const payload = await bridge.call('workspace.setRoot', { root_path: targetRoot });
      state.globalStore.workspaceRoot = String(payload?.root_path || targetRoot);
      state.globalStore.configRoot = String(payload?.config_path || state.globalStore.configRoot || '');
      pushRecentRoot(state.globalStore.workspaceRoot, { skipScheduleSave: true });
      await flushRecentRootsSaveToConfig();
      await renderLeftArea({ skipRecentRootsReload: true });
    } catch (error) {
      const normalized = normalizeError(error);
      showMessage(`ルート変更に失敗しました。\n${normalized.message}`, { kind: 'error', title: 'ルート変更エラー' });
    }
  }

  function renderProjectPanel(host) {
    const recentRoots = Array.isArray(state.globalStore.recentRoots)
      ? normalizeRecentRootsList(state.globalStore.recentRoots).slice(0, MAX_RECENT_ROOTS)
      : [];
    const recentRows = recentRoots.length
      ? recentRoots.map((entry) => {
        const rootPath = normalizeRootPath(entry.path);
        const folderName = getRootFolderName(rootPath);
        const selected = isSameRootPath(rootPath, state.globalStore.workspaceRoot);
        const accessedAt = formatRecentRootDateTime(entry.last_accessed_at);
        return [
          `<button type="button" class="workspace-recent-root-btn${selected ? ' is-selected' : ''}" data-root-path="${escapeHtml(rootPath)}" title="${escapeHtml(rootPath)}">`,
          `  <span class="workspace-recent-root-name">${escapeHtml(folderName)}</span>`,
          `  <span class="workspace-recent-root-path">(${escapeHtml(rootPath)})</span>`,
          `  <span class="workspace-recent-root-accessed">${escapeHtml(accessedAt)}</span>`,
          '</button>'
        ].join('');
      }).join('')
      : '<div class="workspace-empty">履歴はありません。</div>';
    host.innerHTML = [
      '<div class="workspace-project-panel">',
      '  <button type="button" id="workspacePickRootBtn">ルートフォルダを選択</button>',
      '  <div class="workspace-project-recent">',
      '    <div class="workspace-project-recent__title">最近使ったプロジェクト（最大10件）</div>',
      `    <div class="workspace-project-recent__list">${recentRows}</div>`,
      '  </div>',
      '</div>'
    ].join('');

    const pickButton = host.querySelector('#workspacePickRootBtn');
    if (pickButton) {
      pickButton.addEventListener('click', () => {
        void changeWorkspaceRootByPicker();
      });
    }
    host.querySelectorAll('.workspace-recent-root-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const rootPath = String(button.getAttribute('data-root-path') || '').trim();
        if (!rootPath) return;
        void changeWorkspaceRootByPath(rootPath);
      });
    });
  }

  async function loadTreeEntries(scope, relPath) {
    const result = await bridge.call('workspace.list', {
      scope,
      rel_path: relPath,
    });
    return Array.isArray(result?.entries) ? result.entries : [];
  }

  function renderTreeFileRow(scope, relPath, name) {
    const row = document.createElement('div');
    row.className = 'workspace-tree-file';
    const fileName = String(name || '');
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
    const iconPath = String(fileIconMap[ext] || fileIconMap.default || DEFAULT_FILE_ICON_MAP.default);
    const icon = document.createElement('img');
    icon.className = 'workspace-tree-file-icon';
    icon.src = iconPath;
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    icon.addEventListener('error', () => {
      const fallback = String(fileIconMap.default || DEFAULT_FILE_ICON_MAP.default);
      if (icon.getAttribute('src') !== fallback) {
        icon.src = fallback;
      }
    });
    const label = document.createElement('span');
    label.className = 'workspace-tree-file-name';
    label.textContent = fileName;
    row.appendChild(icon);
    row.appendChild(label);
    row.title = `${scope}/${relPath}`;
    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      showExplorerContextMenu({
        scope,
        relPath,
        kind: 'file',
        name: fileName,
      }, event.clientX, event.clientY);
    });
    row.addEventListener('click', () => {
      const textExt = fileName.includes('.') ? `.${fileName.split('.').pop().toLowerCase()}` : '';
      if (!TEXT_EXTENSIONS.has(textExt)) {
        showMessage('このファイル形式はエディタ対応外です。(.md/.sql/.py/.json/.zizd のみ)', { kind: 'info', title: '未対応' });
        return;
      }
      void openWorkspaceFile(scope, relPath);
    });
    return row;
  }

  async function buildTreeDetails(scope, relPath, label, isRoot = false) {
    const details = document.createElement('details');
    details.className = 'workspace-tree-dir';
    details.open = !!isRoot;

    const summary = document.createElement('summary');
    summary.textContent = label;
    summary.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      showExplorerContextMenu({
        scope,
        relPath,
        kind: 'dir',
        name: label,
      }, event.clientX, event.clientY);
    });
    details.appendChild(summary);

    const children = document.createElement('div');
    children.className = 'workspace-tree-children';
    details.appendChild(children);

    let loaded = false;
    let loading = false;

    async function renderChildren() {
      if (loading) return;
      loading = true;
      children.innerHTML = '<div class="workspace-tree-loading">読み込み中...</div>';
      try {
        const entries = await loadTreeEntries(scope, relPath);
        children.innerHTML = '';
        entries.forEach((entry) => {
          const entryRelPath = String(entry.rel_path || '').replace(/\\/g, '/');
          if (entry.kind === 'dir') {
            const dirNode = document.createElement('div');
            dirNode.className = 'workspace-tree-child';
            void buildTreeDetails(scope, entryRelPath, entry.name, false).then((subTree) => {
              dirNode.appendChild(subTree);
            });
            children.appendChild(dirNode);
            return;
          }
          children.appendChild(renderTreeFileRow(scope, entryRelPath, entry.name));
        });
        if (!entries.length) {
          const empty = document.createElement('div');
          empty.className = 'workspace-tree-empty';
          empty.textContent = '(空)';
          children.appendChild(empty);
        }
        loaded = true;
      } catch (error) {
        const normalized = normalizeError(error);
        children.innerHTML = '';
        const errorRow = document.createElement('div');
        errorRow.className = 'workspace-tree-error';
        errorRow.textContent = `読み込み失敗: ${normalized.message}`;
        children.appendChild(errorRow);
      } finally {
        loading = false;
      }
    }

    details.addEventListener('toggle', () => {
      if (details.open && !loaded) {
        void renderChildren();
      }
    });

    if (details.open) {
      await renderChildren();
    }

    return details;
  }

  async function renderExplorerPanel(host) {
    await loadFileIconMapFromConfig();
    host.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'workspace-explorer-panel';
    wrapper.innerHTML = '<div class="workspace-tree-loading">読み込み中...</div>';
    host.appendChild(wrapper);

    try {
      const treeWrap = document.createElement('div');
      treeWrap.className = 'workspace-tree-root';
      const rootLabel = state.globalStore.workspaceRoot
        ? `Workspace (${state.globalStore.workspaceRoot})`
        : 'Workspace (未選択)';
      const workspaceNode = await buildTreeDetails('root', '', rootLabel, true);

      wrapper.innerHTML = '';
      wrapper.appendChild(workspaceNode);
    } catch (error) {
      const normalized = normalizeError(error);
      wrapper.innerHTML = `<div class="workspace-tree-error">${normalized.message}</div>`;
    }
  }

  async function renderLeftArea(options = {}) {
    const skipRecentRootsReload = !!options.skipRecentRootsReload;
    const title = shell.leftAreaTitle;
    const body = shell.leftAreaBody;
    if (!title || !body) return;

    body.classList.toggle('workspace-global-left-area__body--catalog', state.globalStore.leftMode === 'catalog');

    if (!state.globalStore.leftMode) {
      appShell.setLayout({ sidebarVisible: false });
      title.textContent = 'サイドエリア';
      body.innerHTML = '<div class="workspace-empty">左サイドバーから機能を選択してください。</div>';
      return;
    }

    appShell.setLayout({ sidebarVisible: true });

    if (state.globalStore.leftMode === 'project-select') {
      title.textContent = 'プロジェクト選択';
      if (!skipRecentRootsReload) {
        await loadRecentRootsFromConfig();
      }
      renderProjectPanel(body);
      return;
    }

    if (state.globalStore.leftMode === 'explorer') {
      title.textContent = 'エクスプローラー';
      await renderExplorerPanel(body);
      return;
    }

    if (state.globalStore.leftMode === 'catalog') {
      title.textContent = 'カタログ';
      window.zizCatalogAdapter?.mount?.(body);
      return;
    }

    title.textContent = 'サイドエリア';
    body.innerHTML = '<div class="workspace-empty">未対応メニューです。</div>';
  }

  function setLeftMode(mode) {
    const normalized = String(mode || '').trim();
    if (!['project-select', 'explorer', 'catalog'].includes(normalized)) {
      state.globalStore.leftMode = '';
    } else {
      state.globalStore.leftMode = normalized;
    }
    syncSidebarActionSelection();
    void renderLeftArea();
  }

  function syncSidebarActionSelection() {
    const current = String(state.globalStore.leftMode || '').trim();
    getShellApi().setActiveActivity?.(current);
  }

  function bindSidebarActions() {
    window.addEventListener('ziz:sidebar-action', (event) => {
      const action = String(event?.detail?.action || '').trim();
      if (action && action === state.globalStore.leftMode) {
        setLeftMode('');
        return;
      }
      setLeftMode(action);
    });

    document.querySelectorAll('[data-app-mode]').forEach((item) => {
      item.addEventListener('click', () => {
        setLeftMode('');
      });
    });
  }

  function bindGlobalSaveShortcut() {
    const saveButton = document.getElementById('btnSave');
    if (saveButton) {
      saveButton.addEventListener('click', (event) => {
        const tab = activeTab();
        logSaveTrace('saveButton.click', {
          active_tab_id: tab?.id || '',
          active_tab_kind: tab?.kind || '',
          running_tab_id: runningFlowTabId || '',
        });
        if (!tab) return;
        if (isTabRunning(tab.id)) {
          showMessage('実行中のタブは保存できません。', { kind: 'warning', title: '実行中' });
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        void invokeActiveTabAction('save');
      }, true);
    }

    document.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = String(event.key || '').toLowerCase();
      if (key === 's') {
        event.preventDefault();
        void invokeActiveTabAction('save');
        return;
      }
      if (key === 'enter') {
        event.preventDefault();
        void invokeActiveTabAction('run');
      }
    }, true);
  }

  function bindWorkspaceRunEvents() {
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data || {};
      if (!payload || payload.source !== 'ziz-embedded') return;
      const sourceWindow = event.source;
      const tabId = findTabIdByFrameWindow(sourceWindow);
      if (!tabId) return;
      const tab = getTab(tabId);
      if (!tab) return;
      const type = String(payload.type || '').trim();
      const detail = (payload.detail && typeof payload.detail === 'object') ? payload.detail : {};

      if (type === 'run-state') {
        if (detail.running) {
          runningFlowTabId = tab.id;
        } else if (runningFlowTabId === tab.id) {
          runningFlowTabId = '';
        }
        renderTabs();
        return;
      }

      if (type === 'loaded') {
        tab.flowPayloadApplied = true;
        tab.flowForceReload = false;
        tab.flowHasLoadedOnce = true;
        tab.flowLoadErrorShown = false;
        settleFlowLoadAck(tab, 'loaded', detail);
        return;
      }

      if (type === 'load-error') {
        tab.flowPayloadApplied = false;
        tab.flowForceReload = true;
        settleFlowLoadAck(tab, 'load-error', detail);
        if (!tab.flowHasLoadedOnce) {
          const fallbackTabId = String(tab.flowFallbackTabId || '');
          if (fallbackTabId) {
            const fallback = getTab(fallbackTabId);
            if (fallback) {
              activateTab(fallback.id);
            }
          }
          void requestTabClose(tab.id, { skipPrompt: true });
        }
        return;
      }

      if (type === 'state') {
        // タブ名はファイル名基準で固定し、flow_name では上書きしない。
        // （ファイル選択時の認知とタブ表示を一致させるため）
        tab.dirty = !!detail.dirty;
        renderTabs();
        return;
      }

      if (type === 'shortcut') {
        const action = String(detail.action || '').trim();
        if (!action) return;
        void invokeTabAction(tab.id, action);
      }
    });
  }

  async function initRoots() {
    try {
      const payload = await bridge.call('workspace.getRoot', {});
      state.globalStore.workspaceRoot = String(payload?.root_path || '');
      state.globalStore.configRoot = String(payload?.config_path || '');
      if (state.globalStore.workspaceRoot) {
        pushRecentRoot(state.globalStore.workspaceRoot);
      }
    } catch (error) {
      logInfo('workspace.getRoot failed', normalizeError(error));
    }
  }

  function exposeApi() {
    window.zizWorkspace = {
      openTextFile,
      saveActiveTab: async () => {
        const tab = activeTab();
        if (!tab || tab.kind !== 'text') return false;
        return saveTab(tab.id);
      },
      getActiveCatalogExtension: activeTabCatalogExtension,
      getActiveFlowEmbeddedApi: () => getFlowTabApi(activeTab()),
      focusActiveFlowCanvas,
    };
  }

  async function init() {
    setWorkspaceLock(false);
    bindShellTabEvents();
    bindSidebarActions();
    bindExplorerContextMenuActions();
    bindWorkspaceRunEvents();
    bindGlobalSaveShortcut();

    mountTabViews();
    renderTabs();
    setLeftMode('');

    await waitForBridgeReady();
    await loadRecentRootsFromConfig();
    await loadFileIconMapFromConfig();
    await initRoots();
    const pendingAction = readAndClearPendingSidebarAction();
    if (pendingAction === 'project-select' || pendingAction === 'explorer') {
      setLeftMode(pendingAction);
    }
    await renderLeftArea();
    exposeApi();
  }

  void init();
})();


