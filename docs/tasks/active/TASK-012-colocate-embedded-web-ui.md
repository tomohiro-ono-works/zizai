# TASK-012 Relocate the Embedded Web UI to apps/gui

## Status

Blocked — TASK-011

## Goal

QWebChannelによる既存UI動作を保ったまま、同梱Frontendを責務境界`apps/gui/`へ移す。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- TASK-011 Desktop Runtime

## Scope

現行`static/`一式とJavaScript側Bridge Adapterを`apps/gui/`へ移し、`apps/desktop/`のHostが`file://`で読み込むPath、HTML/CSS/JS、asset、config参照を更新する。Bridge Contractは`apps/common/contracts/bridge/`、同梱内部Frame Contractは`apps/common/contracts/web-frame/`へ分離する。

## Out of scope

HTTP API、Web独立配信、外部Web埋め込み、外部配信JavaScript、UI再設計、dead asset削除、Bridge Protocol breaking change。

## Dependencies

TASK-001、TASK-011。TASK-001はCompletedであり、Embedded local UI経路がActivated済みである。

## Expected change area

- `apps/gui/`
- `apps/desktop/`のHost／Bridge path設定
- `apps/common/contracts/bridge/`
- `apps/common/contracts/web-frame/`
- 共通config参照

## Acceptance criteria

- 3画面が`apps/gui/`から`file://`で読み込まれる。
- QWebChannel接続とProtocol v1.0の31 Command、8 Event、Response／Error形式、相関IDが維持される。
- 相対asset、modal、icon、vendor参照がすべて解決する。
- 同梱`dataflow.html`の内部`iframe`は許可し、`window.postMessage`／`CustomEvent` ContractをQWebChannel Contractと分離する。
- 外部URLはAllowlist検証後にOS既定ブラウザだけで開き、外部Page／iframe／Web Component／CDN JavaScriptを内蔵WebViewへ読み込まない。
- MOVE前にroot `static/`へのCode／Runtime／Test／CIおよびactive/canonical documentationの有効参照が0になる。
- Target Treeに`apps/desktop/static/`、`app/gui/`、`apps/web/`を残さない。
- Windows WebEngine smoke、Bridge Integration、Frontend Regressionと必要なmanual-ui GateがPASSする。

## Test plan

- `static-analysis`: asset link、root `static/`の有効参照0、外部script／埋め込み禁止確認。
- `integration`: Bridge message round-trip、内部Frame Contract、外部URL AllowlistとOS browser委譲。
- `e2e`: Windows WebEngineによるhome/dataflow/settings、file:// asset、navigation/security smoke。Browser-only Frontend testはtest時だけlocalhost static serverを許可する。
- `manual-ui`: native dialog、window操作、主観的表示を証跡付きで確認する。CIはStatic～Integrationを必須実行し、安定したE2Eは専用Gateにする。

## Migration risk

High — file URL、relative assets、QWebChannelが強く結合しているため。

## Rollback

Yes — 後続Cleanup前であれば単独で戻せる。

## Parallelizable

Conditional — TASK-013が`static`や共通参照を変更しない場合のみ、別Worktreeで可能。

## Recommended branch

`migration/embedded-ui`

## Worktree

Required

## Reason for task boundary

UI asset relocationはDesktop Python移動後も独立して延期・Rollback・Runtime検証でき、QWebChannel固有Contextを分離する利益がある。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- TASK-001のApproved Target Treeに合わせ、移行先を`apps/desktop/static/`から`apps/gui/`へ改訂した。

## Evidence

- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`
- TASK-011が未完の依存条件として定義されている。

## Remaining

- TASK-011完了後、Approved Target TreeとSecurity boundaryを維持してFrontendを移行する。

## Exact next action

TASK-011完了後、`static/`のconsumerとasset参照を固定して`apps/gui/`へMOVEする。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、外部Web／JavaScriptをBridge到達可能なContextへ導入していないこと。
