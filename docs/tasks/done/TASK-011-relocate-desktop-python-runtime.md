# TASK-011 Relocate Application Python Responsibilities

## Status

Completed

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

現行`app/gui/host.py`・`bridge.py`等のDesktop固有処理を`apps/desktop/`、内部CLI実装を`apps/cli/`、`core/`を`apps/core/`、実在する`connectors/`を`apps/connectors/`へ移す。`zizai.py`と`bin/ziz.bat`は正式CLI互換entrypointとして維持し、imports、dynamic loading、launcher、package entrypointを同時更新する。言語中立なBridge JSON contractは`apps/common/contracts/bridge/protocol-v1.json`へ分離する。

## Out of scope

`static/`移動、HTTP API新設、Bridge Protocol変更、WIP復元、dead code削除。Frontend移行はTASK-012で行う。

## Dependencies

TASK-001、TASK-008、TASK-009、TASK-010。TASK-010の完了はTASK-005、TASK-018、TASK-019およびconfig互換Decisionの完了を含む。TASK-001はCompletedであり、単一Desktop Runtime経路がActivated済みである。

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

## Implementation Work Packages（Approved 2026-08-24）

End State: 正式entrypointを維持したままPython責務が`apps/{desktop,cli,core,connectors}`へ分離され、Bridge contractは`apps/common/contracts/bridge/`を正本とし、旧`app/`・`core/`・`connectors/`の有効参照と実体が0である。

Goal Traceability:
- 正式CLI・headless互換 -> WP-1、WP-2、WP-3
- Desktop/CLI/Core/Connector責務Tree -> WP-1、WP-2
- CoreがQt・Frontend・具体Connectorへ静的依存しない境界 -> WP-1、WP-2、WP-3
- 12 Connectorの一意なdynamic discovery -> WP-1、WP-2、WP-3
- Bridge Protocol `1.0`の31 Command/8 Event・error・相関維持 -> WP-1、WP-2、WP-3
- root `static/`からのUI読込維持 -> WP-2、WP-3
- 旧path有効参照0とTarget Tree -> WP-1、WP-2、WP-3

Critical Path: WP-1 Goal-state Test -> WP-2 atomic Python responsibility MOVE -> WP-3 independent review/integration closeout

Parallel Work: なし。entrypoint、imports、dynamic discovery、package実体は同じ切替で変更する。

Task Graph Changes: なし。TASK-011完了後にTASK-012とTASK-013が並行着手可能になる。

Deferred Decisions: なし。旧import shimは作らず、`BaseConnector`はCore定義Interfaceとして`apps/core/base_connector.py`へ配置する。

### WP-1 Goal-state responsibility contract

- `Owner`: `claude-assist`
- `Assignment Reason`: 期待するTarget Tree、import境界、entrypoint、contract配置が確定しており、Test/fixtureだけの独立したTDD REDをRepository内で作成できる。
- `Task`: TASK-011完了状態を先に表すstatic/integration Testとgoal fixtureを追加し、Production codeを変えず期待REDを確認する。
- `Dependencies`: 承認済み本計画、TASK-010完了commit `630d8aa`。
- `Read Scope`: `AGENTS.md`、本Task、`docs/features/{architecture,coding-rules,refactor-policy,connectors}.md`、`docs/decisions/ADR-v23-application-topology.md`、`zizai.py`、`app/`、`core/`、`connectors/`、`tests/{static,integration,fixtures}/`のentry/path/connector/bridge contract関連file。
- `Edit Scope`: `tests/static/test_task011_python_boundary_contract.py`、`tests/integration/test_task011_import_contract.py`、`tests/fixtures/task011/python-responsibility-goal.json`、`tests/fixtures/contracts/tracked-test-sources.json`。
- `Acceptance Criteria`: 新配置、旧package不在、`BaseConnector`のCore配置、依存方向、正式entrypoint、Bridge contract正本配置を個別assertionで表し、未実装だけを理由にREDとなる。環境・collection errorは0。
- `Constraints`: Production code、既存Testの意味、Source資産、既存Protocol値を変更しない。branch切替、commit、pushを行わない。
- `Tests`: 新規2 Test fileを直接実行し、期待REDと既存Risk gateへの不要な回帰がないことを確認する。
- `Codex Verification`: diff範囲、assertionのGoal対応、RED理由を一次確認し、同じTestを再実行する。

