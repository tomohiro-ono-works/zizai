const { test, expect } = require("@playwright/test");


// WP-6C2B2: proves, with the real renderNodeDetail and the real ui.fields.renderField
// (never mocked -- only observed), which real config.js field definitions reach the
// Application legacy renderer versus the vendored zizai-form NodeForm. A transparent
// recorder replaces window.uiFields.renderField with a wrapper that pushes a call record
// and then forwards the call unchanged to the original function, so every assertion below
// is about real, unmodified rendering behavior. window.zizPackages.ui.fields.renderField
// is a live getter over the same window.uiFields object (js/packages/ui.package.js), so
// patching window.uiFields.renderField is observed by every real caller, including
// js/ui.node.shared.js renderFieldSafe.


function installRenderFieldRecorder(page) {
  return page.evaluate(() => {
    const calls = [];
    const original = window.uiFields.renderField;
    window.uiFields.renderField = function (args) {
      calls.push(String(args?.field?.key || ""));
      return original.apply(this, arguments);
    };
    window.__renderFieldCalls = calls;
  });
}

async function mountRealAction(page, { node, priorNodes = [] }) {
  return page.evaluate(({ nodeArg, priorNodesArg }) => {
    const nodes = [...priorNodesArg, nodeArg];
    const state = {
      nodes,
      selectedNodeId: nodeArg.id,
      selectedNodeIds: [nodeArg.id],
      startParameters: [],
      hiddenBindings: {},
      appMode: "dataflow",
      fileName: "",
      flowName: "test",
      nextStepSeq: nodes.length + 1,
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.__renderState = state;
    window.__renderHost = host;
    function render() {
      window.zizPackages.ui.nodeDetail.renderNodeDetail({
        state,
        config: window.CONFIG,
        root: host,
        onStateChanged: render,
      });
    }
    render();
    return {
      nodeFormKeys: Array.from(host.querySelectorAll(".node-form-host .node-form__field[data-field-key]")).map(
        (row) => row.getAttribute("data-field-key")
      ),
      legacyKeys: Array.from(host.querySelectorAll(".node-body > .row[data-field-key]")).map((row) =>
        row.getAttribute("data-field-key")
      ),
      renderFieldCalls: (window.__renderFieldCalls || []).slice(),
    };
  }, { nodeArg: node, priorNodesArg: priorNodes });
}


test("real SeleniumConnector.dom_action: generic combo/checkbox/number fields mount into NodeForm without ever calling the real legacy renderField, while source_step_id and allowVars fields call it", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await installRenderFieldRecorder(page);

  const node = {
    id: "n1",
    stepName: "step1",
    connector: "SeleniumConnector",
    action: "dom_action",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { operation: "click", selector_type: "css", selector: "#msg", timeout_ms: 5000 },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
  const result = await mountRealAction(page, { node });

  // Real schema order for SeleniumConnector.dom_action (apps/gui/config/config.js):
  // source_step_id(legacy,allowVars) operation(NodeForm,combo) selector_type(NodeForm,combo)
  // selector(legacy,allowVars) value(legacy,allowVars) value_ref(legacy,allowVars)
  // clear(NodeForm,checkbox) label(legacy,allowVars) index(NodeForm,number)
  // key(legacy,allowVars) to/direction/amount/timeout_ms(NodeForm).
  expect(result.nodeFormKeys).toEqual(["operation", "selector_type", "clear", "index", "to", "direction", "amount", "timeout_ms"]);
  expect(result.legacyKeys).toEqual(["source_step_id", "selector", "value", "value_ref", "label", "key"]);

  result.legacyKeys.forEach((key) => {
    expect(result.renderFieldCalls.filter((call) => call === key).length).toBe(1);
  });
  result.nodeFormKeys.forEach((key) => {
    expect(result.renderFieldCalls).not.toContain(key);
  });
});


test("real BQConnector.execute_sql: google-auth-login and codeLanguage stay on the legacy renderer while schema is owned by DataViewer", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await installRenderFieldRecorder(page);

  const node = {
    id: "n1",
    stepName: "step1",
    connector: "BQConnector",
    action: "execute_sql",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { project_id: "defult_project1", sql: "SELECT 1", schema: "" },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
  const result = await mountRealAction(page, { node });

  expect(result.legacyKeys).toEqual(["google_auth", "sql"]);
  expect(result.renderFieldCalls.filter((call) => call === "google_auth").length).toBe(1);
  expect(result.renderFieldCalls.filter((call) => call === "sql").length).toBe(1);
  // The schema field is owned by DataViewer and must not return to the legacy renderer.
  expect(result.legacyKeys).not.toContain("schema");
  expect(result.renderFieldCalls).not.toContain("schema");
  expect(result.nodeFormKeys).toEqual(["project_id"]);
  expect(result.renderFieldCalls).not.toContain("project_id");
});


test("real BQConnector.execute_sql: opening the DataViewer tab merges result.getSchema columns into the schema field", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await page.evaluate(() => {
    const bridgeApi = {
      available() { return true; },
      status() { return { state: "ready", ready: true }; },
      unavailableMessage() { return ""; },
      call(type) {
        if (type === "result.getSchema") {
          return Promise.resolve({ columns: [{ origin_name: "amount", new_name: "amount", ziz_datatype: "FLOAT64" }] });
        }
        return Promise.resolve({});
      },
    };
    window.zizBridge = bridgeApi;
    window.zizPackages = window.zizPackages || {};
    window.zizPackages.core = window.zizPackages.core || {};
    window.zizPackages.core.bridge = bridgeApi;
  });

  const node = {
    id: "n1",
    stepName: "step1",
    connector: "BQConnector",
    action: "execute_sql",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { project_id: "defult_project1", sql: "SELECT 1", schema: "" },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
  await mountRealAction(page, { node });
  await page.getByRole("tab", { name: "データ" }).click();

  // DataViewer owns schema editing and persists only real schema columns. Its visual
  // blank row is not Application schema data.
  await expect.poll(async () => {
    return page.evaluate(() => JSON.parse(window.__renderState.nodes[0].form.schema || "[]"));
  }).toEqual([
    { origin_name: "amount", new_name: "amount", ziz_datatype: "FLOAT64" },
  ]);
});


test("real BQConnector.load_data: input_data stays legacy, schema_add_description stays in DataViewer, and schema autoload copies the upstream schema", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await installRenderFieldRecorder(page);

  const priorNodes = [{
    id: "n0",
    stepName: "step1",
    connector: "CSVConnector",
    action: "read_csv",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { schema: JSON.stringify([{ origin_name: "col_a", new_name: "col_a", ziz_datatype: "STRING" }]) },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  }];
  const node = {
    id: "n1",
    stepName: "step2",
    connector: "BQConnector",
    action: "load_data",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { project_id: "defult_project1", dataset_id: "defult_dataset1", table_id: "t", write_disposition: "create_or_replace" },
    parentId: "n0",
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
  const result = await mountRealAction(page, { node, priorNodes });

  // schema_add_description is owned by DataViewer and does not use the legacy renderer.
  expect(result.legacyKeys).toEqual(["google_auth", "table_id", "input_data"]);
  expect(result.nodeFormKeys).toEqual(["project_id", "dataset_id", "write_disposition"]);
  ["google_auth", "table_id", "input_data"].forEach((key) => {
    expect(result.renderFieldCalls.filter((call) => call === key).length).toBe(1);
  });
  expect(result.renderFieldCalls).not.toContain("schema_add_description");
  expect(result.renderFieldCalls).not.toContain("project_id");
  expect(result.renderFieldCalls).not.toContain("dataset_id");
  expect(result.renderFieldCalls).not.toContain("write_disposition");

  // Application-only dynamic schema behavior: selecting the upstream step through the
  // legacy input_data <select> triggers applySchemaAutoloadFromInputData (js/ui.fields.js),
  // which is only reachable because input_data always stays on the legacy route.
  const schemaAfterSelect = await page.evaluate(async () => {
    const host = window.__renderHost;
    const select = host.querySelector('[data-field-key="input_data"] select');
    select.value = "step1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    return window.__renderState.nodes[1].form.schema_add_description;
  });
  expect(JSON.parse(schemaAfterSelect)).toEqual([{ origin_name: "col_a", new_name: "col_a", ziz_datatype: "STRING" }]);
});


test("an unrecognized field kind stays on the real legacy renderField and renders the plain-text fallback control", async ({ page }) => {
  // Uses a synthetic connector/action grafted onto a cloned real CONFIG (same technique as
  // the WP-6C2A routing fixture) because no real config.js schema currently defines a field
  // kind outside js/node-form.adapter.js GENERIC_KINDS -- this keeps the fallback branch
  // covered without inventing a fictitious field for every other case in this file.
  await page.goto("/gui/dataflow.html");
  await installRenderFieldRecorder(page);

  const result = await page.evaluate(() => {
    const config = typeof structuredClone === "function"
      ? structuredClone(window.CONFIG)
      : JSON.parse(JSON.stringify(window.CONFIG));
    config.connectors = [...config.connectors, { id: "RoutingFixtureConnector", label: "Routing Fixture" }];
    config.actions = {
      ...config.actions,
      RoutingFixtureConnector: [{ id: "routing_fixture_action", label: "Routing Fixture Action", rpaType: "Transform" }],
    };
    config.forms = {
      ...config.forms,
      "RoutingFixtureConnector.routing_fixture_action": [
        { key: "custom_widget", label: "独自ウィジェット", kind: "totally-custom-kind" },
      ],
    };
    const node = {
      id: "n1",
      stepName: "step1",
      connector: "RoutingFixtureConnector",
      action: "routing_fixture_action",
      description: "",
      descriptionAuto: true,
      nodeType: "task",
      form: {},
      parentId: null,
      mergeParentIds: [],
      parallelOf: null,
      parallelOrder: 1,
    };
    const state = {
      nodes: [node],
      selectedNodeId: "n1",
      selectedNodeIds: ["n1"],
      startParameters: [],
      hiddenBindings: {},
      appMode: "dataflow",
      fileName: "",
      flowName: "test",
      nextStepSeq: 2,
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    function render() {
      window.zizPackages.ui.nodeDetail.renderNodeDetail({ state, config, root: host, onStateChanged: render });
    }
    render();
    const legacyRow = host.querySelector('.node-body > .row[data-field-key="custom_widget"]');
    return {
      legacyRowExists: !!legacyRow,
      nodeFormRowExists: !!host.querySelector('.node-form-host [data-field-key="custom_widget"]'),
      isPlainTextInput: legacyRow ? !!legacyRow.querySelector('input[type="text"]') : false,
      renderFieldCalls: window.__renderFieldCalls.slice(),
    };
  });

  expect(result.legacyRowExists).toBe(true);
  expect(result.nodeFormRowExists).toBe(false);
  expect(result.isPlainTextInput).toBe(true);
  expect(result.renderFieldCalls).toContain("custom_widget");
});


test("real WindowsConnector.define_values mounts its define-values-editor field entirely through NodeForm (never the real legacy renderField), while the reference-warning check for an invalid variable name still runs", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await installRenderFieldRecorder(page);

  const node = {
    id: "n1",
    stepName: "step1",
    connector: "WindowsConnector",
    action: "define_values",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { define_values: JSON.stringify([{ name: "invalid name", value: "1" }]) },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
  const result = await mountRealAction(page, { node });

  expect(result.nodeFormKeys).toEqual(["define_values"]);
  expect(result.legacyKeys).toEqual([]);
  expect(result.renderFieldCalls).not.toContain("define_values");

  // getFieldReferenceWarningsSafe (js/ui.node.shared.js) runs over the full schema
  // regardless of NodeForm/legacy routing, so js/ui.fields.js's define-values-editor
  // branch of getFieldReferenceWarnings (a function distinct from renderField) stays
  // required even though the render() branch for this kind is unreached by real config.
  const warningBannerText = await page.evaluate(() => {
    const host = window.__renderHost;
    const banner = host.querySelector(".node-warning-banner");
    return banner ? banner.textContent : "";
  });
  expect(warningBannerText).toContain("invalid name");
});


test("real DataintegrationConnector.filter_rows mounts its filter builder through NodeForm, keeps input_data legacy, and keeps schema in DataViewer", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await installRenderFieldRecorder(page);

  const node = {
    id: "n1",
    stepName: "step1",
    connector: "DataintegrationConnector",
    action: "filter_rows",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { input_data: "", conditions: "", schema: "" },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
  const result = await mountRealAction(page, { node });

  expect(result.nodeFormKeys).toEqual(["conditions"]);
  expect(result.legacyKeys).toEqual(["input_data"]);
  expect(result.renderFieldCalls).not.toContain("conditions");
  expect(result.renderFieldCalls.filter((call) => call === "input_data").length).toBe(1);
  // schema is owned by DataViewer and must not return to the legacy renderer.
  expect(result.renderFieldCalls).not.toContain("schema");
});
