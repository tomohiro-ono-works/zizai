# TASK-009 Migrate Python Toolchain to uv

## Status

Ready for Implementation

## Goal

Python依存管理と再生成可能な実行環境を`pyproject.toml`、`uv.lock`、`.venv`へ移行する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`
- `docs/handoffs/TASK-009-uv-toolchain-design.md`
- TASK-008 Regression Baseline

## Scope

依存定義、lock、launcher/bootstrap、pip前提スクリプト、README、`.env`/`.venv`のtracking規則を更新する。

## Out of scope

ユーザーの既存`.env/`仮想環境の物理削除、Application配置変更、依存versionの無関係なupgrade。

## Dependencies

TASK-008の検証基盤実装。TASK-008から移管されたCONFIG／FS要件はTASK-012／TASK-015が担当し、本TaskをBlockしない。TASK-007はNot Activatedのため依存しない。

## Expected change area

- `pyproject.toml`
- `uv.lock`
- `requirements*.txt`
- `bin/`
- `scripts/refresh_requirements.py`
- `README.md`
- `.gitignore`

## Acceptance criteria

- Clean環境でlockから`.venv`を再生成できる。
- Production/Test依存が既存requirementsと一致する。
- CLI、Baseline Test、GUI起動確認がuv環境で成功する。
- Repository内の仮想環境参照が`.venv`へ統一される。
- `.env`はlocal environment values用として予約され、既存`.env/`は自動削除しない。
- requirements削除は参照0と依存同等性確認後にのみ行う。

## Test plan

- `static-analysis`: lock/config整合、旧venv参照scan。
- `integration`: frozen lockから再生成したuv環境で正式CLIとBaseline Test。
- `e2e`: uv環境でWindows Desktop smoke。
- CIはfrozen lockから環境を構築し、同じ判定commandを実行する。

## Migration risk

High — 開発・起動・CIの共通toolchainを変更するため。

## Rollback

Conditional — 後続Taskがuv前提になった後は単独Rollback不可。

## Parallelizable

Conditional — TASK-010とはWorktree分離可能だが、`.gitignore`やDocumentationの競合確認が必要。

## Recommended branch

`migration/uv-toolchain`

## Worktree

Required

## Reason for task boundary

依存定義、lock、venv名、launcher更新は一方だけでは実行環境が不完全になるため同一Taskとする。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- uv `0.12.5`、Python `>=3.11,<3.12`、依存version完全保持、requirements／refresh script削除、既存`.env/`非変更の設計が会話で承認された。

## Evidence

- TASK-008が依存条件として定義され、TASK-007はNot Activatedである。
- TASK-008の検証基盤はlocal commit `2978e2f`で確立され、既知Fail／BlockedはTASK-012／TASK-015の要件として正本へ記録された。

## Remaining

- 既存依存、launcher/bootstrap、CI参照を確認し、同等のuv構成へ移行する。

## Exact next action

`docs/handoffs/TASK-009-uv-toolchain-design.md`のwritten review後、TDD単位の実装計画を作成する。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、既存`.env/`を物理削除していないこと。
