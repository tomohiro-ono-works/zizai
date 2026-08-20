# TASK-002 Decide Canonical Docs and Harness Disposition

## Status

Completed

## Goal

`.docs/`と`.codex-harness/`の各資産について、正本・参考資料・再利用手順・廃止候補の扱いを確定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `AGENTS.md`
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`

## Scope

各サブ領域を項目単位でKEEP/MOVE/MERGE/ARCHIVE/EXCLUDEへ分類し、必要最小限のRules/Hooksも判断する。

## Out of scope

文書移動、AGENTS変更、`.codex`変更、Harness実装。

## Dependencies

None

## Expected change area

- `docs/handoffs/v23-harness-docs-disposition.md`
- TASK-002のState/Evidence

## Acceptance criteria

- `.codex-harness/{reports,orchestration,checks,subagents,scripts}`のDispositionが項目単位で確定している。
- `.docs/areas/backend-tests.md`の正本化先が確定している。
- AGENTS/READMEの新しい参照先が定義されている。
- `.codex/rules/`と`.codex/hooks.json`の必要性および最小責務が確定している。
- 同一Definitionを複数箇所へコピーしない移行表になっている。

## Test plan

- Static check: 全Harness Mapping行がDisposition表に存在すること。
- Documentation ownership review。

## Migration risk

Medium — 誤った正本化は運用規約を変えるため。

## Rollback

Yes

## Parallelizable

Yes — 他Investigationと独立したDocumentation領域を扱う。

## Recommended branch

`migration/investigate-harness-docs`

## Worktree

Required

## Reason for task boundary

DocsとHarnessのDefinition ownership確定が単一Outcomeであり、実際の移行や設定追加とは独立してレビューできる。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- `.docs/` と `.codex-harness/` の資産Dispositionを確定した。
- 選択的MERGE＋最小限ARCHIVEを採用した。
- Rules / Hooksは作成せず、TASK-007を非着手とする判断を確定した。
- AGENTS/READMEの新しい参照先を定義した。
- 分類表についてユーザー承認を得た。

## Evidence

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/v23-harness-docs-disposition.md`

## Remaining

- None（文書移行、AGENTS/README変更、旧資産削除は後続タスクの範囲）。

## Exact next action

後続タスクで、承認済みDispositionに従って文書を移行する。

## Termination condition

Acceptance criteriaを満たすDispositionが保存され、文書移動・AGENTS・`.codex`変更がないこと。
