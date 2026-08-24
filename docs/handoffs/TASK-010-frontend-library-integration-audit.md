# TASK-010 Frontend Library Integration Audit

- Status: Investigation Handoff — not Current Specification
- Date: 2026-08-23
- Scope: `tomohiro-ono-works`配下の8つの`zizai-*` Frontend libraryと現行Applicationの接続境界
- Implementation: Not started

## Conclusion

- 202608の要件は、Application本体に加えて調査対象8 repositoryを**すべて利用する**ことである。
- 現行Applicationは8 libraryをまだ読み込んでおらず、AppShell、Form、Data Viewer、SQL Highlight、Workflow Designerと重なるUI責務をApplication側に持つ。
- 8 libraryは外部CDNやnpm runtimeを必要とせず、同梱`file://` UIへ載せられる。ただしAPI、global namespace、CSS token、破棄方式、Document schemaは統一されていない。
- `zizai-sqlflow-designer`は`zizai-workflow-designer`と`zizai-highlighter-sql`に依存する。他6件にはlibrary間の必須依存はない。
- `file_icon_map.json`を直接読むlibraryはない。AppShellとCatalogPanelはApplicationから解決済みicon URLを受け取る側であり、config/Bridgeをlibraryへ持ち込まない。
- TASK-010はSource config移行、TASK-012は既存UIの物理移動であり、8 library導入・重複UI削除を混在させない。専用のTASK-016で追跡する。
- Frontendのどのspaceへどのlibraryを使うかは、既存画面から段階的に移行しながらProject ownerが都度決定する。Agentは配置を先回りして固定しない。
- Workflow Document変換、配布許諾、版固定、DataViewer lifecycle、theme tokenは導入前に決定・補強する必要がある。

## Requirement clarification

会話で次が明示された。

- `zizai-app-shell`、`zizai-catalog-panel`、`zizai-data-viewer`、`zizai-editor-markdown`、`zizai-form`、`zizai-highlighter-sql`、`zizai-sqlflow-designer`、`zizai-workflow-designer`をすべて利用する。
- 旧202606/202607実装を復元して使うのではなく、202608から新しいApplication統合を行う。
- Application側へ同じUI責務を重複実装しない。
- Frontendの利用spaceは一括で事前確定せず、既存画面から移行する各段階でProject ownerが決定する。AgentはCatalogPanelをWorkspace Explorerへ、SQLFlowを`dataflow.html`へ割り当てる等の推測を行わない。

この要件は現行の`docs/features/frontend.md`には未記録である。`docs/handoffs/legacy-ui-library-decisions.md`はHistorical Contextであり、全8件の現在要件を表していない。実装前にCurrent Specificationへ昇格する必要がある。

## Audited repositories and pinned evidence

