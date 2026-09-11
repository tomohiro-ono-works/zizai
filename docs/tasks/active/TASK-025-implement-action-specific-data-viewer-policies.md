# TASK-025 Implement Action-specific DataViewer Policies

## Status

Deferred — TASK-016の初回DataViewer統合へ追加せず、別タイミングで着手する

## Goal

全コネクタの39アクションについて、承認済みの表示Pattern A〜Fに従い、帳票、schema編集、カラム説明、列除外、実行結果メタ情報の表示を一貫して切り替える。

## End State

利用者がどのアクションを選択しても、[Connector and Action Inventory](../../handoffs/current-connector-action-inventory.md)のPatternに対応する帳票とschema操作だけが表示される。取得データは型に応じて正しく表示・filterされ、利用不能な操作は表示されない。

## Goal Traceability

- 全39アクションのPattern A〜F解決 → WP-1、WP-3、WP-4
- Pattern別のschema編集・列除外・説明制御 → WP-1、WP-3、WP-4
- 型別filter、数値表示 → WP-2、WP-4
- TASK-024後もaction policyを維持 → WP-1、WP-3、WP-4

## Critical Path

`WP-1 Policy contract承認 → WP-2 DataViewer共通表示修正 → WP-3 Application action policy接続 → WP-4 統合検証`。

## Parallel Work

なし。Pattern contractを確定してからlibraryの汎用機能とApplication側policyを接続する。

## Task Graph Changes

- 本改修をTASK-016の初回DataViewer統合から分離する。
- Windowsコネクタ分割はTASK-024で扱う。本Taskのpolicyはaction metadataへ保持し、Connector ID変更で再設計しない。
- export実処理はTASK-022、全件paging／distributionはTASK-023のまま維持する。

## Deferred Decisions

- `DuckConnector.create_db_file`と`VectorConnector.embedding_vector_db`をPattern Eで確定するか: Project ownerがWP-1で決定する。
- Pattern Eの取得結果本体と実行結果メタ情報をaction metadataで明示するfield名: CodexがWP-1で案を提示し、Project ownerが決定する。

## Scope

- 39アクションへPattern A〜Fまたは同等の正規化済みaction policyを宣言する。
- Pattern別に帳票、表示名編集、型編集、カラム説明、列除外の利用可否を切り替える。
- Pattern Eは取得系だけ結果本体を、それ以外は実行結果メタ情報を表示する。
- Pattern FはDataViewerの帳票とschema UIを表示しない。
- ZIZ標準型をDataViewerのfilter、alignment、表示形式へ正しく対応付ける。
- 数値を右寄せし、承認された形式で桁区切り表示する。

## Out of scope

- Windows系コネクタの物理分割（TASK-024）。
- CSV／Excel／clipboard export Bridge（TASK-022）。
- 全件paging、distribution、virtualization、payload上限（TASK-023）。
- Connectorのデータ取得・出力処理自体の変更。
- 新しいアクションの追加。

## Dependencies

- TASK-016の初回DataViewer統合が完了していること。
- WP-1でPattern A〜Fと未確定2アクションが承認されること。

## Expected change area

- `docs/features/frontend-libraries.md`または承認されたDataViewer policy正本
- `apps/gui/config/config.js`
- `apps/gui/js/data-viewer.adapter.js`とnode detail統合
- vendored `zizai-data-viewer`および対応するupstream source
- 関連Static／Browser／Playwright Test

## Acceptance criteria

- 39アクションが重複・欠落なく承認Patternへ対応する。
- A／Eはschemaを変更できず、B／C／Dは承認された項目だけ変更できる。
- B／C／Dの列除外可否がInventoryどおり動作する。
- Fでは帳票とschema UIが表示されない。
- Pattern Eで取得系は結果本体、それ以外は実行結果メタ情報を表示する。
- BOOL、数値、日付、文字列で型に応じたfilter controlが表示される。
- 数値は右寄せ・桁区切りとなり、文字列は文字列表示を維持する。
- Connector処理、Bridge Protocol、WorkflowEngineを変更しない。

## Test plan

- 39アクションとPattern metadataの完全性Static Test。
- Pattern A〜Fごとのfeature matrix Unit／Browser Test。
- schema編集、列除外、description、invalid JSONの回帰Test。
- BOOL、数値、日付、文字列filterとalignment／format Test。
- Windows実画面で各Patternの代表アクションを確認するmanual smoke。

## Migration risk

Medium-High — Application action policyと汎用DataViewerのfeature制御を横断し、誤ると取得schemaの意図しない編集や出力列欠落を起こすため。

