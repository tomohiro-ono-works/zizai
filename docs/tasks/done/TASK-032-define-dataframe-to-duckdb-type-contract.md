# TASK-032 Define and Fix DataFrame to DuckDB Type Conversion Contract

## Status

Completed — 2026-09-15

## Goal

ZizAI内部のConnectorが出力するpandas DataFrameをDuckDB Connectorへ渡す際の型変換Contractを確認・定義し、Contractに反する取込失敗を修正する。DataFrameの出力元によらず、同じ規則でDuckDBへ取り込める状態にする。

## Scope

- DataFrame→DuckDB型変換の現状調査。最低限、次のdtypeを対象にする。
  - pandas 3.xの`str`、`object`、`string`（StringDtype）
  - nullable dtype（`Int64`、`Float64`、`boolean`等）
  - datetime（naive／tz-aware、単位違い）
  - `category`
  - `decimal.Decimal`、bytes、list／dict（ARRAY／STRUCT相当）、全NULL列、空DataFrame
- DataFrameを出力する各Connectorの実dtypeの棚卸し。対象はCSV、Excel、DataIntegration、Python、DuckDB（`execute_sql`結果）、Selenium、Windows、Shell、Vector検索結果とする。BigQuery Connectorは実行せず、コード上のdtype生成規則だけを確認する。
- [Data Contract](../../features/data-contract.md)のType mapping（例: `STRING`は`string`）と、Connector出力の実dtypeとの差分確認。
- `execute_sql`／`execute_sql_file`の結果を、再度`create_table`へ渡すround tripの確認。
- pandas 2.xとの互換性が必要かの判断（現行pinはpandas 3.0.1）。
- 合意したContractに基づく修正と、dtype matrixの代表caseを固定するTest。

## Out of scope

- DuckDB以外の出力先（CSV／Excel書込、BigQuery）の型変換修正。
- DuckDBの非query SQL（DDL等）の戻り値（TASK-037で仕様調査する）。
- BigQuery Connectorの実行・実接続。
- DataViewerの表示Pattern（TASK-025）。

## References

- 現行Source: `apps/connectors/duckdb_connector.py`（`create_table`は`conn.register`でDataFrameを登録する）、`apps/core/base_connector.py`（`to_dataframe`、`attach_dataframe_schema`、`apply_schema_to_dataframe`）、`apps/core/type_registry.py`
- Current Specification: [Data Contract](../../features/data-contract.md)、[Connector Contract](../../features/connectors.md)、[Coding Rules](../../features/coding-rules.md)
- 依存version: `pyproject.toml`／`uv.lock`（pandas 3.0.1、duckdb 1.4.2）
- 関連Task: [TASK-015](../active/TASK-015-verify-v23-migration-completion.md)（初回releaseのblocker候補）、[TASK-036](../active/TASK-036-design-verification-harness-and-test-evidence-pipeline.md)（検証Harness）、[TASK-037](../active/TASK-037-investigate-connector-behavior-and-ui-display-spec-gaps.md)（DuckDBの非query SQLの戻り値の仕様調査）

## Approved Design

- `DuckConnector.create_table`の入力境界だけで、pandas 3の`str` dtypeをData Contractの`STRING`表現である`string`へ正規化する。他のConnector出力や共通`to_dataframe`は変更しない。
- 正規化対象列が無いDataFrameはそのままDuckDBへ渡す。対象列がある場合もshallow copyと列単位の一括castを用い、非対象列の不要なfull-memory copyとcell／row単位のPython処理を避ける。
- 全NULL `object`列は明示Contractが無いため、今回の修正ではDuckDB 1.4.2の既存推論を維持する。
- 登録失敗時は列名、dtype、登録境界を示すerrorへ改善し、元例外をcauseとして保持する。空DataFrame等の既存validation errorは変更しない。
- ARRAY／STRUCTのDuckDB SQL結果を再取込できない問題は、入力境界修正と密結合させず独立Subtaskとして扱う。結果変換で全cellへPython callbackを適用せず、dtype／column単位またはDuckDB／pandasのbulk operationで解決する。
- Decimal／categoryのDuckDB物理型変化とdatetimeの実resolution差分はEvidenceへ記録する。TASK-032では依存versionとCurrent Specificationを変更しない。Current Specification変更が必要になった場合は実装を停止してProject ownerへ確認する。

## Subtasks

### Subtask A: pandas 3 `str` input compatibility

**Edit Scope**

- `apps/connectors/duckdb_connector.py`
- DuckDB入力境界とPython→DuckDB flowのTest

**Acceptance Criteria**

- pandas 3の`str`列だけが`string`へ正規化され、既存成功dtypeと全NULL `object`列の挙動が維持される。
- 変換対象が無いDataFrameは同一objectのまま登録境界へ渡され、変換は列単位のbulk operationで行われる。
- 未対応dtypeの登録errorから列名とdtypeを特定でき、元例外を参照できる。

### Subtask B: DuckDB ARRAY／STRUCT result round trip

**Dependencies**

- Subtask Aの入力境界Contractを変更しないこと。

**Edit Scope**

