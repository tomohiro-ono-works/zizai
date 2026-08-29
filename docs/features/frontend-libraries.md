# Frontend Library Integration Contract

- Status: Current Specification
- Decision: `docs/decisions/ADR-frontend-library-vendoring.md`
- Implementation task: `docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`

## Purpose

既存Applicationの復興と物理移動を完了した後、承認済みFrontend libraryへUI責務を段階移管するための共通契約を定義する。本仕様はlibraryを今すぐ導入する指示ではない。

## Approved libraries

TASK-016では次の7 libraryを利用する。

1. `zizai-app-shell`
2. `zizai-catalog-panel`
3. `zizai-data-viewer`
4. `zizai-editor-markdown`
5. `zizai-form`
6. `zizai-highlighter-sql`
7. `zizai-workflow-designer`

`zizai-sqlflow-designer`は、現行Applicationに移管対象となる機能が存在しないためTASK-016へ導入しない。将来、SQL flow表示という新機能と利用spaceが承認された場合だけ、`zizai-workflow-designer`と`zizai-highlighter-sql`を前提とする専用Taskで再評価する。

## Vendoring and version record

- GitHub、CDNその他のremote assetをApplicationから直接参照しない。
- library assetは`apps/gui/vendor/<library>/`へ同梱する。
- 初回導入時点における各repositoryの現行内容を使用する。実際に同梱した取得元URLとcommit identifierは`apps/gui/vendor/README.md`へ記録する。
- 同梱後の内容はApplication repositoryのGit履歴で追跡するため、別のfile hash台帳は作らない。
- 各libraryの`LICENSE`をlibrary directoryに保持し、追加の表示義務がある場合だけ`apps/gui/vendor/NOTICE.md`へ記録する。
- upstream更新は自動追従せず、必要になった時点で影響範囲と取得元revisionを確認して別途承認する。
- Application統合でlibrary sourceの不具合が見つかった場合は、vendor copyだけを修正しない。対象repositoryでTest-firstに修正し、library単体とApplication結合Gateを通過した新しいcommitを確定してから、そのSHAのsourceを再vendorする。

## Ownership boundary

LibraryはUIの描画、UI内の一時状態、利用者操作のevent通知を担当する。Application Adapterは次を担当し、libraryから直接実行させない。

- QWebChannel Bridge通信
- Source／Runtime configの取得
- workflowやdocumentの保存・読込
- workflow実行と実行状態の反映
- Application内navigationとexternal URL policy
- OS window、dialog、clipboard等のnative操作

Applicationはlibraryごとの差をAdapter内へ閉じ込め、page codeから複数のlibrary global APIを直接横断しない。同じspaceの移管が検証を通過した時点で、Application側に残る同一UI責務を削除する。

## Space decision protocol

- 7 libraryの利用spaceを事前に一括決定しない。
- TASK-016の各移管Work Package開始直前に、Project ownerへ対象spaceと利用libraryを提示する。
- Project ownerの決定を該当Work Packageへ記録してから、そのspaceだけを変更する。
- repository名、sample、既存画面名からAgentが配置を推測しない。

## Approved space decisions

### WP-3 AppShell

- Project owner approved this space on 2026-08-25.
- `home.html`、`dataflow.html`、`settings.html`で共有する外枠を`zizai-app-shell`へ移管する。
- libraryはactivity bar、sidebar、tab／panel／status領域、layout／resize、window control表示を描画し、利用者操作をeventとして通知する。
- Application AdapterはWorkspace／document／tab stateの正本、file I/O、dirty／save／close policy、Bridge／workflow実行、internal frame、navigation、OS window操作の実行を保持する。
- 各page固有contentと挙動は変更せず、Application Adapterがlibrary eventと既存処理を接続する。

#### Generic tab interaction API

- Tab descriptorは任意の`reorderable` booleanと`contextActions` arrayを受け取る。`contextActions`の各要素は少なくとも汎用`id`と表示用`label`を持ち、Application固有のworkflow、file、save等の概念を含めない。
- `reorderable`なTabのdrop時、AppShellは順序を確定せず、`tab:reorder-request` eventで`tabId`、`targetTabId`、`placement`（`before`または`after`）を通知する。Applicationが正本stateを更新し、`setTabs`で確定順序を返す。
- Context menu選択時、AppShellは`tab:context-action` eventで`tabId`と`actionId`を通知する。Actionの意味と実処理はApplication Adapterが所有する。
- AppShellはdrag表示、drop判定、context menu描画、outside click／Escape、destroy時のlistener／menu解放を所有する。
- Application Adapterは既存のTab並べ替えとclose policyを上記eventへ接続し、AppShellの内部DOM classへ依存しない。
- AppShell upstreamのUnit／browser lifecycle Testを通過したcommitだけを再vendorし、Application側で並べ替え、右クリックclose、dirty／close policy、Tab描画重複0を結合Testする。