| Repository | Audited `main` SHA | Runtime entry | Runtime dependency |
|---|---|---|---|
| [`zizai-app-shell`](https://github.com/tomohiro-ono-works/zizai-app-shell) | `15305b8b58e7cc09de3c6cf72212fbfdfecf7df1` | `src/00_tokens.css`、`src/ui-shell.css`、`src/shell_*.js`、`src/app_shell.js` | なし |
| [`zizai-catalog-panel`](https://github.com/tomohiro-ono-works/zizai-catalog-panel) | `3141ba66d583eaa6d6947d42e572f31428eefc69` | `src/catalog-store.js`、`src/catalog-panel.js`、`src/catalog-panel.css` | なし |
| [`zizai-data-viewer`](https://github.com/tomohiro-ono-works/zizai-data-viewer) | `30b34058f9dc8d76d1a154488d65c12cc6931d8c` | `src/report-viewer.js`、`src/report-viewer.css` | なし |
| [`zizai-editor-markdown`](https://github.com/tomohiro-ono-works/zizai-editor-markdown) | `b2c5a2a5a885dc3ee4877e3091c05a7c565ebb03` | `src/markdown_editor.js`、`src/markdown_editor.css` | なし。code highlighterは任意注入 |
| [`zizai-form`](https://github.com/tomohiro-ono-works/zizai-form) | `f08bfc73350d04e9238b43fa4dbcfdb81fa5150e` | `src/node-form.js`、`src/node-form.css` | なし |
| [`zizai-highlighter-sql`](https://github.com/tomohiro-ono-works/zizai-highlighter-sql) | `802c9803c88239c954d1273b045d0f754f74b847` | `src/sql-highlighter.js`、dialect `.js`、`src/sql-highlighter.css` | なし |
| [`zizai-sqlflow-designer`](https://github.com/tomohiro-ono-works/zizai-sqlflow-designer) | `e4b43e5273c99a6e78f055fc0c9302b8b2506ddb` | `src/sql-flow-parser.js`、`src/sql-workflow-designer.js`、CSS | 可視化時にWorkflowDesigner、SQL Highlighter |
| [`zizai-workflow-designer`](https://github.com/tomohiro-ono-works/zizai-workflow-designer) | `42699ef3924f70e6452dc3c04ec0f5c580069d01` | `src/workflow_designer.js`、`src/workflow_designer.css` | なし |

調査時点で8 repositoryすべてにtag、release、`package.json`、CI workflowがない。導入版はbranch名ではなくcommit SHAで固定する必要がある。

## Dependency and ownership map

```text
Desktop Host / QWebChannel
          |
          v
Application Adapter  ---- config / persistence / execution / navigation
   |      |      |      |      |      |
   |      |      |      |      |      +--> CatalogPanel
   |      |      |      |      +---------> NodeForm
   |      |      |      +----------------> DataViewer
   |      |      +-----------------------> MarkdownEditor
   |      +------------------------------> AppShell
   +-------------------------------------> WorkflowDesigner
                                                ^
                                                |
SQLFlowDesigner --> SQL Highlighter ------------+
        |
        +--> WorkflowDesigner
```

Adapterが保持する責務は、Bridge通信、Source/Runtime config、file保存、workflow実行、document正本、画面遷移、OS window control、external URL policyである。Libraryはこれらを実行しない。

## Repository findings

### `zizai-app-shell`

- `window.zizPackages.uiShell.createAppShell(options)`を公開する。
- topbar、activity bar、sidebar、main/right/bottom panel、status bar、tab、command、resizeとUI eventを担当する。
- project tree、file I/O、workflow/editor、backend/QWebChannel、URL/window操作、未保存policy、layout永続化は担当しない。
- `icon`は表示用URL文字列であり、App/Adapterがlocal assetへ解決して渡す。
- 現行重複は`static/js/app-shell.js`と`static/js/workspace.manager.js`のtab/shell部分。Explorerや保存処理は削除対象ではなくAdapter側へ残す。

### `zizai-catalog-panel`

- `CatalogPanel` / `CatalogStore`をglobal公開する。
- folder/itemの検索、tag、clipboard copy、CRUD、memory state、permission UI、validationを担当する。
- `catalog:change`、`catalog:copy`、`catalog:error`をDOM eventで通知し、永続化はApplicationへ委譲する。
- `resolveIcon(iconName, item)`は任意URLを返せるため、Adapterで同梱local assetだけへ制限する。
- 現行Applicationには対応するcatalog screen/data contract/persistence commandがない。利用spaceと用途は既存画面の移行段階でProject ownerが決定し、Workspace Explorer等へ自動割当しない。

### `zizai-data-viewer`

- `ReportViewer`をglobal公開し、schema、rows、pagination、distribution、sort/filter、schema編集、export/execute requestを扱う。
- backend通信、SQL実行、全件取得、分布集計、CSV/Excel生成、clipboard書込みはApplication責務である。
- 現行重複は`static/js/ui.node.detail.js`と`static/js/ui.fields.js`のschema/preview table部分。
- 現行sourceには`destroy()` / `off()`がなく、`document` listenerと`document.body`へ追加したdownload menuを解除できない。tab/region再mount前のupstream修正が必要である。

### `zizai-editor-markdown`

- `MarkdownEditor`、`MarkdownViewer`、`MarkdownRenderer`をglobal公開する。
- `.md`編集/表示、document link、suggest request、save event、外部code highlighter注入を提供する。
- file/API保存、document検索、画面遷移、認証、添付管理はApplication責務である。
- 現行Workspaceの`.md`はgeneric text editorであり、`workspace.readText/writeText` Adapterへ接続して置換できる。
- link rendererは`file:`等を`#`へ落とすが、`http(s)`、`mailto:`、`tel:`、root-relativeを許す。Desktop Hostのnavigation policyとFrontend click Adapterを通す必要がある。

### `zizai-form`

- `NodeForm.mount({ root, node, forms, onChange })`をglobal公開する。
- 現行`static/config/config.js`で使う11 field kindは、NodeFormの対応field集合に含まれる。
- file/dir pickerとmouse coordinateはrequest/result eventでHostへ委譲する。
- YAML/config読込、connector/action解決、Bridge、code editor、schema/data preview、外部serviceは責務外である。
- 現行重複の中心は`static/js/ui.fields.js`。ただしschema autoload、reference warning、runtime default、modal、code editor等はApplication Adapterとして残る。

### `zizai-highlighter-sql`

- `SqlHighlighter`をglobal公開し、BigQuery/DuckDB方言、textarea attach、tokenize/highlight、decorationを提供する。
- SQL validation、AST、format、schema suggestは担当しない。
- `file://`ではJSON dialectを`fetch()`せず、同内容の`bigquery.js` / `duckdb.js`を事前読込する契約である。
- 現行`static/js/code.highlight.js`のSQL branchと重複する。Python/JSON/template highlightは本libraryの対象外なのでApplication側に残る。
- Markdown code blockとSQLFlow detailには`SqlHighlighter.highlight()`を注入できる。

### `zizai-sqlflow-designer`

- `window.zizPackages.sqlFlowParser`と`window.zizPackages.sqlWorkflowDesigner`を公開する。
- parser単体は外部依存なし。viewerはWorkflowDesignerとSQL Highlighterを必須利用する。
- SQL解析/可視化を担当し、SQL実行、DB接続、保存、backend通信は担当しない。
- 現行`dataflow.html`はApplication workflow editorであり、SQLFlow viewerではない。どのscreen/tab/actionでSQLFlowを表示するかは、既存画面の移行段階でProject ownerが決定する。
- repository内に自動test fileがないため、host側integration testだけでなくupstream parser/viewer testが必要である。

### `zizai-workflow-designer`

- `window.zizPackages.workflowDesigner`から`createWorkflowDesigner()`と`applyDocumentPatch()`を公開する。
- controlled input方式で、ApplicationがDocument正本を保持し、libraryは`document:change`のPatchと各request eventを通知する。
- 現行重複は`static/js/ui.node.canvas*.js`、`ui.node.shared.js`、`app.js`のselection/history/graph editの一部である。
- 外部linkは直接開かず`external-link:open-request`を通知するため、Host policyへ接続できる。
- libraryは`flows`をflow IDからgraphへのmapとして読む。一方、現行`.zizd` import/exportはtop-level `flows.edges`を正本にする。このまま渡すとmain edgeを描画できず、Document Adapterまたはschema移行Decisionが必須である。
- CSSにunscoped `:root` tokenがあり、Applicationのtoken正本と衝突し得る。

## Cross-library integration risks

### 1. Document contract mismatch — High

現行Application stateは`nodes[]`、`parentId`、`mergeParentIds`等を正本にし、保存時に`steps[]`と`flows.edges[]`を組み立てる。WorkflowDesignerは`steps[]`、`flows[flowId].edges[]`、`loop.flows`をDocument正本としてPatchを生成する。

次のどちらかをDecisionで選ぶ必要がある。

1. 現行Application stateを維持し、双方向Document/Patch Adapterを実装する。
2. WorkflowDesigner DocumentをFrontend正本へ変更し、load/save/validation/run payloadをAdapter化する。

一時的に二つの正本を持つ方式は同期不整合を作るため採用しない。

### 2. API and namespace inconsistency — Medium

- `zizPackages`: AppShell、WorkflowDesigner、SQLFlow
- direct global: CatalogPanel、ReportViewer、Markdown classes、NodeForm、SqlHighlighter
- event model: custom `.on()`、DOM `CustomEvent`、native `EventTarget`、callbackが混在

Application Adapterでlibraryごとの差を閉じ込め、各pageがdirect globalを横断的に呼ばない構成が必要である。

### 3. Lifecycle — High

AppShell region/tabはmount/unmountを繰り返す。各componentは破棄可能でなければならない。DataViewer以外には`destroy()`または`detach()`があるが、DataViewerだけはglobal listener/body elementを残す。導入前Gateとする。

### 4. CSS and theme — High

- Current Specificationは`static/css/00_tokens.css`をColor正本とし、Component literal color追加を禁止する。
- 8 libraryのCSSはそれぞれliteral colorと独自tokenを持つ。
- 多くのselectorはcomponent prefixでscopeされるが、WorkflowDesignerには`:root`がある。

同梱前にtheme contractを定義し、host tokenへのalias化またはupstream修正を行う。Application側へlibrary UIを再実装することはしない。

### 5. Local-only security boundary — High

- sourceはすべてlocal snapshotとして同梱し、CDN/script runtime downloadを行わない。
- AppShell/CatalogPanelへ渡すicon URLは同梱assetに限定する。
- SQL dialectは`.js`登録fileを読み、`loadDialect(url)`を`file://`で使わない。
- Markdown external linkとWorkflow external-link requestは、Frontendのliteral scheme検証とDesktop Hostの展開後URL/allowlist検証を通し、内蔵WebViewへ遷移させない。
- libraryへQWebChannel objectを直接渡さず、Application AdapterだけがBridgeを呼ぶ。

### 6. Distribution and versioning — High

8 repositoryのLICENSEはすべて`ALL RIGHTS RESERVED`で、一般的なOSS再利用・改変・再配布許諾ではない。repository ownerとApplication ownerが同一であることだけを配布許諾文の代用にしない。公開・配布前に権利者判断を記録し、同梱LICENSE/NOTICEと利用範囲を固定する。

tag/release/package manifestがないため、取得方法には次が必要である。

- exact commit SHA
- source file hash manifest
- license snapshot
- update/review手順
- offline build/package test

## `file_icon_map.json` finding

`file_icon_map.json`は拡張子からApplication同梱asset pathを解決するApplication設定である。現行consumerは`static/js/workspace.manager.js`であり、`workspace.readText(scope="config")`から読み、tab/explorer iconへ使う。

- 8 libraryのいずれもこのfileを直接読まない。
- AppShellはTab/Activity/Commandへ解決済み`icon` URLを受け取る。
- CatalogPanelはApplication提供の`resolveIcon()`を呼ぶ。
- Workflow node iconはDocument/renderer/Adapterから与える。

したがってlibrary利用を理由に`workspace.readText`へ新scopeを追加する根拠はない。TASK-010でSource/Runtime configを分離した後のFrontend取得経路は、Desktop config boundaryとして別に決める。Libraryへconfig pathやBridge scopeを認識させない。

## Task boundary impact

### TASK-010

TASK-010は4種のSource config MOVEと全consumer参照更新に限定する。8 libraryをvendor/importしたり、UI責務を置換したりしない。`file_icon_map.json`の取得経路は現行Application consumerの問題として解決し、library都合の汎用Bridge権限を追加しない。

### TASK-012

TASK-012は既存`static/`を`apps/gui/`へ挙動維持で移すTaskであり、UI再設計はOut of scopeである。8 library統合を混ぜるとBaselineとRollback境界を失う。

### Dedicated task

8 library統合・重複UI削除は`docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`で追跡する。TASK-016はTASK-010/TASK-012完了後にspace単位で実施し、TASK-015の最終Migration Verificationより前に完了する。

## Recommended integration sequence

1. Current Specificationへ全8件、利用spaceの決定手順、Adapter責務、local-only/版固定/license Gateを記録する。
2. Upstream/library GateとしてDataViewer destroy、Workflow CSS scope、SQLFlow test、theme tokenを補強する。
3. exact SHA snapshotとmanifestを`apps/gui`のlocal assetとして管理する方針を決める。
4. 既存画面のspaceごとにProject ownerの配置判断を受け、対象libraryを個別Adapter経由で導入し、そのspaceのApplication重複UIだけを削除する。
5. Workflow Document Decision後にWorkflowDesignerを導入する。SQLFlowDesignerはWorkflowDesigner/SQL Highlighter確立後という依存順を守る。
6. CatalogPanelとSQLFlowDesignerの用途・data source・保存先・表示spaceは、対象となる既存画面の移行時にProject ownerが決定する。

この順番はTaskの承認案であり、まだCurrent Specificationではない。

## Decisions required before implementation planning

1. 全8 library要件を`docs/features/frontend.md`へ追記するか、専用`docs/features/frontend-libraries.md`を正本として新設するか。
2. 各spaceの移行着手時に、どのlibraryを使うかをProject ownerへ提示し、承認後にそのspaceだけを変更する手順。
3. Workflow Documentを現行stateへ変換するか、Frontend正本そのものを移行するか。
4. 8 repositoryの同梱・改変・配布許諾をどのDecision/NOTICEへ記録するか。
5. SHA固定snapshot、submodule、release artifactのどれを採用するか。

## Verification gates for the future integration task

- Unit: 各Adapterのevent/payload変換、Document round-trip、URL/icon policy、destroy idempotency。
- Integration: Bridge command/event、open/save/run/export/picker、internal frame、tab lifecycle。
- Frontend regression: all component mount/unmount、keyboard/selection/resize、no duplicate listener。
- Windows WebEngine: `file://` asset、QWebChannel、popup/main-frame block、OS browser delegation。
- Static: external script/iframe/CDNなし、unapproved schemeなし、unscoped selectorなし、literal color policy、duplicate legacy UI参照0。
- Packaging: offline起動、pinned hash一致、LICENSE/NOTICE同梱。

## Evidence used

- `docs/features/frontend.md`
- `docs/features/architecture.md`
- `docs/tasks/active/TASK-010-migrate-shared-source-configuration.md`
- `docs/tasks/active/TASK-012-colocate-embedded-web-ui.md`
- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/legacy-ui-library-decisions.md`
- `static/js/app-shell.js`
- `static/js/workspace.manager.js`
- `static/js/ui.fields.js`
- `static/js/ui.node.canvas*.js`
- `static/js/ui.node.detail.js`
- `static/js/code.highlight.js`
- `static/js/app.js`
- Each repository README, LICENSE, source tree, public API source, and test tree at the pinned SHA above

## Tooling limitation

`ui-analysis-review`の既存`summary.md`は先に確認したが、現行branchにない旧pathを含んでいた。更新用`tests/ui_analysis/ui_analysis.ps1`は参照先`tests/ui_analysis/run_inventory.py`が存在せず実行できなかったため、同reportを現行Evidenceには使用していない。上記の現行重複判定は実コードの関数・consumer照合に基づく。

Claude Code `2.1.233`へ`plan` mode、`Read,Glob,Grep`限定で独立レビューを依頼したが、API接続がFirewall/Proxyで拒否され、review結果は得られなかった。自動再実行は行っていない。
