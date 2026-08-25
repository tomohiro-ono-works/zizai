# Embedded Frontend Contract

- Status: Current Specification
- Last verified: 2026-08-23
- Target migration: TASK-012、TASK-016、TASK-018、TASK-019

## Current pages and runtime

- `apps/gui/home.html`、`apps/gui/dataflow.html`、`apps/gui/settings.html`の3 pageをDesktopが`file://`で読み込む。
- 共通shellは`apps/gui/js/app-shell.js`、page固有処理は`app.js`、`app.home.js`、`app.static.js`へ分離する。
- Frontend moduleは`apps/gui/js/packages/*.package.js`から`window.zizPackages`へ登録する。
- Pythonとの通信は`apps/gui/js/bridge.js`のQWebChannel Adapterを通し、object名`backendBridge`とProtocol `1.0`を維持する。

## State and rendering

- Domain stateの正本は`app.js`の`state`である。
- Node構造、選択、主要form確定は全体再描画対象とする。
- `run.stepStatus`はflow statusだけを部分更新し、detail/data areaを毎回再構築しない。
- Preview/schemaの正本はbackendのlatest resultで、Frontend cacheは表示高速化だけに使う。
- `input_data`選択はUI stateを先に更新し、schema補完は非同期で後追いする。
- Cacheは`flowScopeKey::step_id`で分離し、flow/config変更時に破棄する。

## Styling

- Colorは`apps/gui/css/00_tokens.css`を正本とし、Componentからliteral colorを追加しない。
- Semantic state（error/success/warning/info）とinteractive state（hover/active/focus/selected/disabled）を分離する。
- Semanticの意味をhover等で失わせず、既存tokenで表現できる場合は新規tokenを作らない。
- Existing non-complianceは別Taskで一括修正せず、対象Component変更時に解消する。

## Security boundary

- External script、external iframe、Web Component、CDN assetをBridge到達可能なlocal pageへ導入しない。
- 同梱`dataflow.html`のinternal iframeだけを許可例外とし、`postMessage`/`CustomEvent` contractをBridge contractと混同しない。
- Popup、main-frame navigation、base外file、data/blob等の挙動はVerification ContractのWindows WebEngine Gateで判定する。
- 利用者またはFrontend componentからexternal URLとして入力される値は、Frontend AdapterとPython backendの両方で`http:`／`https:`だけを許可する。`file:`を含むその他schemeは拒否する。この入力検証は、Desktopが同梱UIを`file://`で読み込むRuntime contractとは別である。

## Approved Frontend library requirement

次の8 libraryをすべてexact revisionのlocal assetとして利用し、Application側へ同一UI責務を重複実装しない。

配置、責務境界、導入判断、検証条件の詳細正本は`docs/features/frontend-libraries.md`とする。

1. `zizai-app-shell`
2. `zizai-catalog-panel`
3. `zizai-data-viewer`
4. `zizai-editor-markdown`
5. `zizai-form`
6. `zizai-highlighter-sql`
7. `zizai-sqlflow-designer`
8. `zizai-workflow-designer`

- 各libraryを利用するFrontend spaceは事前に一括決定しない。各spaceの移行Work Package開始前にProject ownerが決定する。
- Agentはrepository名、sample、既存画面名から配置を推測しない。
- Bridge、Source/Runtime config、persistence、execution、navigation、external URL、OS window/dialog/clipboard等はApplication Adapterの責務とし、libraryから直接扱わない。
- pinning、配布許諾、theme、lifecycle、Document contract等の共通導入条件はTASK-018、物理移動はTASK-012、space単位の導入と重複削除はTASK-016で扱う。

## Verification

- Browser-only regressionではtest専用localhost static serverを利用できるが、Python backend/APIは起動しない。
- QWebChannel、file asset、navigation/securityはWindows QtWebEngine Runtime Gateで確認する。
- Native dialog、window操作、主観的な表示は証跡付きmanual UI Gateで補完する。
- 旧202606 browser captureはnative WebEngine確認が未完の条件付き履歴であり、Current UIの合否根拠として単独利用しない。

## Approved target

TASK-012で既存Frontendを挙動維持のまま`static/`から`apps/gui/`へ物理移動済みである。TASK-016でProject ownerが決定したspaceを8 libraryへ段階移行する。TASK-012へUI再設計を混在させず、TASK-016では同一責務のApplication実装を回帰確認後に削除する。localhost/API化、外部Web埋め込み、Bridge breaking changeは行わない。
