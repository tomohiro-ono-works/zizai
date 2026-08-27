const { test, expect } = require("@playwright/test");


// WP-6B: connect the vendored zizai-form NodeForm file/dir browse
// (nodeform:browse-request) and mouse coordinate (nodeform:coordinate-request)
// events to Application-owned Host Adapter behavior. Only the OS/Bridge boundary
// is doubled below; NodeForm, the Host Adapter, and the real node detail run
// unmodified against the real config.js schema.


function buildDuckExecuteSqlFileNode() {
  return {
    id: "n1",
    stepName: "step1",
    connector: "DuckConnector",
    action: "execute_sql_file",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: {},
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
}

function buildDuckCreateDbFileNode() {
  return {
    id: "n1",
    stepName: "step1",
    connector: "DuckConnector",
    action: "create_db_file",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: {},
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
}

function buildWindowsMouseClickNode() {
  return {
    id: "n1",
    stepName: "step1",
    connector: "WindowsConnector",
    action: "mouse_click",
    description: "",
    descriptionAuto: true,
    nodeType: "task",
    form: { coordinate_mode: "specified", x: "1", y: "2", button: "left", click_count: "1" },
    parentId: null,
    mergeParentIds: [],
    parallelOf: null,
    parallelOrder: 1,
  };
}

// Sets up the page with the real dataflow.html and real node detail, but replaces
// window.zizBridge with a recording stub -- the only doubled boundary -- then mounts
// the given node via the real renderNodeDetail so the real NodeForm Host Adapter runs.
async function gotoAndMount(page, node) {
  await page.goto("/gui/dataflow.html");
  await page.evaluate(async (nodeArg) => {
    // Preloads the legacy allowVars variable-suggest module up front. Otherwise the
    // legacy renderer's first allowVars field (e.g. x/y or db_file_name, which stay
    // legacy-rendered here) lazily fetches it and fires an unrelated, timing-dependent
    // onStateChanged({history:false}) once loaded -- unrelated to the Host Adapter under
    // test, but indistinguishable from a real commit by this file's plain commit counter.
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
      hiddenBindings: {},
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
  }, node);
}

async function waitFor(page, predicateSource, timeoutMs = 2000) {
  await page.waitForFunction(predicateSource, { timeout: timeoutMs });
}


test("a NodeForm file field routes nodeform:browse-request to the Bridge file picker and applies the selected value", async ({ page }) => {
  await gotoAndMount(page, buildDuckExecuteSqlFileNode());
  await page.evaluate(() => {
    window.__bridgeResults["file.pickFile"] = () => Promise.resolve({ selected: true, ref: "C:/queries/select.sql" });
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="sql_file"]');
    row.querySelector(".node-form__browse-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);
  await waitFor(page, () => window.__state.nodes[0].form.sql_file === "C:/queries/select.sql");

  const result = await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="sql_file"]');
    const button = row.querySelector(".node-form__browse-button");
    return {
      calls: window.__bridgeCalls,
      formValue: window.__state.nodes[0].form.sql_file,
      inputValue: row.querySelector("input").value,
      buttonDisabled: button.disabled,
      buttonText: button.textContent,
      commitCount: window.__commitCount,
    };
  });

  expect(result.calls).toEqual([
    {
      type: "file.pickFile",
      payload: {
        title: "SQLファイルを選択",
        step_name: "step1",
        field_key: "sql_file",
        current_ref: "",
        current_value: "",
        workspace_tab_id: "__standalone__",
        filters: [{ label: "SQLファイル", patterns: ["*.sql"] }],
      },
    },
  ]);
  expect(result.formValue).toBe("C:/queries/select.sql");
  expect(result.inputValue).toBe("C:/queries/select.sql");
  expect(result.buttonDisabled).toBe(false);
  expect(result.buttonText).toBe("選択");
  expect(result.commitCount).toBe(1);
});


test("a NodeForm file field's browse-request preserves the hidden-binding current_ref and persists Bridge result metadata into state.hiddenBindings", async ({ page }) => {
  // Catches: dropping the Application's hidden-binding contract (Excel/CSV assistant
  // refs like {{hidden.xxx}}) when routing file/dir browse through NodeForm. The legacy
  // renderer sends a hidden ref as current_ref (not current_value), and persists a
  // successful pick's display_name/display_hint into state.hiddenBindings[result.ref].
  const node = buildDuckExecuteSqlFileNode();
  node.form.sql_file = "{{hidden.legacy_ref}}";
  await gotoAndMount(page, node);
  await page.evaluate(() => {
    window.__bridgeResults["file.pickFile"] = () => Promise.resolve({
      selected: true,
      ref: "C:/queries/select.sql",
      display_name: "select.sql",
      display_hint: "隠しバインディング経由",
    });
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="sql_file"]');
    row.querySelector(".node-form__browse-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);
  await waitFor(page, () => window.__state.nodes[0].form.sql_file === "C:/queries/select.sql");

  const result = await page.evaluate(() => ({
    calls: window.__bridgeCalls,
    formValue: window.__state.nodes[0].form.sql_file,
    hiddenBindings: window.__state.hiddenBindings,
  }));

  expect(result.calls).toEqual([
    {
      type: "file.pickFile",
      payload: {
        title: "SQLファイルを選択",
        step_name: "step1",
        field_key: "sql_file",
        current_ref: "{{hidden.legacy_ref}}",
        current_value: "",
        workspace_tab_id: "__standalone__",
        filters: [{ label: "SQLファイル", patterns: ["*.sql"] }],
      },
    },
  ]);
  expect(result.formValue).toBe("C:/queries/select.sql");
  expect(result.hiddenBindings).toEqual({
    "C:/queries/select.sql": { display_name: "select.sql", display_hint: "隠しバインディング経由" },
  });
});


test("a NodeForm dir field routes nodeform:browse-request to the Bridge folder picker without file filters", async ({ page }) => {
  await gotoAndMount(page, buildDuckCreateDbFileNode());
  await page.evaluate(() => {
    window.__bridgeResults["file.pickFolder"] = () => Promise.resolve({ selected: true, ref: "C:/data" });
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="db_folder"]');
    row.querySelector(".node-form__browse-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);
  await waitFor(page, () => window.__state.nodes[0].form.db_folder === "C:/data");

  const result = await page.evaluate(() => ({
    calls: window.__bridgeCalls,
    formValue: window.__state.nodes[0].form.db_folder,
    commitCount: window.__commitCount,
  }));

  expect(result.calls).toEqual([
    {
      type: "file.pickFolder",
      payload: {
        title: "DBファイルの場所を選択",
        step_name: "step1",
        field_key: "db_folder",
        current_ref: "",
        current_value: "",
        workspace_tab_id: "__standalone__",
      },
    },
  ]);
  expect(result.formValue).toBe("C:/data");
  expect(result.commitCount).toBe(1);
});


test("cancelling the Bridge file picker leaves node.form unchanged and resets the NodeForm control", async ({ page }) => {
  await gotoAndMount(page, buildDuckExecuteSqlFileNode());
  await page.evaluate(() => {
    window.__bridgeResults["file.pickFile"] = () => Promise.resolve({ selected: false });
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="sql_file"]');
    row.querySelector(".node-form__browse-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);
  await waitFor(page, () => {
    const button = window.__host.querySelector('[data-field-key="sql_file"] .node-form__browse-button');
    return button && button.disabled === false;
  });

  const result = await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="sql_file"]');
    const button = row.querySelector(".node-form__browse-button");
    return {
      formValue: window.__state.nodes[0].form.sql_file,
      buttonDisabled: button.disabled,
      buttonText: button.textContent,
      commitCount: window.__commitCount,
    };
  });

  expect(result.formValue).toBeUndefined();
  expect(result.buttonDisabled).toBe(false);
  expect(result.buttonText).toBe("選択");
  expect(result.commitCount).toBe(0);
});


test("a Bridge file picker error leaves node.form unchanged and resets the NodeForm control", async ({ page }) => {
  await gotoAndMount(page, buildDuckExecuteSqlFileNode());
  await page.evaluate(() => {
    window.__bridgeResults["file.pickFile"] = () => Promise.reject({ code: "E_FAILED", message: "boom" });
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="sql_file"]');
    row.querySelector(".node-form__browse-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);
  await waitFor(page, () => {
    const button = window.__host.querySelector('[data-field-key="sql_file"] .node-form__browse-button');
    return button && button.disabled === false;
  });

  const result = await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="sql_file"]');
    const button = row.querySelector(".node-form__browse-button");
    return {
      formValue: window.__state.nodes[0].form.sql_file,
      buttonDisabled: button.disabled,
      buttonText: button.textContent,
      commitCount: window.__commitCount,
    };
  });

  expect(result.formValue).toBeUndefined();
  expect(result.buttonDisabled).toBe(false);
  expect(result.buttonText).toBe("選択");
  expect(result.commitCount).toBe(0);
});


test("a NodeForm mouse-coordinate-picker field routes nodeform:coordinate-request through mouse.coordinateCapture.start and applies the selected coordinates from the correlated ziz:evt", async ({ page }) => {
  await gotoAndMount(page, buildWindowsMouseClickNode());
  await page.evaluate(() => {
    window.__bridgeResults["mouse.coordinateCapture.start"] = () => Promise.resolve({});
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="coordinate_picker"]');
    row.querySelector(".node-form__coordinate-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);

  const captureId = await page.evaluate(() => window.__bridgeCalls[0].payload.capture_id);
  expect(typeof captureId).toBe("string");
  expect(captureId.length).toBeGreaterThan(0);

  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent("ziz:evt", {
      detail: { type: "mouse.coordinateCapture.selected", payload: { capture_id: id, x: 640, y: 480 } },
    }));
  }, captureId);
  await waitFor(page, () => window.__state.nodes[0].form.x === "640");

  const result = await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="coordinate_picker"]');
    const button = row.querySelector(".node-form__coordinate-button");
    return {
      calls: window.__bridgeCalls,
      x: window.__state.nodes[0].form.x,
      y: window.__state.nodes[0].form.y,
      buttonDisabled: button.disabled,
      buttonText: button.textContent,
      commitCount: window.__commitCount,
    };
  });

  expect(result.calls).toEqual([{ type: "mouse.coordinateCapture.start", payload: { capture_id: captureId } }]);
  expect(result.x).toBe("640");
  expect(result.y).toBe("480");
  expect(result.buttonDisabled).toBe(false);
  expect(result.buttonText).toBe("マウスで指定する");
  expect(result.commitCount).toBe(1);
});


