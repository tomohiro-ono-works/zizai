# TASK-023 Investigate Paged Result Delivery

## Status

Deferred investigation — TASK-016初期版とは同じタイミングで実装・releaseしない

## Goal

DataFrame全件をFrontendへ一括転送せず、Python側へ安全に保持して要求pageだけをBridgeへ返す分割転送の必要性、方式、性能、解放条件を調査する。

## End State

現行`ui_cache`とPython contextの実際の寿命が確認され、結果Store、5,000行page、全件sort／filter、全件数、distribution、再実行時の解放を実装すべきかProject ownerが判断できる。調査だけではApplication codeを変更せず、採用時は別の実装計画を承認する。

## Goal Traceability

- 現行DataFrame／`ui_cache`／Bridge resultの寿命を特定する → WP-1。
- 一括転送、分割転送、streaming、file-backed方式の必要十分な比較を行う → WP-2。
- memory、速度、security、lifecycleを含む採否を決定する → WP-3。

## Critical Path

`WP-1 現行経路確認 → WP-2 限定比較・測定 → WP-3 Project owner decision`。

## Parallel Work

なし。現行経路を確認してから比較条件を固定する。

## Task Graph Changes

- TASK-016初期版は既存Bridgeの先頭100行PreviewだけをDataViewer local modeへ接続する。
- Python結果Store、5,000行page、全件sort／filter、全件数、上位30区分distribution、virtualized renderingをTASK-016から本調査へ移す。
- TASK-022の全件CSV／Excel出力は、本調査で全step結果へのBackend到達方法を決定した後に計画する。

## Deferred Decisions

- DataFrameをmemoryへ保持するか、temporary file／databaseへ退避するか。
- 保持対象を最新runだけにするか、step／tab／flow単位にするか。
- memory／row／byte上限と、上限超過時の縮退方法。
- 再実行、tab close、flow close、Application終了時の解放条件。
- Bridge page payloadの最大row／column／byteとtimeout。
- 採用時にremote mode／virtualizationをDataViewer libraryへ追加するか。

## Candidate requirements to evaluate

- page sizeは5,000行固定。
- sort／filterは元結果全件へ適用する。
- filter候補は現在pageの5,000行sampleから作る。
- filter後件数は画面へ表示せず、paging制御だけに使う。
- distributionは元結果全件から列ごとの件数上位30区分を遅延取得し、31位以下を`その他`へ集約しない。
- FrontendへDataFrame全件を一括直列化しない。

## Scope

- 現行Workflow Engine、Python context、report、`ui_cache`、Bridge latest resultの追跡。
- representativeなrow数／column数／value幅でmemory、serialization、page response時間を測定する。
- 分割転送と代替方式を、実装規模を増やさず比較する。
- 採否、責務境界、follow-up実装Taskの必要条件を記録する。

## Out of scope

- Python結果Store、paged Bridge、remote DataViewerの実装。
- Connector、export、clipboardの変更。
- TASK-016初期版への全件機能追加。
- 調査前のcache保持期間や上限の推測実装。

## Dependencies

- TASK-016初期版のDataViewer local mode範囲が確定していること。

## Expected read area

- Workflow Engineのresult／context／report生成
- Desktop Bridgeのlatest result／Preview／DataVolume経路
- DataViewer local／remote候補APIと関連Test
- 実行／tab／flow lifecycle

## Acceptance criteria

- 通常DataFrame結果がreportでは`result=None`、先頭100行`ui_cache`になる経路をTestまたはtraceで固定する。
- Python contextに残るDataFrameの所有者、参照可能期間、解放契機が示される。
- 少なくともmemory保持型分割転送とfile-backed方式を、memory、速度、実装量、cleanup、securityで比較する。
- 5,000行pageのrow数だけでなく最大column数／byte量と応答時間を測定する。
- 採用／不採用／追加調査の判断と、採用時の実装Task境界がProject ownerに承認される。

## Test plan

- 100行、5,000行、100,000行以上と幅広tableのread-only benchmark。
- 再実行、tab close、flow close後の参照とmemory解放確認。
- out-of-order page requestと取消可能性のcontract scenario。
- 既存Bridge payloadを変更しない調査用Test／trace。

