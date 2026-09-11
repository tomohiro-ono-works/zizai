const { test, expect } = require("@playwright/test");


async function openDataflow(page) {
  await page.goto("/gui/dataflow.html?mode=dataflow&embedded=1");
  await page.waitForFunction(() => !!window.zizEmbeddedApi);
}


// Catalogのnode itemが内部clipboardへ渡す許可fieldだけのtemplate。構造metadataは含まない。
const NODE_TEMPLATE = {
  connector: "WindowsConnector",
  action: "define_values",
  description: "テンプレートの説明",
  descriptionAuto: false,
  form: { define_values: [{ name: "from_template", value: "template-value" }] },
};


function taskStep(stepId, x, y, extra = {}) {
  return {
    step_id: stepId,
    connector: "windows_connector",
    action: "define_values",
    params: {},
    output_variable: stepId,
    ui_position: { x, y },
    ...extra,
  };
}


async function mountFlow(page, flow) {
  await openDataflow(page);
  await page.evaluate((value) => {
    window.dispatchEvent(new CustomEvent("ziz:workspace-flow-open", {
      detail: {
        selected: true,
        mode: "dataflow",
        file_name: "adapter.zizd",
        flow: value,
      },
    }));
  }, flow);
  await expect(page.locator("#flowchart > .zwd")).toBeVisible();
}


async function readSavedFlow(page) {
  return page.evaluate(async () => {
    const bridge = window.zizBridge;
    const originalCall = bridge.call;
    let saved = null;
    bridge.call = async (type, payload) => {
      if (type === "flow.save") saved = payload?.flow || null;
      return {};
    };
    try {
      await window.zizEmbeddedApi.saveFlow();
    } finally {
      bridge.call = originalCall;
    }
    return saved;
  });
}


async function installBridgeSpy(page) {
  await page.evaluate(() => {
    const bridge = window.zizBridge;
    const calls = [];
    const externals = [];
    window.__workflowDesignerBridgeSpy = { calls, externals };
    bridge.available = () => true;
    bridge.isAllowedExternalUrl = (url) => /^https?:\/\//i.test(String(url || ""));
    bridge.call = async (type, payload) => {
      calls.push({ type, payload });
      if (type === "flow.run") return { run_id: "run-adapter" };
      if (type === "app.getStatus") return { capabilities: ["app.openExternal"] };
      return {};
    };
    bridge.openExternal = async (url, options) => {
      externals.push({ url, options });
      return { accepted: true };
    };
  });
}


async function readBridgeSpy(page) {
  return page.evaluate(() => ({
    calls: window.__workflowDesignerBridgeSpy.calls.map((entry) => ({
      type: entry.type,
      payload: entry.payload,
    })),
    externals: window.__workflowDesignerBridgeSpy.externals.slice(),
  }));
}


function workflowMenuItems(page) {
  return page.locator(".zwd-context-menu [role='menuitem']");
}


async function rightDrag(page, source, target) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 8 }
  );
  await page.mouse.up({ button: "right" });
}


async function edgeMidpoint(edge) {
  return edge.evaluate((element) => {
    const path = element.matches("path") ? element : element.querySelector("path");
    const length = path.getTotalLength();
    const point = path.getPointAtLength(length / 2);
    const screen = point.matrixTransform(path.getScreenCTM());
    return { x: screen.x, y: screen.y };
  });
}


// data-edge-key付きSVG groupの実描画pathを等間隔に走査し、
// 最前面のhit targetが同じedgeになる座標だけを返す。時間待ちや再試行を使わない。
async function edgeHitPoint(page, edgeKey) {
  return page.evaluate((key) => {
    const group = document.querySelector(`.zwd-edge[data-edge-key="${key}"]`);
    const path = group?.querySelector(".zwd-edge__hit");
    if (!path) return null;
    const length = path.getTotalLength();
    const samples = 24;
    for (let index = 0; index <= samples; index += 1) {
      const point = path.getPointAtLength((length * index) / samples);
      const screen = point.matrixTransform(path.getScreenCTM());
      const hit = document.elementFromPoint(screen.x, screen.y)?.closest?.("[data-edge-key]");
      if (hit?.dataset.edgeKey === key) return { x: screen.x, y: screen.y };
    }
    return null;
  }, edgeKey);
}


async function openEdgeContextMenu(page, edgeKey) {
  const point = await edgeHitPoint(page, edgeKey);
  expect(point, `edge is not hittable: ${edgeKey}`).toBeTruthy();
  await page.mouse.click(point.x, point.y, { button: "right" });
}


async function hittableEdgePoint(page) {
  return page.evaluate(() => {
    for (const path of document.querySelectorAll(".zwd-edge__hit")) {
      const length = path.getTotalLength();
      for (const ratio of [0.5, 0.35, 0.65]) {
        const point = path.getPointAtLength(length * ratio);
        const screen = point.matrixTransform(path.getScreenCTM());
        const owner = path.closest("[data-edge-key]");
        if (owner?.dataset.edgeKey.includes(":START:") || owner?.dataset.edgeKey.endsWith(":END")) continue;
        const hit = document.elementFromPoint(screen.x, screen.y)?.closest?.("[data-edge-key]");
        if (owner && hit?.dataset.edgeKey === owner.dataset.edgeKey) {
          return { x: screen.x, y: screen.y, edgeKey: owner.dataset.edgeKey };
        }
      }
    }
    return null;
  });
}


test("動的loaderはdataflow.htmlと同じlibrary前提をnode detailより前に読み込む", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  // home.htmlはui.node.*を静的読込しないため、ui.node.jsの動的loader経路がそのまま動く。
  await page.goto("/gui/home.html");
  await page.waitForFunction(() => !!window.zizPackages?.ui);

  const loaded = await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "./js/ui.node.js";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("ui.node.js failed to load")), { once: true });
      document.head.appendChild(script);
    });
    await window.zizPackages.ui.nodeLoader.ensureLoaded();
    const html = await (await fetch("./dataflow.html")).text();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const toPath = (src) => new URL(src, document.baseURI).pathname;
    return {
      loaderPaths: Array.from(document.querySelectorAll("script[data-ziz-ui-node-part]"))
        .map((element) => toPath(element.getAttribute("src"))),
      dataflowPaths: Array.from(parsed.querySelectorAll("script[src]"))
        .map((element) => toPath(element.getAttribute("src"))),
      nodeFormAdapterReady: typeof window.zizPackages.ui.nodeFormAdapter?.mountNodeForm === "function",
      dataViewerAdapterReady: typeof window.zizPackages.ui.dataViewerAdapter?.mountDataViewer === "function",
      nodeDetailReady: typeof window.zizPackages.ui.nodeDetail?.renderNodeDetail === "function",
      nodeRuntimeReady: typeof window.zizPackages.ui.node?.renderFlowChart === "function",
    };
  });

  expect(pageErrors).toEqual([]);
  expect(loaded.nodeDetailReady).toBe(true);
  expect(loaded.nodeRuntimeReady).toBe(true);
  expect(loaded.nodeFormAdapterReady).toBe(true);
  expect(loaded.dataViewerAdapterReady).toBe(true);

  // node detailはevaluation時にnodeForm/DataViewer Adapterを捕捉するため、順序が契約になる。
  expect(loaded.loaderPaths).toEqual([
    "/gui/js/ui.node.shared.js",
    "/gui/js/workflow-command.facade.js",
    "/gui/js/workflow-display.projector.js",
    "/gui/vendor/zizai-workflow-designer/src/workflow_designer.js",
    "/gui/js/workflow-designer.adapter.js",
    "/gui/vendor/zizai-form/src/node-form.js",
    "/gui/js/node-form.adapter.js",
    "/gui/vendor/zizai-data-viewer/src/report-viewer.js",
    "/gui/js/data-viewer.adapter.js",
    "/gui/js/ui.node.detail.js",
    "/gui/js/ui.node.runtime.js",
  ]);

  // 同じ前提が同じ相対順序でdataflow.htmlにも並んでいることを確認する。
  const orderInDataflow = loaded.loaderPaths.map((path) => loaded.dataflowPaths.indexOf(path));
  expect(orderInDataflow).not.toContain(-1);
  expect(orderInDataflow).toEqual([...orderInDataflow].sort((left, right) => left - right));
});


