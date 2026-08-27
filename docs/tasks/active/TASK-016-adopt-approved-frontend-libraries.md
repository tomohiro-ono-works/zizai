# TASK-016 Adopt Approved Frontend Libraries

## Status

Implementation in progress — WP-5B automated verification complete; awaiting manual smoke

## Goal

`tomohiro-ono-works`配下の承認済み7 Frontend libraryをlocal同梱し、既存画面をspace単位で段階移行して、Application側の重複UI責務を削除する。

## End State

7 libraryが取得元commitとLICENSE付きで`apps/gui/vendor/`へlocal同梱され、Project ownerが各移行時に決定したspaceで使用される。Bridge、config、保存、実行、navigation、OS操作はApplication Adapterへ残り、同じUI責務のApplication実装は0である。

## Goal Traceability

- 7 libraryの再現可能な同梱 → WP-2
- Project owner決定spaceでの利用 → WP-3～WP-8、WP-10
- Application Adapter責務とDocument単一正本 → WP-3～WP-8、WP-10
- 重複UI 0、全Gate、配布Evidence → WP-11

## Critical Path

`TASK-018 → TASK-019 → TASK-010 → TASK-011 → TASK-012 → WP-2A + WP-2B + WP-2C → WP-2 → WP-3～WP-8 + WP-10 → WP-11 → TASK-014 → TASK-015`。

## Parallel Work

WP-2AとWP-2Bはrepositoryが独立しているが、Claude利用枠とWorktree管理を単純にするため本sessionでは直列実行する。WP-2CはWP-2のupstream Test実行で検出したためWP-2B後に実施する。WP-2完了後、Project ownerのspace決定とlibrary間依存を満たすWP-3、WP-4、WP-6、WP-7、WP-10はEdit Scopeが競合しない範囲で並行可能。WP-5はWP-4後に実施する。

## Task Graph Changes

- 旧WP-1の正本化・Decision protocolはTASK-018へ分離し、本Taskの実装前提にする。
- external URL scheme/navigation behavior修正はTASK-019へ分離し、本TaskではAdapter回帰を行う。
- TASK-012は挙動維持の物理MOVE、本Taskはspace単位のUI責務置換としてRollback境界を分ける。
- 現行Applicationに対応機能がない`zizai-sqlflow-designer`は本Migration graphから除外し、将来の新機能Taskへ延期する。TASK-015のMigration完了条件には含めない。
- DataViewer lifecycle、WorkflowDesigner CSS scope、SQL Highlighter browser Test不整合はvendor copyで回避せず、それぞれのupstream repositoryで修正・検証した新SHAをWP-2の入力とする。

## Deferred Decisions

- 各libraryの利用space: Project ownerが該当WP着手直前に決定する。
- Workflow Document正本: WP-8着手直前に`zizai-workflow-designer`の状態入出力APIだけを調査し、Project ownerが決定する。
- SQL flow表示機能と利用space: 本Taskでは決めず、新機能を検討する将来TaskでProject ownerが決定する。

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

次の7 repositoryを利用する。

1. `zizai-app-shell`
2. `zizai-catalog-panel`
3. `zizai-data-viewer`
4. `zizai-editor-markdown`
5. `zizai-form`
6. `zizai-highlighter-sql`
7. `zizai-workflow-designer`

`zizai-sqlflow-designer`は現行Applicationに該当機能がないため、本TaskのApproved librariesに含めない。

## Placement decision rule

- Frontendのどのspaceへどのlibraryを使うかは、一括で事前確定しない。
- 既存画面から移行する各Work Packageの着手前に、候補space、置換責務、残すApplication Adapter、影響範囲をProject ownerへ提示する。
- Project ownerが決定したspaceだけを変更する。
- Agentはrepository名やsampleから用途を推測し、CatalogPanelをWorkspace Explorerへ割り当てる等の先行決定を行わない。

## Scope

- 7 libraryの取得元URL、exact commit identifier、LICENSEを記録してlocal assetとして同梱する。
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
- `zizai-sqlflow-designer`と新しいSQL flow表示機能の導入。
- 本TaskのWorktreeから7 libraryのremote repositoryを直接変更・pushすること。upstream修正が必要な場合は対象repository側の別Taskと新しい取得元revisionを必要とする。

## Dependencies

- TASK-008のRegression Baselineが利用可能であること。
- TASK-018で定義したApplication Adapter、space決定protocol、導入GateがCurrent Specificationへ反映されていること。
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

- Approved libraries 7件がすべて取得元commitとLICENSEを伴うlocal assetとして同梱される。
- 7件すべてについてProject ownerが利用spaceを決定し、その決定がCurrent SpecificationまたはDecisionへ記録される。
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

7 library導入と重複UI削除は、config MOVEやFrontend物理移動とは異なるApplication behavior変更である。space単位のユーザー判断、個別rollback、library間依存、最終統合Gateを一つの追跡可能なOutcomeへまとめる。

## Work Package plan

Project owner approved this plan on 2026-08-25. WP-2A、WP-2B、WP-2 through WP-8 and WP-10 use `claude-assist` for bounded implementation and tests; Codex records each just-in-time space decision and performs independent verification. If Claude Code reaches its usage limit, execution stops at that Work Package instead of transferring implementation to Codex.

### Precondition transferred to TASK-018

旧WP-1のCanonical specification and decision protocolはTASK-018へ分離した。TASK-018完了前にWP-2以降を開始しない。本Taskでは承認済み共通contractをspace単位の実装へ適用し、各space固有Decisionだけを該当WPで記録する。

### WP-2A DataViewer upstream lifecycle hardening

Owner: claude-assist

Assignment Reason: 不具合、期待するcleanup、対象source、再現Testが明確で、DataViewer repository内でRED-GREENを完結できるため。

Task: `ReportViewer`のdocument listener、body menu、component参照を`destroy()`で解放し、複数回呼出しとmount／destroy／remountを安全にする。

Dependencies:
- Project ownerによるupstream-first方針の承認。

Read Scope:
- `zizai-data-viewer` repositoryのREADME、source、sample、test／検証設定。

Edit Scope:
- `zizai-data-viewer` repositoryのsource、test、必要なREADME API記録。

Acceptance Criteria:
- `destroy()`が所有するlistener、body menu、DOM参照を解放し、複数回呼んでも例外や残留を生まない。
- mount／destroy／remountでlistenerとmenuが重複しない。

Constraints:
- DataViewerの公開表示・event payload・Application責務を変更しない。
- Claudeはcommit／pushを行わない。Codexが独立検証後に確定操作を行う。

Tests:
- cleanup不在でFAILするTestを先に追加し、REDを確認する。
- destroy idempotency、mount／destroy／remount、既存TestをGREENにする。

Codex Verification:
- 変更scope、RED理由、listener／menu実体の解放、focused Testを独立確認する。

### WP-2B WorkflowDesigner upstream CSS scoping

Owner: claude-assist

Assignment Reason: unscoped `:root`と期待するcomponent root境界が特定済みで、CSS contract Testから修正までrepository内で完結できるため。

Task: WorkflowDesignerのtheme custom propertyをcomponent rootへscopeし、既存表示を維持したままApplication全体へのCSS影響をなくす。

Dependencies:
- Project ownerによるupstream-first方針の承認。

Read Scope:
- `zizai-workflow-designer` repositoryのREADME、source、sample、test／検証設定。

Edit Scope:
- `zizai-workflow-designer` repositoryのCSS、test、必要なREADME theme記録。

