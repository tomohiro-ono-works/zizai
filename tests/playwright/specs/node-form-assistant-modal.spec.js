const { test, expect } = require("@playwright/test");


// WP-6C1: from a real CSVConnector.read_csv / ExcelConnector.read_excel node detail
// that also contains NodeForm-mounted fields, verify the existing "プレビュー表示"
// assistant action opens the real Excel/CSV assistant modal (real modal package, real
// ui.node.detail.js / ui.node.shared.js controller, real config.js resultFieldMap, real
// node.form mutation path). Only the OS file/preview Bridge boundary is doubled below.


function buildCsvReadNode() {
  return {
    id: "n1",
    stepName: "step1",
    connector: "CSVConnector",
    action: "read_csv",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: {
      file_path: "C:/old/old.csv",
      encoding: "shift_jis",
      delimiter: ";",
      header_row: 9,
      data_start_row: 9,
      chunk_size: 12345,
      date_cleansing: false,
      schema: "PLACEHOLDER",
    },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
}

function buildExcelReadNode() {
  return {
    id: "n1",
    stepName: "step1",
    connector: "ExcelConnector",
    action: "read_excel",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: {
      file_path: "C:/old/old.xlsx",
      sheet_name: "OldSheet",
      header_row: 9,
      data_start_row: 9,
      chunk_size: 12345,
      date_cleansing: false,
      schema: "PLACEHOLDER",
    },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
}

const expectedPreviewSchema = [
  { origin_name: "id", new_name: "id", description: "id", ziz_datatype: "INT64" },
  { origin_name: "name", new_name: "name", description: "name", ziz_datatype: "STRING" },
];

// Sets up the page with the real dataflow.html and real node detail, but replaces
// window.zizBridge with a recording stub -- the only doubled boundary -- then mounts
// the given node via the real renderNodeDetail so the real assistant modal controller
// (ui.node.shared.js openConfiguredDetailModal) and real ui.node.detail.js "プレビュー
// 表示" action run unmodified.
async function gotoAndMount(page, node, hiddenBindings) {
  await page.goto("/gui/dataflow.html");
  await page.evaluate(async ({ nodeArg, hiddenBindingsArg }) => {
    // Preloads the legacy allowVars variable-suggest module up front. Otherwise the
    // legacy renderer's allowVars field (e.g. ExcelConnector.read_excel's sheet_name,
    // which stays legacy-rendered here) lazily fetches it and fires an unrelated,
    // timing-dependent onStateChanged({history:false}) once loaded -- unrelated to the
    // assistant modal under test, but indistinguishable from a real commit by this
    // file's plain commit counter. See node-form-host-adapter.spec.js for precedent.
    if (window.zizShell && typeof window.zizShell.loadScriptOnce === "function") {
      await window.zizShell.loadScriptOnce("./js/ui.suggest.js");
    }
    const calls = [];
    window.__bridgeCalls = calls;
    window.__bridgeResults = {};
    const bridgeApi = {
      available() { return true; },
      status() { return { state: "ready", ready: true }; },
      unavailableMessage() { return ""; },
      call(type, payload = {}) {
        calls.push({ type, payload });
        const resolver = window.__bridgeResults[type];
        if (typeof resolver === "function") return resolver(payload);
        return Promise.resolve({});
      },
    };
    window.zizBridge = bridgeApi;
    window.zizPackages = window.zizPackages || {};
    window.zizPackages.core = window.zizPackages.core || {};
    window.zizPackages.core.bridge = bridgeApi;

    const state = {
      nodes: [nodeArg],
      selectedNodeId: nodeArg.id,
      selectedNodeIds: [nodeArg.id],
      startParameters: [],
      hiddenBindings: hiddenBindingsArg,
      appMode: "dataflow",
      fileName: "",
      flowName: "test",
      nextStepSeq: 2,
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.__commitCount = 0;

    function render() {
      window.zizPackages.ui.nodeDetail.renderNodeDetail({
        state,
        config: window.CONFIG,
        root: host,
        onStateChanged: () => {
          window.__commitCount += 1;
          render();
        },
      });
    }
    render();
    window.__host = host;
    window.__state = state;
    window.__render = render;
  }, { nodeArg: node, hiddenBindingsArg: hiddenBindings });
}

// Preloads the real modal package/CSV/Excel assistant scripts up front (idempotent with
// the production ensureModalLibrariesLoaded() call the "プレビュー表示" button triggers),
// then wraps the real CsvModal.open/ExcelModal.open with a recording spy that forwards
// every call to the real implementation. This observes the exact arguments crossing the
// existing public open boundary without doubling the assistant itself.
async function preloadAndSpyOnAssistantOpen(page, modalGlobalName, recordingKey) {
  await page.evaluate(async ({ modalGlobalName, recordingKey }) => {
    await window.zizShell.loadScriptOnce("./js/packages/modal.package.js");
    await window.zizShell.loadScriptOnce("./modal/preview_schema.js");
    await window.zizShell.loadScriptOnce("./modal/excel_modal.js");
    await window.zizShell.loadScriptOnce("./modal/csv_modal.js");
    window[recordingKey] = [];
    const modalApi = window[modalGlobalName];
    const originalOpen = modalApi.open;
    modalApi.open = (opts) => {
      window[recordingKey].push({
        stepName: opts.stepName,
        fieldKey: opts.fieldKey,
        currentValue: opts.currentValue,
        hiddenBindingsIsRealStateObject: opts.hiddenBindings === window.__state.hiddenBindings,
        hiddenBindingsSnapshot: JSON.parse(JSON.stringify(opts.hiddenBindings || {})),
      });
      return originalOpen(opts);
    };
  }, { modalGlobalName, recordingKey });
}

async function waitFor(page, predicateSource, timeoutMs = 2000) {
  await page.waitForFunction(predicateSource, { timeout: timeoutMs });
}

async function clickAssistantAction(page) {
  await page.evaluate(() => {
    window.__host.querySelector(".node-inline-preview-btn").click();
  });
}

async function clickModalCancel(page, modalId) {
  await page.evaluate((id) => {
    const button = Array.from(document.querySelectorAll(`#${id} button[data-mdl-close]`))
      .find((el) => el.textContent.trim() === "キャンセル");
    button.click();
  }, modalId);
}


test("a real CSVConnector.read_csv node's assistant action opens the real CSV assistant with the real stepName/current file value/state.hiddenBindings, and confirming maps the real result through config resultFieldMap into node.form and commits state", async ({ page }) => {
  const hiddenBindings = { "{{hidden.legacy_note}}": { display_name: "old-note.csv", display_hint: "旧参照" } };
  await gotoAndMount(page, buildCsvReadNode(), hiddenBindings);
  await preloadAndSpyOnAssistantOpen(page, "CsvModal", "__csvOpenCalls");
  await page.evaluate(() => {
    window.__bridgeResults["preview.readCsv"] = () => Promise.resolve({
      file_name: "input.csv",
      ref: "C:/data/input.csv",
      display_name: "input.csv",
      display_hint: "既存ファイル",
      columns: ["A", "B"],
      rows2d: [["id", "name"], ["1", "Alice"]],
      schema_rows2d: [["id", "name"], ["1", "Alice"]],
      base_row: 0,
      col_count: 2,
      encoding: "utf8",
      delimiter: ",",
    });
  });

  await clickAssistantAction(page);
  await waitFor(page, () => document.getElementById("csvModal").classList.contains("is-open"));

  const openCalls = await page.evaluate(() => window.__csvOpenCalls);
  expect(openCalls).toHaveLength(1);
  expect(openCalls[0].stepName).toBe("step1");
  expect(openCalls[0].fieldKey).toBe("file_path");
  expect(openCalls[0].currentValue).toBe("C:/old/old.csv");
  expect(openCalls[0].hiddenBindingsIsRealStateObject).toBe(true);
  expect(openCalls[0].hiddenBindingsSnapshot).toEqual(hiddenBindings);

  await waitFor(page, () => document.querySelector("#cEncoding").value === "utf8");

  await page.evaluate(() => document.querySelector("#cOk").click());
  await waitFor(page, () => window.__state.nodes[0].form.file_path === "C:/data/input.csv");

  const result = await page.evaluate(() => ({
    form: window.__state.nodes[0].form,
    hiddenBindings: window.__state.hiddenBindings,
    modalOpen: document.getElementById("csvModal").classList.contains("is-open"),
    inputValue: window.__host.querySelector('[data-field-key="file_path"] input').value,
    commitCount: window.__commitCount,
  }));

  expect(result.form.file_path).toBe("C:/data/input.csv");
  expect(result.form.encoding).toBe("utf8");
  expect(result.form.delimiter).toBe(",");
  expect(result.form.header_row).toBe(1);
  expect(result.form.data_start_row).toBe(2);
  expect(JSON.parse(result.form.schema)).toEqual(expectedPreviewSchema);
  // Fields absent from CSVConnector.read_csv's resultFieldMap stay untouched.
  expect(result.form.chunk_size).toBe(12345);
  expect(result.form.date_cleansing).toBe(false);
  expect(result.hiddenBindings["{{hidden.legacy_note}}"]).toEqual({ display_name: "old-note.csv", display_hint: "旧参照" });
  expect(result.hiddenBindings["C:/data/input.csv"]).toEqual({ display_name: "input.csv", display_hint: "既存ファイル" });
  expect(result.modalOpen).toBe(false);
  expect(result.inputValue).toBe("C:/data/input.csv");
  expect(result.commitCount).toBe(1);
});


test("cancelling the real CSV assistant leaves the CSVConnector.read_csv node.form unchanged and does not commit state", async ({ page }) => {
  const originalForm = buildCsvReadNode().form;
  await gotoAndMount(page, buildCsvReadNode(), {});
  await preloadAndSpyOnAssistantOpen(page, "CsvModal", "__csvOpenCalls");
  await page.evaluate(() => {
    window.__bridgeResults["preview.readCsv"] = () => Promise.resolve({
      file_name: "input.csv",
      ref: "C:/data/input.csv",
      columns: ["A", "B"],
      rows2d: [["id", "name"], ["1", "Alice"]],
      schema_rows2d: [["id", "name"], ["1", "Alice"]],
      base_row: 0,
      col_count: 2,
      encoding: "utf8",
      delimiter: ",",
    });
  });

  await clickAssistantAction(page);
  await waitFor(page, () => document.getElementById("csvModal").classList.contains("is-open"));
  await waitFor(page, () => document.querySelector("#cEncoding").value === "utf8");

  await clickModalCancel(page, "csvModal");
  await waitFor(page, () => !document.getElementById("csvModal").classList.contains("is-open"));

  const result = await page.evaluate(() => ({
    form: window.__state.nodes[0].form,
    commitCount: window.__commitCount,
  }));

  expect(result.form).toEqual(originalForm);
  expect(result.commitCount).toBe(0);
});


test("a real ExcelConnector.read_excel node's assistant action opens the real Excel assistant with the real stepName/current file value/state.hiddenBindings, and confirming maps the real result through config resultFieldMap into node.form and commits state", async ({ page }) => {
  const hiddenBindings = { "{{hidden.legacy_note}}": { display_name: "old-note.xlsx", display_hint: "旧参照" } };
  await gotoAndMount(page, buildExcelReadNode(), hiddenBindings);
  await preloadAndSpyOnAssistantOpen(page, "ExcelModal", "__excelOpenCalls");
  await page.evaluate(() => {
    window.__bridgeResults["preview.readExcel"] = () => Promise.resolve({
      file_name: "input.xlsx",
      ref: "C:/data/input.xlsx",
      display_name: "input.xlsx",
      display_hint: "既存ファイル",
      sheet_names: ["Sheet1", "Sheet2"],
      sheet_name: "Sheet1",
      columns: ["A", "B"],
      rows2d: [["id", "name"], ["1", "Alice"]],
      base_row: 0,
      col_count: 2,
    });
  });

  await clickAssistantAction(page);
  await waitFor(page, () => document.getElementById("excelModal").classList.contains("is-open"));

  const openCalls = await page.evaluate(() => window.__excelOpenCalls);
  expect(openCalls).toHaveLength(1);
  expect(openCalls[0].stepName).toBe("step1");
  expect(openCalls[0].fieldKey).toBe("file_path");
  expect(openCalls[0].currentValue).toBe("C:/old/old.xlsx");
  expect(openCalls[0].hiddenBindingsIsRealStateObject).toBe(true);
  expect(openCalls[0].hiddenBindingsSnapshot).toEqual(hiddenBindings);

  await waitFor(page, () => document.querySelector("#xSheet").value === "Sheet1");

  await page.evaluate(() => document.querySelector("#xOk").click());
  await waitFor(page, () => window.__state.nodes[0].form.file_path === "C:/data/input.xlsx");

  const result = await page.evaluate(() => ({
    form: window.__state.nodes[0].form,
    hiddenBindings: window.__state.hiddenBindings,
    modalOpen: document.getElementById("excelModal").classList.contains("is-open"),
    inputValue: window.__host.querySelector('[data-field-key="file_path"] input').value,
    commitCount: window.__commitCount,
  }));

  expect(result.form.file_path).toBe("C:/data/input.xlsx");
  expect(result.form.sheet_name).toBe("Sheet1");
  expect(result.form.header_row).toBe(1);
  expect(result.form.data_start_row).toBe(2);
  expect(JSON.parse(result.form.schema)).toEqual(expectedPreviewSchema);
  // Fields absent from ExcelConnector.read_excel's resultFieldMap stay untouched.
  expect(result.form.chunk_size).toBe(12345);
  expect(result.form.date_cleansing).toBe(false);
  expect(result.hiddenBindings["{{hidden.legacy_note}}"]).toEqual({ display_name: "old-note.xlsx", display_hint: "旧参照" });
  expect(result.hiddenBindings["C:/data/input.xlsx"]).toEqual({ display_name: "input.xlsx", display_hint: "既存ファイル" });
  expect(result.modalOpen).toBe(false);
  expect(result.inputValue).toBe("C:/data/input.xlsx");
  expect(result.commitCount).toBe(1);
});


test("cancelling the real Excel assistant leaves the ExcelConnector.read_excel node.form unchanged and does not commit state", async ({ page }) => {
  const originalForm = buildExcelReadNode().form;
  await gotoAndMount(page, buildExcelReadNode(), {});
  await preloadAndSpyOnAssistantOpen(page, "ExcelModal", "__excelOpenCalls");
  await page.evaluate(() => {
    window.__bridgeResults["preview.readExcel"] = () => Promise.resolve({
      file_name: "input.xlsx",
      ref: "C:/data/input.xlsx",
      sheet_names: ["Sheet1"],
      sheet_name: "Sheet1",
      columns: ["A", "B"],
      rows2d: [["id", "name"], ["1", "Alice"]],
      base_row: 0,
      col_count: 2,
    });
  });

  await clickAssistantAction(page);
  await waitFor(page, () => document.getElementById("excelModal").classList.contains("is-open"));
  await waitFor(page, () => document.querySelector("#xSheet").value === "Sheet1");

  await clickModalCancel(page, "excelModal");
  await waitFor(page, () => !document.getElementById("excelModal").classList.contains("is-open"));

  const result = await page.evaluate(() => ({
    form: window.__state.nodes[0].form,
    commitCount: window.__commitCount,
  }));

  expect(result.form).toEqual(originalForm);
  expect(result.commitCount).toBe(0);
});