test("Application stateをlibrary Documentへ非破壊で投影する", async ({ page }) => {
  await openDataflow(page);

  const result = await page.evaluate(() => {
    const adapter = window.zizPackages?.ui?.workflowDesignerAdapter;
    const state = {
      appMode: "dataflow",
      flowName: "Adapter contract",
      nextStepSeq: 3,
      selectedNodeId: "node-a",
      selectedNodeIds: ["node-a"],
      nodes: [
        {
          id: "node-a",
          stepName: "step1",
          connector: "windows_connector",
          action: "define_values",
          nodeType: "task",
          description: "first",
          descriptionAuto: false,
          form: { define_values: [{ name: "answer", value: "42" }] },
          parentId: null,
          parallelOf: null,
          parallelOrder: 1,
          mergeParentIds: [],
          canvasPosition: { x: 140, y: 40 },
          canvasGridPosition: { x: 3, y: 0 },
          applicationMetadata: { preserve: true },
        },
        {
          id: "node-b",
          stepName: "step2",
          connector: "windows_connector",
          action: "define_values",
          nodeType: "task",
          description: "second",
          descriptionAuto: false,
          form: {},
          parentId: "node-a",
          parallelOf: null,
          parallelOrder: 1,
          mergeParentIds: [],
          canvasPosition: { x: 236, y: 40 },
          canvasGridPosition: { x: 6, y: 0 },
        },
      ],
      stickyNotes: [
        {
          id: "note-1",
          x: 180,
          y: 160,
          w: 224,
          h: 128,
          text: "memo",
          color: "#fff8c7",
          anchorNodeId: "node-a",
          applicationMetadata: "keep-note",
        },
      ],
    };
    const before = structuredClone(state);
    const document = adapter.projectDocument(state, {
      connectors: [{ id: "windows_connector", label: "Windows" }],
      actions: {
        windows_connector: [{ id: "define_values", label: "Define values", fields: [] }],
      },
    });
    return { document, state, before };
  });

  expect(result.document.steps).toEqual([
    {
      step_id: "node-a",
      label: "step1",
      node_type: "task",
      description: "first",
      ui_position: { x: 140, y: 40 },
    },
    {
      step_id: "node-b",
      label: "step2",
      node_type: "task",
      description: "second",
      ui_position: { x: 236, y: 40 },
    },
  ]);
  expect(result.document.flows.main).toEqual({
    start: { ui_position: { x: 28, y: 40 } },
    end: { ui_position: { x: 364, y: 40 } },
    edges: [
      { from: "START", to: "node-a", order: 1, kind: "primary" },
      { from: "node-a", to: "node-b", order: 1, kind: "primary" },
      { from: "node-b", to: "END", order: 0 },
    ],
  });
  expect(result.document.notes).toEqual([
    {
      note_id: "note-1",
      ui_position: { x: 180, y: 160 },
      size: { width: 224, height: 128 },
      text: "memo",
      color: "#fff8c7",
    },
  ]);
  expect(result.state).toEqual(result.before);
  expect(result.state.nodes[0].applicationMetadata).toEqual({ preserve: true });
  expect(result.state.stickyNotes[0].applicationMetadata).toBe("keep-note");
});


test("共通projectorからAdapterが同じDocumentを生成する", async ({ page }) => {
  await openDataflow(page);

  const result = await page.evaluate(() => {
    const adapter = window.zizPackages.ui.workflowDesignerAdapter;
    const state = {
      appMode: "dataflow",
      flowName: "Shared projection",
      applicationMetadata: { preserve: "top-level" },
      nodes: [
        {
          id: "node-root",
          stepName: "step1",
          connector: "windows_connector",
          action: "define_values",
          nodeType: "task",
          description: "root",
          parentId: null,
          parallelOrder: 1,
          mergeParentIds: [],
          canvasPosition: { x: 140, y: 40 },
          applicationMetadata: { preserve: "root" },
        },
        {
          id: "node-loop",
          stepName: "step2",
          connector: "windows_connector",
          action: "loop_tasks",
          nodeType: "loop",
          description: "loop",
          parentId: "node-root",
          parallelOrder: 1,
          mergeParentIds: [],
          canvasPosition: { x: 236, y: 40 },
        },
        {
          id: "node-inner",
          stepName: "step3",
          connector: "windows_connector",
          action: "define_values",
          nodeType: "task",
          description: "inner",
          parentId: "node-loop",
          loopOwnerId: "node-loop",
          parallelOrder: 1,
          mergeParentIds: [],
          canvasPosition: { x: 332, y: 40 },
        },
        {
          id: "node-after",
          stepName: "step4",
          connector: "windows_connector",
          action: "define_values",
          nodeType: "task",
          description: "after",
          parentId: "node-loop",
          parallelOrder: 2,
          mergeParentIds: [],
          canvasPosition: { x: 332, y: 128 },
        },
      ],
      stickyNotes: [
        {
          id: "note-1",
          x: 180,
          y: 160,
          w: 224,
          h: 128,
          text: "memo",
          color: "#fff8c7",
          applicationMetadata: "keep-note",
        },
      ],
    };
    const before = structuredClone(state);
    return {
      document: adapter.projectDocument(state, {
        connectors: [{ id: "windows_connector", label: "Windows" }],
        actions: {
          windows_connector: [{ id: "define_values", label: "Define values", fields: [] }],
        },
      }),
      state,
      before,
    };
  });

  expect(result.document).toEqual({
    metadata: { mode: "dataflow", name: "Shared projection" },
    steps: [
      { step_id: "node-root", label: "step1", node_type: "task", description: "root", ui_position: { x: 140, y: 40 } },
      { step_id: "node-loop", label: "step2", node_type: "loop", description: "loop", ui_position: { x: 236, y: 40 } },
      { step_id: "node-inner", label: "step3", node_type: "task", description: "inner", ui_position: { x: 332, y: 40 }, loop_owner_id: "node-loop" },
      { step_id: "node-after", label: "step4", node_type: "task", description: "after", ui_position: { x: 332, y: 128 } },
    ],
    flows: {
      main: {
        start: { ui_position: { x: 28, y: 40 } },
        end: { ui_position: { x: 476, y: 40 } },
        edges: [
          { from: "START", to: "node-root", order: 1, kind: "primary" },
          { from: "node-root", to: "node-loop", order: 1, kind: "primary" },
          { from: "node-loop", to: "node-after", order: 2, kind: "primary" },
          { from: "node-after", to: "END", order: 0 },
        ],
      },
    },
    notes: [
      {
        note_id: "note-1",
        ui_position: { x: 180, y: 160 },
        size: { width: 224, height: 128 },
        text: "memo",
        color: "#fff8c7",
      },
    ],
    loop: {
      flows: {
        "node-loop": {
          edges: [
            { from: "START", to: "node-inner", order: 1, kind: "primary" },
            { from: "node-inner", to: "END", order: 1, kind: "primary" },
          ],
        },
      },
    },
  });
  expect(result.state).toEqual(result.before);
});


test("既定値の正規化前後でAdapter Documentを変えない", async ({ page }) => {
  await openDataflow(page);

  const result = await page.evaluate(() => {
    const adapter = window.zizPackages.ui.workflowDesignerAdapter;
    const shared = window.zizPackages.ui.nodeShared;
    const config = {
      connectors: [{ id: "windows_connector", label: "Windows" }],
      actions: {
        windows_connector: [{ id: "define_values", label: "Define values", fields: [] }],
      },
    };
    const state = {
      appMode: "dataflow",
      flowName: "Default projection",
      nodes: [
        {
          id: "node-default",
          stepName: "step1",
          connector: "windows_connector",
          action: "define_values",
          canvasPosition: { x: 140, y: 40 },
        },
      ],
      stickyNotes: [],
    };
    const before = structuredClone(state);
    const first = adapter.projectDocument(state, config);
    const afterFirst = structuredClone(state);
    shared.ensureNodeDefaults(config, state.nodes[0]);
    const second = adapter.projectDocument(state, config);
    return { before, afterFirst, first, second };
  });

  expect(result.first.steps[0].description).toBe("Windows / Define values");
  expect(result.second.steps[0].description).toBe("Windows / Define values");
  expect(result.first).toEqual(result.second);
  expect(result.afterFirst).toEqual(result.before);
});


