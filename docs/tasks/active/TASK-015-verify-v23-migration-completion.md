# TASK-015 Verify v23 Migration Completion

## Status

In Progress — WP-AUTO完了、WP-EXEC待ち

## Goal

Migration全体が承認済みArchitecture、Repository構造、runtime behavior、verification要件を満たすことを独立Evidenceで判定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- 全Decision、Task、Feature、Test/CI結果
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`

## Scope

Target tree、例外、imports、entrypoints、config、toolchain、Docs、Harness、Tests、CI、legacy references、runtimeを横断検証する。`.gitignore`は対象folder、pattern、例外ruleを全体レビューし、Sourceとgenerated/local stateの境界を確認する。

## Out of scope

検出した不具合の便乗修正。失敗時は該当Taskへ戻すか修正Taskを作る。課金が発生し得るBigQuery実接続／実queryはTASK-027へ分離し、本Taskでは実行しない。

## Dependencies

TASK-001～014、TASK-016～019、およびv23 Migration Investigationから初回release条件として追加されたTask。初回release後へ延期したProduct enhancement／investigation／別実装／運用Task（TASK-020～TASK-026）は含めない。TASK-027は本Task完了後に費用条件を別承認して行うBigQuery実接続検証であり、本Taskの依存条件ではない。RISK-FS-001はTASK-014の管理者PowerShell実行でPASS済みとし、release candidateで当該境界に変更があった場合だけ再実行する。

## Expected change area

- `docs/handoffs/v23-migration-final-verification.md`
- 各TaskのEvidence/Status

## Acceptance criteria

- 承認済みTarget Treeまたは明記されたArchitecture Exceptionと一致する。
- CLI、headless、Desktop、UI、connector、configが期待どおり動作する。BigQuery Connectorはcontract／mock／非課金の静的確認までとし、実接続は本基準に含めない。
- cleanなuv環境で全Test/CIがPASSする。
- 旧PathにCode/Runtime/Test/CIの参照がない。
- Active / canonical documentationにおける旧Pathへの有効参照が0である。
- Sourceとgenerated/local stateが正しく分離されている。
- `.gitignore`の対象folder、pattern、例外ruleが全件確認され、追跡すべきSourceを隠すbulk ignore、意図しない未追跡資産の露出、未承認のtracked-ignore例外が0である。
- 承認済み7 Frontend libraryがProject owner決定spaceですべて使用され、同一UI責務のApplication実装が0である。現行Applicationに対応機能がない`zizai-sqlflow-designer`はProject owner判断により対象外とする。
- external URL入力はFrontend/backendの両方で`http(s)`だけを許可し、Desktop同梱UIの内部`file://` Runtimeと混同していない。
- 初期リリース候補で安全な代表dataflow／workflowを各1件以上実行し、STARTからENDまでの進行、step状態、結果表示、完了／失敗通知、実行logが実際の結果と一致する。
- 初期releaseをBlockする未解決事項、失敗、未完了Taskが0である。初期release後へ明示的に延期したTASK-020～TASK-027は含めない。
- 独立レビュー結果がPASSである。

Documentation referenceは次の基準で判定する。

- FAIL: README、AGENTS、canonical docs、現行runbook、setup/test手順などで、旧Pathを現在有効な参照先または実行先として使用しているもの。
- PASS対象: `docs/handoffs/`、`docs/decisions/`、migration audit、Disposition等で、旧Pathをhistorical evidenceとして記録しているもの。
- historical文書でも、旧Pathを現行の参照先または実行先として指示している場合はFAILとする。

## Test plan

- `unit` / `integration`: 全suite。
- `e2e` / `manual-ui`: Windows Desktop/UI Runtime Gate。
- `workflow execution`: Project ownerが指定する安全な既存dataflow／workflowをWindows Desktopから実行し、処理結果とUI／logを照合する。未実行、無反応、二重実行、途中停止、結果不一致はFAILとする。
- `BigQuery`: 実資格情報、実query、課金対象dataへの接続は行わない。専用のTASK-027で費用上限と対象を承認後にだけ実施する。
- `static-analysis`: tree/import/path/reference scan、および`test_frontend_library_vendor_contract.py`、`test_frontend_asset_contract.py`、`test_task012_frontend_boundary_contract.py`によるFrontend library traceability。
- `.gitignore` review: ruleごとの所有責務確認、代表pathへの`git check-ignore -v --no-index`、`git ls-files -ci --exclude-standard`によるtracked-ignore検出。
- clean environment lock verification。
- CI full run。
- 独立Architecture/Task Evidence review。

