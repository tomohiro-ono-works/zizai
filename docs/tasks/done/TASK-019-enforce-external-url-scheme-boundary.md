# TASK-019 Enforce External URL Scheme Boundary

## Status

Completed — 2026-08-24

## Goal

external URLとして入力される値をFrontendとPython backendの両方で検証し、`http:`／`https:`だけを許可して`file:`を含むその他schemeを拒否する。

## End State

利用者入力、Frontend component event、Bridge commandのどの経路でもnon-http(s) URLがOS browserまたは内蔵WebViewへ到達しない。同時に、Desktop Hostが同梱Frontendを`file://`で読み込む承認済みRuntime contractは維持される。

## Source

- `docs/features/frontend.md`
- `docs/features/architecture.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- `docs/handoffs/TASK-017-migration-goal-backward-audit.md`
- TASK-008 Regression Baseline
- TASK-018 Frontend Library Integration Contract

## Scope

- Python policy/Bridge/HostでURLをparseし、`http:`／`https:`以外をfail-closedで拒否する。
- Frontend Adapterでliteral schemeを検証し、拒否値をBridgeへ送らない。
- domain/path allowlist、OS browser委譲、popup/main-frame navigationを同じsecurity boundaryへ揃える。
- `RISK-CONFIG-001`、`RISK-EXT-001`、`RISK-WEB-002`の既知gapを解消し、Test/fixture/runnerを更新する。

## Out of scope

同梱Frontendの内部`file://`読込禁止、Frontend物理MOVE、8 library導入、localhost API、外部Page埋込み、config path MOVE、一般的なURL utility refactor。

## Dependencies

- TASK-008のverifier/fixture/runner。
- 完了済みTASK-018でApplication Adapter、navigation、library eventの責務が正本化されていること。
- 2026-08-24にProject ownerが本実装計画を承認済みであること。

RISK-FS-001のsymlink実機検証はTASK-015まで延期し、本TaskをBlockしない。

## Goal Traceability

- Frontend拒否 → Bridge call 0のUnit/Browser Test
- Backend拒否 → `E_ACCESS_DENIED`とlauncher call 0のUnit/Integration Test
- 許可URL → allowlist一致時だけOS browser call 1
- 内部`file://`維持 → bundled page/WebEngine smoke

## Critical Path

`TASK-018 → TASK-019 → TASK-010 → TASK-011 → TASK-012`。

## Parallel Work

TASK-005およびTASK-010のDeferred Decision整理と並行可能。Application codeのEdit Scopeが重なるTASK-010以降とは同時実装しない。

## Task Graph Changes

TASK-012に混在していたsecurity behavior修正を本Taskへ分離し、TASK-012をRollback可能なFrontend物理MOVEへ限定する。

## Deferred Decisions

なし。`http(s)`だけを許可し、non-http(s)をFrontend/backend双方で拒否する方針はProject owner承認済み。

## Expected change area

- `core/security_policies.py`
- `app/gui/bridge.py`
- `app/gui/host.py`
- `static/js/`のexternal URL Application Adapter
- `tests/unit/`
- `tests/integration/`
- `tests/e2e/`
- `tests/fixtures/security/`
- `tests/run-verification.ps1`
- `pytest.ini`
- 関連Feature/Task Evidence

## Acceptance criteria

- Frontendは`file:`、`ftp:`、`data:`、`blob:`、schemeなし等を拒否し、Bridge callを行わない。
- Python backendは展開・正規化後のschemeを再検証し、non-http(s)を`E_ACCESS_DENIED`として拒否する。
- domain/path allowlist不一致は拒否し、許可された`http(s)`だけをOS browserへ1回委譲する。
- non-http(s)、非allowlist、popup、main-frame navigationで内蔵WebViewのnavigation commitとnew window生成が0である。
- 同梱home/dataflow/settingsの内部`file://`読込とQWebChannel Protocol `1.0`が維持される。
- `RISK-CONFIG-001`と`RISK-EXT-001`がexit `0`、Windows dedicated/release環境の`RISK-WEB-002`がexit `0`である。
- RISK-FS-001はTASK-015までBlockedのままで、本Taskの完了条件へ含めない。

## Test plan

- `unit`: URL parse、scheme、domain/path、Frontend Adapter request抑止。
- `integration`: `app.openExternal` response/errorとmock launcher call count。
- `e2e`: popup/main-frame/data/blob/outside-file/network送信0、内部`file://`継続。
- `static-analysis`: external URL入口がApplication Adapter／backend policyを迂回しないこと。

## Migration risk

High — URL入力、OS browser委譲、Bridge到達可能なWebViewのsecurity boundaryを変更するため。

