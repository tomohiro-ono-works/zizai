# v23 Migration Map

## 1. Executive Summary

- zizaiは現状、**単一プロセスのPySide6デスクトップアプリ**であり、独立したWebアプリ・APIサーバは存在しない(監査L9,26)。v23 Target Architectureの `apps/web` `apps/api` `apps/desktop` `apps/common/config` という「複数デプロイ単位の分割」は、現状Evidenceだけでは**web/api相当が実在しない**ため、そのまま適用すると実体のない箱を作ることになる。
- `static/`(Web UI)は `QWebChannel` 経由でデスクトップホストと1対1結合しており(監査L23,26,92)、単独デプロイ可能な「Webアプリ」としてのEvidenceがない。`apps/web/`への昇格は現段階では根拠不足と判断し、Exceptionとして報告する(§13)。
- `app/runtime/` `app/services/` `shared/` および一部`connectors/`・`core/`ファイルはGit依存グラフ上完全に孤立しており(監査L91,117-119)、削除・統合いずれの判断も現時点ではUNKNOWNとする。AGENTS.mdの「破壊的変更前に必ず意図確認」方針(L36)に従う。
- `.codex-harness/` `.docs/` はAGENTS.md自身が「単独では正本として扱わない」と定義するローカル専用層(L39、`.gitignore`該当)であり、`docs/`配下への統合は単なるパス移動ではなく**正本化という方針決定**を伴う。
- パッケージ管理は現状 `requirements.txt` + `.env/`(venvディレクトリ)方式であり、Target Architectureが想定する `pyproject.toml` / `uv.lock` / `.venv/` とは方式そのものが異なる(`pyproject.toml`・`uv.lock`は不在を実地確認済み)。これはパスMappingではなくツールチェーン移行の別ワークストリームとして扱う。

## 2. Proposed Target Tree

Target Architectureをそのまま基準として使用する(独自再設計はしていない)。各ノードに、既存Repositoryとの対応状況のみ注記する。

```
repo/
├─ AGENTS.md                  # 既存: KEEP(パス一致)
├─ .agents/
│  └─ skills/                 # 既存: KEEP(パス一致)
├─ .codex/
│  ├─ agents/                 # 既存: KEEP(パス一致)
│  ├─ rules/                  # 既存に対応ファイルなし(新規)
│  ├─ config.toml             # 既存: KEEP(パス一致、内容の現行性は別途要確認)
│  └─ hooks.json              # 既存に対応ファイルなし(新規)
├─ .github/
│  └─ workflows/              # 既存: KEEP(パス一致、内容は要再構築)
├─ .vscode/                   # 既存: KEEP(パス一致)
├─ apps/
│  ├─ web/                    # 現行Evidenceでは対応候補なし(§13 Exception)
│  ├─ api/                    # 現行Evidenceでは対応候補なし(§13 Exception)
│  ├─ desktop/                # app/, zizai.py, bin/, core/, connectors/ が候補
│  └─ common/
│     └─ config/              # config/(一部)が候補
├─ docs/
│  ├─ features/                # 既存に populated な対応なし
│  ├─ tasks/
│  │  ├─ active/               # 既存に populated な対応なし
│  │  └─ done/                 # 既存に populated な対応なし
│  ├─ decisions/               # 既存に populated な対応なし
│  └─ handoffs/                # 既存: KEEP(v23-repository-audit.mdが既に配置済み)
├─ tests/                     # 既存: パス一致だが内容の大半が孤立/生成物
├─ .venv/                     # 既存に対応なし(`.env/` が実質同義だが方式差異あり)
├─ .env                       # 既存の `.env/` はvenvディレクトリでありファイルではない(名称衝突に注意)
├─ pyproject.toml             # 既存に対応なし(requirements.txt方式)
└─ uv.lock                    # 既存に対応なし
```

**重要な名称衝突の指摘**: 現行リポジトリでは `.env/` は「Python仮想環境ディレクトリ」(監査L107)であり、Target Architectureの `.env`(dotenvファイル)とは意味が異なる。既存 `.env/` を安易に `.venv/` へリネームする、あるいは新規 `.env` ファイルを追加する際は、この名称衝突が事故要因になりうる(§10 Migration Risks)。

