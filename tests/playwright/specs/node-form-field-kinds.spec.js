const { test, expect } = require("@playwright/test");


// WP-6C2A: a focused field-schema fixture suite that locks the routing and observable
// behavior boundary between the vendored zizai-form NodeForm (mounted through the real
// Application adapter in js/node-form.adapter.js) and the Application legacy renderer
// (js/ui.node.detail.js + js/ui.fields.js). Every field definition below is a hand-written
// literal -- not read from config.js -- so this suite keeps catching a boundary regression
// even if production connector schemas change. No renderer is mocked: NodeForm, the
// adapter, and (for the routing fixture) the real node detail run unmodified.


// ---------------------------------------------------------------------------
// Group A: literal field-kind fixture, mounted directly through the real adapter.
// ---------------------------------------------------------------------------

function buildKindCoverageFields() {
  return [
    { key: "kind_text", label: "テキスト種別", kind: "text" },
    { key: "kind_number", label: "数値種別", kind: "number", default: 3 },
    { key: "kind_select", label: "セレクト種別", kind: "select", options: ["one", "two", "three"], default: "two" },
    { key: "kind_combo", label: "コンボ種別", kind: "combo", options: ["red", "green", "blue"], default: "green" },
    { key: "kind_checkbox", label: "チェックボックス種別", kind: "checkbox", default: true },
    { key: "kind_checklist", label: "チェックリスト種別", kind: "checklist", options: ["a", "b", "c"], default: ["a", "c"] },
    { key: "kind_radio", label: "ラジオ種別", kind: "radio", options: ["low", "high"], default: "high" },
    { key: "kind_textarea", label: "テキストエリア種別", kind: "textarea", default: "初期テキスト" },
    { key: "kind_define_values", label: "変数定義種別", kind: "define-values-editor" },
    { key: "kind_filter_builder", label: "フィルタ種別", kind: "filter-builder" },
    { key: "kind_file", label: "ファイル種別", kind: "file" },
    { key: "kind_dir", label: "フォルダ種別", kind: "dir" },
    { key: "kind_coordinate", label: "座標種別", kind: "mouse-coordinate-picker", x_key: "coord_x", y_key: "coord_y", buttonLabel: "座標を選ぶ" },
  ];
}

async function mountKindCoverageFixture(page) {
  return page.evaluate((fieldsArg) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = { id: "fixture", connector: "FixtureConnector", action: "kind_coverage", form: {} };
    const instance = window.uiNodeFormAdapter.mountNodeForm({
      root: host,
      node,
      fields: fieldsArg,
      onCommit: () => {},
    });
    window.__kindHost = host;
    window.__kindNode = node;
    window.__kindInstance = instance;
    return { mounted: !!instance };
  }, buildKindCoverageFields());
}


test("field-schema fixture: every NodeForm-owned kind renders its control and reports its initial/default value, excluding the display-only coordinate picker from getParams", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  const mountResult = await mountKindCoverageFixture(page);
  expect(mountResult.mounted).toBe(true);

  const result = await page.evaluate(() => {
    const host = window.__kindHost;
    const field = (key) => host.querySelector(`[data-field-key="${key}"]`);
    return {
      text: field("kind_text").querySelector("input.node-form__input").value,
      number: field("kind_number").querySelector("input.node-form__input").value,
      select: field("kind_select").querySelector("select.node-form__select").value,
      combo: field("kind_combo").querySelector(".node-form__combo-input").value,
      checkbox: field("kind_checkbox").querySelector("input.node-form__checkbox").checked,
      checklistChecked: Array.from(field("kind_checklist").querySelectorAll(".node-form__checklist-input"))
        .filter((input) => input.checked).map((input) => input.value),
      radioChecked: field("kind_radio").querySelector("input:checked").value,
      textarea: field("kind_textarea").querySelector("textarea.node-form__textarea").value,
      defineValuesRowCount: field("kind_define_values").querySelectorAll(".node-form__define-values-row").length,
      filterBuilderRowCount: field("kind_filter_builder").querySelectorAll(".node-form__filter-row").length,
      file: field("kind_file").querySelector("input.node-form__input").value,
      dir: field("kind_dir").querySelector("input.node-form__input").value,
      coordinateButtonText: field("kind_coordinate").querySelector(".node-form__coordinate-button").textContent,
      getParams: window.__kindInstance.getParams(),
    };
  });

  expect(result.text).toBe("");
  expect(result.number).toBe("3");
  expect(result.select).toBe("two");
  expect(result.combo).toBe("green");
  expect(result.checkbox).toBe(true);
  expect(result.checklistChecked).toEqual(["a", "c"]);
  expect(result.radioChecked).toBe("high");
  expect(result.textarea).toBe("初期テキスト");
  expect(result.defineValuesRowCount).toBe(0);
  expect(result.filterBuilderRowCount).toBe(1);
  expect(result.file).toBe("");
  expect(result.dir).toBe("");
  expect(result.coordinateButtonText).toBe("座標を選ぶ");

  expect(result.getParams).toEqual({
    kind_text: "",
    kind_number: 3,
    kind_select: "two",
    kind_combo: "green",
    kind_checkbox: true,
    kind_checklist: ["a", "c"],
    kind_radio: "high",
    kind_textarea: "初期テキスト",
    kind_define_values: "",
    kind_filter_builder: "",
    kind_file: "",
    kind_dir: "",
  });
  expect(Object.prototype.hasOwnProperty.call(result.getParams, "kind_coordinate")).toBe(false);
});


