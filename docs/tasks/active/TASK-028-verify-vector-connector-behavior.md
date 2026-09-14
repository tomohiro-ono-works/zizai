# TASK-028 Verify Vector Connector Behavior and Required Fixes

## Status

Deferred — 正常動作未確認 / 改修必要性あり。着手時期はProject ownerが決定する。TASK-015の初回release Gateには含めない。

## Goal

現行Vector Connector（`VectorConnector.embedding_vector_db`、`VectorConnector.search_vector_db`）の正常動作を、現行Source、Current Specification、実際のConnector契約に基づいて確認する。不具合または不足が確認された場合は、必要な改修とTestを行う。

あわせて、埋め込みmodelの既定値と設定方法を統一し、Vector DBの作成時と検索時で互換性のないmodelを使えない設計を定める（2026-09-15追加）。

## Scope

- 現行`apps/connectors/vector_connector.py`、`apps/gui/config/config.js`のVectorConnector定義、WorkflowEngine経由の実行経路の再調査。
- Vector DB（FAISS index、DuckDB metadata）の作成・更新・検索、model設定、入出力契約、error handlingの動作確認。
- 確認結果に基づく必要最小限の改修と、その改修を検証するTestの追加。
- 埋め込みmodelの既定値の不一致（GUI既定値`cl-nagoya/ruri-v3-30m`、Connector既定値`cl-nagoya/ruri-v3-130m`）の解消（2026-09-15追加）。
- Vector modelを設定から変更可能にする設計。設定の保存先と、既定値／stepの`model_name`指定の優先順位を含む（2026-09-15追加）。
- build（`embedding_vector_db`）とsearch（`search_vector_db`）で同じmodelを使っていることの確認と、異なるmodelを許さない設計（2026-09-15追加）。
- Vector DB metadata（model name、embedding dimension、必要ならmodel revision、作成日時）による互換性確認の設計と、model変更時の既存Vector DBとの互換方針（2026-09-15追加）。

## Out of scope

- DataViewerの表示Pattern決定（TASK-025）。
- Vector Connector以外のConnectorの検証・改修（TASK-024、TASK-027等の範囲）。
- 旧Harness文書・旧仕様書の内容を、そのまま現行仕様として採用すること。
- 確認結果とProject ownerの承認がないmodel変更、依存追加、保存形式変更。

## References

- 現行Source: `apps/connectors/vector_connector.py`、`apps/gui/config/config.js`
- Current Specification: [Connector Contract](../../features/connectors.md)、[Data Contract](../../features/data-contract.md)
- 現行action一覧（non-canonical）: [Current Connector and Action Inventory](../../handoffs/current-connector-action-inventory.md)
- 旧case設計（未承認）: [Backend Test Plan Handoff](../../handoffs/backend-test-plan.md)の付録Aの`Vector`行（VE01〜VE06）と付録Bの`EXT-VE-01`
- 修正履歴: `071d861`（2026-06 release）、`2e6ab92`（202607 WIP、`origin/release/202607`）、`1f85aa6`（`apps/connectors/`へ移設）、`701e6c5`（既定modelを`cl-nagoya/ruri-v3-130m`へ変更）
- 旧資料（Current Specificationではない。Git履歴にのみ存在）: `git show 2e6ab92:.docs/areas/vector-connector.md`、`git show 2e6ab92:tests/python/test_vector_connector.py`

## Constraints

- 「壊れている」と前提せず、確認結果をEvidenceとして記録してから改修範囲を決める。
- 旧Harness文書・旧仕様書は参考情報に留め、現行Source、Current Specification、実際のConnector契約を基準に再調査する。
- Vector Connector固有の契約をCurrent Specificationへ追加・変更する場合は、変更案を示してProject ownerの承認を得る。
- 実modelのdownload、Hugging Face通信、長時間のCPU処理を伴う実行は、[Backend Test Plan Handoff](../../handoffs/backend-test-plan.md)の外部実行境界に従い、実行直前に承認を得る。
- Test dataは`tmp_path`等の一時領域に置き、`workflows/`のユーザーデータを変更しない。
- model設定の変更可能化と、Vector DB metadataの形式変更は、設計案（保存先、優先順位、互換性確認、既存DBの扱い）をProject ownerが承認してから実装する（2026-09-15追加）。

## Acceptance Criteria

- 構築・検索の両actionについて、正常系と代表的な異常系の確認結果（成功／失敗、再現手順、実行環境）がEvidenceとして記録されている。
- model設定、Vector DB保存物、入出力契約、error handlingの確認結果が記録されている。
- 確認された不具合・不足は、改修とTestで再発防止されているか、未改修の理由と責務Taskが記録されている。
- 追加・変更したTestが、Static Gateと該当するverification Gate（`tests/run-verification.ps1`）で通過している。
- GUIとConnectorの既定modelの不一致が解消され、既定modelの正本が1か所に定義されている（2026-09-15追加）。
- model設定の保存先と優先順位の設計が、Project ownerに承認されている。実装した場合はTestで確認されている（2026-09-15追加）。
- build、追加登録、searchで互換性のないmodelを使うと、明確なerrorで拒否されることがTestで確認されている（2026-09-15追加）。
- Vector DB metadataの設計（model name、embedding dimension、model revisionの要否、作成日時）と、既存Vector DBとの互換方針が記録されている（2026-09-15追加）。