Acceptance Criteria:
- library CSSにunscoped `:root`がなく、theme custom propertyがWorkflowDesigner root配下だけへ適用される。
- sample／既存componentの見た目とtoken override contractが維持される。

Constraints:
- Application tokenをlibrary正本へ移さない。
- global selector追加、UI redesign、Claudeによるcommit／pushを行わない。

Tests:
- unscoped tokenでFAILするTestを先に追加し、REDを確認する。
- scoped token contractと既存TestをGREENにする。

Codex Verification:
- selector scope、token継承、既存sampleへの影響とfocused Testを独立確認する。

### WP-2C SQL Highlighter upstream browser Test alignment

Owner: claude-assist

Assignment Reason: 現行CSSとNode style contractが一致し、browser Testだけが旧paletteを期待する根本原因まで限定済みで、upstream repository内のTest修正と実ブラウザ検証で完結できるため。

Task: SQL Highlighter browser Testのcomputed style期待値を現行CSS／Node style contractへ一致させ、実ブラウザTestをGREENにする。

Dependencies:
- Project ownerによるupstream-first方針の承認。
- WP-2のupstream Test実行で再現したbrowser failure。

Read Scope:
- `zizai-highlighter-sql` repositoryのREADME、`src/sql-highlighter.css`、style／browser Test。

Edit Scope:
- `zizai-highlighter-sql/test/test-runner.js`。

Acceptance Criteria:
- 変更前のbrowser Testが旧palette期待値によりFAILする証拠を保持する。
- browser Testのcomputed style期待値が現行CSSとNode style contractへ一致する。
- source、dictionary、public API、表示styleを変更しない。
- Node Testとbrowser TestがGREENになる。

Constraints:
- vendor copy、Application code、library source CSSを変更しない。
- Claudeはcommit／pushを行わない。Codexが独立検証後に確定操作を行う。

Codex Verification:
- CSS、Node Test、browser computed styleの3点を照合し、実ブラウザTestを再実行する。

### WP-2 Pinned local source and integration gates

Owner: claude-assist

Assignment Reason: 7 repository、vendor配置、導入Gate、検証範囲が明確で、現行revision調査からlocal snapshot、TestまでRepository内の一作業として完結できるため。権利判断と最終採否はCodexが既存Decisionへ照合する。

Task: 7件の取得元URL／exact commit／LICENSE/NOTICEを記録し、DataViewer destroy、Workflow CSS scope、theme/global namespaceを導入Gateとして解消する。

Dependencies:
- TASK-018。
- WP-2A、WP-2B、WP-2Cで確定したupstream修正版revision。

Read Scope:
- 7 library repositoryの初回導入時点のrevision
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
- 7件のsource revision/licenseが追跡可能でoffline検証できる。
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

Owner: claude-assist

Assignment Reason: Project ownerによるspace決定後はshell／Adapter／回帰Testの境界が明確で、実装とTestを一括して委譲できるため。space決定と最終責務判定はCodexが担当する。

Task: Project ownerが承認したshell spaceを`zizai-app-shell`へ移行し、Application固有処理をAdapterへ残して重複shell/tab UIを削除する。

Project owner decision (2026-08-25):
- `home.html`、`dataflow.html`、`settings.html`で共有する外枠を移管対象とする。
- AppShellはactivity bar、sidebar、tab／panel／status領域、layout／resize、window control表示と操作eventを所有する。
- Application AdapterはWorkspace／document／tab state、file I/O、dirty／save／close policy、Bridge／workflow実行、internal frame、navigation、OS window操作の実行を保持する。
- page固有contentと挙動は変更しない。

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

#### WP-3 delivery decomposition

End State: 3画面の共通外枠がAppShellを使用し、Tabのdrag並べ替えと右クリックcloseを維持したまま、ApplicationがTab順序とclose policyの正本であり続ける。

Goal Traceability:
- AppShellがApplication非依存の汎用Tab interactionを公開する → WP-3A。
- 検証済みupstream commitだけをlocal同梱する → WP-3B。
- 既存Tab並べ替え、右クリックclose、dirty／close policyを維持する → WP-3C。
- 重複UI 0、lifecycle解放、Windows表示を確認する → WP-3D。

Critical Path: `WP-3A upstream Test-first実装 → WP-3B GitHub反映・再vendor → WP-3C Application Adapter接続 → WP-3D自動検証 → WP-3E手動smoke回帰修正 → WP-3D手動再検証`。

Parallel Work: None。公開API、vendor revision、Application Adapterの順に確定する必要があり、同時編集は行わない。

Task Graph Changes: WP-3実装中に、現行AppShell APIでは旧Tabのdrag並べ替えと右クリックcloseを保持できないことを検出したためWP-3A～WP-3Dへ分解した。さらに2026-08-25の手動smokeでApplication統合上の3回帰を検出したため、WP-3Eを追加する。

Deferred Decisions: None。Project ownerが2026-08-25に汎用event APIとupstream-first実装を承認した。

#### WP-3A AppShell generic tab interactions

Owner: claude-assist

Assignment Reason: 公開API、対象source／test、Application非依存条件が確定しており、upstream内のTest-first実装として一括委譲できるため。

Task: 一時cloneした`zizai-app-shell@15305b8b58e7cc09de3c6cf72212fbfdfecf7df1`へ、汎用Tab drag reorder requestと汎用context action menuを追加する。

Dependencies:
- `docs/features/frontend-libraries.md`の`Generic tab interaction API`承認。
- CodexがApplication Worktree外の一時directoryへcloneし、`codex/task-016-app-shell-tab-interactions`branchを作成する。

Read Scope:
- upstream `README.md`
- upstream `src/`
- upstream `test/`
- load orderを持つupstream `sample/index.html`

Edit Scope:
- upstream `README.md`
- upstream `src/shell_types.js`
- upstream `src/shell_tabs.js`
- upstream `src/shell_tab_interactions.js`（新規）
- upstream `src/app_shell.js`
- upstream `src/ui-shell.css`
- upstream `test/browser.test.js`
- upstream `test/static.test.js`
- upstream `test/index.html`
- upstream `sample/index.html`

Interfaces:
- Tab descriptor: `reorderable?: boolean`、`contextActions?: Array<{ id: string, label: string, disabled?: boolean }>`。
- Event: `tab:reorder-request` payload `{ tabId, targetTabId, placement: "before" | "after" }`。
- Event: `tab:context-action` payload `{ tabId, actionId }`。
- AppShellはTab配列を自動並べ替えせず、context actionの意味も解釈しない。

Acceptance Criteria:
- drag sourceとdrop targetが異なる場合だけ`tab:reorder-request`を1回通知する。
- pointer位置がtarget中央より左なら`before`、右なら`after`を通知する。
- `contextActions`があるTabだけ右クリックmenuを表示し、有効Action選択時だけ`tab:context-action`を通知する。
- outside clickとEscapeでmenuを閉じ、`destroy()`でmenu、document listener、drag state、DOM参照を解放する。
- `workflow`、`file`、`save`、Bridge、Application route等の固有概念をsourceへ追加しない。

Constraints:
- 既存`tab:activate`、`tab:close-request`、`setTabs`、close button挙動を変更しない。
- AppShellがApplication stateを所有しない。
- dependency、build、bundle、remote assetを追加しない。
- Claudeはcommit、push、PR、mergeを行わない。

