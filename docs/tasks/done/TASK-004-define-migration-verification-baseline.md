# TASK-004 Define Executable Migration Verification Baseline

## Status

Completed

## Goal

構造変更前後を比較できる、現行Repository向けの最小Verification Contractを確定する。

## Source

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/codex_development_guide_2026-08-15_v24/07_development-process.md`

## Scope

失われたTests、Playwright残骸、機能しないCIを確認し、CLI、connector discovery、config、GUI/QWebChannelに必要な検証と実行環境を定義する。

## Out of scope

Tests、CI、Application codeの変更。`pytest`、Playwright、WebEngine smoke test、CI設定などのtest program実装とtest本実施は後続Taskで行う。

## Dependencies

None

## Expected change area

- `docs/handoffs/v23-migration-verification-contract.md`

## Acceptance criteria

- TASK-009～012の回帰を判定できる検証項目、fixture、platform条件、実行コマンドが確定している。
- `unit` / `integration` / `e2e` / `manual-ui` / `static-analysis`の責務が重複せず、CIが実行環境として分離されている。
- GUIをCIで実行できない場合の代替Gateが明記されている。
- 生成物とTest sourceの追跡境界が確定している。

## Test plan

- Static review: 各Migration Riskに最低1つのVerifierが対応すること。
- Feasibility check: 提案コマンドが現行treeで実行可能、または不足条件が明示されていること。

## Migration risk

High — 現在は信頼できるTest sourceとCIが存在しないため。

## Rollback

Yes

## Parallelizable

Yes — 他Investigationと変更先を分離できる。

## Recommended branch

`migration/investigate-verification`

## Worktree

Required

## Reason for task boundary

Migration全体の独立Verificationを可能にする契約確定が単一Outcomeであり、Test実装とは別に承認できる。

## Completed

- Task Decompositionが承認され、本Task定義を作成した。
- VerificationはLLM/tokenに依存せずtest programで判定し、LLMは作成・調査補助に限定する方針が承認された。
- Static、Unit、Integration、Runtime、UIの5段階Gateと、GUI自動化困難箇所だけを手動testで補完する方針が承認された。
- TASK-004はtest項目・実行条件・合格基準の定義までとし、test program実装は後続Taskとする境界が承認された。
- Claudeによる4段階のread-only横断調査（CLI、Connector/Config、GUI/QWebChannel、Tests/CI）を実施し、Codexが一次情報で各指摘を採用・不採用・判断不能へ再評価した。
- 暫定Risk-to-Verifier対応表と後続実装Task案を`.tmp/task004-staged-investigation/`へ作成した。正本反映前の一時資料として扱う。
- 正式CLI、canonical `tests/`、test専用localhost static server、Windows Primary CI、WebEngine/UIの自動・手動Gate方針が承認された。
- 手動UI testを構造化して記録し、安定したcaseを将来の自動test suiteへ移行する方針が承認された。
- Risk-to-Verifier表、fixture、command、合格基準、手動UI記録、Task分解の統一テンプレートを承認済み契約へ反映した。
- 暫定12 Riskを承認済み`RISK-{AREA}-{NNN}`形式へ変換し、全行のfixture、platform条件、copy-and-paste command、機械判定可能な合格基準を確定した。
- 各RiskのVerifier実装先と、TASK-009～012を含む後続Migration Taskでの再実行責務を割り当てた。
- Windows Primary CI、QtWebEngine dedicated/release Gate、GUI実行不能時の代替Gateを分離した。
- canonical test source、manual checklist/schema、generated/manual evidenceのtracking境界を確定した。

## Evidence

- `docs/handoffs/v23-repository-audit.md`
- `docs/handoffs/v23-migration-map.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- Temporary staged review: `.tmp/task004-staged-investigation/`
- Static contract verification（2026-08-20）: 12 Risk ID、必須field、TASK割当、required section、placeholder不在を確認。

## Remaining

- None（test program/CI/Application codeの実装と実行はTASK-008以降）。

## Exact next action

TASK-006完了後、TASK-008でVerification Contractに従うtracked test/CI baselineを実装する。

## Termination condition

Acceptance criteriaを満たすVerification Contractが保存され、Tests・CI・Application codeに変更がないこと。
