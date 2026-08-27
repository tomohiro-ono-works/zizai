const { test, expect } = require("@playwright/test");


// WP-6A: generic field rendering / value update / visible_if / exportKey / validation
// move to the vendored zizai-form NodeForm. Pickers, coordinates, Excel/CSV assistants,
// allowVars variable suggestion, and legacy renderer cleanup stay out of this package.


test("dataflow.html loads the vendored NodeForm CSS and JS with no remote asset", async ({ page }) => {
  const externalRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.host !== "127.0.0.1:4173") externalRequests.push(request.url());
  });

  await page.goto("/gui/dataflow.html");

  const assets = await page.evaluate(() => ({
    styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (link) => new URL(link.href).pathname
    ),
    scripts: Array.from(document.scripts)
      .map((script) => (script.src ? new URL(script.src).pathname : ""))
      .filter(Boolean),
    hasNodeForm: typeof window.NodeForm?.mount === "function",
    hasAdapter: typeof window.uiNodeFormAdapter?.mountNodeForm === "function",
  }));

  expect(assets.styles).toContain("/gui/vendor/zizai-form/src/node-form.css");
  expect(assets.scripts).toContain("/gui/vendor/zizai-form/src/node-form.js");
  expect(assets.hasNodeForm).toBe(true);
  expect(assets.hasAdapter).toBe(true);
  expect(externalRequests).toEqual([]);
});


test("the real node detail mounts each contiguous NodeForm-supported run at its original schema position and keeps visible_if reactive within a run", async ({ page }) => {
  // Catches: grouping every NodeForm-supported field into a single block at the first
  // eligible slot instead of rendering each contiguous run where it appears in the
  // schema (dom_action interleaves combo/checkbox/number generic fields with allowVars
  // text fields that must stay legacy-rendered in between).
  await page.goto("/gui/dataflow.html");

  const result = await page.evaluate(() => {
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
        config: window.CONFIG,
        root: host,
        onStateChanged: render,
      });
    }
    render();

    // The schema order for SeleniumConnector.dom_action is:
    // source_step_id(legacy) operation(nf) selector_type(nf) selector(legacy,allowVars)
    // value(legacy,allowVars) value_ref(legacy,allowVars) clear(nf) label(legacy,allowVars)
    // index(nf) key(legacy,allowVars) to(nf) direction(nf) amount(nf) timeout_ms(nf)
    // -> 4 contiguous NodeForm runs: [operation, selector_type], [clear], [index],
    //    [to, direction, amount, timeout_ms]. Legacy rows also carry data-field-key
    //    (set by ui.node.detail.js), so a single flat, in-DOM-order query proves both
    //    which fields are NodeForm-mounted and that runs sit at their original slot.
    const orderedKeys = Array.from(host.querySelectorAll(".node-body .row[data-field-key], .node-body .node-form__field[data-field-key]")).map((row) =>
      row.getAttribute("data-field-key")
    );

    const nodeFormHostCount = host.querySelectorAll(".node-form-host.node-form").length;
    const rowHidden = (key) => {
      const row = host.querySelector(`[data-field-key="${key}"]`);
      return row ? !!row.hidden : null;
    };

    const initial = {
      nodeFormHostCount,
      orderedKeys,
      visible: {
        operation: rowHidden("operation"),
        selector_type: rowHidden("selector_type"),
        clear: rowHidden("clear"),
        index: rowHidden("index"),
        to: rowHidden("to"),
        direction: rowHidden("direction"),
        amount: rowHidden("amount"),
        timeout_ms: rowHidden("timeout_ms"),
      },
    };

    // Intra-run visible_if: operation and selector_type live in the same contiguous
    // NodeForm run, so switching operation must reactively hide selector_type without
    // a full re-render.
    const operationRow = host.querySelector('[data-field-key="operation"]');
    operationRow.querySelector(".node-form__combo-button").click();
    const options = Array.from(operationRow.querySelectorAll(".node-form__combo-option"));
    const keyOption = options.find((button) => button.textContent.trim() === "key");
    keyOption.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

    const afterSwitch = { selector_type: rowHidden("selector_type") };

    return { initial, afterSwitch, formOperation: node.form.operation };
  });

  expect(result.initial.nodeFormHostCount).toBe(4);
  expect(result.initial.orderedKeys).toEqual([
    "source_step_id",
    "operation",
    "selector_type",
    "selector",
    "value",
    "value_ref",
    "clear",
    "label",
    "index",
    "key",
    "to",
    "direction",
    "amount",
    "timeout_ms",
  ]);
  expect(result.initial.visible).toEqual({
    operation: false,
    selector_type: false,
    clear: true,
    index: true,
    to: true,
    direction: true,
    amount: true,
    timeout_ms: false,
  });
  expect(result.afterSwitch.selector_type).toBe(true);
  expect(result.formOperation).toBe("key");
});


