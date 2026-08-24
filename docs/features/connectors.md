# Connector Contract

- Status: Current Specification
- Last verified: 2026-08-24

## Common boundary

- Connectorの外部入口は`execute(action, params, context)`である。
- 未知actionと必須parameter不足は、黙ってfallbackせず明示errorにする。
- 表dataは原則`pandas.DataFrame`、schemaは[Data Contract](data-contract.md)に従う。
- 個別Connectorは外部I/O、action parameter、出力先固有serializationを担当する。
- CoreはConnectorの具体実装へ静的依存せず、WorkflowEngineのdynamic discovery contractを維持する。
- Package move時は期待module/classの一意解決をbehavior testで確認し、現行import文字列そのものを固定しない。

## Current inventory

現行inventoryは、`BaseConnector`を除く12 module/class pairである。正確な一覧とMigration verifierは[Verification Contract](../handoffs/v23-migration-verification-contract.md)を参照する。

## Local data connectors

- CSV/Excel読込でschema未指定なら推論し、指定時は`origin_name`/`new_name`に対応する列を採用する。
- `ziz_datatype`に従って型を解決し、rename後もschema metadataを維持する。
- BigQuery出力は明示schema、DataFrameの`ziz_schema`、推論の順に解決する。
- DATE/DATETIME/TIMESTAMP/TIME/NUMERIC等は出力先固有serializerで処理する。

## Browser connectors

### ChromeConnector

- 正式actionは`open_in_chrome`である。
- URLは`apps.core.security_policies.is_web_target_allowed()`で検証し、許可外URLではprocessを起動しない。
- ChromeへURLを非同期に渡し、DOM操作、session管理、redirect完了待ちは行わない。

### SeleniumConnector

- 正式actionは`navigate`、`dom_action`、`dom_get`、`wait`、`screenshot`である。
- `navigate`は遷移前後のURLをAllowlistで検証する。
- DOM操作・取得・待機・captureは同一runtime sessionを使用し、`source_step_id`で先行stepのsessionを参照できる。
- 認証情報、cookie/session永続化、Data整形、永続Data保存は責務外である。
- External/browser実行は通常Testへ含めず、controlled fakeまたは明示承認された専用Runtime Testで確認する。

## Known follow-up boundaries

- action命名、validation、side-effect resultの共通化は未完であり、既存挙動を壊さない専用Taskで段階的に行う。
- ARRAY/STRUCT、UI宣言とbackend action、browser securityはTASK-008以降のVerification対象とする。
- `WindowsConnector.loop_tasks`はUI上のWindows actionだが、実行責務はWorkflowEngineのspecial pathにある。
