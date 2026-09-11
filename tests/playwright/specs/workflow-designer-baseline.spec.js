const { test, expect } = require("@playwright/test");


// WP-8B: WorkflowDesigner 移管前の現行キャンバスの観測可能な挙動を固定する回帰ベースライン。
// 実装内部（Canvas2D の描画結果や内部関数名）ではなく、公開 DOM / 保存ドキュメント /
// Bridge へ出る要求 / 利用者に見える状態だけを検証する。


const NODE_W = 60;
const NODE_H = 60;
const GRID_TOLERANCE = 16;


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


function primaryEdge(from, to, order = 1) {
  return { from, to, order, kind: "primary" };
}


function flowDocument({ steps, edges, notes = [] }) {
  return {
    metadata: { mode: "dataflow", name: "回帰ベースライン" },
    variables: { start: [] },
    steps,
    flows: { edges },
    notes,
  };
}


function linearFlowDocument() {
  return flowDocument({
    steps: [
      taskStep("step1", 140, 40),
      taskStep("step2", 236, 40),
      taskStep("step3", 332, 40),
    ],
    edges: [
      primaryEdge("START", "step1"),
      primaryEdge("step1", "step2"),
      primaryEdge("step2", "step3"),
    ],
  });
}


function nodeCenter(step) {
  return { x: step.ui_position.x + NODE_W / 2, y: step.ui_position.y + NODE_H / 2 };
}


// 追加・挿入操作は後続ノードを右へずらすため、操作後の座標は保存位置から取り直す。
async function savedNodeCenter(page, stepId) {
  const saved = await readSavedFlow(page);
  const step = findStep(saved, stepId);
  expect(step, `step ${stepId} が保存ドキュメントにありません`).toBeTruthy();
  return nodeCenter(step);
}


function findStep(flow, stepId) {
  return (flow?.steps || []).find((step) => step.step_id === stepId) || null;
}


function edgeKeys(flow) {
  return (flow?.flows?.edges || []).map((edge) => `${edge.from}->${edge.to}`);
}


// 現行のフロー画面は Workspace タブへ埋め込まれた状態で表示されるため、
// 既存 spec と同じ埋め込み URL で開く。
async function mountFlow(page, doc) {
  await page.goto("/gui/dataflow.html?mode=dataflow&embedded=1");
  await expect(page.locator(".detail-panel")).toBeVisible();
  await page.waitForFunction(() => !!window.zizEmbeddedApi);
  await page.evaluate((flow) => {
    window.dispatchEvent(new CustomEvent("ziz:workspace-flow-open", {
      detail: { selected: true, mode: "dataflow", file_name: "baseline.zizd", flow },
    }));
  }, doc);
  await expect(page.locator("#flowchart > .zwd")).toBeVisible();
  await expect(page.locator("#nodeDetail .node-topbar-step")).toHaveText(doc.steps[0].step_id);
  return canvasGeometry(page);
}


function designerNode(page, stepId) {
  return page.locator(`.zwd-node--step[aria-label="${stepId}"]`);
}


async function dragLocator(page, locator, targetPoint, options = {}) {
  const box = await locator.boundingBox();
  expect(box, "操作対象が公開 DOM に見つかりません").toBeTruthy();
  const button = options.button || "left";
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button });
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 2 });
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 8 });
  await page.mouse.up({ button });
}


async function edgeLocator(page, fromStepId, toStepId) {
  const edgeKey = await page.evaluate(({ fromStepId, toStepId }) => {
    const runtime = document.getElementById("flowchart")?.__workflowDesignerAdapterRuntime;
    const nodes = Array.isArray(runtime?.state?.nodes) ? runtime.state.nodes : [];
    const idFor = (stepId) => String(nodes.find((node) => node?.stepName === stepId)?.id || "");
    return `flow:main:edge:${idFor(fromStepId)}:${idFor(toStepId)}`;
  }, { fromStepId, toStepId });
  const edge = page.locator(`[data-edge-key="${edgeKey}"]`).last();
  await expect(edge).toHaveCount(1);
  return edge;
}