## Migration risk

Medium during investigation — read-only中心だが、大量DataFrameのbenchmarkでmemoryを消費するため上限を事前定義する。採用後の実装riskは別計画で評価する。

## Rollback

Not applicable — 本Taskは調査とDecisionだけでApplication codeを変更しない。

## Parallelizable

No — 現行ownership確認が方式比較の前提になる。

## Work Package plan

### WP-1 Trace current result ownership

Owner: claude-assist

Assignment Reason: Workflow EngineからBridgeまでの限定されたread-only経路調査として委譲できるため。

Task: DataFrame、context、report、`ui_cache`、Bridge latest stateの生成・保持・破棄経路をTestで確認する。

Dependencies:
- TASK開始承認。

Read Scope:
- Workflow Engine result path、Desktop Bridge result path、関連Test。

Edit Scope:
- 調査Testと本Task Evidenceだけ。Application codeは変更しない。

Acceptance Criteria:
- ownership、lifetime、通常／error／再実行経路が推測ではなく一次情報で示される。

Constraints:
- production codeを変更しない。

Tests:
- result／context／ui_cache lifecycle Test。

Codex Verification:
- 通常経路と例外経路を混同せず、調査範囲が必要十分であることを確認する。

### WP-2 Compare bounded delivery options

Owner: claude-assist

Assignment Reason: WP-1の事実に基づき、限定fixtureで方式別benchmarkとrisk比較を行えるため。

Task: memory result store型の分割転送、file-backed型、必要ならstreamingを比較し、5,000行pageと幅広tableの上限候補を示す。

Dependencies:
- WP-1。

Read Scope:
- WP-1 Evidence、Bridge contract、DataViewer API、benchmark fixture。

Edit Scope:
- 調査script／test、結果Evidence、本Taskだけ。Application codeは変更しない。

Acceptance Criteria:
- memory、latency、serialization byte、cleanup、security、実装量の同じ評価軸で比較される。

Constraints:
- 本番方式を調査担当が決定しない。
- benchmark data量に安全上限を設ける。

Tests:
- bounded benchmarkとlifecycle simulation。

Codex Verification:
- 過剰な方式や評価項目を増やさず、判断に必要な比較だけであることを確認する。

### WP-3 Decide follow-up implementation boundary

Owner: Codex

Assignment Reason: memory、UX、security、実装時期のtrade-offはProject owner判断を必要とするため。

Task: WP-1／WP-2の結果を要約し、採否、保持方式、上限、lifecycle、follow-up実装TaskをProject ownerと決定する。

Dependencies:
- WP-1、WP-2。

Read Scope:
- WP-1／WP-2 EvidenceとCurrent Specification。

Edit Scope:
- 承認されたDecision、Task graph、本Task。

Acceptance Criteria:
- 全Deferred Decisionが承認結果または明示的な不採用へ対応する。

Constraints:
- Project owner承認前に実装Taskを開始しない。

Tests:
- scenario／contract review。

Codex Verification:
- 初期版TASK-016と将来実装の境界が曖昧でないことを確認する。

## Completed

- 2026-08-28にProject ownerが、分割転送を初期版へ無理に追加せず、将来調査Taskへ分離する方針を決定した。

## Remaining

- Project ownerがTASK開始を指示するまでWP-1を開始しない。
- localに、未追跡のTASK-023用Script 2件（`scripts/generate_big_csv.py`、`scripts/csv_to_xlsx_stream.py`）を残している。[TASK-030](../done/TASK-030-formalize-dependency-checks-and-prune-local-assets.md)の記録どおり、本Task開始時にtrack、作り直し、削除のいずれかを再判断する。それまでは変更・削除・commitしない。

## Exact next action

Project ownerが本Taskの開始を指示した時点で、WP-1のread-only lifecycle調査を行う。

## Termination condition

分割転送の必要性、方式、上限、lifecycle、security、実装Task境界が一次情報に基づいて承認または不採用となること。