test("WorkflowDesignerだけをinteractive canvasとしてmountする", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Mount contract" },
    variables: { start: [] },
    steps: [
      taskStep("step1", 140, 40),
      taskStep("step2", 236, 40, {
        node_type: "loop",
        action: "loop_tasks",
        params: { max_iterations: 30, source_step_id: "{{step1}}" },
      }),
      taskStep("step3", 332, 40, { loop_owner_id: "step2" }),
    ],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    loop: {
      flows: {
        step2: {
          start: "START",
          end: "END",
          edges: [
            { from: "START", to: "step3", order: 1, kind: "primary" },
            { from: "step3", to: "END", order: 0 },
          ],
        },
      },
    },
    notes: [
      { id: "note-1", x: 180, y: 170, w: 224, h: 128, text: "memo", color: "#fff8c7" },
    ],
  });

  const designer = page.locator("#flowchart > .zwd");
  await expect(designer).toBeVisible();
  await expect(designer.locator('.zwd-node--step[data-node-id]')).toHaveCount(3);
  await expect(designer.locator(".zwd-edge")).toHaveCount(5);
  await expect(designer.locator('.zwd-note[data-note-id="note-1"]')).toBeVisible();
  await expect(designer.locator(".zwd-loop-frame")).toHaveCount(0);

  await expect(page.locator("#flowchart canvas")).toHaveCount(0);
});


test("1.1倍node metricsでSTART・step・ENDを112px間隔に整列しconnector iconを表示する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Geometry and icon contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40, { connector: "WindowsConnector" })],
    flows: {
      edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }],
    },
    notes: [],
  });

  const icon = page.locator('.zwd-node--step[aria-label="step1"] .zwd-node__icon img');
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute("src", /img\/WindowsConnector\.jpg$/);

  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    };
    const visual = document.querySelector(".zwd-node--step .zwd-node__visual")
      .getBoundingClientRect();
    const icon = document.querySelector(".zwd-node--step .zwd-node__icon")
      .getBoundingClientRect();
    return {
      start: box(".zwd-node--start"),
      step: box(".zwd-node--step"),
      end: box(".zwd-node--end"),
      visual: { width: visual.width, height: visual.height },
      icon: { width: icon.width, height: icon.height },
    };
  });

  expect(geometry.step.width).toBe(106);
  expect(geometry.step.height).toBe(88);
  expect(geometry.visual).toEqual({ width: 48, height: 48 });
  expect(geometry.icon).toEqual({ width: 26, height: 26 });
  expect(geometry.step.left - geometry.start.left).toBe(112);
  expect(geometry.end.left - geometry.step.left).toBe(112);
  expect(geometry.start.right).toBeLessThanOrEqual(geometry.step.left);
  expect(geometry.step.right).toBeLessThanOrEqual(geometry.end.left);
  expect(geometry.start.top).toBe(geometry.step.top);
  expect(geometry.step.top).toBe(geometry.end.top);

  const saved = await readSavedFlow(page);
  expect(saved.steps[0].ui_position).toEqual({ x: 140, y: 40 });
});


test("compact workflow skinは小さいnode名・矢印と淡いedgeを表示する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Compact visual contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: {
      edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }],
    },
    notes: [],
  });

  const skin = await page.evaluate(() => {
    const label = document.querySelector('.zwd-node--step[aria-label="step1"] .zwd-node__label');
    const edge = document.querySelector(".zwd-edge__line");
    const marker = document.querySelector(".zwd-layer--edges marker");
    const arrow = marker?.querySelector(".zwd-arrow");
    return {
      labelFontSize: getComputedStyle(label).fontSize,
      edgeStroke: getComputedStyle(edge).stroke,
      arrowFill: getComputedStyle(arrow).fill,
      markerWidth: marker?.getAttribute("markerWidth"),
      markerHeight: marker?.getAttribute("markerHeight"),
      refX: marker?.getAttribute("refX"),
      refY: marker?.getAttribute("refY"),
      arrowPath: arrow?.getAttribute("d"),
    };
  });

  expect(skin).toEqual({
    labelFontSize: "12px",
    edgeStroke: "rgb(148, 163, 184)",
    arrowFill: "rgb(148, 163, 184)",
    markerWidth: "6.4",
    markerHeight: "6.4",
    refX: "5.6",
    refY: "3.2",
    arrowPath: "M0,0 L6.4,3.2 L0,6.4 Z",
  });
});


test("library selectionをApplication選択とnode detailへ反映する", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Selection contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40), taskStep("step2", 300, 40)],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });

  await expect(page.locator("#nodeDetail .node-topbar-step")).toHaveText("step1");
  const secondNode = page.locator('.zwd-node--step[aria-label="step2"]');
  await secondNode.click();
  expect(pageErrors).toEqual([]);
  await expect.poll(() => page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    return runtime?.state?.nodes?.find((node) => node.id === runtime.state.selectedNodeId)?.stepName || null;
  })).toBe("step2");
  await expect(secondNode).toHaveAttribute("data-selected", "true");
  await expect(page.locator("#nodeDetail .node-topbar-step")).toHaveText("step2");

  await page.locator(".zwd-viewport").click({ position: { x: 80, y: 260 } });
  await expect.poll(() => page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    return runtime?.state?.selectedNodeId ?? null;
  })).toBeNull();
  await expect(page.locator(".zui-shell__right-panel")).toBeHidden();
});


test("document changeは位置だけをApplicationへround-tripする", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Round trip contract" },
    variables: { start: [] },
    steps: [
      taskStep("step1", 140, 40),
      taskStep("step2", 300, 40, {
        params: { define_values: [{ name: "kept", value: "payload" }] },
        description: "keep-description",
      }),
    ],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });
  await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    runtime.state.nodes.find((node) => node.stepName === "step2").applicationMetadata = {
      preserve: "unknown-field",
    };
  });

  const node = page.locator('.zwd-node--step[aria-label="step2"]');
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 96, box.y + box.height / 2 + 64, { steps: 8 });
  await page.mouse.up();

  const saved = await readSavedFlow(page);
  const moved = saved.steps.find((step) => step.step_id === "step2");
  expect(moved.ui_position).toEqual({ x: 396, y: 104 });
  expect(moved.params).toEqual({ define_values: [{ name: "kept", value: "payload" }] });
  expect(moved.description).toBe("keep-description");
  expect(await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    return runtime.state.nodes.find((item) => item.stepName === "step2").applicationMetadata;
  })).toEqual({ preserve: "unknown-field" });
});


test("host context actionsはApplication command facadeへ追加・copy/paste・削除を委譲する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Context command contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40), taskStep("step2", 380, 40)],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });

  const first = page.locator('.zwd-node--step[aria-label="step1"]');
  await first.click({ button: "right" });
  await expect(workflowMenuItems(page)).toHaveText(["後に追加", "後にループ追加", "コピー", "実行", "削除"]);
  await workflowMenuItems(page).filter({ hasText: "後に追加" }).click();
  await expect.poll(async () => (await readSavedFlow(page)).steps.length).toBe(3);

  const second = page.locator('.zwd-node--step[aria-label="step2"]');
  await second.click({ button: "right", force: true });
  await workflowMenuItems(page).filter({ hasText: "コピー" }).click();
  await page.locator(".zwd-viewport").click({ button: "right", position: { x: 80, y: 320 } });
  await expect(workflowMenuItems(page)).toContainText(["ノードを追加", "ループノードを追加", "貼り付け"]);
  await workflowMenuItems(page).filter({ hasText: "貼り付け" }).click();
  await expect.poll(async () => (await readSavedFlow(page)).steps.length).toBe(4);

  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const target = runtime.state.nodes.find((node) => node.stepName === "step2");
    runtime.instance.setSelection({ nodes: [{ node_id: target.id }], edges: [], annotation_ids: [] });
  });
  await page.locator("#flowchart > .zwd").focus();
  await page.keyboard.press("Delete");
  await expect.poll(async () => (await readSavedFlow(page)).steps.map((step) => step.step_id)).not.toContain("step2");
});


