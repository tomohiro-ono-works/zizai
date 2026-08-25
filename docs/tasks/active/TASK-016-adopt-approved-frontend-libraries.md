# TASK-016 Adopt All Approved Frontend Libraries

## Status

Ready — 実装計画の承認待ち

## Goal

`tomohiro-ono-works`配下の承認済み8 Frontend libraryをすべてlocal同梱し、既存画面をspace単位で段階移行して、Application側の重複UI責務を削除する。

## End State

8 libraryが取得元commitとLICENSE付きで`apps/gui/vendor/`へlocal同梱され、Project ownerが各移行時に決定したspaceで使用される。Bridge、config、保存、実行、navigation、OS操作はApplication Adapterへ残り、同じUI責務のApplication実装は0である。

## Goal Traceability

- 8 libraryの再現可能な同梱 → WP-2
- Project owner決定spaceでの利用 → WP-3～WP-10
- Application Adapter責務とDocument単一正本 → WP-3～WP-10
- 重複UI 0、全Gate、配布Evidence → WP-11

## Critical Path

`TASK-018 → TASK-019 → TASK-010 → TASK-011 → TASK-012 → WP-2 → WP-4 + WP-8 → WP-9 → WP-11 → TASK-014 → TASK-015`。

## Parallel Work

WP-2完了後、Project ownerのspace決定とlibrary間依存を満たすWP-3、WP-4、WP-6、WP-7、WP-10はEdit Scopeが競合しない範囲で並行可能。WP-5はWP-4後、WP-9はWP-4とWP-8後に実施する。

## Task Graph Changes

- 旧WP-1の正本化・Decision protocolはTASK-018へ分離し、本Taskの実装前提にする。
- external URL scheme/navigation behavior修正はTASK-019へ分離し、本TaskではAdapter回帰を行う。
- TASK-012は挙動維持の物理MOVE、本Taskはspace単位のUI責務置換としてRollback境界を分ける。

## Deferred Decisions

- 各libraryの利用space: Project ownerが該当WP着手直前に決定する。
- Workflow Document正本: WP-8着手直前に`zizai-workflow-designer`の状態入出力APIだけを調査し、Project ownerが決定する。

## Source

- `docs/handoffs/TASK-010-frontend-library-integration-audit.md`
- `docs/features/frontend.md`
- `docs/features/frontend-libraries.md`
- `docs/features/architecture.md`
- `docs/features/coding-rules.md`
- `docs/features/refactor-policy.md`
- `docs/decisions/ADR-v23-application-topology.md`
- `docs/decisions/ADR-frontend-library-vendoring.md`
- `docs/tasks/done/TASK-018-define-frontend-library-integration-contract.md`
- TASK-008 Regression Baseline
- TASK-010 Shared Source Configuration
- TASK-012 Embedded Web UI Relocation
- TASK-018 Frontend Library Integration Contract
- TASK-019 External URL Scheme Boundary

## Approved libraries

次の8 repositoryをすべて利用する。

1. `zizai-app-shell`
2. `zizai-catalog-panel`
3. `zizai-data-viewer`
4. `zizai-editor-markdown`
5. `zizai-form`
6. `zizai-highlighter-sql`
7. `zizai-sqlflow-designer`
8. `zizai-workflow-designer`

## Placement decision rule

- Frontendのどのspaceへどのlibraryを使うかは、一括で事前確定しない。
- 既存画面から移行する各Work Packageの着手前に、候補space、置換責務、残すApplication Adapter、影響範囲をProject ownerへ提示する。
- Project ownerが決定したspaceだけを変更する。
- Agentはrepository名やsampleから用途を推測し、CatalogPanelをWorkspace Explorerへ、SQLFlowDesignerを`dataflow.html`へ割り当てる等の先行決定を行わない。

## Scope