test("field-schema fixture: an edit to each editable kind is reflected in node.form immediately", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  await mountKindCoverageFixture(page);

  const formAfterEdits = await page.evaluate(() => {
    const host = window.__kindHost;
    const dispatch = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    const field = (key) => host.querySelector(`[data-field-key="${key}"]`);

    const textInput = field("kind_text").querySelector("input.node-form__input");
    textInput.value = "編集済み";
    dispatch(textInput, "input");

    const numberInput = field("kind_number").querySelector("input.node-form__input");
    numberInput.value = "9";
    dispatch(numberInput, "input");

    const selectEl = field("kind_select").querySelector("select.node-form__select");
    selectEl.value = "three";
    dispatch(selectEl, "change");

    const comboButton = field("kind_combo").querySelector(".node-form__combo-button");
    comboButton.click();
    const blueOption = Array.from(field("kind_combo").querySelectorAll(".node-form__combo-option"))
      .find((button) => button.textContent.trim() === "blue");
    blueOption.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

    field("kind_checkbox").querySelector("input.node-form__checkbox").click();

    const checklistInputs = field("kind_checklist").querySelectorAll(".node-form__checklist-input");
    Array.from(checklistInputs).find((input) => input.value === "b").click();

    field("kind_radio").querySelector('input[value="low"]').click();

    const textareaEl = field("kind_textarea").querySelector("textarea.node-form__textarea");
    textareaEl.value = "新しいテキスト";
    dispatch(textareaEl, "input");

    field("kind_define_values").querySelector(".node-form__define-values-add").click();
    const nameInput = field("kind_define_values").querySelector(".node-form__define-values-name");
    const valueInput = field("kind_define_values").querySelector(".node-form__define-values-value");
    nameInput.value = "foo";
    dispatch(nameInput, "input");
    valueInput.value = "bar";
    dispatch(valueInput, "input");

    const filterFieldInput = field("kind_filter_builder").querySelector(".node-form__filter-field");
    filterFieldInput.value = "col1";
    dispatch(filterFieldInput, "input");

    const fileInput = field("kind_file").querySelector("input.node-form__input");
    fileInput.value = "C:/data/file.csv";
    dispatch(fileInput, "input");

    const dirInput = field("kind_dir").querySelector("input.node-form__input");
    dirInput.value = "C:/data";
    dispatch(dirInput, "input");

    return JSON.parse(JSON.stringify(window.__kindNode.form));
  });

  expect(formAfterEdits.kind_text).toBe("編集済み");
  expect(formAfterEdits.kind_number).toBe(9);
  expect(formAfterEdits.kind_select).toBe("three");
  expect(formAfterEdits.kind_combo).toBe("blue");
  expect(formAfterEdits.kind_checkbox).toBe(false);
  expect(formAfterEdits.kind_checklist).toEqual(["a", "b", "c"]);
  expect(formAfterEdits.kind_radio).toBe("low");
  expect(formAfterEdits.kind_textarea).toBe("新しいテキスト");
  expect(JSON.parse(formAfterEdits.kind_define_values)).toEqual([{ name: "foo", value: "bar" }]);
  expect(JSON.parse(formAfterEdits.kind_filter_builder)).toEqual([
    { field: "col1", operator: "exact", apply: "include", value: "", value_to: "" },
  ]);
  expect(formAfterEdits.kind_file).toBe("C:/data/file.csv");
  expect(formAfterEdits.kind_dir).toBe("C:/data");
  expect(Object.prototype.hasOwnProperty.call(formAfterEdits, "kind_coordinate")).toBe(false);
});


test("field-schema fixture: required, min/max, and pattern validation report field-specific errors and clear once satisfied", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  const fields = [
    { key: "required_text", label: "必須テキスト", kind: "text", required: true },
    { key: "ranged_number", label: "範囲数値", kind: "number", min: 5, max: 10 },
    { key: "patterned_text", label: "パターンテキスト", kind: "text", pattern: "^[A-Z]{3}$" },
    { key: "plain_text", label: "任意テキスト", kind: "text" },
  ];

  const result = await page.evaluate((fieldsArg) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = { id: "fixture", connector: "FixtureConnector", action: "validation", form: {} };
    const instance = window.uiNodeFormAdapter.mountNodeForm({ root: host, node, fields: fieldsArg, onCommit: () => {} });

    const dispatch = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
    const field = (key) => host.querySelector(`[data-field-key="${key}"]`);
    const setText = (key, value) => {
      const input = field(key).querySelector("input.node-form__input, textarea");
      input.value = value;
      dispatch(input, "input");
    };

    const initial = instance.validate();

    setText("required_text", "ok");
    setText("ranged_number", "3");
    setText("patterned_text", "abc");
    const belowMinAndBadPattern = instance.validate();
    const belowMinErrorText = field("ranged_number").querySelector(".node-form__error").textContent;

    setText("ranged_number", "15");
    const aboveMax = instance.validate();
    const aboveMaxErrorText = field("ranged_number").querySelector(".node-form__error").textContent;

    setText("ranged_number", "8");
    setText("patterned_text", "XYZ");
    const clean = instance.validate();

    return { initial, belowMinAndBadPattern, belowMinErrorText, aboveMax, aboveMaxErrorText, clean };
  }, fields);

  expect(result.initial).toEqual({ valid: false, errors: { required_text: "必須項目です" } });
  expect(result.belowMinAndBadPattern).toEqual({
    valid: false,
    errors: { ranged_number: "5以上で入力してください", patterned_text: "入力形式が正しくありません" },
  });
  expect(result.belowMinErrorText).toBe("5以上で入力してください");
  expect(result.aboveMax).toEqual({
    valid: false,
    errors: { ranged_number: "10以下で入力してください", patterned_text: "入力形式が正しくありません" },
  });
  expect(result.aboveMaxErrorText).toBe("10以下で入力してください");
  expect(result.clean).toEqual({ valid: true, errors: {} });
});


