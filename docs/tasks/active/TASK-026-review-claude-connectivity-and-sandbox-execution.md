# TASK-026 Review Claude Connectivity and Sandbox Execution

## Status

Deferred — independent operational task; not a TASK-016／TASK-015 release blocker

## Goal

CodexからClaude Codeへreview／implementationを依頼するときの通信経路、sandbox境界、権限承認、失敗時の診断・再試行・報告方法を再検討し、安全で再現可能な標準手順を確定する。

## End State

Claude ReviewとClaude Assistについて、sandbox内外の使い分け、最小権限、利用者承認、接続失敗の分類、再試行上限、報告形式がSkillへ記録され、認証情報を参照せずに代表的な読取専用疎通と実装用dry-runを再現できる。

## Goal Traceability

- `ConnectionRefused`の原因を認証、Claude CLI、外向き通信、provider障害へ分類できる → WP-1
- Review／Assistごとの安全な通信・権限contractを決定する → WP-2
- 決定した手順をSkillへ反映し、回帰確認する → WP-3

## Critical Path

`WP-1 現状再現・脅威境界確認 → WP-2 標準実行contractの承認 → WP-3 Skill反映・疎通検証`。

## Parallel Work

なし。診断結果を基に権限contractを決め、その承認後にSkillへ反映する。

## Task Graph Changes

- 本TaskをTASK-016から独立した運用改善Taskとして追加する。
- TASK-016／TASK-015の完了条件やv23初回releaseへ追加しない。
- 現在の手動回避策を恒久仕様として先に固定せず、本Taskで安全性と再現性を評価する。

## Deferred Decisions

- sandbox外実行を標準とする範囲: Project ownerがWP-2完了時に決定し、WP-3へ適用する。
- approval prefixを保存するか、実行ごとに承認するか: Project ownerがWP-2完了時に決定し、WP-3へ適用する。
- 接続失敗時の自動再試行回数とfallback model利用: Project ownerがWP-2完了時に決定し、WP-3へ適用する。

## Source

- 2026-08-31のClaude Opus review接続調査
- `.agents/skills/claude-review/SKILL.md`
- `.agents/skills/claude-assist/SKILL.md`
- `AGENTS.md`
- `docs/features/coding-rules.md`

## Scope

- Claude CLIの認証状態、install状態、DNS、TCP／HTTPS接続を、秘密情報を表示せずに診断する手順を決める。
- Codex sandboxのnetwork制限と、承認付きsandbox外実行を区別する。
- Claude Reviewの読取専用tool allowlistとClaude Assistの限定Edit Scopeを分離する。
- network failure、authentication failure、usage／rate limit、permission failureを別のerror classとして扱う。
- timeout、再試行、停止、利用者へのerror報告formatを決める。
- 決定済み手順をClaude関連Skillへ反映し、最小疎通Testで確認する。

## Out of scope

- ZizAI Application、Bridge、Connector、Frontend libraryの変更。
- Claude／Anthropicの認証情報、token、credential fileの読取・複製・記録。
- OS firewall、corporate proxy、Codex sandbox policyの無断変更。
- 無条件のsandbox外実行、無制限の再試行、広範なfilesystem／shell権限の恒久許可。
- 本Task開始前の`claude-review`／`claude-assist` Skill変更。

## Dependencies

- Project ownerが本Taskの開始時期を承認すること。
- Claude Code CLIと有効な正規認証が利用可能であること。

## Expected change area

- `.agents/skills/claude-review/SKILL.md`
- `.agents/skills/claude-assist/SKILL.md`
- 必要なSkill検証用fixture／script
- 本TaskのEvidence

## Acceptance criteria

- sandbox内で外向きHTTPSが拒否される場合と、host側network障害を区別できる。
- 認証情報の内容を読まず、Claude CLIの公式statusと最小疎通だけで原因を分類できる。
- Claude Reviewは読取専用tool allowlist、Claude Assistは承認済みEdit Scopeに限定される。
- sandbox外実行は目的、command scope、利用者承認、終了条件を必須とする。
- `ConnectionRefused`、認証失敗、利用上限、権限拒否を同じerrorとして扱わない。
- timeoutと再試行上限を超えた場合は停止し、error messageを改変せず要約とともに報告する。
- 更新したSkillに基づく読取専用review疎通とAssist dry-runが再現可能にPASSする。

## Test plan

- `claude --version`、`claude auth status`、`claude doctor`の秘密情報を含まない診断確認。
- sandbox内／承認付きsandbox外からのAnthropic HTTPS疎通比較。
- Claude Reviewの`Read,Glob,Grep`限定実行と、編集0の確認。
- Claude Assistの限定Edit Scope／禁止path／commit・push禁止contractのdry-run。
- 代表errorごとの停止・再試行・報告format確認。

## Migration risk

