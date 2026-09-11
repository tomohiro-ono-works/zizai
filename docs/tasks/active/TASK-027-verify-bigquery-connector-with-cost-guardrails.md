# TASK-027 Verify BigQuery Connector with Cost Guardrails

## Status

Deferred — Project ownerの実行条件・費用上限の明示承認待ち

## Goal

BigQuery Connectorの実接続を、意図しないGCP課金を防ぐ条件を固定した別枠テストとして検証する。

## Scope

Project ownerが指定するGCP Project／Dataset／test queryを用いたread-only実接続、実行結果、UI、logの照合。

## Out of scope

TASK-015の初期release Gate、production data更新、table作成／更新／削除、費用上限未設定のquery。

## Dependencies

TASK-015完了後。実行前にProject ownerが対象、資格情報、query、最大課金量を明示承認する。

## Acceptance criteria

- 実行前にquery対象と費用上限が確認されている。
- read-only queryだけを1回実行し、結果、UI、logが一致する。
- 承認範囲外のAPI呼出し、data変更、再実行、費用上限超過が0件である。

## Test plan

- contract／mock Testを先に実行する。
- 実queryは事前の見積確認と最大課金量の制限を必須にする。
- Project ownerの実行直前承認後にだけWindows Desktopから1回実行する。

## Work Package

- Owner: Codex
- Assignment Reason: 外部資格情報、課金条件、Project owner承認を統合して実行可否を判定するため。
- Read Scope: BigQuery Connector、Connector contract、対象test flow、GCP側の承認済み条件。
- Edit Scope: 本Taskと実行Evidenceのみ。Connector不具合は別の修正Taskへ戻す。
- Constraints: 明示承認前は認証・queryを実行しない。課金上限を推測しない。
- Codex Verification: 実行時刻、対象、見積、上限、run ID、結果、logを照合する。

## Remaining

- Project ownerが実行条件と費用上限を指定する。

## Exact next action

TASK-015完了後、BigQuery実接続テストを行うかProject ownerへ確認する。

## Termination condition

承認済み費用上限内で実接続GateがPASSするか、未実行理由を記録して終了すること。
