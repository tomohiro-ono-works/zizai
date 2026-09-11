# TASK-012 Relocate the Embedded Web UI to apps/gui

## Status

Completed

## Goal

QWebChannelによる既存UI動作を保ったまま、同梱Frontendを責務境界`apps/gui/`へ移す。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- TASK-011 Desktop Runtime
- TASK-019 External URL Scheme Boundary

## Scope

現行`static/`一式とJavaScript側Bridge Adapterを`apps/gui/`へ移し、`apps/desktop/`のHostが`file://`で読み込むPath、HTML/CSS/JS、asset、config参照を更新する。Bridge Contractは`apps/common/contracts/bridge/`、同梱内部Frame Contractは`apps/common/contracts/web-frame/`へ分離する。

## Out of scope

HTTP API、Web独立配信、外部Web埋め込み、外部配信JavaScript、UI再設計、dead asset削除、Bridge Protocol breaking change、external URL scheme／navigation behaviorの新規修正（TASK-019）。

## Dependencies

TASK-001、TASK-011、TASK-019。TASK-001はCompletedであり、Embedded local UI経路がActivated済みである。TASK-019でsecurity behaviorを先に確定し、本Taskでは物理MOVE後の回帰だけを扱う。

## Expected change area

- `apps/gui/`
- `apps/desktop/`のHost／Bridge path設定
- `apps/common/contracts/bridge/`
- `apps/common/contracts/web-frame/`
- 共通config参照

## Acceptance criteria

- 3画面が`apps/gui/`から`file://`で読み込まれる。
- QWebChannel接続とProtocol v1.0の31 Command、8 Event、Response／Error形式、相関IDが維持される。
- 相対asset、modal、icon、vendor参照がすべて解決する。
- 同梱`dataflow.html`の内部`iframe`は許可し、`window.postMessage`／`CustomEvent` ContractをQWebChannel Contractと分離する。
- TASK-019で確立したexternal URLのFrontend/backend二重検証とOS browser委譲が、物理MOVE後も維持される。
- 外部Page／iframe／Web Component／CDN JavaScriptを内蔵WebViewへ読み込まない。
- MOVE前にroot `static/`へのCode／Runtime／Test／CIおよびactive/canonical documentationの有効参照が0になる。
- Target Treeに`apps/desktop/static/`、`app/gui/`、`apps/web/`を残さない。
- Windows WebEngine smoke、Bridge Integration、Frontend Regressionと必要なmanual-ui GateがPASSする。

## Test plan

- `static-analysis`: asset link、root `static/`の有効参照0、外部script／埋め込み禁止確認。
- `integration`: Bridge message round-trip、内部Frame Contract、TASK-019の外部URL Allowlist／scheme拒否／OS browser委譲の回帰。
- `e2e`: Windows WebEngineによるhome/dataflow/settings、file:// asset、navigation/security smoke。Browser-only Frontend testはtest時だけlocalhost static serverを許可する。
- `manual-ui`: native dialog、window操作、主観的表示を証跡付きで確認する。CIはStatic～Integrationを必須実行し、安定したE2Eは専用Gateにする。

## Implementation Work Packages（Approved 2026-08-24）

End State: Desktopが`apps/gui/`のhome／dataflow／settingsを`file://`で読み込み、99件の既存Frontend資産、QWebChannel Protocol `1.0`、内部Frame通信、external URL security boundary、利用者から見えるUI動作が維持され、root `static/`の有効参照と実体が0である。

Goal Traceability:
- 3画面と全local assetの読込 -> WP-1、WP-2、WP-3
- QWebChannel 31 Command／8 EventとResponse／Error／相関維持 -> WP-1、WP-2、WP-3
- internal iframeの`postMessage`／`CustomEvent`分離contract -> WP-1、WP-2、WP-3
- TASK-019 external URL二重検証とOS browser委譲維持 -> WP-2、WP-3
- root `static/`有効参照0とTarget Tree -> WP-1、WP-2、WP-3

Critical Path: WP-1 Goal-state RED -> WP-2 atomic Frontend MOVE and GREEN -> WP-3 independent verification and manual closeout

Parallel Work: 本Task内はなし。TASK-013は`static/`、`apps/gui/`、Frontend共通参照を変更しない場合だけ別Worktreeで並行可能だが、本Worktreeでは直列実行する。

Task Graph Changes: なし。TASK-012完了後にTASK-016が着手可能になる。

Deferred Decisions: なし。内部Frame contractは既存通信を変更せず`apps/common/contracts/web-frame/protocol-v1.json`へ記録する。

### WP-1 Goal-state Frontend boundary contract