- 8 libraryの取得元URL、exact commit identifier、LICENSEを記録してlocal assetとして同梱する。
- libraryごとにApplication Adapterを設け、Bridge、config、persistence、execution、navigation、window policyをApplication責務へ残す。
- Project ownerが承認した既存spaceをlibrary UIへ段階移行する。
- 各移行段階で同じUI責務を持つApplication実装を`重複`として確認し、回帰確認後に削除する。
- API/global namespace、event、lifecycle、theme token、Document schemaの差を統合境界で解消する。
- `file://`、QWebChannel Protocol `1.0`、local-only security boundaryを維持する。
- Source、LICENSE/NOTICE、test、CI、documentationを同じOutcomeで更新する。

## Out of scope

- Project owner承認前のlibrary配置決定。
- 旧202606/202607 Application UIの復元。
- 外部CDN、runtime download、外部script/iframe/Web Componentの導入。
- localhost APIまたは独立Web Applicationの新設。
- Bridge Protocol breaking change。
- libraryの責務外であるbackend処理、workflow実行、OS dialog、永続化をlibrary内部へ移すこと。
- 本TaskのWorktreeから8 libraryのremote repositoryを直接変更・pushすること。upstream修正が必要な場合は対象repository側の別Taskと新しい取得元revisionを必要とする。

## Dependencies

- TASK-008のRegression Baselineが利用可能であること。
- TASK-018で8 library要件、Application Adapter、space決定protocol、導入Gateが正本化されていること。
- TASK-019でexternal URLのFrontend/backend二重検証とnavigation boundaryが確立していること。
- TASK-010でSource/Runtime config境界が確定していること。
- TASK-012でFrontendの正規配置が`apps/gui/`へ移行済みであること。
- 各library Work Packageは、対象spaceについてProject ownerの明示決定を必要とする。
- DataViewer lifecycle、Workflow CSS scope等のupstream blockerは、解消済みrevisionが固定されるまで該当Work Packageを開始しない。

TASK-015は「Investigationから追加された全Task」を依存条件に持つため、本Task完了後に最終Migration Verificationを行う。

## Expected change area

- `docs/features/frontend.md`または承認された専用Frontend library specification
- `docs/decisions/`
- `docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`
- `apps/gui/`
- `apps/common/contracts/`
- `tests/static/`
- `tests/unit/`
- `tests/integration/`
- `tests/e2e/`
- `.github/workflows/`
- `apps/gui/vendor/README.md`とLICENSE/NOTICE

## Acceptance criteria

- Approved libraries 8件がすべて取得元commitとLICENSEを伴うlocal assetとして同梱される。
- 8件すべてについてProject ownerが利用spaceを決定し、その決定がCurrent SpecificationまたはDecisionへ記録される。
- 各spaceは承認されたlibraryを利用し、同じUI責務のApplication実装を残さない。
- Bridge、config、保存、実行、external URL、OS window/dialogはApplication Adapterだけが扱う。
- Workflow Documentと現行`.zizd` Data Contractが単一正本でround-tripし、二重stateを持たない。
- 全componentがmount/unmount可能で、listener、body element、timer、cacheを残さない。
- Color、selector、global namespaceがCurrent Coding Rulesに適合する。
- `file://`で必要assetが解決し、external/CDN runtime dependencyが0である。
- Markdown link、Workflow external link、icon URLはFrontend/Host security boundaryを通り、内蔵WebViewを外部Pageへ遷移させない。
- QWebChannel Protocol `1.0`の31 Command、8 Event、error/correlation contractを維持する。
- libraryごとのUnit/Integration/E2EとWindows WebEngine GateがPASSする。
- pinned LICENSE/NOTICEと配布許諾Decisionが存在する。

## Test plan