## Rollback

Yes — action policy、Application Adapter、DataViewer修正を同じversion境界へ戻し、TASK-016初回統合状態へ復帰する。

## Parallelizable

No — Pattern contractと汎用feature境界がApplication接続の前提になる。

## Work Package plan

### WP-1 Approve action display policy contract

Owner: Codex

Assignment Reason: Pattern、編集可否、未確定actionはProject ownerとの仕様決定が必要なため。

Task: Inventoryの39アクション、Pattern A〜F、結果本体／メタ情報、schema操作matrixをCurrent Specificationへ昇格できる形で確定する。

Dependencies:
- TASK開始承認。

Read Scope:
- `AGENTS.md`、`docs/features/`、Inventory、TASK-016、TASK-024、現行Config／Adapter。

Edit Scope:
- 本Task、Inventory、承認されたCurrent Specification／Decision。

Acceptance Criteria:
- 全39アクションのPatternと操作matrixがProject ownerに承認され、Deferred Decisionsが0になる。

Constraints:
- 承認前にApplicationまたはlibrary codeを変更しない。

Tests:
- action／Pattern完全性とscenarioのplan review。

Codex Verification:
- 39アクションの重複・欠落、Pattern間矛盾、TASK-022〜024との境界を確認する。

### WP-2 Correct generic DataViewer presentation

Owner: Codex

Assignment Reason: upstream libraryとvendored sourceを一致させながら、型・layout・resizeを統合判断する必要があるため。

Task: 型別filterと数値表示を汎用DataViewer責務としてTest-firstで修正する。

Dependencies:
- WP-1。

Read Scope:
- 承認仕様、DataViewer upstream／vendor、関連Test、Application CSS境界。

Edit Scope:
- 承認されたDataViewer source／vendor、関連Test、vendor記録。

Acceptance Criteria:
- 型別表示とfilterがAcceptance criteriaどおり動作し、upstreamとvendorが一致する。

Constraints:
- Application固有Connector ID、Bridge、Workflow概念をlibraryへ追加しない。

Tests:
- upstream browser Test、vendor contract、focused Playwright。

Codex Verification:
- 汎用性、CSS scope、upstream／vendor一致、回帰結果を確認する。

### WP-3 Connect action-specific policies

Owner: Codex

Assignment Reason: Config、Adapter、node detailの責務境界とTASK-024追従性を統合判断する必要があるため。

Task: action metadataからPattern policyを解決し、DataViewerの帳票とschema featureを切り替える。

Dependencies:
- WP-1、WP-2。

Read Scope:
- 承認policy、Config、Adapter、node detail、関連Test。

Edit Scope:
- Config、Application Adapter／統合、関連Test、Current Specification。

Acceptance Criteria:
- 全39アクションが対応Patternの表示と操作だけを提供し、Connector IDのハードコードに依存しない。

Constraints:
- Connector、Bridge Protocol、WorkflowEngineを変更しない。

Tests:
- policy resolver Unit、全action completeness、Pattern代表Browser／Playwright Test。

Codex Verification:
- action metadataだけで一意にpolicyが解決され、TASK-024後も移植可能なことを確認する。

### WP-4 Integrated verification

Owner: Codex

Assignment Reason: library、Application、全action policy、Windows表示を横断して最終判定するため。

Task: 自動Gateと代表actionのWindows manual smokeを実行し、EvidenceとTask状態を更新する。

Dependencies:
- WP-2、WP-3。

Read Scope:
- 全変更差分、仕様、Test結果。

Edit Scope:
- 本TaskのEvidence／状態記録だけ。

Acceptance Criteria:
- 全Acceptance criteriaと関連回帰がPASSし、未確認事項が明示される。

Constraints:
- 未確認項目をPASS扱いにしない。

Tests:
- focused Unit／Browser／Playwright、required repository Gate、Windows manual smoke。

Codex Verification:
- 仕様、実装、全39action mapping、Test Evidenceを照合する。

## Completed

- 2026-08-29にProject ownerが、全39アクションへPattern A〜Fを仮割当し、個別改修をTASK-016から将来Taskへ分離する方針を決定した。

## Remaining

- Project ownerがTASK開始を指示するまでWP-1を開始しない。

## Exact next action

Project ownerが本Taskの開始を指示した時点で、WP-1として仮割当と未確定2アクションを最終承認する。

## Termination condition

全39アクションが承認Patternの帳票・schema操作だけを提供し、型別表示、filter、列除外が自動TestとWindows実画面で確認されること。
