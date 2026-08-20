# v23移行前 現状把握レポート(Read-only調査)

- 調査日: 2026-08-16(再調査)
- 対象ブランチ: `release/202608`
- 参照したv23 Architecture / Repository構成資料: `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`
- 調査方法: Read-only(ファイル・import・呼び出し関係の実地確認)。コード・設定・ファイルの変更は一切行っていない。
- 前回調査(v23資料未参照時点)からリポジトリのコード・設定に変更は無いことを`git status`で確認済み。今回は同一の実地調査結果に、v23目標構成との対応関係の確認を追加した。

---

## 0. v23 Architecture資料の要点(参照元の要約)

`05_repo-worktree-folder-structure.md`が定める目標構成:

```text
repo/
├─ AGENTS.md
├─ .agents/skills/
├─ .codex/{agents/, rules/, config.toml, hooks.json}
├─ .github/workflows/
├─ .vscode/
├─ apps/
│  ├─ web/       … WebViewに表示するWeb側
│  ├─ api/       … localhostで動作するPython backend/API
│  ├─ desktop/   … WebViewとlocalhost processのLifecycleを扱う
│  └─ common/config/  … web/api/desktop共通設定
├─ docs/{features/, tasks/{active,done}/, decisions/, handoffs/}
├─ tests/
├─ .venv/        … Git管理しない、Worktreeごとに再生成
├─ .env          … Local環境値。.venvとは別物。Git管理しない
├─ pyproject.toml
└─ uv.lock       … uvでPython Package/Environment管理
```

- 実行関係: `apps/desktop`が`localhost`の`apps/api`を起動 → WebViewを開き`apps/web`を表示。
- `.codex-harness/`のようなHarness専用フォルダは**明示的に作らない**方針(「Harness専用の`.codex-harness/`は作りません」)。
- 生成物(`.pytest_cache/`, `.tmp/`, `logs/`, `__pycache__/`)はSourceとして管理しない。
- Tool固有フォルダ(`.obsidian/`, `.playwright-mcp/`)は用途確認まで削除・移動を確定しない。
- 名前だけで責務を推測して移動しない、というルールが明記されている(本調査の制約と一致)。

以下、この目標構成を「対応候補」の判断基準としてのみ用い、実際の移動・変更は行っていない。

---

## Repository Summary

zizaiは現状 **PySide6 + QtWebEngine** ベースの単一プロセス・デスクトップGUIアプリケーション。Python backend(`app/`, `core/`, `connectors/`, `shared/`)と、ローカルファイルとして読み込まれるWeb UI(`static/`)を`QWebChannel`で橋渡しする構成であり、**HTTPサーバ(localhost API)は一切存在しない**。

v23目標構成は `apps/web` / `apps/api` / `apps/desktop` / `apps/common/config` という3プロセス相当の分離(`apps/desktop`がlocalhostの`apps/api`を起動し、WebViewで`apps/web`を表示)を前提としているが、**現行実装にはこの前提となるlocalhost API層自体が存在しない**。これは名前の置き換えだけでは済まない構造的なギャップであり、後述のMigration Risksで詳述する。

さらに、v23資料が「作らない」と明記する`.codex-harness/`が現リポジトリには広範に存在し(`checks/`, `orchestration/`, `reports/`, `scripts/`, `subagents/`)、パッケージ管理もv23が前提とする`uv`+`pyproject.toml`+`uv.lock`ではなく`pip`+`requirements.txt`が使われている。`.venv/`という名のディレクトリは存在せず、代わりに`.env`という名のディレクトリが実質的な仮想環境(venv)として使われている(v23資料の`.env`の定義=ローカル環境値ファイルと衝突)。

AGENTS.mdが参照する`.docs/architecture.md`等の設計文書一式も実在しないままであり(前回調査から変化なし)、今回新設された`docs/`(ドットなし、v23資料の置き場)と、既存の`.docs/`(ドットあり、AGENTS.mdが参照するがほぼ空)という**2系統の`docs`が並存**する状態になっている。

---

## Entry Points

