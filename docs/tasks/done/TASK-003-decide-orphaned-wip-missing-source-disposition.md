# TASK-003 Decide Orphaned WIP and Missing-Source Disposition

## Status

Completed

## Goal

現行branchにソースがないWIP・孤立モジュール・関連TestsをMigration対象に含めるか確定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- 関連Git履歴（`2e6ab92`を含む）

## Scope

`app/runtime`、`app/services`、`shared`、欠落した`core`/`connectors`、関連するPython/native Testsの出所と依存関係を調査する。

## Out of scope

ソース復元、統合、削除、Application Migration。

## Dependencies

None

## Expected change area

- `docs/handoffs/v23-orphan-wip-disposition.md`

## Acceptance criteria

- 各対象がINTEGRATE/EXCLUDE/REMOVE_CANDIDATE/PRESERVE_HISTORYに分類されている。
- 判断ごとのGit Evidenceと現行Applicationへの依存有無が記録されている。
- INTEGRATEの場合は実装・検証可能な追加Taskへ分解されている。
- 関連Testsを推測だけで復元対象にしていない。

## Test plan

- Static check: Audit/Mapの孤立コード全項目を網羅。
- Git history consistency check。

## Migration risk

High — 未マージ機能の喪失や誤統合につながるため。

## Rollback

Yes

## Parallelizable

Yes — Read-only調査と専用Handoff更新に限定する。

## Recommended branch

`migration/investigate-orphan-wip`

## Worktree

Required

## Reason for task boundary

削除・統合判断に必要なEvidenceを得る独立したInvestigation Outcomeであり、実装Taskと混ぜない。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- `2e6ab92`と現行HEADを比較し、production WIP、旧connector、関連testのDisposition案をEvidence付きで作成した。
- `.pyc`は削除承認済み、バックエンドtestは全件保持、Bridge/Frontend testは自動再利用・ユーザーテスト・設計参考へ分ける方針を記録した。
- 202607 WIPは一括復元せず、現行contractで検証できたtestだけを選択統合するDispositionを承認済みとした。
- `INTEGRATE`対象はTASK-008、承認済み`.pyc`等のREMOVE_CANDIDATEはTASK-014へ引き継いだ。

## Evidence

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/v23-orphan-wip-disposition.md`

## Remaining

- None（統合とcleanupの実施はTASK-008／014の範囲）。

## Exact next action

TASK-008／014で、承認済みDispositionに該当する対象だけを実施する。

## Termination condition

全対象のDispositionと追加Task要否が確定し、ソース復元・統合・削除を行っていないこと。
