# v23 Migration Verification Contract

- Related task: TASK-004
- Date: 2026-08-19
- Last updated: 2026-08-23
- Status: Approved — Executable baseline defined

## Approved baseline policy

- Migration verificationは、LLMではなく決定的に再実行できるtest programで判定する。
- 通常のtest実行はLLM API、LLM token、外部AI serviceを必要条件にしない。
- LLMはtest設計・作成・調査の補助に利用できるが、合否判定の必須要素にはしない。
- Verification GateはStatic、Unit、Integration、Runtime、UIの5段階を基本とする。
- CIではStatic～Integrationを必須Gateとする。GUIを実行できない環境では、Bridge contract testとFrontend testを代替Gateにする。
- WebEngine/QWebChannel固有の確認はWindows上の専用smoke testとし、自動判定が困難な見た目・操作感だけを事前定義した手動UI testで補完する。
- Test sourceとtest configは追跡し、実行結果、cache、`.pyc`、一時captureは生成物として扱う。

## TASK-004 boundary

TASK-004で確定するのは、test項目、対象risk、test区分、使用tool、想定command、fixture、platform条件、合格基準、代替Gateである。

`pytest`、Playwright、WebEngine smoke test、CI設定などのtest program実装と、定義したtestの本実施は後続Taskで行う。TASK-004ではTests、CI、Application codeを変更しない。

## Approved execution decisions

- 正式CLI互換対象は`bin/ziz.bat`と`zizai.py`とする。`python -m app.main`は内部用とし、公開CLI互換Gateには含めない。
- canonical test sourceはrepository直下の`tests/`とし、Gitで追跡する。結果、cache、node_modules、`.pyc`等の生成物だけを除外する。
- browser-only Frontend testでは、HTML/JS/CSS、相対asset、画面遷移をPlaywrightで安定して再現するため、test実行中だけlocalhostのstatic serverを許可する。Python backend/APIは起動せず、production runtimeのlocalhost方式とは明確に分離する。
- CIはWindowsをPrimaryとし、Static～Integrationを必須Gateにする。外部service、実資格情報、対話GUI操作には依存させない。
- WebEngine/UIは、自動化可能で決定的な主要機能を専用Gateへ含める。環境・timing・主観的な見た目に左右されるもの、または変更頻度が高く自動testの保守負担が過大なものはRelease時の手動Gateとする。

## UI automation and manual-test policy

- 変更が少なく重要な主要操作、Bridge round-trip、file:// asset load、navigation/security境界は優先して自動化する。
- 変更頻度だけで自動/手動を決めず、期待結果を決定的に判定できるか、誤検知なく反復できるか、保守費用が妥当かも判断基準にする。
- 頻繁に変わるlayout、微妙な見た目・操作感、native dialog、window操作などは手動testを許容する。
- 手動testは、前提、操作手順、期待結果、実施環境、結果、証跡を構造化して記録する。
- 手動test記録は将来のtest suite候補として扱い、操作と期待結果が安定したものからPlaywrightまたはWindows Runtime testへ移行する。

## Gate responsibility and execution environment

| 検証手段 | 責務 | Tool | 実行環境 | CI上の扱い |
|---|---|---|---|---|
| `static-analysis` | tracked source境界、syntax/import、entrypoint、依存方向、旧path参照0 | `pytest`、Git CLI、Python標準library | Windows Primary CI、clean checkout | 必須。skipはFAIL |
| `unit` | path/config/security/connector名解決/BridgeRuntimeのpure behavior | `pytest` | Windows Primary CI。外部service・資格情報・対話操作なし | 必須。skipはFAIL |
| `integration` | 正式CLI process、connector discovery/local execution、QWebChannel signal/message contract | `pytest`、subprocess、PySide6（Bridge対象のみ） | Windows Primary CI。networkと実資格情報は禁止 | 必須。skipはFAIL |
| `e2e` | browser-only Frontend、Windows Desktop/QWebChannel/QtWebEngine Runtimeとnavigation security | Playwright、`pytest`、PySide6/QtWebEngine | Browser testはWindows Primary CI。WebEngineはWindows dedicated runnerまたはrelease環境 | Primary CIでWebEngine不能時は後述の代替Gateを使うが、release Gate自体は省略不可 |
| `manual-ui` | native dialog、window操作、座標capture、主観的表示 | 承認済みchecklist＋record validator | Windows interactive desktop | CI対象外。release前に証跡付き`Pass`必須 |