- DuckDB SQL結果のschema推論に必要な最小Source
- ARRAY／STRUCTの`execute_sql`→`create_table` round trip Test

**Acceptance Criteria**

- DuckDBのARRAY／STRUCT SQL結果を再度`create_table`へ渡せる。
- 入力正規化へnested result固有処理を混在させず、全cellへのPython callbackを追加しない。

## Constraints

- 修正方法（dtypeを正規化する位置: 各Connectorの出力側／DuckDB Connectorの入力側／共通層、依存versionの変更等）は決め打ちしない。調査結果とContract案をProject ownerが確認してから決める。
- 依存versionの変更で解決する案を採る場合は、Coding Rulesの`External dependencies`に従い、Project ownerの承認を得る。
- Data Contract（Current Specification）を変更する場合は、変更案を示して承認を得る。
- 現在成功している取込（CSV読込結果、SQL結果）を壊さない。
- Test dataは一時領域に置き、`workflows/`の利用者データを使わない。
- 本不具合をTASK-015の初回releaseのBlock要因として扱うかは、Project ownerが判断する。
- DataFrameの型正規化にcell／row単位のPython loop、`applymap`、全cellへ適用するPython callbackを使用しない。列一覧の確認と列単位のvectorized／bulk変換は許容する。
- 正規化対象が無いDataFrameの無条件deep copyを追加しない。対象がある場合もpandas Copy-on-Writeを利用できるshallow copyと対象列だけのcastを優先する。

## Acceptance Criteria

- 出力元Connector × dtype × DuckDB取込結果のmatrixがEvidenceに記録されている。
- DataFrame→DuckDB型変換Contract（受け入れるdtype、正規化規則、拒否時のerror）が定義されている。Data Contractの変更が必要な場合は、その変更案が承認されている。
- Python Connectorの出力を`create_table`へ渡すflowが、CLIとDesktop UIの両方で成功する。
- dtype matrixの代表caseを固定するTestが追加され、該当するverification Gateで通過している。
- pandas 2.x互換性の要否判断が記録されている。

## Evidence

### Environment and root cause

- 検証環境: Python 3.11.9、pandas 3.0.1（`future.infer_string=True`）、duckdb 1.4.2、uv 0.12.5。
- pandas 3の既定文字列dtype `str`を`duckdb.register`へ直接渡すと、DuckDB 1.4.2が`NotImplementedException: Data type 'str' not recognized`を返す。`PythonConnector.execute_python`等の通常出力も同じ境界で失敗していた。
- pandasの明示`string`、従来の`object`文字列、nullable dtype等は既に成功しており、広い正規化は不要だった。

### Accepted input contract and implementation

- `DuckConnector.create_table`は、DataFrameの列dtypeがpandas 3固有の`str`の場合だけ、DuckDB登録前にData Contractの`STRING`表現である`string`へ列単位castする。
- 対象列が無ければ元DataFrame objectをそのまま返す。対象列がある場合は`copy(deep=False)`と対象列のvectorized `astype("string")`だけを使用し、非対象列のNumPy memoryが共有されることをTestで確認した。
- 列一覧のdtype確認以外に、cell／row単位のPython loop、`applymap`、全cell callbackは追加していない。
- 全NULL `object`列はContractに文字列化の規定がないため変更せず、DuckDB 1.4.2の既存`INTEGER`推論を維持した。
- `conn.register`失敗だけを、入力名、全列名とdtype、元errorを含む`ValueError`へ変換し、元例外を`__cause__`に保持した。空DataFrameの既存validation errorと登録後のSQL error contractは変更していない。
- ARRAY／STRUCT round tripはSubtask Bとして入力正規化から分離した。DuckDB `.df()`がARRAY cellを`numpy.ndarray`、STRUCT cellを`dict`として返す現状に対し、schema推論がこれらをgeneric `ARRAY`／`STRUCT`として扱える最小修正を行った。要素型／field型は推測せず、result DataFrameのcell変換や全cell callbackは追加していない。

### Connector output matrix

2026-09-15に、一時データと制御したfake結果だけで実dtypeを確認した。BigQueryはTaskの制約どおり実接続していない。

| Output source | Text dtype before DuckDB boundary | Before fix | After centralized fix |
| --- | --- | --- | --- |
| CSV | `string` | Success | Unchanged |
| Excel | `string` | Success | Unchanged |
| DataIntegration | `string` | Success | Unchanged |
| Python | `str` | Failure | Success |
| DuckDB `execute_sql` | `string` | Success | Unchanged |
| Selenium | `str` | Failure | Covered by the same boundary rule |
| Windows | `str` | Failure | Covered by the same boundary rule |
| Shell | `str` | Failure | Covered by the same boundary rule |
| Vector search | `string` | Success | Unchanged |
| BigQuery code path | `string` | Not executed | Unchanged |

### dtype matrix