## 3. Migration Mapping

### 3.1 Application層

| Existing Path | Current Responsibility | Target Path | Action | Evidence | Risk | Confidence |
|---|---|---|---|---|---|---|
| `zizai.py` | CLI/GUI起動ディスパッチャ | `apps/desktop/zizai.py` | MOVE | 監査L22,36 | bin/スクリプトのパス参照更新必須 | Medium |
| `bin/ziz.bat` / `bin/ziz.sh` | venv経由でzizai.py起動 | `apps/desktop/bin/` | MOVE | 監査L21 | zizai.py移動と同時実施必須 | Medium |
| `app/main.py` | CLIヘッドレス実行(`run_cli`) | `apps/desktop/app/main.py` | MOVE | 監査L24,37 | Low | High |
| `app/gui/host.py` | Desktop/WebView Host本体 | `apps/desktop/app/gui/host.py` | MOVE | 監査L38 | Low(パッケージ内相対import前提) | High |
| `app/gui/bridge.py` | フロント⇔バックエンドRPCブリッジ(唯一のAPI相当) | `apps/desktop/app/gui/bridge.py` | MOVE | 監査L39 | Low | High |
| `app/__init__.py`, `app/gui/__init__.py` | パッケージ初期化 | `apps/desktop/app/...` | MOVE | 構造上付随 | Low | High |
| `core/workflow_engine.py` | `.zizd`実行エンジン、connectors動的ロード | `apps/desktop/core/workflow_engine.py` | MOVE(暫定) | 監査L46,依存グラフL83-88 | 動的ロードのモジュールパス文字列要修正 | Medium |
| `core/flow_locator.py` | `.zizd`パス解決・最近使ったファイル管理 | `apps/desktop/core/flow_locator.py` | MOVE | 監査L42 | Low | High |
| `core/logger.py` | ロギング基盤 | `apps/desktop/core/logger.py` | MOVE | 監査L43 | Low | High |
| `core/security_policies.py` | `security_policies.yml`読込・アクセス許可判定 | `apps/desktop/core/security_policies.py` | MOVE | 監査L44 | configパス変更と同時実施必須 | Medium |
| `core/type_registry.py` | 型変換(pandas⇔BigQuery) | `apps/desktop/core/type_registry.py` | MOVE | 監査L45 | Low | High |
| `connectors/`(実在13ファイル) | 各種データ・自動化コネクタ | `apps/desktop/connectors/` | MOVE | 監査L48,依存グラフ | 動的ロード機構のパス文字列要修正 | Medium |
| `core/テスト.ipynb` | 0バイト、git追跡済みの例外ファイル | ― | REMOVE_CANDIDATE | 監査L109 | Low | Medium(独断削除不可、要確認) |
| `static/home.html`,`dataflow.html`,`settings.html` | Web UI 3画面 | `apps/desktop/static/`(暫定、`apps/web/`昇格は保留) | KEEP(場所維持推奨) | 監査L23,51,92 | QWebChannel/相対パス依存の分離は破壊的 | Medium |
| `static/js/*`,`static/css/*`,`static/config/config.js`,`icons/`,`img/`,`modal/`,`vendor/` | フロー編集UI本体・設定 | 同上 | KEEP | 監査L52-54 | 同上 | Medium |
| `static/js/ui.node.js` | 未参照(デッドコード疑い) | ― | REMOVE_CANDIDATE | 監査L55(grep全域0件) | Low | Medium(要確認) |
| `static/styles.css` | 未参照のレガシー集約ファイル | ― | REMOVE_CANDIDATE | 監査L56(自己申告コメント) | Low | Medium(要確認) |
| `config/security_policies.yml` | セキュリティポリシー本体 | `apps/common/config/security_policies.yml` | MOVE | 監査L59 | `core.security_policies`参照更新と同時実施 | High |
| `config/rename.csv` | リネーム対応表(サンプル) | `apps/common/config/rename.csv` | MOVE | 監査L62 | 実行時読込コード未特定のため利用実態要確認 | Medium |
| `config/file_icon_map.json` | フロントJSが`workspace.readText/writeText`経由で直接読み書き | `apps/common/config/file_icon_map.json` | MOVE | 監査L61 | フロント側の相対パス参照更新要 | Medium |
| `config/recent_flows.json`,`config/recent_roots.json` | 実行時生成の状態ファイル(gitignore対象) | 現状維持(ソース扱いしない) | KEEP | 監査L60-61、`.gitignore`該当行 | Low | High |
| `config/suggest_index/`(README.md+yml2件) | サジェスト用インデックス | `apps/common/config/suggest_index/` | MOVE | 実地確認 | Low | Medium |

