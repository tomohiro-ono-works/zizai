# TASK-016 Adopt Approved Frontend Libraries

## Status

Completed — WP-11 required/e2e/WebEngine/manual/offline Gates GREEN (2026-09-07)

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
- Workflow Document正本: 決定済み。Project ownerが2026-08-29にApplicationのcurrent workflow stateを唯一の正本とし、Adapterがlibrary用Document projectionを都度生成する方針を承認した（WP-8、`docs/features/frontend-libraries.md`）。
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
- `docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`
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
- vendor記録と同梱内容を照合し、7 commit identifier、LICENSE、runtime load順を確認する。

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
- `docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`

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

Task: 承認spaceのtable／schema UIを`zizai-data-viewer`へ移行し、既存Bridgeの先頭100行Previewをlocal modeへ接続する。全件data機能はTASK-023、export実処理はTASK-022へ分離する。

Dependencies:
- WP-2。
- destroy/offを備える承認済みlibrary revision。
- 対象spaceのProject owner決定。

Read Scope:
- `apps/gui/`のdata/schema/preview領域
- DataViewer source/test
- Bridge result preview contract

Edit Scope:
- 承認されたdata viewer/adapter領域
- 対応testとTask evidence

Acceptance Criteria:
- schemaと先頭100行PreviewがAdapter経由でround-tripする。
- TASK-022完了前は利用不能なCSV／Excel／clipboard操作を表示しない。
- TASK-023完了前は利用不能なpaging／distribution／全件数操作を表示しない。
- 初期版は既存Previewの100行上限を維持し、column／cell文字数／payload byte上限を新設しない。上限候補はTASK-023で調査する。
- DataViewer内蔵execute操作を表示せず、既存のノード実行操作とlock制御を維持する。
- schema編集可能なdata nodeは帳票／カラム設定／JSON編集、schema編集を持たないdata nodeは帳票だけを表示する。non-data nodeではDataViewerをmountせず、distributionはTASK-023まで表示しない。
- libraryの汎用`features`設定で無効化したtab／execute／exportは、対応DOM、body menu、document listenerを生成しない。使用するpopupはDataViewer root内へ配置する。
- 不正schema JSONでも元textとvalidation errorをJSON編集画面へ表示し、修正して`適用`が成功するまで帳票／カラム設定を無効化する。自動補正・自動保存しない。
- mount/unmount後にdocument listener/body menuが残らない。
- 重複table/schema rendererが0である。

Constraints:
- SQL実行、集計、file生成、clipboard writeをlibrary内部へ移さない。

Tests:
- DataViewer browser tests。
- preview/schema integrationとrepeated mount/unmount test。

Codex Verification:
- lifecycle leak、Preview 100行上限、旧renderer参照0を確認する。

#### Current WP-7 initial delivery decomposition

End State: ノード詳細下部のdata領域がDataViewerを単一rendererとして使用し、既存Bridgeの先頭100行Previewをlocal modeで表示する。schema編集は既存4 fieldを欠落なく保存し、初期版で利用不能なexecute／paging／distribution／exportを表示しない。Bridge、Connector、Workflow Engineは変更しない。

Goal Traceability:
- DataViewerへ汎用feature configurationとroot内popup／lifecycleを追加する → WP-7I-A。
- 既存schemaを壊さない編集／回復contractをlibraryへ追加する → WP-7I-B。
- Test済みupstream revisionだけをApplicationへ同梱する → WP-7I-C。
- 先頭100行Previewと既存schema保存をApplication Adapterへ接続し、旧rendererを置換する → WP-7I-D。
- lifecycle、schema round-trip、100行境界、Windows表示を独立検証する → WP-7I-E。

Critical Path: `WP-7I-A generic feature/lifecycle → WP-7I-B schema compatibility → WP-7I-C GitHub反映・再vendor → WP-7I-D Application統合 → WP-7I-E自動・手動検証`。

Parallel Work: None。WP-7I-A／Bは同じupstream source、WP-7I-Dは確定vendor APIへ依存するため直列実行する。

Task Graph Changes: 2026-08-28のProject owner判断で、Python結果Storeと分割転送を初期版へ追加しない。full-data planは実行せずTASK-023へ、exportはTASK-022へ分離する。

Deferred Decisions: None for initial delivery。5,000行page、全件sort／filter、全件数、上位30区分distribution、virtualization、payload byte上限はTASK-023、CSV／Excel／clipboardはTASK-022で扱う。

#### WP-7I-A DataViewer generic feature and lifecycle controls

Owner: claude-assist

Assignment Reason: featureごとのDOM生成とlifecycle解放は公開APIが確定しており、通常のTest-first実装としてClaude Sonnetへ委譲できるため。

Task: 一時cloneした`zizai-data-viewer@62998cf76fdda5afea0c52a16654e89ded555e49`へ汎用`features`設定を追加し、無効なtab／execute／exportのDOMとlistenerを生成せず、popupをcomponent root内へ閉じる。

Dependencies:
- `docs/features/frontend-libraries.md`のWP-7初期版仕様。
- CodexがApplication Worktree外の一時directoryへcloneし、専用`codex/`branchを作成する。

Read Scope:
- upstream `README.md`
- upstream `src/`
- upstream `test/`
- upstream `sample/`

Edit Scope:
- upstreamの承認されたsource、test、README、sampleだけ。

Interfaces:
- constructorの汎用`features`設定でreport、columns、json、distribution、execute、exportを個別に制御する。
- 既存consumerで`features`省略時は現行機能を維持する。
- 無効featureは対応DOM、menu、document listener、timerを生成しない。

Acceptance Criteria:
- `features`省略時の既存4 tab／execute／export behaviorを維持する。
- 任意のtab組合せを描画でき、active tabが無効な場合は最初の有効tabへ安全に移る。
- export無効時はbutton、body menu、export listenerが存在しない。
- 使用するfilter／menu popupはDataViewer root内に配置される。
- `destroy()`後にdocument listener、menu、timer、DOM参照、event通知が残らない。
- Application、Bridge、node、Connector等の固有概念を追加しない。

Constraints:
- dependency、build、bundle、remote assetを追加しない。
- Claudeはcommit、push、PR、mergeを行わない。

Tests:
- upstream unit／browser Testへdefault互換、feature組合せ、popup scope、destroyを追加する。

Codex Verification:
- 公開APIの汎用性、default互換、無効DOM 0、root scope、lifecycle解放を確認する。

#### WP-7I-B DataViewer lossless schema editing

Owner: claude-assist

Assignment Reason: unknown type、invalid JSON、表示値と保存値、commit timingが相互作用するため、Claude OpusでTest-firstに固定する必要があるため。

Task: DataViewer schemaへoptional description、任意type identifier、非破壊的表示fallback、不正JSON回復、確定単位eventを汎用機能として追加する。

Dependencies:
- WP-7I-A。

Read Scope:
- WP-7I-A後のupstream schema／columns／JSON／report sourceとtest。

Edit Scope:
- upstreamのschema／columns／JSON関連source、test、README、sampleだけ。

Interfaces:
- schema columnは`id`、`label`、optional `description`、任意`type`、visible／sortable／filterableを保持する。
- unknown typeはidentifierを保持し、cell表示／sort／filterだけをstring相当として扱う。
- 表示fallbackと保存値を分離し、空labelを自動的にidへ書き換えない。
- invalid raw schema textをJSON編集画面へ渡し、修正後にvalidate／applyできる。
- schema changeは変更fieldとcommit reasonを通知し、入力途中では通知しない。

Acceptance Criteria:
- descriptionとunknown typeがcolumns／JSON／eventを往復して欠落しない。
- `BYTES`、`TIME`、`INTERVAL`、`ARRAY<T>`、`STRUCT<...>`をstring相当で扱い、明示変更までtype identifierを維持する。
- 空labelは表示時だけidを補助表示し、別field編集でも空の保存値を維持する。
- 列名／説明はEnterまたはblur、typeは選択直後、JSONは`適用`で1回だけeventを通知し、Escapeは未確定textを破棄する。
- invalid JSON／duplicate id／missing idでもJSON編集とerror表示を利用でき、他tabは修正完了まで無効になる。
- invalid contentを自動補正・自動保存しない。

Constraints:
- Application固有の`origin_name`、`new_name`、`ziz_datatype`というfield名をlibrary APIへ追加しない。
- Claudeはcommit、push、PR、mergeを行わない。

Tests:
- upstream unit／browser Testへdescription、unknown type、empty label、commit timing、Escape、invalid JSON recoveryを追加する。

Codex Verification:
- 破壊的normalizeがないこと、event回数、invalid stateからの回復、Application固有語0を確認する。

#### WP-7I-C Publish boundary and re-vendor DataViewer

Owner: Codex

Assignment Reason: upstream差分、commit identifier、vendor内容、LICENSE、load orderを照合し、Application Worktreeへ未検証sourceを混在させないため。

Task: WP-7I-A／BのTest済みsourceをupstream local commitとして確定し、Project ownerのpush承認後にGitHubへ反映して、そのexact SHAを再vendorする。

Dependencies:
- WP-7I-A／B GREEN。
- remote pushはProject ownerの明示承認。

Read Scope:
- upstream全差分／Test結果
- `apps/gui/vendor/README.md`
- `tests/static/test_frontend_library_vendor_contract.py`
- `docs/decisions/ADR-frontend-library-vendoring.md`

Edit Scope:
- upstream repositoryのlocal commit
- `apps/gui/vendor/zizai-data-viewer/`
- `apps/gui/vendor/README.md`
- pinned revision static Test

Acceptance Criteria:
- vendor sourceがGitHubへ反映済みの記録SHAと一致する。
- LICENSEとruntime load orderが維持される。
- Application Worktreeにclone metadata、upstream artifact、cacheを置かない。

Constraints:
- Project owner承認前にpushしない。
- vendor copyだけへ独自patchを追加しない。

Tests:
- upstream full Test。
- vendor/source一致、license、load-order、pinned revision static Test。

Codex Verification:
- GitHub SHA、vendor内容、manifest、Worktree状態を照合する。

#### WP-7I-D DataViewer local Preview and schema integration

Owner: Codex

Assignment Reason: Project ownerの指定によりClaudeを使用せず、Codex Terra（xhigh）subagentが実装し、Codex主agentが仕様適合・差分・Testを独立検証するため。

Task: DataViewer Application Adapterを追加し、既存`result.getPreview`の先頭100行、result schema、既存node schema保存を接続する。旧schema／preview rendererは結合Gate通過後に削除する。

Dependencies:
- WP-7I-C。

Read Scope:
- `apps/gui/js/ui.node.detail.js`
- `apps/gui/js/ui.fields.js`のschema入力／JSON編集／data output renderer
- node schema state／save経路
- Bridge Adapterと`result.getSchema`／`result.getPreview`
- data panel CSS／HTMLと関連Playwright Test

Edit Scope:
- DataViewer Application Adapter
- node data panel integration／CSS／asset load order
- `ui.fields.js`と`ui.node.detail.js`のDataViewerと重複する旧schema／preview描画
- 対応JS／Playwright Test

Acceptance Criteria:
- Previewは既存Bridgeの先頭100行だけを使用し、library local modeのsort／filter／resizeを同sampleへ適用する。
- filter候補へ「プレビュー内の候補」と表示する。
- `origin_name`、`new_name`、`description`、`ziz_datatype`を欠落なく既存node paramsへ反映する。
- unknown type、空`new_name`、invalid JSON、commit timingがCurrent Specificationどおり動作する。
- schema編集可能nodeは帳票／カラム設定／JSON、schema編集なしdata nodeは帳票だけを表示する。
- non-data nodeではDataViewerをmountしない。
- execute、paging、distribution、全件数、CSV／Excel／clipboardを表示しない。
- 既存`dataRequestSeq`を再利用し、遅いPreview応答が現在nodeを上書きしない。
- 旧schema／preview rendererが通常経路に残らない。

Constraints:
- Bridge、Connector、Workflow Engine、protocol-v1を変更しない。
- libraryへBridge object、path、DataFrame、node／Connector objectを渡さない。
- schema保存形式を変更しない。

Tests:
- Adapter Unit: schema mapping、unknown type、empty name、feature selection、request sequence。
- Browser Integration: 100行Preview、local sort／filter、schema form／JSON、invalid recovery、node切替。
- repeated mount/unmount Test。

Codex Verification:
- Bridge／Backend差分0、schema round-trip、100行上限、旧renderer通常到達0を確認する。

#### WP-7I-E DataViewer initial migration verification

Owner: Codex

Assignment Reason: upstream、vendor、Application統合を実装担当と独立して確認し、初期版と将来Taskの境界を守るため。

Task: WP-7初期版の自動Gateを実行し、Windows manual smoke項目をProject ownerへ提示してEvidenceを記録する。

