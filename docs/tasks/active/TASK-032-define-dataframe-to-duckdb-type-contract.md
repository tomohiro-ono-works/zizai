# TASK-032 Define and Fix DataFrame to DuckDB Type Conversion Contract

## Status

Not Started — 推奨実装順序 1/7（TASK-032 → TASK-033 → TASK-034 Subtask A → TASK-036 → TASK-028 → TASK-034 Subtask B → TASK-035）。Python Connector等の出力をDuckDBへ渡すflowが失敗する不具合を含む。

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
- 関連Task: [TASK-015](TASK-015-verify-v23-migration-completion.md)（初回releaseのblocker候補）、[TASK-036](TASK-036-design-verification-harness-and-test-evidence-pipeline.md)（検証Harness）、[TASK-037](TASK-037-investigate-connector-behavior-and-ui-display-spec-gaps.md)（DuckDBの非query SQLの戻り値の仕様調査）

## Constraints

- 修正方法（dtypeを正規化する位置: 各Connectorの出力側／DuckDB Connectorの入力側／共通層、依存versionの変更等）は決め打ちしない。調査結果とContract案をProject ownerが確認してから決める。
- 依存versionの変更で解決する案を採る場合は、Coding Rulesの`External dependencies`に従い、Project ownerの承認を得る。
- Data Contract（Current Specification）を変更する場合は、変更案を示して承認を得る。
- 現在成功している取込（CSV読込結果、SQL結果）を壊さない。
- Test dataは一時領域に置き、`workflows/`の利用者データを使わない。
- 本不具合をTASK-015の初回releaseのBlock要因として扱うかは、Project ownerが判断する。

## Acceptance Criteria

- 出力元Connector × dtype × DuckDB取込結果のmatrixがEvidenceに記録されている。
- DataFrame→DuckDB型変換Contract（受け入れるdtype、正規化規則、拒否時のerror）が定義されている。Data Contractの変更が必要な場合は、その変更案が承認されている。
- Python Connectorの出力を`create_table`へ渡すflowが、CLIとDesktop UIの両方で成功する。
- dtype matrixの代表caseを固定するTestが追加され、該当するverification Gateで通過している。
- pandas 2.x互換性の要否判断が記録されている。

## Evidence

2026-09-14の非BigQuery検証（一時scriptによる確認。scriptはrepositoryに含めていない）。

- 環境: Python 3.11.9、pandas 3.0.1（`future.infer_string`は`True`）、duckdb 1.4.2。
- `DuckConnector.create_table`の結果:
  - `CSVConnector.read_csv`の出力（dtype `string`）: 成功
  - `DuckConnector.execute_sql`の結果（dtype `string`）: 成功
  - `object` dtypeへ変換したDataFrame: 成功
  - pandas 3の既定で構築したDataFrame（文字列列が`str`）: 失敗
  - `PythonConnector.execute_python`の出力（`name`列が`str`）: 失敗
  - 失敗時のerror: `NotImplementedException: Not implemented Error: Data type 'str' not recognized`。`duckdb.register`単体でも同じerrorになる。
- CLI再現: `PythonConnector.execute_python` → `DuckConnector.create_db_file` → `DuckConnector.create_table`の一時flowを`bin\ziz.bat`でheadless実行すると、exit code 1になり、logに`[s3] エラー発生: Not implemented Error: Data type 'str' not recognized`が出る。

## Remaining Work

- 着手時に、上記matrixを出力元Connector単位で再取得し、実dtypeの全体像を確定する。
- Contract案（正規化の位置と規則）を作成し、Project ownerの確認を得る。
