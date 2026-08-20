# ADR-v23 Application Topology

- Status: Accepted
- Date: 2026-08-18
- Decision owner: Project owner
- Related task: `TASK-001 Decide Application Runtime Topology`

## Context

現行Applicationは、PySide6/QtWebEngineが`file://`でローカルHTMLを読み込み、FrontendとPythonがQWebChannel Bridgeで通信する単一Desktop Runtimeである。localhostで待ち受けるHTTP APIや、独立Deploy可能なWeb Applicationは存在しない。

一方、v23 Migration Mapは`apps/web`、`apps/api`、`apps/desktop`への分割を候補としていた。また、`core`、`connectors`、Frontendを`apps/desktop`配下へ集約する暫定案も示していた。Repository上の責務分離とRuntime分離が混同されていたため、移行前にApplication境界を確定する必要がある。

## Decision

### Runtime topology

- localhost APIは新設しない。
- `PySide6 + QtWebEngine + QWebChannel + file://`による単一Desktop Runtimeを継続する。
- `apps/gui`は独立Web Runtimeではなく、Desktopへ同梱するローカルFrontendの責務境界とする。
- `apps/api`は作成しない。現行QWebChannel BridgeがApplication Interfaceを担当する。

### Repository responsibility topology

Application関連のTarget Treeを次のように定義する。

```text
apps/
├─ desktop/                 # PySide6、QtWebEngine、QWebChannel、Desktop固有処理
├─ cli/                     # Headless CLI entrypoint
├─ gui/                     # Desktop同梱のローカルFrontend（現行static/）
├─ core/                    # Business Logic、Workflow、Domain Interface
├─ connectors/              # 外部System・File format Adapter
└─ common/                  # Application内共有Config・型・Contract
   └─ contracts/
      ├─ bridge/            # QWebChannel Message Contract
      └─ web-frame/         # 同一生成元の内部画面間Contract
```

依存方向は次を基本とする。

- `desktop`と`cli`は`core`を利用する。
- `connectors`は`core`が定義するInterfaceに従う。
- `core`はQt、Frontend、具体Connectorへ依存しない。
- `gui`はPython実装へ直接依存せず、Bridge Contractを通じてDesktop Adapterと通信する。
- `common`へBusiness Logicを置かず、共有Config・型・言語中立Contractに限定する。

### Bridge contract

- 現行Protocol version `1.0`をRepository移行中も維持する。
- ContractはCommand（`cmd`）、Response（`res`）、Event（`evt`）を対象とする。
- 現行31 Command、8 Event、成功Response、Error Responseを移行対象とする。
- ContractにはPayload Schemaだけでなく、timeout、Backend非同期実行、Event相関方法も含める。
- Command/Responseは`id`、実行Eventは`run_id`、座標取得Eventは`capture_id`、画面Sessionは`workspace_tab_id`で相関する。
- Flow定義とConnector結果は可変構造を含むため、共通Envelopeを固定しつつPayload Schemaの拡張余地を残す。
- Python側Host / Bridge Adapterは`apps/desktop`、JavaScript側Bridge AdapterとFrontend資産は`apps/gui`へ配置し、ContractとRuntime実装を分離する。

### Compatibility period

- Protocol v1.0、全Command/Event名、Envelope、Error形式を、Repository移行完了まで維持する。
- 互換維持の終了条件は、Bridge Integration Testとユーザーによる手動Runtime Testの完了とする。
- Frontendからの直接参照が確認できないBackend capabilityも、動的呼出しや将来利用を確認せず削除しない。
- Breaking changeは構造移行へ混在させず、Protocol version更新を伴う専用Taskとして承認を得る。

### Internal and external web content

