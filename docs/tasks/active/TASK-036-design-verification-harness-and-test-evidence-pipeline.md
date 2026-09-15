# TASK-036 Design Verification Harness and Test Evidence Pipeline

## Status

Not Started — 設計Task。Harnessの実装は行わない。推奨実装順序 4/7（TASK-032 → TASK-033 → TASK-034 Subtask A → TASK-036 → TASK-028 → TASK-034 Subtask B → TASK-035）。

## Goal

次の流れを実現するVerification Harness／Test Evidence Pipelineを設計する。

1. Testを機械的に実行する。
2. machine-readableなevidenceを出力する。
3. AIはsummary、failure一覧、前回実行との差分だけを評価する。

2026-09-14〜15に一時scriptで行った5段階の確認（既存Gate、Connector実行、CLI headless flow、Desktop実画面の自動操作、OS入力）を、このHarnessで再現できる構成を含める。

## Scope

- 入口の設計: 既存の`tests/run-verification.ps1`を中心にできるかを評価する。現行のGate／RiskId指定、exit code、uv／Playwrightの前提確認を踏まえ、既存runnerを拡張する案と別入口を設ける案を比較する。
- 1 commandでの実行: category指定と除外指定を含めて、1つのcommandで対象Testを実行できる。
- test categoryの指定。
  - 既存のGate: static-analysis、unit、integration、e2e、manual-ui
  - 追加するcategory候補: Connector実行、CLI scenario、Desktop実画面、OS入力
- 外部依存Testのexclude。
  - 識別する条件: 課金が発生しうる対象（BigQuery等）、外部通信（実browser、driver取得）、OS入力、実画面表示、長時間処理・model取得
  - pytest marker等で識別し、除外・選択できるようにする。
  - 除外したcaseを結果に記録する。
- machine-readable summary: 実行したcategory、件数（passed／failed／skipped／deselected）、所要時間、除外条件、exit code。
- failure一覧: 失敗caseの識別子、category、message、関連するlog・artifactへの参照。
- 既存formatの再利用: pytestのJUnit XML（`--junitxml`）、PlaywrightのJUnit／JSON reporter等を優先する。独自formatは集約に必要な最小限に留める。
- previous runとの差分: 新規失敗、解消、継続失敗、件数の変化を比較できる形。
- environment情報: OS、Python／uv／Node／Playwrightと主要依存のversion、console code page、QtWebEngineとsymlinkのcapability、表示環境、除外条件。
- screenshots／logsへの参照: Desktop実画面のscreenshot、app log、Playwright artifactへのpathをevidenceから参照できる。local pathやuser名を含むartifactの扱いと、Remote Safe Gateとの整合を含める。
- exit code: 既存の0（成功）／1（失敗）／2（前提不足）の意味を維持するか、category集約時にどう扱うか。
- local／CIでの共通利用: localとCIで同じRunnerを使う。CIで実行できないcategory（OS入力、実画面表示等）の扱いを含める。
- GitHub Actions: `migration-verification.yml`の各jobが同じRunnerを呼び、evidenceをartifactとして保存する構造。
- AIの評価範囲: AIが読むのはsummary、failure一覧、前回との差分とし、生logは必要な場合だけ参照する運用。
- 概念上の出力候補: `summary.json`、`failures.json`、`junit.xml`、`environment.json`、前回との差分（例: `diff.json`）。最終的なfile構成は既存出力の再利用を優先して決める。
- 5段階の確認とcategoryの対応付け。Desktop実画面の隔離方式とOS入力の安全ガードを含める。
- 実装Taskへの分割案。

## Out of scope

- Harness、Test code、CI workflowの実装と変更。
- 今回見つかった不具合の修正（TASK-032、TASK-033、TASK-034、TASK-028）と仕様調査（TASK-037）。
- BigQueryの実接続Test（TASK-027）。
- Knowledge／Retrieval Connectorの設計（TASK-035）。

## References

- Runner・設定: `tests/run-verification.ps1`、`tests/playwright/playwright.config.js`、`.github/workflows/migration-verification.yml`、`tests/fixtures/contracts/tracked-test-sources.json`、`.github/scripts/remote_safe_gate.py`
- Desktop host: `apps/desktop/host.py`（`run_webview_app`）、`apps/desktop/bridge.py`、`apps/core/repository_layout.py`
- Current Specification: [Coding Rules](../../features/coding-rules.md)（Verification and evidence）、[Architecture](../../features/architecture.md)、[Frontend](../../features/frontend.md)（Verification）
- Handoff: [TASK-008 Regression Baseline Design](../../handoffs/TASK-008-regression-baseline-design.md)（Gate構成とexit code）
- 関連Task: [TASK-015](TASK-015-verify-v23-migration-completion.md)（Test plan、今回の検証結果のEvidence）、[TASK-027](TASK-027-verify-bigquery-connector-with-cost-guardrails.md)、[TASK-028](TASK-028-verify-vector-connector-behavior.md)、[TASK-032](TASK-032-define-dataframe-to-duckdb-type-contract.md)、[TASK-033](TASK-033-unify-step-reference-format-validation-and-suggest.md)、[TASK-034](TASK-034-normalize-web-allowlist-and-define-security-settings.md)、[TASK-037](TASK-037-investigate-connector-behavior-and-ui-display-spec-gaps.md)

## Constraints

- 本Taskは設計に限り、Harness、Test code、CI workflow、Current Specificationを変更しない。
- 独自formatを必要以上に増やさず、pytest／Playwright等の既存出力を優先する。
- 課金が発生しうる接続、外部通信、OS入力、実画面表示を伴うTestを、既定のrequired Gateへ無条件に含めない設計にする。
- OS入力Testは、専用test windowへの入力と安全ガードを前提にする。
- evidenceに認証情報や不要な個人情報を含めない設計にする。
- 設計の採用と、Current Specification（Coding RulesのVerification and evidence等）の変更は、Project ownerの承認を得てから別途行う。

