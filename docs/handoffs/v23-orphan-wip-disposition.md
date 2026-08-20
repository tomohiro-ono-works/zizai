# v23 Orphaned WIP / Missing-Source Disposition

- Related task: TASK-003
- Date: 2026-08-18
- Status: Approved

## Scope and constraints

- 対象は、現行branchにソースがない202607 WIP、孤立モジュール、欠落した旧モジュール、関連Testsとする。
- 本調査ではソースの復元、統合、削除を行わない。
- 現行の`connectors/`（ADR-v23の将来配置`apps/connectors/`に対応する責務）と現行コネクターは維持する。コネクターフォルダー自体を廃止しない。
- 過去に削除・改名された個別connectorを復元しない判断と、現行connectorを維持する判断を混同しない。

## Recommended policy

202607 WIPを一括復元しない。現行コードと互換性が実証できた資産だけを追加Taskで選択的に統合し、それ以外はGit履歴へ保存する。生成物だけが残るものは削除候補とする。

## Confirmed deletion decision

- 現行treeに残る`.pyc`はsource、test definition、設計資料として扱わず、削除する。
- Disposition表ではTASK-003の分類語彙に合わせて`REMOVE_CANDIDATE`と記載するが、削除可否のユーザー判断は承認済みとする。
- 実ファイルの削除はTASK-003の範囲外とし、後続のcleanup作業で実施する。

## Production WIP disposition

| Target | Disposition | Evidence / rationale |
| --- | --- | --- |
| `app/runtime/` 7 files | PRESERVE_HISTORY | `2e6ab92`でのみ追加され、現行Applicationからimportされていない。現行Bridgeとrun管理責務が重複する。 |
| `app/services/` 19 files | PRESERVE_HISTORY | `2e6ab92`でのみ追加され、現行Applicationからimportされていない。現行Bridgeと責務が重複し、202607 document schemaへ依存する。 |
| `shared/` 5 files | PRESERVE_HISTORY | `2e6ab92`でのみ追加され、利用元のruntime/servicesも孤立している。 |
| `core/connector_factory.py` | PRESERVE_HISTORY | 現行`WorkflowEngine`の動的connector解決と重複し、現行Applicationから参照されていない。 |
| `core/security_sanitizer.py`, `core/utils.py`の痕跡 | REMOVE_CANDIDATE（削除承認済み） | Git履歴にソースがなく、現行には`.pyc`だけが残る。現行importもない。 |
| 202607 `app/gui/`分割module 8 files | PRESERVE_HISTORY | `bridge_contract`、`bridge_dispatcher`、`bridge_events`、`bridge_security`、`host_external`、`host_navigation`、`qwebchannel_transport`、`single_instance`は`2e6ab92`にsourceがあるが現行では未採用。設計資料として保持する。 |
| 上記分割moduleの現行`.pyc` | REMOVE_CANDIDATE（削除承認済み） | sourceではない生成物。現行`app/gui/host.py`と`bridge.py`は削除対象ではなく、将来`apps/desktop/`へ移す。 |
| `core/sqlbilder_commands.py` | EXCLUDE | 2026-04-08に追加され、2026-06-22のrelease commitで明示削除。復元しない。 |
| `core/sqlbilder_commands.pyc` | REMOVE_CANDIDATE（削除承認済み） | 削除済みsourceの生成物。 |

### Compatibility evidence

- WIP `WorkflowDocumentService` は`flows`をflow_id-keyed形式として要求し、`output_variable`と旧`flows.edges`形式を拒否する。現行`template/*.zizd`は`output_variable`と`flows.edges`を使用する。
- WIP `WorkflowExecutionService` は`WorkflowEngine(..., step_result_callback=...)`を呼ぶが、現行`core/workflow_engine.py`のconstructorは同引数を受け取らない。
- WIPのruntime/servicesを復元すると、既存`.zizd`と現行Bridge/Engineのどちらかを同時変更する必要があり、単純統合にならない。

## Legacy connector disposition

現行の`connectors/`と、その将来の責務配置`apps/connectors/`は維持する。以下は過去の個別ファイルだけを対象とする。

