# TASK-017 Audit Migration Outcomes and Replan from Final Goal

## Status

Completed

## Goal

最終的なApplication完成状態から逆算し、TASK-001～009の成果が手戻りを生まないか再監査するとともに、TASK-010以降の依存GraphとCritical Pathを再構築する。

## End State

承認済みArchitectureと全8 Frontend library利用要件を満たす完成状態へ、二重移行・使い捨て実装・不要な再検証を避けて到達できる実装順とTask境界が、Repository Evidence付きで確定している。

## Scope

- TASK-001～009の成果を、`再実施不要`、`再検証のみ`、`文書・依存補正`、`部分修正`、`全面再実施`へ分類する。
- TASK-010以降をTask番号や現行順序に拘束されず、最終ゴールから逆算する。
- `must precede`、並行可能、推奨順序を分離し、Critical Pathを示す。
- TASKの分割・統合・前倒し・並べ替え・追加・廃止案を、Evidenceと影響付きで示す。
- TASK-010の着手可否を `GO`、`GO-AFTER-REVISION`、`NO-GO`で判定する。

## Out of scope

Applicationコード、Test、正規仕様、既存Task、Decisionの変更。実装、Task再編の適用、commit、push、merge。

## Dependencies

承認済みDecisionは再検討しない。現行Feature、Task、実コード、Testを一次情報として使用する。

## Goal Traceability

- 過去成果の再利用可否 → TASK-001～009監査表
- 手戻りのない実装順 → 逆算Dependency GraphとCritical Path
- 未決定事項の安全な保留 → Owner・判断期限・適用Work Package一覧
- TASK-010着手判断 → 明示的なGO判定と前提条件

## Critical Path

TASK-017調査 → Project ownerによる再編案承認 → 承認されたTask文書の更新 → 実装再開。

## Parallel Work

なし。Task graphの再編前にApplication実装を進めない。

## Task Graph Changes

本調査で提案し、Project ownerの承認前には適用しない。

## Deferred Decisions

- Frontend libraryのspace配置: Project ownerが各移行Work Package開始前に決定する。
- 調査で新たに見つかった判断事項: Owner、最終判断期限、適用先をReportへ記載する。

## Expected change area

- `docs/tasks/active/TASK-017-audit-migration-goal-and-replan.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`

## Work Package plan

### WP-1 Independent migration audit and backward plan

Owner: claude-assist

Assignment Reason: Repository上の正本・Task・実コード・Testを広く照合する独立調査であり、ユーザーがClaude OpusによるMarkdown Report作成を明示指定したため。

Task: TASK-001～009を再監査し、TASK-010以降を最終ゴールから逆算した調査Reportを作成する。

Dependencies:
- 本TASK定義。

Read Scope:
- `AGENTS.md`
- `docs/README.md`
- `docs/features/`
- `docs/decisions/`
- `docs/tasks/done/`
- `docs/tasks/active/`
- `docs/handoffs/`の直接関連資料
- `zizai.py`、`bin/`、`app/`、`core/`、`connectors/`、`static/`、`config/`
- `tests/`、`pyproject.toml`、`uv.lock`、`.github/workflows/`

Edit Scope:
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`

Acceptance Criteria:
- Final End Stateと不変条件が明記される。
- TASK-001～009がEvidence付きで5分類され、全面再実施の要否が明記される。
- TASK-010以降のCritical Path、並行作業、Task graph変更案が示される。
- 二重移行、一時Architecture、循環依存、最終検証順序を明示的に検査する。
- Deferred DecisionごとにOwner、最終判断期限、適用Work Packageが示される。
- TASK-010のGO判定と必要な前提条件が示される。
- 未確認事項と追加Read Scopeが必要な場合の理由が示される。

Constraints:
- 承認済みDecisionを再検討しない。
- Frontend libraryのspace配置を推測しない。
- Handoffを単独でCurrent Specificationとして扱わない。
- Edit Scope外を変更しない。
- commit、push、mergeを行わない。

Tests:
- Markdown構造、Repository内参照、TASK番号、Evidence pathのStatic確認。
- 実行前後のGit status比較。

Codex Verification:
- Claudeの各重大指摘を正本・実コード・Testへ再照合する。
- Edit Scope外変更がないことを確認する。

## Remaining

None

## Completed

- Claude Opusが`docs/handoffs/TASK-017-migration-goal-backward-audit.md`を作成した。
- CodexがEdit Scope、重大指摘、承認済みDecisionとの整合を検証し、Reportへ採用分類を追記した。
- Project ownerがCodex検証済みの再編方針を承認し、TASK-010～016、Verification Contract、Current SpecificationへTask graphを反映した。
- 8 library共通contractをTASK-018、external URL scheme boundaryをTASK-019として追加した。

## Evidence

- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- Claudeが追加した変更は上記Report 1件のみ。
- RISK-CONFIG-001はscheme拒否2件のFailを再現したが、Temp ACLによるsetup Error 2件を伴ったため全Gate結果は未確定。

## Exact next action

TASK-005とTASK-018を先行し、TASK-019およびTASK-010のDeferred Decisionへ進む。

## Termination condition

調査ReportがAcceptance Criteriaを満たし、Codex検証結果と未解決事項がProject ownerへ提示されること。
