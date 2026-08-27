# TASK-020 Design SQL Editor Productivity Improvements

## Status

Deferred — post-v23 initial release; do not include in the TASK-016／TASK-015 release

## Goal

SQL editorの表示余白、keyboard editing、部分実行、suggestを一体として再評価し、BigQuery editorの操作体系を基準にZizAIで対応する範囲と後続実装計画をProject ownerが承認できる状態にする。

## End State

SQL editorのheader／固定操作欄、shortcut、selection、部分実行、keyword／column suggestについて、採用・不採用・保留、操作contract、data source、security／performance境界、Test条件がCurrent Specificationと後続実装Taskへ記録されている。

## Goal Traceability

- SQL editor header余白の再検討 → WP-1
- BigQueryを基準とするshortcut／selection／部分実行の対応範囲決定 → WP-2
- 予約語／column suggestの方式決定 → WP-3
- 同一releaseへ混在させない実装境界の確定 → WP-4

## Critical Path

`TASK-016完了 → v23初回release／TASK-015完了 → WP-1 + WP-2 + WP-3 → WP-4 → 後続実装Task`。

## Parallel Work

WP-1、WP-2、WP-3の限定調査は並行可能。統合したinteractionと実装境界はWP-4で決定する。

## Task Graph Changes

- 本TaskはTASK-016の追加Acceptance criteriaにしない。
- 本TaskはTASK-015のv23 Migration Completion依存条件に含めず、初回release後に開始する。
- 本TaskではApplication codeを変更せず、承認後に別の実装Taskを作成する。

## Deferred Decisions

- Header余白と固定操作欄の最終layout: Project ownerがWP-1完了時に決定する。
- 対応shortcutとBigQuery互換範囲: Project ownerがWP-2完了時に決定する。
- 指定範囲実行のselection／実行単位／error表示: Project ownerがWP-2完了時に決定する。
- Column suggestのschema取得元、cache、更新契機、権限境界: Project ownerがWP-3完了時に決定する。

## Source

- `docs/features/frontend-libraries.md`
- `docs/features/coding-rules.md`
- `docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`
- TASK-016のWindows実画面確認（2026-08-26）
- TASK開始時点のBigQuery公式editor shortcut／query execution仕様

## Scope

- SQL editor header／固定操作欄の余白と表示密度を再評価する。
- keyboard shortcut、矩形選択、複数行選択時のindent／outdent、検索（Ctrl+F等）、指定範囲実行を候補化する。
- BigQuery editorのshortcutを基準に、ZizAIで採用する範囲とOS／WebEngine衝突を評価する。
- SQL予約語suggestと、接続先schemaに基づくtable／column suggestのdata flowを検討する。
- accessibility、security、large schema performance、offline／failure behavior、Test方法を定義する。

## Out of scope

- TASK-016と同じ変更・commit・releaseへの実装混在。
- 本Task中のApplication／vendor／Bridge／Connector code変更。
- BigQueryとの完全互換を事前に約束すること。
- 資格情報や未検証schemaをFrontend libraryへ直接渡すこと。

## Dependencies

- TASK-016完了。
- TASK-015のv23 Migration Completionと初回release完了。

## Expected change area

- `docs/features/frontend.md`またはSQL editor専用Current Specification
- `docs/decisions/`
- 後続の実装Task定義

## Acceptance criteria

- Header余白について、現状、課題、候補layout、採用案が実画面寸法とともに記録される。
- Shortcut候補ごとに既定key、対象OS、Browser／WebEngine／Application shortcut衝突、採否が記録される。
- 矩形選択、複数行indent／outdent、検索、指定範囲実行の期待挙動と非対応時挙動が定義される。
- 予約語／table／column suggestのdata source、更新頻度、access頻度、security、即時性、failure／cache contractが定義される。
- 初回releaseへ影響せず、承認済み範囲だけを実装する後続Taskが作成される。

## Test plan

- Keybinding conflict matrixと代表操作のmanual prototype／WebEngine spike。
- Selection、indent／outdent、find、部分実行payloadのbehavior Test案。
- Suggest ranking、schema更新、large schema、offline／permission failureのTest案。
- Header layoutのWindows実画面比較。

## Migration risk

Low for this Task — documentation and decision only. Follow-up implementation risk is Medium to High because editor input、execution boundary、schema accessを横断する。

## Rollback

Yes — 本Taskは仕様・Decision・後続計画だけを作成する。

