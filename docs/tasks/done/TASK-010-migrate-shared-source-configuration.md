# TASK-010 Migrate Shared Source Configuration

## Status

Completed

## Goal

GUI、Desktop、Coreが参照するSource設定を`apps/common/config`へ移し、Runtime stateを分離する。

## End State

4種のSource設定だけが`apps/common/config/`に存在し、Application Adapter、Python consumer、Testが同じSource config rootを使用する。`recent_flows.json`、`recent_roots.json`等のRuntime/User stateは保存場所・内容・挙動が変わらない。既存`.zizd`は自動変換しないが、旧`config\rename.csv`参照との動作互換は提供しない。

## Goal Traceability

- Source設定の単一配置 → Source config path、consumer、layout contract、旧参照0
- Runtime/User state非変更 → Runtime state path/content回帰Test
- `rename_list_path`互換終了 → 旧参照fallback 0、新規既定値・Repository管理Templateの新参照
- Frontend libraryとの責務分離 → Application Adapterだけがconfigを読み、libraryへpath/scopeを渡さない

## Critical Path

`TASK-005 + TASK-018 → TASK-019 → Source/Runtime Bridge boundary decision（完了）→ rename path compatibility decision（完了）→ TASK-010 → TASK-011`。

## Parallel Work

TASK-005とTASK-018は並行可能。TASK-019はTASK-018後、TASK-005およびTASK-010の未決定事項整理と並行可能。

## Task Graph Changes

- non-http(s)拒否とexternal navigation behavior修正はTASK-019へ分離する。
- TASK-005の`template/`Dispositionを、保存済み`rename_list_path`互換判断の入力にする。
- TASK-016の8 libraryは本Taskのconsumerにならず、Application Adapterから解決済み値を受け取る。

## Deferred Decisions

None.

## Resolved Decisions

- Source/Runtime/Workspace境界は`docs/decisions/ADR-source-runtime-workspace-boundary.md`でAcceptedとなった。
- Source=`apps/common/config/`、Runtime=`config/`、Workspace既定=`workflows/`を共通Resolverから解決する。
- Protocol `1.0`の31 Commandを維持し、追加payload/scopeだけを使用する。
- SourceとRuntimeの保存先pathはFrontendへ返さず、Runtime内部fileをExplorerへ表示しない。
- 旧`config\rename.csv`との互換は提供せず、fallback/copy/自動変換を行わない。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- `docs/handoffs/v23-unmapped-assets-disposition.md`
- `docs/decisions/ADR-source-runtime-workspace-boundary.md`
- `docs/decisions/ADR-rename-list-path-compatibility.md`
- TASK-008 Regression Baseline
- TASK-018 Frontend Library Integration Contract
- TASK-019 External URL Scheme Boundary

## Scope

`security_policies.yml`、`rename.csv`、`file_icon_map.json`、`suggest_index`を移動し、全consumer参照を同時更新する。

## Out of scope

`recent_flows.json`、`recent_roots.json`等のRuntime state移動、Application package移動、UI transport変更、8 Frontend libraryの導入と重複UI削除（TASK-016）、external URLのscheme/navigation behavior修正（TASK-019）。

## Dependencies

- TASK-008の検証基盤実装。
- TASK-005で`template/`を含む未配置資産のDispositionが確定していること。
- TASK-018で8 libraryとApplication Adapterのconfig責務境界が正本化されていること。
- TASK-019でnon-http(s)拒否を含む`RISK-CONFIG-001`の既知behavior gapが解消していること。
- Source/Runtime Bridge boundaryはProject owner承認済みDecisionに従うこと。
- 既存`.zizd`のrename path互換方式はProject owner承認済みDecisionに従うこと。

FS要件は承認済みDecisionどおりTASK-015が担当し、本TaskをBlockしない。TASK-007はNot Activatedのため依存しない。

## Expected change area

- `apps/common/config/`
- `config/`（Source設定4種の移動元だけ。Runtime stateは変更しない）
- `core/repository_layout.py`
- `core/security_policies.py`
- `core/flow_locator.py`
- `connectors/dataintegration_connector.py`
- `app/gui/bridge.py`
- `app/gui/host.py`
- `static/config/`
- `static/js/`
- `template/*.zizd`
- `tests/`

## Acceptance criteria