Steps:
- [ ] `test/browser.test.js`へdrag payload、before／after、context action、disabled action、outside click、Escape、destroy後無通知の失敗Testを追加する。
- [ ] `test/static.test.js`へ新module load、Application固有語0、global selector追加0の失敗Testを追加する。
- [ ] Codexが既存Node Testとbrowser harnessを実行し、追加TestのREDを確認する。
- [ ] `shell_types.js`で上記descriptorをnormalizeし、`shell_tab_interactions.js`でevent delegation、menu、cleanupを実装する。
- [ ] `shell_tabs.js`はnormalized descriptorからdraggable属性だけを描画し、Application処理を持たせない。
- [ ] `app_shell.js`でinteraction controllerをmount／render／destroyへ接続し、2 eventを既存emitterから通知する。
- [ ] `ui-shell.css`へ`.zui-shell`配下だけのdrag／menu styleを追加し、READMEと2 HTMLのload orderを更新する。
- [ ] Codexが同じNode Testとbrowser harnessを再実行してGREENを確認する。

Tests:
- `node test/layout.test.js`
- `node test/shortcut.test.js`
- `node test/static.test.js`
- 既存Application Playwright runtimeでupstream `test/index.html`をlocal配信し、`document.title === "PASS"`を確認する。

Codex Verification:
- 公開descriptor／event payload、state非所有、listener／menu解放、Application固有語0を差分とTestで確認する。

#### WP-3B Publish and re-vendor AppShell

Owner: Codex

Assignment Reason: commit、push、PR、merge、revision確定、vendor照合はClaude禁止操作とPackage間の統合判断を含むため。

Task: WP-3AをupstreamへPRで反映し、merge後main SHAの`src/`と`LICENSE`だけをApplicationへ再vendorする。

Dependencies:
- WP-3Aの全upstream TestがPASS。

Read Scope:
- WP-3A一時cloneのdiff／Test結果
- `apps/gui/vendor/zizai-app-shell/`
- `apps/gui/vendor/README.md`
- `tests/static/test_frontend_library_vendor_contract.py`

Edit Scope:
- `apps/gui/vendor/zizai-app-shell/`
- `apps/gui/vendor/README.md`
- `tests/static/test_frontend_library_vendor_contract.py`

Acceptance Criteria:
- upstream PRをmergeし、default branchの新SHAを取得する。
- vendor `src/`と`LICENSE`が新SHAとbyte一致する。
- 新`src/shell_tab_interactions.js`をruntime load orderへ追加する。
- vendor copyだけの独自修正が0である。

Constraints:
- Application Worktreeのbranchを切り替えない。
- 一時cloneはApplication Worktree外へ置き、再vendorと照合後に削除する。
- 他libraryのvendor内容を変更しない。

Tests:
- `tests/static/test_frontend_library_vendor_contract.py`
- upstream取得元とvendorのSHA-256比較。

Codex Verification:
- PR、merge SHA、runtime load order、LICENSE、byte一致を確認する。

#### WP-3C Application tab interaction adapter

Owner: claude-assist

Assignment Reason: 新しい汎用eventと既存Application state／close policyの接続範囲が限定され、Integration Testと一括委譲できるため。

Task: ApplicationのTab descriptorとAppShell eventを接続し、既存のdrag並べ替え、右クリックclose、dirty／close policyを復元する。旧shell selector残存も同時に解消する。

Dependencies:
- WP-3Bで新AppShell SHAが再vendor済み。

Read Scope:
- 正規Frontend library仕様とTASK-016 WP-3
- `apps/gui/vendor/zizai-app-shell/src/`
- `apps/gui/home.html`
- `apps/gui/dataflow.html`
- `apps/gui/settings.html`
- `apps/gui/js/app-shell.js`
- `apps/gui/js/workspace.shell.js`
- `apps/gui/js/workspace.manager.js`
- `apps/gui/js/app.js`のright sidebar幅計算
- `tests/playwright/specs/ui-shell.spec.js`

Edit Scope:
- `apps/gui/home.html`
- `apps/gui/dataflow.html`
- `apps/gui/settings.html`
- `apps/gui/js/app-shell.js`
- `apps/gui/js/workspace.manager.js`
- `apps/gui/js/app.js`
- `tests/playwright/specs/ui-shell.spec.js`

Interfaces:
- Applicationはclosable Tabへ`contextActions: [{ id: "close", label: "閉じる" }]`を渡す。
- Applicationは並べ替え可能Tabへ`reorderable: true`を渡す。
- `tab:reorder-request`で`state.tabOrder`だけを更新し、viewと`setTabs`を同期する。
- `tab:context-action`の`actionId === "close"`だけを既存`requestTabClose(tabId)`へ接続する。

Acceptance Criteria:
- drag後のTab順序がApplication stateとAppShell表示で一致する。
- 右クリックcloseが既存dirty／running／save確認policyを迂回しない。
- Application AdapterがAppShell内部DOM classを使ってdrag／menuを実装しない。
- `app.js`の旧`.app-shell`／`.sidebar`幅計算参照が新shell参照へ置換される。
- page破棄時にAppShell `destroy()`を1回実行する。

Constraints:
- Bridge Protocol、file I/O、save形式、workflow実行、internal frameを変更しない。
- vendor sourceをApplication側から修正しない。
- Tab drag／context menuのApplication独自DOM描画を復活させない。

Steps:
- [ ] `ui-shell.spec.js`のload order期待値へ`src/shell_tab_interactions.js`を追加し、3画面が新moduleなしではmountできないREDを確認する。
- [ ] 3 HTMLへ新moduleを`src/shell_tabs.js`と`src/shell_activitybar.js`の間で読み込ませ、shell mountをGREENにする。
- [ ] `ui-shell.spec.js`へ2 Tabのbefore／after drag、右クリックclose、dirty close policy、旧selector 0、page破棄cleanupの失敗Testを追加する。
- [ ] Codexがfocused Playwrightを実行しREDを確認する。
- [ ] `workspace.manager.js`へ汎用descriptorと2 event Adapterを追加し、既存Tab state／close policyだけを呼び出す。
- [ ] `app-shell.js`へpage破棄時のAppShell cleanupを追加する。
- [ ] `app.js`のright sidebar幅計算を新shell selectorへ更新する。
- [ ] Codexが同じfocused Playwrightを再実行してGREENを確認する。

Tests:
- `.\\tests\\playwright\\node_modules\\.bin\\playwright.cmd test tests/playwright/specs/ui-shell.spec.js --config tests/playwright/playwright.config.js --project=chromium`
- `.\\tests\\playwright\\node_modules\\.bin\\playwright.cmd test tests/playwright/specs/detail-panel-left-gap.spec.js --config tests/playwright/playwright.config.js --project=chromium`
- `node --check apps/gui/js/app-shell.js`
- `node --check apps/gui/js/workspace.manager.js`
- `node --check apps/gui/js/app.js`

Codex Verification:
- state正本、close policy経路、旧selector 0、内部DOM依存0、destroy 1回を確認する。

#### WP-3D AppShell migration verification

Owner: Codex

Assignment Reason: upstreamとApplicationの横断Acceptance、予定外変更、実画面確認の最終判断を行うため。

Task: WP-3全体の責務境界、回帰、Evidenceを確認し、次のspace decisionへ進める状態にする。

Dependencies:
- WP-3A～WP-3C完了。

Read Scope:
- WP-3全変更とTest結果
- AppShell upstream PR／merge SHA
- WP-3仕様／計画／Evidence

Edit Scope:
- `docs/features/frontend-libraries.md`
- `docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`

Acceptance Criteria:
- 3画面がlocal AppShellを使用し、旧shell／tab描画0、Application固有語のlibrary流入0である。
- shell mount／destroy、Tab activate／close／reorder／context action、sidebar／panel resize、embedded frame回帰がPASSする。
- Windows WebEngineで3画面、Tab drag、右クリックclose、dirty確認、right panel resizeを手動確認できる。

