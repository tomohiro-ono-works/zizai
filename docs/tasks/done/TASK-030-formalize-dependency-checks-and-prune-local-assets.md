# TASK-030 Formalize External Dependency Checks and Prune Local-only Assets

## Status

Completed — 2026-09-14

## Goal

local-onlyの`checking-libraries-allowed` Skillにしか無かった外部依存の確認観点を、Project共通ルールとしてCurrent Specificationへ移す。そのうえで、obsolete・重複・破損したlocal-only Skill、Script、設定と、削除承認済みのroot周辺local資産を整理する。Projectの正式Source、runtime機能、正式Testは変更しない。

## Scope

- `docs/features/coding-rules.md`へ、外部依存を追加・更新する前の確認ルール（商用利用可否、再配布条件、有償／license費用、既知の脆弱性）と、確認結果をTask Evidenceへ記録するルールを追加する。
- obsolete Skill 7件を削除する: `checking-libraries-allowed`、`verification`、`requirements-refresh`、`file-size-search`、`ui-analysis-review`、`skill-creator`、`skill-template`。
- `png-resize` Skillの実行例を現行構成（`.agents\skills\png-resize\scripts\resize-png.ps1`、`apps\gui\img`）へ修正し、削除する`file-size-search`への参照を除く。
- local-only Script、設定、root資産を削除する: `.codex/config.toml`、`scripts/search_files.ps1`、`scripts/create_zizai_shortcut.ps1`、`scripts/build_icon_from_svg.js`、`scripts/__pycache__/`、`tests/playwright/scripts/`、`test.ipynb`、`無題のファイル.base`、`.obsidian/`。

## Out of scope

- Application Source、runtime機能、正式Test、CIの変更。
- 新しいInventoryやlicense管理の仕組みの作成。
- 現行Skill 7件（`claude-assist`、`claude-review`、`dependency-map`、`folder-analysis`、`implementation-planning`、`refactor-plan`、`repo-conventions`）と`.codex/agents/*.toml`の変更。
- TASK-023用Script（`scripts/generate_big_csv.py`、`scripts/csv_to_xlsx_stream.py`）の変更・削除。
- PATH設定の自動変更。
- 次回の棚卸し対象: `memo.md`、`tmp_staged_files_release_202606.txt`、空の`.docs/`、`tests/ui_analysis/`。
- `workflows/`、`.venv/`、`.tmp/`、`logs/`。

## References

- Current Specification: [Coding Rules](../../features/coding-rules.md)、[Frontend Library Integration Contract](../../features/frontend-libraries.md)
- Agent運用: [AGENTS.md](../../../AGENTS.md)（local-onlyの`.agents/`、`.codex/`はProjectの必須参照ではない）
- 既存Disposition: [v23 Unmapped Assets Disposition](../../handoffs/v23-unmapped-assets-disposition.md)の`D18`（root `scripts/`）と`D19`（local-only作業資産のREMOVE）
- Playwright category runner: [TASK-008 Regression Baseline Design](../../handoffs/TASK-008-regression-baseline-design.md)（正式baselineに使わない）
- requirements運用の廃止: [TASK-009 uv Toolchain Design](../../handoffs/TASK-009-uv-toolchain-design.md)
- benchmark data用Scriptの再判断先: [TASK-023](../active/TASK-023-investigate-paged-result-delivery.md)

## Constraints

- Current Specificationの変更は、Scopeにある外部依存ルールの追加だけとする。
- local-only資産は通常権限で削除し、属性、ACL、所有者の変更や管理者昇格をしない。
- 削除前に、想定外の固有情報と有効な参照が無いことを確認する。見つかった対象は削除せず報告する。
- 完了済みTaskやHandoffの記述は、削除した資産への言及を理由に書き換えない。
- tracked fileへ個人の絶対Pathやlocal-only設定値を記録しない。

## Acceptance Criteria

- `docs/features/coding-rules.md`に、対象（`pyproject.toml`／`uv.lock`のPython package、同梱するthird-party library、今後追加・更新する外部依存）、4観点の事前確認、確認結果のTask Evidenceへの記録を定めたルールがある。
- Scopeの削除対象がすべて存在しない。
- 現行Skill 7件、`png-resize`、`.codex/agents/*.toml`、TASK-023用Script 2件が残り、`png-resize`以外の内容は変わっていない。
- `png-resize`に旧path（`.codex\skills`、`static`）と`file-size-search`への参照が無く、処理script自体は変わっていない。
- Project tracked資産と残したlocal-only Skill／agent設定に、削除した資産への有効な参照が無い。
- Markdown link確認で新しいリンク切れが無く、`git diff --check`、Static Gate、Remote Safe Gateが通る。

## Edit Scope

- `docs/features/coding-rules.md`
- 本Task
- local-only: Scopeの削除対象、`.agents/skills/png-resize/SKILL.md`

## Evidence

2026-09-14時点の記録。

- 外部依存ルール: 移管前の確認では、商用利用可否、有償／license費用、既知の脆弱性はCurrent Specificationに無く、再配布条件もtracked文書の個別メモ（`README.md`、`apps/gui/vendor/README.md`）に留まっていた。`docs/features/coding-rules.md`へ`External dependencies`節を追加した。
- 削除前確認: 削除対象16件のfile数は棚卸し時と一致し、tracked file、reparse point、棚卸し後の新規fileは無かった。本文で検出したパターンは棚卸し時に確認済みのもの（個人絶対Path、URL）だけで、credentialは無かった。
- 参照確認: 残したSkill、`.codex/agents/*.toml`、Playwright設定、CIに削除対象への参照は無い。tracked資産で該当したのは、`.gitignore`のObsidian workspace除外rule、`tests/static/test_source_boundary.py`のpathベースのignore判定、Current Specificationではない過去のdevelopment guide、完了済みTaskとHandoffの履歴記述だけで、いずれも削除対象の実体に依存しない。
- 削除: Skill 7件、`.codex/config.toml`、`scripts/`の3 fileと`__pycache__/`、`tests/playwright/scripts/`、`test.ipynb`、`無題のファイル.base`、`.obsidian/`を通常権限で削除した（16件、失敗0件）。
- 維持: 現行Skill 7件、`png-resize`、`.codex/agents/*.toml`、TASK-023用Script 2件の計19 fileは、削除前後でhashが一致した。`png-resize`の処理scriptは変更していない。
- `png-resize`: 実行例を`.agents\skills\png-resize\scripts\resize-png.ps1`と`apps\gui\img`へ更新し、`file-size-search`を使う手順を除いた。旧path（`.codex`、`static`）と`file-size-search`への参照は0件である。
- 起動方式: Desktop shortcut方式は使わず、正式launcherのdirectoryをPATHへ追加して`ziz`で起動する方針とした（Project owner判断）。PATHの自動変更は行っていない。
- Verification: Markdown link確認は71 fileで新しいリンク切れ0件（既知の`README.md`→`THIRD_PARTY_INVENTORY.md`のみ）、`git diff --check` exit `0`、Static Gate 134 passed、Remote Safe Gate PASS。

## Remaining Work

- なし。Acceptance Criteriaを満たした。以下は本Taskの完了条件に含めない。
- 次回の棚卸し対象: `memo.md`、`tmp_staged_files_release_202606.txt`、空の`.docs/`、`tests/ui_analysis/`。
- TASK-023用Script 2件は、TASK-023開始時にtrack、作り直し、削除のいずれかを再判断する。
