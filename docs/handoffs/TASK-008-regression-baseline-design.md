# TASK-008 Migration Regression Baseline Design

- Related task: [TASK-008](../tasks/active/TASK-008-establish-migration-regression-baseline.md)
- Date: 2026-08-21
- Status: Implemented — read-only review complete; TASK-008 Blocked by baseline gaps
- Contract: [v23 Migration Verification Contract](v23-migration-verification-contract.md)

## Goal

Repository移行前の現行挙動を、決定的に再実行できるTest ProgramとWindows Primary CIで保護する。LocalとCIは同じrunnerを使用し、Application behaviorは変更しない。

## Non-goals

- Application code、保存schema、Bridge Protocol、Connector contractの変更。
- 202607 WIP、旧test suite、壊れたUI分析toolの一括復元。
- 外部service、実資格情報、実browser process、対話GUIを通常Gateの必須条件にすること。
- `RISK-EXT-001`と`RISK-WEB-002`のproduction gap修正。これらはTASK-012が担当する。

## Existing-state findings

- `tests/`には1,021 files、約34 MBが存在するが、大半は`node_modules`、`.pyc`、result、UI analysis output等のgenerated/history residueである。
- 現行treeにcanonical pytest source、Playwright manifest/config/spec、`tests/run-verification.ps1`は存在しない。
- `requirements-dev.txt`は追跡済みで、現行`.env`はPython 3.11.9、pytest 9.0.2、PySide6 6.11.0を利用できる。
- `.gitignore`の`tests/`がTest source全体を、`*.ps1`がrunnerを、`workflows/`が`.github/workflows/`まで除外している。
- 現行の`.github/workflows/playwright.yml`は未追跡のLinux workflowで、Windows Primary CI contractと一致しない。
- 現行のPlaywright category runner、capture script、`tests/ui_analysis/ui_analysis.ps1`、`tests/preview.html`はcanonical baselineへ使用しない。

## Architecture

### Canonical entrypoint

Repository rootから実行する`tests/run-verification.ps1`だけを外部入口とする。

- `-Gate static-analysis|unit|integration|e2e|manual-ui|required`
- `-RiskId RISK-{AREA}-{NNN}`
- `-EvidencePath <path>`はmanual UI record検証時だけ使用する。

runnerは環境前提を確認し、Gate/Riskに対応するpytest、Playwright、manual record validatorを起動し、結果を集約する。Task-009はrunner内部のPython起動を`uv run --frozen`へ変更できるが、外部commandは維持する。

### Test ownership

| Area | Responsibility |
|---|---|
| `tests/static/` | source tracking、entrypoint、import、asset/config path、旧参照の静的検査 |
| `tests/unit/` | path/config/security/Bridge/FSのpure behavior |
| `tests/integration/` | 正式CLI subprocess、connector discovery/local execution、Bridge signal/message contract |
| `tests/e2e/` | Windows QtWebEngine/QWebChannel smoke |
| `tests/playwright/` | test専用localhost server上のbrowser-only Frontend regression |
| `tests/fixtures/` | Risk Contractで固定したdeterministic fixtureとtracked-source manifest |
| `tests/manual/` | Windows UI checklist、record schema、record validator |

各testはRisk ID markerまたはmanifest mappingを持ち、同じassertionを複数Gateへ複製しない。全関数catalogは追跡せず、調査時だけ機械生成する。恒久的な索引はRisk ID、test path、test名、1行の検証内容に限定する。

## Gate flow and result contract

`required`は`static-analysis`、`unit`、`integration`を順に実行する。失敗後に後続Gateを実行せず、最初のfailure contextを保持して終了する。

| Exit code | Meaning |
|---|---|
| `0` | 指定Gate/Riskの全assertionがPassし、required testの未収集・skipが0 |
| `1` | assertion/collection failure、required skip、source/tracking違反 |
| `2` | dependency、display、symlink capability、fixture等の必須前提不足によるBlocked |

`RISK-EXT-001`と`RISK-WEB-002`はfixtureとrunner slotだけを作成する。TASK-008で明示実行された場合はPassへ読み替えずexit `2`とし、`required`には含めない。

## Risk implementation map

| Risk | TASK-008 implementation |
|---|---|
| `RISK-ENTRY-001` | entrypoint static check、help/error/headless subprocess、minimal/invalid flow fixture |
| `RISK-PATH-001` | repository layout fixtureとpath resolver unit/integration |
| `RISK-CONN-001` | 12 module/class inventoryとconstructor/executeなしのdynamic discovery |
| `RISK-CONN-002` | 承認済み4 historical filesの11 caseを選択移植し、現行contractで再検証 |
| `RISK-CONFIG-001` | valid/invalid/missing security policyとsuggest-index validation |
| `RISK-BRIDGE-001` | Protocol 1.0 envelope、31 Command、8 Event、error mapping、signal contract |
| `RISK-FS-001` | regular operation、traversal、outside、symlink target/componentのunit/Bridge境界 |
| `RISK-WEB-001` | Windows WebEngine smokeとbrowser-only代替3 spec |
| `RISK-UI-001` | checklist、JSON Schema、record validator |
| `RISK-CI-001` | source manifest、artifact混入検査、Windows workflow、clean runner実行 |

