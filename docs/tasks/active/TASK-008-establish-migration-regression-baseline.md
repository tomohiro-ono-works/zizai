# TASK-008 Establish Migration Regression Baseline

## Status

Ready for Implementation

## Goal

構造移行前の挙動を再現可能に検証し、Merge時に強制できるTest/CI基盤を確立する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- `docs/handoffs/v23-orphan-wip-disposition.md`
- TASK-006 Canonical Docs

## Scope

TASK-004で確定した最小Tests、runner設定、fixture、CI、Test source/generatedのignore境界を実装する。

## Out of scope

Application behavior変更、Migration、欠落WIPの復元。

## Dependencies

TASK-004、TASK-006。TASK-007はNot Activatedのため依存しない。

## Expected change area

- `tests/`
- `.github/workflows/`
- Test runner設定
- `.gitignore`

## Acceptance criteria

- Path変更前のCLI、import、connector discovery、config、Desktop/UI境界を必要範囲で検証できる。
- Test sourceが追跡され、node_modules・reports・cache等は追跡されない。
- LocalとCIが同じ判定コマンドを使用する。
- Baselineが現行ApplicationでPASSする。
- Test失敗時にMigrationを停止できる。
- Risk-to-Verifier表のautomated verifierが実装され、各行の合格基準へ追跡できる。
- repository rootの`tests/`がcanonical test sourceとしてGit追跡される。
- Windows Primary CIで`static-analysis`、`unit`、`integration`が必須GateとしてPASSする。
- 通常の合否判定がLLM、外部AI、実資格情報、外部service、対話操作に依存しない。
- `manual-ui`対象は事前定義した記録形式でsource管理される。

## Test plan

- `static-analysis`: tracked source、import、entrypoint、asset/config path。
- `unit`: TASK-004で定義したpure Python checks。
- `integration`: 正式CLI、connector/config、Bridge message contract。
- `e2e`: Windows上のDesktop/QWebChannel/WebEngine smoke、または承認済み代替Gate。
- `manual-ui`: 自動判定困難なWindows UI操作。CIは同一のStatic～Integration commandをclean environmentで実行する。

## Migration risk

High — 失われたTest基盤を再構築するため。

## Rollback

Yes

## Parallelizable

No — 後続Migrationの共通Gateになる。

## Recommended branch

`migration/regression-baseline`

## Worktree

Optional

## Reason for task boundary

Tests・runner・CIは「Migrationを機械的に判定可能にする」という同一OutcomeとAcceptance Criteriaを共有する。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- TASK-004でVerification Contractが確定した。
- TASK-006でcanonical documentationとGit trackingが確立した。

## Evidence

- `docs/tasks/done/TASK-004-define-migration-verification-baseline.md`
- `docs/tasks/done/TASK-006-adopt-canonical-documentation-task-state.md`
- TASK-007はNot Activatedである。

## Remaining

- Verification ContractとTASK-003のINTEGRATE対象に従ってTest/CI基盤を実装する。

## Exact next action

Verification ContractのRisk IDをTest file／CI Gateへ対応づけ、最初のfailing baseline testから実装する。

## Termination condition

Acceptance criteriaの全Gateが現行ApplicationでPASSし、Application behaviorを変更していないこと。