- Source設定が`apps/common/config`だけに存在する。
- Python/JS/Bridge consumerが新Pathを使用する。
- Runtime stateの保存場所と既存ユーザーデータは変わらない。
- 旧`config\rename.csv`へのfallback/copyを追加せず、利用者保存済み`.zizd`を自動変換しない。
- 新規node既定値とRepository管理Templateは`apps\common\config\rename.csv`を使用し、新pathで同じrename mappingを解決する。
- `file_icon_map.json`はApplication Adapterが取得し、Frontend libraryへSource config pathまたはBridge scopeを公開しない。
- layout contractがSource config rootとRuntime state rootを別fieldで表現する。
- 明示repository rootからSource/Runtime/Workspace rootを解決する共通Resolverを使用し、Testからrootを差し替えられる。
- Bridge Protocol `1.0`の31 Command/8 Eventと既存payload fieldを維持し、deprecated path fieldは空stringにする。
- Source rootは`workspace.*`の汎用scopeから到達不能で、Runtime内部fileを表示するExplorer `Config` nodeが存在しない。
- icon mapは`app.getStatus`の追加payload、suggest indexは既存`app.getSuggestIndex`で取得し、機能操作ごとのBridge callを行わない。
- security policy破損時はfail-closed、suggest取得失敗時は次回利用で再試行し、Runtime dataは移行前後で不変である。
- `static/js/code.editor.js`の旧`/config`／`/static/config` fetch fallbackを含め、旧Source config pathの有効参照が0である。
- MOVE前にCode/Runtime/Test/CI/Documentationの旧参照が0になる。
- Security、suggest、rename、icon mapのBaseline TestがPASSする。

## Test plan

- `unit`: policy/config loading、missing/invalid configのfail-closed判定。
- `integration`: Bridgeからsuggest/icon mapを取得し、Protocol command/event数とdeprecated fieldを維持する。
- `e2e`: Windows UIでicon mapまたはsuggest indexが反映され、ExplorerにRuntime `Config` nodeが表示されない。
- `regression`: Runtime state path/contentの不変、旧rename pathのfallback 0、新rename pathのmapping確認。
- `static-analysis`: 旧Source config pathの有効参照0。
- CIはBaseline suiteの同一commandを実行する。RISK-FS-001はTASK-015までexit `2`のBlockedを維持し、本Taskの不合格へ読み替えない。

## Implementation Work Packages（Approved 2026-08-24）

実行方式は工程単位を基本とし、WP-2の内部だけを`Resolver → Core → Connector → Bridge → Frontend/Template → 旧参照確認 → MOVE`の領域順で進める。各領域の関連Testを直後に実行するが、正式な合格判定はWP-3の統合検証で行う。

### WP-1 Goal-state contract tests

- `Owner`: `claude-assist`
- `Assignment Reason`: 期待挙動、Read/Edit Scope、失敗条件が確定しており、Repository内のTest追加として独立確認できる。
- `Task`: Production codeとSource資産を変更せず、TASK-010のGoal-state contractとRuntime regressionを先にTestへ固定する。
- `Dependencies`: Accepted ADR 2件と本TaskのAcceptance criteria。
- `Read Scope`: `AGENTS.md`、`docs/README.md`、`docs/features/`、本Task、対象ADR、`app/gui/`、`core/`、`connectors/`、`static/`、`template/*.zizd`、既存の関連Test/fixture。
- `Edit Scope`: TASK-010専用の新規Test fileを中心とする`tests/unit/`、`tests/integration/`、`tests/e2e/`、`tests/playwright/specs/`、および必要最小限のcleanな`tests/fixtures/`。既存未コミット変更を含むTest fileは編集しない。
- `Acceptance Criteria`: 共通Resolver、Source/Runtime layout分離、Protocol 31 Command/8 Event、deprecated path field空文字、Source scope到達不能、icon/suggest取得、Runtime不変、Explorer Config node非表示、rename新path/旧fallbackなしをTestで表現し、未実装による期待どおりの失敗だけを識別できる。
- `Constraints`: Production code、4 Source資産、既存未コミット差分、Protocol command/event fixtureの集合を変更しない。commit/pushしない。
- `Tests`: TASK-010専用pytest/Playwright testを選択実行し、RED理由をTest ID単位で記録する。
- `Codex Verification`: 実行前後status、変更範囲、既存差分非変更、各REDがAcceptance criteriaへ対応することを独立確認する。

### WP-2A Clean-scope Source configuration implementation