test("field-schema fixture: visible_if reactively hides a dependent field and validate() ignores hidden required fields", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  const fields = [
    { key: "trigger_select", label: "トリガー", kind: "select", options: ["show", "hide"], default: "show" },
    { key: "dependent_text", label: "依存テキスト", kind: "text", required: true, visible_if: { key: "trigger_select", equals: "show" } },
  ];

  const result = await page.evaluate((fieldsArg) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = { id: "fixture", connector: "FixtureConnector", action: "visible_if", form: {} };
    const instance = window.uiNodeFormAdapter.mountNodeForm({ root: host, node, fields: fieldsArg, onCommit: () => {} });
    const dependentRow = () => host.querySelector('[data-field-key="dependent_text"]');
    const selectEl = () => host.querySelector('[data-field-key="trigger_select"] select');

    const initiallyVisible = !dependentRow().hidden;
    const initialValidate = instance.validate();

    selectEl().value = "hide";
    selectEl().dispatchEvent(new Event("change", { bubbles: true }));
    const hiddenAfterSwitch = dependentRow().hidden;
    const validateWhileHidden = instance.validate();

    selectEl().value = "show";
    selectEl().dispatchEvent(new Event("change", { bubbles: true }));
    const visibleAfterSwitchBack = !dependentRow().hidden;
    const validateAfterSwitchBack = instance.validate();

    return { initiallyVisible, initialValidate, hiddenAfterSwitch, validateWhileHidden, visibleAfterSwitchBack, validateAfterSwitchBack };
  }, fields);

  expect(result.initiallyVisible).toBe(true);
  expect(result.initialValidate).toEqual({ valid: false, errors: { dependent_text: "必須項目です" } });
  expect(result.hiddenAfterSwitch).toBe(true);
  expect(result.validateWhileHidden).toEqual({ valid: true, errors: {} });
  expect(result.visibleAfterSwitchBack).toBe(true);
  expect(result.validateAfterSwitchBack).toEqual({ valid: false, errors: { dependent_text: "必須項目です" } });
});


test("field-schema fixture: exportKey reads the initial value from node.form[exportKey] and writes edits back under exportKey, not the field key", async ({ page }) => {
  await page.goto("/gui/dataflow.html");
  const fields = [
    { key: "internal_note", label: "内部メモ", kind: "text", exportKey: "note_output" },
  ];

  const result = await page.evaluate((fieldsArg) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = { id: "fixture", connector: "FixtureConnector", action: "export_key", form: { note_output: "既存の値" } };
    const instance = window.uiNodeFormAdapter.mountNodeForm({ root: host, node, fields: fieldsArg, onCommit: () => {} });
    const input = host.querySelector('[data-field-key="internal_note"] input.node-form__input');
    const initialInputValue = input.value;
    const initialParams = instance.getParams();

    input.value = "新しい値";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    return { initialInputValue, initialParams, formAfterEdit: JSON.parse(JSON.stringify(node.form)) };
  }, fields);

  expect(result.initialInputValue).toBe("既存の値");
  expect(result.initialParams).toEqual({ note_output: "既存の値" });
  expect(result.formAfterEdit).toEqual({ note_output: "新しい値" });
});


// ---------------------------------------------------------------------------
// Group B: routing fixture -- proves which fields stay on the Application
// legacy/special route instead of mounting into NodeForm.
// ---------------------------------------------------------------------------

test("routing fixture: isNodeFormSupportedField keeps allowVars, codeLanguage textarea, input_data/source_step_id keys, google-auth-login, and unknown kinds off the NodeForm route", async ({ page }) => {
  await page.goto("/gui/dataflow.html");

  const result = await page.evaluate(() => {
    const check = (field) => window.uiNodeFormAdapter.isNodeFormSupportedField(field);
    return {
      genericText: check({ key: "plain", kind: "text" }),
      plainTextarea: check({ key: "plain", kind: "textarea" }),
      allowVarsText: check({ key: "plain", kind: "text", allowVars: true }),
      codeLanguageTextarea: check({ key: "plain", kind: "textarea", codeLanguage: "sql" }),
      inputDataKey: check({ key: "input_data", kind: "text" }),
      sourceStepIdKey: check({ key: "source_step_id", kind: "text" }),
      googleAuthKind: check({ key: "plain", kind: "google-auth-login" }),
      unknownKind: check({ key: "plain", kind: "totally-custom-kind" }),
    };
  });

  expect(result).toEqual({
    genericText: true,
    plainTextarea: true,
    allowVarsText: false,
    codeLanguageTextarea: false,
    inputDataKey: false,
    sourceStepIdKey: false,
    googleAuthKind: false,
    unknownKind: false,
  });
});