Dependencies:
- WP-7I-C／D GREEN。

Read Scope:
- WP-7初期版の全差分、仕様、upstream／Application Test結果。

Edit Scope:
- 必要な承認済みtest修正とTASK-016 Evidence／statusだけ。

Acceptance Criteria:
- 帳票、local sort／filter、column resize、schema edit／save／reopen、invalid recoveryを確認する。
- 100行を超えるPreviewを受け取らず、全件機能とexport操作が表示されない。
- node/tab切替とrepeated mount/unmountでstale response、menu、listener、timerが残らない。
- non-data node、未実行、0件、errorが回帰しない。
- required／e2e GateとWindows manual smokeがPASSする。

Tests:
- upstream full Test。
- focused JS／Playwright Test。
- `tests/run-verification.ps1 -Gate required`。
- `tests/run-verification.ps1 -Gate e2e`。
- Project owner Windows manual smoke。

Codex Verification:
- Acceptance criteria、Bridge／Backend差分0、旧renderer通常到達0、Worktree状態を最終照合する。

#### Superseded WP-7 full-data delivery decomposition

この節のWP-7A～WP-7Eは、2026-08-28のProject owner判断により実行しない。Python結果Store、分割転送、5,000行page、全件sort／filter、distribution、virtualizationはTASK-023へ、exportはTASK-022へ分離した。実行対象は直前のWP-7I-A～WP-7I-Eだけとする。

End State: ノード詳細下部のdata領域がDataViewerを単一rendererとして使用し、既存schemaを欠落なく編集・保存できる。全件処理はPython、page描画はFrontendへ分離され、5,000行固定pageと遅延distributionが動作する。CSV／Excel／clipboardの実処理はTASK-022へ分離される。

Goal Traceability:
- Application非依存のremote mode、virtualized rendering、schema descriptionをlibraryへ追加する → WP-7A。
- Test済みupstream revisionだけをApplicationへ同梱する → WP-7B。
- 全件sort／filter、5,000行page、遅延distributionをPython/Application境界に実装する → WP-7C。
- DataViewer eventを既存schema、実行、Bridgeへ接続し、旧preview rendererを置換する → WP-7D。
- lifecycle、large payload、stale response、round-trip、Windows表示を独立検証する → WP-7E。

Critical Path: `WP-7A upstream Test-first実装 → WP-7B local commit確定・再vendor → WP-7C Python query/export Adapter → WP-7D Application統合 → WP-7E自動・手動検証`。

Parallel Work: WP-7Aで公開event／method contractを確定した後、WP-7CのPython処理はWP-7Bの配布準備と独立して進められる。ただし同じClaude利用枠とrevision管理を単純にするため本sessionでは直列実行する。

Task Graph Changes: 2026-08-27のProject owner reviewで、既存local-only libraryをそのまま接続すると5,000行pageを超える全件sort／filter、遅延distribution、Python全件exportを正しく提供できないと確認した。WP-7をupstream、vendor、backend、Application統合、verificationの5境界へ分解する。

Deferred Decisions: CSV／Excel／clipboardはTASK-022へ分離し、本WPでは決定・実装しない。page size、query scope、distribution timing、上位30区分、未対応型の文字列相当表示と型名保持、schema round-tripはProject ownerが2026-08-27に承認済み。

#### WP-7A DataViewer remote mode and large-table rendering

Owner: claude-assist

Assignment Reason: 公開APIと性能要件が確定しており、難しいvirtualizationとout-of-order stateをClaude OpusでTest-first実装する境界として独立しているため。

Task: 一時cloneした`zizai-data-viewer@62998cf76fdda5afea0c52a16654e89ded555e49`へ、既存local modeを壊さない汎用remote data mode、virtualized row rendering、loading表示、tab通知、optional descriptionを追加する。

Dependencies:
- `docs/features/frontend-libraries.md`のWP-7承認仕様。
- CodexがApplication Worktree外の一時directoryへcloneし、専用`codex/`branchを作成する。

Read Scope:
- upstream `README.md`
- upstream `src/`
- upstream `test/`
- upstream `sample/`

Edit Scope:
- upstreamの承認されたsource、test、README、sampleだけ。

Interfaces:
- local modeをdefaultとし、remote modeではsort／filter／page操作から全query stateを汎用eventで通知する。
- 外部consumerがpage rows、page情報、loading／errorを原子的に更新できる公開methodを持つ。
- active tab変更を通知し、distributionの遅延取得をconsumerが判断できる。
- schema columnはoptional `description`と任意のtype identifierを保持し、column設定とJSON編集でround-tripする。libraryが認識しないtype identifierは値を変更せず、表示、sort、filterだけを文字列相当として扱う。
- virtualizationはrow数やApplication固有page sizeを固定せず、library inputに対して汎用的に動作する。

Acceptance Criteria:
- local modeの既存sort／filter／page behaviorと公開eventを維持する。
- remote modeではlibraryが受信page外をsort／filterしたふりをせず、query stateを1回通知して外部結果を待つ。
- remote modeの候補一覧は受信pageの最大5,000行だけから作り、「現在ページの候補」と明示する。候補選択または手入力した条件はquery eventとして外部へ通知する。
- 5,000行を設定してもviewport外rowをDOMへ全展開せず、scroll後に正しいrowと連番を描画する。
- loading中の重複queryを制御でき、error／empty／page range／元データ全件数の表示をconsumer入力から区別できる。filter後件数はpaging制御だけに使い表示しない。
- `description`を含むschemaのcolumns view／JSON view／`schemachange`で情報が欠落しない。
- `BYTES`、`TIME`、`INTERVAL`、`ARRAY<T>`、`STRUCT<...>`等の未知typeが文字列相当で動作し、明示変更されない限り元type identifierを維持する。
- 列名／説明はEnterまたはblur、型は選択直後、JSONは`適用`で1回だけ変更を通知し、Escapeは未確定の列名／説明を破棄する。
- `destroy()`後にdocument listener、body menu、scroll handler、timer、DOM参照、event通知が残らない。
- Bridge、DataFrame、Connector、step、file path、clipboard等のApplication固有概念をsourceへ追加しない。

Constraints:
- dependency、build、bundle、remote assetを追加しない。
- Claudeはcommit、push、PR、mergeを行わない。

Tests:
- upstream unit／browser testにlocal互換、remote query、virtual scroll、description、loading／error、destroyを追加する。
- 5,000行fixtureで実DOM row数がviewport相当へ制限されることを確認する。

Codex Verification:
- 公開APIの汎用性、local互換、DOM上限、lifecycle解放、Application固有語0を差分とTestで確認する。

#### WP-7B Publish boundary and re-vendor DataViewer

Owner: Codex

Assignment Reason: upstream差分、commit identifier、vendor内容、LICENSE、load orderを同一人物が照合し、Application Worktreeへ未検証sourceを混在させないため。

Task: WP-7AのTest済みsourceをupstream local commitとして確定し、Project ownerのpush承認後にGitHubへ反映して、そのexact SHAを`apps/gui/vendor/zizai-data-viewer/`へ再vendorする。

Dependencies:
- WP-7A GREEN。
- remote pushはProject ownerの明示承認。

Read Scope:
- WP-7A差分とTest結果
- `apps/gui/vendor/README.md`
- `docs/decisions/ADR-frontend-library-vendoring.md`

Edit Scope:
- upstream repositoryのlocal commit
- `apps/gui/vendor/zizai-data-viewer/`
- `apps/gui/vendor/README.md`

Acceptance Criteria:
- vendor sourceが記録SHAのupstream sourceと一致する。
- LICENSEとruntime load orderが維持される。
- Application Worktreeにclone metadata、upstream test artifact、cacheを置かない。

Constraints:
- Project owner承認前にpushしない。
- vendor copyだけへ独自patchを追加しない。

Tests:
- upstream full Test。
- vendor/source一致check、license/load-order static check。

Codex Verification:
- `git diff`、取得元SHA、vendor内容、Worktree cleanlinessを照合する。

#### WP-7C Result query and distribution Application service

Owner: claude-assist

Assignment Reason: 既存DataFrame resultとBridge payloadの範囲内で、型別query、page、集計、file生成をTest-first実装するbounded backend作業としてClaude Sonnetへ委譲できるため。

Task: 既存Bridge Protocol 1.0のcommand数を変えず、`result.getPreview`と`result.getDatavolume`の追加payload scopeで、全件sort／filter後の5,000行page、total、遅延distributionをApplication側に実装する。

Dependencies:
- WP-7Aのquery／page／distribution／export interface確定。

Read Scope:
- `apps/desktop/bridge.py`
- `apps/desktop/host.py`のnative dialog／clipboard callback境界
- `apps/common/contracts/bridge/protocol-v1.json`
- result/schema関連Test

Edit Scope:
- 承認されたDesktop Application service／Bridge payload処理
- 対応Python Unit／Integration Test
- payload contractの正本文書

Interfaces:
- page sizeはApplication側で5,000へ固定し、consumer指定で上限を拡張できない。
- sort／filterは元DataFrame全件へ型を考慮して適用し、offset page、paging制御用filtered total、表示用unfiltered totalを返す。
- distributionは元DataFrame全件を対象とし、明示要求時だけ既存`result.getDatavolume`経路で列ごとの件数上位30区分を集計する。31位以下を`その他`へ集約しない。
- 既存payload省略時の先頭100行Preview互換を維持する。

Acceptance Criteria:
- Frontendへ返すrow payloadが1 requestあたり5,000行を超えない。
- string、integer、decimal、boolean、date／datetime／timestampのsort／filter境界を検証する。
- stable sort、null、duplicate、0件、offset末尾、無効条件を決定的に処理する。
- 31区分以上を持つcolumnのdistribution responseが上位30件で安定し、31位以下を含まない。
- TASK-022より先にexport用Bridge、native dialog、Connector、clipboardを変更しない。

Constraints:
- Bridge Protocol 1.0の31 Command／8 Eventとenvelopeを維持する。
- DataFrame全体をJSON responseへ直列化しない。
- Connector実装を変更しない。

Tests:
- Python Unit: query型、paging、distribution、legacy preview。
- Integration: Bridge envelope、invalid payload。
- 100,000行以上のfixtureでresponse row上限と処理完了を確認する。

Codex Verification:
- payload row数、Protocol command数、Connector差分0を確認する。

#### WP-7D DataViewer Application Adapter and data-space migration

Owner: claude-assist

Assignment Reason: library event、既存node state、Bridge、schema field、旧renderer置換の接続点が確定した後は、通常のAdapter統合としてClaude Sonnetへ委譲できるため。

Task: DataViewer専用Application Adapterを追加し、ノード詳細data領域へmountする。schema round-trip、step execute、remote query、lazy distributionを既存Application責務へ接続し、回帰Gate通過後に旧preview rendererを削除する。export操作はTASK-022完了まで表示しない。

Dependencies:
- WP-7Bのvendor revision。
- WP-7CのApplication service。

Read Scope:
- `apps/gui/js/ui.node.detail.js`
- `apps/gui/js/ui.fields.js`の既存schema入力／JSON編集／data output renderer
- node schema field／state／save経路
- step run経路
- Bridge Adapterとvendor DataViewer API
- data panel CSS／HTMLと関連Playwright Test

Edit Scope:
- DataViewer Application Adapter
- 承認されたnode data panel integration／CSS／asset load order
- `apps/gui/js/ui.fields.js`の旧schema入力／JSON編集／data output UIのうちDataViewerと重複する描画部分
- `apps/gui/js/ui.node.detail.js`の旧preview renderer
- 対応JS／Playwright Test

Acceptance Criteria:
- DataViewerのschema changeが`origin_name`、`new_name`、`description`、`ziz_datatype`を欠落なく既存node paramsへ反映する。
- カラム設定とschema JSON編集はDataViewerの画面を使用し、`ui.fields.js`には既存schema形式への変換、state更新、保存経路だけを残す。
- executeは既存step実行経路、query／distributionはBridgeを利用する。
- CSV／Excel／clipboard操作はTASK-022完了まで表示せず、押しても動かない操作を残さない。
- pageは5,000行固定で、query変更時はoffset 0へ戻る。
- distribution tab初回表示まで集計requestを送らず、同一結果ではcacheし、再実行時に破棄する。
- request correlationにより古いpage／distribution／export応答が現在stateを上書きしない。
- loading、empty、error、未実行、非data connectorを区別して表示する。
- `ui.fields.js`と`ui.node.detail.js`に旧`node-data-table` preview rendererおよびDataViewerと同一責務のschema rendererが残らない。

Constraints:
- libraryへBridge object、file path、DataFrame、node／connector固有objectを渡さない。
- schema保存形式とConnector入口を変更しない。

