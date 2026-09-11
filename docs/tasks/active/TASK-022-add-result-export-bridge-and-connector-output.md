# TASK-022 Add Result Export Bridge and Connector Output

## Status

Deferred — TASK-016とは同じタイミングで実装・releaseしない

## Goal

DataViewerのCSV／Excel／clipboard操作を、用途限定の専用Bridgeと既存Connector境界へ安全に接続する。

## End State

利用者がDataViewerから保存先を選び、元のstep結果全件をCSVまたはExcelとしてConnector経由で出力できる。clipboardは現在pageだけを最大5,000行で専用Bridgeから書き込める。libraryはBridge、path、Connector、file生成、clipboardを認識しない。

## Goal Traceability

- 専用Bridgeとsecurity boundaryの確定 → WP-1、WP-2。
- CSV／ExcelのConnector経由全件出力 → WP-3。
- clipboardの現在page限定出力 → WP-3。
- DataViewer export eventとの接続 → WP-4。
- file内容、cancel、権限、回帰の確認 → WP-5。

## Critical Path

`WP-1 現行境界調査 → WP-2 Bridge／Connector contract承認 → WP-3 backend実装 → WP-4 DataViewer接続 → WP-5統合検証`。

## Parallel Work

なし。保存先、Connector呼出方法、clipboard payload上限を確定してから実装する。

## Task Graph Changes

- TASK-016 WP-7からCSV／Excel／clipboardの実処理を分離する。
- TASK-016ではDataViewerの汎用export eventを維持するが、利用不能なexport操作をApplicationへ表示しない。
- 本TaskはTASK-016の初回release完了後に開始する。

## Deferred Decisions

- DataViewerから既存CSV／Excel Connectorを呼ぶApplication serviceの形。
- native save dialogで選択したpathをFrontendへ公開せずConnectorへ渡す方法。
- 専用Bridge command名、payload、response、cancel／error contract。
- clipboardをOS clipboardへ書くBackend境界と最大byte数。

## Scope

- 結果export専用Bridge contractとApplication serviceを追加する。
- CSV／Excelはsort／filterの影響を受けない元のstep結果全件をConnector経由で出力する。
- clipboardは現在pageだけを対象とし、最大5,000行とする。
- native save dialog、cancel、拡張子、上書き、失敗表示を扱う。
- DataViewerの汎用export eventをApplication Adapterへ接続する。

## Out of scope

- DataViewer library内部のfile生成、path処理、clipboard write。
- 任意pathの汎用read／write Bridge。
- export時のsort／filter適用。
- TASK-016と同じreleaseへの追加。

## Dependencies

- TASK-016 WP-7が完了していること。
- TASK-023で全step結果をexport処理へ渡すBackend境界が決定していること。
- TASK開始時に既存CSV／Excel Connectorの出力契約を確認すること。

## Expected change area

- `apps/common/contracts/bridge/`
- `apps/desktop/`
- 承認されたCSV／Excel ConnectorとApplication service
- DataViewer Application Adapter
- 関連Unit／Integration／E2E TestとCurrent Specification

## Acceptance criteria

- CSV／Excelは元のstep結果全件をConnector経由で出力し、sort／filterの影響を受けない。
- clipboardは現在pageと一致し、5,000行および承認されたbyte上限を超えない。
- save dialog cancel時にfile、state、errorを残さない。
- Frontendへnative path、DataFrame、任意filesystem capabilityを公開しない。
- libraryにApplication固有概念を追加しない。
- export中の重複操作と遅延応答で別結果を上書きしない。

## Test plan

- Bridge payload、capability、invalid request、cancel／error Unit Test。
- CSV／Excel Connectorの全件数、列順、型、拡張子Integration Test。
- clipboard 0行、通常page、5,000行、byte上限Test。
- DataViewer export eventからApplication AdapterまでのBrowser Test。
- Windows native save dialogとclipboardのmanual smoke。

## Migration risk

High — Bridge capability、native path、Connector、全件file出力、OS clipboardを横断するため。

## Rollback

Yes — export Adapter、専用Bridge、Connector呼出を一単位で戻し、DataViewer本体とWP-7表示は維持する。

## Parallelizable

No — contract承認がbackendとFrontend双方の前提になる。

## Work Package plan

### WP-1 Inspect export boundaries

Owner: claude-assist

Assignment Reason: 対象を既存Bridge、Host callback、CSV／Excel Connector、clipboardに限定した読み取り専用調査として委譲できるため。

Task: 専用BridgeとConnector経由出力に必要な現行入口、再利用可能部分、security gapを調査する。Application codeは変更しない。

