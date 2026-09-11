(function (root) {
  "use strict";

  const packages = root.zizPackages = root.zizPackages || {};
  const uiPkg = packages.ui = packages.ui || {};
  const shared = uiPkg.nodeShared || root.uiNodeShared || {};

  function cloneValue(value) {
    if (typeof root.structuredClone === "function") {
      try {
        return root.structuredClone(value);
      } catch (_) {
        // fallback below
      }
    }
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function projectSteps(state, model) {
    const nodeById = model?.nodeMap || new Map();
    return (Array.isArray(state?.nodes) ? state.nodes : []).map((node) => {
      const nodeId = String(node?.id || "").trim();
      const view = nodeById.get(nodeId) || null;
      const projected = {
        step_id: nodeId,
        label: String(node?.stepName || nodeId),
        node_type: String(node?.nodeType || "task").trim() || "task",
        description: String(node?.description || ""),
        ui_position: {
          x: Math.round(Number(view?.x ?? node?.canvasPosition?.x) || 0),
          y: Math.round(Number(view?.y ?? node?.canvasPosition?.y) || 0),
        },
      };
      const loopOwnerId = String(node?.loopOwnerId || "").trim();
      if (loopOwnerId) projected.loop_owner_id = loopOwnerId;
      return projected;
    });
  }

  function projectEdges(state, model) {
    const nodes = Array.isArray(state?.nodes) ? state.nodes : [];
    const nodeById = new Map(nodes.map((node) => [String(node?.id || ""), node]));
    const mainEdges = [];
    const loopEdges = {};

    function addLoopEdge(ownerId, edge) {
      const key = String(ownerId || "").trim();
      if (!key) return;
      if (!Array.isArray(loopEdges[key])) loopEdges[key] = [];
      loopEdges[key].push(edge);
    }

    (Array.isArray(model?.edges) ? model.edges : []).forEach((edge) => {
      const rawFrom = String(edge?.from || "").trim();
      const rawTo = String(edge?.to || "").trim();
      if (!rawFrom || !rawTo) return;
      const source = nodeById.get(rawFrom) || null;
      const target = nodeById.get(rawTo) || null;
      const sourceOwnerId = String(source?.loopOwnerId || "").trim();
      const targetOwnerId = String(target?.loopOwnerId || "").trim();
      const loopOwnerId = sourceOwnerId || targetOwnerId || (edge?.kind === "loop-back" ? rawTo : "");

      if (loopOwnerId) {
        const from = rawFrom === loopOwnerId ? "START" : rawFrom;
        const to = rawTo === loopOwnerId ? "END" : rawTo;
        addLoopEdge(loopOwnerId, {
          from,
          to,
          order: Number(target?.parallelOrder) || 0,
          ...(edge?.kind === "merge" ? { kind: "merge" } : { kind: "primary" }),
        });
        return;
      }

      const from = rawFrom === "__start__" ? "START" : rawFrom === "__end__" ? "END" : rawFrom;
      const to = rawTo === "__start__" ? "START" : rawTo === "__end__" ? "END" : rawTo;
      mainEdges.push({
        from,
        to,
        order: to === "END" ? 0 : (Number(target?.parallelOrder) || 1),
        ...(to === "END" ? {} : { kind: edge?.kind === "merge" ? "merge" : "primary" }),
      });
    });

    const loopFlows = {};
    Object.entries(loopEdges).forEach(([ownerId, edges]) => {
      loopFlows[ownerId] = { edges };
    });
    return { mainEdges, loopFlows };
  }

  function projectNotes(state) {
    return (Array.isArray(state?.stickyNotes) ? state.stickyNotes : []).map((note) => ({
      note_id: String(note?.id || ""),
      ui_position: {
        x: Math.round(Number(note?.x) || 0),
        y: Math.round(Number(note?.y) || 0),
      },
      size: {
        width: Math.round(Number(note?.w) || 0),
        height: Math.round(Number(note?.h) || 0),
      },
      text: String(note?.text || ""),
      color: String(note?.color || ""),
    }));
  }

  function projectDocument(state, config) {
    const fallbackProjectionState = cloneValue(state || {});
    const projector = uiPkg.workflowDisplayProjector || {};
    const model = typeof projector.buildFlowModel === "function"
      ? projector.buildFlowModel(state || {}, config || {})
      : { nodeMap: new Map(), edges: [] };
    const projectionState = model?.projectionState || fallbackProjectionState;
    const edges = projectEdges(projectionState, model);
    const document = {
      metadata: {
        mode: String(projectionState.appMode || ""),
        name: String(projectionState.flowName || ""),
      },
      steps: projectSteps(projectionState, model),
      flows: {
        main: {
          start: {
            ui_position: {
              x: Math.round(Number(model?.start?.x) || 0),
              y: Math.round(Number(model?.start?.y) || 0),
            },
          },
          end: {
            ui_position: {
              x: Math.round(Number(model?.end?.x) || 0),
              y: Math.round(Number(model?.end?.y) || 0),
            },
          },
          edges: edges.mainEdges,
        },
      },
      notes: projectNotes(projectionState),
    };
    if (Object.keys(edges.loopFlows).length) {
      document.loop = { flows: edges.loopFlows };
    }
    return document;
  }

  function projectSelection(state, annotationIds = []) {
    const selectedNodeIds = Array.isArray(state?.selectedNodeIds)
      ? state.selectedNodeIds
      : (state?.selectedNodeId ? [state.selectedNodeId] : []);
    return {
      nodes: selectedNodeIds
        .map((nodeId) => String(nodeId || "").trim())
        .filter(Boolean)
        .map((nodeId) => ({ node_id: nodeId })),
      edges: [],
      annotation_ids: selectedNodeIds.length
        ? []
        : (Array.isArray(annotationIds) ? annotationIds : [])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
    };
  }

  function projectStatus(state) {
    const statusByStep = state?.stepStatuses && typeof state.stepStatuses === "object"
      ? state.stepStatuses
      : {};
    const nodeStatus = {};
    (Array.isArray(state?.nodes) ? state.nodes : []).forEach((node) => {
      const nodeId = String(node?.id || "").trim();
      const stepName = String(node?.stepName || "").trim();
      const status = String(statusByStep[stepName] || "").trim().toLowerCase();
      if (nodeId && status) nodeStatus[nodeId] = status;
    });
    return { nodeStatus, validation: {} };
  }

  function mergeProjectedNotes(currentNotes, projectedNotes) {
    const currentById = new Map((Array.isArray(currentNotes) ? currentNotes : [])
      .map((note) => [String(note?.id || "").trim(), note]));
    return (Array.isArray(projectedNotes) ? projectedNotes : []).map((note) => {
      const noteId = String(note?.note_id || "").trim();
      const current = currentById.get(noteId) || {};
      return {
        ...current,
        id: noteId,
        x: Math.round(Number(note?.ui_position?.x) || 0),
        y: Math.round(Number(note?.ui_position?.y) || 0),
        w: Math.max(120, Math.round(Number(note?.size?.width) || 0)),
        h: Math.max(72, Math.round(Number(note?.size?.height) || 0)),
        text: String(note?.text || ""),
        color: String(note?.color || ""),
      };
    }).filter((note) => !!note.id);
  }

  function acceptDocumentChange(runtime, payload) {
    const patch = Array.isArray(payload?.patch) ? payload.patch : [];
    if (!patch.length) return false;
    const applyDocumentPatch = packages.workflowDesigner?.applyDocumentPatch;
    if (typeof applyDocumentPatch !== "function") return false;
    const projected = projectDocument(runtime.state, runtime.config);
    let changedDocument;
    try {
      changedDocument = applyDocumentPatch(projected, patch);
    } catch (_) {
      runtime.instance.setDocument(projected);
      return false;
    }

    const stateOps = packages.core?.stateOps || root.stateOps || {};
    let changed = false;
    let notesChanged = false;
    patch.forEach((operation) => {
      const path = Array.isArray(operation?.path) ? operation.path : [];
      if (path[0] === "steps" && Number.isInteger(path[1]) && path[2] === "ui_position" && path.length === 3) {
        const projectedStep = changedDocument.steps?.[path[1]];
        const next = stateOps.setNodeCanvasPosition?.(
          runtime.state,
          projectedStep?.step_id,
          projectedStep?.ui_position,
          { snap: false }
        );
        changed = !!next || changed;
        return;
      }
      if (path[0] === "notes") notesChanged = true;
    });
    if (notesChanged) {
      runtime.state.stickyNotes = mergeProjectedNotes(runtime.state.stickyNotes, changedDocument.notes);
      changed = true;
    }
    if (!changed) {
      runtime.instance.setDocument(projected);
      return false;
    }
    runtime.onStateChanged?.();
    return true;
  }

  function bindLibraryEvents(runtime) {
    const cleanup = [];
    const facade = uiPkg.workflowCommandFacade || root.zizWorkflowCommandFacade || {};
    const publishSelectionGesture = (selectedIds) => {
      const kind = selectedIds.length === 1 ? "single" : (selectedIds.length > 1 ? "multi" : "clear");
      root.dispatchEvent(new CustomEvent("ziz:flow-selection-gesture", {
        detail: { kind },
      }));
    };
    cleanup.push(runtime.instance.on("document:change", (payload) => {
      acceptDocumentChange(runtime, payload);
    }));
    cleanup.push(runtime.instance.on("selection:change", (payload) => {
      const stateOps = packages.core?.stateOps || root.stateOps || {};
      const selectedIds = (Array.isArray(payload?.selection?.nodes) ? payload.selection.nodes : [])
        .map((ref) => String(ref?.node_id || "").trim())
        .filter(Boolean);
      if (typeof stateOps.setSelectedNodes === "function") {
        stateOps.setSelectedNodes(runtime.state, selectedIds, { allowEmpty: true });
      } else {
        runtime.state.selectedNodeIds = selectedIds;
        runtime.state.selectedNodeId = selectedIds[0] || null;
      }
      runtime.annotationSelection = (Array.isArray(payload?.selection?.annotation_ids)
        ? payload.selection.annotation_ids
        : []).map((value) => String(value || "").trim()).filter(Boolean);
      runtime.ignoreNextBlankClick = !!(selectedIds.length || runtime.annotationSelection.length);
      publishSelectionGesture(selectedIds);
      runtime.onStateChanged?.({ history: false });
    }));
    cleanup.push(runtime.instance.on("viewport:change", (payload) => {
      runtime.viewport = cloneValue(payload?.viewport || null);
    }));
    cleanup.push(runtime.instance.on("annotation:mode-change", (payload) => {
      runtime.annotationMode = !!payload?.active;
    }));
    cleanup.push(runtime.instance.on("node:add-request", (payload) => {
      facade.handleNodeAdd?.(runtime, payload);
    }));
    cleanup.push(runtime.instance.on("connect:create-request", (payload) => {
      facade.handleConnectCreate?.(runtime, payload);
    }));
    cleanup.push(runtime.instance.on("connect:drop-request", (payload) => {
      facade.handleConnectDrop?.(runtime, payload);
    }));
    cleanup.push(runtime.instance.on("delete:request", (payload) => {
      facade.handleDeleteRequest?.(runtime, payload);
    }));
    cleanup.push(runtime.instance.on("run:request", (payload) => {
      facade.handleRunRequest?.(runtime, payload);
    }));
    cleanup.push(runtime.instance.on("node:open-detail", (payload) => {
      facade.handleNodeOpenDetail?.(runtime, payload);
    }));
    cleanup.push(runtime.instance.on("external-link:open-request", (payload) => {
      facade.openExternalLink?.(payload?.url);
    }));
    cleanup.push(runtime.instance.on("command:execute", (payload) => {
      facade.handleCommand?.(runtime, payload);
    }));
    const viewportElement = runtime.rootElement.querySelector(".zwd-viewport");
    const handleBlankClick = (event) => {
      if (event.button !== 0 || runtime.instance.getAnnotationMode?.()) return;
      if (runtime.ignoreNextBlankClick) {
        runtime.ignoreNextBlankClick = false;
        return;
      }
      if (event.target.closest("[data-node-key], [data-edge-key], [data-note-id]")) return;
      const stateOps = packages.core?.stateOps || root.stateOps || {};
      if (typeof stateOps.setSelectedNodes === "function") {
        stateOps.setSelectedNodes(runtime.state, [], { allowEmpty: true });
      } else {
        runtime.state.selectedNodeIds = [];
        runtime.state.selectedNodeId = null;
      }
      runtime.annotationSelection = [];
      publishSelectionGesture([]);
      runtime.onStateChanged?.({ history: false });
    };
    viewportElement?.addEventListener("click", handleBlankClick);
    cleanup.push(() => viewportElement?.removeEventListener("click", handleBlankClick));
    const handlePointerUp = () => {
      if (!runtime.ignoreNextBlankClick) return;
      root.setTimeout(() => {
        runtime.ignoreNextBlankClick = false;
      }, 0);
    };
    viewportElement?.addEventListener("pointerup", handlePointerUp);
    cleanup.push(() => viewportElement?.removeEventListener("pointerup", handlePointerUp));
    const designerElement = runtime.rootElement.querySelector(":scope > .zwd");
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      const menu = runtime.rootElement.querySelector(".zwd-context-menu");
      if (menu) menu.hidden = true;
    };
    designerElement?.addEventListener("keydown", handleEscape);
    cleanup.push(() => designerElement?.removeEventListener("keydown", handleEscape));
    runtime.cleanup = cleanup;
  }

  function renderFlowChart({ root: rootElement, state, config, onStateChanged }) {
    if (!(rootElement instanceof HTMLElement)) return null;
    const library = packages.workflowDesigner || {};
    if (typeof library.createWorkflowDesigner !== "function") {
      throw new Error("WorkflowDesigner library is not available");
    }

    let runtime = rootElement.__workflowDesignerAdapterRuntime || null;
    if (!runtime) {
      rootElement.classList.add("workflow-designer-host");
      const facade = uiPkg.workflowCommandFacade || root.zizWorkflowCommandFacade || {};
      const nextRuntime = {
        instance: null,
        rootElement,
        state,
        config,
        onStateChanged,
        annotationMode: false,
        annotationSelection: [],
        ignoreNextBlankClick: false,
        viewport: null,
        cleanup: [],
        documentFingerprint: JSON.stringify(projectDocument(state, config)),
      };
      const stateOps = packages.core?.stateOps || root.stateOps || {};
      const layoutContract = stateOps.getCanvasLayoutContract?.() || {};
      const nodeRenderers = {
        default: {
          renderIcon(step) {
            const stepId = String(step?.step_id || "").trim();
            const node = (Array.isArray(nextRuntime.state?.nodes)
              ? nextRuntime.state.nodes
              : []).find((item) => String(item?.id || "") === stepId) || null;
            const src = shared.getConnectorImageSrc?.(
              node?.connector,
              nextRuntime.config
            ) || shared.NOIMAGE_SRC || "";
            if (!src) return null;
            const image = root.document.createElement("img");
            image.alt = "";
            image.draggable = false;
            image.src = src;
            image.addEventListener("error", () => {
              const fallback = String(shared.NOIMAGE_SRC || "").trim();
              if (fallback && image.getAttribute("src") !== fallback) {
                image.src = fallback;
              }
            });
            return image;
          },
        },
      };
      const instance = library.createWorkflowDesigner({
        root: rootElement,
        document: projectDocument(state, config),
        selection: projectSelection(state),
        status: projectStatus(state),
        graphMode: "dag",
        nodeGrid: layoutContract.nodeGrid || { enabled: true, size: 32 },
        nodeMetrics: layoutContract.nodeMetrics,
        nodeRenderers,
        connectionSnapDistance: 28,
        noteColors: ["#fff2a8", "#dff7e8", "#e7edff"],
        contextActions: ({ target }) => facade.getContextActions?.(nextRuntime, target) || [],
        commandLabels: {
          designer: "フローチャートキャンバス",
          canvasTools: "フロー操作",
          zoomIn: "拡大",
          zoomOut: "縮小",
          undo: "戻る",
          redo: "進む",
          annotationMode: "付箋モード",
          addNote: "付箋作成",
          runWorkflow: "実行",
        },
      });
      instance.mount();
      nextRuntime.instance = instance;
      runtime = nextRuntime;
      bindLibraryEvents(runtime);
      rootElement.__workflowDesignerAdapterRuntime = runtime;
      return runtime;
    }

    runtime.state = state;
    runtime.config = config;
    runtime.onStateChanged = onStateChanged;
    const nextDocument = projectDocument(state, config);
    const nextFingerprint = JSON.stringify(nextDocument);
    if (runtime.documentFingerprint !== nextFingerprint) {
      runtime.instance.setDocument(nextDocument);
      runtime.documentFingerprint = nextFingerprint;
    }
    runtime.instance.setSelection(projectSelection(state, runtime.annotationSelection));
    runtime.instance.setStatus(projectStatus(state));
    return runtime;
  }

  function destroyFlowCanvas(rootElement) {
    if (!(rootElement instanceof HTMLElement)) return;
    const runtime = rootElement.__workflowDesignerAdapterRuntime || null;
    (runtime?.cleanup || []).splice(0).forEach((remove) => remove());
    if (runtime) runtime.instance?.destroy?.();
    delete rootElement.__workflowDesignerAdapterRuntime;
    rootElement.classList.remove("workflow-designer-host");
  }

  function refreshFlowStatus({ root: rootElement, state }) {
    const runtime = rootElement?.__workflowDesignerAdapterRuntime || null;
    if (!runtime) return false;
    runtime.state = state;
    runtime.instance.setStatus(projectStatus(state));
    return true;
  }

  const adapterApi = {
    projectDocument,
    renderFlowChart,
    destroyFlowCanvas,
    refreshFlowStatus,
  };
  root.zizWorkflowDesignerAdapter = adapterApi;
  uiPkg.workflowDesignerAdapter = adapterApi;
})(window);