| Historical path | Disposition | Git evidence |
| --- | --- | --- |
| `connectors/bq_connector.py` | EXCLUDE | 2026-02-27に`bigquery_connector.py`へ100% rename。現行`BQConnector`は後者に存在する。 |
| `connectors/api_connector.py` | EXCLUDE | 2026-06-04のrelease commitで明示削除。現行参照なし。 |
| `connectors/dummy_connector.py` | EXCLUDE | 2026-06-04のrelease commitで明示削除。現行参照なし。 |
| `connectors/outlook_connector.py` | EXCLUDE | 2026-06-04のrelease commitで明示削除。現行参照なし。 |
| `connectors/rpa_slack_connector.py` | EXCLUDE | 2026-06-04のrelease commitで明示削除。現行参照なし。 |
| `connectors/operation_connector.py` | EXCLUDE | 2026-06-22のrelease commitで明示削除。現行参照なし。 |
| `connectors/web_connector.py` | EXCLUDE | 2026-06-22に`selenium_connector.py`へ82% renameされ、同commitで`chrome_connector.py`が追加された。 |
| `connectors/file_connector.py`の痕跡 | REMOVE_CANDIDATE | Git履歴にソースがなく、現行には`.pyc`だけが残る。現行参照なし。 |
| 上記旧connectorの残存`.pyc` | REMOVE_CANDIDATE（削除承認済み） | 生成物であり、現行ソース・設定から参照されない。 |

## Related test disposition

202607のconnector関連9ファイル、38 test casesを現行コードへ実行した結果は、28 passed / 10 failedだった。失敗は主に旧result contractと欠落`DummyConnector`への依存であり、9ファイルの一括復元は行わない。

旧testは失敗を理由に削除せず、次の基準で保持方法を分ける。

- `INTEGRATE`: 現行production contractを直接検証できる自動test候補。後続Taskでcanonical test treeへ戻し、再実行してから採用する。
- `USER_TEST`: 旧実装・fixtureには依存するが、利用者操作として残す価値があるもの。実装非依存の手順と期待結果を抽出して保持する。
- `PRESERVE_HISTORY`: 202607内部設計、欠落module、旧schemaを検証するもの。設計参考としてGit履歴に保持し、そのまま現行testへ戻さない。
- `EXCLUDE`: assertionを持たない一時debug/probe。現行testおよびユーザーテストへ移さない。

バックエンド側の旧test definitionはすべて保持する。`INTEGRATE`対象以外も削除せず、`PRESERVE_HISTORY`として設計参考に残す。

| Target | Disposition | Evidence / treatment |
| --- | --- | --- |
| `test_csv_connector.py` | INTEGRATE | 現行コードに対して1/1 passed。 |
| `test_dataintegration_connector.py` | INTEGRATE | 現行コードに対して3/3 passed。 |
| `test_excel_connector.py` | INTEGRATE | 現行コードに対して5/5 passed。 |
| `test_schema_apply_common.py` | INTEGRATE | 現行コードに対して2/2 passed。 |
| `test_chrome_connector.py` | PRESERVE_HISTORY | 1/2 passed。失敗caseは旧result contractを要求する。 |
| `test_selenium_connector.py` | PRESERVE_HISTORY | 2/5 passed。失敗caseは旧result contractを要求する。 |
| `test_vector_connector.py` | PRESERVE_HISTORY | 2/3 passed。失敗caseは旧result contractを要求する。 |
| `test_windows_connector.py` | PRESERVE_HISTORY | 12/16 passed。失敗caseは旧result contractまたは旧重複名仕様を要求する。 |
| `test_step_run_bridge.py` | PRESERVE_HISTORY | 0/1 passed。現行Engineが利用しない`connector_factory`と欠落`DummyConnector`を前提とする。 |
| `logger_mode_probe.py` | EXCLUDE | 自動testではない一時probeであり、統合対象にしない。 |
| runtime/services/旧Bridge構造に依存するPython tests | PRESERVE_HISTORY | 現行にない`app.runtime`、`app.services`、Bridge分割moduleをimportする。production要件の根拠にはしない。 |
| `tests/native/gui_host_smoke.py` | PRESERVE_HISTORY | 現行`run_webview_app`に存在しない`ready_callback`引数を使用する。 |
| `tests/native/qwebchannel_webengine_smoke.py` | PRESERVE_HISTORY | 現行にない`qwebchannel_transport`等へ依存する。 |
| 履歴上の`tests/ui_analysis/` source 38 files | PRESERVE_HISTORY | `2e6ab92`に`run_inventory.py`と`ui_analysis_tool`があるが、現行からsourceが欠落している。そのまま復元せず別Taskで判断する。 |
| 現行`tests/ui_analysis/ui_analysis.ps1` | PRESERVE_HISTORY | 実在するが、呼出先`run_inventory.py`が欠落しており実行不能。現行Skillもこの入口を参照するため、既知の運用障害として別Taskへ引き継ぐ。 |
| 現行`tests/ui_analysis/out/` | REMOVE_CANDIDATE | 過去実行の生成物。必要Evidenceを確認してから削除可否を判断する。 |
| 現行に残るtestsの`.pyc` | REMOVE_CANDIDATE（削除承認済み） | 実行生成物であり、source/test definitionではない。 |

