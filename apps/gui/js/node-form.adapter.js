(function () {
  const GENERIC_KINDS = new Set([
    "text",
    "number",
    "select",
    "combo",
    "checkbox",
    "checklist",
    "radio",
    "textarea",
    "define-values-editor",
    "filter-builder",
    "file",
    "dir",
    "mouse-coordinate-picker"
  ]);
  const LEGACY_ONLY_KEYS = new Set(["input_data", "source_step_id"]);
  const embeddedMode = new URLSearchParams(window.location.search).get("embedded") === "1";

  function resolveActiveBridgeApi() {
    const corePkg = (window.zizPackages && window.zizPackages.core) || {};
    const localBridge = window.zizBridge || corePkg.bridge || null;
    if (localBridge?.available?.()) return localBridge;
    if (!embeddedMode) return localBridge;
    const parentBridge = window.parent?.zizBridge || (window.parent?.zizPackages || {})?.core?.bridge || null;
    if (parentBridge?.available?.()) return parentBridge;
    return localBridge || parentBridge;
  }

  // Mirrors resolveActiveBridgeApi()'s local-vs-parent bridge selection so the
  // window that actually dispatches `ziz:evt` for the chosen bridge -- the parent
  // AppShell window when embedded and its bridge is the usable one, the local
  // window otherwise -- is the one the coordinate-capture listener is attached to.
  function resolveBridgeEventTarget() {
    const corePkg = (window.zizPackages && window.zizPackages.core) || {};
    const localBridge = window.zizBridge || corePkg.bridge || null;
    if (localBridge?.available?.()) return window;
    if (!embeddedMode) return window;
    const parentWindow = window.parent;
    if (!parentWindow || parentWindow === window) return window;
    const parentBridge = parentWindow.zizBridge || (parentWindow.zizPackages || {})?.core?.bridge || null;
    if (parentBridge?.available?.()) return parentWindow;
    return window;
  }

  function getBridgeUnavailableMessage(activeBridge) {
    const message = activeBridge?.unavailableMessage?.();
    return String(message || "ブリッジ未接続です。再読み込みしてください。");
  }

  function resolveDialogApi() {
    return (window.zizPackages && window.zizPackages.core && window.zizPackages.core.dialog) || null;
  }

  function showAdapterError(message, title) {
    const dialogApi = resolveDialogApi();
    if (dialogApi?.show) dialogApi.show(message, { kind: "error", title });
    else window.alert(message);
  }

  function showAdapterWarning(message, title) {
    const dialogApi = resolveDialogApi();
    if (dialogApi?.show) dialogApi.show(message, { kind: "warning", title });
    else window.alert(message);
  }

  function buildFileDialogFilters(label, accept) {
    const text = String(accept || "").trim();
    if (!text) return [];
    const patterns = text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.startsWith(".") ? `*${item}` : item));
    if (!patterns.length) return [];
    return [{ label: label || "ファイル", patterns }];
  }

  function resolveWorkspaceTabId() {
    return String(
      window.zizEmbeddedApi?.getWorkspaceTabId?.()
      || window.__zizWorkspaceTabId?.()
      || "__standalone__"
    ).trim();
  }

  function toCoordinateValue(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function isHiddenBindingRef(value) {
    return typeof value === "string" && /^\{\{hidden\.[^}]+\}\}$/.test(value.trim());
  }

  function isNodeFormSupportedField(field) {
    if (!field || typeof field !== "object") return false;
    if (field.allowVars) return false;
    const kind = String(field.kind || "text");
    if (!GENERIC_KINDS.has(kind)) return false;
    if (LEGACY_ONLY_KEYS.has(String(field.key || ""))) return false;
    if (kind === "textarea" && String(field.codeLanguage || "").trim()) return false;
    return true;
  }

  function partitionFields(fields) {
    const nodeFormFields = [];
    const legacyFields = [];
    (Array.isArray(fields) ? fields : []).forEach((field) => {
      if (isNodeFormSupportedField(field)) nodeFormFields.push(field);
      else legacyFields.push(field);
    });
    return { nodeFormFields, legacyFields };
  }

  function buildFieldSegments(fields) {
    const segments = [];
    (Array.isArray(fields) ? fields : []).forEach((field) => {
      if (!isNodeFormSupportedField(field)) {
        segments.push({ type: "legacy", fields: [field] });
        return;
      }
      const previous = segments[segments.length - 1];
      if (previous && previous.type === "nodeform") {
        previous.fields.push(field);
        return;
      }
      segments.push({ type: "nodeform", fields: [field] });
    });
    return segments;
  }

  // Application-owned Host Adapter for the two Bridge/OS boundaries NodeForm itself
  // does not know about: file/dir browse dialogs and mouse coordinate capture. Scoped
  // per NodeForm instance (closes over `instance`, `node`, `fields`, `onCommit`) so the
  // returned detach() can remove every listener -- including the window-level
  // `ziz:evt` coordinate listener -- on destroy/remount without leaking or double-firing.
  function attachHostAdapter(instance, { root, node, fields, onCommit, hiddenBindings }) {
    function findField(key) {
      return (Array.isArray(fields) ? fields : []).find((field) => field && field.key === key) || null;
    }

    function dispatchBrowseResult(detail) {
      document.dispatchEvent(new CustomEvent("nodeform:browse-result", { detail }));
    }

    function dispatchCoordinateResult(detail) {
      document.dispatchEvent(new CustomEvent("nodeform:coordinate-result", { detail }));
    }

    async function handleBrowseRequest(event) {
      const detail = event.detail || {};
      if (detail.instanceId !== instance.id) return;
      const activeBridge = resolveActiveBridgeApi();
      if (!activeBridge?.available?.()) {
        showAdapterWarning(getBridgeUnavailableMessage(activeBridge), "選択");
        dispatchBrowseResult({ instanceId: instance.id, requestId: detail.requestId, key: detail.key, cancelled: true });
        return;
      }
      const field = findField(detail.key) || {};
      const kind = String(detail.kind || field.kind || "file");
      const type = kind === "dir" ? "file.pickFolder" : "file.pickFile";
      const currentValue = detail.currentValue;
      const payload = {
        title: kind === "dir" ? `${field.label || "フォルダ"}を選択` : `${field.label || "ファイル"}を選択`,
        step_name: String(node.stepName || "global"),
        field_key: String(detail.key || ""),
        current_ref: isHiddenBindingRef(currentValue) ? currentValue : "",
        current_value: isHiddenBindingRef(currentValue) ? "" : String(currentValue || ""),
        workspace_tab_id: resolveWorkspaceTabId(),
      };
      if (kind !== "dir") {
        payload.filters = buildFileDialogFilters(field.label, detail.accept);
      }
      try {
        const result = await activeBridge.call(type, payload);
        if (!result || result.selected === false || !result.ref) {
          dispatchBrowseResult({ instanceId: instance.id, requestId: detail.requestId, key: detail.key, cancelled: true });
          return;
        }
        node.form[detail.key] = result.ref;
        if (hiddenBindings && typeof hiddenBindings === "object") {
          hiddenBindings[result.ref] = {
            display_name: String(result.display_name || ""),
            display_hint: String(result.display_hint || ""),
          };
        }
        dispatchBrowseResult({ instanceId: instance.id, requestId: detail.requestId, key: detail.key, value: result.ref });
        if (typeof onCommit === "function") onCommit();
      } catch (error) {
        showAdapterError(`選択に失敗しました。\n${error?.message || error}`, "選択エラー");
        dispatchBrowseResult({ instanceId: instance.id, requestId: detail.requestId, key: detail.key, error: true });
      }
    }

    let coordinateCapture = null;

    function handleZizEvt(event) {
      const message = event?.detail || {};
      const type = String(message.type || "");
      if (!type.startsWith("mouse.coordinateCapture.")) return;
      const capture = coordinateCapture;
      const payload = message.payload || {};
      if (!capture || String(payload.capture_id || "") !== capture.captureId) return;

      if (type === "mouse.coordinateCapture.selected") {
        coordinateCapture = null;
        const x = toCoordinateValue(payload.x);
        const y = toCoordinateValue(payload.y);
        if (x === null || y === null) {
          dispatchCoordinateResult({ instanceId: instance.id, requestId: capture.requestId, key: capture.key, cancelled: true });
          return;
        }
        node.form[capture.xKey] = String(x);
        node.form[capture.yKey] = String(y);
        dispatchCoordinateResult({
          instanceId: instance.id,
          requestId: capture.requestId,
          key: capture.key,
          x: String(x),
          y: String(y),
        });
        if (typeof onCommit === "function") onCommit();
        return;
      }

      if (type === "mouse.coordinateCapture.cancelled") {
        coordinateCapture = null;
        dispatchCoordinateResult({ instanceId: instance.id, requestId: capture.requestId, key: capture.key, cancelled: true });
      }
    }

    async function handleCoordinateRequest(event) {
      const detail = event.detail || {};
      if (detail.instanceId !== instance.id) return;
      const activeBridge = resolveActiveBridgeApi();
      if (!activeBridge?.available?.()) {
        showAdapterWarning(getBridgeUnavailableMessage(activeBridge), "座標指定");
        dispatchCoordinateResult({ instanceId: instance.id, requestId: detail.requestId, key: detail.key, cancelled: true });
        return;
      }
      if (coordinateCapture) {
        dispatchCoordinateResult({
          instanceId: instance.id,
          requestId: coordinateCapture.requestId,
          key: coordinateCapture.key,
          cancelled: true,
        });
        coordinateCapture = null;
      }
      const captureId = `coordinate_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      coordinateCapture = {
        captureId,
        requestId: detail.requestId,
        key: detail.key,
        xKey: String(detail.xKey || "x"),
        yKey: String(detail.yKey || "y"),
      };
      try {
        await activeBridge.call("mouse.coordinateCapture.start", { capture_id: captureId });
      } catch (error) {
        if (coordinateCapture && coordinateCapture.captureId === captureId) coordinateCapture = null;
        showAdapterError(`座標取得を開始できませんでした。\n${error?.message || error}`, "座標指定エラー");
        dispatchCoordinateResult({ instanceId: instance.id, requestId: detail.requestId, key: detail.key, cancelled: true });
      }
    }

    const bridgeEventTarget = resolveBridgeEventTarget();
    root.addEventListener("nodeform:browse-request", handleBrowseRequest);
    root.addEventListener("nodeform:coordinate-request", handleCoordinateRequest);
    bridgeEventTarget.addEventListener("ziz:evt", handleZizEvt);

    return function detachHostAdapter() {
      root.removeEventListener("nodeform:browse-request", handleBrowseRequest);
      root.removeEventListener("nodeform:coordinate-request", handleCoordinateRequest);
      bridgeEventTarget.removeEventListener("ziz:evt", handleZizEvt);
    };
  }

  function destroyNodeForm(instance) {
    if (!instance) return;
    if (instance.root && instance.__zizFocusOutHandler) {
      instance.root.removeEventListener("focusout", instance.__zizFocusOutHandler);
      instance.__zizFocusOutHandler = null;
    }
    if (typeof instance.__zizHostAdapterDetach === "function") {
      instance.__zizHostAdapterDetach();
      instance.__zizHostAdapterDetach = null;
    }
    if (typeof instance.destroy === "function") instance.destroy();
  }

  // NodeForm notifies on every keystroke (not just on commit), so the Application
  // onStateChanged callback -- which tears down and rebuilds the whole node detail --
  // is deferred to focusout (bubbling) instead of firing per keystroke and dropping
  // input focus mid-edit. node.form itself is still updated synchronously on every edit.
  // File/dir browse and mouse-coordinate picks are discrete actions (not continuous
  // typing), so their Host Adapter calls onCommit immediately, matching the legacy
  // renderer's behavior for the same field kinds.
  function mountNodeForm({ root, node, fields, onCommit, hiddenBindings }) {
    if (!root) return null;
    root.innerHTML = "";
    const NodeFormLib = window.NodeForm;
    if (!NodeFormLib || typeof NodeFormLib.mount !== "function") return null;
    if (!Array.isArray(fields) || !fields.length) return null;
    if (!node.form || typeof node.form !== "object") node.form = {};

    const formKey = `${String(node.connector || "")}.${String(node.action || "")}`;
    let pendingCommit = false;
    const instance = NodeFormLib.mount({
      root,
      node,
      forms: { [formKey]: fields },
      onChange: (params) => {
        Object.assign(node.form, params || {});
        pendingCommit = true;
      }
    });

    const handleFocusOut = () => {
      if (!pendingCommit) return;
      pendingCommit = false;
      if (typeof onCommit === "function") onCommit();
    };
    instance.__zizFocusOutHandler = handleFocusOut;
    root.addEventListener("focusout", handleFocusOut);
    instance.__zizHostAdapterDetach = attachHostAdapter(instance, { root, node, fields, onCommit, hiddenBindings });

    if (typeof instance.validate === "function") instance.validate();
    return instance;
  }

  const nodeFormAdapter = {
    GENERIC_KINDS: Array.from(GENERIC_KINDS),
    isNodeFormSupportedField,
    partitionFields,
    buildFieldSegments,
    mountNodeForm,
    destroyNodeForm
  };
  window.uiNodeFormAdapter = nodeFormAdapter;
  const packagesOut = window.zizPackages = window.zizPackages || {};
  const uiOut = packagesOut.ui = packagesOut.ui || {};
  uiOut.nodeFormAdapter = nodeFormAdapter;
})();