Tests:
- Adapter Unit: schema mapping、query state、request correlation、distribution cache。
- Browser Integration: execute／page／sort／filter／schema／distribution round-trip。
- repeated mount/unmountとout-of-order response Test。

Codex Verification:
- library/Application責務境界、schema diff、旧renderer参照0、直接Bridge参照0を確認する。

#### WP-7E DataViewer migration verification

Owner: Codex

Assignment Reason: upstream、vendor、Python、Frontendを横断し、実装担当と独立してAcceptance CriteriaとWorktree状態を判定するため。

Task: WP-7の自動Gateを実行し、Windows実画面のmanual smoke項目をProject ownerへ提示して結果をEvidenceへ記録する。

Dependencies:
- WP-7B～WP-7D GREEN。

Read Scope:
- WP-7全差分
- upstream／Application Test結果
- `docs/features/frontend-libraries.md`

Edit Scope:
- Test修正が必要な場合は承認範囲内のtestだけ
- TASK-016 Evidence／status

Acceptance Criteria:
- schema edit／save／reopen、全件sort／filter、前後page、lazy distributionを確認する。
- CSV／Excel／clipboard操作がTASK-022完了前に表示されないことを確認する。
- 5,000行browser表示でDOM row数がboundedであり、100,000行backend fixtureでBridge payloadがboundedである。
- rapid queryとnode/tab切替でstale response、menu、listener、timerが残らない。
- non-data connector、未実行、0件、error、native dialog cancelが回帰しない。
- full required／e2e GateとWindows manual smokeがPASSする。

Tests:
- upstream full Test。
- focused Python／JS／Playwright Test。
- `tests/run-verification.ps1 -Gate required`。
- `tests/run-verification.ps1 -Gate e2e`。
- Project owner Windows manual smoke。

Codex Verification:
- Test結果、manual evidence、large payload boundary、旧renderer参照0、Worktree cleanlinessを最終照合する。

### WP-8 WorkflowDesigner migration

End State: 現行workflow canvasの表示・pan／zoom・選択・node／edge／loop／note操作を`zizai-workflow-designer`が所有し、Applicationは唯一のworkflow state、保存、実行、Bridge、履歴、node設定を所有する。既存操作を欠落させず、旧canvas UI実装を重複して残さない。

Goal Traceability:
- library優先のcanvas UIと操作 → WP-8C、WP-8E、WP-8F
- 既存node／edge／loop／note操作の維持 → WP-8B、WP-8C、WP-8E
- 単一stateと明確なAdapter境界 → WP-8A、WP-8E
- upstream／vendor一致とApplication固有語0 → WP-8C、WP-8D
- 旧canvas UI重複0とWindows実画面PASS → WP-8F、WP-8G-A、WP-8G-B

Critical Path: `WP-8A境界契約 → WP-8B現行回帰基準 → WP-8C upstream汎用event追加 → WP-8D publish／再vendor → WP-8E Application Adapter接続 → WP-8F旧UI整理 → WP-8G-A表示幾何／icon修復 → WP-8G-B統合検証`。

Parallel Work: なし。現行挙動を固定してからlibrary contractを拡張し、その確定SHAへApplicationを接続する。

Task Graph Changes: 既存の単一WP-8を、境界決定、回帰基準、upstream、vendor、Application統合、旧UI整理、最終検証へ分割する。SQLFlowDesignerは引き続き対象外。

Deferred Decisions: なし。Project ownerはcurrent workflow canvasを対象spaceとし、library標準design／pan／zoomを採用、loop機能は維持しloop枠だけを非表示、既存操作に不足する汎用eventをlibraryへ追加する方針を承認した。

#### WP-8A WorkflowDesigner boundary contract

Owner: Codex

Assignment Reason: Applicationとlibraryの責務、単一state、既存操作維持を横断して確定する設計判断のため。

Task: capability matrixを一次コードへ照合し、library UI／eventとApplication state／command Adapterの境界をCurrent Specificationへ記録する。

Dependencies:
- TASK-018、WP-2、Project ownerのWP-8方針承認。

Read Scope:
- `AGENTS.md`、`docs/features/`、本Task
- `apps/gui/vendor/zizai-workflow-designer/src/`
- `apps/gui/js/app.js`、`state.js`、`ui.node.canvas*.js`、`ui.node.detail.js`、`bridge.js`、`workspace.manager.js`

Edit Scope:
- `docs/features/frontend-libraries.md`
- 本Task

Acceptance Criteria:
- library、Application、Adapterの所有責務と禁止される二重stateが明記される。
- loop枠非表示、library pan／zoom採用、既存操作維持、不足event追加が明記される。

Constraints:
- codeを変更しない。
- `.zizd` schemaやBridge Protocolを暗黙に変更しない。

Tests:
- capability／boundary plan review。

Codex Verification:
- Claude Opusの読取専用gap reviewを一次コードへ照合し、採用／不採用を分類する。

#### WP-8B Existing canvas regression baseline

Owner: Codex（Terra xhigh implementer、Luna reviewer）

Assignment Reason: 複雑な現行canvas操作を実装非依存の回帰Testへ固定するまとまったTest作業であるため。

Task: 現行実装でnode／edge／loop／note、selection、context操作、空白drop追加、undo／redo、status／validation、外部linkのobservable behaviorをPlaywrightへ固定する。

Dependencies:
- WP-8A。

Read Scope:
- `AGENTS.md`、`docs/features/coding-rules.md`、`docs/features/frontend-libraries.md`、本Task
- `apps/gui/js/app.js`、`state.js`、`ui.node*.js`
- `tests/playwright/`

Edit Scope:
- `tests/playwright/specs/`のWP-8専用spec
- 必要なtest fixtureだけ

Acceptance Criteria:
- production code変更0で、移管後も維持する操作が現行実装上GREENになる。
- loop枠の存在を期待せず、loop nodeと関連操作だけを保護する。

Constraints:
- production code、仕様、既存testを変更しない。
- screenshotだけでなく状態／event／DOMのobservable behaviorを検証する。

Tests:
- 新規focused Playwright spec。

Codex Verification:
- diff scopeとTestの実装非依存性を確認し、focused specを独立再実行する。

#### WP-8C Generic WorkflowDesigner event completion

Owner: Codex（Sol xhigh initial implementer、Terra xhigh fix implementer、Luna reviewer）

Assignment Reason: upstream libraryのdocument／interaction／event／browser Testを横断する複雑実装であるため。

Task: configurable context action、空白／edge drop要求、loop内／loop後追加要求、合流解除要求、history undo／redo要求、annotation mode等の不足eventをApplication非依存の公開contractとしてTest-firstで追加する。

Dependencies:
- WP-8B。

Read Scope:
- WorkflowDesigner repositoryのsource、README、test
- WP-8A boundary contractとWP-8B behavior baseline

Edit Scope:
- WorkflowDesigner repositoryの承認source／test／READMEだけ

Acceptance Criteria:
- 既存操作に必要なevent payloadが汎用語で表現され、Application固有Connector／Bridge／`.zizd`語を含まない。
- library標準design／pan／zoomを維持し、loop枠を描画しない。
- upstream browser／unit TestがGREENになる。

Constraints:
- Application repositoryを変更しない。
- state、保存、実行、履歴をlibraryが所有しない。
- commit、pushしない。

Tests:
- upstream unit／browser TestのRED→GREEN。

Codex Verification:
- public API、payload、Application固有語0、listener cleanup、full upstream Testを独立確認する。

#### WP-8D Publish and exact re-vendor

Owner: Codex

Assignment Reason: GitHub反映、SHA固定、source一致、権利／vendor contractの確定操作を行うため。

Task: 承認後にWP-8Cをcommit／pushし、確定SHAのruntime sourceだけをApplicationへ再vendorする。

Dependencies:
- WP-8C GREEN、Project ownerのcommit／push承認。

Read Scope:
- WP-8C差分／Test結果、vendor policy

Edit Scope:
- `apps/gui/vendor/zizai-workflow-designer/`
- `apps/gui/vendor/README.md`
- vendor contract Test

Acceptance Criteria:
- upstreamとvendorがbyte-identicalで、exact SHAとload orderが記録される。

Constraints:
- Application統合codeを変更しない。

Tests:
- upstream full Test、vendor contract、hash照合、remote asset 0。

Codex Verification:
- local／remote SHA、vendor hash、staged scopeを独立確認する。

#### WP-8E Application controlled Adapter integration

Owner: Codex（complex/debugはSol、通常実装・TestはTerra／Luna）

Assignment Reason: current state、library document projection、全event Adapter、history、run／Bridge境界を横断する複雑実装であるため。

Task: current Application stateを唯一の正本としてlibraryをcontrolled componentでmountし、表示用Documentを都度生成して全公開eventを既存Application commandへ接続する。

Dependencies:
- WP-8D。

Read Scope:
- WP-8A contract、WP-8B Test、確定WorkflowDesigner API
- `apps/gui/js/app.js`、`state.js`、`ui.node*.js`、`bridge.js`、`workspace.manager.js`
- 関連HTML／CSS／Playwright

Edit Scope:
- 承認されたWorkflowDesigner Adapter／asset load／canvas host領域
- WP-8専用Application Test

Acceptance Criteria:
- libraryがcanvas UIを描画し、Application state以外の永続・独立workflow stateを作らない。
- save／reopen／run payload、undo／redo、node detail、status／validation、loop／noteが維持される。
- library eventだけがApplication commandを呼び、libraryがBridgeへ直接依存しない。

Constraints:
- `.zizd` schema、Bridge Protocol、Connector処理を暗黙に変更しない。
- 旧canvas codeはこのPackageで削除しない。
- commit、pushしない。

Tests:
- WP-8B baseline、新Adapter integration、save／run／history focused Test。

Codex Verification:
- state所有、event mapping、stale listener、round-trip、run payloadを独立確認する。

##### WP-8E-R1 表示用データ変換処理の分離

Owner: Codex（実装はTerra、主担当が差分とTestを確認）

Task: ワークフローの保存データをWorkflowDesignerの表示形式へ変換する処理を、旧Canvasの内部処理からApplication共通処理へ分離する。旧CanvasとAdapterは同じ変換処理を利用する。

Acceptance Criteria:
- Application stateだけを正本として扱い、変換処理が保存データを書き換えない。
- 未知のmetadata、node ID、接続、loop、noteが変換前後で失われない。
- 旧CanvasとAdapterが同じ共通処理を利用する。

##### WP-8E-R2 操作処理の共通化確認と修正

Owner: Codex（複雑な調査・修正はSol、主担当が差分とTestを確認）

Task: ノードの追加・削除・接続、copy／paste、実行、undo／redoをApplication共通の操作処理へ集約し、Adapterと旧Canvasから利用できる状態へ整える。

Acceptance Criteria:
- library eventがApplication共通処理へ接続され、libraryがBridgeや保存処理を直接扱わない。
- ID採番、参照書換え、validation、run payload、historyが既存仕様を維持する。

##### WP-8E-R3 テスト専用Canvasの除去

Owner: Codex（実装はTerra、主担当が差分とTestを確認）

Task: production DOMに追加された非表示・非操作の互換Canvasを削除し、WP-8B baselineを実際のWorkflowDesigner画面に対する操作と確認へ変更する。

Acceptance Criteria:
- production DOMにテスト専用Canvasを残さない。
- 操作可能なCanvasはWorkflowDesignerだけであり、WP-8Bの15 behaviorを弱めない。

##### WP-8E-R4 統合検証と証跡更新

Owner: Codex（Test実行はLuna／Terra、最終判定は主担当）

Task: Adapter Test、WP-8B baseline、関連画面回帰、構文、vendor契約を実行し、現行結果でWP-8E reportとTASK-016 Evidenceを更新する。

Acceptance Criteria:
- 古いBLOCKED記録と最新Test結果の矛盾がない。
- 自動Testと未実施のWindows実画面確認を区別して記録する。

Critical Path: `WP-8E-R1 → WP-8E-R2 → WP-8E-R3 → WP-8E-R4`。

Parallel Work: なし。同じAdapterとbaselineを扱うため、順番に実施する。

Deferred Decisions:
- 旧Canvas描画・hit・interaction codeの削除はWP-8Fで実施する。
- Windows実画面の最終確認はWP-8Gで実施する。

#### WP-8F Remove duplicate legacy canvas UI

Owner: Codex（複雑な境界調査・実装はGPT Sol、独立reviewはGPT Terra）

Assignment Reason: 旧Canvas2Dの描画／hit／interaction依存を安全に除去する高risk cleanupであるため。

Task: WP-8B／EがGREENの状態で、libraryと重複する旧canvas描画・hit・interactionだけを削除し、Application command／state／detail責務を残す。

Dependencies:
- WP-8E GREEN。

Read Scope:
- WP-8全差分、旧canvas source、参照元、関連Test