### WP-4 SQL Highlighter

- Project owner approved this space on 2026-08-26.
- BigQuery／DuckDB Connectorのノード詳細SQL editorを`zizai-highlighter-sql`へ移管する。方言はApplication AdapterがConnectorから自動判定し、利用者向け方言選択は表示しない。
- Workspaceの`.sql` editorも同libraryへ移管し、既定方言をBigQueryとする。SQL toolbarにBigQuery／DuckDBの選択肢を表示し、変更を現在のTabへ即時反映する。
- Workspaceの方言選択は開いているTabのsession stateだけに保持する。SQL source、sidecar、Runtime stateへ保存せず、Application再起動またはfileを開き直した場合はBigQueryへ戻す。
- Workspace text editorではTab直下のpath表示行と再読み込み操作を表示しない。editorをTab直下まで広げ、保存は既存の保存iconだけで提供する。
- Workspace `.sql`では方言選択と保存iconをeditor右上へ重ねて固定し、editor内容をscrollしても操作欄を同じ位置へ維持する。非SQL text editorでは方言選択を表示せず、保存iconだけを同じ位置へ表示する。
- 固定操作欄が入力内容を隠さないよう、editorの右上に必要な内側余白を確保する。
- Python／JSON highlightとschema suggestはApplication責務として維持する。SQLの旧Application tokenizerは、移管後の回帰GateがPASSした同一変更内で削除する。
- `file://`では同梱済みBigQuery／DuckDB dialect JavaScriptを使用し、runtime `fetch()`を行わない。

### WP-5 Markdown Editor

- Project owner approved this space and bounded scope on 2026-08-26.
- Workspaceの`.md` editorを`zizai-editor-markdown`へ移管する。libraryはMarkdown source入力、source highlight、`/`command suggest、visual view、editor内の一時UI状態を担当する。
- Application AdapterはWorkspace read／write、dirty、save、conflict、close、Tab state、既存floating save icon、`編集／表示`mode headerを保持し、libraryの`md:change`と`setMode()`を既存Tab stateへ接続する。modeはTab単位のsession-only状態とし、open／再open時はいずれも表示modeから開始する。
- 表示modeは未保存の現在内容をpreviewし、mode切替では自動保存しない。library内蔵save buttonは使用せず、既存Application save iconを単一の保存操作にする。
- 表示modeでは先頭H1を本文先頭の大見出しとして残し、library既存の`.mce-article-title`背景デザインを適用する。
- 表示modeではlibraryのpage treeを有効化し、背景付きH1を文書タイトルとして本文先頭へ維持しながら、本文内のH2～H6を左側の見出しツリーへ階層表示する。見出しがない場合はtreeを表示しない。
- 表示modeの`http:`／`https:`linkは内蔵WebViewを遷移させず、既存Bridge `openExternal()` Adapter経由でOS外部browserへ開く。その他schemeは拒否し、document link／document suggestは導入しない。
- Application mode headerを使用するため、library toolbarはApplication CSSで非表示にする。既存save iconとmode切替をTab直下で画面内・クリック可能に維持する。
- `MarkdownEditor.destroy()`が所有listenerとDOM参照を解放するupstream revisionを確定してからApplicationへ再vendorする。

### WP-7 DataViewer

