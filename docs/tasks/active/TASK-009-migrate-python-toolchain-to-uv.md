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
- 設計書のwritten reviewが承認され、TDD実装計画を`docs/handoffs/TASK-009-uv-toolchain-implementation-plan.md`へ記録した。

## Evidence

- TASK-008が依存条件として定義され、TASK-007はNot Activatedである。
- TASK-008の検証基盤はlocal commit `2978e2f`で確立され、既知Fail／BlockedはTASK-012／TASK-015の要件として正本へ記録された。
- Task 6 clean regeneration (2026-08-21): deletion target was resolved as `C:\Users\tomoh\Documents\Sandbox\zizai\.worktrees\task-009-uv-toolchain\.venv`; it equaled the expected worktree-local path, was nested under the worktree root, and was absent before regeneration. Only this ignored artifact was removed. The repository-root `C:\Users\tomoh\Documents\Sandbox\zizai\.env` existed and was not deleted or modified.
- Fix Round 1 directly proved clean-state regeneration: after the checked worktree `.venv` was absent, `UV_CACHE_DIR=$PWD\.uv-cache uv sync --frozen` used CPython 3.11.9, created `.venv`, and installed 134 packages in 20.73s (command and unified process exit 0; `.venv` recreated: true). Separately, `uv lock --check` resolved 165 packages (exit 0), and `uv run --frozen python -m pytest tests/static tests/selftest -q` completed `44 passed` (exit 0).
- Direct dependency parity remains production/development `87/23`, with additions/removals/version differences `0/0/0`.
- Assigned migration Risks all passed: `RISK-ENTRY-001` 14 selected tests (exit 0), `RISK-PATH-001` 4 (exit 0), `RISK-CI-001` 23 (exit 0), and `RISK-WEB-001` 2 Python tests plus 3 Playwright tests (exit 0). Canonical commands were `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId <RiskId>` with the worktree-local `UV_CACHE_DIR`.
- `RISK-WEB-001` environment recovery: the ignored worktree Playwright `node_modules` was missing; after confirming the worktree and main-checkout `tests/playwright/package-lock.json` files were identical, the main checkout's existing ignored `node_modules` (7 entries) was copied into this worktree. This is a local test prerequisite, not a source change. `RISK-CONFIG-001` remains TASK-012, and real symlink execution / `RISK-FS-001` remains TASK-015; neither is a TASK-009 failure.

## Remaining

- 承認済み実装計画をTDD単位で実行し、clean frozen syncとassigned Riskを検証する。

## Exact next action

実装計画Task 1のuv project contract testを追加し、現状で期待どおりFailすることを確認する。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、既存`.env/`を物理削除していないこと。