## Migration risk

Medium — 変更はEvidence中心だが、広い範囲を最終判定するため。

## Rollback

Yes — Verification Evidenceのみ。

## Parallelizable

Partially — Status／Evidence、参照先、依存Graphは独立に並行監査できる。最終合否判定とWP-EXECは直列で行う。

## Recommended branch

`migration/final-verification`

## Worktree

Not required

## Reason for task boundary

Migration実装とは分離された最終合否判定であり、全Task共通のIntegration Acceptance Criteriaを一度だけ検証する。

## Final verification plan

End State: 初期リリース候補が、編集・保存だけでなく代表dataflow／workflowをWindows Desktop上で最後まで実行でき、UI状態・出力・logが同じ実行結果を示す。

Goal Traceability:
- 全TaskのStatus／Evidence整合 → WP-AUDIT。
- Target Tree、旧Path、Frontend library、security contract → WP-STATIC。
- Source／generated境界とignore rule → WP-IGNORE。
- clean uv環境の全自動Test／CI相当Gate → WP-AUTO。
- 実ワークフローのリリース前実行確認 → WP-EXEC。
- Migration全体の最終合否 → WP-EXECのEvidenceを含む本Taskの最終判定。

Critical Path: `全依存Task完了 → WP-AUDIT → {WP-STATIC + WP-IGNORE} → WP-AUTO → release candidate固定 → WP-EXEC → TASK-015最終判定 → 初期release`。

Parallel Work: WP-STATICとWP-IGNOREは並行可能。WP-AUTOは両監査結果を固定後、WP-EXECはrelease candidate固定後に実施する。

Task Graph Changes: TASK-016のWorkflowDesigner実行確認を拡張せず、初期release直前のTASK-015へWP-EXECとして追加する。

Deferred Decisions:
- 実行する安全なdataflow／workflow、必要なtest data／credentialはProject ownerがWP-EXEC開始前に指定する。外部systemを更新するactionは使用しない。
- BigQuery実接続はTASK-027へ分離済み。Project ownerが費用上限、対象Project／Dataset、queryを承認するまで実行しない。

Work Package: WP-AUDIT Task Status／Evidence preflight

Owner: Codex

Assignment Reason: Task間の統合判断と最終分類はCodexが所有し、独立した読取監査だけをTerra、Luna、Claude Reviewへ分割できるため。

Task: active／done配置、Status、Evidence、Remaining、Exact next action、採用済みTask graph、参照先を照合し、文書欠陥・証跡不足・実作業未完を分離する。

Dependencies:
- TASK-014とTASK-016が完了している。

Read Scope:
- `AGENTS.md`、`docs/tasks/active/`、`docs/tasks/done/`、`docs/handoffs/TASK-017-migration-goal-backward-audit.md`、直接参照するFeature／Decision／Verification Contract。

Edit Scope:
- 本Task、明白な陳腐化を持つTask文書、`docs/handoffs/v23-migration-final-verification.md`。Applicationコード、Testコード、資産は変更しない。

Acceptance Criteria:
- Task ID重複／欠番、active／done配置不整合、初期release依存の未分類、PASS不能なAcceptance、現行参照先の不存在が0件になる。
- 検出事項が文書欠陥・証跡不足・実作業未完へ分類される。

Constraints:
- branch切替、資産移動／削除、Applicationコード変更、commit、push、test再実行を行わない。

Tests:
- Task header／section機械走査、Markdown link存在確認、TASK-017 §11との依存照合、独立読取review。

Codex Verification:
- Terra／Luna／Claudeの指摘を一次文書へ再照合し、採用した修正と残存リスクをFinal Verification Evidenceへ記録する。

Work Package: WP-STATIC Repository／contract static verification

Owner: Codex

Assignment Reason: 初期release全体の合否判定を伴うためCodexが所有し、tree／reference inventoryの読取監査だけをTerraへ切り出せるため。

Task: Target Tree、entrypoint、imports、旧Path、canonical documentation、Frontend library 7件、external URL boundary、BigQuery非課金contractを静的に検証する。

Dependencies:
- WP-AUDIT完了。

Read Scope:
- `AGENTS.md`、`docs/features/`、`docs/decisions/`、本Task、`tests/static/`、`tests/fixtures/contracts/`、production tree。

Edit Scope:
- `docs/handoffs/v23-migration-final-verification.md`と本TaskのEvidenceだけ。

