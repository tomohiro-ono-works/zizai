# TASK-018 Define Frontend Library Integration Contract

## Status

Completed

## Goal

承認済み8 Frontend libraryをApplicationへ導入する前に、共通の責務境界、配置決定protocol、version/license、theme、lifecycle、Document、verification contractを正本化する。

## End State

8 libraryすべてを使用しつつApplication側へ同一UI責務を重複実装しないための共通contractが、Current SpecificationとDecisionに存在する。各libraryの利用spaceは未確定のまま、Project ownerが各移行Work Package直前に安全に決定できる。

## Source

- `docs/features/frontend.md`
- `docs/features/frontend-libraries.md`
- `docs/features/architecture.md`
- `docs/features/coding-rules.md`
- `docs/decisions/ADR-frontend-library-vendoring.md`
- `docs/handoffs/TASK-010-frontend-library-integration-audit.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- `docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`

## Scope

- 8 library、exact revision、local-only同梱、Application Adapter、重複UI削除の共通要件を正本化する。
- space決定をProject ownerへJust-in-timeで提示・記録するprotocolを定義する。
- vendor path、取得元revision、LICENSE/NOTICE、配布許諾の記録先を決定する。
- theme token、CSS scope、global namespace、mount/unmount、Document単一正本、external URL、Bridge/config責務の導入Gateを定義する。
- TASK-016固有GateをTASK-015の全suiteへ追跡可能にする。

## Out of scope

Applicationコード、library source、Test program、UI配置、vendor snapshotの変更。8 repositoryへのcommit/push。Project owner決定前のspace割当。

## Dependencies

承認済みADR-v23と、全8 libraryを利用するProject owner要件。TASK-010/012の実装完了には依存しない。

## Goal Traceability

- 8 library全件利用 → Current Specificationの列挙とTASK-016追跡
- 重複UI 0 → library/Application責務表と削除Gate
- 推測しないspace配置 → Just-in-time decision protocol
- 追跡可能な同梱 → 取得元commit/license/NOTICE contract
- 安全な統合 → lifecycle/theme/Document/security/Bridge Gate

## Critical Path

`TASK-018 → TASK-019 → TASK-010 → TASK-011 → TASK-012 → TASK-016`。

## Parallel Work

TASK-005のDisposition調査と並行可能。TASK-018完了後、TASK-019とTASK-010の未決定事項整理を並行できる。

## Task Graph Changes

TASK-016旧WP-1を本Taskへ移管し、config MOVEやFrontend物理MOVEより前に正本を確定する。

## Confirmed decisions

- 8 libraryはGitHub上のassetを直接参照せず、`apps/gui/vendor/<library>/`配下へlocal assetとして配置する。
- 初回導入時点における各libraryの現行内容を対象とし、将来の更新は必要になった時点で別途判断する。
- 8 repositoryはいずれもProject owner所有であり、Applicationへの同梱を許可する。

## Deferred Decisions

- Workflow Document正本: `zizai-workflow-designer`への移管Work Package直前に、同libraryの状態入出力APIだけを調査し、その結果を基にProject ownerが決定する。本Taskでは推測で固定しない。
- 各libraryの利用space: 本Taskでは決めず、TASK-016の該当WP直前にProject ownerが決定する。

## Expected change area

- `docs/features/frontend.md`
- `docs/features/frontend-libraries.md`
- `docs/decisions/ADR-frontend-library-vendoring.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- `docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`
- `docs/tasks/done/TASK-018-define-frontend-library-integration-contract.md`

## Acceptance criteria

- 8 library全件とlocal-only利用要件がCurrent Specificationに存在する。
- Application Adapterと各libraryの責務境界が、Bridge/config/persistence/execution/navigation/window policyを含めて定義される。
- space decision protocolがProject owner、判断期限、記録先を含む。
- 取得元revision、license/NOTICE、vendor pathとupstream update手順が決定される。
- theme、CSS scope、namespace、lifecycle、Document、security Gateが定義される。
- TASK-016固有GateがTASK-015の最終Verificationへtraceできる。
- 未決定spaceを推測で固定していない。

## Test plan

- `static-analysis`: 8 library記載、相互link、Decision owner、placeholder、矛盾、およびFinal End StateからTASK-016 WP/Test/TASK-015までの対応確認。

## Migration risk

Medium — 実装変更はないが、後続Frontend統合の責務と配布条件を拘束する。

## Rollback

Yes — Documentation/Decision変更のみ。ただし承認後のDecision再検討は専用Taskを必要とする。

## Parallelizable

Yes — TASK-005と変更先が分離している。

## Recommended branch

`codex/task-018-frontend-contract`

## Worktree

Optional

## Work Package plan

### WP-1 Canonical integration contract and decision protocol

Owner: Codex

Assignment Reason: Project ownerの判断、Current Specification、配布許諾、後続Task境界を確定する作業であり、Application実装を伴わないため。

Task: 8 libraryの共通integration contractと未決定事項のdecision protocolを正本化する。

Dependencies:
- Project ownerによる本Task計画承認。

Read Scope:
- `AGENTS.md`
- `docs/features/`
- `docs/decisions/`
- `docs/handoffs/TASK-010-frontend-library-integration-audit.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- `docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`

Edit Scope:
- `docs/features/`
- `docs/decisions/`
- `docs/handoffs/v23-migration-verification-contract.md`
- `docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`
- `docs/tasks/done/TASK-018-define-frontend-library-integration-contract.md`

Acceptance Criteria:
- 本Task全体のAcceptance criteriaを満たす。

Constraints:
- libraryのspace配置を決めない。
- Applicationコード、Test program、library sourceを変更しない。
- HandoffだけをCurrent Specificationとして扱わない。
- commit、pushを行わない。

Tests:
- Documentation link/static completeness check。
- 8 library、Decision、Gateのtraceability table確認。

Codex Verification:
- Feature、Decision、TASK-016、Verification Contract間の矛盾と8件の記載漏れを独立照合する。

## Remaining

None.

## Exact next action

採用済みTask graphに従い、TASK-019のRemainingから進める。

## Completed

- 8 library共通contractを`docs/features/frontend-libraries.md`へ正本化した。
- vendor配置、GitHub直参照不採用、同梱許諾を`docs/decisions/ADR-frontend-library-vendoring.md`へ記録した。
- Workflow Document正本と各libraryの利用spaceを移管直前のProject owner判断として明記した。
- TASK-016固有GateをTASK-015の最終suiteへ追跡可能にした。

## Post-completion amendment

- TASK-018完了時点では候補8 libraryの共通contractを定義した。その後、Project ownerが現行Applicationに対応機能のない`zizai-sqlflow-designer`をTASK-016／TASK-015から除外したため、現行の承認対象は7 libraryである。
- 現行正本は`docs/features/frontend-libraries.md`、同梱判断は`docs/decisions/ADR-frontend-library-vendoring.md`、実装EvidenceはTASK-016を参照する。本節は完了時点の8件記録を削除せず、後続決定による差分を明示する。

## Evidence

- `docs/features/frontend-libraries.md`に承認済み7 library、Application Adapter境界、space decision protocolが記録されている。
- `docs/decisions/ADR-frontend-library-vendoring.md`に7 libraryのlocal vendoring許諾と`zizai-sqlflow-designer`除外が記録されている。
- TASK-016のWP-11 Evidenceが7 libraryのsource URL、exact commit、LICENSE、runtime load orderと各Integration Gateの完了を記録している。

## Termination condition

全Acceptance criteriaが満たされ、TASK-019／TASK-010／TASK-016が推測なしに計画できる正本とDecisionが保存されること。