async function edgePoint(page, fromStepId, toStepId) {
  const edge = await edgeLocator(page, fromStepId, toStepId);
  const point = await edge.evaluate((element) => {
    const path = element.querySelector(".zwd-edge__hit") || element.querySelector("path");
    const length = path.getTotalLength();
    for (let index = 1; index < 100; index += 1) {
      const value = path.getPointAtLength(length * index / 100);
      const screen = value.matrixTransform(path.getScreenCTM());
      const hit = document.elementFromPoint(screen.x, screen.y)?.closest?.("[data-edge-key]");
      if (hit?.dataset.edgeKey === element.dataset.edgeKey) {
        return { x: screen.x, y: screen.y };
      }
    }
    return null;
  });
  expect(point, `${fromStepId}->${toStepId} の公開エッジを操作できません`).toBeTruthy();
  return point;
}


async function openNodeContextMenu(page, stepId) {
  await designerNode(page, stepId).click({ button: "right" });
  await expect(menuItems(page).first()).toBeVisible();
}


async function openBlankContextMenu(page, position = { x: 560, y: 320 }) {
  await page.locator(".zwd-viewport").click({ button: "right", position });
  await expect(menuItems(page).first()).toBeVisible();
}


async function nextRender(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}


async function spreadLinearNodes(page) {
  const viewport = await page.locator(".zwd-viewport").boundingBox();
  expect(viewport).toBeTruthy();
  await dragLocator(page, designerNode(page, "step3"), {
    x: viewport.x + viewport.width - 110,
    y: viewport.y + 120,
  });
  await nextRender(page);
  await dragLocator(page, designerNode(page, "step2"), {
    x: viewport.x + viewport.width - 310,
    y: viewport.y + 120,
  });
  await nextRender(page);
}


async function canvasGeometry(page) {
  const geometry = await page.evaluate(() => {
    const root = document.getElementById("flowchart");
    const viewport = root.querySelector(".zwd-viewport");
    const viewportRect = viewport.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    return {
      left: viewportRect.left,
      top: viewportRect.top,
      visibleWidth: Math.min(rootRect.width, viewportRect.width),
      visibleHeight: Math.min(rootRect.height, viewportRect.height),
    };
  });
  expect(geometry.visibleWidth).toBeGreaterThan(660);
  expect(geometry.visibleHeight).toBeGreaterThan(340);
  return geometry;
}


function toViewport(geometry, point) {
  return { x: geometry.left + point.x, y: geometry.top + point.y };
}


async function clickCanvas(page, geometry, point, options = {}) {
  const target = toViewport(geometry, point);
  await page.mouse.click(target.x, target.y, options);
}


async function dragCanvas(page, geometry, from, to, options = {}) {
  const button = options.button || "left";
  const start = toViewport(geometry, from);
  const end = toViewport(geometry, to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button });
  await page.mouse.move(start.x + (end.x > start.x ? 10 : -10), start.y + (end.y > start.y ? 10 : -10), { steps: 2 });
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up({ button });
}


function menuItems(page) {
  return page.getByRole("menuitem");
}


async function openContextMenu(page, geometry, point) {
  await clickCanvas(page, geometry, point, { button: "right" });
  await expect(menuItems(page).first()).toBeVisible();
}


// 保存ドキュメントは移管後も Application が所有する観測点なので、
// ノード/エッジ/メモの結果はここから確認する。
async function readSavedFlow(page) {
  return page.evaluate(async () => {
    const bridge = window.zizBridge;
    const originalCall = bridge.call;
    let captured = null;
    bridge.call = async (type, payload) => {
      if (type === "flow.save") {
        captured = payload && payload.flow ? payload.flow : null;
        return {};
      }
      return {};
    };
    try {
      await window.zizEmbeddedApi.saveFlow();
    } finally {
      bridge.call = originalCall;
    }
    return captured;
  });
}


// Bridge 要求と外部リンク起動を観測するためのスタブ。Application 側の責務境界だけを覗く。
async function installBridgeSpy(page) {
  await page.evaluate(() => {
    const bridge = window.zizBridge;
    const calls = [];
    const externals = [];
    window.__baselineBridgeSpy = { calls, externals };
    bridge.available = () => true;
    bridge.call = async (type, payload) => {
      calls.push({ type, payload });
      if (type === "flow.run") return { run_id: "run-baseline" };
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
    calls: window.__baselineBridgeSpy.calls.map((entry) => ({ type: entry.type, payload: entry.payload })),
    externals: window.__baselineBridgeSpy.externals.slice(),
  }));
}