- `static-analysis`: 取得元commit、external asset 0、unscoped selector 0、legacy duplicate reference 0、license/notice completeness。
- `unit`: Adapter event/payload、Document transform/patch、URL/icon policy、destroy idempotency。
- `integration`: Bridge、open/save/run/export/picker、tab/region lifecycle、internal frame。
- `e2e`: 承認spaceごとのUI回帰、keyboard、selection、resize、mount/unmount。
- `webengine`: Windows `file://` asset、QWebChannel、popup/navigation block、OS browser delegation。
- Required baseline: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate required`。
- UI gate: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate e2e`と証跡付きmanual UI確認。

## Migration risk

High — 既存UIの責務置換、Workflow Document、local asset、Bridge security、複数component lifecycleを段階的に統合するため。

## Rollback

Work Package単位でYes。各spaceの旧実装は、新library Adapterと回帰GateがPASSする同一変更内でのみ削除し、後続Package開始前にrollback可能なcommit境界を作る。

## Parallelizable

Conditional — library source調査は並行可能だが、`apps/gui`の共通HTML、token、AppShell、Adapter、E2E fixtureが重なるPackageは直列化する。

## Recommended branch

`codex/task-016-frontend-libraries`

## Worktree

Required

## Reason for task boundary

8 library導入と重複UI削除は、config MOVEやFrontend物理移動とは異なるApplication behavior変更である。space単位のユーザー判断、個別rollback、library間依存、最終統合Gateを一つの追跡可能なOutcomeへまとめる。

## Work Package plan

### Precondition transferred to TASK-018

旧WP-1のCanonical specification and decision protocolはTASK-018へ分離した。TASK-018完了前にWP-2以降を開始しない。本Taskでは承認済み共通contractをspace単位の実装へ適用し、各space固有Decisionだけを該当WPで記録する。

### WP-2 Pinned local source and integration gates

Owner: Codex

Assignment Reason: 外部repositoryの版固定、権利判断、upstream blocker、Application securityを横断するため。

Task: 8件の取得元URL／exact commit／LICENSE/NOTICEを記録し、DataViewer destroy、Workflow CSS scope、SQLFlow test、theme/global namespaceを導入Gateとして解消する。

Dependencies:
- TASK-018。
- 必要なupstream修正版revision。

Read Scope:
- 8 library repositoryの初回導入時点のrevision
- `apps/gui/`
- `docs/features/coding-rules.md`
- `docs/features/frontend.md`
- packaging/test/CI設定

Edit Scope:
- `apps/gui/`の承認済みlocal vendor領域
- Frontend library manifest/NOTICE
- `tests/static/`
- `.github/workflows/`
- 関連Feature/Decision/Task evidence

Acceptance Criteria:
- 8件のsource revision/licenseが追跡可能でoffline検証できる。
- lifecycle、CSS、test、security blockerが0である。

Constraints:
- `main`や未固定URLをruntime参照しない。
- remote repositoryをこのWorktreeから変更・pushしない。
- 許諾未記録のsourceを配布物へ入れない。

Tests:
- vendor source/license record validator。
- external URL/CDN/global selector static test。
- library upstream test commandsとoffline asset smoke。

Codex Verification:
- vendor記録と同梱内容を照合し、8 commit identifier、LICENSE、runtime load順を確認する。

### WP-3 AppShell migration

Owner: Codex

Assignment Reason: shell/tabとWorkspace、Bridge、window policyの責務分離およびspace承認が必要な横断統合であるため。

Task: Project ownerが承認したshell spaceを`zizai-app-shell`へ移行し、Application固有処理をAdapterへ残して重複shell/tab UIを削除する。

Dependencies:
- WP-2。
- 対象spaceのProject owner決定。

Read Scope:
- `apps/gui/`
- AppShell README/source/test
- Bridge/internal frame contracts
- shell/workspace regression tests

Edit Scope:
- `apps/gui/`のshell/adapter/page領域
- 対応するUI test
- 関連Feature/Task evidence

Acceptance Criteria:
- 承認spaceがAppShell API/eventを使用する。
- Workspace、file I/O、window control、未保存policyはApplication Adapterに残る。
- 重複shell/tab描画が0である。

