const { test, expect } = require("@playwright/test");


test("field reference warnings distinguish supported and unknown variables", async ({ page }) => {
  await page.goto("/gui/dataflow.html");

  const warnings = await page.evaluate(() => {
    const getWarnings = window.zizPackages.ui.fields.getFieldReferenceWarnings;
    const textarea = { key: "text", kind: "textarea", allowVars: true };
    const defineValues = { key: "define_values", kind: "define-values-editor" };
    const context = { upstreamSteps: ["step12"], availableVariableNames: ["current_date", "user_name"] };
    return {
      stepOutput: getWarnings({ node: { form: { text: "{{step12.device}}" } }, field: textarea, ...context }),
      loopRuntime: getWarnings({ node: { form: { text: "{{current_item.device}} / {{current_index}}" } }, field: textarea, ...context }),
      unknown: getWarnings({ node: { form: { text: "{{unknown_var}}" } }, field: textarea, ...context }),
      japaneseName: getWarnings({ node: { form: { define_values: [{ name: "売上_合計", value: "100" }] } }, field: defineValues, ...context }),
    };
  });

  expect(warnings.stepOutput).toEqual([]);
  expect(warnings.loopRuntime).toEqual([]);
  expect(warnings.unknown.length).toBeGreaterThan(0);
  expect(warnings.japaneseName).toEqual([]);
});


test("reference-only warnings accept only canonical bare keys", async ({ page }) => {
  await page.goto("/gui/dataflow.html");

  const warnings = await page.evaluate(() => {
    const getWarnings = window.zizPackages.ui.fields.getFieldReferenceWarnings;
    const context = {
      upstreamSteps: ["step1"],
      availableVariableNames: ["step1", "customer_name"],
    };
    const check = (key, value) => getWarnings({
      node: { form: { [key]: value } },
      field: { key, kind: "text", allowVars: true },
      ...context,
    });
    return {
      sourceBare: check("source_step_id", "step1"),
      sourceWrapped: check("source_step_id", "{{step1}}"),
      sourceNested: check("source_step_id", "{{step1.customer_id}}"),
      valueBare: check("value_ref", "customer_name"),
      valueWrapped: check("value_ref", "{{customer_name}}"),
      valueUnknown: check("value_ref", "missing_name"),
      valueNested: check("value_ref", "{{step1.customer_id}}"),
    };
  });

  expect(warnings.sourceBare).toEqual([]);
  expect(warnings.sourceWrapped.length).toBeGreaterThan(0);
  expect(warnings.sourceNested.length).toBeGreaterThan(0);
  expect(warnings.valueBare).toEqual([]);
  expect(warnings.valueWrapped.length).toBeGreaterThan(0);
  expect(warnings.valueUnknown.length).toBeGreaterThan(0);
  expect(warnings.valueNested.length).toBeGreaterThan(0);
});