test("routing fixture: the real node detail mounts only generic fields into NodeForm, keeps Application-special fields on the legacy route, and leaves schema rendering to DataViewer", async ({ page }) => {
  // Uses a synthetic connector/action (not any real config.js schema) so this boundary
  // stays literal and independent of production connector definitions.
  await page.goto("/gui/dataflow.html");

  const routingFields = [
    { key: "generic_text", label: "汎用テキスト", kind: "text" },
    { key: "var_text", label: "変数許可テキスト", kind: "text", allowVars: true },
    { key: "sql_code", label: "SQLコード", kind: "textarea", codeLanguage: "sql" },
    { key: "input_data", label: "入力データ", kind: "text" },
    { key: "source_step_id", label: "参照ステップ", kind: "text" },
    { key: "google_auth", label: "認証", kind: "google-auth-login" },
    { key: "custom_widget", label: "独自ウィジェット", kind: "totally-custom-kind" },
    { key: "schema_add_description", label: "スキーマ定義", kind: "textarea", allowVars: true, exportKey: "schema" },
  ];

  const result = await page.evaluate((fieldsArg) => {
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
      "RoutingFixtureConnector.routing_fixture_action": fieldsArg,
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
      window.zizPackages.ui.nodeDetail.renderNodeDetail({
        state,
        config,
        root: host,
        onStateChanged: render,
      });
    }
    render();

    const nodeFormKeys = Array.from(host.querySelectorAll(".node-form-host .node-form__field[data-field-key]"))
      .map((row) => row.getAttribute("data-field-key"));
    const legacyKeys = Array.from(host.querySelectorAll(".node-body > .row[data-field-key]"))
      .map((row) => row.getAttribute("data-field-key"));
    return {
      nodeFormKeys,
      legacyKeys,
      hasLegacySchemaEditor: !!host.querySelector(".node-data-schema-editor"),
      totalFieldCount: fieldsArg.length,
    };
  }, routingFields);

  expect(result.nodeFormKeys).toEqual(["generic_text"]);
  expect(result.legacyKeys).toEqual([
    "var_text",
    "sql_code",
    "input_data",
    "source_step_id",
    "google_auth",
    "custom_widget",
  ]);
  expect(result.hasLegacySchemaEditor).toBe(false);
  expect(result.nodeFormKeys.length + result.legacyKeys.length).toBe(result.totalFieldCount - 1);
});


// ---------------------------------------------------------------------------
// Group C: DataViewer integration fixture -- exercises the real Application
// node-detail route, Bridge DTOs, and vendored ReportViewer without mocks.
// ---------------------------------------------------------------------------

async function mountDataViewerFixture(page, options) {
  await page.goto("/gui/dataflow.html");
  await page.evaluate((optionsArg) => {
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const config = typeof structuredClone === "function"
      ? structuredClone(window.CONFIG)
      : JSON.parse(JSON.stringify(window.CONFIG));
    const fixtureNodes = optionsArg.nodes.map((item, index) => ({
      id: item.id || `viewer-node-${index + 1}`,
      stepName: item.stepName,
      connector: item.connector || "DataViewerFixtureConnector",
      action: item.action || (item.hasSchema ? "schema_action" : "preview_action"),
      description: "",
      descriptionAuto: true,
      nodeType: "task",
      form: item.form || {},
      parentId: null,
      mergeParentIds: [],
      parallelOf: null,
      parallelOrder: index + 1,
    }));
    config.connectors = [
      ...config.connectors,
      { id: "DataViewerFixtureConnector", label: "Data viewer fixture", category: "data" },
      { id: "PlainViewerFixtureConnector", label: "Plain viewer fixture", category: "utility" },
    ];
    config.actions = {
      ...config.actions,
      DataViewerFixtureConnector: [
        { id: "schema_action", label: "Schema action", rpaType: "Transform" },
        { id: "preview_action", label: "Preview action", rpaType: "Transform" },
      ],
      PlainViewerFixtureConnector: [
        { id: "plain_action", label: "Plain action", rpaType: "Transform" },
      ],
    };
    config.forms = { ...config.forms };
    fixtureNodes.forEach((node) => {
      config.forms[`${node.connector}.${node.action}`] = node.action === "schema_action"
        ? [{ key: "schema", label: "スキーマ", kind: "textarea", allowVars: true }]
        : [];
    });

    const fixture = {
      calls: [],
      changeCount: 0,
      pending: {},
      responses: optionsArg.responses,
      state: {
        nodes: fixtureNodes,
        selectedNodeId: optionsArg.selectedNodeId || fixtureNodes[0].id,
        selectedNodeIds: [optionsArg.selectedNodeId || fixtureNodes[0].id],
        startParameters: [],
        hiddenBindings: {},
        appMode: "dataflow",
        fileName: "",
        flowName: "data-viewer-fixture",
        nextStepSeq: fixtureNodes.length + 1,
      },
    };
    const responseFor = (stepId) => fixture.responses[stepId] || {
      schemaDto: { columns: [] },
      previewDto: { columns: [], rows: [], row_count: 0, truncated: false },
    };
    window.zizBridge = {
      available: () => true,
      call: (command, payload) => {
        const stepId = String(payload.step_id || "");
        const response = responseFor(stepId);
        fixture.calls.push({ command, stepId });
        const result = command === "result.getSchema" ? response.schemaDto : response.previewDto;
        if (response.defer) {
          return new Promise((resolve) => {
            fixture.pending[`${stepId}:${command}`] = () => resolve(clone(result));
          });
        }
        return Promise.resolve(clone(result));
      },
    };
    fixture.root = document.createElement("div");
    fixture.root.className = "data-viewer-test-root";
    document.body.appendChild(fixture.root);
    fixture.render = () => {
      window.zizPackages.ui.nodeDetail.renderNodeDetail({
        state: fixture.state,
        config,
        root: fixture.root,
        onStateChanged: () => {
          fixture.changeCount += 1;
          if (optionsArg.rerenderOnStateChanged) fixture.render();
        },
        tabKeys: ["data"],
        defaultTab: "data",
        forcedActiveTab: "data",
        hideTabs: true,
      });
    };
    fixture.selectNode = (nodeId) => {
      fixture.state.selectedNodeId = nodeId;
      fixture.state.selectedNodeIds = [nodeId];
      fixture.render();
    };
    fixture.resolve = (stepId) => {
      ["result.getSchema", "result.getPreview"].forEach((command) => {
        fixture.pending[`${stepId}:${command}`]?.();
      });
    };
    window.__dataViewerFixture = fixture;
    fixture.render();
  }, options);
}