- `Owner`: `claude-assist`
- `Assignment Reason`: 仕様と対象が確定したまとまった実装で、既存未コミット変更と重ならないfileだけに限定してRepository内で完結できる。
- `Task`: 明示Repository rootを受ける共通Path Resolverを追加し、cleanなCore/Connector/Frontend consumer、rename default/Repository管理Templateを新契約へ更新する。4 Source資産のMOVEと既存変更3 fileの結合は行わない。
- `Dependencies`: WP-1完了。Project ownerがWP-2のOwner分割を承認済みであること。
- `Read Scope`: WP-1のRead Scope、WP-1で追加したTest、`tests/run-verification.ps1`、関連layout/Bridge fixture。
- `Edit Scope`: `core/repository_layout.py`、`core/flow_locator.py`、`connectors/dataintegration_connector.py`、`static/config/config.js`、`static/js/app.js`、`static/js/app.home.js`、`static/js/code.editor.js`、`static/js/workspace.manager.js`、`template/*.zizd`。
- `Acceptance Criteria`: Resolverとclean consumerが承認済みroot境界を使用し、Connectorのrelative rename path、Frontendのruntime scope/icon/suggest/workspace default、rename default/TemplateがWP-1契約に一致する。既存変更fileを変更しない。
- `Constraints`: `app/gui/bridge.py`、`app/gui/host.py`、`core/security_policies.py`、Test、4 Source資産を編集しない。Runtime state、旧rename fallback、自動変換、新Command/Event、Source path公開、WebView file例外、TASK-016 library導入、commit/pushを行わない。WP-2B前の中間状態をTask完了扱いしない。
- `Tests`: WP-1のunit/static contractと、Connector/Templateの実行可能な対象Testを実行する。Backend結合とSource資産MOVEに依存するREDはWP-2Bへ引き継ぐ。
- `Codex Verification`: 実行前後status、変更範囲、既存差分非変更、Resolver/Connector/Frontend contractを独立確認する。

### WP-2B Backend integration and atomic MOVE

- `Owner`: `Codex`
- `Assignment Reason`: `app/gui/bridge.py`、`app/gui/host.py`、`core/security_policies.py`に既存の承認済み未コミット変更があり、差分保全とPackage統合をCodexが担当する必要がある。
- `Task`: 既存変更3 fileを新Resolverへ結合し、4 Source資産を最後にMOVEしてWP-1全体をGREENにする。
- `Dependencies`: WP-2A完了。
- `Read Scope`: WP-2Aの全変更、本TaskとADR、既存未コミットdiff、4 Source資産、WP-1 Test、関連既存Test/fixture。
- `Edit Scope`: `app/gui/bridge.py`、`app/gui/host.py`、`core/security_policies.py`、`apps/common/config/`、移動元`config/`の4 Source設定、およびWP-2Aとの結合に必要な最小修正。WP-1 Testの意味は変更しない。
- `Acceptance Criteria`: 4 Source設定だけが新rootに存在し、全consumerが共通Resolverを使用する。Runtime state path/content、Protocol 31/8、既存payload fieldを維持し、WP-1全体がGREENになる。
- `Constraints`: 既存承認済み差分を保持する。Runtime state移動/書換、旧rename fallback/copy/自動変換、新Command/Event、Source path公開、WebView file例外、TASK-016 library導入、branch切替、commit/pushを行わない。
- `Tests`: WP-1全体、関連既存unit/integration/e2e、`RISK-PATH-001`、`RISK-CONFIG-001`、`RISK-BRIDGE-001`。
- `Codex Verification`: 資産配置、旧有効参照0、Runtime不変、Protocol fixture集合、既存差分保全を確認する。

### WP-3 Integration verification and closeout

- `Owner`: `Codex`
- `Assignment Reason`: Package間の統合判断、既存差分との整合、最終Acceptance判定、Task完了記録はCodexが担当する。
- `Task`: 全Acceptance criteriaを統合検証し、EvidenceとTask状態を更新する。
- `Dependencies`: WP-2完了。
- `Read Scope`: 本TaskのSource/Expected change area/Test plan、全WP差分、検証contract、対象Test/fixture。
- `Edit Scope`: 本Taskと、実装結果により更新が必要な正規文書/Evidenceだけ。Product defectはWP-2へ戻し、Codexが実装Scopeを黙って拡張しない。
- `Acceptance Criteria`: 旧有効参照0、Runtime path/content不変、Protocol/layout/security/suggest/rename/icon/UI契約、必要Risk gateがすべてTask定義どおり判定され、未解決事項がない。
- `Constraints`: RISK-FS-001の既存Blockedを失敗またはPassへ読み替えない。branch切替、commit、push、既存差分の巻戻しを行わない。
- `Tests`: 対象pytest/Playwright、`RISK-PATH-001`、`RISK-CONFIG-001`、`RISK-BRIDGE-001`、`RISK-CI-001`、`RISK-WEB-001`、`git diff --check`、旧参照static audit。
- `Codex Verification`: 実行結果を一次確認し、Acceptance criteriaとEvidenceの対応を確認して完了可否を判断する。

