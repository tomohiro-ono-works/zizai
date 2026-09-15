# TASK-033 Unify Step Reference Format, Validation, and Suggest

## Status

Completed — 2026-09-15

## Goal

step出力を参照する入力（loopの「繰り返しデータ」等）について、Canonical形式、GUIの選択／Suggest UI、Validation、Runtimeでの解決を一致させる。GUIで受け付けた参照が、Runtimeで失敗しない状態にする。

## Scope

- `WindowsConnector.loop_tasks`の`source_step_id`（繰り返しデータ）について、次を確認し、不整合を修正する。
  - 「繰り返しデータ」入力欄で、step参照のSuggest／選択UIが表示されるか。候補が上流stepに限られるか。
  - GUIで選択したときの保存形式。
  - 手入力時のValidation。
  - Runtimeでの解決。
- Canonical形式をbraceなしの`step2`とし、`{{step2}}`等の非Canonical形式を拒否する境界の整合。
- 同様のstep参照表現を使う他の入力欄の棚卸しと整合。対象は次のとおり。
- `input_data`
  - `input_data_rename`
  - SeleniumConnectorの`source_step_id`（参照ステップ）
  - Seleniumの`value_ref`
  - `{{step1.field}}`等のtemplate参照
- 通常のtemplate入力で、`{{`から上流stepを、`{{step1.`または完成済みの`{{step1}}`からschema／output metadataに基づくfieldをSuggestする。完成済みtokenからfieldを選択した場合は`{{step1.field}}`へ置換する。
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
- `.zizd`への`schema_version`導入と旧versionから現行versionへのmigration framework実装。

## References

- Runtime: `apps/core/workflow_engine.py`（`_context_ref_param_keys = {"input_data", "input_data_rename"}`、`_resolve_template_string`、`loop_tasks`での`source_step_id or input_data`の評価）、`apps/connectors/selenium_connector.py`（`_resolve_source_session_key`）
- Frontend:
  - `apps/gui/config/config.js`: `WindowsConnector.loop_tasks`の`source_step_id`はplaceholderが`例: {{step1}}`、SeleniumConnectorの`source_step_id`はplaceholderが`例: step6`。
- `apps/gui/js/ui.fields.js`: `renderInputDataSelect`、`normalizeInputDataReference`によるValidation。
- `apps/gui/js/ui.suggest.js`: 通常template入力のSuggestと選択操作。
- `apps/gui/js/code.editor.js`: code editorのtemplate補完とkeyboard操作。
  - `apps/gui/js/app.js`: `normalizeInputDataReference`。
  - `apps/gui/js/node-form.adapter.js`: `LEGACY_ONLY_KEYS`。
- Test: `tests/playwright/specs/workflow-designer-adapter.spec.js`（loop fixtureが`source_step_id: "{{step1}}"`を使用）
- Current Specification: [Data Contract](../../features/data-contract.md)、[Connector Contract](../../features/connectors.md)（`source_step_id`によるsession参照、`loop_tasks`の実行責務）、[Frontend](../../features/frontend.md)
- Decision: [ADR Step Reference Canonical Format](../../decisions/ADR-step-reference-canonical-format.md)
- 関連Task: [TASK-036](TASK-036-design-verification-harness-and-test-evidence-pipeline.md)（検証Harness）

## Constraints

- Canonical形式と既存flowの互換方針は、影響範囲の調査結果を示し、Project ownerの承認を得てから実装する。
- 保存済みflowを承認なしに自動で書き換えない。変換が必要な場合は、明示的な移行手順を設計する。
- Current Specificationを変更する場合は、変更案を示して承認を得る。
- UX要件を追加する場合は、既存の選択UIとValidation表示を壊さない。
- templateのstep候補は実際の上流stepだけに限定し、field候補は宣言schemaまたはlatest resultのschema metadataだけから取得する。実Data行を走査せず、metadataがないfieldを推測しない。
- Suggestのkeyboard操作は既存code editorの`ArrowUp`／`ArrowDown`、`Enter`／`Tab`、`Escape`の挙動を再利用する。
- Runtimeは現行schemaのCanonical形式だけを扱い、旧wrapper形式を永続的に互換処理しない。