CIは検証手段ではなく、上記commandをclean checkoutで実行する環境である。Required riskで未実装、未収集、skip、platform不足が発生した場合は`Pass`へ読み替えず、`Fail`または`Blocked`として扱う。

## Canonical command contract

TASK-008は`tests/run-verification.ps1`をcanonical runnerとして実装する。LocalとCIは同じcommandをrepository rootから実行し、runnerの終了codeを次のように固定する。

- `0`: 指定Gate/Riskの全assertionがPassし、required testの未収集・skipが0。
- `1`: assertion failure、test collection failure、required testのskip、またはsource/tracking違反。
- `2`: 必須dependency、fixture、display、symlink capabilityなどの実行前提が不足し、Gateを実行できない。

Gate単位のcommandは次とする。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate static-analysis
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate unit
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate integration
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate e2e
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate manual-ui -EvidencePath results/manual/RISK-UI-001.json
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate required
```

Risk単位では各表行の`-RiskId` commandを使う。TASK-009はrunner内部のPython環境構築を`uv run --frozen`へ変更しても、この外部commandを維持する。

## Unified Risk-to-Verifier template

| Risk ID | リスク内容 | 影響度（高/中/低） | 検証手段 | fixture | Platform条件 | 実行コマンド | 合格基準 | 担当 | ステータス |
|---|---|---|---|---|---|---|---|---|---|
| `RISK-{AREA}-{NNN}` |  |  |  |  |  |  |  |  | `Proposed` |

### Field rules

- Risk IDは`RISK-{機能領域}-{連番}`形式とする。例: `RISK-AUTH-001`。
- 影響度は、高＝データ損失、security侵害、application起動不能、公開contract互換性破壊、中＝一部機能の停止または重大な機能劣化、低＝表示崩れなど機能結果を損なわない問題、とする。
- 検証手段は`unit`、`integration`、`e2e`、`manual-ui`、`static-analysis`の5種に固定する。WebEngine Runtime testは`e2e`に含め、CIは検証手段ではなく実行環境として扱う。
- fixtureは再現可能な場所を明記し、共有dataまたは非自明なdataは`tests/fixtures/`配下へ置く。単純なunit test入力は、決定的なtest factory、parameter、固定seedによるtest内生成を許可する。
- Platform条件はOS、display、runtime dependency、権限、network可否を明記する。条件不足はskipでPassにせず`Blocked`とする。
- 実行コマンドはrepository rootからcopy-and-pasteで実行できる完全な形とし、必要な相対pathと環境変数を含める。
- 合格基準は、数値、真偽値、期待値、schema、error codeなどとの機械的な一致で判定可能にする。「動作すること」のような曖昧な表現は使用しない。例: `exit code 0、かつ期待するBridge response/error codeと一致`。
- ステータスは`Proposed`、`Defined`、`Implemented`、`Passing`、`Blocked`のいずれかとする。

## Risk-to-Verifier baseline

| Risk ID | リスク内容 | 影響度 | 検証手段 | fixture | Platform条件 | 実行コマンド | 合格基準 | 担当 | ステータス |
|---|---|---|---|---|---|---|---|---|---|
| `RISK-ENTRY-001` | launcher target/import path、正式CLIのhelp/error/headless契約がfolder/toolchain移行で壊れる | 高 | `static-analysis` + `integration` | `tests/fixtures/workflows/minimal-noop.zizd`（`steps: []`で外部副作用0）、`tests/fixtures/workflows/invalid.txt` | Windows Primary CI。network・GUI・資格情報なし | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-ENTRY-001` | `bin/ziz.bat`がlayout contract記載の`zizai.py`を起動する。`zizai.py --help`はexit `0`かつ`COMMAND NAME`/`SYNOPSIS`を含む。`.txt`と存在しない`.zizd`はexit `1`。minimal fixtureはexit `0`。`import zizai`はexit `0` | Verifier: TASK-008。Regression: TASK-009、TASK-011、TASK-015 | `Defined` |
| `RISK-PATH-001` | asset/config/workflow/log rootが移動後に別rootへ解決され、missing時に静かにfallbackする | 高 | `unit` + `integration` | `tests/fixtures/contracts/repository-layout.json`、`tmp_path`へ作る`config/workflows/logs/gui`最小tree | pure caseはWindows Primary CI。Windows path separator/drive caseを必須化。networkなし | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-PATH-001` | resolverごとの正規化済み絶対pathがlayout contractの`config_root`、`workflow_root`、`log_root`、`gui_root`と完全一致し、required fileの存在判定が全件`true`。base外pathは全件拒否。旧pathは担当Migration Task完了時に有効参照`0` | Verifier: TASK-008。Regression: TASK-009、TASK-010、TASK-011、TASK-012、TASK-015 | `Defined` |
| `RISK-CONN-001` | `connectors`移動でdynamic discoveryが静かに失敗、または別classを選ぶ | 中 | `integration` | `tests/fixtures/contracts/connector-inventory.json`にStage 02確定の12 module/class pairを固定 | Windows Primary CI。optional dependencyはfake moduleで隔離し、`.execute()`・network・資格情報を禁止 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-CONN-001` | inventory 12件すべてで解決module basenameとclass名がfixtureに完全一致し、各moduleの`BaseConnector`派生class数は`1`。未登録名の解決結果は`None`。connector constructor/`.execute()`呼出回数は`0` | Verifier: TASK-008。Regression: TASK-011、TASK-015 | `Defined` |
| `RISK-CONN-002` | local connectorのshape、dtype、filter/error、progress、workbook load契約が移行で変わる | 中 | `unit` + `integration` | TASK-003でINTEGRATE承認済み`test_csv_connector.py`、`test_dataintegration_connector.py`、`test_excel_connector.py`、`test_schema_apply_common.py`と、そのtest内factory/`tmp_path` data | Windows Primary CI。local filesystemのみ。cloud、browser、shell、model、資格情報、networkは禁止 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-CONN-002` | 承認済み4 fileの11 caseをcurrent contractへ再作成し、`11 passed / 0 failed / 0 skipped`。外部connectorの実行回数とnetwork callは`0` | Verifier: TASK-008。Regression: TASK-011、TASK-015 | `Defined` |
| `RISK-CONFIG-001` | security policy/config pathまたはschema破損を空値fallbackで見逃す | 高 | `unit` + `integration` | valid policyはversion `1`、API profile `1`件、allowlist `example.com:/allowed/`と`sub.example.com:/`の2件。invalid policyはYAML list。missing pathとsuggest-index valid 2 entries/invalid rows/missingも固定 | Windows Primary CI。network・資格情報なし | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-CONFIG-001` | valid policyは`loaded=true`、version `1`、profile `1`件、allowlist `2`。invalid policyは`ValueError`、missing policyは`loaded=false`・profile/allowlist `0`。allow URL 2件だけ`true`、別domain・prefix外・non-http(s)は`false`。suggest-indexはvalid=`loaded:true/entries:2`、invalid=`E_VALIDATION`、missing=`loaded:false/entries:[]` | Verifier: TASK-008。Scheme fix: TASK-019。Path regression: TASK-010。Final regression: TASK-015 | `Passing (TASK-019, 2026-08-24)` |
| `RISK-BRIDGE-001` | Python/JSのProtocol v1.0 envelope、相関ID、capabilities、error mappingがdriftする | 高 | `unit` + `integration` | `tests/fixtures/bridge/protocol-v1.json`に31 Command、8 Event、`cmd/res/evt` schema、error caseを固定 | Windows Primary CI。PySide6導入済み。QApplication不要なcaseはpure、signal caseは最小event loop。subprocess/network禁止 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-BRIDGE-001` | `v`は`1.0`、request/responseの`id`と`type`が完全一致、capabilitiesはfixtureの31件と集合一致、Eventは8件のschema一致。error codeはversion=`E_CONTRACT_VERSION_MISMATCH`、kind/validation=`E_VALIDATION`、outside=`E_ACCESS_DENIED`、missing=`E_NOT_FOUND`、mtime/run競合=`E_CONFLICT`、unexpected=`E_INTERNAL`と完全一致し、未応答requestは`0` | Verifier: TASK-008。Regression: TASK-011、TASK-012、TASK-015 | `Defined` |
| `RISK-FS-001` | Bridge workspaceのtraversal、outside-root、symlink、delete境界が破れる | 高 | `unit` | `tmp_path`内のworkspace、outside file、regular file、symlink target、symlink componentをtest factoryで生成 | Windows Primary CI。symlink capability必須。作成不能時はexit `2`で`Blocked`。2026-09-07に管理者PowerShellで実行済み | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-FS-001` | regular read/write/deleteは期待content/statusと一致。`..`、absolute outside、symlink root/target/componentは全件`E_ACCESS_DENIED`、outside fileのhashは前後一致、regular delete後の存在は`false` | Verifier実装: TASK-008。実環境実行: TASK-014。Final regression判定: TASK-015 | `Passing (TASK-014, 2026-09-07)` |
| `RISK-EXT-001` | 外部URLがallowlistを迂回する、または内蔵WebViewへ到達する | 高 | `unit` + `integration` | `tests/fixtures/security/external-url-cases.json`にnon-http(s)、非許可domain/path、許可domain/pathを固定。OS browser launcherはmock | Windows Primary CI。real browser/process/networkは禁止 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-EXT-001` | non-http(s)と非allowlistは`accepted=false`または`E_ACCESS_DENIED`でlauncher call `0`。許可URLだけ`accepted=true`でlauncher call `1`、引数URL完全一致。WebView navigation callは全case `0` | Verifier: TASK-008。Production gap fix: TASK-019。Move regression: TASK-012。Final regression: TASK-015 | `Passing (TASK-019, 2026-08-24)` |
| `RISK-WEB-001` | `file://` page/asset/QWebChannelがfolder move後に読み込めない | 高 | `e2e` | production entry一覧を`tests/fixtures/contracts/repository-layout.json`から取得し、Bridge requestは`app.getStatus`を使用 | Windows 11 x64、interactiveまたは検証済みoffscreen session、PySide6/QtWebEngine。networkなし | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-WEB-001` | home/dataflow/settingsの`loadFinished`が全件`true`、local asset failure `0`、asset URLはlayout contractの`gui_root`配下、`backendBridge`存在、`app.getStatus` responseは`v=1.0`・相関ID一致・errorなし | Verifier: TASK-008。Regression: TASK-011、TASK-012、TASK-015 | `Defined` |
| `RISK-WEB-002` | remote/data/blob/popupまたはbase外fileがBridge到達可能なmain frame/navigationを作る | 高 | `e2e` | `tests/fixtures/webengine/navigation-cases.json`にhttp/https、base外file、data、blob、popup caseと期待拒否理由を固定 | Windows 11 x64 + QtWebEngine dedicated runner。real networkは禁止。platform不足は`Blocked` | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-WEB-002` | 全caseでnavigation commit `0`、new window生成`0`、許可root外resource load `0`、network送信`0`。試行後もcurrent main-frame URLは許可`file/qrc` scope内で、untrusted documentから`backendBridge`参照不可 | Verifier: TASK-008。Security fix: TASK-019。Move regression: TASK-012。Final regression: TASK-015 | `Passing (TASK-019, 2026-08-24)` |
| `RISK-UI-001` | native window/dialog/coordinate/retryの利用者操作が壊れる | 中 | `manual-ui` | tracked source `tests/manual/windows-ui-checklist.md`と`tests/manual/manual-ui-result.schema.json`。実行recordは`results/manual/RISK-UI-001.json` | Windows 11 interactive desktop、実display、PySide6/QtWebEngine。実施者と証跡が必要 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate manual-ui -RiskId RISK-UI-001 -EvidencePath results/manual/RISK-UI-001.json` | checklistのwindow drag/resize/minimize/maximize/close、file/folder dialog、coordinate capture、retry overlayが全件`Pass`。record schema validation exit `0`、未実施/Fail/Blocked `0`、各caseのevidence pathとfile hashが空でない | Checklist/validator: TASK-008。Execution: TASK-011、TASK-012、TASK-015 | `Defined` |
| `RISK-CI-001` | untracked test/CI残骸または生成物混入によりclean checkoutとlocal判定が乖離する | 高 | `static-analysis` + `integration` | `tests/fixtures/contracts/tracked-test-sources.json`、clean checkout | Windows Primary CI、Git checkout、network/資格情報/対話操作なし。dependency取得はlock/manifestだけを使用 | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-CI-001` | canonical source/config/workflowの`git ls-files`件数がmanifestと一致し必須file欠落`0`。`.pyc`、cache、node_modules、reports/results/screenshots/videos/traces/logsのtracked件数`0`。clean checkoutのrequired Gateはexit `0`、failed/skipped/blocked `0` | Verifier/CI: TASK-008。Regression: TASK-009～015 | `Defined` |

### Connector inventory fixture

`tests/fixtures/contracts/connector-inventory.json`は次の12 pairだけを保持する。移行Taskはpackage pathを更新できるが、module basenameとclass contractを変更する場合は別Decisionが必要である。

| Module | Class |
|---|---|
| `bigquery_connector` | `BQConnector` |
| `chrome_connector` | `ChromeConnector` |
| `csv_connector` | `CSVConnector` |
| `dataintegration_connector` | `DataintegrationConnector` |
| `duckdb_connector` | `DuckConnector` |
| `excel_connector` | `ExcelConnector` |
| `plotly_connector` | `PlotlyConnector` |
| `python_connector` | `PythonConnector` |
| `selenium_connector` | `SeleniumConnector` |
| `shell_connector` | `ShellConnector` |
| `vector_connector` | `VectorConnector` |
| `windows_connector` | `WindowsConnector` |

## Task assignment summary

| Task | Risk ownership |
|---|---|
| TASK-008 | `ENTRY`、`PATH`、`CONN-001/002`、`CONFIG`、`BRIDGE`、`FS`、`WEB-001`、`UI`、`CI`のverifier/fixture/runnerを実装する。`EXT`と`WEB-002`はcontract fixture/runner slotだけを予約し、未実装をPass扱いしない |
| TASK-009 | `ENTRY`、`PATH`、`CI`をuv/`.venv`移行後に再実行し、canonical runner commandを維持する |
| TASK-010 | `PATH`、`CONFIG`、`CI`をconfig move後に再実行し、Source configとRuntime stateを分離したlayout contractへ更新する |
| TASK-011 | `ENTRY`、`PATH`、`CONN-001/002`、`BRIDGE`、`WEB-001`、`UI`、`CI`をPython責務移動後に再実行する。`FS`はUser DecisionによりTASK-015までBlockedを維持する |
| TASK-012 | `PATH`、`BRIDGE`、`WEB-001`、`UI`、`CI`をFrontend物理移動後に再実行する。TASK-019で解消済みの`CONFIG`、`EXT`、`WEB-002`を回帰確認し、behavior変更を物理MOVEへ混在させない |
| TASK-013 | 移動したscript/assetがある場合に`PATH`と`CI`を再実行する |
| TASK-014 | 生成物cleanup後に`CI`とrequired Gate全体を再実行する |
| TASK-015 | 12 Riskすべてを再実行し、`Passing`または証跡付き`Blocked/Fail`を最終Evidenceへ記録する |
| TASK-016 | `BRIDGE`、`EXT`、`WEB-001/002`、`UI`、`CI`を各library移管後に回帰し、library固有のAdapter／lifecycle／重複削除TestをTASK-015の最終suiteへ引き渡す |
| TASK-019 | FrontendとPython backendの両方でexternal URLを`http(s)`へ限定し、`CONFIG`、`EXT`、`WEB-002`の既知scheme/navigation gapをPassさせる |

2026-08-21 User Decisionにより、`RISK-FS-001`のverifier実装はTASK-008に維持し、symlink capabilityを要する実環境実行だけをTASK-015へ延期する。TASK-015まではexit `2`の`Blocked`を維持し、Codexへ管理者権限を付与せず、ユーザーが当該Risk commandだけを管理者PowerShellで実行する。

同Decisionにより、TASK-008の完了判定はTest/CI基盤、Risk verifier、tracking境界の実装完了とする。`RISK-CONFIG-001`の既知FailはTASK-019で解消済みである。`RISK-FS-001`のBlockedはPassへ読み替えず、TASK-015の完了要件として保持し、TASK-009以降をBlockしない。

`RISK-EXT-001`のallowlist gapと`RISK-WEB-002`のnavigation gapはTASK-019で解消・実機確認済みである。Frontend物理移動後の回帰はTASK-012、最終回帰はTASK-015の完了条件にする。

2026-09-07にTASK-014の管理者PowerShell実行で`RISK-FS-001`と`required` GateがPASSした。TASK-015ではこのEvidenceを最終候補へ照合し、関連境界が変わった場合だけ再実行する。

## GUI-unavailable CI alternative Gate

Windows Primary CIでQtWebEngineを決定的に実行できない場合、次をすべて必須にする。

1. `RISK-BRIDGE-001`、`RISK-EXT-001`、`RISK-PATH-001`のUnit/IntegrationがPassする。
2. test専用localhost static server上で、Playwrightの`ui-shell`、`detail-panel-left-gap`、`ui-fields-reference-warning`再作成caseが`3 spec / 0 failed / 0 skipped`でPassする。Python backend/APIと外部networkは起動しない。
3. HTML/JS/CSSと相対assetの全参照が解決し、外部script、外部iframe、Web Componentが`0`であるStatic checkがPassする。同梱`dataflow.html`の内部iframeはlayout contract記載の許可例外とする。
4. `RISK-WEB-001/002`はPrimary CI上でskipしてPassにせず、Windows dedicated runnerまたはrelease環境で実行するまで`Blocked`を維持する。
5. TASK-019、TASK-012、TASK-015の完了には、各Taskの担当範囲に応じてdedicated/release環境で`RISK-WEB-001/002`がexit `0`となったEvidenceが必要である。

## Manual UI test record template

Tracked sourceのschema/checklistは次の項目を必須にする。実行recordと画像・動画は生成artifactであり、Git sourceには含めない。長期Evidenceが必要な場合はTask/Handoffへresult、artifact URI、hashだけを転記する。

```text
- test_id / risk_id / target_feature / executed_at / executor
- os_name / os_version / architecture / display / Python / PySide6 / QtWebEngine
- prerequisites
- steps[]: number / action / expected / actual / result
- evidence[]: path / sha256
- overall_result: Pass / Fail / Blocked
```

## Tracked source and generated artifact boundary

Gitで追跡するsource:

- `tests/`配下のPython/Frontend test、deterministic fixture、runner、config、manifest、lockfile、manual checklist、result schema。
- `.github/workflows/`配下のCI definition。
- 秘密情報、個人path、real cloud outputを含まないtest data。

Gitで追跡しないgenerated artifact:

- `__pycache__/`、`*.pyc`、`.pytest_cache/`、node_modules、Playwright browser cache。
- reports、results、screenshots、videos、traces、coverage、temporary server log、debug log、hang dump。
- 実行済みmanual UI recordとcapture。Task/Handoffにはartifact URIとhashだけをEvidenceとして残す。

## Definition-time feasibility

2026-08-20時点では`requirements-dev.txt`だけがtrackedで、canonical `tests/`、`tests/run-verification.ps1`、Playwright manifest/config、tracked CI workflowは存在しない。そのため上記commandはTASK-008実装前にはexit `0`で実行できない。これはVerifier failureではなく、次の不足条件として明示する。

| 不足条件 | 解消Task |
|---|---|
| canonical test source、fixture、runner、manual checklist/schema | TASK-008 |
| Playwright manifest/configとtest専用localhost server | TASK-008 |
| Windows Primary CI workflow | TASK-008 |
| frozen `uv`/`.venv` environment | TASK-009 |
| external URL allowlistのproduction適用 | TASK-019 |
| QtWebEngine security behaviorの実機確定と必要修正 | TASK-019 |

## Verification task decomposition

- 原則として1 Taskを1 Risk ID、または同じ成果物・検証codeを共有する関連少数Risk ID群に対応させる。
- automated verifierを持つTaskの完了条件は、該当行の合格基準を満たすtest codeが指定実行環境で成功することとする。
- `manual-ui`だけを検証手段とするTaskの完了条件は、事前定義した記録形式により、証跡付きで`Pass`と判定されることとする。
- TASK-008は現行Application behaviorを変更しない。現行gapの修正を必要とする`RISK-EXT-001`と、実機挙動確定後にsecurity修正を要し得る`RISK-WEB-002`はTASK-019へ割り当て、TASK-012では物理移動後の回帰だけを確認する。

## Completion state

- 暫定12 Riskを承認済み`RISK-{AREA}-{NNN}`形式へ変換した。
- 全Riskにfixture、Platform条件、copy-and-paste command、機械判定可能な合格基準、担当Task、statusを設定し、TASK-019担当の3 Riskを`Passing`へ更新した。
- TASK-009～012の各Migrationで再実行するRiskを割り当てた。
- GUIをPrimary CIで実行できない場合の代替Gateと、WebEngine release Gateを分離した。
- Test sourceとgenerated/manual evidenceのtracking境界を確定した。