Tests:
- WP-3A／WP-3B／WP-3Cの全Gate。
- `tests/static`全体。
- 対象PlaywrightとWindows WebEngine manual smoke。

Codex Verification:
- 実行結果をTASK-016 Evidenceへ要約し、未確認項目があればWP-3を完了扱いにしない。

#### WP-3E AppShell manual-smoke regression fixes

Owner: claude-assist

Assignment Reason: 3症状の原因、Application側の責務、変更対象、観測可能な完了条件が確定しており、Test-firstの修正を一括委譲できるため。

Task: window controlsとTabを1段へ統合し、外枠scrollbarとdetail panel縮小時の空白をApplication Adapter／layout側で解消する。

Dependencies:
- WP-3A～WP-3Dの自動検証完了。
- Project ownerによる3症状の再現確認と修正方針承認。

Read Scope:
- `AGENTS.md`
- `docs/features/architecture.md`
- `docs/features/coding-rules.md`
- `docs/features/frontend.md`
- `docs/features/frontend-libraries.md`
- `apps/gui/js/app-shell.js`
- `apps/gui/js/app.js`
- `apps/gui/css/`
- `apps/gui/vendor/zizai-app-shell/src/`
- `tests/playwright/specs/ui-shell.spec.js`
- `tests/playwright/specs/detail-panel-left-gap.spec.js`

Edit Scope:
- `apps/gui/js/app-shell.js`
- `apps/gui/js/app.js`
- 必要な`apps/gui/css/`内のApplication stylesheet
- `tests/playwright/specs/ui-shell.spec.js`
- `tests/playwright/specs/detail-panel-left-gap.spec.js`

Acceptance Criteria:
- window controlsとTabが同じ40px行に表示され、Tab操作と非interactive領域のwindow dragが維持される。
- AppShell外枠とmain hostに不要な縦横scrollbarがなく、内部componentの意図したscrollは維持される。
- detail panelを縮小方向へdragするとpanelが縮み、flow領域が増え、下端に空白が残らない。
- `apps/gui/vendor/`を変更せず、AppShellへApplication固有責務を追加しない。

Constraints:
- 各症状について実挙動のPlaywright Testを先に追加し、期待理由でREDを確認してから最小修正を行う。
- 既存の未コミット変更、Tab reorder／context close、dirty確認、right panel resizeを維持する。
- commit、push、branch変更、vendor変更を行わない。

Tests:
- `tests/playwright/specs/ui-shell.spec.js`
- `tests/playwright/specs/detail-panel-left-gap.spec.js`
- JavaScript構文確認とWP-3既存回帰Gate。

Codex Verification:
- 変更scope、AppShell責務境界、RED／GREEN証跡を確認し、対象PlaywrightとWindows実画面smokeを再確認する。

### WP-4 SQL Highlighter migration

Owner: claude-assist

Assignment Reason: SQLだけを置換して非SQL branchを維持する境界が明確で、対象editor／Adapter／Testを一括して実装できるため。

Task: BigQuery／DuckDBノード詳細SQL editorとWorkspace `.sql` editorのSQL highlightを`zizai-highlighter-sql`へ移行し、非SQL highlightとsuggest責務をApplication側へ残す。Workspace `.sql`にはBigQuery既定の方言選択を追加し、DuckDBへTab単位で切り替え可能にする。

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
- ノード詳細SQLはConnectorからBigQuery／DuckDBを自動判定し、方言選択を表示しない。
- Workspace `.sql`はBigQueryを既定とし、toolbarでDuckDBへ切り替えると現在のTabへ即時反映される。
- Workspaceの方言選択は開いているTabだけに保持し、SQL file／sidecar／Runtime stateへ保存しない。再度開いた場合はBigQueryへ戻る。
- Workspace text editorはTab直下から始まり、path表示行と再読み込み操作を表示しない。
- 保存は既存の保存iconで提供し、SQLの方言選択とともにeditor右上へ固定する。editor scroll後も位置を維持し、入力内容を隠さない。
- 非SQL text editorでは方言選択を表示せず、保存iconだけを同じ固定位置へ表示する。

Constraints:
- Python/JSON/template highlightとschema suggestを削除しない。
- SQL file内容、Bridge Protocol、Connector、vendor sourceを変更しない。

Tests:
- BigQuery/DuckDB token/decorations/style tests。
- file URL editor smoke。
- Workspace `.sql`のBigQuery既定、DuckDB即時切替、Tab単位session state、再open時BigQuery復帰。
- Workspace text editorのpath／再読み込み非表示、icon保存、SQL／非SQL別の固定操作欄、editor scroll後の位置不変。

Codex Verification:
- SQL以外のeditor回帰とruntime network 0を確認する。

### WP-5 Markdown Editor migration

Owner: claude-assist

Assignment Reason: Project ownerがWorkspace `.md` editor／visual viewを承認し、upstream lifecycle修正とApplication統合の境界が明確になったため。

Task: Workspace `.md`のsource入力、source highlight、`/`command suggest、visual viewを`zizai-editor-markdown`へ移行し、mode切替、save／dirty／conflict／close、external linkをApplication Adapterへ接続する。

Dependencies:
- WP-2、WP-4。
- 2026-08-26のProject ownerによるWorkspace `.md` editor／visual view決定。
- listenerを解放するWP-5Aのupstream revision。

Read Scope:
- `apps/gui/`のWorkspace/editor/navigation
- Markdown Editor source/test
- URL/navigation security contract

Edit Scope:
- 承認されたMarkdown/Workspace adapter領域
- 対応testとTask evidence

Acceptance Criteria:
- Workspace `.md`のsource入力、source highlight、`/`command suggestがlibrary API／eventを使う。
- `md:change`が既存Tab content／dirty stateへ反映され、既存save icon、save round-trip、conflict／close policyを維持する。
- open／再open時は表示modeから開始し、編集／表示をTab session内で切り替えられる。表示modeは未保存内容を自動保存せずpreviewする。
- 表示modeの先頭H1は本文先頭へ背景付き大見出しとして表示する。
- 表示modeでlibrary page treeを有効化し、本文内H2～H6を階層表示する。見出しがない場合はtreeを表示しない。
- library内蔵save button、document link／document suggestを有効化しない。`http:`／`https:`linkだけをApplication Adapter経由でOS外部browserへ開く。
- mount／destroy／remount後にlistener、suggestion DOM、component参照が残らない。

Constraints:
- libraryからBridgeを直接呼ばない。
- external URLは既存security boundaryを通し、内蔵WebViewを遷移させない。
- existing floating save icon、Tab、dirty／close behaviorを変更しない。

Tests:
- Markdown source input／highlight／`/`command suggest／初期表示／H1表示／page tree／mode切替／save／dirty／close／external link tests。
- mount／destroy／remount lifecycle test、file URL offline smoke。

Codex Verification:
- save round-trip、dirty／close、destroy後listener 0、初期表示、背景付きH1、page tree、external URL境界を確認する。

#### WP-5A Markdown Editor upstream lifecycle hardening

Owner: claude-assist

Assignment Reason: 不具合、期待cleanup、対象source、Test条件が明確で、upstream repository内でRED-GREENを完結できるため。

Task: `MarkdownEditor.destroy()`がhost click listener、所有DOM参照、suggestion stateを解放し、複数回呼出しとmount／destroy／remountを安全にする。