## Rollback

Technical rollbackは可能だが、承認済みsecurity要件を再び破るためMerge後の単独rollbackは不可。問題時はfix-forwardまたは専用Decisionを必要とする。

## Parallelizable

Conditional — Documentation/Test設計はTASK-005と並行可能。Application code実装はTASK-010以降と直列化する。

## Recommended branch

`codex/task-019-external-url-boundary`

## Worktree

Required

## Work Package plan

### WP-1 Security contract and failing tests

Owner: claude-assist

Assignment Reason: 既知gapと期待挙動が明確で、限定Scope内の失敗Test作成とRED確認をRepository内で完結できるため。

Task: 承認済みscheme boundaryを正本・fixture・失敗Testへ反映する。

Dependencies:
- TASK-018。
- Project ownerによる本Task計画承認。

Read Scope:
- `AGENTS.md`
- `docs/features/`
- `docs/handoffs/v23-migration-verification-contract.md`
- `core/security_policies.py`
- `app/gui/`
- `static/js/`
- `tests/`

Edit Scope:
- `docs/features/frontend.md`
- `docs/handoffs/v23-migration-verification-contract.md`
- `tests/unit/`
- `tests/integration/`
- `tests/e2e/`
- `tests/fixtures/security/`
- `tests/run-verification.ps1`
- `pytest.ini`
- `docs/tasks/active/TASK-019-enforce-external-url-scheme-boundary.md`

Acceptance Criteria:
- Frontend/backendの拒否・許可caseが自動TestでFailすることを実装修正前に確認できる。

Constraints:
- Application behaviorをまだ変更しない。
- symlink権限を要求しない。

Tests:
- 対象Unit/Integration/E2EのRED確認。

Codex Verification:
- fixtureがinternal `file://`とexternal `file:`入力を混同していないことを照合する。

### WP-2 Frontend and backend enforcement

Owner: claude-assist

Assignment Reason: WP-1の失敗Testを基準に、限定されたBridge、Host、policy、Frontend Adapterを修正してTestまで完結できるため。最終Acceptance判定はCodexが行う。

Task: 最小変更でFrontend/backendの二重scheme検証、allowlist、OS browser委譲を実装する。

Dependencies:
- WP-1。

Read Scope:
- WP-1のRead Scope。

Edit Scope:
- `core/security_policies.py`
- `app/gui/bridge.py`
- `app/gui/host.py`
- `static/js/`の承認済みexternal URL Adapter
- WP-1のTest/Evidence範囲

Acceptance Criteria:
- 本Task全体のAcceptance criteriaを満たす。

Constraints:
- 同梱Frontendの内部`file://`を禁止しない。
- Bridge ProtocolのCommand/Event数、Envelope、error contractを破壊しない。
- URL入力以外のnavigation/UIを変更しない。

Tests:
- `RISK-CONFIG-001`
- `RISK-EXT-001`
- `RISK-WEB-002`
- internal bundled `file://` smoke

Codex Verification:
- 代表caseのresponse、launcher call、navigation commit、QWebChannel維持を独立確認する。

## Remaining

None.

## Exact next action

採用済みTask graphに従い、TASK-010の2件のDeferred Decisionを確定する。

## Completed

- Frontend Application AdapterとPython backendの両方でexternal URLを`http(s)`へ限定した。
- Bridgeはnon-http(s)とallowlist不一致を`E_ACCESS_DENIED`で拒否し、OS browser launcherを呼ばない。
- Desktop Hostは同梱`file://`／`qrc://`だけを維持し、remote、data、blob、popup、許可root外fileを拒否する。
- verifier、fixture、runner、pytest marker、Browser TestをTASK-019の契約へ揃えた。

## Evidence

- WP-1／WP-2は`claude-assist`（Claude Code Opus）が実装し、Codexが差分とAcceptance criteriaを独立確認した。
- 実装修正前: 対象suite `13 failed, 29 passed`で期待したREDを確認した。
- 実装修正後: 対象Unit／Integration／E2E `42 passed`、runner selftest `11 passed`、Playwright `1 passed`。
- 正規Gate: `RISK-CONFIG-001` `24 passed`、`RISK-EXT-001` `20 passed`、`RISK-WEB-002` `1 passed`、すべてexit `0`。
- `node --check` 2件と`git diff --check`はexit `0`。RISK-WEB-002のGLES3警告はGLES2 fallback後もTest／Gate成功。

## Termination condition

全Acceptance criteriaと担当Risk GateがPASSし、内部`file://` Runtimeを維持したままexternal non-http(s)入力がFrontend/backend双方で拒否されること。