### 3.2 Harness層

| Existing Path | Current Responsibility | Target Path | Action | Evidence | Risk | Confidence |
|---|---|---|---|---|---|---|
| `AGENTS.md` | エージェント運用ルール(正本、ただし参照先の多くが実在しない) | `AGENTS.md`(root) | KEEP | 実地確認、`.gitignore`に`/AGENTS.md`(ローカル専用) | 内容の参照切れは別課題として残る | High |
| `.agents/skills/*`(9スキル) | 再利用作業手順 | `.agents/skills/` | KEEP | 実地確認、AGENTS.md L16 | Low | High |
| `.codex/agents/*.toml`(explorer/implementer/reviewer) | エージェント定義 | `.codex/agents/` | KEEP | 実地確認 | Low | High |
| `.codex/config.toml` | ローカルLLM(ollama/gemma)設定 | `.codex/config.toml` | KEEP | 実地確認(中身読了) | 内容が現行運用と一致するか別途要確認 | Medium |
| ―(現行に対応ファイルなし) | ― | `.codex/rules/` | 新規(既存ソースなし) | `ls`で不在確認 | Low | High(不在確認としては高確信) |
| ―(現行に対応ファイルなし) | ― | `.codex/hooks.json` | 新規(既存ソースなし) | `ls`で不在確認 | Low | High |
| `.codex-harness/reports/*` | 調査結果・過去ログ(AGENTS.mdにより非正本) | `docs/handoffs/`統合候補 | UNKNOWN | AGENTS.md L39、監査L137 | 正本化の可否は方針判断であり単純移動ではない | Low |
| `.codex-harness/orchestration/*` | 作業スレッド・引継ぎ管理 | `docs/tasks/{active,done}/`統合候補 | UNKNOWN | 実地確認 | 同上 | Low |
| `.codex-harness/checks/*` | 完了判定・確認項目 | `docs/decisions/`または`.codex/rules/`候補 | UNKNOWN | AGENTS.md L14 | 同上 | Low |
| `.codex-harness/subagents/*` | 202607世代の6分割調査記録 | `docs/handoffs/`候補(過去アーカイブとして) | UNKNOWN | 監査L13 | 同上 | Low |
| `.codex-harness/scripts/*` | 調査補助PSスクリプト | 対応先未定義 | UNKNOWN | 実地確認 | Low | Low |
| `.docs/areas/backend-tests.md` | 承認済みPhase1テスト設計(未実装) | `docs/features/`または`docs/decisions/` | MOVE | 全文読了、`.gitignore`該当 | 正本化により.gitignore方針の見直しも要る | Medium |
| `.docs/`(architecture.md等は不在) | 正本のはずが実体なし | ― | UNKNOWN | 監査L120、実地確認で不在再確認 | ― | High(不在確認としては高確信) |

### 3.3 Documentation / State層

| Existing Path | Current Responsibility | Target Path | Action | Evidence | Risk | Confidence |
|---|---|---|---|---|---|---|
| `docs/handoffs/v23-repository-audit.md` | 本Taskの入力監査レポート | `docs/handoffs/v23-repository-audit.md` | KEEP | 実地確認、既にTarget Pathと一致 | Low | High |
| `docs/features/` `docs/tasks/active/` `docs/tasks/done/` `docs/decisions/` | 現状フォルダ自体が存在しない | 新規作成、内容移管は§3.2のUNKNOWN項目の決定待ち | UNKNOWN | 実地確認(存在しないことを確認) | Low | High |