test("公開connection requestは既存Applicationの挿入・空白追加・edge削除へ写像する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Connection request contract" },
    variables: { start: [] },
    steps: [
      taskStep("step1", 140, 40),
      taskStep("step2", 420, 40),
      taskStep("step3", 140, 280),
    ],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
        { from: "START", to: "step3", order: 2, kind: "primary" },
      ],
    },
    notes: [],
  });

  await rightDrag(
    page,
    page.locator('.zwd-node--step[aria-label="step1"]'),
    page.locator('.zwd-node--step[aria-label="step3"]')
  );
  let saved = await readSavedFlow(page);
  expect(saved.steps).toHaveLength(3);
  expect(saved.flows.edges).toEqual(expect.arrayContaining([
    expect.objectContaining({ from: "step1", to: "step3", kind: "merge" }),
  ]));

  const sourceBeforeDrop = page.locator('.zwd-node--step[aria-label="step1"]');
  await expect(sourceBeforeDrop).toBeVisible();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const sourceBoxBeforeDrop = await sourceBeforeDrop.boundingBox();
  const targetEdgeKey = await page.evaluate(() => {
    const state = document.getElementById("flowchart").__workflowDesignerAdapterRuntime.state;
    const from = state.nodes.find((node) => node.stepName === "step1").id;
    const to = state.nodes.find((node) => node.stepName === "step2").id;
    return `flow:main:edge:${from}:${to}`;
  });
  const targetEdge = page.locator(`.zwd-edge[data-edge-key="${targetEdgeKey}"]`);
  const dropPoint = await edgeMidpoint(targetEdge);
  const dropHit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return {
      className: element?.getAttribute?.("class") || "",
      edgeKey: element?.closest?.("[data-edge-key]")?.getAttribute("data-edge-key") || "",
    };
  }, dropPoint);
  await page.mouse.move(
    sourceBoxBeforeDrop.x + sourceBoxBeforeDrop.width / 2,
    sourceBoxBeforeDrop.y + sourceBoxBeforeDrop.height / 2
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(dropPoint.x, dropPoint.y, { steps: 8 });
  await page.mouse.up({ button: "right" });

  saved = await readSavedFlow(page);
  expect(saved.steps, JSON.stringify({ dropPoint, dropHit })).toHaveLength(4);
  const inserted = saved.steps.find((step) => !["step1", "step2", "step3"].includes(step.step_id));
  expect(inserted).toBeTruthy();
  expect(saved.flows.edges.map((edge) => `${edge.from}->${edge.to}`)).toEqual(expect.arrayContaining([
    `step1->${inserted.step_id}`,
    `${inserted.step_id}->step2`,
  ]));

  const source = page.locator(`.zwd-node--step[aria-label="${inserted.step_id}"]`);
  const viewport = page.locator(".zwd-viewport");
  const sourceBox = await source.boundingBox();
  const viewportBox = await viewport.boundingBox();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(viewportBox.x + viewportBox.width - 120, viewportBox.y + viewportBox.height - 100, { steps: 8 });
  await page.mouse.up({ button: "right" });
  await expect.poll(async () => (await readSavedFlow(page)).steps.length).toBe(5);

  const edgePoint = await hittableEdgePoint(page);
  expect(edgePoint).toBeTruthy();
  const deletedRelation = await page.evaluate((edgeKey) => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const documentValue = runtime.instance.getDocument();
    const edge = documentValue.flows.main.edges.find((item) => (
      `flow:main:edge:${item.from}:${item.to}` === edgeKey
    ));
    const stepName = (nodeId) => {
      if (["START", "END"].includes(nodeId)) return nodeId;
      return runtime.state.nodes.find((node) => node.id === nodeId)?.stepName || nodeId;
    };
    return edge ? `${stepName(edge.from)}->${stepName(edge.to)}` : "";
  }, edgePoint.edgeKey);
  expect(deletedRelation).toBeTruthy();
  await page.mouse.click(edgePoint.x, edgePoint.y, { button: "right" });
  await expect(workflowMenuItems(page)).toHaveText(["フローリレーションを削除"]);
  await workflowMenuItems(page).click();
  saved = await readSavedFlow(page);
  expect(saved.flows.edges.map((edge) => `${edge.from}->${edge.to}`)).not.toContain(deletedRelation);
});


test("loop構造線は削除actionを出さず通常・merge edgeは削除できる", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Loop edge command contract" },
    variables: { start: [] },
    steps: [
      taskStep("loop1", 140, 40, {
        node_type: "loop",
        action: "loop_tasks",
        params: { max_iterations: 30 },
      }),
      taskStep("inner1", 340, 40, { loop_owner_id: "loop1" }),
      taskStep("inner2", 540, 40, { loop_owner_id: "loop1" }),
      taskStep("side", 140, 300),
      taskStep("after", 540, 300),
    ],
    flows: {
      edges: [
        { from: "START", to: "loop1", order: 1, kind: "primary" },
        { from: "loop1", to: "after", order: 1, kind: "primary" },
        { from: "START", to: "side", order: 2, kind: "primary" },
        { from: "side", to: "after", order: 2, kind: "merge" },
      ],
    },
    loop: {
      flows: {
        loop1: {
          start: "START",
          end: "END",
          edges: [
            { from: "START", to: "inner1", order: 1, kind: "primary" },
            { from: "inner1", to: "inner2", order: 1, kind: "primary" },
            { from: "inner2", to: "END", order: 0 },
          ],
        },
      },
    },
    notes: [],
  });

  const actions = await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const facade = window.zizPackages.ui.workflowCommandFacade;
    const [loopRoot, firstInner, secondInner, side, after] = runtime.state.nodes;
    const loopOwnerId = loopRoot.id;
    const actionIds = (edgeRef) => facade.getContextActions(runtime, {
      kind: "edge",
      edge_ref: edgeRef,
    }).map((action) => action.commandId);
    const refs = {
      entry: { loop_owner_id: loopOwnerId, from: "START", to: firstInner.id },
      loopBack: { loop_owner_id: loopOwnerId, from: secondInner.id, to: "END" },
      normal: { loop_owner_id: loopOwnerId, from: firstInner.id, to: secondInner.id },
      merge: { flow_id: "main", from: side.id, to: after.id },
    };
    return {
      entry: actionIds(refs.entry),
      loopBack: actionIds(refs.loopBack),
      normal: actionIds(refs.normal),
      merge: actionIds(refs.merge),
      // 実描画されたSVG線のdata-edge-keyは同じedge_refから組み立てられる。
      edgeKeys: {
        entry: `loop:${loopOwnerId}:edge:START:${firstInner.id}`,
        loopBack: `loop:${loopOwnerId}:edge:${secondInner.id}:END`,
        normal: `loop:${loopOwnerId}:edge:${firstInner.id}:${secondInner.id}`,
        merge: `flow:main:edge:${side.id}:${after.id}`,
      },
      mergeRelation: `${side.stepName}->${after.stepName}`,
      loopStepNames: {
        owner: loopRoot.stepName,
        firstInner: firstInner.stepName,
        secondInner: secondInner.stepName,
      },
    };
  });
  expect(actions.entry).toEqual([]);
  expect(actions.loopBack).toEqual([]);
  expect(actions.normal).toEqual(["selection.delete"]);
  expect(actions.merge).toEqual(["selection.delete"]);

  // 実際に描画されたWorkflowDesignerのSVG線を右クリックし、同じ判定がDOM上でも成立することを確認する。
  const edgeKeys = actions.edgeKeys;
  for (const edgeKey of Object.values(edgeKeys)) {
    await expect(page.locator(`.zwd-edge[data-edge-key="${edgeKey}"]`)).toHaveCount(1);
  }
  const before = await readSavedFlow(page);

  // merge線とloop内の通常線は削除actionを提示する。
  await openEdgeContextMenu(page, edgeKeys.merge);
  await expect(workflowMenuItems(page)).toHaveText(["フローリレーションを削除"]);
  await openEdgeContextMenu(page, edgeKeys.normal);
  await expect(workflowMenuItems(page)).toHaveText(["フローリレーションを削除"]);

  // loop entry線とloop-back線ではmenu自体が出ない。
  await openEdgeContextMenu(page, edgeKeys.entry);
  await expect(page.locator(".zwd-context-menu")).toBeHidden();
  await expect(workflowMenuItems(page)).toHaveCount(0);

  await openEdgeContextMenu(page, edgeKeys.merge);
  await expect(workflowMenuItems(page)).toHaveText(["フローリレーションを削除"]);
  await openEdgeContextMenu(page, edgeKeys.loopBack);
  await expect(page.locator(".zwd-context-menu")).toBeHidden();
  await expect(workflowMenuItems(page)).toHaveCount(0);

  // 削除actionを実行できるmerge線だけがApplication stateから消える。
  await openEdgeContextMenu(page, edgeKeys.merge);
  await workflowMenuItems(page).click();
  const saved = await readSavedFlow(page);
  const relations = (flow) => (flow?.edges || []).map((edge) => `${edge.from}->${edge.to}`);
  expect(relations(before.flows)).toContain(actions.mergeRelation);
  expect(relations(saved.flows)).not.toContain(actions.mergeRelation);
  expect(relations(saved.flows)).toEqual(expect.arrayContaining(
    relations(before.flows).filter((relation) => relation !== actions.mergeRelation)
  ));
  // loop構造はmerge削除の前後で変化しない。
  expect(saved.loop).toEqual(before.loop);
  expect(saved.steps.map((step) => step.step_id)).toEqual(before.steps.map((step) => step.step_id));
});