- `Owner`: `claude-assist`
- `Assignment Reason`: 移動先、旧path廃止、3画面、内部Frame通信、不変条件が確定しており、Productionを変更せずGoal-state TestのREDまでRepository内で完結できる。
- `Task`: `apps/gui/`配置、root `static/`不在、3 entry、local asset解決、Host entry path、内部Frame contract正本化を観測するGoal fixtureとstatic/integration Testを追加し、未移設だけを理由とするREDを確認する。
- `Dependencies`: 承認済み本計画、TASK-011 commit `1f85aa6`、完了済みTASK-019。
- `Read Scope`: `AGENTS.md`、本Task、`docs/features/{architecture,coding-rules,refactor-policy,frontend}.md`、`docs/decisions/ADR-v23-application-topology.md`、`docs/tasks/done/TASK-019-enforce-external-url-scheme-boundary.md`、`zizai.py`、`apps/desktop/`、`apps/common/contracts/`、`static/`、関連する`tests/{static,integration,e2e,playwright,fixtures}/`。
- `Edit Scope`: `tests/fixtures/task012/`、`tests/static/test_task012_frontend_boundary_contract.py`、`tests/integration/test_task012_web_frame_contract.py`。
- `Acceptance Criteria`: 新TestがTarget Tree、3 entry、99 asset、内部Frame contract、旧path不在を個別に表し、Production未移設だけを理由にFAILする。collection、syntax、environment errorは0。
- `Constraints`: Production、既存Test、既存asset、Protocol、UI behaviorを変更しない。root `static/`を削除・移動しない。commit、push、branch操作を行わない。
- `Tests`: 新規2 Test fileを直接実行し、期待REDを確認する。
- `Codex Verification`: 変更が3許可path内だけであること、各failureが移設前状態を正しく検出していることを同じTest commandで確認する。

### WP-2 Atomic Frontend MOVE

- `Owner`: `claude-assist`
- `Assignment Reason`: 物理移動、consumer path、fixture、Browser server、現行文書の更新範囲が特定でき、WP-1 REDを基準に調査・実装・対象Testまで一括実行できる。
- `Task`: root `static/`の99 assetを内容変更なしで`apps/gui/`へ原子的にMOVEし、正式entrypoint、Desktop Host、repository layout、asset resolver、Playwright static server、Test/CI、Current Specificationを新pathへ更新する。既存内部Frame通信を`apps/common/contracts/web-frame/protocol-v1.json`へ記録する。
- `Dependencies`: CodexがWP-1期待REDを確認済みであること。
- `Read Scope`: WP-1 Read Scope、`README.md`、`docs/handoffs/v23-migration-verification-contract.md`、`docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`、TASK-012関連`tests/`。
- `Edit Scope`: `static/`、`apps/gui/`、`apps/common/contracts/web-frame/`、`zizai.py`、必要な場合だけ`apps/desktop/host.py`、`README.md`、`docs/features/{architecture,coding-rules,frontend}.md`、`docs/handoffs/v23-migration-verification-contract.md`、`docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`、TASK-012関連`tests/{static,integration,e2e,unit,playwright,fixtures}/`と`tests/run-verification.ps1`。2026-08-25に旧Frontend root参照が判明した`tests/unit/test_bridge_contract.py`を明示追加した。
- `Acceptance Criteria`: WP-1 TestがGREEN。3画面と全local assetが`apps/gui/`から読み込まれ、QWebChannel、内部Frame通信、external URL拒否／OS browser委譲が維持される。root `static/`、`apps/desktop/static/`、`apps/web/`の実体と有効参照が0。
- `Constraints`: Asset内容、UI layout、Frontend behavior、Bridge Protocol、external URL policyを変更しない。dead asset削除、Frontend library導入、minify、format、責務分割を行わない。commit、push、branch操作を行わない。
- `Tests`: WP-1 focused、`RISK-ENTRY-001`、`RISK-CONFIG-001`、`RISK-BRIDGE-001`、`RISK-EXT-001`、`RISK-WEB-001`、`RISK-WEB-002`、`RISK-CI-001`。
- `Codex Verification`: 実行前後status、asset MOVE対応と内容差分、旧path有効参照0、Target Tree、focused TestとAcceptanceに直結するRisk gateだけを独立確認する。

### WP-3 Independent verification and closeout

- `Owner`: `Codex`
- `Assignment Reason`: Claude変更の帰属確認、Task間整合、最小限の独立検証、Project ownerの手動UI確認、Task状態更新はCodexが担当する。
- `Task`: WP-2差分をAcceptance criteriaへ対応付け、旧path audit、必要Risk gate、Desktop manual-uiを統合判定してTaskをcloseする。
- `Dependencies`: WP-2完了、Edit Scope外変更0、未解決事項0。
- `Read Scope`: 本Task、WP差分、Current Specification、移動後Frontend／Host／Contract、関連Test/fixture。
- `Edit Scope`: 本Taskと、実装結果により状態更新が必要なCurrent Specification／Evidenceだけ。Product defectはWP-2へ戻し、Scopeを黙って拡張しない。
- `Acceptance Criteria`: 全Task acceptanceがEvidence付きでPASSし、Project ownerがhome／dataflow／settings、native dialog、終了を確認し、未解決事項0。
- `Constraints`: 既知`RISK-FS-001`を本TaskのPass/Failへ読み替えない。全Test suiteを無条件に重複実行しない。commit、push、Worktree削除は別途承認まで行わない。
- `Tests`: WP-1 focused、WP-2が実行したGateのうちAcceptanceに直結する最小集合、`git diff --check`、旧path audit、manual-ui。
- `Codex Verification`: Claude reportをそのまま採用せず、変更Scope、代表asset、3 entry、Bridge response、security回帰、manual結果を一次確認する。