test("キャンバスのクリックで単一選択と選択解除ができる", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);
  const detailPanelRegion = page.locator(".zui-shell__right-panel");

  await clickCanvas(page, geometry, nodeCenter(flow.steps[1]));
  await expect(detailPanelRegion).toBeVisible();
  await expect(page.locator("#nodeDetail .node-topbar-step")).toHaveText("step2");

  await clickCanvas(page, geometry, nodeCenter(flow.steps[2]));
  await expect(page.locator("#nodeDetail .node-topbar-step")).toHaveText("step3");

  // 空白クリックで選択を解除すると、単一選択向けの詳細表示を閉じる。
  await clickCanvas(page, geometry, { x: 120, y: 200 });
  await expect(detailPanelRegion).toBeHidden();
});


test("右ドラッグの範囲選択で複数選択し、複数選択用の操作を表示する", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);
  const detailPanelRegion = page.locator(".zui-shell__right-panel");

  await clickCanvas(page, geometry, nodeCenter(flow.steps[1]));
  await expect(detailPanelRegion).toBeVisible();

  await dragCanvas(page, geometry, { x: 520, y: 200 }, { x: 110, y: 20 }, { button: "right" });

  // 複数選択中は単一ノードの詳細を表示しない。
  await expect(detailPanelRegion).toBeHidden();

  await openNodeContextMenu(page, "step1");
  await expect(menuItems(page)).toHaveText(["コピー", "削除"]);

  await menuItems(page).filter({ hasText: "削除" }).click();

  // 選択した3ノードを削除するが、フローは最低1ノードを保持する。
  const saved = await readSavedFlow(page);
  expect(saved.steps).toHaveLength(1);
  expect(saved.steps.map((step) => step.step_id)).not.toContain("step1");
  expect(saved.steps.map((step) => step.step_id)).not.toContain("step2");
});


test("ノードをドラッグすると保存位置が移動し、元に戻す/やり直しで復元できる", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);
  const origin = flow.steps[1].ui_position;

  const before = await readSavedFlow(page);
  expect(findStep(before, "step2").ui_position).toEqual(origin);

  const from = nodeCenter(flow.steps[1]);
  await dragCanvas(page, geometry, from, { x: from.x + 96, y: from.y + 64 });

  const moved = await readSavedFlow(page);
  const movedPosition = findStep(moved, "step2").ui_position;
  expect(Math.abs(movedPosition.x - (origin.x + 96))).toBeLessThanOrEqual(GRID_TOLERANCE);
  expect(Math.abs(movedPosition.y - (origin.y + 64))).toBeLessThanOrEqual(GRID_TOLERANCE);

  // 他のノードは移動しない。
  expect(findStep(moved, "step1").ui_position).toEqual(flow.steps[0].ui_position);
  expect(findStep(moved, "step3").ui_position).toEqual(flow.steps[2].ui_position);

  await page.locator('[data-zwd-command="history.undo"]').click();
  await expect.poll(async () => findStep(await readSavedFlow(page), "step2").ui_position).toEqual(origin);

  await page.locator('[data-zwd-command="history.redo"]').click();
  await expect.poll(async () => findStep(await readSavedFlow(page), "step2").ui_position).toEqual(movedPosition);
});


test("エッジを右クリックして接続を削除できる", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);

  // library標準ノード幅でエッジが隠れないよう、公開ドラッグ操作で間隔を広げる。
  await spreadLinearNodes(page);
  const point = await edgePoint(page, "step1", "step2");
  await page.mouse.click(point.x, point.y, { button: "right" });
  await expect(menuItems(page).first()).toBeVisible();
  await expect(menuItems(page)).toHaveText(["フローリレーションを削除"]);

  await menuItems(page).first().click();

  const saved = await readSavedFlow(page);
  expect(edgeKeys(saved)).not.toContain("step1->step2");
  expect(edgeKeys(saved)).toContain("START->step2");
  expect(edgeKeys(saved)).toContain("step2->step3");
});