| 起動方法 | 実体 | 分岐先 |
|---|---|---|
| `bin/ziz.bat` / `bin/ziz.sh` | `.env`(venv)の`python.exe`/`python`で`zizai.py`を起動 | `zizai.py` |
| `zizai.py` `main()`(52-62行) | 引数なし→GUI起動、`.zizd`パス指定→ヘッドレス実行 | `app/gui/host.py:run_webview_app` または `app/main.py:run_cli` |
| `app/gui/host.py` | PySide6でフレームレスウィンドウ生成、`static/home.html`を`QUrl.fromLocalFile()`で直接読み込み(**localhost経由ではない**) | `app/gui/bridge.py`(QWebChannel経由) |
| `app/main.py` `if __name__=="__main__"` | `python -m app.main <flow>`用の別経路だが、`zizai.py`は`run_cli()`を直接呼んでおり実運用経路ではない | `core/workflow_engine.py` |

**localhost API / Backend**: 存在しない。`app/gui/bridge.py`の`WebViewBridge`(QObject)が公開する唯一の口`@Slot(str) postMessage(raw_text)`が、JSON文字列中の`type`(`flow.list`/`flow.load`/`flow.save`/`flow.run`/`preview.readExcel`等)で`BridgeRuntime.handle_message()`にディスパッチするJSON-RPC的設計。HTTPポートは未使用。**v23目標構成の`apps/api`(localhostで動作するPython backend)に相当する実装は現行コードに存在しない。**

**Desktop / WebView Host**: `app/gui/host.py`。PySide6/QtWebEngine(`QWebEngineView`+`QWebEngineProfile`+URLリクエストインターセプタでロックダウン)。pywebview/Electron/WebView2は不使用(v23資料はWebView2を参照しているが、現行実装はQtWebEngineであり別技術)。

---

## Responsibility Map(主要パス)

