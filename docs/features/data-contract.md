# Data and Flow Contract

- Status: Current Specification
- Last verified: 2026-08-21

## Flow file

- 正式extensionは`.zizd`である。
- Top levelは`metadata`、`variables`、`steps`、`flows`を使用する。
- `metadata.mode`は`dataflow`、開始変数は`variables.start`、Connector入力は`steps[].params`、DAGは`flows.edges`へ保存する。
- Repository移行で保存schemaを暗黙変換しない。Breaking changeは専用Decision、versioning、migration、回帰Testを必要とする。

## Schema item

Schemaの最小項目は次の4つである。

```json
{
  "origin_name": "source column",
  "new_name": "output column",
  "description": "meaning",
  "ziz_datatype": "STRING"
}
```

- `ziz_datatype`を型の正本とし、`pandas_type`と`bigquery_type`は派生値とする。
- 利用者指定schemaは推論より優先する。
- `new_name`指定時は出力列名、`description`は外部schemaが対応する場合の説明へ利用する。
- DataFrameは`attrs["ziz_schema"]`へ解決済みschemaを保持できる。

## Type mapping

| `ziz_datatype` | Pandas representation | BigQuery type |
|---|---|---|
| `INT64` | `Int64` | `INT64` |
| `FLOAT64` | `float64` | `FLOAT64` |
| `NUMERIC` | `decimal.Decimal` | `NUMERIC` |
| `STRING` | `string` | `STRING` |
| `BYTES` | `object(bytes)` | `BYTES` |
| `DATE` | `datetime64[ns]` | `DATE` |
| `DATETIME` | `datetime64[ns]` | `DATETIME` |
| `TIMESTAMP` | `datetime64[ns, UTC]` | `TIMESTAMP` |
| `TIME` | `object(datetime.time)` | `TIME` |
| `INTERVAL` | `timedelta64[ns]` | `INTERVAL` |
| `BOOL` | `boolean` | `BOOL` |
| `ARRAY<T>` | `object(list)` | `ARRAY<T>` |
| `STRUCT<name:T>` | `object(dict)` | `STRUCT<name T>` |

`DATE`、`DATETIME`、`TIMESTAMP`はPandas表現が近くても意味を区別する。先頭zeroを持つ数字文字列は`STRING`を維持する。Containerの要素型が不明な場合は破壊的に推測しない。

## Execution report

Workflow reportは`flow_path`、`flow_name`、`workflow_path`、`workflow_name`、`status`、`steps`、`error`、`cancelled`を持つ。各step reportは少なくとも`step_id`、`connector`、`action`、`params`、`output_variable`、`status`、`result`、`error`を扱う。

Report/Bridge payloadの可変fieldを固定化しすぎず、共通Envelopeと利用者が依存するfieldをTestで保護する。