## Acceptance Criteria

- Canonical形式、非Canonical形式の扱い、既存flowの互換方針が決定され、記録されている。
- GUIで保存し、Validationを通過したstep参照が、Runtimeで同じ意味に解決される。`loop_tasks`とSeleniumConnectorの`source_step_id`を含む。
- 「繰り返しデータ」入力欄の選択／Suggest UIの有無と挙動が確認されている。不足がある場合はUX要件が記録され、実装した場合はその結果が確認されている。
- fixture／TestがRuntime contractと一致し、不一致だったfixtureが修正されている。
- 参照形式ごとのRuntime解決とValidationを固定するTestが追加され、該当するverification Gateで通過している。
- template入力で`{{`から上流stepを選択でき、`{{step1.`と完成済みの`{{step1}}`からmetadataに存在するfieldを選択して`{{step1.field}}`へ補完できる。metadataがない場合はfield候補を生成しない。
- template Suggestをpointerとkeyboardの両方で選択できる。

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

### 2026-09-15 Current Investigation

- Current Specificationは`.zizd`のConnector入力を`steps[].params`へ保存することと、SeleniumConnectorが`source_step_id`で先行stepのsessionを参照することを定めているが、reference-only parameterのCanonical表記は定めていない。
- 現行のreference-only parameterと境界は次のとおり。
  - `input_data`: GUIは上流step限定のselectで、選択時はbraceなしの参照名を保存する。WorkflowEngineはbraceなし、`{{name}}`、`${name}`、`{name}`を実行時に参照名へ正規化する。
  - `input_data_rename`: 現行Frontend configに入力欄はなく、WorkflowEngineの参照名正規化対象としてのみ残っている。
  - `source_step_id`: Windows loopとSelenium actionのどちらもGUIでは上流step限定のselectになり、選択時はbraceなしで保存する。WorkflowEngineの参照名正規化対象ではないため、`{{name}}`は参照値へ展開され、loopとSeleniumの両方でDataFrameのtruth-value評価に到達しうる。
  - Selenium `value_ref`: GUIは手入力可能なtext fieldで、共通Suggestは`{{name}}`を挿入する。一方、SeleniumConnectorはbraceなしのcontext keyとして評価する。未知のbraceなし値に対する専用Validationもない。
  - その他の`allowVars` field: `{{step1.field}}`等は値の展開または文字列埋め込みであり、reference-only parameterとは責務が異なる。
- tracked `.zizd`に`source_step_id`／`value_ref`の使用例はない。Playwright fixture 2件が`source_step_id: "{{step1}}"`を使うが、Runtime contractを検証していない。Windows loopのconfig placeholderだけがbrace付きで、SeleniumのplaceholderとRuntime成功例はbraceなしである。
- 「繰り返しデータ」とSelenium `source_step_id`には共通Suggest付きtext inputはなく、上流step限定のselectがある。手入力はできない。既存値が候補外の場合だけ、そのraw値を追加optionとして保持し、保存済みflowを表示時に書き換えない。

### Approved Contract and Design — 2026-09-15