Edit Scope:
- `apps/gui/js/ui.node.canvas*.js`と直接参照元
- 関連static／Playwright Test

Acceptance Criteria:
- libraryと同一UI責務の旧実装・load・selector参照が0になる。
- Application所有command／state／detail／Bridge責務が残る。

Constraints:
- Testで未到達を証明できないApplication責務を削除しない。
- commit、pushしない。

Tests:
- WP-8B／E focused、static reference gate、required regression。

Codex Verification:
- 削除scope、残存参照0、Application責務保全、全回帰を独立確認する。

##### WP-8F-A 旧Canvas責務と削除境界の確定

Owner: Codex（調査はGPT Sol、主担当が判断を確認）

Task: 旧Canvas関連の各ファイル・関数・参照を、libraryと重複する「描画・クリック位置判定・画面操作」と、Applicationに残す「command・state・detail・Bridge」に分類し、削除対象と保持対象を確定する。

Acceptance Criteria:
- 各対象を削除／保持／移動不要に分類し、根拠と参照元を記録する。
- Testで利用されているだけのproduction責務と、実画面で必要なApplication責務を混同しない。
- このWork Packageではproduction codeを変更しない。

##### WP-8F-B 旧Canvas描画・クリック位置判定・画面操作の削除

Owner: Codex（実装はGPT Sol、主担当が差分を確認）

Task: WP-8F-Aで削除対象と確定した旧Canvasの描画・クリック位置判定・画面操作だけを削除し、WorkflowDesigner AdapterとApplication共通処理を唯一の実行経路にする。

Acceptance Criteria:
- libraryと重複する旧Canvas UI処理がproduction経路から除去される。
- Application所有のcommand・state・detail・Bridgeと、WP-8Eで分離したprojector／facadeは残る。
- WP-8B／E focused TestがGREENを維持する。

##### WP-8F-C 読込・selector・Test参照の整理

Owner: Codex（実装はGPT Sol、主担当が差分を確認）

Task: WP-8F-Bで不要になったscript読込、CSS selector、旧Canvas専用Test参照を整理し、旧UI参照が復活しないstatic gateを追加する。

Acceptance Criteria:
- 削除済み旧Canvas実装へのproduction load・selector・呼出参照が0になる。
- legacy専用Testを単純削除せず、必要な挙動はWorkflowDesigner Adapter／baseline Testへ残す。

##### WP-8F-D 統合検証と証跡更新

Owner: Codex（独立reviewはGPT Terra、Test再実行と最終判定は主担当）

Task: focused／関連画面／static gateを実行し、削除範囲、残存参照0、Application責務保全を照合してWP-8Fの証跡を更新する。

Acceptance Criteria:
- WP-8B／E focused、関連画面回帰、vendor contract、static reference gateがPASSする。
- 既知の無関係な失敗とWP-8Fによる回帰を分離して記録する。
- Windows実画面確認はWP-8Gへ残し、未確認をPASS扱いにしない。

Critical Path: `WP-8F-A → WP-8F-B → WP-8F-C → WP-8F-D`。

Parallel Work: なし。同じ旧Canvas参照を段階的に削除するため、前段の判定とGREENを確認してから次へ進む。

#### WP-8G-A WorkflowDesigner geometry and icon repair

Owner: Codex（Claude Opusは既存差分を保護するため読取専用plan review、実装と最終判定はCodex）

Assignment Reason: libraryの汎用描画寸法とApplicationのstate／projection境界を横断し、現在の未commit差分と同じfileを変更するため、Claudeへ直接編集させずCodexが帰属を管理する。

Task: Windows実画面で確認したnode過大、STARTと先頭stepの重なり、START／ENDのgrid不整合、step icon非表示を、library汎用contractとApplication Adapterの責務を分離したまま修正する。follow-upとしてstep外形106×88px、visual 48px、icon 26px、横方向level間隔112px、node名12px、80% arrow marker、淡色edgeへ調整する。

Dependencies:
- WP-8F GREEN。
- Project ownerが2026-08-31に、step visualを現行の約半分とし、memo modeを本修正から除外する方針を承認。

Read Scope:
- `AGENTS.md`、`docs/features/frontend-libraries.md`、本Task
- `apps/gui/vendor/zizai-workflow-designer/src/`
- `apps/gui/js/workflow-designer.adapter.js`、`workflow-display.projector.js`、`state.js`、`ui.node.shared.js`
- WP-8 Playwright／vendor contract Test

Edit Scope:
- WorkflowDesigner upstream repositoryの汎用node metrics／grid source、CSS、Test、README
- `apps/gui/vendor/zizai-workflow-designer/`のupstream一致copyとrevision記録
- `apps/gui/js/workflow-designer.adapter.js`、`workflow-display.projector.js`、必要な共有配置定義
- WP-8 focused Playwrightと本Task／`docs/features/frontend-libraries.md`

Acceptance Criteria:
- step外形106×88px、visual 48px、icon 26pxとなり、port／edge anchor／hit領域が同じmetricsから整合する。
- START、最初のstep、後続step、ENDが同じgrid原点と配置間隔を使い、矩形が重ならず、単一路では同じY基準へ揃う。
- 全stepでApplication config由来のconnector iconが表示され、未知connectorは既存fallbackを使う。
- node外形106×88px内にvisual、node名、descriptionが収まり、通常edge／arrowは`#94a3b8`、arrow markerは6.4pxで表示される。選択中edgeの強調色は維持する。
- Application stateを唯一の正本とし、`.zizd` schema、Bridge、memo／annotation mode、旧Canvas互換を変更しない。

Constraints:
- Application固有のConnector／Action概念をlibraryへ追加しない。
- CSSだけの縮小、vendor copyだけの修正、旧Canvas復活、Claudeによる編集／commit／pushを行わない。
- 既存の未commit変更を上書き、削除、正規化しない。

Tests:
- libraryで任意node metricsとgrid原点に対するmodel anchor／CSS variable／snapのRED→GREEN Test。
- Playwrightでnode実寸、矩形非交差、START／step／END整列、icon可視、drag後の描画位置と保存位置一致を確認。
- WP-8 Adapter／baseline、vendor contract、関連Frontend回帰、JavaScript構文、diff check。

Codex Verification:
- Claude Opusの読取専用review各指摘を一次コードへ照合し、採用範囲が4不具合に限定されることを確認する。
- focused Testを独立再実行し、upstream source／vendor runtime bundle／revision記録の一致とWorktree差分scopeを確認する。

Critical Path: `library RED → generic metrics／grid GREEN → local upstream確定 → exact re-vendor → Adapter projection／icon RED→GREEN → related regression → Windows manual smoke`。

Parallel Work: なし。同じgeometry contractをlibrary、vendor、Adapterが順に共有するため直列で実施する。

Task Graph Changes: 失敗したWP-8G manual smokeを、修復WP-8G-Aと再検証WP-8G-Bへ分割する。

Deferred Decisions:
- None。memo／annotation modeの期待挙動は2026-09-01にProject ownerが確定し、WP-8G-Cへ分離した。

#### WP-8G-C Annotation mode exclusivity and context actions

End State: 付箋モードOFFではnode編集と付箋linkのOS browser表示、ONでは付箋だけの編集と右click作成／色変更が動作し、両modeの操作責務が混在しない。

Goal Traceability:
- ON時のnode操作／詳細表示禁止、canvas右click作成、付箋右click色変更、toolbar作成button削除、OFF時だけの外部link発火 → WP-8G-C1、WP-8G-C2。
- upstream／vendor一致とApplication security boundary維持 → WP-8G-C2、WP-8G-C3。

Critical Path: `WP-8G-C0仕様記録 → WP-8G-C1 upstream RED／GREEN → WP-8G-C2 exact vendor／Application RED／GREEN → WP-8G-C3 Codex独立検証 → WP-8G-B`。

Parallel Work: なし。同じinteraction、context menu、standalone bundleを直列で確定する。

Task Graph Changes: WP-8G-Aで保留したannotation mode follow-upをWP-8G-CとしてWP-8G-B前へ追加する。

Deferred Decisions: None。色変更はlibraryの`noteColors`候補をmenu表示する方式、候補初期値は既存sampleの黄・緑・青とする。2026-09-01のProject owner判断により、付箋からOS browserで開く外部linkとして`zenn.dev`と`github.com`の全pathを既存domain allowlistへ追加する。

Work Package: WP-8G-C0 Canonical specification

Owner: Codex

Assignment Reason: Project ownerとの仕様確定とTask graph更新はCodexが所有するため。

Task: mode別のnode／note／link／context menu挙動とApplication／library境界を正本へ記録する。

Dependencies:
- 2026-09-01のProject owner承認。

Read Scope:
- `AGENTS.md`、`docs/features/frontend-libraries.md`、本Task。

Edit Scope:
- `docs/features/frontend-libraries.md`、本Task。

Acceptance Criteria:
- mode別の許可／禁止操作、menu内容、link発火条件、責務境界が曖昧なく記録される。

Constraints:
- 未承認の色、Bridge、保存schema、node geometryを追加変更しない。

Tests:
- 文書内の矛盾、placeholder、旧toolbar作成仕様を検索する。

Codex Verification:
- Project ownerの確定内容と文書を項目単位で照合する。

Work Package: WP-8G-C1 Generic library interaction

Owner: claude-assist（Claude Opus）

Assignment Reason: pointer gesture、selection、command、context menu、note editing、standalone bundleを横断するinteraction修正であり、期待挙動と編集範囲が明確なため。

Task: upstream libraryへmode排他、ON時のcanvas／note context menu、`noteColors` palette、OFF時だけのexternal link event、toolbar作成button削除をTest-firstで実装する。

Dependencies:
- WP-8G-C0完了。

Read Scope:
- upstreamの`README.md`、`src/`、`test/`、`sample/`。
- `docs/features/frontend-libraries.md`と本Work Package。

Edit Scope:
- upstreamの`src/`、`test/`、`sample/`、必要なREADME。

Acceptance Criteria:
- ON時はnode選択／詳細／drag／connect／node context action／keyboard編集が発火しない。
- ON時のcanvas／node右clickは`annotation.add`だけ、付箋右clickは黄・緑・青の候補色だけを表示する。
- toolbarに`annotation.add`を表示せず、右click以外から新規付箋を作成しない。
- ONでは付箋linkを発火せず編集を優先し、OFFでは`http://`／`https://`だけを`external-link:open-request`へ渡す。
- OFFでnode編集、ONで付箋本文編集／移動／resize／色変更／削除を維持する。

Constraints:
- Application、Bridge、`.zizd`、vendor copyを変更しない。Application固有語をlibraryへ追加しない。
- branch切替、commit、push、publishを行わず、既存未commit変更を上書きしない。

Tests:
- `test_sticky_note_mode.js`、`test_generic_events.js`のRED→GREEN。
- 関連Node Test、sample static、standalone bundle parity、JavaScript構文。

Codex Verification:
- upstream差分scope、汎用API、mode matrix、Test結果を一次コードで確認する。

Work Package: WP-8G-C2 Vendor and Application integration

Owner: claude-assist（Claude Sonnet）

Assignment Reason: upstreamで確定した汎用挙動をApplicationへ接続する通常規模の同期／Test作業であるため。

Task: C1 runtime sourceをvendorへ一致させ、Application Adapterから既存`noteColors`と外部link security boundaryを接続し、mode別PlaywrightをGREENにする。

Dependencies:
- WP-8G-C1 GREEN。

Read Scope:
- upstream変更source、`apps/gui/vendor/zizai-workflow-designer/`、`apps/gui/js/workflow-designer.adapter.js`、WP-8 Playwright、vendor static Test。

Edit Scope:
- `apps/gui/vendor/zizai-workflow-designer/`、必要な`apps/gui/js/workflow-designer.adapter.js`、WP-8 Playwright、vendor contract、正本のEvidence欄。

Acceptance Criteria:
- Application実画面でもC1のmode matrixが成立し、OFF時linkだけが既存AdapterからOS browser要求へ変換される。
- vendor runtimeはupstream sourceと一致し、Application側へ付箋UIの重複実装を追加しない。

Constraints:
- Bridge、`.zizd`、保存／実行、node geometry、旧Canvasを変更しない。
- branch切替、commit、push、publishを行わない。

Tests:
- WorkflowDesigner Adapter／baseline Playwright、vendor／asset／boundary static、JavaScript構文。

Codex Verification:
- Claude実行前後statusを比較し、Edit Scope、upstream／vendor一致、focused Testを独立確認する。

Work Package: WP-8G-C3 Independent verification

Owner: Codex

Assignment Reason: Claude成果物を独立判定し、Application／library境界とdirty Worktreeを保全するため。

Task: C1／C2差分をreviewし、自動GateとProject owner向けmanual smoke項目を確定する。