test("history commandは既存save payloadを維持してundo/redoする", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Payload contract" },
    variables: { start: [{ name: "input", value: "kept" }] },
    steps: [taskStep("step1", 140, 40, {
      params: { define_values: [{ name: "answer", value: "42" }] },
      description: "keep-description",
    })],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [],
  });
  const node = page.locator('.zwd-node--step[aria-label="step1"]');
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 96, box.y + box.height / 2 + 64, { steps: 8 });
  await page.mouse.up();
  const moved = (await readSavedFlow(page)).steps[0].ui_position;
  expect(moved).not.toEqual({ x: 140, y: 40 });

  await page.locator('[data-zwd-command="history.undo"]').click();
  await expect.poll(async () => (await readSavedFlow(page)).steps[0].ui_position).toEqual({ x: 140, y: 40 });
  await page.locator('[data-zwd-command="history.redo"]').click();
  await expect.poll(async () => (await readSavedFlow(page)).steps[0].ui_position).toEqual(moved);
});


test("run requestは既存Application validationとrun payloadへ委譲する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Payload contract" },
    variables: { start: [{ name: "input", value: "kept" }] },
    steps: [taskStep("step1", 140, 40, {
      params: { define_values: [{ name: "answer", value: "42" }] },
      description: "keep-description",
    })],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [],
  });
  await installBridgeSpy(page);

  await page.locator('[data-zwd-command="workflow.run"]').click();
  const runCalls = (await readBridgeSpy(page)).calls.filter((call) => call.type === "flow.run");
  expect(runCalls).toHaveLength(1);
  expect(runCalls[0].payload).toMatchObject({
    mode: "dataflow",
    flow: {
      metadata: { mode: "dataflow", name: "Payload contract" },
      variables: { start: [{ name: "input", value: "kept" }] },
      steps: [{
        step_id: "step1",
        params: { define_values: [{ name: "answer", value: "42" }] },
        description: "keep-description",
      }],
    },
  });
});


test("node:open-detail eventはApplication selectionとdetailへ写像する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Detail event contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40), taskStep("step2", 380, 40)],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });

  await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const target = runtime.state.nodes.find((node) => node.stepName === "step2");
    runtime.instance.setSelection({ nodes: [{ node_id: target.id }], edges: [], annotation_ids: [] });
  });
  await page.locator("#flowchart > .zwd").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#nodeDetail .node-topbar-step")).toHaveText("step2");
});


test("external-link:open-request eventはApplication external browser policyへ写像する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "External event contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [{
      id: "note-1",
      x: 180,
      y: 220,
      w: 240,
      h: 144,
      text: "https://example.com/docs",
      color: "#fff8c7",
    }],
  });
  await installBridgeSpy(page);

  await page.locator('[data-note-id="note-1"] [data-external-url]').click();
  await expect.poll(async () => (await readBridgeSpy(page)).externals).toEqual([
    { url: "https://example.com/docs", options: { prefer: "chrome" } },
  ]);
});


test("付箋モードはOFFを既定としtoolbarに作成buttonを持たずON時の右clickだけでnoteをround-tripする", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Annotation event contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [{ id: "note-1", x: 180, y: 220, w: 240, h: 144, text: "memo", color: "#fff8c7" }],
  });

  const toggle = page.locator('[data-zwd-command="annotation.mode-toggle"]');
  await expect(toggle).toHaveAttribute("aria-label", "付箋モード");
  await expect(page.locator('[data-zwd-command="annotation.add"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    document.getElementById("flowchart").__workflowDesignerAdapterRuntime.annotationMode
  ))).toBe(false);
  await page.locator(".zwd-viewport").click({ position: { x: 80, y: 360 } });
  expect((await readSavedFlow(page)).notes).toHaveLength(1);

  await toggle.click();
  await expect.poll(() => page.evaluate(() => (
    document.getElementById("flowchart").__workflowDesignerAdapterRuntime.annotationMode
  ))).toBe(true);
  await page.locator(".zwd-viewport").click({ position: { x: 80, y: 360 } });
  expect((await readSavedFlow(page)).notes).toHaveLength(1);

  await page.locator(".zwd-viewport").click({ button: "right", position: { x: 80, y: 360 } });
  await expect(workflowMenuItems(page)).toHaveText(["付箋作成"]);
  await workflowMenuItems(page).click();
  await expect.poll(async () => (await readSavedFlow(page)).notes.length).toBe(2);

  await toggle.click();
  await expect.poll(() => page.evaluate(() => (
    document.getElementById("flowchart").__workflowDesignerAdapterRuntime.annotationMode
  ))).toBe(false);
  await expect(page.locator('[data-zwd-command="annotation.add"]')).toHaveCount(0);
});