Constraints:
- Bridge Protocol、internal frame contract、space配置を無断変更しない。

Tests:
- AppShell unit/browser tests。
- shell/tab/shortcut/resize/embedded-frame integrationとWindows UI smoke。

Codex Verification:
- libraryとApplication Adapterの責務境界、listener破棄、旧shell参照0を確認する。

### WP-4 SQL Highlighter migration

Owner: Codex

Assignment Reason: 現行SQL branchとPython/JSON/template branchの切分けをApplication contextに合わせて判断する必要があるため。

Task: 承認spaceのSQL highlightを`zizai-highlighter-sql`へ移行し、非SQL highlightとsuggest責務をApplication側へ残す。

Dependencies:
- WP-2。
- 対象spaceのProject owner決定。

Read Scope:
- `apps/gui/`のcode editor/highlight/suggest
- SQL Highlighter source/dialect/test

Edit Scope:
- 承認されたeditor/adapter/theme領域
- 対応testとTask evidence

Acceptance Criteria:
- SQL表示・編集がlibrary APIを使い、旧SQL tokenizer重複が0である。
- `file://`ではdialect `.js`を使用し、runtime `fetch()`を行わない。

Constraints:
- Python/JSON/template highlightとschema suggestを削除しない。

Tests:
- BigQuery/DuckDB token/decorations/style tests。
- file URL editor smoke。

Codex Verification:
- SQL以外のeditor回帰とruntime network 0を確認する。

### WP-5 Markdown Editor migration

Owner: Codex

Assignment Reason: Workspace保存、document navigation、external URL policyとeditor lifecycleを統合するため。

Task: 承認spaceのMarkdown編集/表示を`zizai-editor-markdown`へ移行し、save/suggest/document linkをApplication Adapterへ接続する。

Dependencies:
- WP-2、WP-4。
- 対象spaceのProject owner決定。

Read Scope:
- `apps/gui/`のWorkspace/editor/navigation
- Markdown Editor source/test
- URL/navigation security contract

Edit Scope:
- 承認されたMarkdown/Workspace adapter領域
- 対応testとTask evidence

Acceptance Criteria:
- Markdown edit/view/save/suggestがlibrary API/eventを使う。
- SQL code blockはSQL Highlighterを注入する。
- external linkはFrontend/Host policyを通る。

Constraints:
- libraryからBridgeを直接呼ばない。
- internal WebViewで外部Pageを開かない。

Tests:
- Markdown source/view/document-link/suggest/save tests。
- URL scheme/popup/navigation integration。

Codex Verification:
- save round-trip、link拒否境界、destroy後listener 0を確認する。

### WP-6 NodeForm migration

Owner: Codex

Assignment Reason: field UIとApplication固有schema/runtime/modal/Bridge責務を分離する判断が必要なため。

Task: 承認spaceのform生成・値・validationを`zizai-form`へ移行し、picker/coordinateとApplication固有補完をAdapterへ接続する。

Dependencies:
- WP-2。
- 対象spaceのProject owner決定。

Read Scope:
- `apps/gui/`のform/config/node detail
- NodeForm source/sample/test
- connector/form schema contract

Edit Scope:
- 承認されたform/adapter領域
- 対応testとTask evidence

Acceptance Criteria:
- 現行field kindがNodeFormで表示・取得・validationできる。
- picker/coordinate requestがHost Adapter経由で完結する。
- 重複field rendererだけが削除され、Application固有処理は残る。

Constraints:
- schema autoload、reference warning、runtime default、modal、code editorをlibrary責務へ混在させない。

Tests:
- NodeForm test、field schema fixture、picker/coordinate/validation integration。

Codex Verification:
- 全field kind、visible condition、export key、Application extensionを照合する。

### WP-7 DataViewer migration

Owner: Codex

Assignment Reason: backend preview/schema/exportとlibrary lifecycleの統合判断を伴うため。