Dependencies:
- Project ownerによるsource-only placementとupstream-first方針の承認。

Read Scope:
- `zizai-editor-markdown` repositoryのREADME、source、sample、test／検証設定。

Edit Scope:
- `zizai-editor-markdown` repositoryのsource、test、必要なREADME lifecycle API記録。

Acceptance Criteria:
- `destroy()`が所有するhost listenerとDOM／suggestion参照を解放し、複数回呼んでも例外を生まない。
- mount／destroy／remountでclick、change、suggest eventが重複しない。

Constraints:
- Markdown Editorの表示、event payload、save／mode APIを変更しない。
- Claudeはcommit／pushを行わず、Codex独立検証後にProject owner確認で停止する。

Tests:
- upstream lifecycle browser TestをRED-GREENで追加し、既存upstream Testを実行する。

Codex Verification:
- 変更scope、listener解除、idempotent destroy、RED／GREEN証跡を確認し、対象Testを再実行する。

#### WP-5B Workspace Markdown source editor integration

Owner: claude-assist

Assignment Reason: 承認space、Application Adapter責務、除外機能、Test条件が明確で、Application内の限定統合を一括実装できるため。

Task: WP-5Aの確定revisionを再vendorし、Workspace `.md` source editorをMarkdown Editorへ移行する。

Dependencies:
- WP-5Aの承認済みupstream commitと再vendor。

Read Scope:
- Frontend Current Specification、TASK-016、Workspace editor／save／Tab／CSS、Markdown Editor source／test。

Edit Scope:
- `apps/gui/vendor/zizai-editor-markdown/`の確定source／LICENSE／README revision記録。
- Workspace Markdown Adapter、load order、theme CSS、対応test、Task evidence。

Acceptance Criteria:
- `.md` source input／highlight／`/`command suggestがlibraryを使い、旧plain textarea責務が重複しない。
- 既存save icon、dirty、save、conflict、close、Tab上限が維持される。
- open／再open時は表示modeから開始し、先頭H1を背景付きで本文先頭へ表示する。mode切替は自動保存しない。
- page treeは表示modeでH2～H6を階層表示する。document suggestは0であり、external linkはApplication Adapterのsecurity boundaryだけを通る。

Constraints:
- Bridge、Workspace persistence、Tab stateをlibraryへ渡さない。
- SQL／Python／JSON editorとvendor sourceを便乗変更しない。

Tests:
- Workspace `.md` open／edit／highlight／command suggest／save／dirty／close／remount Playwright。
- static load order／remote asset 0、Windows `file://` smoke。

Codex Verification:
- 確定SHA一致、初期表示／H1／mode境界、Application persistence、external URL boundary、既存editor回帰を独立検証する。

### WP-6 NodeForm migration

Owner: claude-assist

Assignment Reason: Project ownerによるspace決定後はfield UIとApplication固有責務の境界が明確で、Adapterと全field kind回帰を一括して実装できるため。

Task: 承認spaceのform生成・値・validationを`zizai-form`へ移行し、picker/coordinate、Excel／CSVアシスタント、Application固有補完をAdapterへ接続する。

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
- Excel／CSV取込nodeから既存アシスタントを開き、`stepName`、対象field、現在値、hidden bindingを渡せる。確定結果は設定済み`resultFieldMap`に従って元の`node.form`へ反映され、cancel時は変更しない。
- 重複field rendererだけが削除され、Application固有処理は残る。

Constraints:
- schema autoload、reference warning、runtime default、modal、code editorをlibrary責務へ混在させない。

Tests:
- NodeForm test、field schema fixture、picker/coordinate/validation integration。
- Excel／CSVそれぞれについて、NodeFormを含む実node detailから既存アシスタントを開き、Bridgeのfile／preview境界だけをtest doubleにして、入力引継ぎ、確定結果のform反映、cancel非変更を確認するApplication結合Test。

Implementation Sequence（Project owner承認: 2026-08-26）:
1. 既存node detailを使う失敗Testを先に追加し、汎用fieldの描画・値更新・validationとHost Adapter境界を固定する。
2. `zizai-form`をnode detailへmountし、file／dir pickerとmouse coordinate requestをApplication Adapterへ接続する。
3. schema autoload、reference warning、runtime default、Google auth、modal、code editorはApplication側に残して接続する。
4. Excel／CSVアシスタントについて、入力引継ぎ、`resultFieldMap`による確定結果、cancel非変更を実node detailから検証する。
5. 全TestがGREENになった後、NodeFormと重複する旧汎用rendererだけを整理し、既存editor／node detail回帰を実行する。

Execution Packages（2026-08-26再分割）:
- WP-6A（Owner: claude-assist）: NodeForm asset読込、実node detailへのmount、汎用fieldの描画・値更新・visible condition／export key／validationをTest先行で移管する。
- WP-6B（Owner: claude-assist、Depends on: WP-6A）: file／dir pickerとmouse coordinateをApplication-owned Host Adapterへ接続し、Application固有field処理の回帰を確認する。
- WP-6C1（Owner: claude-assist、Depends on: WP-6B）: Excel／CSVアシスタントの入力引継ぎ、確定結果mapping、cancel非変更を実node detailから結合Testする。
- WP-6C2A（Owner: claude-assist、Depends on: WP-6C1）: 全field kind fixtureを補完し、NodeForm routeとApplication legacy routeの境界をTestで固定する。
- WP-6C2B1（Owner: claude-assist、Depends on: WP-6C2A）: 中断された`ui.fields.js`の未検証削除だけを実行前状態へ復元し、既存回帰を確認する。
- WP-6C2B2（Owner: claude-assist、Depends on: WP-6C2B1）: renderer到達経路のbehavior Testを追加し、Application側に残す分岐と削除可能候補を固定する。
- WP-6C2B3（Owner: claude-assist、Depends on: WP-6C2B2）: Testで未到達と証明できた最小の重複分岐だけを削除し、全回帰を行う。安全な候補がなければno-opとする。
- WP-6D（Owner: claude-assist、Depends on: WP-6C2B3）: AppShell埋め込み時のmouse coordinate eventを実Bridge所有windowで監視し、取得したX／Yをnode formへ反映する。親子window境界の回帰Testを追加する。

Codex Verification:
- 全field kind、visible condition、export key、Application extension、Excel／CSVアシスタントとの往復を照合する。

### WP-7 DataViewer migration

Owner: claude-assist

Assignment Reason: lifecycle blocker解消済みrevisionとspace決定を前提に、viewer／Adapter／mount-unmount Testをまとまった実装単位として委譲できるため。

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

Owner: claude-assist

Assignment Reason: CodexとProject ownerが単一Document正本を決定した後は、Document Adapter、Designer統合、round-trip Testの完了条件を明確に限定できるため。

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

### Deferred from this Task: SQLFlowDesigner

`zizai-sqlflow-designer`は既存UI責務の移管ではなく新機能追加になるため、2026-08-25のProject owner判断でTASK-016から除外した。利用場面とspaceが承認された将来Taskで、WorkflowDesigner／SQL Highlighter依存、parser/viewer test、Application Adapterを改めて計画する。

### WP-10 CatalogPanel migration

Owner: claude-assist

Assignment Reason: Project ownerが用途、space、data source、保存先、permissionを決定した後は、Catalog Adapterと回帰Testの境界が明確になるため。

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

Task: 全7件の配置・Adapter・重複削除・security・license・verification evidenceを統合し、本Taskを完了判定する。

