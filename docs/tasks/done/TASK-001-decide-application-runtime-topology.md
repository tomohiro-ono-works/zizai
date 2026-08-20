# TASK-001 Decide Application Runtime Topology

## Status

Completed

## Goal

現行PySide6/QWebChannel構成とv23の`web/api/desktop`構成の差を解消するArchitecture Decisionを確定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/codex_development_guide_2026-08-15_v24/01_codex-development-architecture.md`
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`

## Scope

`static/`、`app/gui/bridge.py`、`core/`、`connectors/`、Desktop host、localhost API不在のEvidenceを基に、最終責務と移行方式を決定する。

## Out of scope

Application code、通信方式、ファイル配置の変更。

## Dependencies

None

## Expected change area

- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`

## Acceptance criteria

- Embedded UI継続かStrictな`apps/web/api/desktop`分離かが明記されている。
- PySide6/QtWebEngine継続可否、Bridge/API責務、`core`/`connectors`の配置が確定している。
- 移行中に維持するInterfaceと互換期間が明記されている。
- Strict分離を選ぶ場合は、実装可能な後続Taskへ再分解されている。
- Application境界にUNKNOWNが残っていない。

## Test plan

- Static check: Audit/MapのApplication項目をDecisionへ追跡可能であること。
- Review: Outcome・Verification・Atomicity・Contextによる境界レビュー。

## Migration risk

High — 実行モデルと後続Task構成を決定するため。

## Rollback

Yes — Documentationのみ。

## Parallelizable

Yes — TASK-002～005と変更先を分離できる。

## Recommended branch

`migration/investigate-app-topology`

## Worktree

Required

## Reason for task boundary

Application全体の移行先を確定する単一Outcomeであり、この判断なしでは後続のPython/UI移動を安全にMergeできない。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- `PySide6 + QtWebEngine + QWebChannel + file://`による単一Desktop Runtime継続を確定した。
- `apps/{desktop,cli,gui,core,connectors,common}`の責務境界、Bridge Protocol v1.0互換期間、外部Web分離方針を確定した。
- Architecture DecisionとApplication Boundary Evidenceをユーザー承認内容へ合わせて保存した。

## Evidence

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`

## Remaining

- None（物理移行と検証は後続Taskの範囲）。

## Exact next action

後続TaskではADRを正として、TASK-011でPython責務を分離配置し、TASK-012で`static/`を`apps/gui/`へ移行する。

## Termination condition

Acceptance criteriaを満たすDecisionとEvidenceが保存され、Application codeへ変更がないこと。