### 3.4 Verification層

| Existing Path | Current Responsibility | Target Path | Action | Evidence | Risk | Confidence |
|---|---|---|---|---|---|---|
| `tests/python/*.py`,`tests/native/*.py` | ソース物理的に消失(`__pycache__`のみ) | `tests/`配下維持だが内容の復元/削除は要判断 | UNKNOWN | 監査L63,121。`test_service_runtime_boundaries`等のファイル名は`app/services/`(孤立)を対象としたテストと推定され、同一WIP由来の可能性が高い | 削除もリストアも確定できない | Low |
| `tests/playwright/node_modules/`,`artifacts/`,`results/`,`test-results/`,`reports/` | 実行生成物(vendored/生成キャッシュ) | ― | REMOVE_CANDIDATE | 監査L104、実地確認 | Low | Medium(生成物として比較的明確、要確認) |
| `tests/playwright/scripts/*`,`tests/preview.html`,`tests/results/manual/*` | 本体との関係不明瞭 | 対応先未定義 | UNKNOWN | 実地確認 | Low | Low |
| `tests/ui_analysis/ui_analysis_tool/*` | 追加確認したが`__pycache__`のみでソース不在(監査の「tests/全体ソース不在」と一致) | 対応先未定義 | UNKNOWN | 実地確認(追加調査) | Low | Low |
| `tests/docs/sqlbilder` | 内容不明(実地確認でも中身なし相当) | ― | UNKNOWN | 実地確認 | Low | Low |
| `.github/workflows/playwright.yml` | CI定義、git未追跡・依存ファイル不在で機能せず | `.github/workflows/` | KEEP(パスのみ)、内容は要再構築 | 監査L64,122、`git ls-files`で追跡外を再確認 | Low(パス移動自体は無害) | High |

### 3.5 孤立コード / 未統合WIP(横断クラスタ)

| Existing Path | Current Responsibility | Target Path | Action | Evidence | Risk | Confidence |
|---|---|---|---|---|---|---|
| `app/runtime/`(6ファイル) | Unknown、現行ソースなし | 判断保留 | UNKNOWN | 監査L40,117 | 削除/統合どちらも影響大 | Low |
| `app/services/`(26ファイル) | Unknown、現行ソースなし | 判断保留 | UNKNOWN | 監査L41,117 | 同上 | Low |
| `shared/`(4ファイル) | Unknown、現行ソースなし | 判断保留 | UNKNOWN | 監査L50,117 | Medium | Low |
| `core/connector_factory.py`,`security_sanitizer.py`,`utils.py` | Unknown、ソース不在(後2者は履歴皆無) | 判断保留 | UNKNOWN | 監査L47,118 | Medium | Low |
| `connectors/`(8ファイル: api/bq/dummy/file/operation/outlook/rpa_slack/web) | Unknown、動的ロードでも解決不能な死んだ痕跡 | 判断保留 | UNKNOWN | 監査L49,119 | Medium | Low |

### 3.6 Target Architecture外(root雑multiファイル/開発補助)