Acceptance Criteria:
- 承認済みTarget Treeとの差異、旧Pathの有効参照、7 libraryの未利用／重複責務、security contract不整合が0件である。
- BigQuery実接続／実queryを行わず、contract／mock／static確認だけである。

Constraints:
- Application／Testコード、資産、branch、commit、pushを変更しない。検出した不具合を便乗修正しない。

Tests:
- canonical `static-analysis` Gate、targeted Frontend contract Test、`rg`／`git ls-files`による参照照合。

Codex Verification:
- Terraのinventoryを一次ファイルとcanonical Gate結果へ再照合する。

Work Package: WP-IGNORE Source／generated ignore review

Owner: Codex

Assignment Reason: ignore ruleの所有責務と変更要否はProject ownerとの判断を要するためCodexが所有し、rule inventoryと代表path評価だけをLunaへ切り出せるため。

Task: repository内のignore file、rule、例外、tracked-ignore、代表Source／artifact pathを確認し、bulk ignore、Source隠蔽、未承認露出を判定する。

Dependencies:
- WP-AUDIT完了。

Read Scope:
- `.gitignore`、nested ignore file、`docs/features/refactor-policy.md`、layout fixture、`git check-ignore`／`git ls-files`結果。

Edit Scope:
- `docs/handoffs/v23-migration-final-verification.md`と本TaskのEvidenceだけ。.gitignore自体は本Packageで変更しない。

Acceptance Criteria:
- 全ruleの対象と所有責務が説明でき、tracked-ignore、追跡すべきSourceを隠すbulk ignore、意図しない未追跡資産露出が0件、または具体的FAILとして記録される。

Constraints:
- ignore file、Source、artifactを変更／削除しない。個人local pathの内容を列挙しない。

Tests:
- `git check-ignore -v --no-index`、`git ls-files -ci --exclude-standard`、nested ignore inventory。

Codex Verification:
- Lunaの分類をRefactor Policyと代表pathの実コマンドへ再照合する。

Work Package: WP-AUTO Automated release candidate gate

Owner: Codex

Assignment Reason: 複数Gateの統合判定、失敗時の責務Task切分け、環境Blockedと製品不具合の分類が必要なため。

Task: lock整合を確認し、canonical runnerのrequired／e2eとFrontend Playwright全suiteをfreshに実行する。

Dependencies:
- WP-STATICとWP-IGNOREの結果が固定されている。

Read Scope:
- `pyproject.toml`、`uv.lock`、`package.json`、`tests/`、CI設定、既存Evidence。

Edit Scope:
- 生成されるignored Test artifactと`docs/handoffs/v23-migration-final-verification.md`、本TaskのEvidenceだけ。

Acceptance Criteria:
- static-analysis、unit、integration、Python e2e、Frontend Playwrightがfailed／skipped／blocked 0でPASSする。
- lockから再現したPython環境を使用し、外部service、実資格情報、BigQuery実queryへ接続しない。

Constraints:
- Test失敗を本Packageで修正しない。環境Blockedと製品／Test不具合を分離し、責務Taskを記録する。

Tests:
- `tests/run-verification.ps1`のrequired／e2e Gate、Playwright full suite、lock verification。

Codex Verification:
- command、exit code、件数、warning、artifact pathをEvidenceへ記録し、失敗があれば再実行前に原因を分類する。

Work Package: WP-EXEC Release workflow execution gate

Owner: Codex

Assignment Reason: 初期releaseの最終Acceptance判定とProject ownerのWindows手動確認を統合し、失敗時の責務Taskを切り分けるため。

Task: 固定済みrelease candidateで安全な代表dataflow／workflowを各1件以上実行し、STARTからENDまでの進行、step状態、結果表示、完了／失敗通知、実行logを照合する。

Dependencies:
- 全release依存Taskが完了し、release candidateが固定されている。
- Project ownerが安全なtest flow／data／credentialを指定している。

Read Scope:
- `AGENTS.md`、`docs/features/`、本Task、対象flow、実行log、既存execution Test。

Edit Scope:
- `docs/handoffs/v23-migration-final-verification.md`と各TaskのEvidence／Statusだけ。製品不具合を検出した場合は責務Taskへ戻し、本Packageで便乗修正しない。

Acceptance Criteria:
- dataflow／workflowが各1件以上、単一操作で1回だけ開始し、最後まで完了する。
- UIの実行中／成功／失敗状態、result area、実行logが同じrun IDと結果を示す。
- 無反応、二重実行、途中停止、表示とlogの不一致が0件である。

