# TASK-007 Bootstrap Minimal Codex Harness

## Status

Completed — Not Activated

## Goal

TASK-002でPermission/Event制御の必要性を判定し、必要な場合だけ最小Harnessを導入する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- TASK-002のDisposition
- TASK-006のCanonical Docs

## Scope

TASK-002で追加Harness不要と確定したため、本TaskはNot Activatedとして終了する。

## Out of scope

新規Agent、未確認Skill、Application、Tests、CI、汎用的な自動化。

## Dependencies

TASK-002

## Expected change area

- None

## Acceptance criteria

- 追加Rules／Hooks不要の判断がApproved Dispositionへ記録されている。
- `.codex/rules/`と`.codex/hooks.json`を追加していない。
- 将来の再評価triggerが文書化されている。
- 後続TaskがTASK-007の成果物を必須依存としていない。

## Test plan

- Static absence check。
- TASK-002 Approved Dispositionへのtraceability確認。

## Migration risk

Medium — 誤設定すると後続作業を停止または過剰許可するため。

## Rollback

Yes

## Parallelizable

No — TASK-006とtracking/参照設定が重なる。

## Recommended branch

`migration/minimal-harness`

## Worktree

Optional

## Reason for task boundary

Permission/Event制御という単一Outcomeであり、Docs正本化やTest実装とは異なる独立したVerificationを持つ。

## Completed

- Task Decompositionが承認され、条件付きTask定義を作成した。
- TASK-002でRules／Hooks不要が承認され、本TaskをNot Activatedとして終了した。

## Evidence

- `docs/handoffs/v23-harness-docs-disposition.md`

## Remaining

- None

## Exact next action

再評価triggerが発生した場合のみ、新しいTaskとして必要性を再判定する。

## Termination condition

追加Harness不要というTASK-002のApproved Decisionへ追跡でき、Rules／Hooksを追加せず終了していること。
