# TASK-014 Remove Approved Legacy and Generated Residue

## Status

Blocked — TASK-005, TASK-008～013

## Goal

Migration完了後、承認済みのLegacy sourceとSource管理上の生成物残骸を安全に除去する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- TASK-003/005のDisposition
- TASK-006～013の最終状態

## Scope

承認済みの`ui.node.js`、`styles.css`、空notebook、Playwright生成物、legacy docs/harness container、obsolete path/shimを最終Gate後に除去する。

## Out of scope

判断保留項目、個人local cacheの物理削除、WIP統合、機能変更。

## Dependencies

TASK-003、TASK-006～013、およびInvestigationから追加された全Migration Task。

## Expected change area

承認済みREMOVE_CANDIDATE、`.gitignore`、参照Documentation。

## Acceptance criteria

削除対象ごとに以下が0である。

- Code reference
- Runtime reference
- Test reference
- CI reference
- Active / canonical documentationにおける旧Pathへの有効参照

加えて、全Regression/Runtime/CI GateがPASSし、未承認ファイルは削除されていない。

Documentation referenceは次の基準で判定する。

- FAIL: README、AGENTS、canonical docs、現行runbook、setup/test手順などで、旧Pathを現在有効な参照先または実行先として使用しているもの。
- PASS対象: `docs/handoffs/`、`docs/decisions/`、migration audit、Disposition等で、旧Pathをhistorical evidenceとして記録しているもの。
- historical文書でも、旧Pathを現行の参照先または実行先として指示している場合はFAILとする。

## Test plan

- `static-analysis`: 判定定義に従うreference scanと削除対象照合。
- `unit` / `integration`: 全Regression suite。
- `e2e` / `manual-ui`: 承認済みRuntime Gate。
- CIは必須Gateをfull runする。
- Git diffによる削除対象照合。

## Migration risk

High — 破壊的変更であり、一部local資産はGit復元できないため。

## Rollback

Conditional — tracked fileは可能。untracked/local資産は削除対象に含めない。

## Parallelizable

No — 全Migration完了後だけ実行する。

## Recommended branch

`migration/legacy-cleanup`

## Worktree

Not required

## Reason for task boundary

全REMOVE_CANDIDATEが同じ「参照0＋全Gate PASS」という完了条件を共有し、Migration途中では単独実行できないため最後の1 Taskへ統合する。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。

## Evidence

- Investigationと全Migration Taskが依存条件として定義されている。

## Remaining

- 全依存Task完了後、承認済みREMOVE_CANDIDATEの参照0を証明して除去する。

## Exact next action

全依存TaskのEvidenceとDispositionを確認し、削除対象ごとの5分類Reference Gateを実行する。

## Termination condition

全削除対象が5分類Reference 0かつ全Gate PASSであり、未承認・untracked/local資産を削除していないこと。