Dependencies:
- WP-8G-C2 GREEN。

Read Scope:
- C1／C2全差分、関連仕様、Test結果。

Edit Scope:
- 本TaskのEvidence／status。明確な軽微修正が必要な場合だけ承認済みEdit Scope内。

Acceptance Criteria:
- mode matrix、外部link security boundary、upstream／vendor一致、既存node／note操作回帰がすべて検証される。

Constraints:
- Claudeの完了報告だけでPASS判定しない。未確認をPASS扱いにしない。

Tests:
- C1／C2のfocused／related Test再実行、`git diff --check`、Windows manual smoke。

Codex Verification:
- Acceptance criteriaをTestと一次diffへ対応付け、残存riskを明示する。

#### WP-8G-B Integrated verification

Owner: Codex

Assignment Reason: upstream、vendor、Application、Windows実画面を横断して最終Acceptanceを判定するため。

Task: 自動GateとProject owner manual smokeを実行し、WP-8 EvidenceとTask状態を確定する。

Dependencies:
- WP-8G-A、WP-8G-C GREEN。

Read Scope:
- WP-8全差分、仕様、Test結果

Edit Scope:
- 本TaskのEvidence／status

Acceptance Criteria:
- WP-8 AcceptanceとWindows manual smokeがPASSし、未確認事項が明示される。

Constraints:
- 未確認をPASS扱いにしない。

Tests:
- upstream full、focused Unit／Playwright、required／e2e Gate、Windows manual smoke。

Codex Verification:
- capability traceability、単一state、旧UI重複0、Worktree scopeを最終照合する。

### Deferred from this Task: SQLFlowDesigner

`zizai-sqlflow-designer`は既存UI責務の移管ではなく新機能追加になるため、2026-08-25のProject owner判断でTASK-016から除外した。利用場面とspaceが承認された将来Taskで、WorkflowDesigner／SQL Highlighter依存、parser/viewer test、Application Adapterを改めて計画する。

### WP-10 CatalogPanel migration

Project owner approved the detailed WP-10 design and model split on 2026-09-01.

End State: AppShell左sidebarのCatalog activityがactive tabの`.zizd`／`.sql`／`.md`に対応する読取専用sampleを表示し、text copyまたは既存node Pasteへ安全に接続される。未対応tabは空状態となり、Bridge command/event数、Source／Runtime／Workspace境界、既存workflow copy／paste／historyを変更しない。

Goal Traceability:
- Application非依存のCatalogPanel host hookと既存consumer互換 → WP-10A
- Source設定の検証済み一方向配信、Bridge 31／8維持 → WP-10B
- `.zizd` node templateの内部clipboardと既存Paste／history維持 → WP-10C
- AppShell activity、active extension切替、read-only UI、text clipboard → WP-10D、WP-10D-R1～R4
- local asset、lifecycle、統合Gate、Evidence → WP-10E

Critical Path: `WP-10A → WP-10C → WP-10D → WP-10D-R1 → WP-10D-R2 → WP-10D-R3 → WP-10D-R4 → WP-10E`。WP-10BはWP-10Aと並行可能だが、同じdirty Worktreeの帰属を明確にするため本sessionでは直列実行とする。

Parallel Work: Architecture上はWP-10AとWP-10Bが独立する。実行はWorktree混線防止のため直列化する。

Task Graph Changes: 旧WP-10をWP-10A～WP-10Eへ分割し、WP-10Dの独立reviewで確認した境界／回復／lifecycle／test不足をWP-10D-R1～R4としてWP-10E前へ挿入する。新TaskやBridge commandは追加しない。

Deferred Decisions: なし。spaceはAppShell左sidebar、data sourceは読取専用Source設定、保存先は無し、permissionは作成／編集／削除／保存すべて無効、未対応拡張子は空状態と決定済み。

#### WP-10A CatalogPanel upstream host activation hook

Owner: claude-assist（Model: Opus）

Assignment Reason: 公開API互換、非同期clipboard、error／lifecycleを同時に守る難しいupstream境界であるため。

Task: `zizai-catalog-panel` upstreamへ汎用host activation hookを追加し、host処理済み時は既定clipboard書込みを抑止し、hook未指定consumerの現行挙動を維持する。

Dependencies:
- Project ownerによるWP-10詳細設計承認。

Read Scope:
- upstream repositoryのREADME、source、sample、test
- `docs/features/frontend-libraries.md`

Edit Scope:
- upstream repositoryのCatalogPanel source、test、必要最小限のREADME API記録

Acceptance Criteria:
- hook未指定時のclipboard、toast、`catalog:copy`が現行互換である。
- host処理済み時はlibraryがOS clipboardへ書かない。
- hook errorは`catalog:error`となり二重処理しない。
- destroy／remountでlistener、menu、timerを残さない。

Constraints:
- Application、Bridge、connector、拡張子の概念をlibraryへ追加しない。
- vendor copyを先行修正しない。commit／pushしない。

Tests:
- upstream host-handled／default／error／lifecycle focused test。

Codex Verification:
- upstream diff、公開契約、focused testを独立確認し、確定操作とvendor SHA更新はCodexが担当する。

#### WP-10B Source catalog configuration and Bridge payload

Owner: claude-assist（Model: Sonnet）

Assignment Reason: Source設定、既存`app.getStatus`追加field、fixture追随の境界が明確であるため。

Task: `catalog_samples.json`を追加し、Python/Application Adapterで許可拡張子、item種別、local icon、node許可fieldを検証して、既存status payloadへpath無しで配信する。

Dependencies:
- Project ownerによるWP-10詳細設計承認。

Read Scope:
- `AGENTS.md`、Source設定ADR、`apps/desktop/bridge.py`、`apps/common/config/`
- TASK-010 layout fixture／test、Bridge contract／test

Edit Scope:
- `apps/common/config/catalog_samples.json`
- `apps/desktop/bridge.py`
- 直接関係するSource config／Bridge／repository layout testとfixture

Acceptance Criteria:
- `.zizd`／`.sql`／`.md`だけがsanitized payloadへ残る。
- Source path、root、scopeをpayloadへ含めない。
- malformed itemだけを安全に除外し、取得不能時は空payloadとする。
- Bridge command 31／event 8を維持する。

Constraints:
- 根拠のない文字数、件数、payload上限を追加しない。
- 新Bridge command、Workspace scope、Runtime保存を追加しない。commit／pushしない。

Tests:
- Source config validation unit、Bridge config integration、TASK-010 path contract、Bridge count regression。

Codex Verification:
- payload、path非露出、31／8、focused testを独立確認する。

#### WP-10C Workflow node-template internal clipboard

Owner: claude-assist（Model: Opus）

Assignment Reason: iframe境界、既存node clipboard、ID／接続採番、history／undoを同時に維持する複雑なstate変更であるため。

Task: 内部clipboardを既存node選択またはnode templateの排他的stateへ拡張し、Catalog item選択ではworkflow stateを変えず、既存Pasteで初めて検証済みnodeを生成する。

Dependencies:
- WP-10A。

Read Scope:
- WorkflowDesigner正本仕様
- `apps/gui/js/workflow-command.facade.js`、`state.js`、`app.js`、`workspace.manager.js`
- copy／paste／history関連test

Edit Scope:
- 上記内部clipboard／state／embedded APIの必要最小限箇所
- node-template clipboard focused test

Acceptance Criteria:
- 既存node copy／paste挙動が不変である。
- template選択時にnode／historyを変更せず、Pasteで1 nodeだけ生成する。
- connector／action／許可field／form形状を検証し、不正時は無変更で拒否する。
- ID、step名、位置、parent／edge／loop／merge情報はtemplateから受け取らない。
- Paste後のundo／redoが既存history経路で動作する。

Constraints:
- `.zizd` schema、Bridge、WorkflowDesigner library Documentを変更しない。
- loop templateは初期版対象外。commit／pushしない。

Tests:
- template set／reject／Paste／anchor／undo／redoと既存copy／paste回帰。

Codex Verification:
- state mutation時点、許可field、history、focused regressionを独立確認する。

#### WP-10D Catalog Adapter and AppShell integration

Owner: claude-assist（Model: Sonnet）

Assignment Reason: 10A～10Cで契約固定後は、activity、tab切替、mount／destroy、projectionを限定範囲で実装できるため。

Task: Catalog Adapterを追加し、AppShell左activity、active extension切替、read-only projection、SQL／Markdown clipboard、`.zizd`内部clipboard受渡しを統合する。

Dependencies:
- WP-10A、WP-10B、WP-10C。

Read Scope:
- AppShell、WorkspaceManager、CatalogPanel、Frontend library仕様、local icon／CSS規約

Edit Scope:
- `apps/gui/dataflow.html`、`apps/gui/js/catalog.adapter.js`、`app-shell.js`、`workspace.manager.js`
- 必要最小限のscoped CSS／local SVG、adapter Playwright test
- vendor copy／README／pinned contractは確定upstream revisionに限る

Acceptance Criteria:
- Catalog activityの開閉とactive表示が既存activityと整合する。
- `.zizd`／`.sql`／`.md` tab切替で同一instanceのdataが更新され、未対応は空状態になる。
- 作成／編集／削除／保存UIとwrite Bridgeを持たない。
- text itemはOS clipboard、node itemは内部clipboardへ排他的に渡る。
- Catalog↔他activity往復でlistener、menu、timer、DOMを重複させない。
- external asset、runtime fetch、iframe、localhost APIを追加しない。

Constraints:
- Workspace Explorer、Workflow canvas、Bridge Protocolを再設計しない。
- Application責務をvendorへ入れない。commit／pushしない。

Tests:
- activity／extension／empty／read-only／text copy／node→Paste／lifecycle Playwright、static vendor／asset contract。

Codex Verification:
- 変更scope、Adapter境界、focused Playwright、local asset、lifecycleを独立確認する。

##### WP-10D-R1 Clipboard ownership correction

Owner: claude-assist（Model: Sonnet）

Assignment Reason: native clipboard責務の所在と期待挙動が正本・reviewで確定しており、Adapterとfocused testへ限定できるため。

Task: SQL／Markdown text itemのOS clipboard操作をApplication Adapterへ移し、`.zizd`内部clipboardとの排他性と失敗表示を維持する。

Dependencies:
- WP-10D初稿と独立review H1。

Read Scope:
- `AGENTS.md`、Frontend library正本、TASK-016、Catalog Adapter／CatalogPanel、Workspace／Workflow clipboard seam、Catalog Playwright

Edit Scope:
- `apps/gui/js/catalog.adapter.js`
- `tests/playwright/specs/catalog-panel-adapter.spec.js`

Acceptance Criteria:
- text itemはAdapterがOS clipboardへ書込み、library既定clipboard経路を通らない。
- node itemはOS clipboardへ書かず、既存内部clipboardだけを更新する。
- clipboard失敗が利用者へ通知される。

Constraints:
- vendor、Bridge、Source設定、WP-10C内部clipboard契約を変更しない。commit／pushしない。

Tests:
- text／node排他、clipboard成功／失敗、write Bridge未使用のfocused Playwright。

Codex Verification:
- ownership call flowとfocused Playwrightを独立確認する。

##### WP-10D-R2 Catalog source retry

Owner: claude-assist（Model: Sonnet）

Assignment Reason: 一時失敗を永続cacheしない修正と再取得testをAdapter内へ限定できるため。

Task: `app.getStatus`初回失敗またはBridge未ready時に空表示へ縮退し、次のactivity再表示／tab切替で再取得できるようにする。

Dependencies:
- WP-10D-R1。

Read Scope:
- `AGENTS.md`、Frontend library正本、TASK-016、Catalog Adapter、Bridge ready pattern、Catalog Playwright

Edit Scope:
- `apps/gui/js/catalog.adapter.js`
- `tests/playwright/specs/catalog-panel-adapter.spec.js`

Acceptance Criteria:
- 成功結果だけを再利用し、失敗結果は次回refreshで再取得される。
- 未処理rejection、重複同時取得、Source path露出を追加しない。

Constraints:
- Bridge command／payload、Python、Source設定を変更しない。commit／pushしない。

Tests:
- 初回rejectまたは未ready後、再表示／tab切替で回復するfocused Playwright。

Codex Verification:
- failure state transitionと呼出回数を独立確認する。

##### WP-10D-R3 Catalog lifecycle cleanup

Owner: claude-assist（Model: Sonnet）

Assignment Reason: upstreamの既存`destroy()`をApplication teardownへ接続する限定修正であるため。

Task: Catalog Adapterへ冪等な`destroy()`を追加し、`pagehide`でlistener、menu、timer、DOM参照を解放する。

Dependencies:
- WP-10D-R2。

Read Scope:
- `AGENTS.md`、Frontend library正本、TASK-016、Catalog Adapter／CatalogPanel、AppShell teardown、Catalog／UI Shell Playwright