Task: 承認spaceのtable/schema/distribution UIを`zizai-data-viewer`へ移行し、execute/page/exportをApplication Adapterへ接続する。

Dependencies:
- WP-2。
- destroy/offを備える承認済みlibrary revision。
- 対象spaceのProject owner決定。

Read Scope:
- `apps/gui/`のdata/schema/preview領域
- DataViewer source/test
- Bridge result/export contract

Edit Scope:
- 承認されたdata viewer/adapter領域
- 対応testとTask evidence

Acceptance Criteria:
- schema/data/page/distributionとeventがAdapter経由でround-tripする。
- mount/unmount後にdocument listener/body menuが残らない。
- 重複table/schema rendererが0である。

Constraints:
- SQL実行、集計、file生成、clipboard writeをlibrary内部へ移さない。

Tests:
- DataViewer browser tests。
- preview/schema/page/export integrationとrepeated mount/unmount test。

Codex Verification:
- lifecycle leak、large payload boundary、旧renderer参照0を確認する。

### WP-8 WorkflowDesigner migration

Owner: Codex

Assignment Reason: `.zizd`正本、Document Patch、history、validation、run、selectionを横断する高risk設計判断であるため。

Task: 承認spaceのworkflow editingを`zizai-workflow-designer`へ移行し、単一Document正本とApplication request Adapterを確立する。

Dependencies:
- TASK-018、WP-2。
- WP-8着手直前に状態入出力APIだけを調査した上でのWorkflow Document Decision。
- 対象spaceのProject owner決定。

Read Scope:
- `docs/features/data-contract.md`
- `apps/gui/`のstate/app/workflow/canvas/detail
- WorkflowDesigner source/sample/test
- Bridge/run/internal frame contracts

Edit Scope:
- 承認されたworkflow state/adapter/view領域
- data contractの承認済み更新先
- 対応Unit/Integration/E2EとTask evidence

Acceptance Criteria:
- `.zizd` load/edit/save/runが単一正本でround-tripする。
- Patch、Undo/Redo、selection、node/edge/loop/note、status/validationがlibrary contractで動作する。
- 旧canvas/graph editing重複が0である。

Constraints:
- 二重stateを作らない。
- `.zizd`互換またはBridge Protocolを暗黙に変更しない。

Tests:
- Document transform/patch property tests。
- WorkflowDesigner unit/browser tests。
- full workflow open/edit/save/run/loop E2EとWindows WebEngine Gate。

Codex Verification:
- representative `.zizd` round-trip diff、history inverse、run payload、旧graph参照0を確認する。

### WP-9 SQLFlowDesigner migration

Owner: Codex

Assignment Reason: 利用spaceのユーザー判断に加え、WorkflowDesignerとSQL Highlighterの統合済みcontractを接続するため。

Task: Project ownerが承認したspaceへ`zizai-sqlflow-designer`を導入し、SQL parser/viewerを実行・保存責務から分離する。

Dependencies:
- WP-4、WP-8。
- 対象spaceのProject owner決定。

Read Scope:
- 承認spaceのSQL/editor/workflow領域
- SQLFlowDesigner source/sample
- SQL Highlighter/WorkflowDesigner Adapter

Edit Scope:
- 承認されたSQL flow/adapter領域
- 新規parser/viewer test
- Task evidence

Acceptance Criteria:
- SQL parse/viewが2依存libraryの固定APIで動作する。
- SQL実行、DB接続、保存、BridgeはApplication責務に残る。
- parser/viewerの自動回帰testが存在する。

Constraints:
- `dataflow.html`等へ名前だけで自動配置しない。

Tests:
- parser fixture、unified document、detail highlight、destroy、approved-space E2E。

Codex Verification:
- dependency load順、Document互換、実行責務の非混在を確認する。

### WP-10 CatalogPanel migration

Owner: Codex

