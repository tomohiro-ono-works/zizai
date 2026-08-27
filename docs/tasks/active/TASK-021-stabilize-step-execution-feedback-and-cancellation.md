# TASK-021 Stabilize Step Execution Feedback and Cancellation

## Status

Deferred — TASK-016へ追加せず、別タイミングで着手する

## Goal

SQL実行が無反応に見える事象、実行開始までのラグ、データエリアの更新状態が判別できない問題を解消し、実行中のステップを利用者が安全にキャンセルできるようにする。

## End State

利用者が操作受付、実行開始、実行中、成功、失敗、キャンセル、およびデータエリア更新の状態を画面上で判別でき、実行中の対象ステップをキャンセルできる。SQL実行は同じ操作条件で安定して開始され、開始までの所要時間と遅延箇所を測定でき、無反応に見える場合は原因を示す。

## Goal Traceability

- SQL実行が約2回に1回無反応に見える問題の再現と修正 → WP-1、WP-3
- SQL実行操作から実行開始までのラグの測定と改善 → WP-1、WP-2、WP-3
- データエリアが更新されたか分からない問題の解消 → WP-2、WP-3
- ステップキャンセルボタンと安全な停止処理 → WP-2、WP-4
- 既存実行機能を壊さない統合確認 → WP-5

## Critical Path

`WP-1 再現・原因特定 → WP-2 状態／キャンセルcontract承認 → WP-3 実行・表示修正 → WP-4 キャンセル実装 → WP-5 統合確認`。

## Parallel Work

なし。キャンセル時の状態遷移とデータ表示は、実行経路の原因特定後に同じcontractへ統合する。

## Task Graph Changes

- TASK-016および同releaseのAcceptance criteriaへ追加しない。
- SQL editorの編集支援を扱うTASK-020とは分離する。
- 本Taskの原因調査前に場当たり的な再実行や強制終了を追加しない。

## Deferred Decisions

- キャンセル対象を現在ステップだけにするか、後続ステップを含む実行全体にするか: Project ownerがWP-2で決定し、WP-4へ適用する。
- cooperative cancellationとprocess強制停止の境界: WP-1の実行経路調査後、Project ownerがWP-2で決定する。
- キャンセル時の途中結果を表示・破棄・保持するか: Project ownerがWP-2で決定し、WP-3／WP-4へ適用する。
- 操作受付から実行開始までの許容時間と、遅延時に表示する状態: WP-1の測定後、Project ownerがWP-2で決定し、WP-3へ適用する。

## Scope

- SQL実行が無反応に見える事象の最小再現条件、発生層、状態遷移を特定する。
- 操作click、Frontend受付、Bridge request／response、Backend開始、最初の進捗通知までの時間を分解して測定する。
- 実行要求の受付、実行中、完了、失敗、キャンセルを一意に表示する。
- データエリアの更新開始、更新完了、更新失敗、結果なしを判別可能にする。
- 実行中ステップのキャンセル操作とBackend／Bridgeへの停止通知を実装する。
- 二重実行、遅延応答、キャンセル後の完了応答を安全に処理する。

## Out of scope

- SQL editorのshortcut、部分選択実行、suggest、header余白（TASK-020）。
- TASK-016と同じreleaseへの追加。
- 原因調査前の自動再実行。
- OS processの無条件な強制終了。

## Dependencies

- TASK-016の初回release範囲が確定していること。
- 現行のstep実行、Bridge、Connector、データエリア更新経路をWP-1で確認すること。

## Expected change area

- step実行を開始・監視するApplication UI
- Application Bridge／Backendの実行状態・キャンセル境界
- データエリアの更新表示
- 関連する単体・結合・E2E Test
- 承認されたCurrent Specification

## Acceptance criteria

- 再現条件付きTestで無反応事象の原因が固定され、修正後は連続実行でも要求が欠落しない。
- 操作受付から実行開始までの各区間が測定され、承認された許容時間または遅延表示contractを満たす。
- 実行状態とデータエリア更新状態が画面上で区別できる。
- キャンセルボタンは実行中だけ操作でき、連打しても停止要求が重複しない。
- キャンセル後の遅延応答が別実行の画面やデータを上書きしない。
- SQL以外の既存ステップ実行を退行させない。

## Test plan

- 同一SQLの連続実行と、短い間隔での再実行を含む再現Test。
- 操作clickからBridge受付、Backend開始、最初の進捗通知までのtiming Test。
- 実行要求IDごとの開始、完了、失敗、取消、遅延応答の状態遷移Test。
- データエリアのloading、更新完了、結果なし、error表示Test。
- キャンセルの単発、連打、完了直前、Backend非応答時の結合Test。
- Windows実画面での手動確認。

## Migration risk

High — Frontend、Bridge、Backend、Connectorの非同期実行境界を横断し、誤ると二重実行や別結果による上書きを起こすため。

## Rollback

Yes — 状態表示とキャンセル経路をfeature単位で戻せる構成にする。ただし実行識別子contractを変更する場合はFrontend／Backendを同時に戻す。

## Parallelizable

No — 原因と状態contractの確定が後続実装の前提になる。

## Work Package plan

### WP-1 Reproduce and trace intermittent execution

Owner: claude-assist

