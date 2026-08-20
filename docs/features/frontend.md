# Embedded Frontend Contract

- Status: Current Specification
- Last verified: 2026-08-21
- Target migration: TASK-012

## Current pages and runtime

- `static/home.html`、`static/dataflow.html`、`static/settings.html`の3 pageをDesktopが`file://`で読み込む。
- 共通shellは`static/js/app-shell.js`、page固有処理は`app.js`、`app.home.js`、`app.static.js`へ分離する。
- Frontend moduleは`static/js/packages/*.package.js`から`window.zizPackages`へ登録する。
- Pythonとの通信は`static/js/bridge.js`のQWebChannel Adapterを通し、object名`backendBridge`とProtocol `1.0`を維持する。

## State and rendering

- Domain stateの正本は`app.js`の`state`である。
- Node構造、選択、主要form確定は全体再描画対象とする。
- `run.stepStatus`はflow statusだけを部分更新し、detail/data areaを毎回再構築しない。
- Preview/schemaの正本はbackendのlatest resultで、Frontend cacheは表示高速化だけに使う。
- `input_data`選択はUI stateを先に更新し、schema補完は非同期で後追いする。
- Cacheは`flowScopeKey::step_id`で分離し、flow/config変更時に破棄する。

## Styling

- Colorは`static/css/00_tokens.css`を正本とし、Componentからliteral colorを追加しない。
- Semantic state（error/success/warning/info）とinteractive state（hover/active/focus/selected/disabled）を分離する。
- Semanticの意味をhover等で失わせず、既存tokenで表現できる場合は新規tokenを作らない。
- Existing non-complianceは別Taskで一括修正せず、対象Component変更時に解消する。

## Security boundary

- External script、external iframe、Web Component、CDN assetをBridge到達可能なlocal pageへ導入しない。
- 同梱`dataflow.html`のinternal iframeだけを許可例外とし、`postMessage`/`CustomEvent` contractをBridge contractと混同しない。
- Popup、main-frame navigation、base外file、data/blob等の挙動はVerification ContractのWindows WebEngine Gateで判定する。

## Verification

- Browser-only regressionではtest専用localhost static serverを利用できるが、Python backend/APIは起動しない。
- QWebChannel、file asset、navigation/securityはWindows QtWebEngine Runtime Gateで確認する。
- Native dialog、window操作、主観的な表示は証跡付きmanual UI Gateで補完する。
- 旧202606 browser captureはnative WebEngine確認が未完の条件付き履歴であり、Current UIの合否根拠として単独利用しない。

## Approved target

TASK-012で`static/`を`apps/gui/`へ移す。UI再設計、localhost/API化、外部Web埋め込み、Bridge breaking changeを混在させない。