Assignment Reason: catalogの意味、data source、保存、permission、表示spaceがProject owner判断を必要とするため。

Task: Project ownerが承認した用途とspaceへ`zizai-catalog-panel`を導入し、load/save/icon/permissionをApplication Adapterへ接続する。

Dependencies:
- WP-2。
- 用途、space、data source、保存先、permissionのProject owner決定。

Read Scope:
- 承認spaceと関連data/persistence contract
- CatalogPanel source/sample/test
- icon/security policy

Edit Scope:
- 承認されたcatalog/adapter領域
- 対応testとTask evidence

Acceptance Criteria:
- catalog dataがvalidationされ、change/copy/errorがAdapterへ通知される。
- persistenceとpermissionが承認contractに従う。
- iconはlocal allowlisted assetだけを使用する。

Constraints:
- Workspace Explorerやconnector catalogへ推測で割り当てない。
- library memory stateを永続化正本にしない。

Tests:
- Catalog store/panel/event/permission/validation test。
- persistence/icon policy/approved-space integration。

Codex Verification:
- owner決定との一致、保存round-trip、権限制御、external icon 0を確認する。

### WP-11 Cross-library cleanup and final acceptance

Owner: Codex

Assignment Reason: 全Packageの統合判断、重複削除、最終Acceptance、独立レビューを一括判定するため。

Task: 全8件の配置・Adapter・重複削除・security・license・verification evidenceを統合し、本Taskを完了判定する。

Dependencies:
- WP-3～WP-10完了。

Read Scope:
- 全変更領域
- 全Feature/Decision/Task/Evidence
- test/CI/package結果

Edit Scope:
- shared Frontend Adapter/theme/manifestの統合箇所
- test/CI/documentation
- `docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`

Acceptance Criteria:
- Task Acceptance criteriaが全件PASSする。
- 全8件の利用、owner-approved placement、duplicate UI 0がtrace可能である。
- required/e2e/WebEngine/manual/packaging GateがPASSする。

Constraints:
- 最終整理で未承認のUI変更や便乗refactorを行わない。
- Claude review結果だけで完了判定しない。

Tests:
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate required`
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate e2e`
- Windows WebEngine/manual UI/package offline verification。

Codex Verification:
- Acceptance traceabilityを再計算し、必要に応じてClaude Codeの読取専用reviewを一次Evidenceへ照合して最終判定する。

## Completed

- 8 public repositoryのREADME、source tree、public API、dependency、test、LICENSE、tag/releaseを調査した。
- 現行Frontendの重複責務、Workflow Document不一致、lifecycle/theme/security blockerを照合した。
- 全8 libraryを利用し、配置は既存画面の移行時にProject ownerが決定する方針を確認した。
- Work Package全件を`Owner: Codex`へ割り当てた。Claude Codeは実装Ownerにせず、利用可能な場合の読取専用reviewに限定する。
- TASK-017の監査により、正本化WPをTASK-018、security behavior修正をTASK-019へ分離し、TASK-012とのRollback境界を固定した。
- TASK-019が完了し、library eventも通るexternal URL Application Adapterとnavigation boundaryが確立した。
- TASK-010とTASK-012が完了し、Source／Runtime config境界と`apps/gui/`のFrontend正規配置が成立した。

## Evidence

- `docs/handoffs/TASK-010-frontend-library-integration-audit.md`
- 8 repositoryの調査時revision
- TASK-012着手前のroot `static/`とTASK-012後の`apps/gui/`の移行契約

## Remaining

- 本TaskのScope、Work Package、Owner、依存順についてProject ownerの実装計画承認を得る。
- WP-2から、各spaceの配置判断を得て実装する。

## Exact next action

WP-2の実装計画承認を確認する。

## Termination condition

全8 libraryがProject owner承認spaceで使用され、Application側の同一UI責務が削除され、全Acceptance criteriaとVerification GateがPASSしてEvidenceが保存されること。