| Existing Path | Current Responsibility | Target Path | Action | Evidence | Risk | Confidence |
|---|---|---|---|---|---|---|
| `requirements.txt`,`requirements-dev.txt`,`.env/`(venv) | Python依存管理(pip方式) | `pyproject.toml`/`uv.lock`/`.venv`への移行が必要 | UNKNOWN(§13 Exception) | `pyproject.toml`/`uv.lock`不在を実地確認 | High(依存管理方式の全面変更) | Medium |
| `template/*.zizd`,`rename_pdf.py`,`rename_pdf_rules.json` | ワークフロー定義テンプレート | 対応先未定義(Target Architectureに明示ノードなし) | UNKNOWN | 監査L57 | Medium | Low |
| `scripts/*` | 開発補助スクリプト群 | `apps/desktop/scripts/`または現状維持(Target未定義) | UNKNOWN | 実地確認 | Low | Low |
| `logs/`,`workflows/`,`.pytest_cache/`,`.playwright-mcp/`,`.tmp/`,`__pycache__/` | 生成物/ランタイムディレクトリ | 現状維持(Target外、gitignore管理) | KEEP | 監査L97-111 | Low | High |
| `memo.md`,`test.ipynb`,`.obsidian/`,`無題のファイル.base`,`tmp_staged_files_release_202606.txt`,`zizai-craft.pptx`,`tableau-mcp/` | 個人/企画ファイル群 | 対応先なし(Target外) | UNKNOWN(範囲外) | 監査L108-109、`git status`確認 | Low | High |
| `README.md` | プロジェクト説明、AGENTS.md等への参照含む | `README.md`(root、Target Tree非記載だが暗黙的維持) | KEEP | 実地確認 | Low | High |

---

## 4. Mapping Decisions

- **`core/`・`connectors/`を`apps/desktop/`配下に暫定配置した理由**: 依存グラフ上、現在これらを消費しているのは`app/`(デスクトップ)のみであり(監査L83-90)、`apps/api`は実体が存在しない。将来`apps/api`が新設され`core/`を共有する計画があるなら`apps/common/`配下が妥当だが、それは現時点でEvidenceのない仮定であるため採用しなかった。`apps/api`が具体化した時点で再移動が必要になる可能性がある(判断基準7「Migrationによる実装上の利益」は現時点ではdesktop単体配置の方が高い)。
- **`static/`を`apps/web/`へ昇格させなかった理由**: `apps/web`は「独立してデプロイ可能なWebアプリ」を意味すると解釈したが、`static/`はサーバーもビルド構成も持たず`QUrl.fromLocalFile`でデスクトップホストに直接読み込まれ、JS側は`qt.webChannelTransport`必須という強結合構成(監査L23,26,92)。フォルダ名(`static`)だけで判断しないという指示にも合致し、責務実体は「デスクトップアプリの内蔵UI」である。§13でException報告する。
- **`.codex-harness/`・`.docs/`の`docs/`統合を確定させなかった理由**: これらは現状AGENTS.md自身が「非正本」と明記するローカル専用層(L39)。`docs/`という正本ツリーへの統合は、単なるファイル移動ではなく「このドキュメントを正本として扱う」という運用ポリシーの変更を伴う。Mapping Task単体で確定できる範囲を超えるため、UNKNOWNのまま次工程へ引き継ぐ。
- **孤立コード(`app/runtime/`等)を一律UNKNOWNとした理由**: Audit自身がユーザー確認必須と結論しており(監査L117,133)、AGENTS.mdの「破壊的変更前に必ず意図確認」方針(L36)がある以上、本Taskで削除/統合いずれかに倒す判断はしない。
- **パッケージ管理(`requirements.txt`→`pyproject.toml`/`uv.lock`)を経路外に切り出した理由**: これはファイルパスの対応関係ではなく依存解決の仕組み自体の変更であり、Mapping Table上の1行としては表現しきれない。§13でExceptionとして分離した。

## 5. Application Responsibility Mapping

| Target | 現行候補 | 判定 |
|---|---|---|
| `apps/web/` | なし(`static/`は`apps/desktop/`内蔵UIとして扱うことを推奨) | **Exception対象**、候補なし |
| `apps/api/` | なし(`fastapi`/`uvicorn`/`starlette`は`requirements.txt`にあるが未使用、実装コードなし) | **Exception対象**、候補なし |
| `apps/desktop/` | `app/`, `zizai.py`, `bin/`, `core/`(暫定), `connectors/`(暫定), `static/`(暫定) | 主要候補、Confidence Medium〜High |
| `apps/common/config/` | `config/security_policies.yml`,`rename.csv`,`file_icon_map.json`,`suggest_index/` (`recent_flows.json`/`recent_roots.json`は実行時状態のため除外) | 候補あり、Confidence Medium〜High |

