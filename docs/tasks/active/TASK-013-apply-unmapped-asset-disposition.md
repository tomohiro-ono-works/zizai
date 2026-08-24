# TASK-013 Apply Approved Unmapped-Asset Disposition

## Status

Blocked — TASK-011

## Goal

Target外資産をTASK-005で承認された場所・tracking状態へ整理する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- `docs/handoffs/v23-unmapped-assets-disposition.md`
- TASK-009、TASK-011の最終Path

## Scope

承認済みの`template`、`scripts`、企画資料、personal/tool資産に対してKEEP/MOVE/ARCHIVE/IGNOREを適用する。

## Out of scope

判断未確定の削除、孤立WIP統合、Application behavior変更、REMOVE_CANDIDATE cleanup。

## Dependencies

TASK-005、TASK-009、TASK-011。

## Task Graph Position

TASK-011完了後、TASK-012／TASK-016系統と変更Pathが重ならない範囲で並行可能。TASK-013とTASK-016の双方が完了した後にTASK-014へ合流する。

## Expected change area

TASK-005で承認された対象Path、Documentation、`.gitignore`。

## Acceptance criteria

- 全対象がDispositionどおりの場所・tracking状態になっている。
- Sourceとgenerated/personal資産が同じignore規則で混在していない。
- launcher/tool script参照が最終Application/toolchain Pathと一致する。
- 内容を失うMOVEは行われていない。
- 未承認削除がない。

## Test plan

- Static path/reference check。
- Script dry-run（移動対象がある場合）。
- Git tracking/ignore verification。

## Migration risk

Medium — 分類の異なる資産を扱い、誤削除を避ける必要があるため。

## Rollback

Conditional — MOVEは戻せるが、local-only資産はGitで復元できない場合がある。

## Parallelizable

Conditional — TASK-012と変更Pathが重ならない場合のみ。

## Recommended branch

`migration/unmapped-assets`

## Worktree

Required

## Reason for task boundary

調査ではなく、承認されたDispositionをRepositoryへ反映する単一Outcomeとして独立してMergeできる。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- TASK-005が完了し、全Dispositionと所有Taskが確定した。

## Evidence

- TASK-005とTASK-009は完了済みであり、TASK-011が残る依存条件である。

## Remaining

- TASK-011完了後、承認済みDispositionだけを適用する。

## Exact next action

TASK-011の最終Application Pathと承認済みDispositionを照合し、実行対象を固定する。

## Termination condition

Acceptance criteriaと検証がPASSし、未承認削除とlocal-only資産の喪失がないこと。
