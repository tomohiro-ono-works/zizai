# TASK-033 Unify Step Reference Format, Validation, and Suggest

## Status

Not Started — 推奨実装順序 2/7（TASK-032 → TASK-033 → TASK-034 Subtask A → TASK-036 → TASK-028 → TASK-034 Subtask B → TASK-035）。GUIのValidationを通るstep参照がRuntimeで失敗する不整合を含む。

## Goal

step出力を参照する入力（loopの「繰り返しデータ」等）について、Canonical形式、GUIの選択／Suggest UI、Validation、Runtimeでの解決を一致させる。GUIで受け付けた参照が、Runtimeで失敗しない状態にする。

## Scope

- `WindowsConnector.loop_tasks`の`source_step_id`（繰り返しデータ）について、次を確認し、不整合を修正する。
  - 「繰り返しデータ」入力欄で、step参照のSuggest／選択UIが表示されるか。候補が上流stepに限られるか。
  - GUIで選択したときの保存形式。
  - 手入力時のValidation。
  - Runtimeでの解決。
- Canonical形式（`step2`／`{{step2}}`）の決定と、非Canonical形式の扱い（受理して正規化するか、拒否するか）。
- 同様のstep参照表現を使う他の入力欄の棚卸しと整合。対象は次のとおり。
  - `input_data`（Runtimeは`{{...}}`を参照名へ正規化済み）
  - `input_data_rename`
  - SeleniumConnectorの`source_step_id`（参照ステップ）
  - Seleniumの`value_ref`
  - `{{step1.field}}`等のtemplate参照
- 既存flow（`.zizd`）との互換性。保存済みの`{{step2}}`形式を今後どう扱うか、移行が必要か。
- fixture／Test（Playwright spec、Python Test）がRuntime contractと一致しているかの確認と修正。
- Suggestが存在しない、または不十分な場合のUX要件の整理。整理する観点は次のとおり。
  - 候補の範囲（上流step、loop内外、`current_item`等のloop変数）
  - 選択と手入力の関係
  - 候補外の値を入力したときのerror表示

## Out of scope

- template変数（`{{current_item.xxx}}`、`{{variable}}`の文字列埋め込み）機能自体の再設計。
- NodeFormのlibrary移行方針の変更。
- DataViewerの表示Pattern（TASK-025）。

## References

- Runtime: `apps/core/workflow_engine.py`（`_context_ref_param_keys = {"input_data", "input_data_rename"}`、`_resolve_template_string`、`loop_tasks`での`source_step_id or input_data`の評価）、`apps/connectors/selenium_connector.py`（`_resolve_source_session_key`）
- Frontend:
  - `apps/gui/config/config.js`: `WindowsConnector.loop_tasks`の`source_step_id`はplaceholderが`例: {{step1}}`、SeleniumConnectorの`source_step_id`はplaceholderが`例: step6`。
  - `apps/gui/js/ui.fields.js`: `renderInputDataSelect`、`normalizeInputDataReference`によるValidation。
  - `apps/gui/js/app.js`: `normalizeInputDataReference`。
  - `apps/gui/js/node-form.adapter.js`: `LEGACY_ONLY_KEYS`。
- Test: `tests/playwright/specs/workflow-designer-adapter.spec.js`（loop fixtureが`source_step_id: "{{step1}}"`を使用）
- Current Specification: [Data Contract](../../features/data-contract.md)、[Connector Contract](../../features/connectors.md)（`source_step_id`によるsession参照、`loop_tasks`の実行責務）、[Frontend](../../features/frontend.md)
- 関連Task: [TASK-036](TASK-036-design-verification-harness-and-test-evidence-pipeline.md)（検証Harness）

## Constraints

- Canonical形式と既存flowの互換方針は、影響範囲の調査結果を示し、Project ownerの承認を得てから実装する。
- 保存済みflowを承認なしに自動で書き換えない。変換が必要な場合は、明示的な移行手順を設計する。
- Current Specificationを変更する場合は、変更案を示して承認を得る。
- UX要件を追加する場合は、既存の選択UIとValidation表示を壊さない。

## Acceptance Criteria

- Canonical形式、非Canonical形式の扱い、既存flowの互換方針が決定され、記録されている。
- GUIで保存し、Validationを通過したstep参照が、Runtimeで同じ意味に解決される。`loop_tasks`とSeleniumConnectorの`source_step_id`を含む。
- 「繰り返しデータ」入力欄の選択／Suggest UIの有無と挙動が確認されている。不足がある場合はUX要件が記録され、実装した場合はその結果が確認されている。
- fixture／TestがRuntime contractと一致し、不一致だったfixtureが修正されている。
- 参照形式ごとのRuntime解決とValidationを固定するTestが追加され、該当するverification Gateで通過している。

## Evidence

2026-09-14〜15の非BigQuery検証（一時scriptによる確認。scriptはrepositoryに含めていない）。

- Desktop UI（production host、一時repository root）で、`loop_tasks`の`source_step_id: '{{step2}}'`を含むflowを実行ボタンから実行した。`[step3] エラー発生: The truth value of a DataFrame is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all().`になった。
- 同じflowを`source_step_id: step2`に変えると、loop 2回、loop内step、後続のバッチ実行、完了まですべて成功した。
- CLI（`bin\ziz.bat`）では、`source_step_id: files`（括弧なし）のloopが成功した。
- 原因（コード上の確認）:
  - Runtimeが参照名として正規化するのは`input_data`／`input_data_rename`だけで、`source_step_id`の`{{step2}}`はDataFrameの値そのものへ展開される。
  - `loop_tasks`は`params.get("source_step_id") or params.get("input_data")`を評価するため、DataFrameを真偽値として扱って失敗する。
  - SeleniumConnectorの`_resolve_source_session_key`も`str(params.get("source_step_id") or "")`と評価するため、括弧付きで指定すると同種の失敗が起きる可能性がある。この経路は未実行。
- GUI（コード上の確認）:
  - `source_step_id`の入力欄は上流stepのselectとして描画され、選択値は`step2`形式で保存される。
  - Validationは`normalizeInputDataReference`で`{{step2}}`も上流参照として受理する。
  - 現在値が候補にない場合、selectはその値を候補へ追加して表示する。

## Remaining Work

- 実際のDesktop UIで「繰り返しデータ」入力欄を開き、選択UI、Suggest、手入力の可否、Validation表示を確認する。
- 参照表現を使う全入力欄について、GUIの描画方式、保存形式、Runtime解決の一覧を作成する。
