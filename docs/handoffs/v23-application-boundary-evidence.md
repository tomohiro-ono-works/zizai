# v23 Application Boundary Evidence

- 調査日: 2026-08-17
- 対象: TASK-001 Application Runtime Topology
- 状態: Runtime、Repository責務境界、Bridge互換方針、Frontend配置をユーザー確認済み。ADRへ反映済み。

## 現行RuntimeのEvidence

- `zizai.py`はGUI起動時に`app.gui.host.run_webview_app()`を呼び出す。
- `app/gui/host.py`はPySide6/QtWebEngineでローカルHTMLを`QUrl.fromLocalFile()`から読み込む。
- FrontendとPythonは、`QWebChannel`へ登録した`backendBridge`を通じて通信する。
- localhostで待ち受けるHTTP APIサーバは存在しない。
- `static/js/bridge.js`は`qt.webChannelTransport`を利用して`backendBridge`へ接続する。

## 確定したRuntime方針

- localhost APIは新設しない。
- `PySide6 + QtWebEngine + QWebChannel + file://`による単一Desktop Runtimeを継続する。
- Frontend / API / Desktopを独立RuntimeへStrict分離する構成は採用しない。
- Repository上の責務分離を行う場合も、Runtime分離やHTTP化を前提にしない。

## データ通信方針

- QWebChannelは制御命令と小〜中規模データの通信に使用する。
- 現行BridgeはJSON文字列を扱うため、大量データではシリアライズ負荷とUIスレッド停止が発生し得る。
- 大量データが必要になった場合は、ファイル参照、分割転送、または用途別の専用経路を検討する。
- HTTP通信層を追加しないことで、Desktop内通信のNetwork stack依存と追加Overheadを避ける。

## Repository責務境界

- Application関連の責務は`apps/`配下へ集約する。
- `apps/desktop`はPySide6、QtWebEngine、QWebChannelおよびDesktop固有処理を担当する。
- `apps/cli`は画面を持たないCLI entrypointを担当する。
- `apps/gui`は内蔵WebViewで表示するローカルFrontendを担当し、現行`static/`の移行先とする。
- `apps/core`はBusiness LogicとWorkflowを担当し、Qt、UI、具体Connectorへ依存しない。
- `apps/connectors`は外部System・File formatとのAdapterを担当し、`core`が定義するInterfaceに従う。
- `apps/common`はApplication内で共有するConfig、型および言語中立なContractを担当する。
- 依存方向は`desktop` / `cli`から`core`、`connectors`から`core`のInterface、`gui`からBridge Contractを基本とする。
- 現行`app/gui/`のPython Host / Bridge実装は`apps/desktop/`へ移し、Target Treeに`app/gui/`と`apps/web/`は残さない。

## Bridge Message Contractの現行適合確認

- 現行BridgeはProtocol version `1.0`のJSON Envelopeを使用する。
- EnvelopeはCommand（`cmd`）、Response（`res`）、Event（`evt`）の3種類である。
- 現行Backendには31種類のCommandと、実行・座標取得に関する8種類のEventが存在する。
- Command/Responseは`id`、実行Eventは`run_id`、座標取得Eventは`capture_id`、画面Sessionは`workspace_tab_id`で対応付ける。
- `flow.run`は受付Response後に進捗・完了Eventを返すため、単純なRequest/ResponseだけをContractとしない。
- `file.pickFile` / `file.pickFolder`はユーザー操作待ちのためFrontend timeoutを設けず、Preview系は通常より長いtimeoutとBackend非同期実行を使用する。
- Flow定義やConnector結果は可変構造を含むため、共通Envelopeは固定しつつ、Payloadは拡張可能なSchemaとして扱う。
- `apps/common/contracts/bridge/`にEnvelope、Command、Response、Error、Event、timeout・非同期・相関方法を言語中立形式で配置する。
- Python側のHost / Bridge実装Adapterは`apps/desktop`、JavaScript側AdapterとFrontend資産は`apps/gui`に置き、Contract自体とRuntime実装を分離する。

## Bridge互換方針

- Repository移行中はProtocol version `1.0`、全Command/Event名、Envelopeおよび現行Error形式を維持する。
- 現行Frontendから直接参照されていないBackend capabilityも、動的呼出しや将来利用の確認なしに削除しない。
- Breaking changeは構造移行と分離し、Protocol version更新と専用Taskによる承認を必須とする。
- v1.0互換は、Repository移行完了とBridge Integration Test・手動Runtime Testの完了まで維持する。

## 内部Frame Contract

- 現行Workspaceは、同梱した`dataflow.html`を同一生成元の内部`iframe`へ表示してTab UIを構成している。
- この内部`iframe`は外部Webページの埋め込みではなく、外部Webサービス埋め込み禁止の対象外とする。
- 内部画面間では`window.postMessage` / `CustomEvent`と`ziz-embedded` Envelopeを使用しているため、QWebChannel Contractへ混在させない。
- 内部画面間Contractを維持する場合は、`apps/common/contracts/web-frame/`へBridge Contractと分けて配置する。
- 将来すべての`iframe`を禁止する場合は、Workspace Tab UIの再設計を別Taskとして扱う。

## 外部Webサービスの利用方針

- 内蔵WebViewは同梱したローカルUI専用とする。
- 外部Webページを内蔵WebViewへ表示しない。
- `iframe`、Web Component、別`QWebEnginePage`による外部ページの埋め込みは行わない。
- CDN等の外部配信JavaScriptを、QWebChannelを持つローカルHTMLへ読み込まない。
- 外部Webサービスを利用する場合は、Allowlistで許可した初期URLをOSの既定ブラウザで開く。
- 既定ブラウザ起動後の認証、画面操作、遷移およびDownloadは、外部ブラウザ側で完結させる。
- アプリは既定ブラウザ起動後の遷移先を制御・再判定しない。

## Tableau方針

- Tableau Embedding API、`iframe`、`<tableau-viz>`はアプリ内で使用しない。
- TableauのCDN JavaScriptを内蔵UIへ読み込まない。
- Tableauを利用する場合は、Allowlistで許可したTableau URLをOSの既定ブラウザで開いて操作する。
- 現行資産`template/preview.html`は上記方針と異なるため、移行対象として扱わず、TASK-005でDispositionを決定する。

## Security上の境界

- localhost待受を設けないことで、Network経由の攻撃面を増やさない。
- Python権限へ到達できるのは、信頼済みローカルUIのBridge呼び出しに限定する。
- 外部WebサービスのJavaScriptはアプリ内で実行されないため、QWebChannel Bridgeへ到達しない。
- Allowlistは、OSの既定ブラウザへ渡してよい初期URLの判定に使用する。

## 残る作業

- 後続Taskの旧配置案（`core` / `connectors` / `static`を`apps/desktop`配下へ集約する案）を、確定した責務境界へ合わせて更新する。
- 物理移行は、Frontend、Host / Bridge、起動Path、内部FrameのIntegration Testと同時に行う。

## Evidence Sources

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/TASK-001-005-review-guidance.md`
- `docs/tasks/done/TASK-001-decide-application-runtime-topology.md`
- `zizai.py`
- `app/gui/host.py`
- `app/gui/bridge.py`
- `static/js/bridge.js`
- `template/preview.html`