## 6. Harness Mapping

- `AGENTS.md` / `.agents/skills/` / `.codex/agents/` / `.codex/config.toml` はパス構造がTargetと既に一致 → KEEP。
- `.codex/rules/` / `.codex/hooks.json` はTargetにのみ存在し現行に対応ファイルなし → 新規作成対象(Mapping対象外、Task Decompositionで新規作成タスクとして扱うべき)。
- `.codex-harness/` 一式(reports/orchestration/checks/subagents/scripts)は、内容的には`docs/`配下と重なるが、正本化ポリシー未決定のためUNKNOWN。

## 7. Documentation / State Mapping

- `docs/handoffs/` は既に監査レポート自体がTarget Pathへ正しく配置されている(唯一「そのまま一致」しているKnowledge/Stateパス)。
- `docs/features/` `docs/tasks/active/` `docs/tasks/done/` `docs/decisions/` は空。populated な既存対応先は `.codex-harness/` と `.docs/areas/backend-tests.md` のみで、いずれも正本化ポリシー決定待ち(§4)。

## 8. Verification Mapping

- `tests/` はパス自体はTargetと一致するが、中身の大半(`tests/python/`,`tests/native/`,`tests/ui_analysis/`)は`__pycache__`のみでソース物理消失(監査L63,121、追加確認でも同様)。`tests/playwright/`はvendored生成物(node_modules等)がREMOVE_CANDIDATE。
- `.github/workflows/playwright.yml` はパスは一致するがgit未追跡・依存ファイル不在で機能しないCI定義(監査L64,122、`git ls-files`で追跡外を再確認)。

## 9. Unresolved Paths (UNKNOWN一覧)

- `app/runtime/`, `app/services/`, `shared/`, `core/connector_factory.py`, `core/security_sanitizer.py`, `core/utils.py`, `connectors/`未実装8ファイル(孤立コード、要ユーザー判断)
- `.codex-harness/`全体、`.docs/`(内容そのものの正本化可否)
- `tests/python/*.py`, `tests/native/*.py`, `tests/ui_analysis/*`, `tests/docs/sqlbilder`, `tests/playwright/scripts/*`, `tests/preview.html`
- `template/*`, `scripts/*`, `tableau-mcp/`, `zizai-craft.pptx`, `無題のファイル.base`
- `requirements.txt`/`.env/` → `pyproject.toml`/`uv.lock`/`.venv` の移行方針そのもの

## 10. Migration Risks

- **動的ロード破壊**: `core/workflow_engine.py`は`connectors`パッケージをpkgutil/importlibで動的解決している(監査L84)。`connectors/`を`apps/desktop/connectors/`へ移動する際、モジュールパス文字列の更新漏れがあると実行時に静かに失敗する(コネクタが「見つからない」形で)。
- **起動スクリプト破壊**: `bin/ziz.bat`/`ziz.sh`は`.env`(venv)経由で`zizai.py`を直接パス指定している(監査L21)。`zizai.py`移動と起動スクリプト更新は同一コミットで行う必要がある。
- **QWebChannel結合破壊**: `static/`を`apps/desktop/`外へ移す、または内部階層を変えると`QUrl.fromLocalFile`の相対パス解決とJS側`qt.webChannelTransport`接続が壊れる可能性が高い(監査L23,92)。
- **`.env`名称衝突**: 現行`.env/`(venvディレクトリ)とTarget記載の`.env`(dotenvファイル)は同名異物。機械的なリネーム・生成は事故のもと(§2参照)。
- **孤立コード誤削除**: `app/runtime/`等をパスの見た目だけで「不要」と判断し削除すると、未マージの202607 WIP作業(監査L117)を失う可能性がある。
- **`.codex-harness/`正本化の副作用**: `.gitignore`除外を解除して`docs/`へ統合すると、これまで「参考資料」だった内容が正本として扱われ始め、AGENTS.mdの運用ルール自体の意味が変わる。

## 11. Migration Dependencies