- Project owner approved this space on 2026-08-27 and limited the initial data boundary on 2026-08-28.
- ノード詳細下部のdata領域にあるtableとschema UIを`zizai-data-viewer`へ移管する。移管後は同じ責務を持つApplication側の旧preview table／schema rendererを残さない。
- 初期版は既存`result.getPreview`が返す先頭100行だけをlibraryのlocal modeへ渡し、そのsample内で帳票、sort／filter、column resize、column設定、schema JSON編集を利用する。全件取得を装ったpaging／distribution／総件数表示を行わない。
- DataViewer内蔵execute操作は初期版で表示せず、既存Applicationのノード実行操作とlock制御を単一の入口として維持する。
- 初期版のtabは、schema編集可能なdata nodeで帳票／カラム設定／JSON編集、schema編集を持たないdata nodeで帳票だけを表示する。non-data nodeではDataViewerをmountせず既存の非対応表示を維持し、distributionはTASK-023完了まで表示しない。
- libraryはtab／execute／export等を汎用`features`設定で有効化できる。無効機能はCSSで隠すだけでなく、対応するDOM、body menu、document listenerを生成しない。使用するpopupはDataViewer root内へ配置し、`destroy()`で解放する。
- schema columnは既存Application schemaの`origin_name`、`new_name`、`description`、`ziz_datatype`を欠落なくround-tripする。libraryのcolumn設定／JSON編集結果は既存schema fieldと同じノード設定へ反映し、Applicationの保存経路を使用する。libraryが専用表示を持たない`BYTES`、`TIME`、`INTERVAL`、`ARRAY<T>`、`STRUCT<...>`等は、型名を保持したまま表示、sort、filter上の挙動だけを文字列相当とする。
- `new_name`が空の場合は画面上だけ`origin_name`を補助表示し、保存値は空のまま維持する。利用者が新フィールド名を明示編集した時だけ`new_name`を更新する。
- schema編集は、列名／説明をEnterまたはblur、型を選択直後、JSONを`適用`操作で確定する。Escapeは未確定の列名／説明変更を破棄し、入力中の1文字ごとにApplication stateを更新しない。
- 保存済みschema JSONが不正な場合も元textをJSON編集画面へ表示し、validation errorを示す。帳票／カラム設定は一時的に無効化し、修正後の`適用`が成功した時だけ通常表示へ戻す。不正内容を自動補正・自動保存しない。
- filter候補一覧は受信した先頭100行だけから作り、「プレビュー内の候補」であることを表示する。sort／filterも同じ100行sampleだけへ適用する。
- DataViewer自身が件数を表示するため、Applicationは正常取得後に重複する`プレビュー N 行`見出しを表示しない。取得中、未実行、Bridge不在、取得失敗等の状態表示は維持する。
- filter候補のcheckboxはhost Applicationの汎用`input`幅指定に影響されない固定control幅とし、label文字領域を圧迫しない。帳票とカラム設定のtableは明示した各列幅の合計をtable幅とし、右端を含む列resizeで対象外の列へ余白を再配分しない。viewportに余る領域は空白のまま維持する。
- 初期版は既存Previewの100行上限を維持し、新しいcolumn数、cell文字数、payload byte上限を追加しない。幅広tableや長文cellを含む上限はTASK-023で実測して決定する。
- Python結果Store、5,000行固定page、全件sort／filter、全件数、件数上位30区分の遅延distribution、virtualized renderingはTASK-023で調査・決定し、TASK-016初期版へ含めない。
- TASK-022で、CSV／Excelはsort／filterの影響を受けない元のstep結果全件をConnector経由で生成し、clipboardは現在pageだけを最大5,000行で専用Bridgeから書き込む。TASK-016ではBridgeとConnectorをexportのために変更しない。
- Application Adapterが実行とBridgeを所有し、libraryへBridge、DataFrame、Connector、step等のApplication概念を渡さない。
- `destroy()`はdocument listener、body menu、timer、DOM参照を解放する。upstream repositoryでschema description／unknown type／commit timing／lifecycle Testを通過したcommitだけを再vendorする。

## Theme, CSS, namespace, and lifecycle

- Applicationのcolor tokenを正本とし、library tokenはAdapterまたはlibrary側のaliasで接続する。
- library CSSは割り当てられたroot element配下へscopeし、Application全体へ無条件に適用するselectorを追加しない。
- libraryが公開するglobal namespaceはlibraryごとに一つとし、Applicationからは対応Adapterだけが参照する。
- mountごとに対応するunmount／destroyを持たせ、event listener、timer、observer、DOM参照を解放する。
- lifecycle、CSS scope、namespace、themeの不足は、そのlibraryを使用する移管Work Packageの開始条件として解消する。

## Workflow Document decision

Workflow Documentの管理主体を本Taskでは決めない。`zizai-workflow-designer`への移管Work Package直前に、同libraryの状態入出力APIだけを調査し、Project ownerが次のいずれかを決定する。

- JS Application stateを正本としてlibraryへ入出力する。
- library側のDocumentをFrontend正本とし、Application Adapterが保存・読込・実行形式へ接続する。

どちらの場合も正本は一つとし、JS Application stateとlibrary内部へ同じ永続データを二重管理しない。決定前にDocument変換や互換実装を開始しない。

## Security boundary

- libraryからremote script、stylesheet、iframe、Web Component、fontその他のremote assetを読み込まない。
- libraryへQWebChannel object、filesystem path、資格情報を直接渡さない。
- external URLは文字列eventとしてApplication Adapterへ渡し、Applicationのscheme／allowlist policyを通す。
- library導入を理由にBridge capabilityやfilesystem scopeを拡張しない。

## Integration and verification gates

各移管Work Packageは、対象spaceについて次を満たす。

- Project ownerによるspace決定が記録されている。
- local assetだけでoffline起動でき、取得元revisionとLICENSEが記録されている。
- Adapterのevent／payload、lifecycle、theme、CSS scope、namespaceが検証されている。
- Bridge、保存・読込・実行、external URL、native操作がApplication責務に残っている。
- libraryへ移管したUI責務と重複するApplication実装が削除され、回帰Testが通過している。

TASK-016でlibrary単位のUnit／Integration／E2Eを実行し、TASK-015で`RISK-BRIDGE-001`、`RISK-EXT-001`、`RISK-WEB-001/002`、`RISK-UI-001`、`RISK-CI-001`とTASK-016固有Testを最終回帰する。