test("cancelling the coordinate capture leaves node.form unchanged and resets the NodeForm control", async ({ page }) => {
  await gotoAndMount(page, buildWindowsMouseClickNode());
  await page.evaluate(() => {
    window.__bridgeResults["mouse.coordinateCapture.start"] = () => Promise.resolve({});
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="coordinate_picker"]');
    row.querySelector(".node-form__coordinate-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);
  const captureId = await page.evaluate(() => window.__bridgeCalls[0].payload.capture_id);

  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent("ziz:evt", {
      detail: { type: "mouse.coordinateCapture.cancelled", payload: { capture_id: id } },
    }));
  }, captureId);
  await waitFor(page, () => {
    const button = window.__host.querySelector('[data-field-key="coordinate_picker"] .node-form__coordinate-button');
    return button && button.disabled === false;
  });

  const result = await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="coordinate_picker"]');
    const button = row.querySelector(".node-form__coordinate-button");
    return {
      x: window.__state.nodes[0].form.x,
      y: window.__state.nodes[0].form.y,
      buttonDisabled: button.disabled,
      buttonText: button.textContent,
      commitCount: window.__commitCount,
    };
  });

  expect(result.x).toBe("1");
  expect(result.y).toBe("2");
  expect(result.buttonDisabled).toBe(false);
  expect(result.buttonText).toBe("マウスで指定する");
  expect(result.commitCount).toBe(0);
});