### WP-2 Atomic Python responsibility MOVE

- `Owner`: `claude-assist`
- `Assignment Reason`: 全移動先・依存方向・互換条件・禁止事項が明確で、まとまったpackage relocation、import更新、Test更新を1つのRepository作業として完結できる。
- `Task`: `app/gui/{host,bridge}.py`を`apps/desktop/`、`app/main.py`を`apps/cli/`、`core/`を`apps/core/`、12具体Connectorを`apps/connectors/`へ原子的にMOVEする。`connectors/base_connector.py`は`apps/core/base_connector.py`へ移し、Bridge contractを`apps/common/contracts/bridge/protocol-v1.json`へ正本化する。全consumer、dynamic discovery、root resolver、Test/fixture、現行文書参照を同時更新する。
- `Dependencies`: WP-1の期待REDをCodexが確認済みであること。
- `Read Scope`: WP-1 Read Scope、`bin/`、`pyproject.toml`、`README.md`、`apps/common/`、`tests/`の全TASK-011影響Test、`docs/features/`、`docs/tasks/active/TASK-012～016`。
- `Edit Scope`: `apps/{desktop,cli,core,connectors,common/contracts/bridge}/`、移動元`app/`・`core/`・`connectors/`、`zizai.py`、TASK-011影響下の`tests/`とfixture、`README.md`、`docs/features/{architecture,connectors}.md`、旧Python pathを現行実行先として参照する`docs/tasks/active/TASK-012～016`。`bin/`と`pyproject.toml`は参照確認のみとし、必要性が判明した場合はScopeを自動拡張せずCodexへ返す。
- `Acceptance Criteria`: Goal-state TestがGREEN。正式CLI、headless sample、12 Connector discovery、Bridge 31/8、config/path、WebEngineが移動後packageで動作し、root `static/`・Source/Runtime data内容が不変。旧3 packageと有効参照が0。
- `Constraints`: Protocol/保存schema/Connector入口/公開CLI挙動を変更しない。HTTP API、`apps/web`・`apps/api`・`app/gui`、旧import shim、`static/`移動、dead code整理、Frontend library導入を行わない。Source/Runtime/User dataを削除・変換しない。branch切替、commit、pushを行わない。
- `Tests`: Focused Goal-state Test、Python compile/import、`RISK-ENTRY-001`、`RISK-PATH-001`、`RISK-CONN-001`、`RISK-CONN-002`、`RISK-CONFIG-001`、`RISK-BRIDGE-001`、`RISK-EXT-001`、`RISK-WEB-001`、`RISK-WEB-002`、`RISK-CI-001`。
- `Codex Verification`: 実行前後status、MOVE対応、dependency direction、旧参照0、data hash、Protocol/inventory集合、focused Testと主要Risk gateを独立確認する。

### WP-3 Independent review, integration verification, and closeout

