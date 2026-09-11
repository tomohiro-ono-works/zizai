# TASK-013 Apply Approved Unmapped-Asset Disposition

## Status

Completed — 2026-09-07

## Goal

Target外資産をTASK-005で承認された場所・tracking状態へ整理する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- `docs/handoffs/v23-unmapped-assets-disposition.md`
- TASK-009、TASK-011の最終Path

## Scope

承認済みの`template`、`scripts`、企画資料、personal/tool資産に対してDispositionを適用する。

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
- 2026-09-07にProject ownerがDispositionを更新し、root `template/`は`.gitkeep`だけを残してsample `.zizd`を削除、`tableau-mcp/`、`scripts/requirements_inventory.csv`、local-only個人資産5件を不要と確定した。削除済みtracked資産もTASK-014のReference Gate対象から除外しない。
- root `template/`を維持し、Application Pathやlauncher/tool scriptを変更しなかった。
- root `scripts/`にtracked sourceが残らないため、READMEのdirectory treeから同directoryを除外した。
- `.gitignore`の実変更・全体見直しは、Project ownerとの合意どおりTASK-015へ保留した。
- Application code、Test code、`.gitignore`は変更せず、追加の資産削除も行わなかった。

## Evidence

- TASK-005、TASK-009、TASK-011、TASK-012、TASK-016は完了済みであり、本Taskの依存条件を満たす。
- 指定Worktreeではlocal-only個人資産5件（`memo.md`、`test.ipynb`、`.obsidian/`、`無題のファイル.base`、`tmp_staged_files_release_202606.txt`）が不在であることを、内容を参照せず確認した。
- 承認済みtracked削除差分は、`scripts/requirements_inventory.csv`、`tableau-mcp/`の2件、`template/`のsample `.zizd` 2件である。
- `template/.gitkeep`はtrackedのまま残り、root `template/`を維持している。
- 内容を失うMOVE、未承認削除、Application code変更はない。

## Remaining

- なし。tracked削除差分の5区分Reference GateはTASK-014、`.gitignore`全体レビューはTASK-015が所有する。

## Exact next action

TASK-014で承認済みtracked削除差分のReference Gateとlegacy/generated residue整理を行う。

## Termination condition

Acceptance criteriaと検証がPASSし、未承認削除とlocal-only資産の喪失がないこと。
