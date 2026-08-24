# TASK-005 Classify Target-Unmapped Repository Assets

## Status

Completed

## Goal

v23 Target Treeに対応先がない既存資産の最終責務を確定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- Repository内の対象資産

## Scope

`template/`、`scripts/`、`tableau-mcp/`、企画資料、個人作業ファイルについて、KEEP/MOVE/ARCHIVE/IGNORE/REMOVE_CANDIDATEを決定する。

## Out of scope

移動、削除、内容変更、孤立Application WIP。

## Dependencies

None

## Task Graph Position

TASK-018と並行着手可能。本TaskのDisposition完了により、TASK-010とTASK-013に対するTASK-005依存は充足した。各Taskのその他の開始条件は維持する。

## Expected change area

- `docs/handoffs/v23-unmapped-assets-disposition.md`

## Acceptance criteria

- Migration Map §3.6/§9の全対象にDispositionと理由がある。
- Source、runtime、generated、personal、historicalが区別されている。
- 不明なものを削除候補へ変換していない。
- 大規模な移行が必要な項目は追加Taskへ分解されている。

## Test plan

- Static completeness check against Migration Map。
- Ownership review。

## Migration risk

Medium — 個人資産や企画資料を誤ってSource扱い・削除する可能性があるため。

## Rollback

Yes

## Parallelizable

Yes

## Recommended branch

`migration/investigate-unmapped-assets`

## Worktree

Required

## Reason for task boundary

Target外資産の責務確定という単一Outcomeを持ち、ApplicationやHarnessの判断から独立している。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- Tableauは内蔵UIへ埋め込まず既定ブラウザで利用し、`tableau-mcp/`は削除方針で扱うことを確認した。
- `docs/handoffs/v23-unmapped-assets-disposition.md`を作成し、Migration Map §3.6の6行と§9の5項目を省略なく照合した。
- Project ownerが`D13`〜`D19`を確定し、全対象のDispositionと追加Task要否が確定した。
- KEEP／IGNOREと`.gitignore`整備をTASK-013、tracked REMOVE／REMOVE_CANDIDATEと旧UI解析tool residueをTASK-014、`.gitignore`全体レビューをTASK-015へ引き継いだ。新UI解析toolの再作成は将来の別Taskとした。
- Project ownerによるtracked 4 fileの先行削除を指定worktreeで確認した。TASK-005の調査として資産の移動・削除・変更は行っていない。
- ユーザー指定の既存worktreeとbranchを維持し、推奨branchへの切替は行わなかった。
- Claude Opusの読み取り専用クローズレビューは`Ready to close`と判定し、CodexがAcceptance criteria、Termination condition、Migration Map、採用済みTask graphへ再照合した。

## Evidence

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/v23-unmapped-assets-disposition.md`
- Project ownerによる`D13`〜`D19`の承認（2026-08-23）。
- Static completeness / ownership review: Migration Map §3.6は6/6行、§9は5/5項目、Disposition未確定0件。

## Remaining

None

## Exact next action

TASK-018完了後にTASK-019とTASK-010のDeferred Decisionへ進む。Dispositionの適用は依存条件成立後のTASK-013／TASK-014、`.gitignore`全体レビューはTASK-015が所有する。

## Termination condition

全対象のDispositionと追加Task要否が確定し、対象資産を移動・削除・変更していないこと。
