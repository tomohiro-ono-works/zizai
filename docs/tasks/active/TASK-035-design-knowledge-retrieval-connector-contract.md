# TASK-035 Design Knowledge and Retrieval Connector Contract

## Status

Deferred — 設計Task。推奨実装順序 7/7（TASK-032 → TASK-033 → TASK-034 Subtask A → TASK-036 → TASK-028 → TASK-034 Subtask B → TASK-035）。TASK-028でのVector Connectorの検証結果とmodel設計を入力とする。

## Goal

Vector、BM25、Ontology、Knowledge Graphを含むKnowledge／Retrieval Connector群について、個別Connectorの実装に先立って共通Contractを設計する。設計の対象は入出力、index／store／searchの責務、metadata、persistence、Connector間の組み合わせとし、Project ownerが承認できる設計案にする。

## Scope

- 対象Connector候補の整理と、それぞれの責務の定義。
  - Vector（現行の`VectorConnector`）
  - BM25（語彙ベースの全文検索）
  - Ontology（語彙・概念の階層、同義語）
  - Knowledge Graph（entityと関係）
- 共通Input／Outputの設計。
  - 登録の入力: id、text、metadata
  - 検索の入力: query、top_k、filter
  - 検索の結果: id、score、scoreの種別、取得元Connector、metadata
  - [Data Contract](../../features/data-contract.md)のDataFrame schemaとの整合
- index／store／searchの責務分離。構築、同一IDの更新（upsert）、削除、再構築、検索を含む。
- metadataの設計。
  - collection／index単位: model、embedding dimension、tokenizer、作成日時、形式version
  - record単位のmetadata
  - 互換性の確認方法（TASK-028のmodel互換性設計と整合させる）
- persistenceの設計。保存場所（Workspace／Runtime state）、file形式、同時実行とlock、backup／形式移行を含む。
- Connector間の組み合わせの設計。
  - Vector + BM25のhybrid検索（score正規化やReciprocal Rank Fusion等、統合方式の候補と比較観点）
  - Ontology／Knowledge Graphによるquery展開、filter、再ランキング
  - 複数Connectorの結果を後続stepで扱う形式
- 日本語textの処理。BM25のtokenizer（形態素解析等）を選ぶ観点と、外部依存の確認手順。
- 検索品質の評価方法の候補（確認用data、指標）。

## Out of scope

- 個別Connectorの実装、依存追加、保存形式の変更。
- 現行Vector Connectorの検証と修正（TASK-028）。
- 外部の検索service、LLM API、クラウドstoreへの接続。

## References

- 現行Source: `apps/connectors/vector_connector.py`（FAISS index、DuckDB metadata、`collection_settings`による`model_name`／`dimension`／`metric`の保存）
- Current Specification: [Connector Contract](../../features/connectors.md)、[Data Contract](../../features/data-contract.md)、[Architecture](../../features/architecture.md)、[Coding Rules](../../features/coding-rules.md)（`External dependencies`）
- 関連Task: [TASK-028](TASK-028-verify-vector-connector-behavior.md)（Vector Connectorの検証、model既定値・互換性の設計）

## Constraints

- 設計Taskであり、Source code、依存、保存形式を変更しない。
- 外部依存の候補（BM25 library、tokenizer、graph store等）は、採用を提案する前にCoding Rulesの`External dependencies`の観点で確認する。
- 設計をCurrent Specificationへ反映するのは、設計案が承認された後に別途行う。
- 既存のVector Connectorと保存済みVector DBの互換性を損なう設計案は、移行方針とあわせて提示する。

## Acceptance Criteria

- 対象Connector候補ごとの責務と、共通Contract（入出力schema、index／store／search、metadata、persistence）の設計案が記録されている。
- Vector + BM25を含むConnector間の組み合わせ方式について、候補と比較観点が記録されている。
- 既存VectorConnector（TASK-028の結果）との整合方針と移行方針が記録されている。
- 実装を行う後続Taskの分割案が作成され、Project ownerに承認されている。
