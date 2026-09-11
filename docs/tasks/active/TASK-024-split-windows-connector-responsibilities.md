# TASK-024 Split Windows Connector Responsibilities

## Status

Deferred — DataViewerの表示パターン整理およびTASK-016とは分離し、別タイミングで着手する

## Goal

現在の`WindowsConnector`に混在するfile操作、外部入力、実行制御を、責務の異なる3つのコネクタへ分割する。

## End State

利用者がfile操作、Windows外部入力、ワークフロー制御を別々のコネクタとして選択でき、現在の10アクションが重複・欠落なく適切な責務へ所属する。Backend、UIカタログ、WorkflowEngineの専用制御、関連TestとCurrent Specificationが同じ分類を参照する。

## Goal Traceability

- file操作4件の独立コネクタ化 → WP-1、WP-2、WP-3
- 外部入力3件の独立コネクタ化 → WP-1、WP-2、WP-3
- 実行制御3件の独立コネクタ化 → WP-1、WP-2、WP-3
- `loop_tasks`専用経路の維持 → WP-2、WP-3
- 旧分類や参照残りの解消 → WP-3

## Critical Path

`WP-1 分割契約の承認 → WP-2 Backend／Catalog分割 → WP-3 統合検証`。

## Parallel Work

なし。Connector ID、表示名、action所属を確定してからBackendとUIを同じ境界で変更する。

## Task Graph Changes

- Windowsコネクタ分割をTASK-016およびDataViewer表示修正から分離する。
- DataViewerの表示パターンは現行action IDへ仮割当し、本Task完了時に新しいConnector IDへ追従させる。
- TASK-024の実装前にTASK-016の初回DataViewer統合を完了させる。

## Deferred Decisions

- 正式Connector IDと画面表示名: Project ownerがWP-1で決定し、WP-2へ適用する。作業名は`WindowsFileConnector`、`WindowsInputConnector`、`ControlConnector`とする。
- `ControlConnector`をConnector classとして実装するか、WorkflowEngine制御用Catalog Adapterとして実装するか: CodexがWP-1で現行経路を確認し、Project ownerが決定する。

## Scope

- `rename_and_move_file`、`search_files_by_name`、`search_text_in_files`、`create_markdown_file`をfile操作責務へ分離する。
- `mouse_click`、`input_text`、`send_keys`をWindows外部入力責務へ分離する。
- `define_values`、`loop_tasks`、`wait`を実行制御責務へ分離する。
- UIカタログ、Backend discovery、WorkflowEngine special path、icon／label、Test、Current Specificationを同時に更新する。
- Repository内の現行workflow fixtureを新しいConnector IDへ更新する。

## Out of scope

- 各アクションの機能変更。
- DataViewer本体の表示・filter・schema編集修正。
- 新しいfile操作、Windows入力、制御アクションの追加。
- 旧`WindowsConnector` IDの互換shim追加。

## Dependencies

- TASK-016の初回DataViewer統合範囲が完了していること。
- WP-1で正式Connector IDと`ControlConnector`の実行境界が承認されること。

## Expected change area

- `apps/gui/config/config.js`
- `apps/connectors/`
- `apps/core/workflow_engine.py`とConnector discovery境界
- `apps/gui/`のConnector選択・asset
- Repository内workflow fixture
- 関連Unit／Integration／E2E TestとCurrent Specification

## Acceptance criteria

- 現在の10アクションが3コネクタへ重複・欠落なく割り当てられる。
- file操作、外部入力、実行制御が画面上で別コネクタとして選択できる。
- 全アクションが従来と同じparameterと結果契約で実行できる。
- `loop_tasks`がWorkflowEngineの専用経路で正しく実行される。
- 旧`WindowsConnector`を現行実行先として参照するConfig、Code、Test、active documentationが0件になる。
- 現行workflow fixtureが新しいConnector IDで読込・保存・実行できる。

## Test plan

