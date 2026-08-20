# TASK-001〜005 レビュー方針まとめ

## 目的

TASK-001〜005を実行するCodex側へ、レビュー中に確認した方針・前提・確認事項を共有する。

---

## TASK-001 — Application Architecture / Runtime

### 方針

- Application Architectureを白紙から再検討しない。
- まず既存の設計資料、Migration Map、Audit、既存Decision、現行実装から、すでに決定・合意されている方針を抽出する。
- 抽出結果を「既存方針としてこう理解した」と整理し、ユーザーには新規選択を求めず、「この理解でOKか」という確認依頼にする。
- 既存資料・実装だけでは決定済みと判断できない事項だけを、未決定事項として提示する。
- `Embedded UI`、Runtime構成、`apps/web/api/desktop` の責務分割、Repository Structureを、根拠なく二者択一にしない。
- Architectureを再設計するのではなく、既存方針を確認した上で、本当に未決定の境界だけをDecision対象にする。

### 矛盾がある場合

今回のv23方針と既存方針に矛盾がある場合、黙って解消・上書きしない。

以下を明示する。

- 矛盾している既存方針
- 矛盾している今回のv23方針
- 根拠となる資料・実装・Decision
- 責務、境界、Runtime、Repository配置のどこで衝突しているか

その上で、「この理解で正しいか」「どちらを正とするか」を確認依頼する。

---

## TASK-002 — Docs / Harness Disposition

### 方針

- 新構成を正本とする。
- 基本は **MERGE中心** とする。
- 新構成に合わない、または不要な旧資産は `EXCLUDE` / 削除候補とする。
- 必要な情報でも配置が旧構成なら、新構成のルールに従って `MOVE` または `MERGE` する。
- 同一Definition・同一情報を複数箇所へ残さず、新構成側へ統合する。
- 旧構成をそのまま保存すること自体を目的にしない。

### 用語について

TASK-002の `MERGE` とTASK-003の `INTEGRATE` など、TASK間でDisposition用語が異なる。

これが対象資産の性質に応じた意図的な使い分けなのか、共通Vocabularyへ統一すべきなのかを確認する。

---

## TASK-003 — 202607 → 202608 差分・欠落確認

### 前提

- 202607から202608（現行HEAD）へは基本的にそのまま移行済みで、ほぼ全資産が存在する想定。
- 本Taskの主目的は、過去WIPを白紙から復活判断することではなく、**202607 → 202608の差分・欠落検査** とする。

### 調査方針

- 主比較軸は **202607 branch と 202608（現行HEAD）**。
- `2e6ab92` は必要に応じてGit Evidenceとして利用する。
- 202607に存在し202608に存在しないものが見つかった場合だけ、以下をEvidence付きで判定する。
  - 移行漏れ
  - 意図的な削除 / 不要化
- 移行漏れであれば原則 `INTEGRATE`。
- 実質的な差分がなければ追加のユーザー判断は不要。

---

## TASK-004 — Migration Verification

### 基本方針

テストを網羅的に増やすのではなく、重要な操作・境界を使ってMigrationの回帰を検出する。

### Integration Test

- **Integration Testを自動テストの主軸** とする。
- 主要な機能・ユースケースを洗い出し、複数コンポーネントを通る重要経路をテストする。
- Repository移行後も、主要機能が接続された状態で成立することを確認する。

例:

- API → Core / Application → Connector
- API → Config
- 主要なConnector discovery
- Frontend / Bridge / Backend間の主要な接続経路

### Runtime Test

- Runtime Testはユーザーが手動で実施する。
- Codex側では、重要な実操作を洗い出して **手動テストフロー** を作成する。
- 各Stepについて「操作」と「期待結果」が分かる形にする。

対象例:

- Desktop起動
- UI表示
- Backend / localhost API起動
- Frontend → Backend通信
- Connector読み込み
- 主要機能の実行
- Config反映
- 正常終了
- 必要な場合のみQWebChannel経由機能

### Unit Test

- 全関数を対象にした細粒度のUnit Testは行わない。
- 基本はIntegration Testで主要機能を保証する。
- Unit Testは以下の場合に限定して追加する。
  - Integration / Runtime Testで不具合が発生し、原因となるロジックを単独で固定したい場合
  - 複雑なロジックで、Integration Testだけでは原因特定・回帰防止が難しい場合
- 「関数が存在するからUnit Testを書く」という方針にはしない。

### Static Check / Code Review

- Staticなコード品質・構造確認は **Claude Codeでコードレビューする方針**。
- 例:
  - importの整合性
  - 依存方向
  - Repository Structureとの不整合
  - 旧Path / 旧構成の残存
  - 不要コード
  - Architecture上の境界違反

### 全体像

- Integration Test: 自動検証の中心
- Runtime Test: ユーザーによる重要操作の最終確認
- Unit Test: 問題発生時・複雑ロジックの補完
- Static Check: Claude Codeによるコードレビュー

---

## TASK-005 — Target-Unmapped Assets

### 基本方針

- まずv23 Target Treeに対応先がない既存資産を漏れなくリストアップする。
- いきなりDispositionを決めず、用途・参照元・現在の利用状況を整理する。
- 一覧を見た後、ユーザーが最終確認する。

### `scripts/`

- 何のために存在するフォルダなのかを調査する。
- 各scriptについて、用途、呼び出し元、現在も利用されているかを確認する。
- 調査結果を見てから `KEEP / MOVE / ARCHIVE / IGNORE / REMOVE_CANDIDATE` を判断する。

### `tableau-mcp/`

- **削除方針でOK**。
- 削除前提で扱い、必要なら依存・参照が残っていないことだけ確認する。

### 企画資料 / 個人作業ファイル

- まず具体的に何を指しているのかリストアップする。
- この段階で一律削除しない。
- 一覧と用途を提示し、ユーザー確認後にDispositionを決める。

---

## Codexへの共通指示

1. 白紙からユーザーへ方針を質問しない。
2. 既存資料・実装・履歴から、既に決まっていることと事実を先に抽出する。
3. 既存方針と今回の移行方針に矛盾があれば、Evidence付きで明示する。
4. 不明点は推測で埋めず、「未決定」「要確認」として分離する。
5. ユーザー確認が必要な場合は、調査結果を示した上で「この理解でOKか」という確認形式にする。
6. 既存資産を残すこと自体を目的にせず、新構成を正として必要なものを統合する。