Dependencies:
- TASK開始承認。

Read Scope:
- Bridge Protocol／Runtime、Desktop Host、CSV／Excel Connector、DataViewer Adapter、関連Test。

Edit Scope:
- 本TaskのEvidenceだけ。

Acceptance Criteria:
- save dialog、path保持、Connector呼出、clipboard、error／cancelの現行境界と不足が明示される。

Constraints:
- 調査中にBridge、Connector、Application codeを変更しない。

Tests:
- 既存contract Testの確認だけ。

Codex Verification:
- 調査が対象経路に限定され、推測で新contractを固定していないことを確認する。

### WP-2 Approve export contract

Owner: Codex

Assignment Reason: Bridge capability、path security、Connector利用方法はProject owner判断を必要とするため。

Task: WP-1を基に専用Bridge command、payload、保存先、Connector呼出、clipboard byte上限、cancel／error contractを決定する。

Dependencies:
- WP-1。

Read Scope:
- WP-1 Evidence、Architecture、Bridge／Connector contract。

Edit Scope:
- 承認されたCurrent Specification、Decision、本Task。

Acceptance Criteria:
- 全Deferred DecisionがProject ownerの承認結果へ対応する。

Constraints:
- 任意filesystem capabilityへ拡張しない。

Tests:
- contract scenario review。

Codex Verification:
- CSV／Excel／clipboardの正常、cancel、error、上限が契約で一意になることを確認する。

### WP-3 Implement Bridge and Connector export service

Owner: claude-assist

Assignment Reason: WP-2の承認契約に基づくBridge／ConnectorのTest-first実装として限定できるため。

Task: 専用Bridge、native save dialog、CSV／Excel Connector経由出力、clipboard writeを実装する。

Dependencies:
- WP-2。

Read Scope:
- WP-2対象境界と関連Test。

Edit Scope:
- 承認されたBridge／Host／Application service／Connector／Testだけ。

Acceptance Criteria:
- 専用Bridge経由で全件CSV／Excelとpage clipboardが契約どおり動作する。

Constraints:
- libraryを変更せず、Frontendへnative pathやDataFrameを渡さない。

Tests:
- Unit、Bridge Integration、Connector output Test。

Codex Verification:
- capability範囲、出力件数、Connector利用、cancel／errorを独立確認する。

### WP-4 Connect DataViewer export actions

Owner: claude-assist

Assignment Reason: 汎用library eventと承認済みApplication serviceを接続する限定的Frontend作業として委譲できるため。

Task: DataViewerのCSV／Excel／clipboard eventをApplication Adapterへ接続し、loading、success、cancel、errorを表示する。

Dependencies:
- WP-3。

Read Scope:
- DataViewer Adapter、WP-2 contract、WP-3 service、関連Browser Test。

Edit Scope:
- DataViewer Application Adapter、承認された表示、関連Test。

Acceptance Criteria:
- 3操作が正しいscopeで1回だけ要求され、遅延応答が現在結果を上書きしない。

Constraints:
- libraryへBridgeやApplication概念を追加しない。

Tests:
- Adapter Unit、Browser Integration、out-of-order response Test。

Codex Verification:
- event payload、表示状態、重複要求、stale responseを独立確認する。

### WP-5 Integrated verification

Owner: Codex

Assignment Reason: Bridge、Connector、DataViewer、native UIを実装担当と独立して横断確認するため。

Task: 自動GateとWindows manual smokeを実行し、EvidenceとTask状態を更新する。

Dependencies:
- WP-3、WP-4。

Read Scope:
- 全差分、仕様、Test結果。

Edit Scope:
- 本TaskのEvidence／状態記録だけ。

Acceptance Criteria:
- 全Acceptance criteriaと回帰GateがPASSし、未確認事項が明示される。

Constraints:
- 未確認項目をPASS扱いにしない。

Tests:
- focused Unit／Integration／E2E、required Gate、Windows manual smoke。

Codex Verification:
- 仕様、実装、出力file、clipboard、Evidenceを照合する。

## Completed

- 2026-08-27にProject ownerが、専用Bridgeを追加し、CSV／ExcelをConnector経由で出力する方針を決定した。
- 同時にBridge／Connector変更をTASK-016へ含めず、将来Taskへ分離することを決定した。

## Remaining

- Project ownerがTASK開始を指示するまでWP-1を開始しない。

## Exact next action

Project ownerが本Taskの開始を指示した時点で、WP-1の限定調査を行う。

## Termination condition

専用BridgeとConnector経由でCSV／Excel全件出力およびpage限定clipboardが安全に動作し、自動TestとWindows manual smokeがPASSすること。