## Migration risk

Medium — PythonとWeb双方のPath参照を同時に変更するため。

## Rollback

Conditional — 後続Application Migration後は依存Taskも戻す必要がある。

## Parallelizable

No — 先行Dependencyと2件のProject owner decisionを確定後に実施する。

## Recommended branch

`migration/common-config`

## Worktree

Required

## Reason for task boundary

Config MOVEと全consumer更新は同じOutcomeを構成し、分割すると実行時に設定を読めない状態になる。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- Project ownerが3 Work Packageと、工程単位を基本にWP-2内部だけを領域順で進める実行方式を承認した。
- WP-1でTASK-010専用のGoal-state contract Testとfixtureを追加し、Production code、Source資産、既存未コミット差分を変更せず期待REDを確認した。
- WP-2Aで共通Resolver、cleanなCore/Connector/Frontend consumer、rename default/Repository管理Templateを実装し、既存未コミット変更3 fileとSource資産を変更していないことを確認した。
- WP-2Bで既存変更3 fileを共通Resolverへ結合し、4 Source設定を`apps/common/config/`へ内容不変でMOVEした。
- WP-3で統合検証を実施し、テスト用Bridgeがroot Runtime履歴を生成する副作用を修正した。誤生成されたテスト履歴だけを削除し、作業開始時のRuntime state不在を復元した。
- 新規・MOVE済みverification sourceをGit追跡した状態で全Task gateがPASSし、Termination conditionを満たした。

## Evidence

- TASK-008が依存条件として定義され、TASK-007はNot Activatedである。
- TASK-008の検証基盤はlocal commit `2978e2f`で確立された。
- TASK-017により、CONFIGの既知scheme FailはTASK-019へ分離し、保存済み`.zizd`のrename path互換とSource/Runtime Bridge boundaryを本Taskの着手前Decisionとした。
- TASK-005が完了し、root `template/`のKEEPと`rename_list_path`に関する`D2`への制約が確定した。
- TASK-018が完了し、Frontend libraryとApplication Adapterのconfig責務境界が正本化された。
- TASK-019が完了し、`RISK-CONFIG-001`を含むexternal URL scheme gapが解消された。
- Project ownerがSource/Runtime/Workspace境界を承認し、Claude Opusの限定reviewとCodexの一次情報照合を反映したADRを作成した。
- Project ownerが旧`config\rename.csv`との後方互換を不要と決定し、fallback/copy/自動変換を行わないADRを作成した。
- WP-1 Python contractは`18 failed / 3 passed`で、18件はTASK-010未実装、3件はProtocol 31/8維持・旧rename fallbackなし・保存済み`.zizd`非変換を示した。環境由来errorは0件。
- WP-1 WebEngine contractは`2 failed`で、`app.getStatus`のicon map未提供とgeneric `config` scopeからSource設定4種へ到達可能な現行挙動を示した。
- WP-2Aは対象Python/JS構文がPASSし、Frontend/Connector/既存layout対象Testが`11 passed`、Codex限定修正後の再確認が`8 passed`となった。Resolver contractはroot導出2件がPASSし、Source資産MOVE待ち2件だけがREDである。
- WP-2B後のGoal-state contractはPython `21 passed`、WebEngine `2 passed`。関連既存Testはsymlink権限を要するTASK-015担当3件を除き`54 passed`である。
- Canonical gateは`RISK-PATH-001: 8 passed`、`RISK-CONFIG-001: 41 passed`、`RISK-BRIDGE-001: 27 passed`、`RISK-WEB-001: Python 5 passed / Playwright 4 passed`。`git diff --check`もPASSした。
- 旧Source rootの有効参照は0、Source設定7 fileのMOVE前後SHA-256は一致し、root `config/recent_flows.json`は回帰Testと`RISK-CONFIG-001`後も存在しない。
- `RISK-CI-001`は新規・MOVE済みverification sourceのGit追跡後に`23 passed`となった。
- `RISK-FS-001`はsymlink capability不在による既知Blockedを維持し、TASK-015が担当する。

## Remaining

なし。

## Exact next action

なし。Termination conditionを満たしたため`done/`へ移す。

## Termination condition

Acceptance criteriaと全VerificationがPASSし、Runtime stateと既存ユーザーデータを変更していないこと。