## Historical-test reuse

Git history `2e6ab92`はTest sourceの候補としてだけ読む。

- CSV、Dataintegration、Excel、schemaの4 files/11 casesはhistorical bodyとassertionを確認し、現行import/APIへ最小移植する。
- Folder picker、coordinate capture、workspace delete/path escape/symlinkの6 reusable casesは、unit層の直接例外とBridge層の`E_ACCESS_DENIED`を分けて現行contractへ書き直す。
- `ui-shell`、`detail-panel-left-gap`、`ui-fields-reference-warning`の3 specsは、旧fixture/selectorを盲目的にコピーせず、現行DOM/Bridge stubで再作成する。
- Existing-hidden-ref picker、旧document-save、`connector_factory`/`DummyConnector`依存case、旧native smokeは統合しない。
- Historical assertionを通すためにproduction codeを変更しない。

## Source and artifact boundary

`.gitignore`は次の責務で更新する。

- blanket `tests/` ignoreを外し、canonical Test sourceを追跡可能にする。
- `workflows/`をroot限定`/workflows/`へ変更し、`.github/workflows/`を追跡可能にする。
- `tests/run-verification.ps1`を追跡できるよう、Test source用PowerShellの例外を追加する。
- `node_modules`、`.pyc`、cache、report/result、coverage、screenshot/video/trace、manual実行recordを明示除外する。
- 旧Playwright scripts、UI analysis、generated `tests/preview.html`、旧`.github/workflows/playwright.yml`は削除・上書きせず、path単位で明示ignoreし、canonical source manifestから除外してlocal historyとして保持する。

## CI design

新しい`.github/workflows/migration-verification.yml`をcanonical workflowとし、Windows runnerからLocalと同じ`tests/run-verification.ps1`を呼ぶ。

- Required jobs: `static-analysis`、`unit`、`integration`。
- Browser-only job: test専用localhost static serverとPlaywright 3 specs。Python backend/API、外部network、実資格情報は使用しない。
- QtWebEngine job: Windows dedicated/release環境で`RISK-WEB-001`を実行する。Primary CIで実行不能な場合もskipでPassにしない。
- Manual UIはCI外とし、release前にtracked schemaでrecordを検証する。

旧未追跡`playwright.yml`は上書きせず、canonical workflowとして扱わない。

## Error handling

- required testの0件collection、skip、platform不足は成功扱いにしない。
- dependency不足はassertion failureと区別してexit `2`にする。
- subprocess failureはcommand、exit code、対象Riskを表示し、秘密情報やfixture全内容をlogへ出さない。
- symlink作成不能は`RISK-FS-001`をBlockedにする。2026-08-21 User Decisionにより実環境実行はTASK-015まで延期し、ユーザーが管理者PowerShellから当該Riskだけを実行する。
- manual recordはschema一致だけでなく、全case`Pass`、evidence path、SHA-256の非空を検証する。

## Implementation and review policy

- implementationはRisk単位のTDDで進め、failing test/runner checkを確認してから最小実装を加える。
- Application codeは変更しない。現行behaviorがApproved Contractと競合する場合はTASK-008をBlockedとして報告する。
- 各sliceのLocal Gate成功後に次のsliceへ進む。
- Task完了前にClaude Codeをplan mode、`Read/Glob/Grep`のみで1回reviewし、Codexが各指摘を一次情報で採否判定する。
- Completion時は全Gate、tracking manifest、artifact除外、git diff scopeをfreshに検証する。

## Rule compliance

- 変更範囲は`tests/`、`.github/workflows/`、Test runner/config、`.gitignore`、TASK-008 documentationに限定する。
- 旧資産、未追跡personal file、Application codeを削除・上書きしない。
- 外部serviceや実OS操作caseは通常Gateへ含めない。
- 長いraw source inventoryは会話へ貼らず、機械索引から必要symbolだけ読む。

## Implementation evidence

- canonical Test source 54件を`tests/fixtures/contracts/tracked-test-sources.json`へ固定し、Git indexと完全一致させた。
- `static-analysis` 30件、`integration` 18件、WebEngine 1件、Playwright 3件、manual UI validatorの正常系がPassした。
- runner self-test 7件がPassし、unknown Gate=`1`、deferred Risk／manual evidence不足=`2`、required skip=`1`、required順序を確認した。
- Claude Code read-only reviewのCI interpreter指摘を採用し、subprocess test 3 filesを`.env`固定から`sys.executable`継承へ変更した。修正後の関連15 testsはPassした。
- `RISK-CONFIG-001`はnon-http(s) 2件が現行Application gapとしてFailし、`RISK-FS-001`はlocal symlink privilege不足でBlockedした。Application codeは変更していない。
- `RISK-FS-001`はTASK-015までBlockedを維持し、Codexへ管理者権限を付与せずユーザー実行とすることを2026-08-21に承認した。
- `RISK-EXT-001`と`RISK-WEB-002`はApproved DecisionどおりTASK-012までBlockedを維持した。