Medium — Application codeは変更しないが、sandbox外実行と外部AIへのrepository accessを扱うため、権限を広げすぎるとsecurity boundaryへ影響する。

## Rollback

Yes — Skill変更を戻し、実行ごとの明示承認による現行手動運用へ戻せる。

## Parallelizable

No — 診断、方針承認、Skill反映を順番に行う。

## Recommended branch

`codex/task-026-claude-connectivity-review`

## Worktree

Required when this deferred Task starts. Do not start it in the TASK-016 Worktree.

## Work Package plan

### WP-1 Connectivity reproduction and security boundary

Owner: Codex

Assignment Reason: sandbox、外部通信、認証状態、利用者承認というClaudeへ委譲できない実行環境境界の確認が中心であるため。

Task: Claude接続失敗を最小requestで再現し、認証、CLI、DNS、TCP／HTTPS、sandbox policy、provider応答のどの層で失敗するかを分類する。

Dependencies:
- Project ownerによる本Task開始承認。

Read Scope:
- `AGENTS.md`
- `.agents/skills/claude-review/`
- `.agents/skills/claude-assist/`
- Claude CLI公式status／help output

Edit Scope:
- 本TaskのEvidenceだけ。

Acceptance Criteria:
- 秘密情報を読まず、失敗層と再現条件を説明できる。
- sandbox内外の結果を混同せず記録できる。

Constraints:
- 認証file、OAuth token、API keyを読まない。
- network／firewall設定を変更しない。

Tests:
- 最小Claude requestとHTTPS疎通の比較。

Codex Verification:
- command、exit code、error message、実行境界を一次outputで照合する。

### WP-2 Review／Assist execution contract decision

Owner: Codex

Assignment Reason: security、権限、利用者承認、再試行policyの意思決定を統合するため。

Task: ReviewとAssistを分けて、sandbox、tool allowlist、Edit Scope、timeout、再試行、fallback、approvalの標準contractをProject ownerと決定する。

Dependencies:
- WP-1。

Read Scope:
- WP-1 Evidence
- `.agents/skills/claude-review/SKILL.md`
- `.agents/skills/claude-assist/SKILL.md`
- Repository security／coding rules

Edit Scope:
- 本Task、必要なDecision。

Acceptance Criteria:
- Review／Assistそれぞれの許可操作、禁止操作、承認単位、停止条件が承認される。

Constraints:
- 利便性を理由に包括的なsandbox外権限を既定化しない。

Tests:
- 想定scenarioごとの権限・error handling table review。

Codex Verification:
- 承認内容とArchitecture／security boundaryを照合する。

### WP-3 Skill update and connectivity verification

Owner: Codex

Assignment Reason: 外部通信権限を伴うSkill変更と最終Acceptance判定をClaude自身へ委譲しないため。

Task: WP-2の承認contractだけをClaude関連Skillへ反映し、読取専用reviewとAssist dry-runで再現性を確認する。

Dependencies:
- WP-2のProject owner承認。

Read Scope:
- WP-2 Decision
- `.agents/skills/claude-review/`
- `.agents/skills/claude-assist/`
- Skill検証規約

Edit Scope:
- `.agents/skills/claude-review/SKILL.md`
- `.agents/skills/claude-assist/SKILL.md`
- 必要なSkill検証用fixture／script
- 本Task Evidence

Acceptance Criteria:
- 承認済みcontractが両Skillへ矛盾なく反映される。
- Reviewは編集0、Assistは限定Edit Scope、両方でtimeout／error報告が再現される。

Constraints:
- 未承認のfallback、権限拡張、credential accessを追加しない。

Tests:
- Skill static review、最小review疎通、Assist dry-run、禁止操作確認。

Codex Verification:
- Skill差分、外部通信承認、実行log、filesystem差分を独立照合する。

## Completed

- 2026-08-31にProject ownerが、Claude通信方式の再検討を将来Taskとして記録する方針を承認した。

## Evidence

- sandbox内のClaude Opus／Sonnetは`API Error: Connection refused — a firewall or proxy may be blocking it (ConnectionRefused)`で失敗した。
- Claude CLI `2.1.233`、公式auth status、`claude doctor`は正常だった。
- sandbox内ではAnthropic／GitHubのHTTPS接続が拒否され、承認付きsandbox外ではAnthropic APIへ到達した。
- 同じClaude Opus読取専用reviewをsandbox外で実行し、正常完了した。

## Remaining

- Project ownerが開始時期を決めた後、専用WorktreeでWP-1から開始する。

## Exact next action

TASK-016／TASK-015とは独立して開始時期を決定する。開始承認前にSkillを変更しない。

## Termination condition

WP-1～WP-3が完了し、承認済みのClaude Review／Assist通信・権限contractがSkillへ反映され、代表疎通と失敗時処理が再現可能に確認されること。
