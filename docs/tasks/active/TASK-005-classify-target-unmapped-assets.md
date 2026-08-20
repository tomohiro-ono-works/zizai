# TASK-005 Classify Target-Unmapped Repository Assets

## Status

Ready for Investigation

## Goal

v23 Target Treeに対応先がない既存資産の最終責務を確定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- Repository内の対象資産

## Scope

`template/`、`scripts/`、`tableau-mcp/`、企画資料、個人作業ファイルについて、KEEP/MOVE/ARCHIVE/IGNORE/REMOVE_CANDIDATEを決定する。

## Out of scope

移動、削除、内容変更、孤立Application WIP。

## Dependencies

None

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

## Evidence

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`

## Remaining

- `template/`、`scripts/`、企画資料、個人作業ファイルを列挙し、用途・参照元・tracking状態を確認する。
- `tableau-mcp/`を含む全対象について、削除実施を伴わずDisposition文書を作成する。

## Exact next action

Migration Map §3.6/§9の対象を`docs/handoffs/v23-unmapped-assets-disposition.md`へ列挙し、Dispositionと理由を確定する。

## Termination condition

全対象のDispositionと追加Task要否が確定し、対象資産を移動・削除・変更していないこと。