## Tests

- fake modelと実FAISS／DuckDBを使うoffline Testを先に整備する。
- 実modelによる構築・検索と、UIからのaction実行は、承認後の個別確認として分離する。

## Remaining Work

### 現状認識

- Vector Connectorの現行実装は存在する。
- 過去にVector DB周辺の修正履歴がある（`References`の修正履歴）。
- ただし正常動作は現時点で未確認であり、追加の調査・改修が必要になる可能性が高い。
- Vector Connector専用のtracked Testは現時点で存在しない。

### 再確認項目

1. Vector DB接続: collection単位の`.faiss`／`.duckdb`の作成、読込、同一ID更新、collection不在時の挙動。
2. model設定: 既定model、CPUでのload、Hugging Face cache／通信、model未取得時の挙動。
3. 入出力契約: 入力列、検索結果列、metadataと`vector`列のJSON serialization、型registryとの整合。
4. error handling: 必須値不足、入力ID重複、`top_k`境界、file・collection不在。
5. Test: offline Testと実model確認の分離、verification Gateへの組込み。
6. 実model経由: 承認後に実modelで構築から検索までが完走し、保存物と検索結果が整合するか。
7. UI/action経由: 画面から`embedding_vector_db`／`search_vector_db`を実行し、結果が返るか（表示Patternの決定はTASK-025）。

### 旧Harnessからの引継ぎ（2026-06-20時点の記録。Current Specificationではない）

旧Harness `vector-connector-status-2026-06-20.md`（local-only、2026-09-14削除）のうち、今後の判断に必要な点だけを残す。

- 当時の確認範囲は、test doubleのmodelを使った登録・検索・同一ID更新の3 Testと、当時の既定model（`cl-nagoya/ruri-v3-30m`）単体のCPU load・encodeまでだった。
- 実modelを使ったConnector経由の構築・検索と、UIからのaction実行は未確認のまま残っていた。
- Windows環境でHugging Face cacheのsymlink非対応警告と未認証アクセス警告が出ていた（encode自体は成功）。
- 検索結果のmetadataは、当時の型registryが`STRUCT`を扱えないためJSON文字列で返す方針だった。現行の型registryと出力契約で再確認する。

### 2026-09-15追加: model既定値・設定・互換性の論点（Current Specificationではない）

#### 現状（2026-09-14検証とコード確認）

- 既定modelが一致していない。GUIのform（`embedding_vector_db`と`search_vector_db`の`model_name`）の既定値は`cl-nagoya/ruri-v3-30m`、Connectorの`DEFAULT_MODEL_NAME`は`cl-nagoya/ruri-v3-130m`。
- `model_name`を省略したstep（Connector既定値の130m）と、GUI既定値（30m）を持つstepが同じcollectionを使うと、検索時に「指定した model_name がコレクション作成時のモデルと異なります」で失敗しうる。この組み合わせは未実行。
- collectionごとの`collection_settings`に`model_name`、`dimension`、`metric`（`cosine`）を保存し、`embedding_vector_db`と`search_vector_db`の両方で`model_name`と次元数の一致を検証している。
- model revisionとcollectionの作成日時は保持していない。`vector_records.updated_at`はrecord単位の更新日時である。
- modelをアプリの設定から変更する手段はなく、flowの各stepの`model_name`で指定する。
- cache済みの`cl-nagoya/ruri-v3-130m`をofflineで使った検証では、次がすべて成功した（Connector直接実行とCLI）。
  - 5件登録後の検索で、top1が期待どおりの文書になった。
  - 同一IDを再登録しても重複しなかった。
  - `include_vector`で`vector`列が出力された。
  - 存在しないcollectionの検索がerrorになった。
  - CLI flow（Python→登録→検索→CSV出力）が完走した。

#### 追加で確認・設計する事項

1. 既定modelの正本を1か所に定め、GUIとConnectorの既定値を一致させる。
2. Vector modelを設定から変更可能にする設計。設定の保存先（Source設定／Runtime state）、アプリの既定値とstepの`model_name`指定の優先順位、GUIでの選択肢を含む。
3. buildとsearchで同じmodelを使っていることを確認する。collection作成時と異なるmodelでの検索・追加登録を許さない。
4. Vector DB metadataとして、最低限model name、embedding dimension、必要ならmodel revision、作成日時を保持し、検索時と追加登録時に互換性を確認する案を作る。
5. model変更時の既存Vector DBとの互換性を決める。再構築の要否、旧形式metadata（revisionと作成日時がない）のcollectionの扱い、利用者へのerror表示を含む。

推奨実装順序上の位置付けは5/7（TASK-032 → TASK-033 → TASK-034 Subtask A → TASK-036 → TASK-028 → TASK-034 Subtask B → TASK-035）。着手時期はProject ownerが決定する。