Constraints:
- 本番dataや外部systemを更新するactionを使わない。未実施をPASS扱いにしない。BigQuery実接続／実queryを含むflowは選ばない。

Tests:
- Windows Desktop manual execution、既存execution unit／integration／E2E、run log照合。

Codex Verification:
- 実行flow、時刻、run ID、結果、UI観測、log保存先をEvidenceへ記録し、Project owner確認と照合する。

Work Package: WP-EXEC-FIX Workflow toolbar tooltip containment

Owner: Codex

Assignment Reason: WP-EXEC中にProject ownerが検出した限定的なlibrary UI不具合で、原因・期待挙動・検証範囲が確定しているため。

Task: WorkflowDesigner toolbarのWebEngine標準`title` tooltipをlibrary所有のtooltipへ置換し、右端の実行buttonでも表示枠内へ収めて繰り返し表示できるようにする。

Dependencies:
- Project ownerが2026-09-08に、見切れないtooltipへの変更方針を承認している。

Read Scope:
- `AGENTS.md`、`docs/features/frontend-libraries.md`、本Task、WorkflowDesigner vendor source、関連Playwright Test。

Edit Scope:
- `docs/features/frontend-libraries.md`、本Task、`docs/handoffs/v23-migration-final-verification.md`、WorkflowDesigner vendor source、関連Playwright Test。

Acceptance Criteria:
- toolbarの実行button tooltipがdesigner枠内へ表示され、hover／focusを繰り返しても再表示される。
- native `title`へ依存せず、既存`aria-label`、button command、Application実行処理を維持する。

Constraints:
- Bridge、`.zizd`、実行command／payload、Application Adapterの責務を変更しない。

Tests:
- tooltipの存在、枠内bounds、hover／focus再表示、既存WorkflowDesigner Playwright回帰。

Codex Verification:
- TestのRED／GREEN、変更source、実行command不変、diff checkを独立確認する。

Work Package: WP-WHEEL-INPUT WorkflowDesigner wheel viewport controls

Owner: Codex

Implementation: Terra

Assignment Reason: Solが承認済み仕様を設計済みであり、Adapter／Bridge／CSS／保存schemaに触れない局所的な入力処理と回帰TestをTerraが実装する。最終統合判断はCodexが保持する。

Task: 通常wheelを縦pan、Shift+wheelを横pan、Ctrlを含むwheelをポインタ中心zoomとして実装し、toolbar zoomを維持する。

Dependencies:
- Project owner approval and Sol design.

Read Scope:
- `AGENTS.md`、`docs/features/frontend-libraries.md`、本Task、`apps/gui/vendor/zizai-workflow-designer/src/designer_commands.js`、`apps/gui/vendor/zizai-workflow-designer/src/workflow_designer.js`、`tests/playwright/specs/workflow-designer-baseline.spec.js`。

Edit Scope:
- `docs/features/frontend-libraries.md`、本Task、上記split source／bundle、対象Playwright spec。

Acceptance Criteria:
- 通常wheelはzoomを変えず縦viewport位置だけを変更する。
- Shift+wheelはzoomを変えず横viewport位置だけを変更する。
- Ctrl+wheelおよびCtrl+Shift+wheelはポインタ中心zoomを維持する。
- toolbar zoom、Adapter、Bridge、CSS、保存schemaは変更しない。

Constraints:
- branch切替、commit、push、外部clone／downloadを行わない。既存dirty差分（tooltip／annotationを含む）を落とさない。

Tests:
- targeted Playwright、`node --check`、可能ならFrontend vendor static contract。

Codex Verification:
- RED/GREENの対象結果、split sourceとbundle同期、変更scope、未解決のvendor直接patchリスクを確認する。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- WP-AUDITで全27 Taskの配置、Status、Evidence、Remaining、Exact next action、採用済みTask graphを照合した。実作業の未完は検出せず、後続決定の反映漏れを文書欠陥として補正した。
- WP-STATIC／WP-IGNOREで検出した未追跡Source、承認済み削除のindex残り、過剰なignore ruleをProject owner判断どおり解消し、初期release候補をGit indexへ再現可能な状態で固定した。
- WP-AUTOでcanonical `required`／`e2e` Gateを再実行し、全自動検証をPASSした。
- WP-EXEC-FIXでWorkflowDesigner toolbarのnative tooltip見切れをlibrary内部tooltipへ置換した。Application実行処理、Bridge、`.zizd`は変更していない。Windows実画面の再確認はWP-EXECへ残す。
- WP-WHEEL-INPUTでWorkflowDesignerのwheel viewport操作を実装し、targeted Playwright、JavaScript構文、vendor static contractの自動検証を完了した。Windows実画面での操作確認はWP-EXECへ残す。