test("付箋モードON時はnodeの選択・詳細表示・drag・contextを禁止し右clickはAdd sticky noteだけを出す", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Annotation node gate contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40), taskStep("step2", 380, 40)],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });

  // ON前に選択したnodeがあっても、ON中はkeyboard編集操作が効かないことを確認する。
  await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const target = runtime.state.nodes.find((node) => node.stepName === "step2");
    runtime.instance.setSelection({ nodes: [{ node_id: target.id }], edges: [], annotation_ids: [] });
    window.__annotationSelectionEvents = [];
    runtime.instance.on("selection:change", (payload) => {
      window.__annotationSelectionEvents.push(payload.selection);
    });
  });
  await page.locator('[data-zwd-command="annotation.mode-toggle"]').click();
  await expect.poll(() => page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    return {
      annotationMode: runtime.instance.getAnnotationMode(),
      runtimeMode: runtime.annotationMode,
      selectedNodeId: runtime.state.selectedNodeId,
      selectedNodeIds: runtime.state.selectedNodeIds,
      shellCollapsed: window.zizShell.isRightSidebarCollapsed(),
    };
  })).toEqual({
    annotationMode: true,
    runtimeMode: true,
    selectedNodeId: null,
    selectedNodeIds: [],
    shellCollapsed: true,
  });
  await expect(page.locator(".zui-shell__right-panel")).toBeHidden();

  const firstNode = page.locator('.zwd-node--step[aria-label="step1"]');
  await firstNode.click();
  expect(pageErrors).toEqual([]);
  await expect.poll(() => page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    return {
      libraryNodeIds: runtime.instance.getSelection().nodes.map((ref) => ref.node_id),
      applicationNodeId: runtime.state.selectedNodeId,
      selectionEvents: window.__annotationSelectionEvents,
    };
  })).toEqual({
    libraryNodeIds: [],
    applicationNodeId: null,
    selectionEvents: [{ nodes: [], edges: [], annotation_ids: [] }],
  });
  await expect(page.locator(".zui-shell__right-panel")).toBeHidden();

  const box = await firstNode.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 96, box.y + box.height / 2 + 64, { steps: 8 });
  await page.mouse.up();
  const savedAfterDrag = await readSavedFlow(page);
  expect(savedAfterDrag.steps.find((step) => step.step_id === "step1").ui_position).toEqual({ x: 140, y: 40 });

  await firstNode.click({ button: "right" });
  await expect(workflowMenuItems(page)).toHaveText(["付箋作成"]);
  await page.locator(".zwd-viewport").click({ position: { x: 20, y: 300 } });

  await page.locator("#flowchart > .zwd").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".zui-shell__right-panel")).toBeHidden();
});


test("付箋モードON時のnote右clickはlibrary paletteだけを表示しApplication stateへ1回だけ届く", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Annotation palette contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [{ id: "note-1", x: 180, y: 220, w: 240, h: 144, text: "memo", color: "#fff8c7" }],
  });
  await page.locator('[data-zwd-command="annotation.mode-toggle"]').click();

  await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    window.__notePatchPaths = [];
    runtime.instance.on("document:change", (payload) => {
      (Array.isArray(payload?.patch) ? payload.patch : []).forEach((operation) => {
        if (operation?.path?.[0] === "notes") window.__notePatchPaths.push(operation.path.join("."));
      });
    });
  });

  await page.locator('[data-note-id="note-1"]').click({ button: "right" });
  await expect(workflowMenuItems(page)).toHaveText(["#fff2a8", "#dff7e8", "#e7edff"]);
  await workflowMenuItems(page).filter({ hasText: "#dff7e8" }).click();

  await expect.poll(async () => (await readSavedFlow(page)).notes[0].color).toBe("#dff7e8");
  expect(await page.evaluate(() => window.__notePatchPaths)).toEqual(["notes.0.color"]);
  expect(await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    return runtime.state.stickyNotes.map((note) => [note.id, note.color]);
  })).toEqual([["note-1", "#dff7e8"]]);
});


test("付箋モードON時はnote linkの外部遷移を発火せず本文編集を優先する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Annotation link priority contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [{
      id: "note-1",
      x: 180,
      y: 220,
      w: 240,
      h: 144,
      text: "https://example.com/docs",
      color: "#fff8c7",
    }],
  });
  await installBridgeSpy(page);
  await page.locator('[data-zwd-command="annotation.mode-toggle"]').click();

  await page.locator('[data-note-id="note-1"] [data-external-url]').click();
  expect((await readBridgeSpy(page)).externals).toEqual([]);

  await page.locator('[data-note-body="note-1"]').dblclick();
  await expect(page.locator(".zwd-note__editor")).toBeVisible();
});


test("付箋色の変更は付箋モードONでApplication stateへ1回だけ届き再描画後も残る", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Annotation color contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [{ id: "note-1", x: 180, y: 220, w: 240, h: 144, text: "memo", color: "#fff8c7" }],
  });
  await page.locator('[data-zwd-command="annotation.mode-toggle"]').click();

  // libraryが出すnote patchを数え、色更新がApplicationへ二重反映されないことを確認する。
  await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    window.__notePatchPaths = [];
    runtime.instance.on("document:change", (payload) => {
      (Array.isArray(payload?.patch) ? payload.patch : []).forEach((operation) => {
        if (operation?.path?.[0] === "notes") window.__notePatchPaths.push(operation.path.join("."));
      });
    });
  });

  await page.locator('[data-note-color="note-1"]').fill("#ffd6a5");

  await expect.poll(async () => (await readSavedFlow(page)).notes[0].color).toBe("#ffd6a5");
  expect(await page.evaluate(() => window.__notePatchPaths)).toEqual(["notes.0.color"]);
  expect(await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    return runtime.state.stickyNotes.map((note) => [note.id, note.color]);
  })).toEqual([["note-1", "#ffd6a5"]]);

  // node編集モードへ戻してからノード移動でDocumentを作り直させ、
  // Application stateからの再投影後も色が残ることを確認する。
  await page.locator('[data-zwd-command="annotation.mode-toggle"]').click();
  // 直前のnote色patchがDocument再設定を伴う非同期再描画を起こすため、
  // ノードが再描画後に可視となるまでPlaywrightの条件待ちで確認してから座標を取得する。
  const node = page.locator('.zwd-node--step[aria-label="step1"]');
  let box = null;
  await expect.poll(async () => {
    box = await node.boundingBox();
    return box;
  }).not.toBeNull();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 96, box.y + box.height / 2 + 64, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => (await readSavedFlow(page)).steps[0].ui_position).toEqual({ x: 236, y: 104 });
  await expect(page.locator('[data-note-color="note-1"]')).toHaveValue("#ffd6a5");
  expect((await readSavedFlow(page)).notes[0].color).toBe("#ffd6a5");
  expect(await page.evaluate(() => window.__notePatchPaths)).toEqual(["notes.0.color"]);
});


test("node:add-requestはlibrary採番を採用せずApplication ID allocationで追加する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Add request contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40), taskStep("step2", 380, 40)],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });

  await page.locator(".zwd-viewport").click({ button: "right", position: { x: 80, y: 320 } });
  await workflowMenuItems(page).filter({ hasText: /^(Add node|ノードを追加)$/ }).click();
  const saved = await readSavedFlow(page);
  expect(saved.steps.map((step) => step.step_id)).toEqual(["step1", "step2", "step3"]);
  expect(saved.steps[2].ui_position).toBeTruthy();
});


test("copy/pasteはApplication採番とunknown metadata・hidden reference書換えを保持する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Reference contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40), taskStep("step2", 380, 40)],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });
  await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const source = runtime.state.nodes.find((node) => node.stepName === "step2");
    source.form = { value: "{{hidden.step2.var1}}" };
    source.applicationMetadata = { nested: { preserve: true } };
    runtime.state.hiddenBindings = {
      "{{hidden.step2.var1}}": { current_ref: "source-ref", extra: "keep" },
    };
  });

  const source = page.locator('.zwd-node--step[aria-label="step2"]');
  await source.click();
  await source.focus();
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");

  const result = await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const duplicated = runtime.state.nodes.find((node) => node.stepName === "step3");
    return {
      nextStepSeq: runtime.state.nextStepSeq,
      duplicated,
      hiddenBindings: runtime.state.hiddenBindings,
    };
  });
  expect(result.duplicated.id).toBeTruthy();
  expect(result.duplicated.id).not.toBe("step2");
  expect(result.duplicated.applicationMetadata).toEqual({ nested: { preserve: true } });
  expect(result.duplicated.form.value).toBe("{{hidden.step3.var1}}");
  expect(result.hiddenBindings["{{hidden.step3.var1}}"]).toEqual({ current_ref: "source-ref", extra: "keep" });
  expect(result.nextStepSeq).toBe(4);
});