| pandas input | DuckDB result / decision |
| --- | --- |
| pandas 3 default `str` | Before fix: rejected; after fix: `VARCHAR` |
| explicit `string`, string `object` | `VARCHAR`; existing success preserved |
| nullable `Int64`, `Float64`, `boolean` | `BIGINT`, `DOUBLE`, `BOOLEAN` |
| datetime `ms`, `us`, `ns`, tz-aware | `TIMESTAMP_MS`, `TIMESTAMP`, `TIMESTAMP_NS`, `TIMESTAMPTZ`; observed behavior only, no new Current Specification |
| `category` | Initial create is `ENUM`; SQL result DataFrame becomes string and a second create is `VARCHAR` |
| `decimal.Decimal` | Initial create is `DECIMAL`; SQL result DataFrame becomes `float64` and a second create is `DOUBLE` |
| bytes | `BLOB` |
| list / DuckDB ARRAY result | Initial and second create succeed as ARRAY; SQL result cellは`numpy.ndarray`、schemaは要素型を推測しないgeneric `ARRAY` |
| dict / DuckDB STRUCT result | Initial and second create succeed as STRUCT; SQL result cellは`dict`、schemaはgeneric `STRUCT` |
| all-NULL `object` | Existing DuckDB inference `INTEGER` preserved |
| all-NULL `string` | `VARCHAR` |
| empty DataFrame | Existing validation rejection preserved |
| unsupported `period[M]` | Rejected with boundary, column, dtype details and original DuckDB exception |

- Decimal／categoryのround trip時の物理型変化は、DuckDB `.df()`が返すpandas dtypeに由来する既存挙動であり、TASK-032では変更していない。
- datetime `ms/us/ns`とtz-awareの成功は現行versionのEvidenceであり、新しいsupported contractとしてCurrent Specificationへ追記していない。
- 500,000行のsmokeで、対象無しは同じDataFrame object、対象有りは`str`列だけ`string`となり、非対象列のmemory sharingが維持されることを確認した。Performance benchmarkへの拡張はしていない。

### Workflow and verification

- 追加Test:
  - `tests/unit/test_duckdb_connector.py`: dtype matrix、正規化／copy特性、error cause、`execute_sql`／`execute_sql_file`のARRAY／STRUCT round trip。
  - `tests/integration/test_python_duckdb_workflow.py`: `WorkflowEngine`、Windows CLI `bin\ziz.bat`、Desktop `BridgeRuntime.flow.run`によるPython→DuckDB flow。
- CLIとDesktop Bridgeは同じ`WorkflowEngine.run_flow_from_config`とConnector pathを使用することをSourceとintegration testで確認した。
- Native Desktop appの直接操作APIは当該実行環境で利用できなかったため、Task固有のDesktop確認はBridge runtime経由で行い、既存のoffscreen WebEngine smoke 2件も成功した。
- `tests/run-verification.ps1 -RiskId RISK-CONN-002`: 42 passed。
- `tests/run-verification.ps1 -Gate required`: static-analysis 134 passed、unit 146 passed、integration 49 passed。全Required Gates成功。
- `python -m pytest tests/e2e/test_webengine_smoke.py -q`: 2 passed。
- Formal pytest実行では既知の`.pytest_cache` ACL warningだけが発生し、test resultへ影響していない。ACL／ownerは変更していない。

### Compatibility and specification decision

- 現行Projectはpandas 3.0.1をexact pinしているため、pandas 2.xを追加support targetとはしない。ただし実装はpandas 3固有の`str`だけを検出し、pandas 2系で一般的な`object`／`string`にはno-opとなる。
- pandas／DuckDB／その他依存versionは変更していない。
- 既存Data Contractを変更する必要はなかった。今回の修正は、既存の`STRING`→pandas `string` mappingをDuckDB入力境界で満たす互換性修正である。

### Self-review

- 2026-09-15のcommit前reviewで、DuckDB `INTEGER[]`結果の`numpy.ndarray`を`ARRAY<STRING>`と記録していたため、実値を変換しない一方でschema metadataだけが誤った要素型を示す問題を検出した。
- Regression testを先に追加し、`ARRAY<STRING>`を返すfailureを確認後、DuckDB由来の`numpy.ndarray`はgeneric `ARRAY`として扱うよう修正した。Python `list`に対する既存推論は変更していない。
- ARRAY／STRUCTの実cellをData Contractのcanonicalな`list`／`dict`へ変換する処理と、generic container schemaをBigQueryへ転送する互換性は確認していない。いずれもDuckDBへの再取込には不要であり、BigQuery実行とnested result conversionはTASK-032のOut of scopeとして残す。

## Remaining Work

- Project owner review。実装、TASK固有Test、Required Gatesに残作業はない。
- TASK-015で本不具合を初回release blockerとしてどう扱うかは、TASK-032のScope外でありProject owner判断のまま残す。
- DuckDB SQL結果のARRAY cellは`numpy.ndarray`のままであり、canonicalな`object(list)`へのresult変換、nested要素／field型の精密なschema保持、generic container schemaのBigQuery互換性は別Taskで仕様判断が必要。
- `BaseConnector.attach_dataframe_schema`／`apply_schema_to_dataframe`がSQL結果DataFrameをcopyする既存共通処理は変更していない。DuckDB入力境界の正規化では不要なdeep copyを除去済みだが、result schema適用自体のmemory最適化は別Taskの責務とする。