| Existing Path | Observed Responsibility | Evidence | Dependencies | Runtime/Source | Confidence |
|---|---|---|---|---|---|
| `zizai.py` | CLI/GUI起動ディスパッチャ | `main()` 52-62行 | Source実在 | High |
| `app/main.py` | CLIヘッドレス実行(`run_cli`) | 全文読了 | Source実在 | High |
| `app/gui/host.py` | Desktop/WebView Host本体 | `run_webview_app`, `QUrl.fromLocalFile`(719行) | Source実在 | High |
| `app/gui/bridge.py` | フロント⇔バックエンドRPCブリッジ(唯一のAPI相当、**HTTPではない**) | `postMessage`(2224行), `handle_message`(149行) | Source実在 | High |
| `app/runtime/`(6ファイル) | Unknown — 現行ブランチにソース無し | `git ls-files`空、`__pycache__`のみ | ソース不在 | Unknown |
| `app/services/`(26ファイル) | Unknown — 現行ブランチにソース無し | 同上、`2e6ab92`(release/202607専用)にのみ存在 | ソース不在 | Unknown |
| `core/flow_locator.py` | `.zizd`パス解決・最近使ったファイル管理 | 全文(237行)読了 | Source実在 | High |
| `core/logger.py` | ロギング基盤(`logs/app_*.log`) | 全文(264行)読了 | Source実在 | High |
| `core/security_policies.py` | `config/security_policies.yml`読込、Web/RPAアクセス許可判定 | 全文(113行)読了 | Source実在 | High |
| `core/type_registry.py` | ziz_datatype⇔pandas⇔BigQuery型変換 | 全文(266行)読了 | Source実在 | High |
| `core/workflow_engine.py` | `.zizd`実行エンジン。connectors動的ロード | 動的ロード機構確認 | Source実在 | High |
| `core/connector_factory.py`, `security_sanitizer.py`, `utils.py` | Unknown | `connector_factory`は`2e6ab92`のみ、`security_sanitizer`/`utils`はgit履歴自体が皆無 | ソース不在 | Unknown |
| `connectors/`(13ファイル: base/bigquery/chrome/csv/dataintegration/duckdb/excel/plotly/python/selenium/shell/vector/windows) | 各種データ・自動化コネクタ、`BaseConnector`共通基底 | 実装内容読了 | Source実在 | High |
| `connectors/`(8ファイル: api/bq/dummy/file/operation/outlook/rpa_slack/web) | Unknown — ソース無し、動的ロードでも解決不能な死んだ痕跡 | `__pycache__`のみ、`git ls-files`不在 | ソース不在 | Unknown |
| `shared/`(4ファイル) | Unknown — 現行ブランチにソース無し | 同様に`2e6ab92`のみ | ソース不在 | Unknown |
| `static/home.html`/`dataflow.html`/`settings.html` | Web UI 3画面(トップ/フロー編集/設定は未実装プレースホルダ) | HTML本文・script構成読了 | Source実在 | High |
| `static/config/config.js` | フロントエンド設定(コネクタ/アクション/フォームスキーマ)。API URL定義ではない | `CONFIG`定義読了 | Source実在 | High |
| `static/js/bridge.js` | `qt.webChannelTransport`経由でbackendBridgeに接続するJS側実装 | 187-230行読了 | Source実在 | High |
| `static/js/*`(app.js等20+ファイル) | フロー編集UI本体(ノード描画/状態管理/ワークスペース等) | 各ファイル冒頭確認 | Source実在 | High |
| `static/js/ui.node.js` | 未参照(デッドコードの疑い) | grep全域0件ヒット | Source実在だが未使用 | Medium |
| `static/styles.css` | 未参照のレガシー集約ファイル | ファイル冒頭コメントで自己申告 | Source実在だが未使用 | High |
| `template/*.zizd` | ワークフロー定義(YAML、`metadata/variables/steps/flows`構造) | 実ファイル読了 | Source実在 | High |
| `template/preview.html` | zizai本体と無関係な独立ツール(Tableau Public埋め込みDLツール) | 外部CDN読み込みのみ確認 | 関連性Unknown | Medium |
| `config/security_policies.yml` | セキュリティポリシー(`core/security_policies.py`が読込) | 対応コード確認 | Source実在 | High |
| `config/recent_flows.json` | `core/flow_locator.py`専用管理 | コード確認 | Runtime生成物 | High |
| `config/recent_roots.json`, `file_icon_map.json` | フロントJSが`bridge.py`の汎用`workspace.readText/writeText`経由で直接読み書き | `workspace.manager.js`確認 | Runtime生成物 | High |
| `config/rename.csv` | リネーム対応表(デフォルトサンプル)。実行時読込コードの所在は未発見 | config.js/.zizdでの参照確認 | Source/データ | Medium |
| `tests/`全体 | `.gitignore`で丸ごと除外。実ソース(.py/.spec.js)が物理的に存在せず`__pycache__`のみ | `git ls-files`0件、ソース不在確認 | ソース不在(Runtime痕跡のみ) | Low〜Unknown |
| `.github/workflows/playwright.yml` | CI定義だがgit未追跡・`package.json`/`playwright.config`不在で実行不可能な状態 | `git log`履歴0件 | 定義のみ、機能せず | Low |
| `.codex/`, `.codex-harness/`, `.agents/`, `.docs/` | Codexエージェント運用基盤。全て`.gitignore`で除外、リポジトリ履歴には含まれないローカル運用層 | `.gitignore`該当行確認 | ローカル専用(非runtime) | High |
| `.codex/rules/`, `.codex/hooks.json` | **v23資料が要求するファイル/フォルダだが現行リポジトリに存在しない** | `ls`で不存在確認 | 未作成 | High(不在の事実) |
| `pyproject.toml`, `uv.lock` | **v23資料が要求するファイルだが現行リポジトリに存在しない**(現状は`requirements.txt`+`requirements-dev.txt`によるpip管理) | `ls`で不存在確認 | 未作成 | High(不在の事実) |
| `.venv/` | **v23資料が定義する名前のディレクトリは存在しない**。実際の仮想環境は`.env/`という名前で存在(v23の`.env`定義=環境値ファイルと名前衝突) | `ls`で不存在確認、`.env`がdirectoryでsite-packages含むことを確認 | Runtime生成物(命名がv23と不一致) | High |
| `docs/`(ドットなし) | 今回新規に作成された、v23資料本体(`codex_development_guide_...`)と本レポートの置き場。`features/`, `tasks/`, `decisions/`は未作成 | `find docs`で確認 | Source(新設) | High |
| `.docs/`(ドットあり) | AGENTS.mdが正本参照先とするディレクトリだが、実体は`areas/backend-tests.md`1件のみ | 前回調査で確認済み、変化なし | ほぼ空 | High |
| `tableau-mcp/` | 外部ツールのvendorではなく、社内企画資料(md+pptx)のみの2ファイル構成 | 中身全読 | Source(ドキュメント) | High |
| `apps/` | **v23目標構成のトップレベルディレクトリだが現行リポジトリには存在しない**(`app/`という単数形の既存ディレクトリと混同しないよう注意) | `find`のトップレベル一覧に`apps/`は出現せず、`app/`のみ存在 | 未作成 | High |

