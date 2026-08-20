# TASK-011 Relocate Application Python Responsibilities

## Status

Blocked — TASK-008, TASK-009, TASK-010

## Goal

現在の単一Desktop Runtimeを維持したまま、Python側のDesktop、CLI、Core、Connector責務を`apps/`直下の各境界へ分離配置する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- TASK-008～010の成果

## Scope

現行`app/gui/host.py`・`bridge.py`等のDesktop固有処理を`apps/desktop/`、内部CLI実装を`apps/cli/`、`core/`を`apps/core/`、実在する`connectors/`を`apps/connectors/`へ移す。`zizai.py`と`bin/ziz.bat`は正式CLI互換entrypointとして維持し、imports、dynamic loading、launcher、package entrypointを同時更新する。BridgeのPython側contractは`apps/common/contracts/bridge/`へ分離する。

## Out of scope

`static/`移動、HTTP API新設、Bridge Protocol変更、WIP復元、dead code削除。Frontend移行はTASK-012で行う。

## Dependencies

TASK-001、TASK-008、TASK-009、TASK-010。TASK-001はCompletedであり、単一Desktop Runtime経路がActivated済みである。

## Expected change area

- `apps/desktop/`
- `apps/cli/`
- `apps/core/`
- `apps/connectors/`
- `apps/common/contracts/bridge/`
- `zizai.py`
- `bin/ziz.bat`
- `pyproject.toml`
- `README.md`
- launcher/script参照

## Acceptance criteria

- 正式CLIの`bin/ziz.bat`と`zizai.py`からGUI／headlessが起動し、`python -m app.main`は公開互換対象になっていない。
- Qt、QtWebEngine、QWebChannel、Host／Bridge実装は`apps/desktop/`へ限定される。
- `apps/core/`はQt、Frontend、具体Connectorへ依存しない。
- headless `.zizd`実行結果がBaselineと一致する。
- 全実在connectorが`apps/connectors/`からdynamic discoveryされ、`core`が定義するInterfaceに従う。
- Bridge Protocol v1.0のCommand／Response／Event、Error、相関IDが維持される。
- UIは移行中のroot `static/`から正常に読み込まれる。
- MOVE前に旧`app/`、`core/`、`connectors/`へのCode／Runtime／Test／CIおよびactive/canonical documentationの有効参照が0になる。
- Target Treeに`app/gui/`、`apps/web/`、`apps/api/`を作成しない。
- Legacy import互換shimは明示的に承認された場合だけ追加する。

## Test plan

- `static-analysis`: dependency方向、旧imports／entrypointsの有効参照0、Target Tree確認。
- `unit`: path解決、package import、Bridge envelope／error mapping。
- `integration`: 正式CLI、workflow engine、connector discovery、Bridge message contract。
- `e2e`: Windows上のCLI help、headless sample、Desktop起動。
- `manual-ui`: Desktop起動・終了の目視確認。CIはStatic～Integrationを必須実行する。

## Migration risk

High — 起動点、Python imports、動的ロードを同時に変更するため。

## Rollback

Conditional — TASK-012以降がMergeされた後は依存変更も戻す必要がある。

## Parallelizable

No — Entry pointとPython module境界を一括で変更する。

## Recommended branch

`migration/desktop-runtime`

## Worktree

Optional

## Reason for task boundary

Launcher、imports、Python責務境界、dynamic connector loadingは同時に変更しないと起動不能になるため、同じApplication Python Migration Outcomeへ統合する。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- TASK-001のApproved Target Treeに合わせ、旧`apps/desktop`一括集約案を責務別配置へ改訂した。

## Evidence

- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`
- TASK-008、TASK-009、TASK-010が未完の依存条件として定義されている。

## Remaining

- TASK-008～010完了後、Approved Target TreeへPython sourceとentrypointを移行する。

## Exact next action

TASK-008～010のEvidenceを確認後、正式CLI互換を維持した責務別MOVEを実施する。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、旧`apps/desktop`一括集約案へ戻していないこと。