async function mountBqAutoextractFixture(page, options) {
  await page.goto("/gui/dataflow.html");
  await page.evaluate((optionsArg) => {
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const config = typeof structuredClone === "function"
      ? structuredClone(window.CONFIG)
      : JSON.parse(JSON.stringify(window.CONFIG));
    const schemaField = config.forms["BQConnector.execute_sql"].find((field) => field.key === "schema");
    const node = {
      id: "bq-autoextract-node",
      stepName: "bq_autoextract_step",
      connector: "BQConnector",
      action: "execute_sql",
      description: "",
      descriptionAuto: true,
      nodeType: "task",
      form: {
        project_id: "fixture-project",
        sql: "SELECT 1",
        schema: JSON.stringify(optionsArg.localColumns, null, 2),
      },
      parentId: null,
      mergeParentIds: [],
      parallelOf: null,
      parallelOrder: 1,
    };
    const fixture = {
      changeCount: 0,
      root: document.getElementById("nodeDetailBottom"),
      schemaAutoextract: !!schemaField?.schema_autoextract,
      state: {
        nodes: [node],
        selectedNodeId: node.id,
        selectedNodeIds: [node.id],
        startParameters: [],
        hiddenBindings: {},
        appMode: "dataflow",
        fileName: "",
        flowName: "bq-autoextract-fixture",
        nextStepSeq: 2,
      },
    };
    document.body.classList.add("flow-layout-page");
    fixture.root.style.height = "640px";
    window.zizBridge = {
      available: () => true,
      call: (command) => Promise.resolve(clone(command === "result.getSchema" ? optionsArg.schemaDto : optionsArg.previewDto)),
    };
    fixture.render = () => {
      window.zizPackages.ui.nodeDetail.renderNodeDetail({
        state: fixture.state,
        config,
        root: fixture.root,
        onStateChanged: () => {
          fixture.changeCount += 1;
          if (optionsArg.rerenderOnStateChanged) fixture.render();
        },
        tabKeys: ["data"],
        defaultTab: "data",
        forcedActiveTab: "data",
        hideTabs: true,
      });
    };
    window.__bqAutoextractFixture = fixture;
    fixture.render();
  }, options);
}


test("DataViewer integration: schema nodes mount report/columns/json, render Bridge preview arrays, and commit lossless schema edits", async ({ page }) => {
  const initialColumns = [
    { origin_name: "active", new_name: "", description: "切替", ziz_datatype: "BOOL", custom_flag: false },
    { origin_name: "count", new_name: "item_count", description: "件数", ziz_datatype: "INT64", metadata: { source: "fixture" } },
    { origin_name: "payload", new_name: "", description: "バイナリ", ziz_datatype: "BYTES", nullable: true },
    { origin_name: "missing", new_name: "", description: "欠損", ziz_datatype: "STRING" },
  ];
  const validColumns = [
    { origin_name: "active", new_name: "display_active", description: "編集済み", ziz_datatype: "number", custom_flag: false },
    { origin_name: "count", new_name: "item_count", description: "件数", ziz_datatype: "INT64", metadata: { source: "fixture" } },
    { origin_name: "payload", new_name: "", description: "バイナリ", ziz_datatype: "ARRAY<STRING>", nullable: true },
    { origin_name: "missing", new_name: "", description: "欠損", ziz_datatype: "STRING" },
  ];
  await mountDataViewerFixture(page, {
    nodes: [{ id: "schema-node", stepName: "schema_step", hasSchema: true }],
    responses: {
      schema_step: {
        schemaDto: { columns: initialColumns },
        previewDto: {
          columns: ["active", "count", "payload", "missing"],
          rows: [[false, 0, "", null]],
          row_count: 1,
          truncated: false,
        },
      },
    },
  });

  await expect(page.locator(".rv")).toHaveCount(1);
  const initialView = await page.evaluate(() => {
    const root = window.__dataViewerFixture.root;
    return {
      tabIds: Array.from(root.querySelectorAll(".rv__tab")).map((tab) => tab.dataset.tab),
      activeTab: root.querySelector(".rv__tab.is-active")?.dataset.tab || "",
      actions: root.querySelector(".rv__actions")?.children.length || 0,
      hasExport: !!root.querySelector(".rv-export"),
      hasDistribution: !!root.querySelector('[data-tab="distribution"]'),
      paginationHidden: !!root.querySelector(".rv-pagination")?.hidden,
      rowCells: Array.from(root.querySelectorAll(".rv-grid__table tbody tr:first-child td")).map((cell) => cell.textContent),
      calls: window.__dataViewerFixture.calls.map((call) => call.command),
    };
  });
  expect(initialView.tabIds).toEqual(["report", "columns", "json"]);
  expect(initialView.activeTab).toBe("columns");
  expect(initialView.actions).toBe(0);
  expect(initialView.hasExport).toBe(false);
  expect(initialView.hasDistribution).toBe(false);
  expect(initialView.paginationHidden).toBe(true);
  expect(initialView.rowCells).toEqual(["1", "false", "0", "", ""]);
  expect(initialView.calls).toEqual(["result.getSchema", "result.getPreview"]);

  const nameInput = page.locator(".rv-columns__name-input").first();
  await nameInput.fill("display_active");
  await nameInput.evaluate((input) => input.blur());
  const descriptionInput = page.locator(".rv-columns__description-input").first();
  await descriptionInput.fill("編集済み");
  await descriptionInput.evaluate((input) => input.blur());
  await page.locator(".rv-columns__select").first().selectOption("number");
  const afterColumnEdits = await page.evaluate(() => JSON.parse(window.__dataViewerFixture.state.nodes[0].form.schema));
  expect(afterColumnEdits[0]).toEqual({
    origin_name: "active",
    new_name: "display_active",
    description: "編集済み",
    ziz_datatype: "number",
    custom_flag: false,
  });

  await page.locator('.rv__tab[data-tab="json"]').click();
  await page.locator(".rv-json__editor").fill(JSON.stringify({ columns: validColumns }, null, 2));
  await page.locator(".rv-json__actions .rv-button--primary").click();
  const validSchemaText = await page.evaluate(() => window.__dataViewerFixture.state.nodes[0].form.schema);
  expect(validSchemaText).toBe(JSON.stringify(validColumns, null, 2));
  expect(JSON.parse(validSchemaText)).toEqual(validColumns);

  const invalidResult = await page.evaluate(() => {
    const fixture = window.__dataViewerFixture;
    const before = fixture.state.nodes[0].form.schema;
    const editor = fixture.root.querySelector(".rv-json__editor");
    editor.value = "{ invalid json";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.root.querySelector(".rv-json__actions .rv-button--primary").click();
    return {
      value: editor.value,
      before,
      after: fixture.state.nodes[0].form.schema,
      error: fixture.root.querySelector(".rv-json__message")?.textContent || "",
    };
  });
  expect(invalidResult.value).toBe("{ invalid json");
  expect(invalidResult.after).toBe(invalidResult.before);
  expect(invalidResult.error).not.toBe("");
});