---

## v23目標構成との対応候補(Evidenceベースのみ・移動は未実施)

名前だけで判断せず、実装内容・呼び出し関係から「対応候補になりうるか」を評価した結果。**これは移行先の決定ではなく、次工程で人が判断するための材料。**

| v23カテゴリ | 対応候補となりうる既存パス | 判断根拠(Evidence) | 確度 |
|---|---|---|---|
| `apps/web/` | `static/`(home.html, dataflow.html, settings.html, css/, js/, modal/, icons/, img/, vendor/) | `app/gui/host.py`がこれらをWebViewにロードしている実装を確認済み | Medium(内容は明確だが、v23が想定する「localhost配信」ではなく`file://`直読みという実装差異あり) |
| `apps/desktop/` | `app/gui/host.py`, `app/gui/bridge.py`, `zizai.py`, `bin/ziz.bat`/`ziz.sh` | Desktopウィンドウ生成・WebView制御・起動ディスパッチの実装を確認済み | Medium(bridge.pyは「API相当」の処理も兼ねており、`apps/desktop`と`apps/api`の境界がv23の想定通りには分離されていない) |
| `apps/api/` | `core/`, `connectors/`, `shared/`(存在分) | ワークフロー実行・コネクタ処理などbackendロジックの塊だが、**localhostサーバとして起動する実装が存在しない** | Low(責務の中身はbackend相当だが、v23の「localhostで動作するAPI」という実行形態そのものが現行実装に無い) |
| `apps/common/config/` | `config/`(security_policies.yml, recent_*.json, file_icon_map.json, rename.csv, suggest_index/) | web側(JS)・backend側(Python)双方から参照されている設定ファイル群であることを確認済み | Medium |
| 対応候補が確認できないもの | `workflows/`, `template/`, `scripts/`, `bin/` | v23資料の`apps/*`区分にも`docs/*`区分にも明示的な記述が無く、実装からも一意の対応先を判断できない | Unknown |
| `.codex-harness/`全体の移行先 | (対応候補なし) | v23資料は「Harness専用の`.codex-harness/`は作りません」と明記するのみで、`checks/`・`orchestration/`・`reports/`・`scripts/`・`subagents/`それぞれの移行先(`.codex/rules/`, `.codex/hooks.json`, `docs/`等への振り分け)は資料内に個別の対応表が無い | Unknown |

---

## Dependency Findings

現行ブランチで実際にimportが解決できる依存グラフ(実ソース存在分のみ):

```
bin/ziz.bat・ziz.sh → zizai.py
  ├─ app.gui.host (GUI起動) → app.gui.bridge
  │      └─ connectors.excel_connector / core.type_registry /
  │         core.workflow_engine / core.flow_locator / core.security_policies
  ├─ app.main (CLI起動) → core.workflow_engine
  ├─ core.flow_locator
  └─ core.logger

core.workflow_engine → connectors.base_connector(静的)
                     → connectors.*(pkgutil+importlibによる動的ロード、実行時解決)

connectors.chrome_connector / selenium_connector → core.security_policies
connectors.bigquery_connector → core.type_registry
```

- `app`→`core`→`connectors`が主依存方向だが、`connectors`側(chrome/selenium/bigquery)が`core`へ依存し返す**パッケージ間の相互依存**が存在する。v23で`apps/api`として切り出す場合はここが論点になる。
- `app.runtime.*` / `app.services.*` / `shared.*` は現行コードのどこからもimportされておらず、**依存グラフ上は完全に孤立**している。
- Web UI側は`static/js/bridge.js`が`qt.webChannelTransport`を介して`app/gui/bridge.py`の`WebViewBridge`と1対1接続する構成で、SPA的ルーティングではなくHTMLファイル間の実ナビゲーション。v23の`apps/web`⇔`apps/api`(HTTP想定)とは通信方式そのものが異なる。
- `requirements.txt`に`fastapi`/`uvicorn`/`starlette`が含まれるが、現行ソースツリーのどこからも使用されていない。**v23の`apps/api`をlocalhost HTTPサーバとして実装する際の候補ライブラリとして既に依存追加されている可能性があるが、実装は未着手**と見るのが最も自然な解釈(確証なし、Unknown)。

---

## Generated / Runtime Files

