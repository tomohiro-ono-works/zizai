# Documentation Index

`docs/`は、このRepositoryの仕様・Task State・Decision・Handoffの唯一の正本である。

## Ownership

- `features/`: 現在有効な仕様と実装・検証ルール。
- `tasks/active/`: 未完了Task。変更範囲、Acceptance criteria、Evidenceを持つ。
- `tasks/done/`: 完了済みTaskの実行記録。
- `decisions/`: 再検討しない重要な設計判断と、その理由・代替案。
- `handoffs/`: 調査Evidence、未実装計画、Chatを跨ぐ引き継ぎ。
- `codex_development_guide_2026-08-15_v24/`: version固定の開発参考資料。ZizAIのCurrent Specificationや採用済みTopologyではない。

## Primary references

- [Architecture](features/architecture.md)
- [Coding rules](features/coding-rules.md)
- [Refactor policy](features/refactor-policy.md)
- [Data contract](features/data-contract.md)
- [Connector contract](features/connectors.md)
- [Frontend contract](features/frontend.md)

同じ仕様を別pathへ複製しない。TaskやHandoffに記載された履歴とCurrent Specificationが競合する場合は、`features/`と実コードを優先する。重要な設計判断については`decisions/`を確認する。