- Connector catalogのID、label、action所属を検証するStatic／Unit Test。
- 3コネクタの`execute(action, params, context)` dispatch Test。
- `loop_tasks`、`define_values`、`wait`のWorkflowEngine Integration Test。
- Connector選択とaction切替のBrowser Test。
- 更新したworkflow fixtureのload／save／run回帰。

## Migration risk

High — Connector IDはUIカタログ、Backend discovery、Workflow保存値、WorkflowEngine special pathを横断するため。

## Rollback

Yes — Catalog、Backend、WorkflowEngine、fixtureを同じ変更単位で旧`WindowsConnector`へ戻す。

## Parallelizable

No — 正式IDと制御境界の承認が全実装の前提になる。

## Work Package plan

### WP-1 Approve connector split contract

Owner: Codex

Assignment Reason: Connector ID、制御責務、保存値の変更はProject ownerとの仕様判断が必要なため。

Task: 現行10アクションと実行経路を確認し、3コネクタの正式ID、表示名、action所属、`ControlConnector`境界を決定する。

Dependencies:
- TASK開始承認。

Read Scope:
- `AGENTS.md`、`docs/features/`、`apps/gui/config/config.js`、`apps/connectors/windows_connector.py`、`apps/core/workflow_engine.py`、関連Test／fixture。

Edit Scope:
- 本Task、承認されたCurrent Specification／Decisionだけ。

Acceptance Criteria:
- 3コネクタのID、表示名、10アクションの一意な所属、制御実行境界がProject ownerに承認される。

Constraints:
- 承認前にApplication codeを変更しない。

Tests:
- action対応表と保存・実行scenarioのplan review。

Codex Verification:
- 全10アクションが一度だけ割り当てられ、実行責務と表示分類が矛盾しないことを確認する。

### WP-2 Implement connector split

Owner: Codex

Assignment Reason: Backend discovery、WorkflowEngine special path、Catalogを同時に変更する横断統合判断が必要なため。

Task: 承認された3コネクタをBackendとUIカタログへ実装し、Repository内workflow fixtureを新IDへ移行する。

Dependencies:
- WP-1。

Read Scope:
- WP-1承認仕様、Expected change area、関連Test／fixture。

Edit Scope:
- 承認されたConfig、Connector、WorkflowEngine、Frontend asset、fixture、Test、Current Specification。

Acceptance Criteria:
- 3コネクタから全10アクションを選択・実行でき、旧IDの現行参照が残らない。

Constraints:
- action parameter、結果契約、処理内容を変更しない。互換shimを追加しない。

Tests:
- Catalog、dispatch、WorkflowEngine、Browser、fixture回帰Test。

Codex Verification:
- action所属、dynamic discovery、`loop_tasks`専用経路、旧参照0件を独立確認する。

### WP-3 Integrated verification

Owner: Codex

Assignment Reason: Config、Backend、WorkflowEngine、Frontend、保存fixtureの整合を横断して最終判定するため。

Task: 自動GateとWindows実画面確認を行い、仕様・実装・Evidenceを照合する。

Dependencies:
- WP-2。

Read Scope:
- 全変更差分、関連仕様、Test結果。

Edit Scope:
- 本TaskのEvidence／状態記録だけ。

Acceptance Criteria:
- 全Acceptance criteriaと関連回帰がPASSし、3コネクタが実画面で選択・実行できる。

Constraints:
- 未確認項目をPASS扱いにしない。

Tests:
- 全focused Test、required repository Gate、Windows manual smoke。

Codex Verification:
- 仕様、実装、workflow保存値、Test Evidenceを照合する。

## Completed

- 2026-08-29にProject ownerが、Windowsのfile操作、外部入力、実行制御をコネクタ自体から分割し、TASK-016とは別Taskで扱う方針を決定した。

## Remaining

- Project ownerがTASK開始を指示するまでWP-1を開始しない。

## Exact next action

Project ownerが本Taskの開始を指示した時点で、WP-1の限定調査と正式名称の承認を行う。

## Termination condition

Windows系10アクションが承認済み3コネクタへ重複・欠落なく分割され、Catalog、Backend、WorkflowEngine、workflow fixture、UI、Testが同じ分類を使用すること。
