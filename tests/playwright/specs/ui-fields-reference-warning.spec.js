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
