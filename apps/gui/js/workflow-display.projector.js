(function (root) {
  "use strict";

  const packages = root.zizPackages = root.zizPackages || {};
  const uiPkg = packages.ui = packages.ui || {};
  const shared = uiPkg.nodeShared || root.uiNodeShared || {};
  const {
    getMergeParentIds,
    ensureNodeDefaults,
    getActionLabel,
    getConnectorLabel,
    isLoopRootNode,
  } = shared;
  const DEFAULT_CONSTANTS = {
    NODE_W: 106,
    NODE_H: 88,
    LEVEL_MARGIN: 112,
    MIN_SIBLING_GAP: 8,
    START_X: 28,
    GRID_ORIGIN_X: 44,
    START_Y: 40,
    GRID_SIZE: 32,
  };
  const CANVAS_MIN_WIDTH = 2000;
  const CANVAS_MIN_HEIGHT = 1200;
  const CANVAS_PADDING_RIGHT = 520;
  const CANVAS_PADDING_BOTTOM = 260;

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

  function buildFlowModel(state, config, canvasConstants) {
    const projectionState = cloneValue(state || {});
    const nodes = Array.isArray(projectionState?.nodes) ? projectionState.nodes : [];
    const stateOps = packages.core?.stateOps || root.stateOps || {};
    const layoutContract = stateOps.getCanvasLayoutContract?.() || {};
    const constants = {
      ...DEFAULT_CONSTANTS,
      ...(layoutContract.projector || {}),
      ...(canvasConstants || {})
    };
    const {
      NODE_W,
      NODE_H,
      LEVEL_MARGIN,
      MIN_SIBLING_GAP,
      START_X,
      GRID_ORIGIN_X,
      START_Y,
      GRID_SIZE,
    } = constants;

    function clampCanvasCoordinate(value) {
      return Math.max(8, Math.round(Number(value) || 0));
    }

    function roundGridUnit(value) {
      return Math.round(Number(value || 0) * 1000) / 1000;
    }

    function toCanvasCoordinate(unit, origin) {
      const size = Math.max(1, Number(GRID_SIZE) || 32);
      const base = Number.isFinite(Number(origin)) ? Number(origin) : 0;
      const rawUnit = Number(unit);
      if (!Number.isFinite(rawUnit)) return base;
      return clampCanvasCoordinate(base + rawUnit * size);
    }

    function toGridCoordinate(value, origin) {
      const size = Math.max(1, Number(GRID_SIZE) || 32);
      const base = Number.isFinite(Number(origin)) ? Number(origin) : 0;
      const raw = Number(value);
      if (!Number.isFinite(raw)) return 0;
      return roundGridUnit((raw - base) / size);
    }

    function normalizeCanvasPosition(value) {
      if (!value || typeof value !== "object") return null;
      const x = Number(value.x);
      const y = Number(value.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        x: clampCanvasCoordinate(x),
        y: clampCanvasCoordinate(y),
      };
    }

    function normalizeCanvasGridPosition(value) {
      if (!value || typeof value !== "object") return null;
      const x = Number(value.x);
      const y = Number(value.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    }

    function canvasPositionToGrid(position) {
      const normalized = normalizeCanvasPosition(position);
      if (!normalized) return null;
      return {
        x: toGridCoordinate(normalized.x, GRID_ORIGIN_X),
        y: toGridCoordinate(normalized.y, START_Y),
      };
    }

    function gridPositionToCanvas(position) {
      const normalized = normalizeCanvasGridPosition(position);
      if (!normalized) return null;
      return normalizeCanvasPosition({
        x: toCanvasCoordinate(normalized.x, GRID_ORIGIN_X),
        y: toCanvasCoordinate(normalized.y, START_Y),
      });
    }

    function resolveStoredCanvasPosition(nodeLike) {
      const storedGrid = normalizeCanvasGridPosition(nodeLike?.canvasGridPosition);
      if (storedGrid) {
        const fromGrid = gridPositionToCanvas(storedGrid);
        if (fromGrid) return fromGrid;
      }
      return normalizeCanvasPosition(nodeLike?.canvasPosition);
    }

    function normalizeStickyNote(note) {
      if (!note || typeof note !== "object") return null;
      const id = String(note.id || "").trim();
      const x = Number(note.x);
      const y = Number(note.y);
      const w = Number(note.w);
      const h = Number(note.h);
      if (!id) return null;
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return null;
      return {
        id,
        x: clampCanvasCoordinate(x),
        y: clampCanvasCoordinate(y),
        w: Math.max(120, Math.round(w)),
        h: Math.max(72, Math.round(h)),
        text: String(note.text || ""),
        color: String(note.color || "#ebebf2"),
        anchorNodeId: note.anchorNodeId ? String(note.anchorNodeId) : null,
      };
    }

    function applyNodeCanvasCoordinates(node, normalizedNode, position) {
      const normalizedPosition = normalizeCanvasPosition(position);
      if (!normalizedPosition) return null;
      const normalizedGrid = canvasPositionToGrid(normalizedPosition);
      if (node) {
        node.canvasPosition = normalizedPosition;
        if (normalizedGrid) node.canvasGridPosition = normalizedGrid;
      }
      if (normalizedNode) {
        normalizedNode.canvasPosition = normalizedPosition;
        if (normalizedGrid) normalizedNode.canvasGridPosition = normalizedGrid;
      }
      return normalizedPosition;
    }

    function applyStoredNodePositions(normalizedNodes, viewById, rawById) {
      normalizedNodes.forEach((normalizedNode) => {
        const view = viewById.get(normalizedNode.id);
        if (!view) return;
        const rawNode = rawById.get(normalizedNode.id) || normalizedNode;
        const storedPosition = resolveStoredCanvasPosition(rawNode) || resolveStoredCanvasPosition(normalizedNode);
        if (storedPosition) {
          view.x = storedPosition.x;
          view.y = storedPosition.y;
          applyNodeCanvasCoordinates(rawNode, normalizedNode, storedPosition);
          return;
        }

        const autoPosition = {
          x: clampCanvasCoordinate(view.x),
          y: clampCanvasCoordinate(view.y),
        };
        applyNodeCanvasCoordinates(rawNode, normalizedNode, autoPosition);
      });
    }

    function createPseudoNode(id, text, kind) {
      return {
        id,
        text,
        kind,
        x: 0,
        y: 0,
        subtreeHeight: NODE_H,
        children: [],
      };
    }

    function createTaskView(node) {
      return {
        id: node.id,
        kind: "task",
        nodeRef: node,
        x: 0,
        y: 0,
        subtreeHeight: NODE_H,
        children: [],
        title: getConnectorLabel(config, node.connector),
        subtitle: getActionLabel(config, node.connector, node.action),
        description: String(node.description || ""),
      };
    }

    const start = createPseudoNode("__start__", "START", "start");
    const end = createPseudoNode("__end__", "END", "end");
    const rawById = new Map();
    nodes.forEach((node) => {
      ensureNodeDefaults(config, node);
      rawById.set(node.id, node);
    });

    const normalizedNodes = nodes.map((node, idx) => {
      let parentId = node.parentId || null;
      if (parentId && !rawById.has(parentId)) parentId = null;
      const parallelOrder = Number(node.parallelOrder) || idx + 1;
      const mergeParentIds = getMergeParentIds(node).filter((id) => rawById.has(id) && id !== parentId);
      return { ...node, parentId, mergeParentIds, parallelOrder };
    });

    const parentKey = (parentId) => parentId || start.id;
    const childrenByParent = new Map();
    function pushChild(parentId, node) {
      const key = parentKey(parentId);
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key).push(node);
    }
    normalizedNodes.forEach((node) => pushChild(node.parentId, node));
    childrenByParent.forEach((children) => {
      children.sort((a, b) => {
        const aOrder = Number(a.parallelOrder) || 1;
        const bOrder = Number(b.parallelOrder) || 1;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return 0;
      });
    });
    function getChildren(parentId) {
      return childrenByParent.get(parentKey(parentId)) || [];
    }

    const viewById = new Map();
    normalizedNodes.forEach((node) => viewById.set(node.id, createTaskView(node)));

    const loopMetaByRootId = new Map();
    const loopOwnerByNodeId = new Map();
    normalizedNodes.filter((node) => isLoopRootNode(node)).forEach((rootNode) => {
      const chainIds = [];
      const seen = new Set([rootNode.id]);
      let currentId = rootNode.id;
      while (true) {
        const next = getChildren(currentId).find((child) => child.loopOwnerId === rootNode.id);
        if (!next || seen.has(next.id)) break;
        chainIds.push(next.id);
        loopOwnerByNodeId.set(next.id, rootNode.id);
        seen.add(next.id);
        currentId = next.id;
      }

      const outsideIds = getChildren(rootNode.id)
        .filter((child) => child.loopOwnerId !== rootNode.id)
        .map((child) => child.id);
      loopMetaByRootId.set(rootNode.id, {
        rootId: rootNode.id,
        chainIds,
        chainSet: new Set(chainIds),
        outsideIds,
      });
    });

    const displayChildren = new Map();
    const setDisplayChildren = (id, ids) => displayChildren.set(id, (ids || []).filter(Boolean));
    setDisplayChildren(start.id, getChildren(null).map((node) => node.id));

    normalizedNodes.forEach((node) => {
      if (isLoopRootNode(node) && loopMetaByRootId.has(node.id)) {
        const meta = loopMetaByRootId.get(node.id);
        const firstInner = meta.chainIds[0] || null;
        const childIds = [];
        if (firstInner) childIds.push(firstInner);
        childIds.push(...meta.outsideIds);
        setDisplayChildren(node.id, childIds);
        return;
      }

      const ownerRootId = loopOwnerByNodeId.get(node.id);
      if (ownerRootId) {
        const meta = loopMetaByRootId.get(ownerRootId);
        const chain = meta?.chainIds || [];
        const index = chain.indexOf(node.id);
        const nextInChain = index >= 0 ? chain[index + 1] : null;
        const realChildren = getChildren(node.id).map((child) => child.id);
        const extraChildren = realChildren.filter((id) => id !== nextInChain);
        const nextIds = [];
        if (nextInChain) nextIds.push(nextInChain);
        nextIds.push(...extraChildren);
        setDisplayChildren(node.id, nextIds);
        return;
      }

      setDisplayChildren(node.id, getChildren(node.id).map((child) => child.id));
    });

    const initialLayoutY = START_Y;
    start.x = START_X;
    start.y = initialLayoutY;

    const depthById = new Map([[start.id, 0]]);
    const nodeMap = new Map([[start.id, start], ...Array.from(viewById.entries()), [end.id, end]]);
    function layoutNode(nodeId, depth, y, visiting) {
      const view = nodeMap.get(nodeId);
      if (!view) return y + NODE_H;
      if (visiting.has(nodeId)) return y + NODE_H;

      visiting.add(nodeId);
      view.x = START_X + LEVEL_MARGIN * depth;
      view.y = y;
      depthById.set(nodeId, depth);

      const children = displayChildren.get(nodeId) || [];
      let bottom = y + NODE_H;
      let childY = y;
      children.forEach((childId) => {
        const childBottom = layoutNode(childId, depth + 1, childY, visiting);
        bottom = Math.max(bottom, childBottom);
        childY = childBottom + MIN_SIBLING_GAP;
      });
      visiting.delete(nodeId);
      return bottom;
    }

    const rootChildren = displayChildren.get(start.id) || [];
    let yCursor = initialLayoutY;
    rootChildren.forEach((childId) => {
      const subtreeBottom = layoutNode(childId, 1, yCursor, new Set([start.id]));
      yCursor = subtreeBottom + MIN_SIBLING_GAP;
    });
    applyStoredNodePositions(normalizedNodes, viewById, rawById);

    const taskViews = normalizedNodes.map((node) => viewById.get(node.id)).filter(Boolean);
    const loopEndViews = [];
    const stickyNotes = (Array.isArray(projectionState.stickyNotes) ? projectionState.stickyNotes : [])
      .map((note) => normalizeStickyNote(note))
      .filter(Boolean);
    const edges = [];
    const edgeKeys = new Set();
    const pushEdge = (from, to, kind) => {
      if (!from || !to) return;
      const key = `${from}->${to}:${kind}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({ from, to, kind });
    };

    displayChildren.forEach((children, parentId) => {
      children.forEach((childId, index) => {
        pushEdge(parentId, childId, index === 0 ? "tree" : "parallel");
      });
    });
    loopMetaByRootId.forEach((meta) => {
      const tailId = meta.chainIds.length ? meta.chainIds[meta.chainIds.length - 1] : null;
      if (tailId) pushEdge(tailId, meta.rootId, "loop-back");
    });
    normalizedNodes.forEach((node) => {
      (node.mergeParentIds || []).forEach((mergeParentId) => {
        pushEdge(mergeParentId, node.id, "merge");
      });
    });

    const outgoingIds = new Set(edges.map((edge) => edge.from));
    const leaves = [...taskViews, ...loopEndViews].filter((view) => !outgoingIds.has(view.id));
    leaves.forEach((leaf) => {
      pushEdge(leaf.id, end.id, leaf.kind === "loop-end" ? "to-end-main" : "to-end");
    });
    if (!leaves.length) pushEdge(start.id, end.id, "to-end-main");

    const maxDepth = Math.max(1, ...Array.from(depthById.values()));
    const maxTaskX = taskViews.length ? Math.max(...taskViews.map((view) => view.x)) : START_X;
    const maxLoopEndX = loopEndViews.length ? Math.max(...loopEndViews.map((view) => view.x)) : START_X;
    const rightMostNodeX = Math.max(START_X, maxTaskX, maxLoopEndX);
    end.x = Math.max(
      START_X + LEVEL_MARGIN * (maxDepth + 1),
      rightMostNodeX + LEVEL_MARGIN,
    );
    end.y = initialLayoutY;

    const controls = [];
    const loopFrames = [];
    loopMetaByRootId.forEach((meta) => {
      const views = [meta.rootId, ...meta.chainIds].map((id) => nodeMap.get(id)).filter(Boolean);
      if (!views.length) return;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      views.forEach((view) => {
        minX = Math.min(minX, view.x);
        minY = Math.min(minY, view.y);
        maxX = Math.max(maxX, view.x + NODE_W);
        maxY = Math.max(maxY, view.y + NODE_H);
      });
      const padX = 24;
      const padY = 20;
      loopFrames.push({
        loopRootId: meta.rootId,
        x: minX - padX,
        y: minY - padY,
        w: (maxX - minX) + padX * 2,
        h: (maxY - minY) + padY * 2,
      });
    });

    const drawableNodes = [start, ...taskViews, ...loopEndViews, end];
    const maxNodeX = Math.max(START_X, ...drawableNodes.map((node) => node.x));
    const maxNodeY = Math.max(START_Y, ...drawableNodes.map((node) => node.y));
    const maxFrameX = loopFrames.length ? Math.max(...loopFrames.map((frame) => frame.x + frame.w)) : 0;
    const maxFrameY = loopFrames.length ? Math.max(...loopFrames.map((frame) => frame.y + frame.h)) : 0;
    const maxNoteX = stickyNotes.length ? Math.max(...stickyNotes.map((note) => note.x + note.w)) : 0;
    const maxNoteY = stickyNotes.length ? Math.max(...stickyNotes.map((note) => note.y + note.h)) : 0;
    const width = Math.max(
      CANVAS_MIN_WIDTH,
      end.x + NODE_W + CANVAS_PADDING_RIGHT,
      maxNodeX + NODE_W + CANVAS_PADDING_RIGHT,
      maxFrameX + CANVAS_PADDING_RIGHT,
      maxNoteX + CANVAS_PADDING_RIGHT,
    );
    const height = Math.max(
      CANVAS_MIN_HEIGHT,
      maxNodeY + NODE_H + CANVAS_PADDING_BOTTOM,
      maxFrameY + CANVAS_PADDING_BOTTOM,
      maxNoteY + CANVAS_PADDING_BOTTOM,
    );

    return {
      projectionState,
      start,
      end,
      taskViews,
      loopEndViews,
      nodeMap,
      edges,
      controls,
      loopFrames,
      stickyNotes,
      width,
      height,
    };
  }

  uiPkg.workflowDisplayProjector = { buildFlowModel };
})(window);