test("allowVars fields stay on the legacy renderer and keep their Application variable-suggestion wrapper", async ({ page }) => {
  // Catches: mounting allowVars fields inside NodeForm, which has no variable-suggest
  // implementation, silently dropping the {{variable}} suggestion dropdown.
  await page.goto("/gui/dataflow.html");

  const result = await page.evaluate(async () => {
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
        config: window.CONFIG,
        root: host,
        onStateChanged: render,
      });
    }
    render();

    const findSelectorInput = () => {
      const label = Array.from(host.querySelectorAll(".row > label")).find(
        (candidate) => (candidate.textContent || "").includes("セレクタ") && !candidate.closest(".node-form")
      );
      return label ? label.closest(".row").querySelector("input") : null;
    };

    const notInNodeForm = !host.querySelector('.node-form [data-field-key="selector"]');
    const hasLegacyRow = !!findSelectorInput();

    let hasSuggestWrapper = false;
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const input = findSelectorInput();
      if (input && input.closest(".suggest")) {
        hasSuggestWrapper = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return { notInNodeForm, hasLegacyRow, hasSuggestWrapper };
  });

  expect(result.notInNodeForm).toBe(true);
  expect(result.hasLegacyRow).toBe(true);
  expect(result.hasSuggestWrapper).toBe(true);
});


test("NodeForm edits update node.form immediately, defer the Application commit callback until blur, and enforce min/max validation", async ({ page }) => {
  // Catches: wiring NodeForm's onChange straight into the Application onStateChanged
  // callback, which would tear the whole node detail down (and drop input focus) on
  // every keystroke instead of on commit (blur), and dropping numeric range validation.
  await page.goto("/gui/dataflow.html");

  const result = await page.evaluate(() => {
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

    let commitCount = 0;
    function render() {
      window.zizPackages.ui.nodeDetail.renderNodeDetail({
        state,
        config: window.CONFIG,
        root: host,
        onStateChanged: () => {
          commitCount += 1;
          render();
        },
      });
    }
    render();

    const input = host.querySelector('[data-field-key="timeout_ms"] input');
    input.focus();
    input.value = "500";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const beforeBlur = { formValue: node.form.timeout_ms, commitCount };

    input.blur();

    const errorText = host.querySelector('[data-field-key="timeout_ms"] .node-form__error')?.textContent || "";

    return { beforeBlur, afterBlurCommitCount: commitCount, errorText };
  });

  expect(result.beforeBlur.formValue).toBe(500);
  expect(result.beforeBlur.commitCount).toBe(0);
  expect(result.afterBlurCommitCount).toBe(1);
  expect(result.errorText).toContain("1000");
});


test("the adapter maps NodeForm edits into node.form via exportKey and notifies the commit callback on blur", async ({ page }) => {
  await page.goto("/gui/dataflow.html");

  const result = await page.evaluate(() => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = { id: "n3", connector: "TestConnector", action: "test_action", form: {} };
    const fields = [
      { key: "display_note", label: "表示用メモ", kind: "text", exportKey: "note_output" },
    ];
    let committed = 0;
    const instance = window.uiNodeFormAdapter.mountNodeForm({
      root: host,
      node,
      fields,
      onCommit: () => { committed += 1; },
    });

    const input = host.querySelector('[data-field-key="display_note"] input');
    input.focus();
    input.value = "hello world";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const beforeBlur = { ...node.form };
    input.blur();

    return { mounted: !!instance, beforeBlur, afterBlur: { ...node.form }, committed };
  });

  expect(result.mounted).toBe(true);
  expect(result.beforeBlur).toEqual({ note_output: "hello world" });
  expect(result.afterBlur).toEqual({ note_output: "hello world" });
  expect(result.committed).toBe(1);
});