test("DataViewer integration: successful previews stay compact and host CSS cannot stretch filter checkboxes", async ({ page }) => {
  await mountDataViewerFixture(page, {
    nodes: [{ id: "preview-style-node", stepName: "preview_style_step", hasSchema: true }],
    responses: {
      preview_style_step: {
        schemaDto: {
          columns: [
            { origin_name: "category", new_name: "", description: "", ziz_datatype: "string" },
          ],
        },
        previewDto: {
          columns: ["category"],
          rows: [["alpha"], ["beta"]],
          row_count: 2,
          truncated: false,
        },
      },
    },
  });

  await expect(page.locator(".rv")).toHaveCount(1);
  await expect(page.locator(".data-viewer-test-root .node-data-status-slot")).toBeHidden();
  await page.locator('.rv__tab[data-tab="report"]').click();
  await page.locator(".rv-grid__filter-button").click();

  const checkboxMetrics = await page.locator('.rv-filter__choice input[type="checkbox"]').first().evaluate((input) => {
    const rect = input.getBoundingClientRect();
    const label = input.closest("label");
    const text = label?.querySelector("span");
    return {
      width: rect.width,
      height: rect.height,
      labelWidth: label?.getBoundingClientRect().width || 0,
      textWidth: text?.getBoundingClientRect().width || 0,
    };
  });
  expect(checkboxMetrics.width).toBeLessThanOrEqual(18);
  expect(checkboxMetrics.height).toBeLessThanOrEqual(18);
  expect(checkboxMetrics.textWidth).toBeGreaterThan(checkboxMetrics.width);
  expect(checkboxMetrics.labelWidth).toBeGreaterThan(checkboxMetrics.textWidth);
});


test("DataViewer integration: report and column-setting resize handles change only the dragged column", async ({ page }) => {
  await mountDataViewerFixture(page, {
    nodes: [{ id: "resize-node", stepName: "resize_step", hasSchema: true }],
    responses: {
      resize_step: {
        schemaDto: {
          columns: [
            { origin_name: "first", new_name: "", description: "", ziz_datatype: "string" },
            { origin_name: "second", new_name: "", description: "", ziz_datatype: "string" },
            { origin_name: "third", new_name: "", description: "", ziz_datatype: "string" },
          ],
        },
        previewDto: {
          columns: ["first", "second", "third"],
          rows: [["a", "b", "c"]],
          row_count: 1,
          truncated: false,
        },
      },
    },
  });

  const resizeLastColumn = async (tableSelector, headerSelector, deltaX) => {
    const before = await page.locator(headerSelector).evaluateAll((headers) => headers.map((header) => header.getBoundingClientRect().width));
    const tableBefore = await page.locator(tableSelector).evaluate((table) => table.getBoundingClientRect().width);
    const handle = page.locator(`${headerSelector} .rv-column-resizer`).last();
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2);
    await page.mouse.up();
    const after = await page.locator(headerSelector).evaluateAll((headers) => headers.map((header) => header.getBoundingClientRect().width));
    const tableAfter = await page.locator(tableSelector).evaluate((table) => table.getBoundingClientRect().width);
    return { before, after, tableBefore, tableAfter };
  };

  await page.locator('.rv__tab[data-tab="report"]').click();
  const report = await resizeLastColumn(".rv-grid__table", ".rv-grid__table thead th:not(.rv-grid__row-number)", 40);
  expect(report.after[0]).toBeCloseTo(report.before[0], 0);
  expect(report.after[1]).toBeCloseTo(report.before[1], 0);
  expect(report.after[2] - report.before[2]).toBeCloseTo(40, 0);
  expect(report.tableAfter - report.tableBefore).toBeCloseTo(40, 0);

  await page.locator('.rv__tab[data-tab="columns"]').click();
  const columns = await resizeLastColumn(".rv-columns-grid__table", ".rv-columns-grid__table thead th", 40);
  expect(columns.after[0]).toBeCloseTo(columns.before[0], 0);
  expect(columns.after[1]).toBeCloseTo(columns.before[1], 0);
  expect(columns.after[2]).toBeCloseTo(columns.before[2], 0);
  expect(columns.after[3] - columns.before[3]).toBeCloseTo(40, 0);
  expect(columns.tableAfter - columns.tableBefore).toBeCloseTo(40, 0);
});


