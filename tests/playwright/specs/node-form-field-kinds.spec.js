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


test("routing fixture: the real node detail mounts only generic fields into NodeForm, and keeps allowVars/codeLanguage/input_data/source_step_id/google-auth-login/unknown-kind/schema-special fields on the Application legacy route", async ({ page }) => {
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
    const schemaEditorHost = host.querySelector(".node-data-schema-editor");

    return {
      nodeFormKeys,
      legacyKeys,
      schemaEditorRowCount: schemaEditorHost ? schemaEditorHost.querySelectorAll(".row").length : 0,
      schemaEditorHasFieldKeyAttr: schemaEditorHost ? !!schemaEditorHost.querySelector("[data-field-key]") : false,
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
  expect(result.schemaEditorRowCount).toBe(1);
  expect(result.schemaEditorHasFieldKeyAttr).toBe(false);
  expect(result.nodeFormKeys.length + result.legacyKeys.length + result.schemaEditorRowCount).toBe(result.totalFieldCount);
});
