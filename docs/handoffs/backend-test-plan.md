# Backend Test Plan Handoff

- Source: `.docs/areas/backend-tests.md`
- Migrated by: TASK-006
- Date: 2026-08-21
- Status: Handoff — implementation scope not independently approved

## Canonical relationship

Migrationに必要なverification contractは[v23 Migration Verification Contract](v23-migration-verification-contract.md)、test/CI実装はTASK-008を正とする。旧planの`backend_tests/`と100 offline connector/action caseは実装・実行されておらず、TASK-008の最小baselineへ自動追加しない。

## Retained test principles

- Connector actionは、代表success、代表failure、重要boundaryを直接Testする。
- Local CSV/Excel/DuckDB等はtemporary directoryとreal local libraryを使用できる。
- BigQuery、embedding model、browser driver、Chrome process、mouse/keyboard、clipboard、long waitは通常Testで実行せず、controlled fakeまたは専用Runtime Gateへ分離する。
- `WindowsConnector.loop_tasks`はWorkflowEngineのspecial pathを通して検証する。
- Test dataは`tmp_path`またはRepository外temporary directoryへ置き、Product code/configをTest都合で変更しない。
- Offline Gateはexternal service、real credential、real browser/desktop interactionへ依存しない。

## Integrated subset

TASK-003で現行contractに対してgreen確認されたCSV、Excel、Dataintegration、schemaの4 file/11 caseをTASK-008へ引き継ぐ。Connector discovery、config、Bridge、filesystem、Frontend/RuntimeはVerification ContractのRisk ID単位で実装する。

## External live execution boundary

外部serviceや実OS操作を行うcaseは、caseごとに実行直前の承認を必要とする。承認時は対象service、destination/account、送信data、side effect/cost、単一command、cleanup、期待結果を具体化する。1 caseの承認を他caseへ流用しない。

## Deferred decision

旧planの全action網羅scopeを再利用する場合は、TASK-008のbaseline完成後に、現行Connector inventoryと重複を照合して専用Taskを承認する。旧countや旧file layoutをそのまま復元しない。