// WP-6D: reproduces the real parent AppShell Bridge + embedded child dataflow window
// boundary. `page` is the parent AppShell window and owns the (stubbed) Bridge, exactly
// like a real AppShell hosting a dataflow tab; `childFrame` is a real, unmodified
// dataflow.html?embedded=1 document nested inside it, exactly like a real embedded flow
// tab. Only the OS/Bridge boundary on the parent is doubled; NodeForm, the Host Adapter,
// and the real node detail run unmodified inside the child.
async function gotoParentAppShellWithEmbeddedChild(page, node) {
  await page.goto("/gui/dataflow.html");
  await page.evaluate(() => {
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
  });

  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.src = new URL("./dataflow.html?embedded=1", window.location.href).toString();
    document.body.appendChild(iframe);
    window.__childIframe = iframe;
  });
  const iframeHandle = await page.evaluateHandle(() => window.__childIframe);
  const childFrame = await iframeHandle.asElement().contentFrame();
  await childFrame.waitForLoadState("load");

  await childFrame.evaluate(async (nodeArg) => {
    if (window.zizShell && typeof window.zizShell.loadScriptOnce === "function") {
      await window.zizShell.loadScriptOnce("./js/ui.suggest.js");
    }
    const state = {
      nodes: [nodeArg],
      selectedNodeId: nodeArg.id,
      selectedNodeIds: [nodeArg.id],
      startParameters: [],
      hiddenBindings: {},
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
  }, node);

  return childFrame;
}