test("ノードから空白へ右ドラッグすると後続ノードを追加する", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);

  const dropPoint = { x: 560, y: 168 };
  await dragCanvas(page, geometry, nodeCenter(flow.steps[2]), dropPoint, { button: "right" });

  const saved = await readSavedFlow(page);
  expect(saved.steps).toHaveLength(4);
  const created = saved.steps.find((step) => !["step1", "step2", "step3"].includes(step.step_id));
  expect(created).toBeTruthy();
  expect(edgeKeys(saved)).toContain(`step3->${created.step_id}`);
  expect(Math.abs(created.ui_position.x - dropPoint.x)).toBeLessThanOrEqual(GRID_TOLERANCE);
  expect(Math.abs(created.ui_position.y - dropPoint.y)).toBeLessThanOrEqual(GRID_TOLERANCE);
});


test("ノードから既存の接続先へ右ドラッグすると間に挿入する", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);

  await spreadLinearNodes(page);
  await dragLocator(page, designerNode(page, "step1"), await edgePoint(page, "step1", "step2"), { button: "right" });

  const saved = await readSavedFlow(page);
  expect(saved.steps).toHaveLength(4);
  const created = saved.steps.find((step) => !["step1", "step2", "step3"].includes(step.step_id));
  expect(created).toBeTruthy();
  expect(edgeKeys(saved)).toContain(`step1->${created.step_id}`);
  expect(edgeKeys(saved)).toContain(`${created.step_id}->step2`);
  expect(edgeKeys(saved)).not.toContain("step1->step2");
});


test("ノードの右クリック操作で追加・コピー・貼り付け・削除ができる", async ({ page }) => {
  const flow = linearFlowDocument();
  flow.steps[2].params = {
    define_values: [{ name: "copied_from_step3", value: "baseline-source" }],
  };
  const geometry = await mountFlow(page, flow);

  await openNodeContextMenu(page, "step1");
  await expect(menuItems(page)).toHaveText(["後に追加", "後にループ追加", "コピー", "実行", "削除"]);

  await menuItems(page).filter({ hasText: "後に追加" }).click();
  const afterAdd = await readSavedFlow(page);
  expect(afterAdd.steps).toHaveLength(4);
  const added = afterAdd.steps.find((step) => !["step1", "step2", "step3"].includes(step.step_id));
  expect(edgeKeys(afterAdd)).toContain(`step1->${added.step_id}`);
  expect(edgeKeys(afterAdd)).toContain(`${added.step_id}->step2`);

  // 挿入直後に重なる新規ノードを公開ドラッグ操作で退避して、step3 を操作可能にする。
  await nextRender(page);
  const viewportBox = await page.locator(".zwd-viewport").boundingBox();
  await dragLocator(page, designerNode(page, added.step_id), {
    x: viewportBox.x + viewportBox.width - 120,
    y: viewportBox.y + viewportBox.height - 100,
  });
  await nextRender(page);
  await openNodeContextMenu(page, "step3");
  await menuItems(page).filter({ hasText: "コピー" }).click();

  await openBlankContextMenu(page);
  await expect(menuItems(page)).toHaveText(["ノードを追加", "ループノードを追加", "貼り付け"]);
  await menuItems(page).filter({ hasText: "貼り付け" }).click();

  const afterPaste = await readSavedFlow(page);
  expect(afterPaste.steps).toHaveLength(5);
  const source = findStep(afterPaste, "step3");
  const pasted = afterPaste.steps.find((step) => ![
    "step1",
    "step2",
    "step3",
    added.step_id,
  ].includes(step.step_id));
  expect(source).toBeTruthy();
  expect(pasted).toBeTruthy();
  expect(pasted.step_id).not.toBe(source.step_id);
  expect(pasted.connector).toBe(source.connector);
  expect(pasted.action).toBe(source.action);
  expect(pasted.params).toEqual(source.params);

  await nextRender(page);
  const afterPasteViewport = await page.locator(".zwd-viewport").boundingBox();
  await dragLocator(page, designerNode(page, pasted.step_id), {
    x: afterPasteViewport.x + afterPasteViewport.width - 120,
    y: afterPasteViewport.y + afterPasteViewport.height - 220,
  });
  await nextRender(page);
  await openNodeContextMenu(page, "step3");
  await menuItems(page).filter({ hasText: "削除" }).click();

  const afterDelete = await readSavedFlow(page);
  expect(afterDelete.steps.map((step) => step.step_id)).not.toContain("step3");
});


