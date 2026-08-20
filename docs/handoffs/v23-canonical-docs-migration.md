# v23 Canonical Documentation Migration

- Related task: TASK-006
- Date: 2026-08-21
- Status: Implemented
- Decision source: [v23 Harness / Docs Disposition](v23-harness-docs-disposition.md)

## Migration map

| Legacy source group | Disposition applied | Canonical destination |
|---|---|---|
| `.codex-harness/reports/reference/standards/{architecture,coding-rules,implementation-flow}` | MERGE | `docs/features/{architecture,coding-rules}.md` |
| `standards/{datatype,yaml-format}`、`areas/core` | MERGE | `docs/features/data-contract.md` |
| `standards/{chrome,selenium}_connector_definition`、`areas/connectors` | MERGE | `docs/features/connectors.md` |
| `standards/{design-rules,state-management}`、`areas/static` | MERGE | `docs/features/frontend.md`、共通規約は`coding-rules.md` |
| source-cleanup summary/checklist | MERGE | `docs/features/refactor-policy.md` |
| `.docs/areas/backend-tests.md` | MERGE as unimplemented plan | `docs/handoffs/backend-test-plan.md` |
| 2026-06 Excel benchmark/timeline/memory reports | ARCHIVE unique evidence | `docs/handoffs/legacy-performance-evidence.md` |
| 202606 UI/library compatibility reports | ARCHIVE decisions/blockers | `docs/handoffs/legacy-ui-library-decisions.md` |
| checks | MERGE | Task Acceptance criteriaと`coding-rules`/`refactor-policy`へ統合 |
| active/completed Task files | MOVE by state | `docs/tasks/{active,done}/` |

## Deliberately not canonicalized

- 旧`asis/tobe/issues/tasks`をそのまま複製していない。現行実装と一致するcontractだけをFeatureへ統合し、未承認のcleanup/refactor候補は`refactor-policy.md`で候補として明示した。
- 202606 UI capture/code-only基準はnative確認未完のためCurrent UI正本にしていない。
- 旧backend 100/103-case planは未実装・scope未承認のためTASK-008へ自動追加していない。
- 重複する調査log、memory sample CSV、旧report全文を`docs/`へ複製していない。

## Retained unresolved items

旧`reports/areas/root/`から、現在も未実装と確認できる次の2点を引き継ぐ。

- `api_profile.certificate`のWindows証明書store実解決。READMEにも未実装として残っている。Security behaviorの追加であり、設定path移動だけを扱うTASK-010へ混在させない。
- 不可視変数の専用一覧UI。既存hidden reference処理のMigrationとは別のUI機能追加であり、Frontend物理移動だけを扱うTASK-012へ混在させない。

いずれもTASK-006で実装scope、Acceptance criteria、依存関係を新規決定しない。固有情報を本Handoffで保持し、優先度が決まった時点で専用Task化する。その他のroot課題は、現行entrypoint責務を`architecture.md`へ統合したか、完了済み挙動として再移管しなかった。

## Preserved EXCLUDE assets

`.codex-harness/orchestration/`、`subagents/`、`scripts/`、legacy reports、`.docs/`はTASK-006で削除していない。これらはCurrent Specificationではなく、別cleanup Taskで参照・Disposition・削除Gateを満たすまでlocal historyとして保持する。

`.codex/rules/`と`.codex/hooks.json`はApproved Decisionに従い作成していない。