Dependencies:
- WP-3～WP-8、WP-10完了。

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
- 全7件の利用、owner-approved placement、duplicate UI 0がtrace可能である。
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
- 当初候補8 libraryのsourceと統合条件を調査し、配置は既存画面の移行時にProject ownerが決定する方針を確認した。
- 初期計画ではWork Package全件を`Owner: Codex`へ割り当てたが、後続の実装計画レビューでProject owner承認の`claude-assist`分担へ改定した。
- TASK-017の監査により、正本化WPをTASK-018、security behavior修正をTASK-019へ分離し、TASK-012とのRollback境界を固定した。
- TASK-019が完了し、library eventも通るexternal URL Application Adapterとnavigation boundaryが確立した。
- TASK-010とTASK-012が完了し、Source／Runtime config境界と`apps/gui/`のFrontend正規配置が成立した。
- Project ownerが2026-08-25にWork Package計画を承認し、WP-2～WP-8・WP-10を`claude-assist`、WP-11をCodexへ割り当てた。
- Claude Codeの利用枠が尽きた場合はCodexへ実装を移管せず、そのWork Packageで停止する運用を承認した。
- WP-2開始時に8 repositoryのdefault-branch HEADを再取得し、2026-08-23監査時の8 commit SHAから変更がないことを確認した。
- Claudeが取得済みsourceを照合し、DataViewer lifecycle、WorkflowDesigner CSS scope、SQLFlow automated testの3導入Gateが現行revisionでも未解消であることを確認した。vendor／Test／Application変更前にWP-2を停止した。
- Project ownerが現行Applicationに対応機能のない`zizai-sqlflow-designer`をTASK-016から除外し、将来の新機能Taskまで保留することを決定した。
- Project ownerがDataViewerとWorkflowDesignerを各repositoryで修正し、library単体とApplication結合Gateを通した新SHAをGitHubへ戻してからvendorする方針を承認した。
- WP-2Aを`zizai-data-viewer@d704238`で実装し、lifecycle browser Test `40 passed, 0 failed`をCodexが再実行した。GitHub PR `zizai-data-viewer#1`をmergeし、default branch revisionを`62998cf76fdda5afea0c52a16654e89ded555e49`へ更新した。
- WP-2Bを`zizai-workflow-designer@81d2f6b`で実装し、CSS contract、Node 5 suite、sample static verification、browser smoke 3件をCodexが再実行した。GitHub PR `zizai-workflow-designer#1`をmergeし、default branch revisionを`a8d1713dac14e29aa18f4723cb7c8c058e74beb2`へ更新した。
- WP-2のupstream TestでSQL Highlighter browser Testだけが旧paletteを期待する不整合を検出し、WP-2Cを追加した。`zizai-highlighter-sql@654a524`でTest期待値だけを修正し、Node Test 2件とbrowser Test `ALL TESTS PASSED`をCodexが再実行した。GitHub PR `zizai-highlighter-sql#1`をmergeし、default branch revisionを`9306ca2c87d5ba2857639f77c02d8fd8b1dfb4ed`へ更新した。
- WP-2で承認済み7 libraryの`src/`treeと`LICENSE`を`apps/gui/vendor/<library>/`へ同梱し、取得元URL、exact commit、runtime load order、手動更新／upstream-first方針を`apps/gui/vendor/README.md`へ記録した。
- vendor contractを先に追加し、同梱前のRED `28 failed, 22 passed`、同梱後のGREEN `50 passed`を確認した。取得元との一時SHA-256比較は7件すべて不一致0、Application `tests/static`は`103 passed`、7 libraryのNode／browser／static upstream TestはすべてPASSした。
- WP-3AでAppShellへApplication非依存のTab reorder／context action APIをTest-firstで追加した。upstream browser Testは機能未実装のRED `13 failed`、AppShell root外menuの回帰RED `1 failed`を経て全件PASSし、PR `zizai-app-shell#1`をmergeした（main `4b81f4ad4762e8ddd3d89d413874f71ecf84856b`）。
- WP-3Bでmerge済みAppShell `src/`／`LICENSE`を再vendorし、13 filesの名前差分0／SHA-256不一致0、vendor contract `50 passed`を確認した。
- WP-3Cで3画面のruntime load order、Application Tab state／close policy Adapter、同期destroyをTest-firstで接続した。load order RED `1 failed`、Tab操作／lifecycle RED `4 failed`を経て、AppShell操作7件とdetail panel回帰1件がPASSした。
- WP-3D自動検証はJavaScript構文3件、Playwright `8 passed`、vendor contract `50 passed`、`tests/static` `103 passed`、Windows WebEngine smoke `2 passed`。AppShell内部Tab DOMへのApplication依存0、旧shell／sidebar selector 0を確認した。実画面の手動smokeだけが未実施である。
- WP-3Eのうち上部2段表示をApplication側だけで修正した。window commandsと非interactive drag surfaceを既存の汎用`tabbar`へ移し、AppShell vendorは変更していない。Playwrightは期待どおりRED `2 failed, 7 passed`を確認後、GREEN `9 passed`、JavaScript構文確認PASS。2026-08-26にProject ownerがWindows実画面で1段表示を確認した。
- WP-3Eの残り2件は、hidden tabbar時にmain contentがAppShell gridのauto rowへ自動配置されること、旧padding補正の負margin、content-sized `main`を測る高さ計算が原因と確定した。修正済みTestのRED `3 failed, 2 passed`を確認後、Application CSSでmain contentをflexible rowへ固定し外枠overflowを抑止、Application JSでstretched hostとflow minimumから高さを計算するよう修正した。下部Test `5 passed`、上部を含むPlaywright `14 passed`、`tests/static` `103 passed`、WebEngine smoke `2 passed`、JavaScript構文確認PASS。
- 2026-08-26にProject ownerがWindows実画面で上部1段化、不要scrollbar解消、detail panel縮小時の空白解消を確認した。WP-3の手動GateをPASSし、AppShell移管を完了扱いとした。
- 2026-08-26にProject ownerがWP-4の利用spaceを承認した。BigQuery／DuckDBノード詳細SQLはConnectorから方言を自動判定し、Workspace `.sql`はBigQuery既定でTab単位のDuckDB切替を提供する。選択はsession-onlyとし、SQL file／sidecar／Runtime stateへ保存しない。
- WP-4をTest-firstで実装した。static RED `2 failed, 3 passed`とPlaywright RED `5 failed, 1 passed`を確認後、SQL tokenizerを`zizai-highlighter-sql`の公開`tokenize()` APIへ置換し、既存の`{{variable}}`装飾をrendering層として維持した。ノード詳細の方言自動判定、Workspace toolbar、Tab単位session state、再open時BigQuery復帰、runtime fetch 0を追加した。
- WP-4自動検証はJavaScript構文3件、`tests/static` `108 passed`、SQL／AppShell／detail panel／field warningの関連Playwright `22 passed`。vendor source、Bridge、Connector、SQL保存payloadは変更していない。Windows実画面の手動smokeだけが未実施である。
- WP-4手動確認前のProject owner指示により、Workspace text editorのpath表示行と再読み込み操作を削除し、Tab直下からeditor frameを表示するよう調整した。保存は既存`icons/save.svg`を使うicon-only操作へ変更し、SQLでは方言選択と保存icon、非SQLでは保存iconだけをeditor右上へ固定した。
- 上記UI調整はPlaywrightでRED `6 failed, 6 passed`を確認後に実装し、focused `12 passed`へGREEN化した。Codex独立検証はJavaScript構文、`tests/static` `108 passed`、SQL／AppShell／detail panel／field warningの関連Playwright `27 passed`。Windows実画面の手動smokeだけが未実施である。
- 2026-08-26にProject ownerがWindows実画面でWP-4のSQL方言選択、固定操作欄、save icon、path／再読み込み非表示を確認し、一旦OKとして手動GateをPASSした。WP-4 SQL Highlighter移管を完了扱いとした。
- WP-5Aをupstream一時cloneでTest-first実装した。`destroy()`が所有listener、保留中blur timer、DOM／suggestion参照を解放し、複数回destroyとmount／destroy／remountを安全にした。listenerは登録時と同一参照で解除するTestを含め、Codex独立再実行でbrowser Test `29 passed, 0 failed`。PR `zizai-editor-markdown#1`をmergeし、default branch revisionを`39f14305c1c6d9994fa6427cf805ffc8b3b02c69`へ更新した。
- WP-5Bでmain `39f14305c1c6d9994fa6427cf805ffc8b3b02c69`をbyte-identicalに再vendorし、Workspace `.md`だけをMarkdown Editorへ移行した。source input／highlight／slash-command suggestをlibrary APIへ接続し、Applicationのsave icon、dirty／save／close、Tab、file I/Oを維持した。built-in save、view／preview、page tree、document／external linkは有効化していない。
- WP-5BはPlaywright RED `7 failed`を確認後に実装し、テストhelperの独自dialog契約不整合を修正してGREEN `7 passed`。Codex独立検証はMarkdown `7 passed`、SQL／AppShell回帰 `21 passed`、`tests/static` `108 passed`、JavaScript構文PASS。Windows実画面の手動smokeだけが未実施である。
- WP-5B手動確認でsource-only配置にもlibraryの空toolbarが残り、Application save iconのheaderが認識しづらいことを確認した。表示TestのRED `1 failed, 7 passed`後、Application CSSだけで直下の空toolbarを隠し、既存44px headerとsave iconを維持した。Markdown／SQL／AppShell結合 `29 passed`。Windows実画面の再確認待ちである。

