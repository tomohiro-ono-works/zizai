(function (root) {
  "use strict";

  const packages = root.zizPackages = root.zizPackages || {};
  const uiPkg = packages.ui = packages.ui || {};
  // 内部clipboardはcopy済みnodeかnode templateのどちらか一方だけを保持する。
  let copiedNodeIds = [];
  let nodeTemplate = null;

  function stateOps() {
    return packages.core?.stateOps || root.stateOps || {};
  }

  function sharedOps() {
    return packages.ui?.nodeShared || root.uiNodeShared || {};
  }

  function normalizeId(value) {
    return String(value || "").trim();
  }

  function runtimeState(runtime) {
    return runtime?.state && typeof runtime.state === "object" ? runtime.state : null;
  }

  function nodeById(state, nodeId) {
    const id = normalizeId(nodeId);
    return (Array.isArray(state?.nodes) ? state.nodes : [])
      .find((node) => normalizeId(node?.id) === id) || null;
  }

  function nodeIdFromRef(ref) {
    const nodeId = normalizeId(ref?.node_id);
    return ["START", "END"].includes(nodeId) ? "" : nodeId;
  }

  function selectionNodeIds(selection) {
    return (Array.isArray(selection?.nodes) ? selection.nodes : [])
      .map((ref) => nodeIdFromRef(ref))
      .filter(Boolean);
  }

  function selectedNodeIds(state) {
    const ops = stateOps();
    if (typeof ops.getSelectedNodeIds === "function") {
      return ops.getSelectedNodeIds(state, { allowEmpty: true });
    }
    return (Array.isArray(state?.selectedNodeIds) ? state.selectedNodeIds : [])
      .map(normalizeId)
      .filter(Boolean);
  }

  function notifyChanged(runtime, options = {}) {
    runtime?.onStateChanged?.(options);
  }

  function setSelection(runtime, nodeIds) {
    const state = runtimeState(runtime);
    if (!state) return false;
    const ops = stateOps();
    if (typeof ops.setSelectedNodes === "function") {
      ops.setSelectedNodes(state, nodeIds, { allowEmpty: true });
    } else {
      const ids = (Array.isArray(nodeIds) ? nodeIds : []).map(normalizeId).filter(Boolean);
      state.selectedNodeIds = ids;
      state.selectedNodeId = ids[0] || null;
    }
    notifyChanged(runtime, { history: false });
    return true;
  }

  function setNodePosition(runtime, nodeId, position) {
    const state = runtimeState(runtime);
    if (!state) return false;
    const changed = stateOps().setNodeCanvasPosition?.(state, nodeId, position, { snap: true });
    return !!changed;
  }

  function copyNodes(runtime, nodeIds) {
    const state = runtimeState(runtime);
    if (!state) return [];
    const valid = [];
    const seen = new Set();
    (Array.isArray(nodeIds) ? nodeIds : []).forEach((nodeId) => {
      const id = normalizeId(nodeId);
      const node = nodeById(state, id);
      if (!id || !node || seen.has(id) || sharedOps().isDraggableNode?.(node) === false) return;
      seen.add(id);
      valid.push(id);
    });
    copiedNodeIds = valid;
    nodeTemplate = null;
    return valid.slice();
  }

  function hasCopiedNodes() {
    return copiedNodeIds.length > 0;
  }

  function setNodeTemplate(template) {
    const normalized = stateOps().normalizeNodeTemplate?.(template) || null;
    if (!normalized) return false;
    nodeTemplate = normalized;
    copiedNodeIds = [];
    return true;
  }

  function hasNodeTemplate() {
    return !!nodeTemplate;
  }

  function hasClipboardContent() {
    return hasCopiedNodes() || hasNodeTemplate();
  }

  function pasteNodeTemplate(runtime, anchorId) {
    const state = runtimeState(runtime);
    if (!state || !nodeTemplate) return [];
    const created = stateOps().createNodeFromTemplateAtAnchor?.(
      state,
      normalizeId(anchorId) || null,
      nodeTemplate
    ) || null;
    if (!created?.id) return [];
    notifyChanged(runtime);
    return [normalizeId(created.id)];
  }

  function pasteNodes(runtime, anchorId) {
    const state = runtimeState(runtime);
    if (!state) return [];
    if (nodeTemplate) return pasteNodeTemplate(runtime, anchorId);
    if (!copiedNodeIds.length) return [];
    const normalizedAnchorId = normalizeId(anchorId);
    const safeAnchorId = normalizedAnchorId && !copiedNodeIds.includes(normalizedAnchorId)
      ? normalizedAnchorId
      : null;
    const createdIds = stateOps().duplicateNodesByIds?.(state, copiedNodeIds, {
      anchorId: safeAnchorId,
      offsetX: 64,
      offsetY: 64,
    }) || [];
    if (createdIds.length) notifyChanged(runtime);
    return createdIds;
  }

  function createNode(runtime, anchorId, options = {}) {
    const state = runtimeState(runtime);
    if (!state) return null;
    const created = stateOps().createNodeAtAnchor?.(state, normalizeId(anchorId) || null, options) || null;
    if (created) notifyChanged(runtime);
    return created;
  }

  function createLoopNode(runtime, anchorId, options = {}) {
    const state = runtimeState(runtime);
    if (!state) return null;
    const created = stateOps().createLoopNodeAtAnchor?.(state, normalizeId(anchorId) || null, options) || null;
    if (created) notifyChanged(runtime);
    return created;
  }

  function createLoopInternal(runtime, targetId, position) {
    const state = runtimeState(runtime);
    const target = nodeById(state, targetId);
    if (!target) return null;
    const shared = sharedOps();
    const loopRootId = shared.isLoopRootNode?.(target)
      ? normalizeId(target.id)
      : normalizeId(target.loopOwnerId);
    if (!loopRootId) return null;
    const created = shared.insertLoopInternalAtAnchor?.(state, loopRootId, target.id) || null;
    if (created && position) stateOps().setNodeCanvasPosition?.(state, created.id, position, { snap: true });
    if (created) notifyChanged(runtime);
    return created;
  }

  function createAfterLoop(runtime, loopRootId, rightId, position) {
    const state = runtimeState(runtime);
    if (!state) return null;
    const created = sharedOps().insertAfterLoopEnd?.(state, loopRootId, rightId || null) || null;
    if (created && position) stateOps().setNodeCanvasPosition?.(state, created.id, position, { snap: true });
    if (created) notifyChanged(runtime);
    return created;
  }

  function mergeMenuState(state, nodeId) {
    const shared = sharedOps();
    const node = nodeById(state, nodeId);
    const incomingSources = node ? shared.getMergeParentIds?.(node) || [] : [];
    const outgoingTargets = (Array.isArray(state?.nodes) ? state.nodes : [])
      .filter((item) => (shared.getMergeParentIds?.(item) || []).includes(nodeId))
      .map((item) => normalizeId(item.id));
    return { incomingSources, outgoingTargets };
  }

  function removeMerge(runtime, nodeId, direction) {
    const state = runtimeState(runtime);
    if (!state) return false;
    const ops = stateOps();
    const menuState = mergeMenuState(state, nodeId);
    const changed = direction === "outgoing"
      ? menuState.outgoingTargets.some((targetId) => ops.removeMergeParent?.(state, nodeId, targetId))
      : menuState.incomingSources.some((sourceId) => ops.removeMergeParent?.(state, sourceId, nodeId));
    if (changed) notifyChanged(runtime);
    return changed;
  }

  function normalizeEdgeNodeId(edgeRef, endpoint) {
    const raw = normalizeId(edgeRef?.[endpoint]);
    if (raw === "START") return normalizeId(edgeRef?.loop_owner_id) || null;
    if (raw === "END") return null;
    return raw || null;
  }

  function canDeleteEdge(state, edgeRef) {
    const rawFrom = normalizeId(edgeRef?.from);
    const rawTo = normalizeId(edgeRef?.to);
    if (!rawFrom || !rawTo) return false;
    const loopOwnerId = normalizeId(edgeRef?.loop_owner_id);
    if (loopOwnerId && (rawFrom === "START" || rawTo === "END")) return false;
    if (normalizeId(edgeRef?.kind) === "loop-back") return false;
    const source = nodeById(state, rawFrom);
    const target = nodeById(state, rawTo);
    if (
      source &&
      target &&
      sharedOps().isLoopRootNode?.(source) &&
      normalizeId(target.loopOwnerId) === normalizeId(source.id)
    ) {
      return false;
    }
    return true;
  }

  function deleteEdge(runtime, edgeRef) {
    const state = runtimeState(runtime);
    if (!state || !canDeleteEdge(state, edgeRef)) return false;
    const sourceId = normalizeEdgeNodeId(edgeRef, "from");
    const targetId = normalizeEdgeNodeId(edgeRef, "to");
    if (!sourceId || !targetId) return false;
    const result = stateOps().removeDirectedEdge?.(state, sourceId, targetId) || null;
    const changed = !!(result && (result.removedPrimary || result.removedMerge));
    if (changed) notifyChanged(runtime);
    return changed;
  }

  function deleteSelection(runtime, selection) {
    const state = runtimeState(runtime);
    if (!state) return false;
    const nodeIds = selectionNodeIds(selection);
    const edgeRef = Array.isArray(selection?.edges) ? selection.edges[0] : null;
    const annotationIds = (Array.isArray(selection?.annotation_ids) ? selection.annotation_ids : [])
      .map(normalizeId)
      .filter(Boolean);
    if (nodeIds.length === 1) {
      const before = state.nodes.length;
      sharedOps().removeNodeById?.(state, nodeIds[0], runtime.onStateChanged);
      return state.nodes.length !== before;
    }
    if (nodeIds.length > 1) {
      const changed = !!stateOps().removeNodesByIds?.(state, nodeIds);
      if (changed) notifyChanged(runtime);
      return changed;
    }
    if (edgeRef) return deleteEdge(runtime, edgeRef);
    if (annotationIds.length) {
      const ids = new Set(annotationIds);
      const before = Array.isArray(state.stickyNotes) ? state.stickyNotes.length : 0;
      state.stickyNotes = (Array.isArray(state.stickyNotes) ? state.stickyNotes : [])
        .filter((note) => !ids.has(normalizeId(note?.id)));
      const changed = state.stickyNotes.length !== before;
      if (changed) notifyChanged(runtime);
      return changed;
    }
    return false;
  }

  function showMergeError(result) {
    const message = sharedOps().getMergeErrorMessage?.(result) || "この接続は追加できません。";
    const dialog = packages.core?.dialog;
    if (dialog?.show) dialog.show(message, { kind: "warning", title: "合流" });
    else root.alert(message);
  }

  function handleConnectCreate(runtime, payload) {
    const state = runtimeState(runtime);
    if (!state) return false;
    const sourceId = nodeIdFromRef(payload?.source_node_ref);
    const targetId = nodeIdFromRef(payload?.target_node_ref);
    const ops = stateOps();
    if (!sourceId || !targetId || sourceId === targetId) return false;
    let changed = false;

    if (ops.hasDirectedEdge?.(state, sourceId, targetId)) {
      const target = nodeById(state, targetId);
      if (target && (target.parentId ?? null) === sourceId) {
        changed = !!ops.createNodeAtAnchor?.(state, sourceId, {
          rightId: targetId,
          ...(payload?.position ? { position: payload.position } : {}),
        });
      } else {
        ops.removeDirectedEdge?.(state, sourceId, targetId);
        const created = ops.hasSuccessorNode?.(state, sourceId)
          ? (ops.createParallelNodeAtAnchor?.(state, sourceId, { position: payload?.position })
            || ops.createNodeAtAnchor?.(state, sourceId, { position: payload?.position }))
          : ops.createNodeAtAnchor?.(state, sourceId, { position: payload?.position });
        if (created?.id) {
          const result = ops.addMergeParent?.(state, created.id, targetId);
          if (!result?.ok) showMergeError(result);
          else changed = true;
        }
      }
    } else {
      const result = ops.addMergeParent?.(state, sourceId, targetId);
      if (!result?.ok) showMergeError(result);
      else changed = true;
    }

    ops.clearPendingMergeSource?.(state);
    notifyChanged(runtime, changed ? {} : { history: false });
    return changed;
  }

  function createFromConnectionDrop(runtime, sourceId, sourcePort, position) {
    const state = runtimeState(runtime);
    const source = nodeById(state, sourceId);
    if (!source) return null;
    const shared = sharedOps();
    const ops = stateOps();
    if (shared.isLoopRootNode?.(source)) {
      if (sourcePort === "loop") return createLoopInternal(runtime, source.id, position);
      return createAfterLoop(runtime, source.id, null, position);
    }
    if (source.loopOwnerId) return createLoopInternal(runtime, source.id, position);
    const created = ops.hasSuccessorNode?.(state, sourceId)
      ? (ops.createParallelNodeAtAnchor?.(state, sourceId, { position })
        || ops.createNodeAtAnchor?.(state, sourceId, { position }))
      : ops.createNodeAtAnchor?.(state, sourceId, { position });
    if (created) notifyChanged(runtime);
    return created || null;
  }

  function insertAtEdge(runtime, edgeRef, position) {
    const state = runtimeState(runtime);
    if (!state) return null;
    const loopRootId = normalizeId(edgeRef?.loop_owner_id);
    const rawFrom = normalizeId(edgeRef?.from);
    const rawTo = normalizeId(edgeRef?.to);
    if (loopRootId) {
      const anchorId = rawFrom === "START" ? loopRootId : rawFrom;
      return createLoopInternal(runtime, anchorId, position);
    }
    const anchorId = rawFrom === "START" ? null : rawFrom;
    const rightId = rawTo === "END" ? null : rawTo;
    return createNode(runtime, anchorId, { rightId, position });
  }

  function handleConnectDrop(runtime, payload) {
    const sourceId = nodeIdFromRef(payload?.source_node_ref);
    if (!sourceId) return false;
    const drop = payload?.drop || {};
    const created = drop.kind === "edge" && drop.edge_ref
      ? insertAtEdge(runtime, drop.edge_ref, drop.position)
      : createFromConnectionDrop(runtime, sourceId, normalizeId(payload?.source_port), drop.position);
    return !!created;
  }

  function triggerPaneShortcut(action) {
    const normalized = normalizeId(action);
    if (!normalized) return false;
    const embedded = new URLSearchParams(root.location.search).get("embedded") === "1";
    if (embedded && root.parent && root.parent !== root) {
      root.parent.postMessage({
        source: "ziz-embedded",
        type: "shortcut",
        detail: { action: normalized },
      }, root.location.origin);
      return true;
    }
    const api = root.zizEmbeddedApi || null;
    if (!api) return false;
    if (normalized === "undo") void api.undo?.();
    else if (normalized === "redo") void api.redo?.();
    else if (normalized === "run") void api.runFlow?.();
    else return false;
    return true;
  }

  function requestRun(runtime, payload) {
    const state = runtimeState(runtime);
    const nodeId = nodeIdFromRef(payload?.node_ref);
    if (nodeId) {
      sharedOps().requestNodeRunById?.(state, nodeId, "single", runtime.onStateChanged);
      return true;
    }
    return triggerPaneShortcut("run");
  }

  function resolveBridgeApi() {
    const localBridge = root.zizBridge || packages.core?.bridge || null;
    const parentBridge = (root.parent && root.parent !== root)
      ? (root.parent.zizBridge || root.parent.zizPackages?.core?.bridge || null)
      : null;
    const callable = (candidate) => !!candidate && typeof candidate.call === "function";
    const available = (candidate) => callable(candidate) && !!candidate.available?.();
    if (available(localBridge)) return localBridge;
    if (available(parentBridge)) return parentBridge;
    if (callable(localBridge)) return localBridge;
    if (callable(parentBridge)) return parentBridge;
    return null;
  }

  function showExternalFailure(message) {
    const dialog = packages.core?.dialog;
    if (dialog?.show) dialog.show(message, { kind: "warning", title: "外部リンク" });
    else root.alert(message);
  }

  function openExternalLink(url) {
    const href = normalizeId(url);
    if (!href) return false;
    const bridge = resolveBridgeApi();
    if (!bridge?.isAllowedExternalUrl?.(href)) {
      showExternalFailure("http または https のリンクだけを開けます。");
      return false;
    }
    if (bridge.available?.() && typeof bridge.openExternal === "function") {
      bridge.openExternal(href, { prefer: "chrome" }).catch(() => {
        showExternalFailure("外部ブラウザ起動に失敗しました。");
      });
      return true;
    }
    showExternalFailure("外部ブラウザ起動に失敗しました。\nネイティブブリッジ未接続です。");
    return false;
  }

  function contextTargetNodeIds(target) {
    if (target?.kind === "node") return [nodeIdFromRef(target.node_ref)].filter(Boolean);
    if (target?.kind === "selection") return selectionNodeIds(target.selection);
    return [];
  }

  function getContextActions(runtime, target) {
    const state = runtimeState(runtime);
    if (!state || !target) return [];
    if (target.kind === "selection") {
      const ids = contextTargetNodeIds(target);
      const actions = [{ commandId: "selection.copy", label: "コピー" }];
      if (hasClipboardContent()) actions.push({ commandId: "selection.paste", label: "貼り付け" });
      actions.push({ commandId: "selection.delete", label: "削除", danger: true });
      return ids.length > 1 ? actions : [];
    }
    if (target.kind === "edge") {
      return canDeleteEdge(state, target.edge_ref)
        ? [{ commandId: "selection.delete", label: "フローリレーションを削除", danger: true }]
        : [];
    }
    if (target.kind === "annotation") {
      return [{ commandId: "selection.delete", label: "削除", danger: true }];
    }
    if (target.kind === "canvas") {
      const actions = [
        { commandId: "node.add", label: "ノードを追加" },
        { commandId: "application.add-root-loop", label: "ループノードを追加" },
      ];
      if (hasClipboardContent()) actions.push({ commandId: "selection.paste", label: "貼り付け" });
      return actions;
    }
    const nodeId = nodeIdFromRef(target.node_ref);
    const node = nodeById(state, nodeId);
    if (!node) return [];
    const shared = sharedOps();
    const actions = [];
    if (node.loopOwnerId) {
      actions.push({ commandId: "application.add-loop-inner", label: "ループ内に追加" });
    } else if (shared.isLoopRootNode?.(node)) {
      actions.push(
        { commandId: "application.add-loop-inner", label: "ループ内に追加" },
        { commandId: "application.add-after-loop", label: "ループの後に追加" }
      );
    } else {
      actions.push(
        { commandId: "application.add-after", label: "後に追加" },
        { commandId: "application.add-loop", label: "後にループ追加" }
      );
    }
    actions.push({ commandId: "selection.copy", label: "コピー" });
    if (hasClipboardContent()) actions.push({ commandId: "selection.paste", label: "貼り付け" });
    const mergeState = mergeMenuState(state, nodeId);
    if (mergeState.incomingSources.length) {
      actions.push({ commandId: "application.remove-merge-incoming", label: "合流を解除", danger: true });
    }
    if (mergeState.outgoingTargets.length) {
      actions.push({ commandId: "application.remove-merge-outgoing", label: "合流を解除", danger: true });
    }
    actions.push(
      { commandId: "node.run", label: "実行" },
      { commandId: "selection.delete", label: "削除", danger: true }
    );
    return actions;
  }

  function commandTargetNodeId(runtime, target) {
    return contextTargetNodeIds(target)[0] || selectedNodeIds(runtimeState(runtime))[0] || "";
  }

  function handleCommand(runtime, payload) {
    const commandId = normalizeId(payload?.commandId);
    const target = payload?.target || null;
    const state = runtimeState(runtime);
    if (!state || !commandId) return false;
    if (["node.add", "workflow.run", "selection.delete", "node.open", "node.run", "annotation.add", "annotation.mode-toggle"].includes(commandId)) {
      return false;
    }
    if (commandId === "history.undo") return triggerPaneShortcut("undo");
    if (commandId === "history.redo") return triggerPaneShortcut("redo");
    if (commandId === "selection.copy") {
      return copyNodes(runtime, contextTargetNodeIds(target).length ? contextTargetNodeIds(target) : selectedNodeIds(state)).length > 0;
    }
    if (commandId === "selection.paste") return pasteNodes(runtime, commandTargetNodeId(runtime, target)).length > 0;
    if (commandId === "selection.duplicate") {
      const ids = contextTargetNodeIds(target).length ? contextTargetNodeIds(target) : selectedNodeIds(state);
      const created = stateOps().duplicateNodesByIds?.(state, ids, { offsetX: 64, offsetY: 64 }) || [];
      if (created.length) notifyChanged(runtime);
      return created.length > 0;
    }
    const nodeId = commandTargetNodeId(runtime, target);
    if (commandId === "application.add-root-loop") return !!createLoopNode(runtime, null, { position: target?.position });
    if (commandId === "application.add-after") return !!createNode(runtime, nodeId);
    if (commandId === "application.add-loop") return !!createLoopNode(runtime, nodeId);
    if (commandId === "application.add-loop-inner") return !!createLoopInternal(runtime, nodeId);
    if (commandId === "application.add-after-loop") return !!createAfterLoop(runtime, nodeId, null);
    if (commandId === "application.remove-merge-incoming") return removeMerge(runtime, nodeId, "incoming");
    if (commandId === "application.remove-merge-outgoing") return removeMerge(runtime, nodeId, "outgoing");
    return false;
  }

  function handleNodeAdd(runtime, payload) {
    return !!createNode(runtime, null, { position: payload?.position });
  }

  function handleNodeOpenDetail(runtime, payload) {
    const nodeId = nodeIdFromRef(payload?.node_ref);
    return nodeId ? setSelection(runtime, [nodeId]) : false;
  }

  const facade = {
    canDeleteEdge,
    getContextActions,
    handleCommand,
    handleConnectCreate,
    handleConnectDrop,
    handleDeleteRequest: (runtime, payload) => deleteSelection(runtime, payload?.selection || {}),
    handleNodeAdd,
    handleNodeOpenDetail,
    handleRunRequest: requestRun,
    openExternalLink,
    setNodePosition,
    setSelection,
    triggerPaneShortcut,
    copyNodes,
    pasteNodes,
    hasCopiedNodes,
    getCopiedNodeIds: () => copiedNodeIds.slice(),
    setNodeTemplate,
    hasNodeTemplate,
    hasClipboardContent,
  };
  root.zizWorkflowCommandFacade = facade;
  uiPkg.workflowCommandFacade = facade;
})(window);