test("node template選択は内部clipboardだけを変えてworkflow stateとhistoryを変えない", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Node template clipboard contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [],
  });

  // template選択の前にhistoryへ1件だけ積み、templateがhistoryを消費しないことを後段で確認する。
  const node = page.locator('.zwd-node--step[aria-label="step1"]');
  const box = await node.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 96, box.y + box.height / 2 + 64, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await readSavedFlow(page)).steps[0].ui_position).toEqual({ x: 236, y: 104 });

  const result = await page.evaluate((template) => {
    const facade = window.zizPackages.ui.workflowCommandFacade;
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const snapshot = () => structuredClone({
      flowName: runtime.state.flowName ?? "",
      nodes: runtime.state.nodes ?? [],
      stickyNotes: runtime.state.stickyNotes ?? [],
      startParameters: runtime.state.startParameters ?? [],
      hiddenBindings: runtime.state.hiddenBindings ?? {},
      nextStepSeq: runtime.state.nextStepSeq ?? null,
      selectedNodeIds: runtime.state.selectedNodeIds ?? [],
    });
    const before = snapshot();
    // template選択がApplicationの再描画/history記録を呼ばないことを直接観測する。
    const originalOnStateChanged = runtime.onStateChanged;
    let stateChangeCalls = 0;
    runtime.onStateChanged = (...args) => {
      stateChangeCalls += 1;
      return originalOnStateChanged.apply(null, args);
    };
    let accepted = null;
    try {
      accepted = window.zizEmbeddedApi.setNodeTemplate(template);
    } finally {
      runtime.onStateChanged = originalOnStateChanged;
    }
    return {
      accepted,
      stateChangeCalls,
      before,
      after: snapshot(),
      hasNodeTemplate: facade.hasNodeTemplate(),
      copiedNodeIds: facade.getCopiedNodeIds(),
      canvasActions: facade.getContextActions(runtime, { kind: "canvas" }).map((action) => action.commandId),
    };
  }, NODE_TEMPLATE);

  expect(result.accepted).toBe(true);
  expect(result.stateChangeCalls).toBe(0);
  expect(result.after).toEqual(result.before);
  expect(result.hasNodeTemplate).toBe(true);
  expect(result.copiedNodeIds).toEqual([]);
  expect(result.canvasActions).toContain("selection.paste");

  // templateはhistoryを積まないため、undo/redoは直前のnode移動を往復する。
  await page.locator('[data-zwd-command="history.undo"]').click();
  await expect.poll(async () => (await readSavedFlow(page)).steps[0].ui_position).toEqual({ x: 140, y: 40 });
  await page.locator('[data-zwd-command="history.redo"]').click();
  await expect.poll(async () => (await readSavedFlow(page)).steps[0].ui_position).toEqual({ x: 236, y: 104 });
});


test("既存Pasteはnode templateからApplication採番の1 nodeだけを作りhistoryへ載せる", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Node template paste contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40), taskStep("step2", 380, 40)],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });
  await page.evaluate((template) => {
    window.zizPackages.ui.workflowCommandFacade.setNodeTemplate(template);
  }, NODE_TEMPLATE);

  const anchor = page.locator('.zwd-node--step[aria-label="step2"]');
  await anchor.click();
  await anchor.focus();
  await page.keyboard.press("Control+v");

  await expect
    .poll(async () => (await readSavedFlow(page)).steps.map((step) => step.step_id))
    .toEqual(["step1", "step2", "step3"]);
  const saved = await readSavedFlow(page);
  const pasted = saved.steps[2];
  expect(pasted.connector).toBe("windows_connector");
  expect(pasted.action).toBe("define_values");
  expect(pasted.description).toBe("テンプレートの説明");
  expect(pasted.params).toEqual({ define_values: [{ name: "from_template", value: "template-value" }] });
  // ID・step名・位置はtemplateではなく既存のanchor挿入policyが決める。
  expect(pasted.ui_position).toEqual({ x: 492, y: 40 });
  expect(pasted.node_type).toBeUndefined();
  expect(pasted.loop_owner_id).toBeUndefined();
  expect(saved.flows.edges.map((edge) => `${edge.from}->${edge.to}`)).toContain("step2->step3");

  const created = await page.evaluate(() => {
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const node = runtime.state.nodes.find((item) => item.stepName === "step3");
    const anchorNode = runtime.state.nodes.find((item) => item.stepName === "step2");
    return {
      id: node.id,
      anchorId: anchorNode.id,
      connector: node.connector,
      action: node.action,
      form: node.form,
      description: node.description,
      descriptionAuto: node.descriptionAuto,
      nodeType: node.nodeType,
      parentId: node.parentId,
      mergeParentIds: node.mergeParentIds,
      loopOwnerId: node.loopOwnerId ?? null,
      nextStepSeq: runtime.state.nextStepSeq,
      selectedNodeIds: runtime.state.selectedNodeIds,
      hasNodeTemplate: window.zizPackages.ui.workflowCommandFacade.hasNodeTemplate(),
    };
  });
  expect(created.id).toBeTruthy();
  expect(created.id).not.toBe("step3");
  expect(created.connector).toBe("WindowsConnector");
  expect(created.action).toBe("define_values");
  expect(created.form).toEqual({ define_values: [{ name: "from_template", value: "template-value" }] });
  expect(created.description).toBe("テンプレートの説明");
  expect(created.descriptionAuto).toBe(false);
  expect(created.nodeType).toBe("task");
  expect(created.parentId).toBe(created.anchorId);
  expect(created.mergeParentIds).toEqual([]);
  expect(created.loopOwnerId).toBeNull();
  expect(created.nextStepSeq).toBe(4);
  expect(created.selectedNodeIds).toEqual([created.id]);
  expect(created.hasNodeTemplate).toBe(true);

  await page.locator('[data-zwd-command="history.undo"]').click();
  await expect
    .poll(async () => (await readSavedFlow(page)).steps.map((step) => step.step_id))
    .toEqual(["step1", "step2"]);
  await page.locator('[data-zwd-command="history.redo"]').click();
  await expect
    .poll(async () => (await readSavedFlow(page)).steps.map((step) => step.step_id))
    .toEqual(["step1", "step2", "step3"]);
});


