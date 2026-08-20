# TASK-006 Adopt Canonical Documentation and Task-State Structure

## Status

Completed

## Goal

`docs/`をCurrent Specification、Task State、Decision、Handoffの唯一の正本として利用可能にする。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- TASK-002のDisposition
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`

## Scope

`docs/handoffs/v23-harness-docs-disposition.md`のApproved内容をそのまま実施する。承認済み文書の移管、`docs/features`・`tasks/{active,done}`・`decisions`の整備、AGENTS/README参照、必要なtracking設定を更新する。

## Out of scope

Application code、Rules、Hooks、Tests、CI。`docs/handoffs/v23-harness-docs-disposition.md`でEXCLUDEとされた対象の削除は、このTaskでは行わない。

## Dependencies

TASK-002

## Expected change area

- `docs/features/`
- `docs/tasks/`
- `docs/decisions/`
- `docs/handoffs/`
- `AGENTS.md`
- `README.md`
- `.gitignore`

## Acceptance criteria

- 各Documentation領域が指定責務だけを持つ。
- 選定された既存情報が欠落せず移管されている。
- AGENTSとREADMEが実在する正本だけを参照する。
- 同じ仕様・判断を複数箇所へコピーしていない。
- 非移管資産は削除せず、Dispositionどおり保持される。
- EXCLUDE対象が削除されていない。

## Test plan

- Static link/path check。
- Documentation reference scan。
- Git tracking check。

## Migration risk

Medium — 正本とAgent routingを同時に切り替えるため。

## Rollback

Conditional — 後続Taskが新しいDocsを参照した後は依存Taskも戻す必要がある。

## Parallelizable

No — AGENTS、README、`.gitignore`を一元的に変更する。

## Recommended branch

`migration/canonical-docs`

## Worktree

Optional

## Reason for task boundary

Documentation構造、参照更新、選定文書移管は同じ「正本切替」のAcceptance Criteriaを共有し、別々にMergeすると参照切れが生じる。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- 依存するTASK-002と`v23-harness-docs-disposition.md`がApprovedになった。
- 選択的MERGEと最小ARCHIVEにより、Current Specificationを`docs/features/`、固有Evidenceと未実装計画を`docs/handoffs/`へ移管した。
- 完了Taskを`docs/tasks/done/`、未完了Taskを`docs/tasks/active/`へ分離した。
- `AGENTS.md`と`README.md`を実在するcanonical pathへ切り替え、`.gitignore`から`AGENTS.md`の除外を外した。
- version固定の開発ガイドをReferenceと明記し、Current Specification／ADRとの優先順位を明示した。
- EXCLUDE対象を削除せず保持し、Rules／Hooksを追加しなかった。

## Evidence

- `docs/handoffs/v23-harness-docs-disposition.md`
- `docs/handoffs/v23-canonical-docs-migration.md`
- `docs/README.md`
- Static link/path、legacy reference、task state、Git tracking、EXCLUDE保持の23 gateがPASS。

## Remaining

- None

## Exact next action

TASK-008でMigration Regression Baselineを実装する。

## Termination condition

Acceptance criteriaとTest planを満たし、Application code・Rules・Hooks・Tests・CIへ変更がないこと。