## Parallelizable

Conditional — WP-1～WP-3は並行可能だが、Project ownerの統合判断は直列。

## Recommended branch

`codex/task-020-sql-editor-productivity-design`

## Worktree

Required when this deferred Task starts. Do not start it in the TASK-016 Worktree.

## Work Package plan

### WP-1 Header spacing and floating-controls review

Owner: Codex

Assignment Reason: Windows実画面とProject ownerの表示判断が中心で、実装を伴わないため。

Task: SQL editor header余白と固定操作欄の候補layoutを比較し、採用案を決定する。

Dependencies:
- v23初回release完了。

Read Scope:
- SQL editor Current Specification、TASK-016 Evidence、現行Workspace UI／CSS。

Edit Scope:
- 本Task、承認されたCurrent Specification／Decision。

Acceptance Criteria:
- 採用layout、寸法、scroll時挙動、SQL／非SQL差が承認される。

Constraints:
- Application codeを変更しない。

Tests:
- Windows実画面比較とlayout measurement案。

Codex Verification:
- 承認内容と記録内容を照合する。

### WP-2 BigQuery-based editing and execution shortcut scope

Owner: Codex

Assignment Reason: 外部仕様の現行確認、Application shortcutとの競合、Project owner判断が中心のため。

Task: BigQuery editorを基準に、keyboard shortcut、矩形選択、複数行indent／outdent、Ctrl+F、指定範囲実行の採否とcontractを決める。

Dependencies:
- v23初回release完了。

Read Scope:
- BigQuery公式仕様、現行editor／shortcut／run contract、関連Test。

Edit Scope:
- 本Task、承認されたCurrent Specification／Decision。

Acceptance Criteria:
- 候補ごとのkey、操作、衝突、採否、部分実行単位とerror contractが承認される。

Constraints:
- BigQuery互換を推測しない。開始時点の公式仕様を確認する。

Tests:
- Keybinding conflict matrixとWebEngine prototype案。

Codex Verification:
- 公式仕様、現行Application contract、承認判断を照合する。

### WP-3 Keyword and schema suggestion design

Owner: Codex

Assignment Reason: schema access、cache、security、即時性をユーザーと決める設計Taskであるため。

Task: 予約語、table、column suggestのdata source、ranking、cache、更新、failure／permission boundaryを決める。

Dependencies:
- v23初回release完了。

Read Scope:
- 現行suggest、Connector／Bridge contract、SQL Highlighter API、schema取得経路。

Edit Scope:
- 本Task、承認されたCurrent Specification／Decision。

Acceptance Criteria:
- data source、更新頻度、access頻度、security、即時性、large schema、failure contractが承認される。

Constraints:
- 資格情報、汎用filesystem path、未検証schemaをFrontend libraryへ直接渡さない。

Tests:
- Suggest ranking、cache invalidation、offline／permission、large schema Test案。

Codex Verification:
- ArchitectureとSource／Runtime／Workspace境界への適合を確認する。

### WP-4 Approved specification and follow-up implementation task

Owner: Codex

Assignment Reason: WP間の統合判断とrelease境界の確定が必要なため。

Task: WP-1～WP-3の承認結果をCurrent Specificationへ統合し、実装Work Packageとownerを持つ別Taskを作成する。

Dependencies:
- WP-1、WP-2、WP-3。

Read Scope:
- WP-1～WP-3の承認記録、関連Current Specification、Task graph。

Edit Scope:
- Current Specification、Decision、後続実装Task。

Acceptance Criteria:
- 未決定を推測せず、承認済み範囲だけを実装する後続Taskが作成される。

Constraints:
- TASK-016／TASK-015のreleaseへ遡及追加しない。

Tests:
- Goal traceability、dependency、scope、acceptance担当のplan review。

Codex Verification:
- 後続Taskが承認Decisionとrelease境界に一致することを確認する。

## Completed

- Project ownerが2026-08-26に将来検討項目と初回releaseからの分離を指示した。
- 将来の設計TaskとしてTASK-020を作成した。

## Evidence

- TASK-016 Windows実画面確認で、SQL editor header余白と将来のeditor productivity機能を別releaseで検討する判断が行われた。

## Remaining

- v23初回release後にWP-1～WP-3を開始する。

## Exact next action

TASK-015とv23初回releaseが完了するまで開始しない。

## Termination condition

WP-1～WP-3の判断が承認・正本化され、別release向けの後続実装Taskが作成されること。