### Bridge test disposition

旧Bridge test 9 casesを現行Bridgeへ実行した結果は3 passed / 4 failed / 2 skippedだった。現行契約に合わせて再利用できるcaseと、202607 WIP専用caseをファイル単位ではなくcase単位で分ける。

| Historical case | Disposition | Evidence / treatment |
| --- | --- | --- |
| `test_pick_folder_uses_native_picker_for_empty_current_value` | INTEGRATE | 現行Bridgeでpassed。native picker委譲を検証する。 |
| `test_pick_folder_uses_edit_dialog_for_existing_hidden_ref` | PRESERVE_HISTORY | 現行にない`hidden_value_service`を前提とする202607設計。 |
| `test_document_save_always_uses_save_callback` | PRESERVE_HISTORY | 現行にない`_handle_documents_load`系contractを前提とする。 |
| `test_document_save_cancelled_when_callback_returns_none` | PRESERVE_HISTORY | 同上。document serviceを採用する場合の設計参考として残す。 |
| `test_coordinate_capture_start_delegates_to_native_callback` | INTEGRATE | 現行Bridgeでpassed。native callback委譲を検証する。 |
| `test_workspace_delete_deletes_regular_file` | INTEGRATE | 現行Bridgeでpassed。通常file削除を検証する。 |
| `test_workspace_delete_rejects_path_escape` | INTEGRATE | scenarioは現行でも有効。旧期待`ValueError`を現行contractの`PermissionError`へ更新して採用する。 |
| symlink target / path component拒否 2 cases | INTEGRATE | security regressionとして保持する。環境上skipされたため、Windowsで安定するplatform-gated testへ整える。 |

### Frontend / Playwright test disposition

履歴上のPlaywrightは37 spec filesで、現行treeにはcanonical Playwright source/configがない。旧specを一時的に現行`static/`へ向けると、現行でも成立するUI確認がある一方、欠落`app.services.catalog_service`、旧`zizEmbeddedApi.getDocument`、旧workspace fixtureへの依存が多数確認された。このため旧suiteをそのまま復元せず、次の単位で保持する。

