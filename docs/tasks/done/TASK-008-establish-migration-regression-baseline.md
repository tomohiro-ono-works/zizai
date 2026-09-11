# TASK-008 Establish Migration Regression Baseline

## Status

Completed

## Goal

構造移行前の挙動を再現可能に検証し、Merge時に強制できるTest/CI基盤を確立する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- `docs/handoffs/v23-orphan-wip-disposition.md`
- `docs/handoffs/TASK-008-regression-baseline-design.md`
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
- Baseline verifierが現行ApplicationのPass／Fail／Blockedを再現可能に判定し、既知Fail／BlockedをPassへ読み替えず将来Taskの完了要件へ割り当てる。
- Test失敗時にMigrationを停止できる。
- Risk-to-Verifier表のautomated verifierが実装され、各行の合格基準へ追跡できる。
- repository rootの`tests/`がcanonical test sourceとしてGit追跡される。
- Windows Primary CIで`static-analysis`、`unit`、`integration`を同一commandから判定でき、既知Fail／Blocked解消後に必須GateとしてPASSできる。
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
- canonical runner、Risk marker、deterministic fixture、Windows CI、Playwright/WebEngine smoke、manual UI record validatorを実装した。
- Test source 54件をmanifest化し、generated/history artifactとのGit tracking境界を実装した。
- required Gateの0件collection／skip失敗化と`static-analysis`→`unit`→`integration`の順序をrunner self-testで固定した。
- Claude Codeのread-only reviewを1回実施し、CIで`.env`固定pathとなる指摘をTDDで`sys.executable`継承へ修正した。
- 2026-08-21 User Decisionにより、検証基盤の実装完了と未解決Riskの実行完了を分離し、後者をTASK-012／TASK-015の要件へ移管した。

## Evidence

- `docs/tasks/done/TASK-004-define-migration-verification-baseline.md`
- `docs/tasks/done/TASK-006-adopt-canonical-documentation-task-state.md`
- `docs/handoffs/TASK-008-regression-baseline-design.md`
- TASK-007はNot Activatedである。
- `static-analysis`: 30 passed、`integration`: 18 passed、`e2e`: pytest 1 passed + Playwright 3 passed、`manual-ui`: passed。
- `RISK-ENTRY-001`: 13 passed、`RISK-PATH-001`: 4 passed、`RISK-CONN-001`: 1 passed、`RISK-CONN-002`: 11 passed、`RISK-BRIDGE-001`: 8 passed、`RISK-CI-001`: 22 passed。
- `RISK-CONFIG-001`: 10 passed / 2 failed。`ftp://`と`file://`が現行Applicationで許可され、Approved Contractのnon-http(s)拒否と競合する。
- `RISK-FS-001`: Windows symlink privilege不足によりexit `2`。`required`もstatic-analysis成功後、unit開始時にexit `2`。
- 2026-08-21 User Decision: `RISK-FS-001`の実環境実行はTASK-015まで延期し、ユーザーが管理者PowerShellから当該Riskだけを実行する。Codexへ管理者権限は付与しない。
- `RISK-EXT-001`、`RISK-WEB-002`: Approved DecisionどおりTASK-012までexit `2`。
- Application code変更、remote push、cloud repository更新は行っていない。

## Deferred requirements

- `RISK-CONFIG-001`はTASK-019でallowlist／scheme境界を適用後に再実行し、2026-08-24にPASSした。
- `RISK-FS-001`はTASK-014でユーザー承認済みの管理者PowerShellから実行し、2026-09-07にPASSした。
- `required`の最終結果はTASK-014でfreshに取得し、全GateがPASSした。release candidateで関連境界が変わった場合の再実行はTASK-015が判定する。

## Remaining

- None

## Exact next action

TASK-009で既存依存を同等のuv構成へ移行する。

## Termination condition

Test/CI baseline、Risk verifier、tracking境界が実装され、既知Fail／Blockedが将来Taskへ明示的に割り当てられ、Application behaviorを変更していないこと。