- `Owner`: `Codex`
- `Assignment Reason`: Claude実装の独立検証、仕様との統合判断、手動Runtime確認、Task状態更新はCodexが担当する。
- `Task`: Claude Opusを読み取り専用`claude-review`として1回利用し、指摘を一次情報で分類する。全Acceptance criteria、canonical gate、Desktop手動確認を統合判定してEvidenceとTask状態を更新する。
- `Dependencies`: WP-2完了、Edit Scope外変更0、未解決事項0。
- `Read Scope`: 本Task、全WP差分、正本/ADR、移動対象package、関連Test/fixture、検証contract。
- `Edit Scope`: 本Taskと、実装結果により状態更新が必要なEvidence/正本文書だけ。Product defectはWP-2へ戻し、実装Scopeを黙って拡張しない。
- `Acceptance Criteria`: 全Task acceptanceと対象Risk gateがTask定義どおりPASSし、手動Desktop起動・終了Evidenceが有効で、旧参照・未解決事項が0。
- `Constraints`: `RISK-FS-001`のTASK-015までの既知Blockedを本TaskのFail/Passへ読み替えない。branch切替、commit、push、worktree削除を行わない。
- `Tests`: WP-2の全canonical Risk、manual-ui validator、`git diff --check`、旧path static audit、worktree status確認。
- `Codex Verification`: Claude指摘を`採用/不採用/判断不能`へ分類し、freshな検証出力とAcceptance criteriaの対応を確認して完了可否を判断する。

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
- Project ownerが3 Work Package、`BaseConnector`のCore配置、旧import shimなし、Claude担当とOpus Review Gateを承認した。
- WP-1でTarget Tree、依存境界、正式entrypoint、言語中立なBridge JSON contractを表すgoal fixtureとstatic/integration Testを追加した。
- CodexがWP-1 focused Testを再実行し、未移設だけを理由とする期待RED（17 failed、collection/environment error 0）を確認した。
- WP-2でPython責務とBridge JSON contractを`apps/`配下へ移し、production/test import、dynamic discovery、repository root resolver、現行仕様・READMEを新pathへ更新した。
- Claudeは機械的MOVEと一部import更新を担当した。利用上限到達後はCodexが同じ承認Scope内の残りを引き継ぎ、列挙外で移動された`core/テスト.ipynb`を元位置へ復元した。
- WP-2 focused Testと主要4境界（ENTRY、PATH、CONN-001、CONN-002）をGREENにした。
- Claude Opusの読み取り専用reviewを実施し、阻害事項なしと判定した。採用した指摘はREADME path、Desktop保存先root、repository root検証、submodule import、12 Connector inventory、CI契約、旧pathの`.pyc`拒否であり、package化とdead code整理は現Scope外として不採用にした。
- Review反映後のfocused Testを34 passedにし、canonical Risk gateを実行した。
- 旧`app/`・`connectors/`の生成cacheと空directory、`core/__pycache__`を除去し、root `core/テスト.ipynb`は維持した。
- CodexによるDesktop自動起動・トップ画面表示・終了確認に加え、Project ownerがフォルダ選択と設定画面を手動操作し、2026-08-24に正常完了を確認した。
- commit承認後の実Git indexで`RISK-CI-001`を再実行し、24 passedでcanonical tracked-source集合の一致を確認した。

## Evidence

- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`
- TASK-008の検証基盤、TASK-009、TASK-010は完了し、TASK-010 commit `630d8aa`で本Taskの前提が成立した。
- `tests/fixtures/task011/python-responsibility-goal.json`
- `tests/static/test_task011_python_boundary_contract.py`
- `tests/integration/test_task011_import_contract.py`
- `.venv\Scripts\python.exe -m pytest tests/static/test_task011_python_boundary_contract.py tests/integration/test_task011_import_contract.py -q` -> 17 failed（期待RED、2026-08-24）
- 同focused Test -> 21 passed（MOVE後GREEN、2026-08-24）
- Review反映後focused Test -> 34 passed（2026-08-24）
- Unit/Integration（既知`RISK-FS-001`除外） -> 99 passed、7 deselected
- `RISK-ENTRY-001` -> 16 passed、`RISK-PATH-001` -> 24 passed
- `RISK-CONN-001` -> 3 passed、`RISK-CONN-002` -> 13 passed
- `RISK-CONFIG-001` -> 41 passed、`RISK-BRIDGE-001` -> 28 passed、`RISK-EXT-001` -> 20 passed
- `RISK-WEB-001` -> pytest 5 passed／Playwright 4 passed、`RISK-WEB-002` -> 1 passed
- `RISK-CI-001` -> stage前は23 passed／1 failed、stage後の実Git indexでは24 passed（2026-08-24）。唯一のstage前failureはcanonical tracked-source集合が旧indexのままだったことによる。
- Desktop自動確認 -> 起動、現在Worktreeの最近のProject・Template 2件表示、終了を確認
- Desktop手動確認 -> Project ownerがフォルダ選択、設定画面、終了を確認（2026-08-24）

## Remaining

- なし。既知の`RISK-FS-001`はTASK-015の担当範囲として維持する。

## Exact next action

Task graphの次nodeであるTASK-012またはTASK-013へ進む。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、旧`apps/desktop`一括集約案へ戻していないこと。