test("空白の右クリックからノードとループノードを追加できる", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);

  await openBlankContextMenu(page);
  await expect(menuItems(page)).toHaveText(["ノードを追加", "ループノードを追加"]);

  await menuItems(page).filter({ hasText: "ループノードを追加" }).click();

  const saved = await readSavedFlow(page);
  expect(saved.steps).toHaveLength(4);
  const loopStep = saved.steps.find((step) => step.node_type === "loop");
  expect(loopStep).toBeTruthy();
  expect(edgeKeys(saved)).toContain(`START->${loopStep.step_id}`);
});


test("ループノードのコンテキスト操作でループ内とループ後に追加できる", async ({ page }) => {
  const flow = flowDocument({
    steps: [
      taskStep("step1", 140, 40),
      taskStep("step2", 236, 40, {
        node_type: "loop",
        action: "loop_tasks",
        params: { source_step_id: "{{step1}}", max_iterations: 30 },
      }),
      taskStep("step3", 332, 40, { loop_owner_id: "step2" }),
    ],
    edges: [primaryEdge("START", "step1"), primaryEdge("step1", "step2")],
  });
  const geometry = await mountFlow(page, flow);

  const initial = await readSavedFlow(page);
  expect(findStep(initial, "step2").node_type).toBe("loop");
  expect(findStep(initial, "step3").loop_owner_id).toBe("step2");

  // ループ内部ノードは「ループ内に追加」だけを持つ。
  await openNodeContextMenu(page, "step3");
  await expect(menuItems(page)).toHaveText(["ループ内に追加", "コピー", "実行", "削除"]);
  await page.keyboard.press("Escape");
  await expect(menuItems(page).first()).toBeHidden();

  await openNodeContextMenu(page, "step2");
  await expect(menuItems(page)).toHaveText(["ループ内に追加", "ループの後に追加", "コピー", "実行", "削除"]);
  await menuItems(page).filter({ hasText: "ループ内に追加" }).click();

  const afterInner = await readSavedFlow(page);
  expect(afterInner.steps.filter((step) => step.loop_owner_id === "step2")).toHaveLength(2);

  await nextRender(page);
  await openNodeContextMenu(page, "step2");
  await menuItems(page).filter({ hasText: "ループの後に追加" }).click();

  const afterLoop = await readSavedFlow(page);
  expect(afterLoop.steps).toHaveLength(5);
  expect(afterLoop.steps.filter((step) => step.loop_owner_id === "step2")).toHaveLength(2);
  expect(afterLoop.steps.filter((step) => step.node_type === "loop")).toHaveLength(1);
});


test("合流エッジを右クリックから解除できる", async ({ page }) => {
  const flow = flowDocument({
    steps: [
      taskStep("step1", 140, 40),
      taskStep("step2", 140, 168),
      taskStep("step3", 332, 40),
    ],
    edges: [
      primaryEdge("START", "step1"),
      primaryEdge("START", "step2", 2),
      primaryEdge("step1", "step3"),
      { from: "step2", to: "step3", order: 2, kind: "merge" },
    ],
  });
  const geometry = await mountFlow(page, flow);

  const initial = await readSavedFlow(page);
  expect(edgeKeys(initial)).toContain("step2->step3");

  await openContextMenu(page, geometry, nodeCenter(flow.steps[2]));
  await expect(menuItems(page)).toHaveText([
    "後に追加",
    "後にループ追加",
    "コピー",
    "合流を解除",
    "実行",
    "削除",
  ]);
  await menuItems(page).filter({ hasText: "合流を解除" }).click();

  const saved = await readSavedFlow(page);
  expect(edgeKeys(saved)).not.toContain("step2->step3");
  expect(edgeKeys(saved)).toContain("step1->step3");
});