## Evidence

- `docs/handoffs/TASK-010-frontend-library-integration-audit.md`
- 8 repositoryの調査時revision
- TASK-012着手前のroot `static/`とTASK-012後の`apps/gui/`の移行契約
- 現行HEAD再照合（2026-08-25）: 8 repositoryすべて監査時SHAと一致。
- `zizai-data-viewer@30b34058f9dc8d76d1a154488d65c12cc6931d8c`: `src/report-viewer.js`に`destroy`／`off`がなく、`document` listenerと`document.body` menuの解放経路がない。
- `zizai-workflow-designer@42699ef3924f70e6452dc3c04ec0f5c580069d01`: `src/workflow_designer.css:283`のunscoped `:root`が残る。
- `zizai-sqlflow-designer@e4b43e5273c99a6e78f055fc0c9302b8b2506ddb`: automated test fileが存在しない。
- `zizai-data-viewer@62998cf76fdda5afea0c52a16654e89ded555e49`: idempotent `destroy()`、listener／body menu／timer／DOM参照cleanup、lifecycle browser Test 40件PASS。PR: `https://github.com/tomohiro-ono-works/zizai-data-viewer/pull/1`。
- `zizai-workflow-designer@a8d1713dac14e29aa18f4723cb7c8c058e74beb2`: theme tokenを`.zwd`へscopeし、誤った固定座標を使うsample smokeを実DOM位置基準へ修正。CSS contract、Node、static、browser smokeがPASS。PR: `https://github.com/tomohiro-ono-works/zizai-workflow-designer/pull/1`。
- `zizai-highlighter-sql@9306ca2c87d5ba2857639f77c02d8fd8b1dfb4ed`: 現行CSS／Node style contractへbrowser computed-style期待値を整合。source／表示変更なし。PR: `https://github.com/tomohiro-ono-works/zizai-highlighter-sql/pull/1`。
- `apps/gui/vendor/README.md`: 7件の取得元URL、exact commit、LICENSE、runtime load order、更新方針。
- `tests/static/test_frontend_library_vendor_contract.py`: directory、manifest、LICENSE、runtime entry、不要content、remote asset、global CSS selectorの50-case contract。
- `zizai-app-shell@4b81f4ad4762e8ddd3d89d413874f71ecf84856b`: generic `tab:reorder-request`／`tab:context-action`、root内context menu、lifecycle cleanup。PR: `https://github.com/tomohiro-ono-works/zizai-app-shell/pull/1`。
- WP-3 Application自動検証（2026-08-25）: `ui-shell.spec.js`＋`detail-panel-left-gap.spec.js` 8件、vendor contract 50件、`tests/static` 103件、`test_webengine_smoke.py` 2件がPASS。
- WP-3E上部1段化（2026-08-26）: `ui-shell.spec.js`でwindow controls／Tab同一行とblank tabbar drag／Tab操作を実挙動検証し、9件PASS。
- WP-3E layout回帰修正（2026-08-26）: `detail-panel-left-gap.spec.js`で外枠overflow 0、inner scroll維持、実mouseによるdetail panel縮小／拡大とflow minimum／bottom gapを検証し、5件PASS。`ui-shell.spec.js`との結合14件もPASS。
- WP-4 SQL Highlighter（2026-08-26）: `test_sql_highlighter_adapter_contract.py` 5件と`sql-highlighter.spec.js` 7件がPASS。SQL library load order、BigQuery／DuckDB自動判定、Workspace方言切替とsession境界、`{{variable}}`装飾、Python非回帰、runtime network 0を検証した。関連回帰を含むPlaywright 22件、`tests/static` 108件、JavaScript構文3件がPASS。
- WP-4 Workspace editor floating actions（2026-08-26）: path／再読み込み非表示、既存save icon、SQL／非SQL別の固定操作欄、editor scroll後の位置不変、保存挙動、操作欄と内容の非重複を`sql-highlighter.spec.js`へ追加した。focused 12件、関連回帰27件、`tests/static` 108件、JavaScript構文がPASS。
- WP-5A Markdown Editor lifecycle hardening（2026-08-26）: PR `https://github.com/tomohiro-ono-works/zizai-editor-markdown/pull/1`をmergeし、main `39f14305c1c6d9994fa6427cf805ffc8b3b02c69`へ更新した。`src/markdown_editor.js`、`test/test.js`、`README.md`だけを変更。listener同一参照解除、blur timer cleanup、idempotent destroy、remount時の旧event非残存を含むbrowser Test `29 passed, 0 failed`をCodexが独立確認した。
- WP-5B Workspace Markdown source editor（2026-08-26）: vendorの`LICENSE`／CSS／JSはupstream main `39f14305c1c6d9994fa6427cf805ffc8b3b02c69`とSHA-256一致。`markdown-editor.spec.js` 7件でsource-only UI、highlight、slash-command suggest、document suggestion非表示、既存save round-trip、非view化、destroy／remount、runtime fetch 0を確認した。関連回帰21件、`tests/static` 108件、JavaScript構文もPASS。
- WP-5B source-only header visibility（2026-08-26）: `.workspace-markdown-editor-host`直下の操作なしlibrary toolbarだけをApplication CSSで非表示化。既存save iconがeditor frame／viewport内かつhit-test可能であるTestを追加し、RED `1 failed, 7 passed`からGREEN化。Markdown／SQL／AppShell 29件PASS。
- WP-5BのProject owner訂正により、Application所有の編集／表示toggle、未保存内容preview、external `http:`／`https:` linkのOS browser委譲を追加した。unsafe schemeとdocument linkは無効のまま維持し、vendor sourceは変更していない。
- 2026-08-26のProject owner確認でmode toggleは表示されたが、libraryが先頭H1を非表示toolbarへ移して本文から除去する問題を確認した。open／再open時の初期modeを表示へ変更し、先頭H1をlibrary既存`.mce-article-title`背景付きで本文先頭へ復元した。RED `3 failed, 9 passed`からMarkdown `12 passed`へGREEN化し、SQL／AppShell回帰 `21 passed`、JavaScript構文確認PASS。
- 2026-08-26のProject owner承認により、表示modeのlibrary page treeを有効化した。背景付きH1は文書タイトルとして独立表示し、本文H2～H6を採番付き階層treeへ表示、項目clickで該当見出しへscrollする。Claude SonnetがApplication option 1行を変更し、CodexがRED `1 failed`からfocused `1 passed`、Markdown全体 `13 passed`、SQL／AppShell回帰 `21 passed`、`tests/static` `108 passed`、JavaScript構文PASSを独立確認した。vendor sourceは変更していない。
- 2026-08-26にProject ownerがWindows実画面で初期表示、背景付きH1、H2～H6 page tree、編集／表示切替を確認し、WP-5の手動GateをPASSした。WP-5 Markdown Editor移管を完了扱いとした。
- WP-6A NodeForm generic field migration（2026-08-26）: vendor CSS／JSをlocal loadし、実node detailへApplication Adapter経由でmountした。`allowVars`、schema／code editor、Google auth等のApplication拡張はlegacy rendererへ残し、generic／legacy fieldが交互でもschema順を維持する。TDDでfocused RED `2 failed, 3 passed`からGREEN `5 passed`、関連Playwright回帰 `40 passed`、`tests/static` `108 passed`、JavaScript構文確認PASS。Claude Sonnetが初期実装と退行Testを担当し、権限制御で再適用できなかった小規模GREEN修正と誤ったTest selector 2件をCodexが修正・独立検証した。
- WP-6B NodeForm Host Adapter（2026-08-26）: `file`／`dir`／`mouse-coordinate-picker`をNodeFormへ接続し、file／folder pickerとmouse coordinate captureをApplication-owned Adapterから既存Bridge contractへ委譲した。cancel／error、capture相関、destroy／remount時listener解除、`allowVars` legacy維持、hidden bindingの`current_ref`と選択結果metadata保存をTestした。TDDでWP-6B RED `7 failed`、hidden binding追加RED `1 failed`から、WP-6A＋WP-6B focused `13 passed`、関連Playwright回帰 `40 passed`、`tests/static` `108 passed`、JavaScript構文確認PASSへGREEN化した。Claude Sonnet実装後、Codexがhidden binding差分を検出して追加修正を依頼し、独立検証した。
- WP-6C1 Excel／CSV assistant integration（2026-08-26）: 実`CSVConnector.read_csv`／`ExcelConnector.read_excel` node detailから実assistant modalを開き、`stepName`、対象field、現在値、同一`hiddenBindings` objectの引継ぎ、`resultFieldMap`による確定結果、cancel非変更を4件のApplication結合Testで固定した。OS／preview Bridge境界だけをdoubleとし、production変更は不要だった。WP-6A～WP-6C1 focused `17 passed`をClaude SonnetとCodexがそれぞれ確認した。
- WP-6C2A field route fixtures（2026-08-27）: NodeForm-owned 13 kindのcontrol／default／edit／`getParams`／validation／`visible_if`／`exportKey`／display-only export除外と、Application legacy／special routeを7件のfixture Testで固定した。production変更は不要で、WP-6A～WP-6C2A focused `24 passed`をCodexが確認した。
- WP-6C2B1 interrupted cleanup recovery（2026-08-27）: 中断時に`ui.fields.js`へ残った未検証の大量削除を実行前状態へ復元した。同fileの内容diff／numstatは0、JavaScript構文PASS、WP-6＋関連回帰 `37 passed`をClaude SonnetとCodexが独立確認した。status上の`M`は`core.autocrlf=true`によるLF／CRLF表示差で、内容差分はない。
- WP-6C2B2 renderer routing behavior test（2026-08-27）: 実`renderNodeDetail`と実`ui.fields.renderField`を使う透過的な到達経路テストを追加した。NodeForm移管済みfield、Application側に残す`allowVars`・Google認証・`input_data`・`source_step_id`・schema特殊処理・未知kind、および動的schema／参照警告の責務を固定し、指定回帰は`44 passed`。production codeの内容差分はない。
- WP-6C2B3 safe cleanup decision（2026-08-27）: Claude Opusが旧汎用rendererの各分岐を到達経路別に再評価した。通常経路ではNodeForm所有でも、NodeForm Adapter不在時のproduction fallbackと公開`renderField` APIから到達可能なため、安全に削除できる分岐は0件と判断し、承認済み条件どおりno-opとした。Claude実行前に指定回帰`44 passed`、実行後に対象production 3 fileの内容diff 0をCodexが確認した。
- WP-6D root cause（2026-08-27）: Project ownerのWindows実画面確認でmouse coordinate取得後もX／Yが未入力になることを確認した。親AppShellの`ziz:evt`では未反映、同一payloadを子dataflow windowへ送ると反映される最小診断TestがPASSし、NodeForm Host Adapterが親Bridgeを利用しながら子windowだけを監視している親子境界不整合を原因と特定した。Project ownerが最小修正と埋め込み回帰Testを承認した。
- WP-6D embedded coordinate fix（2026-08-27）: NodeForm Host Adapterが利用可能なBridgeと同じwindowをevent targetとして解決し、attach／detachで同一targetを使用するよう修正した。実AppShell親windowにだけ相関済み`mouse.coordinateCapture.selected`を送る回帰Testを追加し、X／Yの`node.form`と表示input更新を固定した。TDDでRED `1 failed, 8 passed`からfocused `9 passed`へGREEN化し、関連Playwright `45 passed`、`tests/static` `108 passed`、JavaScript構文確認PASSをCodexが独立確認した。
- WP-6D Windows manual follow-up（2026-08-27）: 初回修正後もボタンが座標取得中のままになる事象をProject ownerが確認した。境界traceによりBridge requestとoverlay表示は成功し、overlayの`mousePressEvent`だけが未到達と特定した。Qtのtranslucent windowでは未描画pixelがmouse inputを受けない仕様に合わせ、overlay全面を描画し既存window opacity `0.01`で視覚影響を抑える修正を追加した。Project ownerがX／Y反映をWindows実画面で確認し、一時traceを全削除した。最終確認は関連Playwright `45 passed`、`tests/static` `108 passed`、Python構文確認PASS。
- WP-6 Project owner manual Gate（2026-08-27）: CSV／Excelアシスタントの確定反映・cancel非変更、file／folder picker、通常field編集・validation、変数候補、Google認証、mouse coordinate取得をWindows実画面で確認し、全項目PASS。WP-6 NodeForm migrationを完了扱いとした。

## Remaining

- WP-6以降も各libraryの利用spaceをProject ownerが順次決定し、承認されたspaceだけを移行する。
- SQL editor header余白、BigQueryを基準とするshortcut／selection／部分実行、予約語／column suggestは、同一releaseへ含めずTASK-020で初回release後に検討する。

## Exact next action

WP-7 DataViewer migrationの着手前reviewとして、承認space、変更方針、影響範囲をProject ownerへ提示する。

## Termination condition

全7 libraryがProject owner承認spaceで使用され、Application側の同一UI責務が削除され、全Acceptance criteriaとVerification GateがPASSしてEvidenceが保存されること。