- 内蔵WebViewは同梱したローカルUI専用とする。
- 外部Webページ、外部`iframe`、Web Componentによる外部Service埋め込みを行わない。
- CDN等の外部配信JavaScriptを、QWebChannelを持つローカルHTMLへ読み込まない。
- 外部ServiceはAllowlistで初期URLを検証し、OSの既定ブラウザで開く。
- Tableau Embedding APIは内蔵UIで使用せず、Tableauは既定ブラウザで操作する。
- 現行Workspaceが同梱`dataflow.html`を表示する同一生成元の内部`iframe`は、外部Web埋め込み禁止の対象外とする。
- 内部Frameの`window.postMessage` / `CustomEvent` Contractは、QWebChannel Contractと分離する。

## Alternatives rejected

### Strict `web/api/desktop` runtime split

独立Web Runtimeとlocalhost APIを新設すると、現行にないNetwork境界、Process管理、認証、Port管理が必要になる。現在の単一User向けDesktop Applicationに対して複雑性と攻撃面が増えるため採用しない。

### Place all Application code under `apps/desktop`

現行RuntimeがDesktopのみであることと、Repository責務がDesktop固有であることは同義ではない。`core`と`connectors`までDesktop配下へ置くと、Qt/UI依存の混入防止と改修範囲の制約が弱くなるため採用しない。

### Embed allowlisted external pages in the WebView

提供元が判明していても、外部Pageまたは外部JavaScriptをQWebChannel到達可能なContextで実行すると、Supply-chain compromiseや提供内容変更がPython権限へ波及し得る。URL AllowlistだけではBridge分離にならないため採用しない。

## Consequences

### Positive

- localhost Serverを追加せず、現行RuntimeとSecurity boundaryを維持できる。
- 親階層で責務を分け、担当範囲と改修影響を制約できる。
- Core、Connector、UI、Desktop固有処理の依存方向を検証しやすくなる。
- Repository移行と通信Protocol変更を分離できる。

### Costs and risks

- `apps/gui`は独立Deploy単位ではなくDesktop同梱Frontendであるため、その意味を継続して明記する必要がある。
- 現行の相対Path、動的Connector load、起動Scriptを、物理移動時に同時更新する必要がある。
- JSON/QWebChannelは大量Data転送に不向きなため、必要時はFile参照、分割転送、用途別専用経路を別途検討する。
- 内部Frame ContractとQWebChannel Contractの二系統を、別Contractとして維持する必要がある。

## Migration constraints

- 本ADRではコードやファイルを移動しない。
- 物理移行では、現行`static/`を`apps/gui/`へ、現行`app/gui/host.py`と`app/gui/bridge.py`等のPython Host / Bridge実装を`apps/desktop/`へ配置する。
- Target Treeには`app/gui/`および`apps/web/`を残さない。
- 後続Taskは、`core` / `connectors` / `static`を`apps/desktop`へ集約する旧暫定案を、本ADRのTarget Treeへ合わせて更新する。
- 物理移動は起動、Bridge、Connector discovery、Config path、内部Frameを対象とするIntegration Testと手動Runtime Testを伴う。
- 外部Web資産や旧Tableau埋め込み資産のDispositionはTASK-005で決定する。

## Acceptance criteria traceability

| TASK-001 Acceptance criterion | Decision |
|---|---|
| Embedded UI継続かStrict分離か | 単一Desktop RuntimeとEmbedded local UIを継続 |
| PySide6/QtWebEngine継続可否 | 継続 |
| Bridge/API責務 | QWebChannel BridgeをInterfaceとし、localhost APIは作成しない |
| `core` / `connectors`配置 | `apps/core` / `apps/connectors` |
| 移行中Interfaceと互換期間 | Protocol v1.0を移行・検証完了まで維持 |
| Strict分離時の再分解 | Strict分離を採用しないため対象外 |
| Application境界のUNKNOWN | なし。物理移動と資産Dispositionは後続Taskへ分離 |

## Evidence

- `docs/handoffs/v23-application-boundary-evidence.md`
- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/TASK-001-005-review-guidance.md`
- `docs/tasks/done/TASK-001-decide-application-runtime-topology.md`
- `zizai.py`
- `app/gui/host.py`
- `app/gui/bridge.py`
- `static/js/bridge.js`
- `static/js/workspace.manager.js`