Edit Scope:
- `apps/gui/js/catalog.adapter.js`
- `apps/gui/js/app-shell.js`
- `tests/playwright/specs/catalog-panel-adapter.spec.js`
- 必要時のみ`tests/playwright/specs/ui-shell.spec.js`

Acceptance Criteria:
- `pagehide`でCatalogPanelの`destroy()`が1回呼ばれ、Adapter参照を解放する。
- 複数activity往復でroot、listener、menu、timerを重複させない。

Constraints:
- activity通常切替では同一instance再利用を維持する。vendorを変更しない。commit／pushしない。

Tests:
- 複数往復、destroy冪等性、UI Shell teardown回帰のPlaywright。

Codex Verification:
- teardown経路とlifecycle testを独立確認する。

##### WP-10D-R4 Catalog wiring regression coverage

Owner: claude-assist（Model: Sonnet）

Assignment Reason: 実装変更を増やさず、残るAcceptance配線を既存Playwrightへ限定追加できるため。

Task: 実`.zizd`tabからCatalog data切替までの親Shell配線と、Catalog操作がwrite Bridgeを呼ばないことを回帰testで固定する。

Dependencies:
- WP-10D-R3。

Read Scope:
- `AGENTS.md`、Frontend library正本、TASK-016、Workspace tab配線、Catalog Adapter、既存Catalog／Workflow／UI Shell Playwright

Edit Scope:
- `tests/playwright/specs/catalog-panel-adapter.spec.js`
- testability上不可欠な場合だけ`apps/gui/js/workspace.manager.js`

Acceptance Criteria:
- 実`.zizd`tab activationでCatalogが`.zizd`dataへ切り替わる。
- activity open、tab切替、item操作後もwrite Bridge callが0件である。

Constraints:
- WP-10B／10C／upstreamの既存testを重複実装しない。Application挙動をtest都合で変更しない。commit／pushしない。

Tests:
- Catalog focused Playwrightと必要最小限のWorkflow／UI Shell回帰。

Codex Verification:
- testが実経路を通り、monkey patchだけで成立していないことを独立確認する。

##### WP-10D-R5 Catalog manual-smoke clipboard corrections

Owner: claude-assist（Model: Sonnet）

Assignment Reason: Windows実機smokeで再現した2経路に限定し、原因調査、修正、回帰testを一つのPackageで完結できるため。

Task: Catalog item操作後の`.zizd`貼り付けshortcutと、Desktop WebEngine上のSQL／Markdown text copyを修正する。

Dependencies:
- WP-10D-R4と2026-09-07のProject owner Windows manual smoke。

Read Scope:
- `AGENTS.md`、Frontend library正本、TASK-016
- `apps/gui/js/catalog.adapter.js`、Workflow clipboard／focus Adapter、Workspace frame配線
- `apps/desktop/host.py`のWebEngine clipboard permission設定
- Catalog／Workflow関連Playwright

Edit Scope:
- `apps/gui/js/catalog.adapter.js`
- 原因上不可欠な場合だけWorkflow clipboard／focus Adapterまたは`apps/desktop/host.py`
- `tests/playwright/specs/catalog-panel-adapter.spec.js`
- `tests/playwright/specs/workflow-designer-adapter.spec.js`
- 本TaskのEvidence

Acceptance Criteria:
- `.zizd` Catalog itemを選んだ直後、通常の`Ctrl+V`で既存workflow paste経路からnodeを1件追加できる。
- SQL／Markdown Catalog itemは、通常clickと右clickの`コピー`のどちらでもDesktop WebEngineのOS clipboardへtextをコピーできる。
- create／edit／delete不可のread-only Catalog仕様を維持する。
- `.zizd`内部clipboardとtext用OS clipboardを混在させず、Bridge Protocol `1.0`の31 Command／8 Eventを変更しない。

Constraints:
- Catalog libraryの汎用UI、Source catalog形式、workflow保存形式を変更しない。
- unrelated dirty changeを上書きせず、commit／pushしない。

Tests:
- Catalog選択直後の`Ctrl+V`、通常click／右click text copy、read-only menuのfocused Playwright。
- 関連Workflow Adapter回帰と変更sourceのsyntax check。

Codex Verification:
- Claude差分をbaselineと照合し、focused Playwrightを独立再実行する。Windows WebEngineの最終操作確認はProject ownerへ依頼する。

#### WP-10E Integration verification and evidence

Owner: Codex

Assignment Reason: Package間の境界、Claude差分、最終Acceptance、dirty Worktreeの帰属、文書Evidenceを統合判断するため。

Task: WP-10全変更を統合し、focused unit／integration／Playwright／staticとWindows手動確認項目を確定して、Task Evidenceを更新する。

Dependencies:
- WP-10A～WP-10D。

Read Scope:
- WP-10全変更領域、正本仕様、関連test／fixture、git差分

Edit Scope:
- `docs/features/frontend-libraries.md`、本Task、vendor README／pinned contract、直接関係するtest manifest

Acceptance Criteria:
- WP-10A～WP-10DのAcceptance CriteriaがEvidenceへ対応する。
- Source／Runtime／Workspace、library／Application、parent／iframe境界が維持される。
- Codex独立testと未確認のWindows手動項目が区別される。

Constraints:
- unrelated dirty change、WP-11課題、将来TaskをWP-10へ混在させない。

Tests:
- focused unit／integration／Playwright／static、`git diff --check`、変更JavaScript syntax。Windows実画面は定義済みchecklistでProject ownerが確認する。

Codex Verification:
- 本Package自体が最終Codex Verificationである。

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
- `docs/tasks/done/TASK-016-adopt-approved-frontend-libraries.md`

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