test("DataViewer integration: an empty saved schema falls back to the result schema", async ({ page }) => {
  await mountDataViewerFixture(page, {
    nodes: [{ id: "empty-schema-node", stepName: "empty_schema_step", hasSchema: true, form: { schema: "[]" } }],
    responses: {
      empty_schema_step: {
        schemaDto: { columns: [{ origin_name: "result_name", new_name: "", description: "結果列", ziz_datatype: "STRING" }] },
        previewDto: { columns: ["result_name"], rows: [["result value"]], row_count: 1, truncated: false },
      },
    },
  });

  await expect(page.locator(".rv-columns__name-input")).toHaveCount(1);
  await expect(page.locator(".rv-columns__name-input")).toHaveValue("");
  await page.locator('.rv__tab[data-tab="report"]').click();
  await expect(page.locator(".rv-grid__table")).toContainText("result value");
  const savedSchema = await page.evaluate(() => window.__dataViewerFixture.state.nodes[0].form.schema);
  expect(savedSchema).toBe("[]");
});


test("DataViewer integration: renamed preview columns populate ReportViewer origin ids without dropping falsy values", async ({ page }) => {
  await mountDataViewerFixture(page, {
    nodes: [{ id: "renamed-preview-node", stepName: "renamed_preview_step", hasSchema: true }],
    responses: {
      renamed_preview_step: {
        schemaDto: {
          columns: [
            { origin_name: "count", new_name: "item_count", description: "件数", ziz_datatype: "INT64" },
            { origin_name: "enabled", new_name: "is_enabled", description: "有効", ziz_datatype: "BOOL" },
            { origin_name: "note", new_name: "caption", description: "注記", ziz_datatype: "STRING" },
          ],
        },
        previewDto: {
          columns: ["item_count", "is_enabled", "caption"],
          rows: [[0, false, ""]],
          row_count: 1,
          truncated: false,
        },
      },
    },
  });

  await page.locator('.rv__tab[data-tab="report"]').click();
  const rowCells = await page.locator(".rv-grid__table tbody tr:first-child td").allTextContents();
  expect(rowCells).toEqual(["1", "0", "false", ""]);
});


test("DataViewer integration: the production BQ autoextract schema appends only newly detected result columns and fills its pane host", async ({ page }) => {
  const localColumns = [
    {
      origin_name: "known",
      new_name: "renamed_known",
      description: "利用者の説明",
      ziz_datatype: "STRING",
      custom: { keep: true },
      visible: false,
    },
  ];
  const detectedColumns = [
    { origin_name: "known", new_name: "known", description: "結果側の説明", ziz_datatype: "STRING", result_only: true },
    { origin_name: "new_count", new_name: "new_count", description: "新規列", ziz_datatype: "INT64", precision: 38 },
  ];
  await mountBqAutoextractFixture(page, {
    rerenderOnStateChanged: true,
    localColumns,
    schemaDto: { columns: detectedColumns },
    previewDto: { columns: ["known", "new_count"], rows: [["value", 0]], row_count: 1, truncated: false },
  });

  await expect(page.locator("#nodeDetailBottom .rv-columns__name-input")).toHaveCount(2);
  await page.evaluate(() => {
    const pane = document.querySelector('#nodeDetailBottom .node-tab-pane[data-tab-key="data"]');
    pane.style.height = "420px";
  });
  const afterAutoextract = await page.evaluate(() => {
    const fixture = window.__bqAutoextractFixture;
    const host = fixture.root.querySelector(".node-data-viewer");
    const pane = fixture.root.querySelector('.node-tab-pane[data-tab-key="data"]');
    return {
      schemaAutoextract: fixture.schemaAutoextract,
      changeCount: fixture.changeCount,
      savedColumns: JSON.parse(fixture.state.nodes[0].form.schema),
      hostIsReportViewer: host.classList.contains("rv"),
      hostFlexGrow: getComputedStyle(host).flexGrow,
      hostMinHeight: getComputedStyle(host).minHeight,
      hostHeight: Math.round(host.getBoundingClientRect().height),
      paneHeight: Math.round(pane.getBoundingClientRect().height),
    };
  });
  expect(afterAutoextract.schemaAutoextract).toBe(true);
  expect(afterAutoextract.changeCount).toBe(1);
  expect(afterAutoextract.savedColumns).toEqual([...localColumns, detectedColumns[1]]);
  expect(afterAutoextract.hostIsReportViewer).toBe(true);
  expect(afterAutoextract.hostFlexGrow).toBe("1");
  expect(afterAutoextract.hostMinHeight).toBe("0px");
  expect(afterAutoextract.hostHeight).toBeLessThanOrEqual(afterAutoextract.paneHeight);

  await page.evaluate(() => window.__bqAutoextractFixture.render());
  await expect(page.locator("#nodeDetailBottom .rv-columns__name-input")).toHaveCount(2);
  const changeCountAfterRerender = await page.evaluate(() => window.__bqAutoextractFixture.changeCount);
  expect(changeCountAfterRerender).toBe(1);
});


