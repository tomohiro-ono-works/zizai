# TASK-010 Migrate Shared Source Configuration

## Status

Blocked — TASK-008

## Goal

GUI、Desktop、Coreが参照するSource設定を`apps/common/config`へ移し、Runtime stateを分離する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`
- TASK-008 Regression Baseline

## Scope

`security_policies.yml`、`rename.csv`、`file_icon_map.json`、`suggest_index`を移動し、全consumer参照を同時更新する。

## Out of scope

`recent_flows.json`、`recent_roots.json`等のRuntime state移動、Application package移動、UI transport変更。

## Dependencies

TASK-008。TASK-007はNot Activatedのため依存しない。

## Expected change area

- `apps/common/config/`
- `core/security_policies.py`
- `app/gui/bridge.py`
- `static/config/`
- `static/js/`

## Acceptance criteria

- Source設定が`apps/common/config`だけに存在する。
- Python/JS/Bridge consumerが新Pathを使用する。
- Runtime stateの保存場所と既存ユーザーデータは変わらない。
- MOVE前にCode/Runtime/Test/CI/Documentationの旧参照が0になる。
- Security、suggest、rename、icon mapのBaseline TestがPASSする。

## Test plan

- `unit`: policy/config loading、missing/invalid configのfail-closed判定。
- `integration`: Bridgeからsuggest/config取得。
- `e2e`: Windows UIで対象設定を利用。
- `static-analysis`: 旧Source config pathの有効参照0。
- CIはBaseline suiteの同一commandを実行する。

## Migration risk

Medium — PythonとWeb双方のPath参照を同時に変更するため。

## Rollback

Conditional — 後続Application Migration後は依存Taskも戻す必要がある。

## Parallelizable

Conditional — TASK-009と別Worktreeで可能。Merge後に統合Test必須。

## Recommended branch

`migration/common-config`

## Worktree

Required

## Reason for task boundary

Config MOVEと全consumer更新は同じOutcomeを構成し、分割すると実行時に設定を読めない状態になる。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。

## Evidence

- TASK-008が依存条件として定義され、TASK-007はNot Activatedである。

## Remaining

- Baseline確立後、Source設定と全consumerを同一変更で移行する。

## Exact next action

TASK-008完了後、対象設定とconsumer参照を再確認してMOVE対象を固定する。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、Runtime stateと既存ユーザーデータを変更していないこと。