- WP-11 final acceptance（2026-09-07）: 7 libraryの承認済みspaceをCurrent Specificationへ照合し、記録漏れだったWP-6 NodeFormの既決配置だけを追記した。`apps/gui/vendor/README.md`の7 source URL／exact commit／runtime load order、各directoryの`LICENSE`、Project owner許諾済みADRを確認した。追加NOTICE義務はなく、runtime remote／CDN dependency 0、unscoped root selector 0をvendor contractで再確認した。
- WP-11 cross-library boundary（2026-09-07）: AppShell、SQL Highlighter、Markdown Editor、NodeForm、DataViewer、WorkflowDesigner、CatalogPanelの各spaceについて、libraryはUI、Application AdapterはBridge／config／保存／実行／external URL／native操作を所有する境界をCurrent Specificationと全E2Eへ照合した。WorkflowはApplication stateを唯一の正本とし、旧Canvas4 sourceは削除状態、他spaceも旧UIを同時描画しないことをstatic／Playwrightで確認した。
- WP-11 required Gate（2026-09-07）: 追跡済みtest source 9件を`tracked-test-sources.json`へ追加し、`nlp_connector`／`NLPConnector`をconnector inventoryへ登録した。UAC付きWindows環境でsymlink security 3件を含め、static-analysis `113 passed`、unit `98 passed`、integration `46 passed`。失敗・skip 0。既存のPandas deprecated API warningだけを確認した。詳細logは`.tmp/wp11-required-elevated.log`（SHA-256 `C6899ED84F7D6129B5D1140A355306323C4CEC5C2925B1095D6821CA2B3905FF`）。
- WP-11 e2e／offline Gate（2026-09-07）: QtWebEngineでlocal `file://` asset、QWebChannel round-trip、external navigation／popup blockを含むPython E2E `4 passed`、全Frontend Playwright `137 passed`。各componentのWindows手動GateはWP-3～WP-8、WP-10のProject owner確認を統合し、実flow実行だけは承認済みどおりTASK-015 `WP-EXEC`へ残した。release installer生成ではなく、TASK-016対象のlocal vendor snapshotとDesktop同梱Frontendがnetwork不要で起動する配布境界をPASSと判定した。詳細logは`.tmp/wp11-e2e.log`（SHA-256 `15AFC7883A5043E81BF0E9B89E16DE8E43C7FDE34B2A694019BC17C1D5619CEF`）。
- WP-10E Integration verification（2026-09-07）: WP-10D-R5のWindows手動PASS後、CodexがCatalog／WorkflowDesigner／baseline／AppShell結合Playwright `65 passed`、Catalog source／Bridge／Frontend vendor・asset・TASK-012 boundaryのPython unit／static `111 passed`を独立再実行した。変更JavaScript構文、Desktop host Python compile、repository diff checkもPASSし、Bridge command／event、Catalog read-only、内部node clipboard／OS text clipboard、library／Application境界に未解決の回帰を検出しなかった。WP-10A～WP-10DのEvidenceと手動確認を統合し、WP-10をGREENと判定した。
- WP-10D-R5 Catalog manual-smoke clipboard corrections（2026-09-07）: Windows実機で確認された`.zizd` Catalog item選択直後の`Ctrl+V`不達を、ApplicationのWorkspace Adapterがactive flow iframe内WorkflowDesignerへfocusを戻すことで修正した。SQL／MarkdownのOS clipboard書込は、同梱内部Frontendだけを表示するDesktop WebEngineで`JavascriptCanAccessClipboard`を有効化し、既存`navigator.clipboard.writeText()`経路を実機で利用可能にした。Catalogのread-only、`.zizd`内部clipboard、既存paste／history／anchor、Bridge Protocolを維持している。Claude Sonnetが原因調査・実装・回帰test追加を担当し、Claude環境ではcommand権限不足でTest未実行。Codex独立検証はCatalog／Workflow Playwright `41 passed`、Bridge contract `19 passed`、変更JavaScript syntax、Python compile、対象diff checkがPASSした。QtWebEngine固有のclipboard動作はProject ownerのWindows手動確認を残す。
- WP-10D-R5 Windows manual Gate（2026-09-07）: Project ownerがアプリ再起動後の実画面で`.zizd` Catalog選択直後の`Ctrl+V`貼り付けと、SQL／Markdownのclipboard操作を確認し、PASSと判断した。
- WP-10D-R4 Catalog wiring regression coverage（2026-09-02）: Claude Sonnetが実`.zizd`のExplorer→`openWorkspaceFile`→`openFlowFile`→`activateTab`→Catalog refresh配線と、Catalog activity／対応・未対応tab切替／SQL・Markdown・ZIZD item操作でwrite Bridge callが0件であることをPlaywrightへ追加した。新規testは既存実装でfocused `4 passed`となり、本番コード変更なし。Claude結合回帰 `48 passed`、Codex独立再実行も同じ `48 passed`、spec構文PASS。`workspace.manager.js`は変更前SHA-256を維持した。
- WP-10D-R3 Catalog lifecycle cleanup（2026-09-02）: Claude SonnetがTDDでCatalog Adapterへ冪等な`destroy()`を追加し、vendor `CatalogPanel.destroy()`、Adapter参照／cache解放、clean remount、`pagehide` 1回実行を接続した。通常activity切替では同一instanceを維持する。Claude RED `8 passed / 1 failed`、Catalog GREEN `9 passed`、Catalog＋UI Shell `18 passed`。Codex独立検証はCatalog＋UI Shell＋WP-10C Workflow Adapter回帰 `46 passed`、関連JavaScript構文PASS。
- WP-10D-R2 Catalog source retry（2026-09-02）: Claude SonnetがTDDをやり直し、`app.getStatus`の失敗／空結果だけをcache解除して次回activity再表示で再取得し、成功結果と進行中Promiseの共有を維持した。Claude RED `7 passed / 1 failed`、GREEN `8 passed`。Codex独立検証はCatalog＋WP-10C Workflow Adapter回帰 `36 passed`、Application／spec JavaScript構文PASS。
- WP-10D-R1 Clipboard ownership correction（2026-09-02）: Claude SonnetがTDDでSQL／Markdownのnative clipboard操作をApplication Adapterへ移し、library既定clipboard経路と`.zizd`内部clipboardを排他化した。clipboard失敗は既存Catalog toastで利用者へ通知し、write Bridgeを呼ばない。Claude RED `2 failed / 5 passed`、GREEN `7 passed`。Codex独立検証はCatalog＋WP-10C Workflow Adapter回帰 `35 passed`、JavaScript構文PASS。
- WP-8G-C annotation mode exclusivity（2026-09-01）: Project owner承認仕様に従い、WorkflowDesignerを既定OFFのnode編集modeとONの付箋編集modeへ排他的に分離した。ONではnode選択／詳細／移動／接続／context／keyboard編集を停止し、canvas／node右clickは`付箋作成`だけ、付箋右clickはlibraryの黄・緑・青paletteだけを表示する。toolbarの付箋作成buttonを削除し、OFFでは付箋を背面・編集不可とし、`http://`／`https://`だけを既存Application external-browser policyへ渡す。mode変更通知を選択解除より先に発行してcontrolled hostの再入を安全にし、Applicationは明示的な空選択を維持して右詳細panelを実際に非表示にする。Bridge、`.zizd`、保存／実行、node geometryは変更していない。Claude Opusがupstream初期実装、Claude SonnetがApplication統合初稿を担当し、Codexがevent順序と右panel漏出をTest-firstで修正・独立検証した。
- WP-8G-C automated Gate（2026-09-01）: upstream Node Test全件、sample static verification、standalone bundle parity、upstream／Application JavaScript構文、Application WorkflowDesigner Adapter／baseline Playwright `39 passed`、frontend vendor／asset／boundary static `60 passed`、両Worktreeの`git diff --check`がPASSした。upstream runtime 19 filesとApplication vendor `src/`はSHA-256不一致0で、Application側へ付箋menu／paletteの重複実装を追加していない。Windows実画面manual smokeは未実施である。
- WP-8G-C external-link allowlist follow-up（2026-09-01）: Windows manual smokeのBridge logで`zenn.dev`と`github.com`がdomain allowlist不一致により`E_ACCESS_DENIED`となることを確認した。Project owner承認により両domainの全pathをSource security policyへ追加し、実production policyを使うBridge regression TestをRED `2 failed`からGREEN `2 passed`にした。security policy／Bridge／QWebChannel関連Testは`42 passed`、`git diff --check`もPASSした。http／https以外のscheme拒否と既存domain allowlist方式は維持している。
- WP-8G-C Windows manual Gate（2026-09-01）: Project ownerがmode切替、node／付箋操作、context menu、色変更、外部link起動を確認し、WorkflowDesignerの基本操作を一旦PASSとした。実flowの実行確認は未実施であり、初期release候補固定後のTASK-015 `WP-EXEC`へ必須Gateとして移管した。未実施の実行確認をWP-8G-CのPASS根拠には含めない。
- WP-8G-C upstream publication（2026-09-01）: WorkflowDesignerのnode geometry／grid／icon、annotation mode排他制御、context action、外部link requestの汎用変更をcommit `d6bebd11368138222b81346f724944ab29077f4b`（`feat: refine workflow layout and annotation mode`）としてupstream `main`へpushした。commit直前にNode Test全件、sample static verification、Windows Edgeによるlibrary CSS／minimal／sample browser smoke、JavaScript構文、`git diff --check`がPASSし、local `HEAD`と`origin/main`のSHA一致を確認した。Application vendor `src/` 19 filesは同commitのupstream `src/`とSHA-256不一致0で、vendor revision記録と固定revision Testを同SHAへ更新した。
- WP-8G-B integrated verification（2026-09-01）: WorkflowDesigner focused Playwright `39 passed`、frontend vendor／asset／boundary static `60 passed`、E2E Python `4 passed`、Playwright全体 `120 passed`を確認した。DataViewer移管前の旧schema rendererを期待していたNodeForm routing Test 4件はproductionを変更せず現責務へ更新し、focused `7 passed`からE2E全体GREENを確認した。Project ownerのWindows manual Gate、upstream commit／push、vendor source 19 files一致と合わせてWP-8のcomponent acceptanceをGREENとした。Repository全体の`required` Gateは未PASSであり、staticは既存test source 9件のmanifest未掲載 `1 failed, 112 passed`、unitはWindows symlink作成権限不足の3件を除き`63 passed`、integrationは未登録`nlp_connector`によるinventory不一致1件を除き`45 passed`だった。これら3分類をWP-8のPASS根拠には含めず、WP-11の横断cleanup／最終Gateへ残す。
- 2026-09-01のProject owner承認値に従い、step外形を106×88px（直前値の約1.1倍）、visualを48px、iconを26px、水平level間隔を112pxへ変更した。保存済みstepの`ui_position`とgrid原点44pxは維持し、STARTだけを一時Document上の28pxへ投影することで、START／step／ENDを同じY座標・112px間隔に整列した。Application WorkflowDesigner Playwright `36 passed`、frontend vendor／asset／boundary static Test `60 passed`、変更JavaScript構文、`git diff --check`がPASSした。`.zizd` schema、Bridge、upstream library sourceは変更していない。
- 2026-08-31のProject owner承認に基づき、WorkflowDesigner付箋モードをupstream-firstで改修した。既定OFF／背面表示／全編集禁止、ON時の前面表示と全編集許可、`annotation.add`だけの新規作成、空白click・duplicate・pasteでの作成禁止をlibrary contractへ追加した。OFF時も付箋内external link閲覧は維持し、ApplicationはAdapter表記とvendor接続だけを担当する。
- 上記付箋follow-upはupstream focused／関連Node Testとsample static verification、Application WorkflowDesigner Playwright `36 passed`、vendor／asset／frontend boundary static `60 passed`、関連JavaScript構文をCodexが再実行した。変更したupstream runtime 6 filesとvendor copyは改行差を除き一致し、Application state、Bridge、`.zizd` schemaは変更していない。
- WP-8DでWorkflowDesigner PR `#2`を`main`へmergeし、remote／local確定SHA `fc2e75005020afaa0644c5e0cde44c0f67261313`のruntime `src/` 19 filesをApplicationへ再vendorした。名前差分0、SHA-256不一致0、remote asset load 0、vendor contract `50 passed`を確認した。
- WP-8D後のApplication全staticは`107 passed, 1 failed`。FAILは今回未変更のcanonical verification source manifestと既存追跡file一覧の不一致であり、WP-8D必須vendor contractとvendor source一致はGREENである。Application統合code、Bridge、`.zizd` schemaは変更していない。
- WP-8CでWorkflowDesigner upstreamへApplication非依存の汎用interaction contractをTest-firstで追加した。host供給context actions、blank／edge connection drop、既存`command:execute`によるloop内／loop後追加とmerge解除、Undo／Redo、annotation mode／blank配置、readonly connection抑止を公開契約化した。loop枠は有効化していない。
- WP-8Cはgeneric event 14契約を含むNode 7 scripts、static sample、JS／Python構文、diff checkがPASSした。Windows Edgeでlibrary CSS、minimal full-editing、sample `file://` browser smoke 3件もPASSし、Luna最終reviewは仕様PASS／品質APPROVED。Application code、Bridge、`.zizd` schema、vendorは未変更である。
- WP-8AでWorkflowDesignerとApplicationの責務境界を仕様化した。Application stateを唯一の正本とし、libraryはCanvas UI／interaction、Adapterは一時Document投影とgeneric event変換を担当する。loop機能は維持し、loop枠は表示しない。
- WP-8Bで現行Workflow Canvasのobservable behaviorを新規Playwright 15件へ固定した。Claude Opusの初稿後、Terra xhighが2件の失敗とLuna review 3件を修正し、Codex独立再実行は`15 passed`。production code、既存test、Bridge、`.zizd` schemaの変更は0である。
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
- WP-7I-A DataViewer generic feature／lifecycle controls（2026-08-28）: upstream一時cloneの`codex/task-016-data-viewer-initial`で、`report`／`columns`／`json`／`distribution`／`execute`／`export`の汎用feature option、`activeTab` fallback、無効機能のDOM非生成、root内export menu、idempotent `destroy()`をClaude SonnetがTest-firstで実装した。Codexがexport menu CSSのroot scope不足を検出して追加修正を依頼し、独立再実行でbrowser Test `50 passed, 0 failed`。Application Worktreeのコード、Bridge、Connector、Workflow Engineは未変更で、upstream commit／pushも未実施。
- WP-7I-B DataViewer lossless schema editing（2026-08-29）: Project owner判断により複雑実装をCodex Sol（xhigh）subagentへ割り当て、`origin_name`／`new_name`／`description`／`ziz_datatype`の非破壊保持、未知型の文字列表示fallback、空`new_name`の表示限定fallback、Enter／blur確定・Escape取消・type即時確定、JSON明示Apply、不正JSON保持とschema tab lockを汎用library機能としてTest-firstで実装した。確定RED `48 passed, 9 failed`からGREEN `57 passed, 0 failed`。Codex主agentが全差分を要件別にreviewし、fresh browser Test `57 passed, 0 failed`、JavaScript構文、`git diff --check`を独立確認した。Applicationコード、Bridge、Connector、Workflow Engineは未変更で、upstream commit／pushも未実施。
- WP-7I-C local commit boundary（2026-08-29）: WP-7I-A／Bの対象9 fileだけをDataViewer一時cloneの`codex/task-016-data-viewer-initial`へlocal commitした。commitは`6a0171cf9110703e08d9ee142305b78c78763320`（`feat: add configurable lossless schema editing`）。commit直前のfresh browser Testは`57 passed, 0 failed`、JavaScript構文とstaged diff checkはPASS、commit後のupstream working treeはclean。remote pushとApplication再vendorは未実施。
- WP-7I-C remote publish boundary（2026-08-29）: Project ownerの明示承認後、DataViewer branch `codex/task-016-data-viewer-initial`をGitHubへpushした。local HEADとremote tracking refはいずれも`6a0171cf9110703e08d9ee142305b78c78763320`、push直前のfresh browser Testは`57 passed, 0 failed`、working treeはclean。PR作成／mergeとApplication再vendorは未実施。
- WP-7I-C exact re-vendor（2026-08-29）: GitHub反映済みcommit `6a0171cf9110703e08d9ee142305b78c78763320`の`src/report-viewer.css`／`src/report-viewer.js`をApplicationへbyte-identicalに再vendorし、vendor READMEとpinned revision Testを同SHAへ更新した。CSS／JS／LICENSEのsource一致、JavaScript構文、diff check、vendor contract `50 passed`、upstream browser Test `57 passed, 0 failed`をCodexが確認した。Application統合コード、Bridge、Connector、Workflow Engineは未変更。全static Testは`107 passed, 1 failed`で、失敗は今回新設・削除していない既存test source 9件が`tracked-test-sources.json`へ未掲載のために発生するmanifest不一致であり、WP-7I-Cのvendor contractはPASSしている。
- WP-7I-D DataViewer Application integration（2026-08-29）: Project owner承認によりClaudeを使用せず、Codex Terra（xhigh）subagentがTDDでApplication Adapter、asset load、node detail統合、pane内CSS、Playwright回帰を実装し、Codex主agentが全差分とTestを独立検証した。schema nodeは帳票／カラム設定／JSONを表示してカラム設定から開始し、schemaなしdata nodeは帳票だけを表示する。execute／export／distribution／pagingは非表示。Bridge preview配列からlossless schema列への変換、`new_name`列alias、falsy値、空local schema fallback、production BQ `schema_autoextract`のlossless append、schema保存後rerender、destroy、遅延応答無効化を固定した。主agent reviewの4 findingは2 fix roundで解消し、最終Playwright `14 passed`、vendor contract `50 passed`、変更JS構文、diff checkはPASS。全static Testは既知のtracked-source manifest不一致だけが残り`107 passed, 1 failed`。Bridge、Connector、Workflow Engine、vendor sourceは変更しておらず、Windows実画面確認はWP-7I-Eで行う。
- WP-7I-E DataViewer presentation follow-up（2026-08-29）: Project owner承認により、正常取得後の重複`プレビュー N 行`をApplicationから除去し、DataViewer sourceでhost CSSに影響されないcheckbox寸法と、帳票／カラム設定の明示列幅を固定した。Playwrightで正常表示／checkbox／右端列resizeのRED `2 failed`からGREEN `2 passed`、DataViewer結合全体 `16 passed`、vendor contract `50 passed`、upstream browser Test `59 passed, 0 failed`を確認した。型別filterと数値表示は変更していない。library修正はcommit `07ed40e496ddf5795811260b48f71d0d3a6ef527`としてbranch `codex/task-016-data-viewer-layout-fix`へpushし、Application vendorも同SHAへ更新した。
- WP-7I-E Windows manual Gate（2026-08-29）: Project ownerが実画面で帳票、filter、カラム設定、JSON編集、右端を含む列幅変更、重複preview見出しの非表示を確認し、操作性を含めてPASSと判断した。初期版から除外した型別表示、数値format、全件出力、paging、distribution、executeは本Gateの未完了項目として扱わない。WP-7Iを完了扱いとする。
- WP-8E Application controlled Adapter integration（R4統合検証確定: 2026-08-31）: R1で表示用データ変換処理を`workflow-display.projector.js`として旧CanvasとAdapter共通のApplication処理へ分離した。R2で`workflow-command.facade.js`によりノード追加・削除、edge接続・削除、loop内／loop後追加、copy/paste、node実行、workflow実行、undo/redoをApplication共通処理へ集約し、Adapterと旧Canvasの双方が同一Facadeを利用するようにして、loop entry／loop-back構造線への誤った削除action表示を`canDeleteEdge`共通判定で修正した。R3でproduction DOMに残っていた非表示・非操作の互換Canvas（`ensureCompatibilitySurface`）と関連CSSを削除し、WP-8B baselineの`canvasGeometry`を実WorkflowDesigner `.zwd-viewport`基準へ移行した。R4でこれらの現行差分を統合検証し、Adapter `18 passed`、WP-8B baseline `15 passed`、同時実行`33 passed`、変更Application／vendor JavaScriptの構文確認PASS、`tests/static/test_frontend_library_vendor_contract.py` `50 passed`、AppShell／node-detail／data-panel関連Playwright（`ui-shell.spec.js`、`detail-panel-left-gap.spec.js`、`node-form.spec.js`、`node-form-field-kinds.spec.js`）`35 passed`を確認した。`tests/static`全体は`1 failed, 103 passed, 4 errors`で、failureは既存test source 9件（WP-4／WP-6／WP-7で追加済み）が`tracked-test-sources.json`へ未掲載であることによるmanifest不一致、errorsはlocal Windows環境のTemp directory `PermissionError`によるもので、いずれもWP-8E差分と無関係と特定した。production DOMに互換Canvas生成処理・関連CSS・外部配信asset参照は残っていない。一時reportの結論は本Evidenceへ統合済みで、旧Canvas UIの重複描画・hit・interaction削除はWP-8F、Windows実画面の目視確認はWP-8Gへ引き継いだ。
- WP-8F-B/C legacy Canvas removal（2026-08-31）: `ui.node.canvas.js`、`ui.node.canvas.layout.js`、`ui.node.canvas.draw.js`、`ui.node.canvas.hit.js`と旧Canvas専用CSS／load／global／runtime fallback／互換Test参照を削除し、WorkflowDesigner Adapterを唯一の描画経路にした。Application所有の`state.js`、node detail、Bridgeと、WP-8Eのprojector／command Facade／Adapterは保持した。static gateは旧source／参照が残る状態でRED `1 failed`を確認後GREEN `1 passed`、Adapter `18 passed`、baseline `15 passed`、同時実行`33 passed`、frontend asset `2 passed`、TASK-012 boundary `8 passed`、vendor contract `50 passed`、変更JavaScript 13 filesの構文確認PASS。WP-8F-D統合確認とWindows実画面WP-8Gは未実施。