test("in embedded mode, a mouse-coordinate selected ziz:evt dispatched on the parent AppShell window (not the child) updates node.form and the visible legacy X/Y inputs", async ({ page }) => {
  // Catches: the Host Adapter always listening on its own (child) window for `ziz:evt`
  // even though resolveActiveBridgeApi() picked the parent AppShell Bridge -- the real
  // Bridge dispatches its coordinate-capture result on the parent window, which the
  // child-only listener never sees, so X/Y are silently never applied.
  const childFrame = await gotoParentAppShellWithEmbeddedChild(page, buildWindowsMouseClickNode());
  await page.evaluate(() => {
    window.__bridgeResults["mouse.coordinateCapture.start"] = () => Promise.resolve({});
  });

  await childFrame.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="coordinate_picker"]');
    row.querySelector(".node-form__coordinate-button").click();
  });
  await page.waitForFunction(() => window.__bridgeCalls.length >= 1);

  const captureId = await page.evaluate(() => window.__bridgeCalls[0].payload.capture_id);
  expect(typeof captureId).toBe("string");
  expect(captureId.length).toBeGreaterThan(0);

  // Dispatched on the parent AppShell window (`page`), never directly on `childFrame`.
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent("ziz:evt", {
      detail: { type: "mouse.coordinateCapture.selected", payload: { capture_id: id, x: 640, y: 480 } },
    }));
  }, captureId);
  await childFrame.waitForFunction(() => window.__state.nodes[0].form.x === "640");

  const result = await childFrame.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="coordinate_picker"]');
    const button = row.querySelector(".node-form__coordinate-button");
    const xInput = window.__host.querySelector('[data-field-key="x"] input');
    const yInput = window.__host.querySelector('[data-field-key="y"] input');
    return {
      x: window.__state.nodes[0].form.x,
      y: window.__state.nodes[0].form.y,
      xInputValue: xInput ? xInput.value : null,
      yInputValue: yInput ? yInput.value : null,
      buttonDisabled: button.disabled,
      buttonText: button.textContent,
      commitCount: window.__commitCount,
    };
  });

  expect(result.x).toBe("640");
  expect(result.y).toBe("480");
  expect(result.xInputValue).toBe("640");
  expect(result.yInputValue).toBe("480");
  expect(result.buttonDisabled).toBe(false);
  expect(result.buttonText).toBe("マウスで指定する");
  expect(result.commitCount).toBe(1);
});


test("remounting the NodeForm host removes the previous instance's coordinate listener so a stale ziz:evt result is not applied", async ({ page }) => {
  // Catches: attaching the coordinate-capture ziz:evt listener at module/window scope
  // without removing it on destroy, so a response correlated to an already-destroyed
  // NodeForm instance still mutates node.form and double-fires the commit callback.
  await gotoAndMount(page, buildWindowsMouseClickNode());
  await page.evaluate(() => {
    window.__bridgeResults["mouse.coordinateCapture.start"] = () => Promise.resolve({});
  });

  await page.evaluate(() => {
    const row = window.__host.querySelector('[data-field-key="coordinate_picker"]');
    row.querySelector(".node-form__coordinate-button").click();
  });
  await waitFor(page, () => window.__bridgeCalls.length >= 1);
  const staleCaptureId = await page.evaluate(() => window.__bridgeCalls[0].payload.capture_id);

  // Remount without resolving the pending capture: destroys the instance that owns
  // staleCaptureId and mounts a fresh one in its place.
  await page.evaluate(() => window.__render());

  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent("ziz:evt", {
      detail: { type: "mouse.coordinateCapture.selected", payload: { capture_id: id, x: 999, y: 999 } },
    }));
  }, staleCaptureId);
  // Give any (incorrect) listener a chance to run before asserting nothing happened.
  await page.waitForTimeout(100);

  const result = await page.evaluate(() => ({
    x: window.__state.nodes[0].form.x,
    y: window.__state.nodes[0].form.y,
    commitCount: window.__commitCount,
  }));

  expect(result.x).toBe("1");
  expect(result.y).toBe("2");
  expect(result.commitCount).toBe(0);
});