test("DataViewer integration: preview-only data nodes mount report only, while non-data nodes unmount the prior viewer", async ({ page }) => {
  await mountDataViewerFixture(page, {
    nodes: [
      { id: "preview-node", stepName: "preview_step", hasSchema: false },
      { id: "plain-node", stepName: "plain_step", connector: "PlainViewerFixtureConnector", action: "plain_action", hasSchema: false },
    ],
    responses: {
      preview_step: {
        schemaDto: { columns: [{ origin_name: "name", new_name: "", description: "", ziz_datatype: "STRING" }] },
        previewDto: { columns: ["name"], rows: [["preview value"]], row_count: 1, truncated: false },
      },
    },
  });

  await expect(page.locator(".rv")).toHaveCount(1);
  const previewOnly = await page.evaluate(() => ({
    tabIds: Array.from(window.__dataViewerFixture.root.querySelectorAll(".rv__tab")).map((tab) => tab.dataset.tab),
    calls: window.__dataViewerFixture.calls.map((call) => call.command),
  }));
  expect(previewOnly.tabIds).toEqual(["report"]);
  expect(previewOnly.calls).toEqual(["result.getSchema", "result.getPreview"]);

  const afterSwitch = await page.evaluate(() => {
    const fixture = window.__dataViewerFixture;
    const destroy = window.ReportViewer.prototype.destroy;
    fixture.destroyCount = 0;
    window.ReportViewer.prototype.destroy = function () {
      fixture.destroyCount += 1;
      return destroy.apply(this, arguments);
    };
    fixture.selectNode("plain-node");
    return {
      destroyCount: fixture.destroyCount,
      hasViewer: !!fixture.root.querySelector(".rv"),
      calls: fixture.calls.map((call) => call.command),
      unsupported: fixture.root.querySelector(".node-data-note")?.textContent || "",
    };
  });
  expect(afterSwitch.destroyCount).toBeGreaterThan(0);
  expect(afterSwitch.hasViewer).toBe(false);
  expect(afterSwitch.calls).toEqual(["result.getSchema", "result.getPreview"]);
  expect(afterSwitch.unsupported).toContain("データコネクタではないため対応していません。");
});


test("DataViewer integration: committed schema remains visible after existing state-change rerendering", async ({ page }) => {
  await mountDataViewerFixture(page, {
    rerenderOnStateChanged: true,
    nodes: [{ id: "rerender-node", stepName: "rerender_step", hasSchema: true }],
    responses: {
      rerender_step: {
        schemaDto: { columns: [{ origin_name: "name", new_name: "", description: "", ziz_datatype: "STRING" }] },
        previewDto: { columns: ["name"], rows: [["initial value"]], row_count: 1, truncated: false },
      },
    },
  });

  await expect(page.locator(".rv-columns__name-input")).toHaveCount(1);
  const nameInput = page.locator(".rv-columns__name-input");
  await nameInput.fill("renamed");
  await nameInput.evaluate((input) => input.blur());
  await expect(page.locator(".rv-columns__name-input")).toHaveValue("renamed");
  const savedColumns = await page.evaluate(() => JSON.parse(window.__dataViewerFixture.state.nodes[0].form.schema));
  expect(savedColumns[0].new_name).toBe("renamed");
});


test("DataViewer integration: a late Bridge response cannot replace the current node view", async ({ page }) => {
  await mountDataViewerFixture(page, {
    nodes: [
      { id: "late-node", stepName: "late_step", hasSchema: true },
      { id: "current-node", stepName: "current_step", hasSchema: false },
    ],
    responses: {
      late_step: {
        defer: true,
        schemaDto: { columns: [{ origin_name: "name", new_name: "", description: "", ziz_datatype: "STRING" }] },
        previewDto: { columns: ["name"], rows: [["late value"]], row_count: 1, truncated: false },
      },
      current_step: {
        schemaDto: { columns: [{ origin_name: "name", new_name: "", description: "", ziz_datatype: "STRING" }] },
        previewDto: { columns: ["name"], rows: [["current value"]], row_count: 1, truncated: false },
      },
    },
  });

  await page.evaluate(() => window.__dataViewerFixture.selectNode("current-node"));
  await expect(page.locator(".rv-grid__table")).toContainText("current value");
  await page.evaluate(() => window.__dataViewerFixture.resolve("late_step"));
  await page.waitForTimeout(25);
  const currentView = await page.evaluate(() => ({
    viewerCount: window.__dataViewerFixture.root.querySelectorAll(".rv").length,
    text: window.__dataViewerFixture.root.textContent,
    selectedNodeId: window.__dataViewerFixture.state.selectedNodeId,
  }));
  expect(currentView.viewerCount).toBe(1);
  expect(currentView.selectedNodeId).toBe("current-node");
  expect(currentView.text).toContain("current value");
  expect(currentView.text).not.toContain("late value");
});