## Acceptance Criteria

- 次の設計が記録されている。
  - Harnessの入口（既存runnerの拡張か、別入口か）
  - 1 command実行、category指定、除外指定、exit code
- machine-readable evidenceの構成と、各項目の生成元が記録されている。構成に含めるのは次のとおり。
  - summary
  - failure一覧
  - JUnit等の既存format
  - environment情報
  - previous runとの差分
  - screenshots／logsへの参照
- localとGitHub Actionsで同じRunnerを使う構造と、CIで実行しないcategoryの扱いが記録されている。
- 2026-09-14〜15の5段階の確認を、どのcategoryで再現するかが対応付けられている。
- AIが評価する範囲（summary／failure一覧／差分）と、生logを参照する条件が記録されている。
- 設計案がProject ownerに承認され、実装Taskへの分割案が作成されている。

## Evidence

2026-09-14〜15の非BigQuery検証で、一時scriptにより手作業で実施した内容と、Harness設計に関わる課題。検証結果そのものは[TASK-015](TASK-015-verify-v23-migration-completion.md)のEvidenceに記録した。

### 除外指定

- `tests/run-verification.ps1`に除外指定がないため、BigQuery関連Testを除外するためにpytestとPlaywrightを直接実行した。
- pytestで除外した5件:
  - `tests/e2e/test_task010_ui_config_boundary.py::test_real_webengine_bridge_reflects_icon_map_and_empty_deprecated_suggest_path`
  - `tests/integration/test_task010_bridge_config_contract.py::test_suggest_index_path_field_becomes_a_deprecated_empty_string`
  - `tests/static/test_sql_highlighter_adapter_contract.py::test_dataflow_page_does_not_reference_dialect_json_at_runtime`
  - `tests/integration/test_connector_discovery.py::test_inventory_resolves_one_connector_class_without_execution`
  - `tests/integration/test_connector_discovery.py::test_apps_connectors_module_set_is_exactly_the_inventory`
- Playwrightで除外した10件: test名または本文でBigQuery／`BQConnector`を扱うTest。内訳は`node-form-field-kinds.spec.js` 1件、`node-form-renderer-routing.spec.js` 3件、`sql-highlighter.spec.js` 6件。

### 結果の取得方法

- 結果はconsole出力をfileへ保存し、一時scriptで集計した。PowerShellのredirectでUTF-16になったlogもあり、件数と失敗の抽出に個別の処理が必要だった。
- Playwrightの現行設定は`reporter: "line"`のため、失敗caseの一覧をmachine-readableに取得できなかった。
- Connector実行、CLI flow、Desktop実画面、OS入力は一時scriptで実施し、結果はscriptごとのJSONに出力した。screenshotは一時領域へ保存した。
- environment情報（依存version、console code page 65001、QtWebEngineとsymlinkのcapability）は手作業で確認した。
- 前回実行（CI結果）との差分は、比較のたびに個別scriptを作った。

### 設計に使える知見

- Desktop実画面: production host（`run_webview_app`）を一時repository rootで起動し、Qt eventでUIを操作できた。
  - QtWebEngine profileの保存先は、application名を分けることで利用者の実アプリから隔離できた。
  - offscreenではDOMの検証はできるが、screenshotは取得できなかった。
  - GUIからの実行では、step名が`step1`形式へ正規化される。
- Desktop実画面の自動操作で使った手順とhook（2026-09-15時点。UI変更で変わりうる）:
  - `run_webview_app`は`app.exec()`でblockするため、`QApplication.exec`を差し替えてevent loop内から操作した。mouse／wheel eventは`QWebEngineView.focusProxy()`へ送った。
  - 一時repository rootへは`apps/common/config`だけをcopyし、root `config/`と`workflows/`は一時root内に新規作成した。
  - app logの出力先は`apps/core/logger.py`の`LOG_DIR = Path("logs")`でcwd基準のため、cwdを一時rootへ移し、利用者の`logs/`へ書き込まないようにした。一時rootの`logs/app_*.log`にある`フロー開始: <flow file名>`と`フロー完了`を、完了判定にも使った。
  - home画面: Explorer activity `[data-activity-id="explorer"]`で`dataflow.html`へ移動し、file行`.workspace-tree-file-name`のclickでflow tab（`iframe.workspace-flow-frame`）を開いた。
  - flow tabのiframe内: 実行button `[data-zwd-command="workflow.run"]`、zoom `[data-zwd-command="viewport.zoom-in"]`／`[data-zwd-command="viewport.zoom-out"]`を操作した。step nodeの実行状態は`.zwd-node--step`の`data-run-status`、viewportは`#flowchart`要素の`__workflowDesignerAdapterRuntime.instance.getViewport()`で取得した。
  - 実行ログダイアログは最上位documentではなく、flow tabのiframe内に表示される（最上位documentの`.app-dialog__panel`では検出されなかった）。
- Vector Connectorを含む実行では`HF_HUB_OFFLINE=1`（CLI実行では`TRANSFORMERS_OFFLINE=1`も）を設定し、cache済みmodelだけを使った。
- OS入力: 次の安全ガードにより、専用test window以外へ入力を送らなかった。
  - 操作点が専用test windowであることの確認（WindowFromPoint）
  - 前面windowが専用test windowであることの確認
  - pyautoguiのfail-safe
  - clipboard textの復元確認

## Remaining Work

- 既存runnerとCI workflowの構造を確認し、拡張案と別入口案を比較する。
- 出力構成（既存formatの生成方法、集約summaryの項目、差分の比較単位）を具体化する。
- 5段階の確認とcategoryの対応表を作る。