| Group | Disposition | Files / treatment |
| --- | --- | --- |
| 現行UIへ直接向けられる回帰test | INTEGRATE | `ui-shell.spec.js`、`detail-panel-left-gap.spec.js`、`ui-fields-reference-warning.spec.js`。canonical runnerを再構築した後、現行表示・現行contractで全caseを再確認して採用する。`detail-panel-left-gap`は現行画面で1/1 passedを確認済み。 |
| project選択・workspace・保存・tab操作 | USER_TEST | `home-project-select`、`project-select`、`root-change-dirty-save`、`tmp-explorer-create-folder`、`tmp-py-three-tabs-switch`、`tmp-save-dialog-buttons`、`tmp-save-large-mtime`、`tmp-save-on-close`、`tmp-save-smoke`、`workspace-explorer-open`、`workspace-pane-visibility`、`workspace-tab-pane-switch`、`workspace-two-flow-split`。旧stub/DOM selectorを持ち込まず、操作と期待結果を抽出する。 |
| data area・import・run・document操作 | USER_TEST | `data-area-colors`、`data-panel-visibility`、`tabular-import-adapter`、`standalone-run-ui`、`production-workflow-document`。現行にないservice/commandを自動test要件とせず、利用者視点の表示・実行・cancel・保存scenarioだけを残す。 |
| screenshot/capture specs | USER_TEST | `project-select-capture`、`tmp-py-switch-capture`、`workspace-split-capture`、`workspace-two-dataflow-capture`。capture codeや旧画像を正本にせず、visual acceptanceの手順・確認点として残す。 |
| 202607 component / adapter internals | PRESERVE_HISTORY | `app-shell-adapter`、`app-shell-library`、`catalog-adapter`、`classic-workflow-designer`、`result-adapter`、`run-adapter`、`tabular-import-assistant`、`workflow-designer`、`workflow-document-store`、`workspace-documents-adapter`。欠落module・fixture・202607 command/schemaの設計参考として保持する。 |
| 一時debug specs | EXCLUDE | `tmp-dump-sidebar-buttons`、`tmp-preview-hidden-ancestor`。assertionのないdump/debugであり、再利用要件を持たない。 |
| `static/test-fixtures/` 8 files | PRESERVE_HISTORY | 202607 component専用fixture。production UI testとしては復元せず、対応する設計参考testと一緒に履歴保持する。 |
| `tests/docs/` 6 files | USER_TEST | 旧結果を現行結果とみなさず、再利用可能な操作・期待結果だけをユーザーテスト資料へ抽出する。 |

Frontendの`INTEGRATE`候補は、今回の一時実行が長時間待機しclean exitしなかったため、passed未確認caseを採用済みとは扱わない。後続Taskではcanonical runner、timeout、test fixtureを先に確定し、spec単位でgreenを確認してから統合する。

## Follow-up task required for INTEGRATE

### Restore four verified connector test files

- Restore only the four fully passing files listed above into the canonical tracked test tree.
- Do not change production code to make historical assertions pass.
- Run the 11 test cases against the then-current connector code and require 11/11 passed.
- Review the assertions and confirm they materially validate the current connector contract, not merely execution success. The current four files were inspected and contain substantive shape, dtype, filtering, error, progress-event, and workbook-loading assertions.
- Confirm `.gitignore` and CI collect the restored tests intentionally.
- Treat partially passing historical files as design references only; any new cases must assert the current connector contract.

### Recover Bridge and frontend coverage selectively

- Bridgeは上記6 reusable casesを現行exception contractとplatform条件に合わせて再作成する。WIP専用3 casesのためにproduction serviceを復元しない。
- Frontendはまず`ui-shell`、`detail-panel-left-gap`、`ui-fields-reference-warning`をcanonical runner上で再検証する。
- `USER_TEST`群は旧DOM selector、Bridge stub、202607 fixtureをコピーせず、操作、前提、期待結果だけをtest case資料へ移す。
- capture/debug outputは正本にせず、必要なvisual acceptance項目だけを残す。

## Alternatives not selected

- Full 202607 integration: rejected because document schema, Engine API, Bridge responsibility, and tests are incompatible with the current Application.
- Full exclusion: rejected because four test files have been verified against current production code and can recover useful regression coverage.

## Remaining risk

- PRESERVE_HISTORYは将来のservice分割を否定しない。必要になった場合は、202607 sourceの復元ではなく、現行Message contractと`.zizd`互換性を前提に再設計する。
- `tests/ui_analysis/`を再利用する場合は、現行Skillのentrypoint/output contractを確定する別Taskが必要になる。
- Claude review found the current `ui_analysis.ps1` entrypoint is broken because its source target is missing; this is recorded as a separate operational issue, not evidence for restoring the 202607 source as-is.