## Evidence

- TASK-001～014、TASK-016～019と追加Taskが依存条件として定義されている。
- TASK-020～TASK-026は初回release後のProduct enhancement／investigation／別実装／運用Task、TASK-027は本Task完了後の有償BigQuery実接続検証であり、本Taskの依存条件から明示的に除外されている。
- Project owner判断により、課金が発生し得るBigQuery実接続テストをTASK-027へ分離した。TASK-015ではBigQuery Connectorのcontract／mock／静的確認だけを扱う。
- WP-AUDITの統合結果は`docs/handoffs/v23-migration-final-verification.md`へ保存した。
- `uv lock --check --offline`はexit 0（165 packages）。canonical `static-analysis`は既知のpytest既定Temp権限不整合をWorktree内の新規ignored `--basetemp`へ切り替え、`113 passed, 155 deselected`でPASSした。
- WP-STATIC／WP-IGNOREで、working treeの実装内容ではなくGit未確定状態を検出した。必須Source 22件が未追跡、削除済み2件がtracked-ignore、旧Canvas 4件がHEAD／index上では追跡中だった。
- Project ownerが、Task成果物21件をGit対象にし、正本仕様・Task・専用Testがない未追跡`nlp_connector.py`とinventory登録を初期releaseから除外する方針を承認した。
- Project ownerが、`.gitignore`の`scripts/`と`*.ps1` bulk ruleを廃止し、`*.ipynb`を維持し、bulk ruleに伴う無効な例外を削除する方針を承認した。
- 承認内容を適用して全現行差分をstagingした。未追跡file 0、tracked-ignore 0、旧Canvas index残り0、`git diff --cached --check`違反0を確認した。`nlp_connector.py`とinventory登録は初期release候補に存在しない。
- staging後にcanonical source manifestが新規Test 4件を未掲載として正しくFAILしたため、`tracked-test-sources.json`へ4件を追加し、対象manifest Test `3 passed`を確認した。
- 管理者PowerShellでcanonical `required` Gateを実行し、static-analysis `113 passed`、unit `98 passed`、integration `46 passed`。symlink security Testを含め失敗・skip 0、既知のPandas deprecated warning 6件のみだった。詳細logは`.tmp/task015-required-admin.log`（SHA-256 `F7EB88D0AFC694AF4FB32CBC1AD6FB756CF9F5F2BFB84BE2619AFF1A7DCECAE4`）。
- canonical `e2e` GateはPython `4 passed`、Playwright `137 passed`。詳細logは`.tmp/task015-e2e.log`（SHA-256 `F842CEF990E9DB0A9908A9362856EF583DE8E384B475CD47C8FF4B8A1B6331B1`）。BigQuery実資格情報・実query・課金を伴う接続は使用していない。
- WP-EXEC-FIXの再現Testはnative `title`依存でRED、library内部tooltipへの置換後GREEN。WorkflowDesigner Adapter／baseline `44 passed`、vendor static `50 passed`、変更JavaScript構文、diff checkがPASSした。
- WP-WHEEL-INPUTで、現worktreeの`src/designer_commands.js`と実行bundle `src/workflow_designer.js`へ同じwheel入力分岐を同期した。対象PlaywrightはRED後GREEN（16 passed）、`node --check` 2件、vendor static contractは50 passedだった。

## Remaining

- Windows実画面でworkflow実行buttonのtooltipが枠内へ毎回表示されることを再確認する。
- Windows実画面で通常wheelの縦pan、Shift+wheelの横pan、Ctrl+wheelのzoom、toolbar `+`／`-` zoomをProject ownerが確認する。
- 代表dataflow／workflowの実行確認を再実施する。

## Exact next action

修正済みApplicationを再起動し、Project ownerがworkflow実行button tooltipの枠内表示・再表示、通常wheelの縦pan、Shift+wheelの横pan、Ctrl+wheelのzoom、toolbar `+`／`-` zoom、および代表dataflow／workflowの完走を確認する。

## Termination condition

全Acceptance criteriaがPASSしてEvidenceが保存されるか、FAIL内容と責務Taskが記録されて終了すること。