test("不正なnode templateはworkflow stateとhistoryを変えずに拒否される", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Node template rejection contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [],
  });

  const result = await page.evaluate(() => {
    const facade = window.zizPackages.ui.workflowCommandFacade;
    const runtime = document.getElementById("flowchart").__workflowDesignerAdapterRuntime;
    const invalid = [
      ["not-an-object", "template"],
      ["array", []],
      ["empty", {}],
      ["connector-empty", { connector: "", action: "define_values", form: {} }],
      ["connector-space", { connector: "Windows Connector", action: "define_values", form: {} }],
      ["connector-hyphen", { connector: "Windows-Connector", action: "define_values", form: {} }],
      ["connector-non-ascii", { connector: "ウィンドウズ", action: "define_values", form: {} }],
      ["connector-missing", { action: "define_values", form: {} }],
      ["action-empty", { connector: "WindowsConnector", action: "", form: {} }],
      ["action-dot", { connector: "WindowsConnector", action: "define.values", form: {} }],
      ["action-missing", { connector: "WindowsConnector", form: {} }],
      ["form-missing", { connector: "WindowsConnector", action: "define_values" }],
      ["form-array", { connector: "WindowsConnector", action: "define_values", form: [] }],
      ["form-null", { connector: "WindowsConnector", action: "define_values", form: null }],
      ["form-string", { connector: "WindowsConnector", action: "define_values", form: "{}" }],
      ["description-number", { connector: "WindowsConnector", action: "define_values", form: {}, description: 1 }],
      ["description-auto-string", { connector: "WindowsConnector", action: "define_values", form: {}, descriptionAuto: "true" }],
      ["id", { connector: "WindowsConnector", action: "define_values", form: {}, id: "node-x" }],
      ["step-name", { connector: "WindowsConnector", action: "define_values", form: {}, stepName: "step9" }],
      ["position", { connector: "WindowsConnector", action: "define_values", form: {}, canvasPosition: { x: 8, y: 8 } }],
      ["parent", { connector: "WindowsConnector", action: "define_values", form: {}, parentId: "step1" }],
      ["merge", { connector: "WindowsConnector", action: "define_values", form: {}, mergeParentIds: [] }],
      ["loop-owner", { connector: "WindowsConnector", action: "define_values", form: {}, loopOwnerId: "step1" }],
      ["node-type", { connector: "WindowsConnector", action: "define_values", form: {}, nodeType: "loop" }],
      ["outputs", { connector: "WindowsConnector", action: "define_values", form: {}, outputs: ["step9"] }],
      ["catalog-item-id", { connector: "WindowsConnector", action: "define_values", form: {}, kind: "node", label: "変数定義" }],
      ["catalog-folder", { connector: "WindowsConnector", action: "define_values", form: {}, folderId: "workflow-nodes" }],
      ["catalog-icon", { connector: "WindowsConnector", action: "define_values", form: {}, icon: "icons/node.svg" }],
    ];
    const snapshot = () => structuredClone({
      nodes: runtime.state.nodes ?? [],
      hiddenBindings: runtime.state.hiddenBindings ?? {},
      nextStepSeq: runtime.state.nextStepSeq ?? null,
      selectedNodeIds: runtime.state.selectedNodeIds ?? [],
    });
    const before = snapshot();
    const originalOnStateChanged = runtime.onStateChanged;
    let stateChangeCalls = 0;
    runtime.onStateChanged = (...args) => {
      stateChangeCalls += 1;
      return originalOnStateChanged.apply(null, args);
    };
    let accepted = [];
    let pastedIds = [];
    try {
      accepted = invalid.map(([name, template]) => [name, window.zizEmbeddedApi.setNodeTemplate(template)]);
      pastedIds = facade.pasteNodes(runtime, runtime.state.selectedNodeId);
    } finally {
      runtime.onStateChanged = originalOnStateChanged;
    }
    return {
      accepted,
      pastedIds,
      stateChangeCalls,
      before,
      after: snapshot(),
      hasNodeTemplate: facade.hasNodeTemplate(),
      hasCopiedNodes: facade.hasCopiedNodes(),
    };
  });

  expect(result.accepted.filter(([, accepted]) => accepted !== false)).toEqual([]);
  expect(result.hasNodeTemplate).toBe(false);
  expect(result.hasCopiedNodes).toBe(false);
  expect(result.pastedIds).toEqual([]);
  expect(result.stateChangeCalls).toBe(0);
  expect(result.after).toEqual(result.before);
  expect((await readSavedFlow(page)).steps.map((step) => step.step_id)).toEqual(["step1"]);
});


test("内部clipboardは既存node copyとnode templateを排他的に保持する", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Node template exclusive clipboard contract" },
    variables: { start: [] },
    steps: [
      taskStep("step1", 140, 40),
      taskStep("step2", 380, 40, {
        params: { define_values: [{ name: "from_step1", value: "step1-value" }] },
      }),
    ],
    flows: {
      edges: [
        { from: "START", to: "step1", order: 1, kind: "primary" },
        { from: "step1", to: "step2", order: 1, kind: "primary" },
      ],
    },
    notes: [],
  });

  // 読込直後に選択済みのstep1を再クリックすると選択解除されるため、
  // 既存copy/paste回帰と同じく未選択のstep2をcopy元にする。
  const source = page.locator('.zwd-node--step[aria-label="step2"]');
  await source.click();
  await source.focus();
  await page.keyboard.press("Control+c");
  const afterCopy = await page.evaluate(() => {
    const facade = window.zizPackages.ui.workflowCommandFacade;
    return { copiedNodeIds: facade.getCopiedNodeIds(), hasNodeTemplate: facade.hasNodeTemplate() };
  });
  expect(afterCopy.copiedNodeIds).toHaveLength(1);
  expect(afterCopy.hasNodeTemplate).toBe(false);

  // templateを選ぶとcopy済みnodeは失われ、Pasteはtemplateだけを生成する。
  const afterTemplate = await page.evaluate((template) => {
    const facade = window.zizPackages.ui.workflowCommandFacade;
    const accepted = facade.setNodeTemplate(template);
    return { accepted, copiedNodeIds: facade.getCopiedNodeIds(), hasNodeTemplate: facade.hasNodeTemplate() };
  }, NODE_TEMPLATE);
  expect(afterTemplate).toEqual({ accepted: true, copiedNodeIds: [], hasNodeTemplate: true });

  await source.focus();
  await page.keyboard.press("Control+v");
  await expect
    .poll(async () => (await readSavedFlow(page)).steps.map((step) => step.step_id))
    .toEqual(["step1", "step2", "step3"]);
  expect((await readSavedFlow(page)).steps[2].params)
    .toEqual({ define_values: [{ name: "from_template", value: "template-value" }] });

  // 既存copyへ戻すとtemplateは失われ、Pasteは従来どおりnodeを複製する。
  await source.click();
  await source.focus();
  await page.keyboard.press("Control+c");
  const afterRecopy = await page.evaluate(() => {
    const facade = window.zizPackages.ui.workflowCommandFacade;
    return { copiedNodeIds: facade.getCopiedNodeIds(), hasNodeTemplate: facade.hasNodeTemplate() };
  });
  expect(afterRecopy.copiedNodeIds).toHaveLength(1);
  expect(afterRecopy.hasNodeTemplate).toBe(false);

  await page.keyboard.press("Control+v");
  await expect
    .poll(async () => (await readSavedFlow(page)).steps.map((step) => step.step_id))
    .toEqual(["step1", "step2", "step3", "step4"]);
  expect((await readSavedFlow(page)).steps[3].params)
    .toEqual({ define_values: [{ name: "from_step1", value: "step1-value" }] });
});


test("Adapter destroy/remountでstale listenerとDOMを残さない", async ({ page }) => {
  await mountFlow(page, {
    metadata: { mode: "dataflow", name: "Lifecycle contract" },
    variables: { start: [] },
    steps: [taskStep("step1", 140, 40)],
    flows: { edges: [{ from: "START", to: "step1", order: 1, kind: "primary" }] },
    notes: [],
  });

  const lifecycle = await page.evaluate(() => {
    const root = document.getElementById("flowchart");
    const adapter = window.zizPackages.ui.workflowDesignerAdapter;
    const oldRuntime = root.__workflowDesignerAdapterRuntime;
    const args = {
      root,
      state: oldRuntime.state,
      config: oldRuntime.config,
      onStateChanged: oldRuntime.onStateChanged,
    };
    const originalRemove = EventTarget.prototype.removeEventListener;
    let removedDomListeners = 0;
    EventTarget.prototype.removeEventListener = function removeTracked(type, handler, options) {
      removedDomListeners += 1;
      return originalRemove.call(this, type, handler, options);
    };
    try {
      const cleanupCount = oldRuntime.cleanup.length;
      adapter.destroyFlowCanvas(root);
      const afterDestroy = {
        runtimePresent: !!root.__workflowDesignerAdapterRuntime,
        cleanupCount: oldRuntime.cleanup.length,
        designerCount: root.querySelectorAll(":scope > .zwd").length,
        hostClassPresent: root.classList.contains("workflow-designer-host"),
      };
      adapter.destroyFlowCanvas(root);
      const newRuntime = adapter.renderFlowChart(args);
      return {
        cleanupCount,
        removedDomListeners,
        afterDestroy,
        runtimeReplaced: newRuntime !== oldRuntime,
        designerCount: root.querySelectorAll(":scope > .zwd").length,
      };
    } finally {
      EventTarget.prototype.removeEventListener = originalRemove;
    }
  });
  expect(lifecycle.cleanupCount).toBeGreaterThan(0);
  expect(lifecycle.removedDomListeners).toBeGreaterThan(0);
  expect(lifecycle.afterDestroy).toEqual({
    runtimePresent: false,
    cleanupCount: 0,
    designerCount: 0,
    hostClassPresent: false,
  });
  expect(lifecycle.runtimeReplaced).toBe(true);
  expect(lifecycle.designerCount).toBe(1);
  await expect(page.locator("#flowchart > .zwd")).toHaveCount(1);
});
