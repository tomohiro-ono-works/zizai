# TASK-014 Remove Approved Legacy and Generated Residue

## Status

Completed — 2026-09-07

## Goal

Migration完了後、承認済みのLegacy sourceとSource管理上の生成物残骸を安全に除去する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- TASK-003のDisposition
- `docs/handoffs/v23-unmapped-assets-disposition.md`
- TASK-006～013、TASK-016、TASK-018、TASK-019の最終状態

## Scope

TASK-016の対象外である承認済みdead asset、空notebook、Playwright生成物、legacy docs/harness container、obsolete path/shimを最終Gate後に除去する。

## Out of scope

判断保留項目、個人local cacheの物理削除、WIP統合、機能変更、7 libraryと重複するApplication UI責務の削除（TASK-016の各Work Package）。

## Dependencies

TASK-003、TASK-005、TASK-006～013、TASK-016、TASK-018、TASK-019。初期release後へ延期したTASK-020～TASK-027は依存に含めない。TASK-016の全space移行と重複UI削除が完了するまで本Taskを開始しない。

## Expected change area

承認済みREMOVE_CANDIDATE、`.gitignore`、参照Documentation。

## Acceptance criteria

削除対象ごとに以下が0である。

- Code reference
- Runtime reference
- Test reference
- CI reference
- Active / canonical documentationにおける旧Pathへの有効参照

加えて、全Regression/Runtime/CI GateがPASSし、未承認ファイルは削除されていない。

Documentation referenceは次の基準で判定する。

- FAIL: README、AGENTS、canonical docs、現行runbook、setup/test手順などで、旧Pathを現在有効な参照先または実行先として使用しているもの。
- PASS対象: `docs/handoffs/`、`docs/decisions/`、migration audit、Disposition等で、旧Pathをhistorical evidenceとして記録しているもの。
- historical文書でも、旧Pathを現行の参照先または実行先として指示している場合はFAILとする。

## Test plan

- `static-analysis`: 判定定義に従うreference scanと削除対象照合。
- `unit` / `integration`: 全Regression suite。
- `e2e` / `manual-ui`: 承認済みRuntime Gate。
- CIは必須Gateをfull runする。
- Git diffによる削除対象照合。

## Migration risk

High — 破壊的変更であり、一部local資産はGit復元できないため。

## Rollback

Conditional — tracked fileは可能。untracked/local資産は削除対象に含めない。

## Parallelizable

No — 全Migration完了後だけ実行する。

## Recommended branch

`migration/legacy-cleanup`

## Worktree

Not required

## Reason for task boundary

全REMOVE_CANDIDATEが同じ「参照0＋全Gate PASS」という完了条件を共有し、Migration途中では単独実行できないため最後の1 Taskへ統合する。

## Approved execution plan

End State: 承認済みtracked residueだけが除去され、root `template/`は`.gitkeep`で維持され、Application behaviorとlocal-only資産に変更がない。

Goal Traceability:

- 削除対象ごとの5分類Reference `0` → WP-14A
- 承認済み対象だけを除去 → WP-14B
- 全Regression/Runtime/CI Gate PASSと未承認削除`0` → WP-14C

Critical Path: WP-14A → WP-14B → WP-14C

Parallel Work: None — 削除前Gateと削除後検証を直列実行する。

Task Graph Changes: None

Deferred Decisions:

- `.gitignore`全体見直しはTASK-015で扱う。本Taskでは変更しない。

### WP-14A Approved candidate and reference gate

- Owner: Codex
- Assignment Reason: Project ownerの承認履歴と5分類Reference Gateを統合判断する作業であるため。
- Task: 承認済みtracked対象を固定し、Code/Runtime/Test/CI/active documentationの参照が`0`であることを確認する。
- Dependencies: TASK-013、TASK-016完了。
- Read Scope: `docs/features/refactor-policy.md`、TASK-003/005/013/014、関連Handoff、対象名のRepository参照。
- Edit Scope: 本TaskのEvidenceのみ。
- Acceptance Criteria: 未承認・local-only対象を候補へ追加せず、各対象のGate結果が記録される。
- Constraints: Application code、Test code、`.gitignore`を変更しない。
- Tests: 対象限定`git ls-files`、`git status`、`rg` reference scan。
- Codex Verification: 現行treeとGit tree/historyを再照合する。

### WP-14B Apply approved removals

- Owner: Codex
- Assignment Reason: 既存削除差分の維持と0-byte notebook 1件の削除だけで、委譲コストが上回るため。
- Task: 既存の承認済み削除差分を維持し、`core/テスト.ipynb`を削除する。旧UI解析tool、`.pyc`、Playwright生成物はtracked residueが存在しないことだけ確認する。
- Dependencies: WP-14A PASS。
- Read Scope: WP-14Aで確定した対象path。
- Edit Scope: `core/テスト.ipynb`、既存の承認済み削除差分。
- Acceptance Criteria: root `template/.gitkeep`が残り、承認済みtracked対象だけが削除差分となる。
- Constraints: local-only資産を物理削除しない。新規cleanup対象を追加しない。
- Tests: 対象限定Git diffとfilesystem存在確認。
- Codex Verification: 削除差分を承認済み一覧と完全一致で照合する。

