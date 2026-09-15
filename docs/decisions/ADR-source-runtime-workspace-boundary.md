# ADR Source, Runtime, and Workspace Boundary

- Status: Accepted
- Date: 2026-08-24
- Decision owner: Project owner
- Applies to: TASK-010

## Context

現行のroot `config/`は、追跡対象のSource設定とlocal-onlyのRuntime/User stateを同じ`workspace` scopeで公開している。Frontendは`config_path`からrepository/workflow pathを推測し、Source設定の絶対pathも一部Bridge responseに含まれる。この構造では、Source設定を`apps/common/config/`へ移すとRuntime stateの保存先、Bridge Protocol、WebView file boundary、初期Workspace解決を同時に壊し得る。

## Decision

### Root ownership

- Production entrypointが明示的な`repository_root`を共通Path Resolverへ渡す。HTML位置やPython module階層から各rootを個別に逆算しない。
- `source_config_root`は`<repository>/apps/common/config/`とする。
- `runtime_state_root`は既存の`<repository>/config/`に維持し、既存dataの位置と内容を変更しない。
- `workspace_default_root`は既存の`<repository>/workflows/`とする。利用者が選択したWorkspaceは別のSession/Workspace状態として扱う。
- ResolverはProduction既定値と、Testから渡せる明示rootを同じInterfaceで受け取る。

### Bridge Protocol

- Bridge Protocol `1.0`の31 Command、8 Event、Envelope、error、相関IDを維持する。TASK-010でCommandを追加・削除しない。
- payload schemaの追加だけを行い、既存fieldは削除しない。
- `security_policies.path`、suggest responseの`path`、workspace responseの`config_path`はkeyとstring型を維持し、値を空文字にしたdeprecated fieldとする。
- Runtime/User stateには既存`workspace.*` Commandと新しい`runtime` scope値を使う。既存`config` scope値は移行中のdeprecated aliasとしてRuntime rootだけへ解決し、Source rootへは到達させない。
- Source、Runtime、Workspaceの保存先pathまたは汎用scopeをFrontend libraryへ渡さない。利用者が選択して表示に必要なWorkspace pathだけを返す。

### Source config access

- `security_policies.yml`はPython内部だけで読み、判定結果と非機密statusだけを返す。mtime/sizeを含む変更検知付きprocess cacheを許可する。file missingまたはYAML／top-level contractがinvalidな場合はallowlist空としてfail-closedにする。個々のWeb allowlist entryがinvalidな場合は、[ADR Web Allowlist Canonicalization](ADR-web-allowlist-canonicalization.md)に従い当該entryだけを除外する。
- `rename.csv`はWorkflow実行時にPythonだけが読み、contentをBridgeへ送らない。旧`config\rename.csv`との互換方針は`ADR-rename-list-path-compatibility.md`を正とする。
- `suggest_index/`は既存`app.getSuggestIndex`を使用する。Application AdapterはConnector利用前に取得して保持し、取得失敗を空cacheとして固定せず次回利用時に再試行する。旧direct fetch fallbackは廃止する。
- `file_icon_map.json`をWebViewの相対file URLで直接読ませない。Hostの許可root/file例外は増やさず、既存`app.getStatus`の追加payloadで検証済みmapを1回渡す。値は同梱page基準の表示用relative asset URLであり、Application Adapterが解決してFrontendへ渡す。
- icon mapとsuggest indexのSource更新はApplication再起動時に再取得する。機能利用中はFrontend cacheを使い、操作ごとのBridge callを行わない。

### Runtime and Workspace access

- `recent_roots.json`はRuntime専用scopeで読み書きし、機能表示前に取得してFrontendで保持する。更新操作はRuntime rootへ保存する。
- `recent_flows.json`は既存どおりPythonがRuntime rootで管理する。
- Runtime stateだけが残るExplorerの`Config` nodeは表示しない。Source設定とRuntime内部fileをExplorerの汎用read/write/delete対象にしない。
- Workspace既定値はPythonが`workspace_default_root`から解決する。Frontendは`config_path`の親からrepository/workflow pathを推測しない。

### Immediacy and failures

- 即時性は「利用者が機能を操作してから結果が表示または開始されるまで」と定義し、Application起動時間とは分ける。
- icon map、suggest index、recent rootsは利用前に取得・保持し、表示、入力、選択のたびにfile/Bridgeへ再アクセスしない。
- 数値SLAは本Migrationへ追加しない。per-keystroke/per-row Bridge callがないこと、失敗時に安全な既定値または再試行へ移ることをTestで固定する。

## Verification consequences

- layout contractを`source_config_root`と`runtime_state_root`へ分割する。
- Source root、Runtime root、Workspace root、Test fixture rootの解決を独立Testする。
- 31 Command/8 Event、deprecated path fieldのkey/string型、Source rootへの汎用scope到達不能を回帰Testする。
- security fail-closed、suggest retry、icon fallback、Runtime data不変、Explorer `Config` node非表示を確認する。
- Windows E2Eでは、icon mapまたはsuggest indexが実際のUIへ反映される代表caseを少なくとも1件確認する。

## Consequences

- Source設定の物理移動がRuntime/User dataとFrontend file boundaryを変更しない。
- WebViewへSource directory例外を追加せず、Bridge Protocol `1.0`を維持できる。
- Application AdapterとPythonに少量のprefetch/cache/error処理が必要になる。
- `config` scopeとpath fieldはMigration中の互換aliasとして残るため、後日削除する場合は専用Protocol Decisionを必要とする。
- 旧`rename_list_path: config\rename.csv`との互換は別Decisionにより提供しない。