- WP-8F review follow-up（2026-08-31）: WP-8F独立reviewの指摘3件を実コードで再確認し、妥当な3件をTest-firstで修正した。(1) `ui.node.js`の動的loaderがdataflow.htmlと異なりNodeForm／DataViewerのlibrary＋Adapterを読み込まず、evaluation時にAdapterを捕捉する`ui.node.detail.js`が空Adapterを掴む順序欠落を確認し、`vendor/zizai-form/src/node-form.js`、`js/node-form.adapter.js`、`vendor/zizai-data-viewer/src/report-viewer.js`、`js/data-viewer.adapter.js`をdetailより前へ追加した。production挙動の重複実装とremote assetは追加していない。(2) WP-8決定済みのApplication current workflow state正本に対し、`docs/features/frontend-libraries.md`の`Workflow Document decision`と本TaskのDeferred Decisionが「未決」のまま残っていたため、該当2箇所だけを決定済み記述へ書き換えた。承認済みarchitectureは変更していない。(3) loop edge coverageは既存のFacade契約assertionを保持したまま、実描画されたWorkflowDesigner SVGの`data-edge-key`線を右クリックする観測可能なcoverageを追加し、loop entry／loop-back構造線でcontext menuが出ないこと、loop内通常線とmerge線が削除actionを提示すること、merge削除後もloop構造が不変であることを固定した。hit座標はpath長を等間隔走査し`elementFromPoint`で最前面一致を検証する方式で、固定sleepとblind retryを使用していない。Claude OpusのTest結果はloader順序契約でRED `1 failed`からGREEN、Adapter `19 passed`、baseline `15 passed`、同時実行`34 passed`、新規／変更2 testの`--repeat-each=5` `10 passed`、`node --check`によるui.node.jsとspecの構文確認PASS。
- WP-8F-D integrated verification（2026-08-31）: Codexがreview follow-up後の現行差分を独立再実行し、WorkflowDesigner Adapter／baselineとAppShell／node-detail／DataViewer関連Playwright `69 passed`、frontend asset／TASK-012 boundary／vendor contract static Test `60 passed`を確認した。変更JavaScript構文、`git diff --check`、production旧Canvas source／load／global／runtime fallback／selector参照0もPASSした。Application state／command／detail／Bridge責務は保持され、旧Canvas4 JSだけが削除対象であることを差分確認した。WP-8FをGREENとして完了し、Windows実画面確認はWP-8Gへ残す。
- WP-8G-A automated implementation checkpoint（2026-08-31）: Windows manual smokeで判明したnode過大、STARTと先頭stepの重なり、START／ENDのgrid不一致、icon非表示を対象に、Claude Opusの読取専用reviewを一次コードへ照合した。採用した指摘はgeneric `nodeMetrics`、grid原点、terminal projection、Application-owned icon renderer、旧60px配置間隔の統一であり、未使用projector出力の全面整理とmemo modeはscope外とした。WorkflowDesigner一時cloneでgrid／metrics／standalone bundleをREDからGREEN化し、Node unit 8 command、sample static、Windows Edgeのlibrary CSS smokeがPASS。Applicationは`state.js`の配置contractをprojector／Adapterへ共有し、`.zizd`／Bridgeを変えずSTART／ENDを一時Documentへ投影、既存connector configからiconを供給した。Application Playwrightはfocused RED `2 failed`から、Adapter `20 passed`、baseline `15 passed`、AppShell／node detail／DataViewerを含む統合 `70 passed`へGREEN化し、vendor contract `50 passed`、変更JavaScript構文、`git diff --check`もPASS。local upstreamの変更4 runtime sourceとvendor copyはSHA-256一致。Project ownerのWindows実画面確認、upstream commit／push、確定SHAへのvendor revision更新は未実施であり、WP-8G-A完了とは扱わない。
- WP-8G-A visual follow-up（2026-08-31）: Project owner承認値に従い、Application node全高を80px、library node名を12px／16px line-height、通常edge／arrowを`#94a3b8`、arrow markerを6.4pxへ変更した。実表示PlaywrightはRED `2 failed`からfocused `2 passed`、Adapter／baseline `36 passed`へGREEN化し、upstream Node unit 9 scripts、sample static、Windows Edge library CSS smoke、Application static `52 passed`、変更JavaScript構文、両Worktreeの`git diff --check`がPASSした。変更したupstream／vendor runtime 5 filesはSHA-256一致。選択中edge色、memo、`.zizd`／Bridge、複数top-level flowは変更していない。
- WP-10B Source catalog configuration and Bridge payload（2026-09-01）: Claude Sonnet中断後の不整合をCodexが引き継ぎ、`.zizd`／`.sql`／`.md`のsampleへCatalogPanel用folder／item metadataを追加し、nodeの`descriptionAuto`をboolean、connector／actionを英数字・underscore、orderを有限数として検証するSource sanitizerを完成させた。Source path／root／scope、新Bridge command、Runtime／Workspace保存は追加していない。専用TestはRED `11 failed, 21 passed`からGREEN `32 passed`、TASK-010／Bridge関連focused Testは`67 passed`。Bridge command 31／event 8、Python構文、JSON構文、対象diff checkもPASSした。
- WP-10C Workflow node-template internal clipboard（2026-09-02）: Claude Opusが既存node copyまたは検証済みnode templateを排他的に保持するApplication内部clipboard、`zizEmbeddedApi.setNodeTemplate`の最小iframe seam、既存Paste／anchor／history経路での1 node生成を実装した。templateは`connector`／`action`／`description`／`descriptionAuto`／`form`だけを許可し、ID、step名、位置、parent／edge／loop／merge等の構造情報を拒否する。Claude環境ではPlaywright command権限不一致によりTest未実行だったため、Codexが新規4件を実行し、選択済みstep1を再clickしてcopy対象を解除するTest設定誤り1件だけを既存成功patternへ修正した。新規focused `4 passed`、Adapter全体 `28 passed`、baseline同時実行 `43 passed`、変更JavaScript／spec構文と対象diff checkがPASSした。最初のAdapter全体実行で既存context menu 1件が一度timeoutしたが、単独再実行と全体再実行で再現せずPASSした。`.zizd` schema、Bridge、WorkflowDesigner library／vendor、WorkspaceManagerは変更していない。
- WP-10E Integration verification evidence（Claude実行分、2026-09-02）: Claude Sonnetが許可された自動検証コマンドのみを実行した。combined Playwright `.\tests\playwright\node_modules\.bin\playwright.cmd test tests/playwright/specs/catalog-panel-adapter.spec.js tests/playwright/specs/workflow-designer-adapter.spec.js tests/playwright/specs/workflow-designer-baseline.spec.js tests/playwright/specs/ui-shell.spec.js --config tests/playwright/playwright.config.js --project=chromium`は、本session権限設定がBashからのPlaywright実行（`.cmd`直接呼び出し、node CLI経由の代替呼び出しとも）を拒否したため未実行であり、結果は不明である。以降Claude実行分の結論はこのcombined Playwright結果に依存しない。targeted pytest `python -m pytest tests/unit/test_catalog_samples_source_config.py tests/static/test_frontend_library_vendor_contract.py tests/static/test_frontend_asset_contract.py tests/static/test_task012_frontend_boundary_contract.py -q`は`63 passed, 29 errors`で、29件は全て`test_catalog_samples_source_config.py`の`tmp_path`固定によるWindows `AppData\Local\Temp\pytest-of-tomoh`への`PermissionError`（既出のWindows Temp権限問題）であり、catalog assertion自体の失敗は0件である。`node --check apps/gui/js/catalog.adapter.js`、`node --check apps/gui/js/app-shell.js`、`node --check apps/gui/js/workspace.manager.js`、`node --check tests/playwright/specs/catalog-panel-adapter.spec.js`の4件は全てPASS。upstream一時clone`.tmp/zizai-catalog-panel-wp10a`（branch `codex/task-016-catalog-panel-host-activation`、local HEADと`origin`追跡refがともに`7221e4f5c970a221c1c6b8d50b19eeb8962413ea`で一致し、`apps/gui/vendor/README.md`記載のpinned commitとも一致）の`src/catalog-panel.js`と`apps/gui/vendor/zizai-catalog-panel/src/catalog-panel.js`は`cmp`でbyte一致、`sha256sum`は両者とも`cca56039e347ce1020c6c8f056105c0982e729447e8b74a1b9423e1f04e4598b`で一致した。`git diff --check`はCRLF変換警告のみでtrailing whitespace／conflict marker違反0、`git status`は本WorktreeがWP-10A～WP-10D-R4に加え他Task（TASK-022～026 draft、`nlp_connector.py`等）のdirty changeを含んだ未整理状態のままであることを確認した。Windows実機WebEngineでのCatalog手動smokeは本WP-10Eでは未実施である。以上はClaude Sonnetによる読取専用の自動検証実行記録であり、combined Playwrightの独立実行、Codexによる本Evidenceの照合、dirty Worktree帰属の整理、Windows手動smokeを含む最終AcceptanceはCodexが別途行う。

## Deferred / transferred items

- 2026-09-08のTASK-015 release stagingで、正本仕様・Task・専用Testを持たず未追跡だった`nlp_connector.py`をProject owner判断により初期releaseから除外し、connector inventory登録も削除した。WP-11の登録・Test件数は当時の履歴Evidenceとして維持し、現行release contractには使用しない。

- 1つのYAML（`.zizd`）に複数の独立flowを保存・切替・実行する要件は初期releaseへ含めない。初期release後の独立設計Taskで、YAML schema、flow切替UI、変数／結果境界、実行対象選択を検討する。
- Action単位のPattern A〜F、schema編集可否、列除外、型別filter／数値表示の個別改修はTASK-025へ分離し、TASK-016へ追加しない。
- Claude Codeへの通信経路、sandbox外実行、権限承認、再試行・error報告方法の再検討はTASK-026へ分離し、TASK-016の完了条件へ追加しない。
- SQL editor header余白、BigQueryを基準とするshortcut／selection／部分実行、予約語／column suggestは、同一releaseへ含めずTASK-020で初回release後に検討する。
- step実行feedback／cancelはTASK-021、exportはTASK-022、paged result deliveryはTASK-023、Windows connector分割はTASK-024へ分離した。
- BigQuery実接続検証はTASK-027へ分離した。

## Remaining

None.

## Exact next action

None. 実flowの実行確認はrelease candidate固定後にTASK-015 `WP-EXEC`で行う。

## Termination condition

全7 libraryがProject owner承認spaceで使用され、Application側の同一UI責務が削除され、全Acceptance criteriaとVerification GateがPASSしてEvidenceが保存されること。