test("付箋モードで付箋の作成・編集・移動・リサイズ・色変更・削除ができる", async ({ page }) => {
  const flow = flowDocument({
    steps: [taskStep("step1", 140, 40)],
    edges: [primaryEdge("START", "step1")],
    notes: [{ id: "note-1", x: 140, y: 136, w: 224, h: 128, text: "既存メモ", color: "#fff8c7" }],
  });
  const geometry = await mountFlow(page, flow);

  const annotationToggle = page.locator('[data-zwd-command="annotation.mode-toggle"]');
  // toolbarに付箋作成専用buttonは存在せず、付箋モード切替だけを表示する。
  await expect(page.locator('[data-zwd-command="annotation.add"]')).toHaveCount(0);
  await expect(page.locator('[data-note-color="note-1"]')).toBeDisabled();
  await expect(page.locator('[data-note-resize="note-1"]')).toBeDisabled();
  await annotationToggle.click();
  await expect(annotationToggle).toHaveAttribute("aria-pressed", "true");

  // 追加（付箋モードON時のcanvas右clickから作成する）
  await openContextMenu(page, geometry, { x: 480, y: 260 });
  await expect(menuItems(page)).toHaveText(["付箋作成"]);
  await menuItems(page).click();
  const afterAdd = await readSavedFlow(page);
  expect(afterAdd.notes).toHaveLength(2);

  const created = afterAdd.notes.find((note) => note.id !== "note-1");
  await page.keyboard.press("Delete");
  const afterDeleteCreated = await readSavedFlow(page);
  expect(afterDeleteCreated.notes.map((note) => note.id)).toEqual(["note-1"]);
  expect(created.id).toBeTruthy();

  // 編集（ダブルクリックでインライン編集を開き、Ctrl+Enter で確定）
  await page.locator('[data-note-body="note-1"]').dblclick();
  const editor = page.locator(".zwd-note__editor");
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue("既存メモ");
  await editor.fill("編集後メモ");
  await editor.press("Control+Enter");
  await expect(editor).toHaveCount(0);
  await expect.poll(async () => (await readSavedFlow(page)).notes[0].text).toBe("編集後メモ");

  // 移動
  const noteHandle = page.locator('[data-note-id="note-1"] [data-note-drag-handle]');
  const noteHandleBox = await noteHandle.boundingBox();
  expect(noteHandleBox).toBeTruthy();
  await dragLocator(page, noteHandle, {
    x: noteHandleBox.x + noteHandleBox.width / 2 + 64,
    y: noteHandleBox.y + noteHandleBox.height / 2 + 32,
  });
  const afterMove = await readSavedFlow(page);
  expect(Math.abs(afterMove.notes[0].x - 204)).toBeLessThanOrEqual(GRID_TOLERANCE);
  expect(Math.abs(afterMove.notes[0].y - 168)).toBeLessThanOrEqual(GRID_TOLERANCE);
  expect(afterMove.notes[0].w).toBe(224);
  expect(afterMove.notes[0].h).toBe(128);

  // リサイズ（右下ハンドル）
  const moved = afterMove.notes[0];
  await nextRender(page);
  const resizeHandle = page.locator('[data-note-resize="note-1"]');
  await expect(resizeHandle).toBeVisible();
  const resizeBox = await resizeHandle.boundingBox();
  await dragLocator(page, resizeHandle, {
    x: resizeBox.x + resizeBox.width / 2 + 64,
    y: resizeBox.y + resizeBox.height / 2 + 32,
  });
  const afterResize = await readSavedFlow(page);
  expect(afterResize.notes[0].w).toBeGreaterThan(moved.w);
  expect(afterResize.notes[0].h).toBeGreaterThan(moved.h);
  expect(afterResize.notes[0].x).toBe(moved.x);
  expect(afterResize.notes[0].y).toBe(moved.y);

  // 色変更（メモ再描画でinputが差し替わるため、公開操作としてfillで値を確定する）
  const colorInput = page.locator('[data-note-color="note-1"]');
  const color = "#ffd6a5";
  await colorInput.fill(color);
  await expect.poll(async () => (await readSavedFlow(page)).notes[0].color).toBe(color);

  // 削除
  await page.locator('[data-note-id="note-1"]').click();
  await page.keyboard.press("Delete");
  const afterDelete = await readSavedFlow(page);
  expect(afterDelete.notes).toHaveLength(0);
});


test("付箋内の https リンクは外部ブラウザ起動要求として Application に渡る", async ({ page }) => {
  const flow = flowDocument({
    steps: [taskStep("step1", 140, 40)],
    edges: [primaryEdge("START", "step1")],
    notes: [{
      id: "note-1",
      x: 140,
      y: 136,
      w: 224,
      h: 128,
      text: "参考資料\nhttps://example.com/docs",
      color: "#fff8c7",
    }],
  });
  await mountFlow(page, flow);
  await installBridgeSpy(page);

  // OFF時も非編集の閲覧操作として外部リンクは有効。
  await page.locator('[data-note-id="note-1"] [data-external-url]').click();

  await expect.poll(async () => (await readBridgeSpy(page)).externals).toEqual([
    { url: "https://example.com/docs", options: { prefer: "chrome" } },
  ]);
});