| 種別 | パス | 備考 |
|---|---|---|
| ログ | `logs/*.log` | 命名規則が3系統混在(`app_YYYYMMDD.log`/`cli_app_log_*`/`gui_app_log_*`) |
| バイトコードキャッシュ | `__pycache__/`(多数散在) | app/, core/, connectors/, shared/, tests/等 |
| pytestキャッシュ | `.pytest_cache/` | 中身は空。v23資料が明示する「Sourceとして管理しない生成物」の一つと一致 |
| Playwright生成物 | `.playwright-mcp/`, `tests/playwright/{artifacts,results,test-results,reports,node_modules}` | テスト定義本体(`*.spec.js`)は不在なのに実行結果物のみ残存。v23資料が言及する`.playwright-mcp/`=「用途確認まで削除・移動を確定しないTool固有Folder」に該当 |
| ワークフロー実行時DB | `workflows/*.duckdb`, `workflows/*.faiss` | データキャッシュ/ベクトルインデックス |
| ベンチマーク結果 | `workflows/pandas_import_*.json` | — |
| venv(命名注意) | `.env/`(ディレクトリ) | Python仮想環境一式。**v23資料の`.venv/`に相当するが名前が異なり、v23の`.env`定義(環境値ファイル)と衝突する** |
| エディタ設定 | `.obsidian/`(gitignore対象外・untracked放置)、`.vscode/settings.json` | `.obsidian/`はv23資料が言及する「用途確認まで削除・移動を確定しないTool固有Folder」に該当。gitignore未記載でうっかりコミットのリスクあり |
| 一時/個人ファイル | `memo.md`, `test.ipynb`, `workflows/note.ipynb`, `core/テスト.ipynb`(0バイトだがgit追跡済み) | 開発者の作業ファイル |

**.gitignore上の構造的問題**: `tests/`と`workflows/`が丸ごと除外指定されているため、各フォルダ内の「ソースコード相当のもの」(テストスクリプト、ワークフロー定義`.zizd`)と「明確な生成物」(DB、キャッシュ、レポート)が一切区別されずgit管理外になっている。v23移行時にこの混在を分離する必要性が高い。

---

## Unknown / Needs Investigation

1. **`app/runtime/`・`app/services/`・`shared/`のソース欠落**: 現行`release/202608`にソースが無く、`release/202607`専用のWIPコミット`2e6ab92`にのみ存在(現HEADの祖先ではない＝未マージ)。`app/services/`には`run_service.py`, `workspace_service.py`, `catalog_service.py`等、名称上は`apps/api`のサービス層に相当しうるものが含まれるが、現行コードから参照されていないため中身の妥当性は未検証。**v23移行の設計対象にこれら未マージ機能を含めるか、ユーザー確認が必要。**
2. **`core/connector_factory.py`, `core/security_sanitizer.py`, `core/utils.py`**: 同様にソース不在、後2者はgit履歴自体が皆無。
3. **`connectors/`配下8ファイル**(api/bq/dummy/file/operation/outlook/rpa_slack/web_connector): ソースが無く、`WorkflowEngine`の動的ロード機構でも解決不能な「死んだ痕跡」。
4. **AGENTS.md / README.mdの参照切れ**: `.docs/architecture.md`・`coding-rules.md`・`refactor-policy.md`・`.codex-harness/tasks/`はいずれも実在しない。加えて今回、v23資料の置き場として新たに`docs/`(ドットなし)が作られたことで、**`.docs/`と`docs/`という2系統のドキュメント置き場が並存**する状態になった。どちらを正本にするか、または統合するかは未確定。
5. **tests/の実ソース消失**: `tests/python/`, `tests/native/`, `tests/playwright/`いずれも実ファイル(`.py`/`.spec.js`/`playwright.config.*`)が物理的に存在せず、`__pycache__`とテスト実行結果物のみ残存。
6. **`.github/workflows/playwright.yml`**: git未追跡・実行対象の`package.json`/`playwright.config`不在のため、現状のGitHub上では実質機能していないCI定義。v23資料は`.github/workflows/`を「Enforcement(いつ検証を強制するか)」と位置付けており、現状はこの役割を果たせていない。
7. **`requirements.txt`のfastapi/uvicorn/starlette**: 未使用の理由(v23の`apps/api`実装を見越した先行追加か)がUnknown。
8. **パッケージ管理方式の相違**: v23資料は`uv`+`pyproject.toml`+`uv.lock`を前提とするが、現行リポジトリは`requirements.txt`/`requirements-dev.txt`+pip、かつ仮想環境ディレクトリ名も`.venv/`ではなく`.env/`。移行時にどちらを正とするかは資料の指示通り(uv化)と読めるが、既存の`scripts/refresh_requirements.py`等pip前提のツール群との整合作業が必要になる。
9. **`.codex-harness/`の個別移行先**: v23資料は「作らない」方針のみを示し、`checks/`・`orchestration/`・`reports/`・`scripts/`・`subagents/`それぞれの具体的な移行先(`.codex/rules/`, `.codex/hooks.json`, `docs/`等)への対応表は資料内に存在しない。
10. **`workflows/`, `template/`, `scripts/`, `bin/`の対応先**: v23の`apps/*`・`docs/*`いずれの区分にも明示的な記述が無く、実装内容からも一意に判断できない。
11. リポジトリ全体で「v23」という語への直接言及は本文中に見つからなかった(資料ファイル名`codex_development_guide_2026-08-15_v24`自体は"v24"表記であり、"v23"という呼称との対応関係はユーザー側の文脈情報に依存する。本調査では資料の中身の構成方針のみをEvidenceとして扱った)。