### WP-14C Regression verification and closeout

- Owner: Codex
- Assignment Reason: Task全体のAcceptance判定と完了記録を担うため。
- Task: full verificationを実行し、Evidenceを記録してTaskを完了状態へ移す。
- Dependencies: WP-14B完了。
- Read Scope: `tests/`、`pyproject.toml`、`package.json`、TASK-014。
- Edit Scope: TASK-014と直接参照するTask state documentation。
- Acceptance Criteria: 全自動GateがPASSし、未承認削除`0`、実画面確認が必要な項目は既存の承認済みRuntime GateをEvidenceとして明記する。
- Constraints: commit、push、branch切替を行わない。
- Tests: Repository標準full verification、`git diff --check`、削除対象照合。
- Codex Verification: fresh test outputと最終Git diffを確認する。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- Project ownerが承認した実行計画をWork Packageとして記録した。
- WP-14A: 現行削除対象6件を固定し、Code／Runtime／Test／CI／active documentationの5分類Reference Gateを実行した。有効参照は0件だった。
- WP-14A: 過去に削除済みの`template/preview.html`、`template/rename_pdf.py`、`template/rename_pdf_rules.json`、`zizai-craft.pptx`は現行HEADにも存在せず、有効参照0を再確認した。
- WP-14A: 旧UI解析tool、`.pyc`、Playwright生成物、legacy harness containerに現行tracked residueが存在しないことを確認した。local-only実体は操作していない。
- WP-14B: 既存の承認済み削除差分5件を維持し、0-byteの`core/テスト.ipynb`を削除した。`template/.gitkeep`は保持した。
- WP-14C: OS設定を変更せず、管理者PowerShellでsymlink capabilityを満たしてcanonical required Gateを完了した。最終E2E、削除対象照合、diff checkも完了した。

## Evidence

- Investigationと全Migration Taskが依存条件として定義されている。
- TASK-017の監査により、Frontend重複UI削除をTASK-016へ閉じ、本Taskをその他の承認済みlegacy/generated residueへ限定した。
- TASK-005が完了した。`D14`〜`D16`のtracked 4 fileはProject ownerが先行削除済みのため、TASK-014では不在を理由にGateを省略せず、削除前のGit tree/historyと現行treeを用いて5分類Reference `0`と承認済み差分を検証する。
- 現行削除差分は`core/テスト.ipynb`、`scripts/requirements_inventory.csv`、`tableau-mcp/`の2 file、`template/`のsample `.zizd` 2 fileの計6件である。
- 対象名の`apps/`、`bin/`、`config/`、`tests/`、`.github/`、README、AGENTS、`docs/features/`、`docs/tasks/active/`検索では、TASK-014自身の削除指示を除く有効参照0件だった。
- `git ls-files`照合で、旧UI解析tool、`.pyc`、Playwright `artifacts`／`results`／`test-results`／`playwright-report`、`.codex-harness/`、`.docs/`のtracked residueは0件だった。
- `static-analysis`: `113 passed, 155 deselected`。
- `integration`: `46 passed, 222 deselected`。既知のPandas deprecated warning 6件のみ。
- `e2e`: Python `4 passed, 264 deselected`、Playwright `137 passed`。
- `required`: symlink作成権限のある管理者PowerShellで`static-analysis`、`unit`、`integration`の全GateがPASSした。Windows Developer Modeやregistryは変更していない。
- `RISK-FS-001`: 2026-09-07に同じ管理者PowerShell実行内でPASSし、TASK-008から延期されていたsymlink実機検証を完了した。
- 最終`e2e`: Python `4 passed, 264 deselected`、Playwright `137 passed`。
- 最終E2Eに先立つ2回の全実行ではWorkflowDesignerの異なる1件が各1回だけ失敗した。各対象を単独1回＋`--repeat-each=5`で再実行して全件PASSし、最後の全137件もPASSしたため、一過性のtest timingとして記録し、Application修正は行っていない。
- pytest既定Tempに既存権限不整合があるため、検証はignoredな`.tmp/task014-*`を`--basetemp`として使用した。Source変更は行っていない。
- 最終`git diff --check`は改行変換warningのみで違反0件。削除差分6件は承認済み一覧と一致し、`template/.gitkeep`の存在を確認した。

## Remaining

None

## Exact next action

TASK-015でMigration全体の最終Acceptanceを検証する。

## Termination condition

全削除対象が5分類Reference 0かつ全Gate PASSであり、未承認・untracked/local資産を削除していないこと。