- `config/security_policies.yml`のMOVE ⇔ `core/security_policies.py`の参照パス更新は同時実施必須。
- `zizai.py`のMOVE ⇔ `bin/ziz.bat`/`ziz.sh`のパス更新は同時実施必須。
- `connectors/`のMOVE ⇔ `core/workflow_engine.py`の動的ロードパス更新は同時実施必須。
- `.codex-harness/`・`.docs/`のdocs/統合は、**正本化ポリシー決定が前提条件**(決定前に個別ファイルだけ移動すると、AGENTS.mdの参照体系と矛盾する)。
- 孤立コード(`app/runtime/`等)の扱い決定は、`tests/python/*`(同一WIP由来と推定されるテスト群)の扱い決定の前提となる。

## 12. Migration Order Constraints

1. **方針決定フェーズ(実装なし)**: 孤立コード(§3.5)の扱い、`.codex-harness/`・`.docs/`の正本化可否、`static/`を`apps/web`へ将来分離するかどうか — これら3点をユーザーに確認してから後続を着手する。
2. **無リスクKEEP確認**: `AGENTS.md`,`.agents/skills/`,`.codex/agents/`,`docs/handoffs/`は現状のままでTarget一致済みのため、他フェーズと独立して先行完了できる。
3. **config層MOVE**: `config/`→`apps/common/config/`と`core/security_policies.py`更新を1セットで実施。
4. **desktop層MOVE**: `app/`,`core/`,`connectors/`,`zizai.py`,`bin/`を`apps/desktop/`へ一括移動し、動的ロードパス・起動スクリプトを同時更新・動作確認。
5. **`static/`の扱い確定**: フェーズ1の決定を受けて`apps/desktop/static/`のまま維持するか`apps/web/`へ分離するかを実施(最もリスクが高いため最後)。
6. **パッケージ管理移行**: `requirements.txt`→`pyproject.toml`/`uv.lock`は上記と独立して並行実施可能。

## 13. Exceptions to v23

1. **`apps/web/`・`apps/api/`の分割は現時点で不合理**: Evidence上、独立したWebアプリ・APIサーバは存在しない。`static/`はQWebChannel経由でデスクトップホストと強結合しており(監査L23,26,92)、`fastapi`/`uvicorn`/`starlette`は未使用依存に留まる(監査L93)。実体のない箱を先に作ることは「独自再設計」ではなく空フォルダの新設に近く、本Taskの範囲(既存Repositoryとの対応関係設計)を超えるため、候補なしとして報告する。
2. **パッケージ管理方式(`requirements.txt`+`.env/` → `pyproject.toml`+`uv.lock`+`.venv/`)はパスMappingの対象外**: 依存解決の仕組み自体を変更する作業であり、ファイル移動では表現できない。別ワークストリームとして扱うべき。
3. **`.codex-harness/`はAGENTS.md自身が非正本と定義する層**(L39)であり、`docs/`への統合はMigration Mapping単体では確定できない方針決定を要する。
4. **`template/`(ワークフロー定義)・`scripts/`(開発補助)・`tableau-mcp/`(社内資料)・`zizai-craft.pptx`は、Target Architectureに対応ノードが明示されていない**。フォルダ名からの類推でapps配下等へ強制的に当てはめることはせず、UNKNOWNとして報告する。
5. **個人作業ファイル群**(`memo.md`,`test.ipynb`,`.obsidian/`,`無題のファイル.base`,`tmp_staged_files_release_202606.txt`)はTarget Architectureの設計対象外と判断し、Mapping確定の対象から外す。

---

以上がMigration Mapです。③ Migration Task Decompositionへ渡す前に、特に以下3点はユーザー判断待ちであることを明記しておきます。

- 孤立コード(`app/runtime/`,`app/services/`,`shared/`等)を削除候補とするか、未マージWIPとして統合対象にするか
- `.codex-harness/`・`.docs/`の内容を`docs/`配下へ正本として統合するか
- `static/`を将来`apps/web/`へ分離する構想があるか、それとも`apps/desktop/`内蔵UIとして扱い続けるか