## Migration risk

High — file URL、relative assets、QWebChannelが強く結合しているため。

## Rollback

Yes — 後続Cleanup前であれば単独で戻せる。

## Parallelizable

Conditional — TASK-013が`static`や共通参照を変更しない場合のみ、別Worktreeで可能。

## Recommended branch

`migration/embedded-ui`

## Worktree

Required

## Reason for task boundary

UI asset relocationはDesktop Python移動後も独立して延期・Rollback・Runtime検証でき、QWebChannel固有Contextを分離する利益がある。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- TASK-001のApproved Target Treeに合わせ、移行先を`apps/desktop/static/`から`apps/gui/`へ改訂した。
- TASK-017のTask graph監査により、behavior修正をTASK-019へ分離し、本TaskをRollback可能な挙動維持MOVEへ限定した。
- Project ownerが3 Work Package、WP-1／WP-2のClaude優先担当、`apps/common/contracts/web-frame/protocol-v1.json`、挙動維持MOVEを承認した。
- WP-1でTarget Tree、3 entry、99 asset、Host entry path、local asset解決、内部Frame contractを表すGoal fixtureとstatic/integration Testを追加した。
- CodexがWP-1 focused Testを実行し、Production未移設だけを理由とする期待RED（10 failed、collection／syntax／environment error 0）を確認した。
- Claude SonnetでWP-2を開始したが、2026-08-24のsession上限到達によりProduction変更前で停止した。部分MOVEとEdit Scope外変更は発生していない。
- WP-2再開後、99 assetのMOVEと主要consumer更新を完了した。Project ownerは、Gateで判明した`tests/unit/test_bridge_contract.py`の旧Frontend root参照1件をWP-2 Edit Scopeへ追加することを承認した。
- WP-2で`static/`の99 assetを内容変更なしで`apps/gui/`へ移し、正式entrypoint、repository layout、Playwright server／spec、関連Test、Current Specificationを新pathへ更新した。
- 既存内部Frame通信を`apps/common/contracts/web-frame/protocol-v1.json`へ正本化し、追跡manifestへWP-1 Test／fixtureと合わせて登録した。
- Codexが全99 assetのGit blob hashをMOVE前後で照合し、不一致0を確認した。Current Specificationの旧pathは`docs/features/refactor-policy.md`を新pathへ更新し、残りは履歴・移行条件・negative assertion・CSS値であることを分類した。
- Claudeの既定temp権限errorをWorktree専用`--basetemp`で切り分け、Codexがfocused、CONFIG、BRIDGE、EXT、CIの未完Gateを独立再実行した。
- Project ownerがhome／dataflow／settings、フォルダ選択dialog、window終了を手動確認し、2026-08-25に正常完了を確認した。
- commit承認後の実Git indexで`RISK-CI-001`を再実行し、24 passedでcanonical tracked-source集合の一致を確認した。

## Evidence

- `docs/decisions/ADR-v23-application-topology.md`
- `docs/handoffs/v23-application-boundary-evidence.md`
- TASK-011 commit `1f85aa6`と完了済みTASK-019により、全依存条件が成立した。
- `tests/fixtures/task012/frontend-boundary-goal.json`
- `tests/static/test_task012_frontend_boundary_contract.py`
- `tests/integration/test_task012_web_frame_contract.py`
- `.venv\Scripts\python.exe -m pytest tests/static/test_task012_frontend_boundary_contract.py tests/integration/test_task012_web_frame_contract.py -q` -> 10 failed（期待RED、2026-08-24）
- WP-2停止時のWorktree差分は本Task文書とWP-1の新規fixture／Test 3件だけであり、`git diff --check`はexit `0`。
- WP-2 focused Test -> 10 passed
- 99 asset Git blob hash照合 -> 99 checked／0 mismatches
- Claude実行: `RISK-ENTRY-001` -> 16 passed、`RISK-WEB-001` -> pytest 5 passed／Playwright 4 passed、`RISK-WEB-002` -> 1 passed
- Codex専用`--basetemp`再実行: focused 10 passed、`RISK-CONFIG-001` 41 passed、`RISK-BRIDGE-001` 28 passed、`RISK-EXT-001` 20 passed
- Codex最小独立確認: 3画面WebEngine＋Bridge round-trip 1 passed、追跡manifest構文／generated artifact除外 2 passed
- Desktop manual-ui -> Project ownerが3画面、native folder dialog、終了を確認（2026-08-25）
- `RISK-CI-001` -> 更新後の実Git indexで24 passed／154 deselected（2026-08-25）

## Remaining

- なし。既知の`RISK-FS-001`はTASK-015の担当範囲として維持する。

## Exact next action

Task graphの次nodeであるTASK-016の実装計画承認を確認する。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、外部Web／JavaScriptをBridge到達可能なContextへ導入していないこと。