- reference-only parameter（`input_data`、`input_data_rename`、`source_step_id`、`value_ref`）のCanonical形式はbraceなしのcontext key／step名とする。`{{...}}`は通常fieldの値展開・文字列templateに使用する。
- reference-only parameterの単純名wrapper（`{{name}}`、`${name}`、`{name}`）は非CanonicalとしてValidationとRuntimeで拒否し、実行時互換変換を行わない。既存flowの実行互換はTASK-033の要件にしない。
- `{{step1.field}}`等のnested参照は通常fieldでは現行どおり解決するが、reference-only parameterでは受理しない。
- RuntimeはWorkflowEngineのreference-only key集合へ`source_step_id`と`value_ref`を追加し、Connectorへ渡す前にCanonical形式を検証する。SeleniumConnectorのdirect contractはCanonical形式を受け取る現行責務を維持し、browser/session処理へ形式変換を混在させない。
- GUIは`input_data`／`source_step_id`の既存selectを維持する。Selenium `value_ref`は既存の手入力を維持しつつ、利用可能なcontext keyをbraceなしで選べるcomboへ限定変更する。通常fieldの`{{...}}`Suggestは、上流stepとmetadataに基づくnested field補完へ拡張する。
- Validationは`input_data`／`source_step_id`をCanonical形式の上流stepに限定し、`value_ref`をCanonical形式の利用可能なcontext keyに限定する。wrapperとnested参照は拒否する。
- Data Contractへreference-only parameterのCanonical形式、非Canonical形式の拒否、Runtimeがcurrent schemaだけを扱う方針を追記する。Project ownerは2026-09-15にbraceなし形式とCurrent Specificationの必要最小限の更新を承認した。
- TestはWorkflowEngineのCanonical形式／非Canonical wrapper拒否／nested template分離、Windows loopの実Workflow、Selenium `source_step_id`／`value_ref`のcontrolled fake、GUIの候補範囲・保存値・Validation、Canonical fixtureを対象にする。実Selenium browser接続は通常Gateへ追加しない。
- 通常templateのSuggestは上流stepの一覧をroot候補とし、nested候補は上流nodeの宣言schemaを優先し、不在時だけBridgeの`result.getSchema`からlatest result metadataを取得する。resolverはstep単位でcacheし、実Data行へアクセスしない。
- `{{step1.`のtokenと完成済みの`{{step1}}`を同じ補完contextとして扱い、field選択時はtoken全体を`{{step1.field}}`へ置換する。pointer操作に加えて既存code editorと同じkeyboard操作を使用する。
- `.zizd`の`schema_version`とmigration frameworkは別Task候補とする。将来のmigrationはreference-only parameterだけを対象にし、通常templateを誤変換しないことを要件に含める。

### 2026-09-15 Implementation and Verification

- [ADR Step Reference Canonical Format](../../decisions/ADR-step-reference-canonical-format.md)をAcceptedとし、Data ContractとFrontend ContractへCanonical形式、旧wrapper拒否、template Suggestを反映した。
- WorkflowEngineは4つのreference-only parameterをConnector前にCanonical形式として検証する。通常templateのnested解決は分離して維持した。
- GUIは`input_data`／`source_step_id`の上流step限定selectを維持し、Selenium `value_ref`をbraceなしcontext keyのcomboにした。loop placeholderとPlaywright fixtureはCanonical形式へ更新した。
- 通常text／textareaとcode editorのSuggestは、`{{`から参照可能な上流stepを表示し、`{{step1.`または完成済みtokenから宣言schema／`result.getSchema`のfieldを補完する。resolverはstep単位でmetadataをcacheし、実Data行を走査しない。
- TDD RED:
  - Runtime focused Testは旧wrapper受理により12 failed／10 passed。
  - Browser focused Testはreference-only control、root／nested Suggest、metadata Suggest、Validationの未実装により4 failed／8 passed。code editor nested Suggestも単独で1 failed。
- TDD GREEN／修正確認:
  - `pytest tests/unit/test_workflow_reference_contract.py tests/integration/test_step_reference_workflow.py -q`: 23 passed。
  - focused Playwright: 13 passed。非同期再描画でkeyboard選択indexが戻る競合を追加Testで検出・修正し、plain／code editor対象をrepeat 5で10 passed。
- Canonical Verification:
  - Required Gate: static-analysis 134 passed、unit 168 passed、integration 50 passed。
  - `RISK-WEB-001`: QtWebEngine／E2E 6 passed、browser-only 144 passed。
  - warningは既知の`.pytest_cache` ACL warningだけで、Test結果への影響はない。

## Remaining Work

- 別Task候補: `.zizd`へ`schema_version`を導入し、reference-only parameterの旧wrapperだけをCanonical形式へ変換するmigration frameworkを設計する。通常templateの`{{step1.field}}`は変換しない。