test("ノードの実行操作は必須未入力を検証し、満たす場合だけ実行要求を出す", async ({ page }) => {
  const flow = flowDocument({
    steps: [
      taskStep("step1", 140, 40),
      taskStep("loop1", 236, 40, {
        node_type: "loop",
        action: "loop_tasks",
        params: { max_iterations: 30 },
      }),
    ],
    edges: [primaryEdge("START", "step1"), primaryEdge("step1", "loop1")],
  });
  const geometry = await mountFlow(page, flow);
  await installBridgeSpy(page);

  await openContextMenu(page, geometry, nodeCenter(flow.steps[1]));
  await menuItems(page).filter({ hasText: "実行" }).click();

  await expect(page.locator("#appDialog.is-open")).toBeVisible();
  await expect(page.locator("#appDialogTitle")).toHaveText("入力確認");
  await expect(page.locator("#appDialogMessage")).toContainText("必須パラメータが未入力です");
  expect((await readBridgeSpy(page)).calls.filter((call) => call.type === "flow.run")).toHaveLength(0);
  await page.locator("#appDialogOk").click();
  await expect(page.locator("#appDialog.is-open")).toHaveCount(0);

  await openContextMenu(page, geometry, nodeCenter(flow.steps[0]));
  await menuItems(page).filter({ hasText: "実行" }).click();

  await expect.poll(async () => {
    const spy = await readBridgeSpy(page);
    return spy.calls.filter((call) => call.type === "flow.run").map((call) => call.payload.step_id);
  }).toEqual(["step1"]);
});


test("ステップ実行状態はノード詳細の実行状態表示へ反映される", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);
  const statusNote = page.locator("#nodeDetailBottom .node-data-status-slot .node-data-note");
  await installBridgeSpy(page);

  // 実行要求を受理させ、同じ run_id の状態・終端イベントを送る。
  // run.failed は保留中の stepStatus を同期反映するため、待機をタイマーへ依存させない。
  await openContextMenu(page, geometry, nodeCenter(flow.steps[1]));
  await menuItems(page).filter({ hasText: "実行" }).click();
  await expect.poll(async () => {
    const spy = await readBridgeSpy(page);
    return spy.calls.filter((call) => call.type === "flow.run").map((call) => call.payload.step_id);
  }).toEqual(["step2"]);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("ziz:evt", {
      detail: { kind: "evt", type: "run.stepStatus", payload: { run_id: "run-baseline", step_id: "step2", status: "error" } },
    }));
    window.dispatchEvent(new CustomEvent("ziz:evt", {
      detail: { kind: "evt", type: "run.failed", payload: { run_id: "run-baseline", status: "error" } },
    }));
  });

  await clickCanvas(page, geometry, nodeCenter(flow.steps[1]));
  await expect(statusNote).toContainText("実行状態: エラー");

  await clickCanvas(page, geometry, nodeCenter(flow.steps[0]));
  await expect(statusNote).not.toContainText("実行状態");
});


test("空白の左ドラッグとホイールでキャンバスをスクロールできる", async ({ page }) => {
  const flow = linearFlowDocument();
  const geometry = await mountFlow(page, flow);

  const readViewport = () => page.evaluate(() => {
    const runtime = document.getElementById("flowchart")?.__workflowDesignerAdapterRuntime;
    return runtime?.instance?.getViewport();
  });

  expect(await readViewport()).toEqual({ x: 0, y: 0, zoom: 1 });

  await dragCanvas(page, geometry, { x: 600, y: 300 }, { x: 400, y: 240 });
  const afterPan = await readViewport();
  expect(afterPan.x).toBeLessThan(-100);
  expect(afterPan.y).toBeLessThan(-30);

  // パン後もノード位置は変化しない（パンは移動操作ではない）。
  const saved = await readSavedFlow(page);
  expect(findStep(saved, "step1").ui_position).toEqual(flow.steps[0].ui_position);

  await page.mouse.move(geometry.left + 200, geometry.top + 100);
  await page.mouse.wheel(0, -120);
  await expect.poll(async () => (await readViewport()).zoom).toBeGreaterThan(afterPan.zoom);
});
