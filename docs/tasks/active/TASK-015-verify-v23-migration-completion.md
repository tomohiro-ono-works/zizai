# TASK-015 Verify v23 Migration Completion

## Status

Blocked — TASK-014（全Migration TaskはTASK-014までに合流する）

## Goal

Migration全体が承認済みArchitecture、Repository構造、runtime behavior、verification要件を満たすことを独立Evidenceで判定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- 全Decision、Task、Feature、Test/CI結果
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`

## Scope

Target tree、例外、imports、entrypoints、config、toolchain、Docs、Harness、Tests、CI、legacy references、runtimeを横断検証する。`.gitignore`は対象folder、pattern、例外ruleを全体レビューし、Sourceとgenerated/local stateの境界を確認する。

## Out of scope

検出した不具合の便乗修正。失敗時は該当Taskへ戻すか修正Taskを作る。

## Dependencies

TASK-001～014、TASK-016～019、およびv23 Migration Investigationから初回release条件として追加されたTask。初回release後の別releaseへ明示的に延期したProduct enhancement Task（現時点ではTASK-020）は含めない。RISK-FS-001のsymlink実機検証は承認済みDecisionどおり本Taskでユーザーが実行し、それ以前のTaskをBlockしない。

## Expected change area

- `docs/handoffs/v23-migration-final-verification.md`
- 各TaskのEvidence/Status

## Acceptance criteria

- 承認済みTarget Treeまたは明記されたArchitecture Exceptionと一致する。
- CLI、headless、Desktop、UI、connector、configが期待どおり動作する。
- cleanなuv環境で全Test/CIがPASSする。
- 旧PathにCode/Runtime/Test/CIの参照がない。
- Active / canonical documentationにおける旧Pathへの有効参照が0である。
- Sourceとgenerated/local stateが正しく分離されている。
- `.gitignore`の対象folder、pattern、例外ruleが全件確認され、追跡すべきSourceを隠すbulk ignore、意図しない未追跡資産の露出、未承認のtracked-ignore例外が0である。
- 承認済み8 Frontend libraryがProject owner決定spaceですべて使用され、同一UI責務のApplication実装が0である。
- external URL入力はFrontend/backendの両方で`http(s)`だけを許可し、Desktop同梱UIの内部`file://` Runtimeと混同していない。
- 未解決事項、失敗、未完了Taskが0である。
- 独立レビュー結果がPASSである。

Documentation referenceは次の基準で判定する。

- FAIL: README、AGENTS、canonical docs、現行runbook、setup/test手順などで、旧Pathを現在有効な参照先または実行先として使用しているもの。
- PASS対象: `docs/handoffs/`、`docs/decisions/`、migration audit、Disposition等で、旧Pathをhistorical evidenceとして記録しているもの。
- historical文書でも、旧Pathを現行の参照先または実行先として指示している場合はFAILとする。

## Test plan

- `unit` / `integration`: 全suite。
- `e2e` / `manual-ui`: Windows Desktop/UI Runtime Gate。
- `static-analysis`: tree/import/path/reference scan。
- `.gitignore` review: ruleごとの所有責務確認、代表pathへの`git check-ignore -v --no-index`、`git ls-files -ci --exclude-standard`によるtracked-ignore検出。
- clean environment lock verification。
- CI full run。
- 独立Architecture/Task Evidence review。

## Migration risk

Medium — 変更はEvidence中心だが、広い範囲を最終判定するため。

## Rollback

Yes — Verification Evidenceのみ。

## Parallelizable

No — 全Taskの最終状態が必要。

## Recommended branch

`migration/final-verification`

## Worktree

Not required

## Reason for task boundary

Migration実装とは分離された最終合否判定であり、全Task共通のIntegration Acceptance Criteriaを一度だけ検証する。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。

## Evidence

- TASK-001～014、TASK-016～019と追加Taskが依存条件として定義されている。
- TASK-020は初回release後のProduct enhancementであり、本Taskの依存条件から明示的に除外されている。

## Remaining

- 全Task完了後、修正を行わずMigration全体を独立検証する。
- Project ownerと`.gitignore`の対象folder、pattern、例外ruleを全体レビューする。問題を検出した場合は本Taskで便乗修正せず、責務Taskへ戻すか修正Taskを作る。

## Exact next action

全依存TaskのStatus/Evidenceを確認し、未完了が0の場合だけFinal Verificationを開始する。

## Termination condition

全Acceptance criteriaがPASSしてEvidenceが保存されるか、FAIL内容と責務Taskが記録されて終了すること。