Assignment Reason: 再現条件と対象経路を限定したdebuggingおよび失敗Test作成をRepository内で完結できるため。

Task: SQL実行が無反応に見える事象を再現し、Frontend、Bridge、Backend、Connector、結果通知のどこで状態または時間が失われるか特定する。

Dependencies:
- TASK開始承認。

Read Scope:
- `AGENTS.md`、`docs/features/`の実行関連仕様、step実行UI、Bridge／Backend／Connector、関連Test。

Edit Scope:
- 再現Test、調査Evidence、本Task。Application codeは変更しない。

Acceptance Criteria:
- 再現条件、期待状態、実際に欠落する状態、原因層、および操作から実行開始までの区間別所要時間がEvidenceと失敗Testで示される。

Constraints:
- 推測によるretryやtimeout変更を行わない。

Tests:
- 同一SQL連続実行、短時間再実行、遅延／失敗応答の再現Test。

Codex Verification:
- 再現Testが原因箇所を過不足なく固定し、他の要因を混同していないことを確認する。

### WP-2 Execution-state and cancellation contract

Owner: Codex

Assignment Reason: 状態表示、キャンセル範囲、途中結果の扱いはProject ownerとの仕様決定が必要なため。

Task: 実行状態、データ更新状態、操作受付から実行開始までの許容時間／遅延表示、キャンセル対象、途中結果、遅延応答のcontractを決定する。

Dependencies:
- WP-1。

Read Scope:
- WP-1 Evidence、Architecture、現行実行／データ表示仕様。

Edit Scope:
- 本Task、承認されたCurrent Specification／Decision。

Acceptance Criteria:
- 状態遷移と各画面表示、キャンセル境界、途中結果、再実行可否がProject ownerに承認される。

Constraints:
- 未決定事項を実装側で推測しない。

Tests:
- 状態遷移表と操作scenarioのplan review。

Codex Verification:
- 全Deferred Decisionが承認結果へ対応していることを確認する。

### WP-3 Reliable execution and data-area feedback

Owner: claude-assist

Assignment Reason: WP-1の失敗TestとWP-2のcontractに基づく限定的な非同期処理修正とTestを実施できるため。

Task: 実行要求の欠落または開始遅延の原因を修正し、操作受付、実行状態、データエリア更新状態を表示する。

Dependencies:
- WP-1、WP-2。

Read Scope:
- WP-1対象経路、WP-2仕様、関連Test。

Edit Scope:
- 承認された実行UI、Bridge／Backend境界、データエリア、関連Test、仕様記録。

Acceptance Criteria:
- 再現TestがGREENになり、状態とデータ更新の結果が一意に表示される。

Constraints:
- 原因を隠す自動retryを追加しない。

Tests:
- 単体、Bridge結合、連続実行E2E。

Codex Verification:
- 失敗Testの妥当性、要求IDと画面状態の対応、既存実行回帰を独立確認する。

### WP-4 Step cancellation

Owner: claude-assist

Assignment Reason: WP-2で承認した境界に沿ったFrontend／Bridge／Backendの一貫した実装とTestが必要なため。

Task: 実行中だけ有効なキャンセルボタンと、重複しない停止要求、キャンセル後の遅延応答抑止を実装する。

Dependencies:
- WP-2、WP-3。

Read Scope:
- 実行状態contract、実行UI、Bridge／Backend／Connector、関連Test。

Edit Scope:
- 承認されたキャンセル経路、関連UI、Test、仕様記録。

Acceptance Criteria:
- 実行中ステップを安全にキャンセルでき、連打・完了競合・遅延応答でも状態が破綻しない。

Constraints:
- 承認なしにOS processを強制終了しない。

Tests:
- キャンセル状態遷移、連打、完了競合、Backend非応答の単体・結合・E2E。

Codex Verification:
- 停止対象と実行要求IDが一致し、別実行へ影響しないことを独立確認する。

### WP-5 Integrated verification

Owner: Codex

Assignment Reason: Package間の統合、既存step回帰、Project owner手動確認をまとめて最終判定するため。

Task: SQL連続実行、データ更新表示、キャンセル、SQL以外のstep実行を統合確認する。

Dependencies:
- WP-3、WP-4。

Read Scope:
- 全変更差分、関連仕様、Test Evidence。

Edit Scope:
- 本TaskのEvidence／状態記録のみ。

Acceptance Criteria:
- 自動TestとWindows実画面確認がPASSし、未解決事項が明示される。

Constraints:
- 未確認項目をPASS扱いにしない。

Tests:
- 全関連回帰とProject owner手動確認。

Codex Verification:
- Acceptance criteria、仕様、実装、Evidenceを照合する。

## Completed

- 2026-08-27にProject ownerが、SQL実行の間欠的な無反応、データエリア更新の不明瞭さ、ステップキャンセルボタンを将来対応として別Task化するよう指示した。
- 2026-08-27にProject ownerが、SQL実行操作から実行開始までのラグも横断的な将来対応として本Taskへ追加するよう指示した。

## Remaining

- TASK開始時にWP-1の再現条件を確認する。

## Exact next action

Project ownerが本Taskの開始を指示するまで実装しない。

## Termination condition

実行とデータ更新の状態が一意に表示され、利用者が対象ステップを安全にキャンセルでき、関連回帰と手動確認がPASSすること。