---

## Migration Risks

- **localhost API層が実装として存在しない**: v23目標構成の中核である「`apps/desktop`がlocalhostの`apps/api`を起動し、WebViewが`apps/web`を表示する」という3プロセス的実行モデルに対し、現行実装は単一プロセス内でのQWebChannelブリッジのみ。単なるフォルダ移動ではなく、**HTTPサーバとしてのAPI層を新規に設計・実装する必要がある**(既存の`app/gui/bridge.py`のロジックを移植するにしても、通信方式の変更を伴う)。
- **孤立コードの扱い**: `app/runtime/`・`app/services/`・`shared/`・一部`connectors/`・`core/connector_factory.py`等、複数箇所で「現行ブランチにソースが無いが痕跡(`__pycache__`)だけ残る」状態が広範囲に存在する。`app/services/`は名称上`apps/api`のサービス層設計と親和性があるように見えるが、中身が現行コードと接続されておらず動作検証もされていない点に注意。AGENTS.mdの「破壊的変更を行う前に、必ず意図を確認する」方針に従い、削除判断は行わず必ず事前確認が必要。
- **`.codex-harness/`とv23方針の正面衝突**: v23資料は「Harness専用の`.codex-harness/`は作りません」と明記しているが、現リポジトリには`checks/orchestration/reports/scripts/subagents`という広範な`.codex-harness/`資産が存在する。移行時にこれらを`.codex/rules/`・`.codex/hooks.json`・`docs/`等へ振り分けるか、廃止するかの判断が必要(資料に個別対応表なし)。
- **パッケージ管理・venv命名の相違**: `pyproject.toml`/`uv.lock`が存在せず、`pip`+`requirements*.txt`運用。かつ実際のvenvディレクトリ名が`.env`であり、v23資料が定義する「`.env`=ローカル環境値、`.venv`=仮想環境(別物)」という区別と直接衝突している。移行時にvenvの置き場・命名を変更する必要があり、既存の起動スクリプト(`bin/ziz.bat`等)・`scripts/create_zizai_shortcut.ps1`等が`.env/Scripts/...`を直接参照している点も影響範囲に含まれる。
- **ドキュメント正本の不在と重複**: 移行の判断基準となるべき`.docs/architecture.md`等の正本が実在しない状態に加え、今回`docs/`(ドットなし)が新設されたことで**2系統のdocs構造が並存**する状態になった。v23が定める`docs/features`・`docs/tasks`・`docs/decisions`・`docs/handoffs`の運用開始前に、`.docs/`との関係整理が必要。
- **tests/の扱い**: 現行`tests/`はソース自体が失われており、移行時の回帰確認に使えない。`.docs/areas/backend-tests.md`が示す新規`backend_tests/`計画との関係整理が必要。
- **`workflows/`・`tests/`のgitignore構造**: ソースと生成物が丸ごと同一ディレクトリでgit管理外になっており、移行時にどれを保持すべきか(特に`.zizd`テンプレート・独自ワークフロー)を個別に精査する必要がある。
- **`workflows/`, `template/`, `scripts/`, `bin/`の行き場が未定義**: v23資料の`apps/*`・`docs/*`いずれにも対応する記述が無く、このままでは移行計画から漏れる可能性がある。
