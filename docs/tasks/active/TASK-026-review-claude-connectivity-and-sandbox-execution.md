# TASK-026 Review External Execution Security and Sandbox Boundaries

## Status

Deferred — independent operational security task; not a release blocker

## Goal

Codexから外部Agentまたは外部CLIを任意に利用する場合の通信、sandbox、権限、承認、失敗処理を、特定providerやlocal Skillに依存しないProject security contractとして確認する。

## Scope

- 外部実行の認証状態、install状態、network到達性、sandbox境界を、秘密情報を表示せずに診断する方法を決める。
- 読取専用Reviewと、明示されたEdit Scopeを持つ実装補助を区別する。
- 外部実行をoptionalかつ明示起動とし、利用目的、送信対象、許可操作、停止条件、利用者承認を確認する。
- network、authentication、usage limit、permission、provider障害を異なるerror classとして扱う。
- provider固有手順が必要な場合はlocal-only補助手順として分離し、Project正本を参照させる。

## Out of scope

- ZizAI Application、Bridge、Connector、Frontend libraryの変更。
- provider、model、local SkillをProjectの必須依存または成果条件にすること。
- 認証情報、token、API key、credential fileの内容を読む、複製する、または記録すること。
- OS firewall、proxy、sandbox policyの無断変更。
- 無条件のsandbox外実行、無制限の再試行、広範なfilesystem／shell権限の恒久許可。

## References

- `AGENTS.md`
- `docs/README.md`
- `docs/features/architecture.md`
- `docs/features/coding-rules.md`
- 実行時に選択した外部toolまたはproviderの公式documentation

## Constraints

- 外部Agentまたはproviderの利用は、ユーザーが明示的に依頼または承認した場合だけ行う。
- 外部通信、sandbox外実行、権限拡張はそれぞれ独立した承認境界として扱う。
- Project GitのTask、仕様、Build、Testはlocal-only Skillがなくても理解・実行できなければならない。
- Scope外参照や編集が必要になった場合は自動拡張せず、対象と理由を報告して停止する。
- External executionをTask分割や工程別Handoffの標準手段にしない。

## Acceptance Criteria

- sandbox内の制限とhostまたはprovider側の障害を、秘密情報を読まずに区別できる。
- 読取専用Reviewと実装補助について、許可操作、禁止操作、送信対象、timeout、停止条件を説明できる。
- sandbox外実行には目的、command scope、利用者承認、終了条件が必要である。
- error messageを認証、network、usage limit、permission、provider障害へ分類し、推測で権限を広げない。
- 特定provider、model、local Skillが存在しなくても、本TaskのGoalと検証方法を理解できる。
- optionalな外部Reviewは対象riskとdiffに限定され、Repository調査全体を重複実行しない。

## Edit Scope

- 本TaskのStatus、Remaining Work、Evidence
- Project security contractの変更が別途承認された場合だけ、対応する正本文書
- provider固有のlocal-only補助手順はProject GitのEdit Scopeに含めない

## Tests

- 選択した外部toolの公式なversion、status、helpによる非secret診断。
- 必要な場合だけ、sandbox内と承認付きsandbox外の最小疎通比較。
- 読取専用Reviewで編集0を確認するdry-run。
- 実装補助を利用する場合は、限定Edit Scope、禁止操作、停止条件を確認するdry-run。
- 代表errorごとの分類、timeout、再試行上限、redacted report確認。

## Subtasks

### Subtask 1: Reproduce and classify the execution boundary

- **Outcome:** 選択した外部toolの失敗層と再現条件を、秘密情報を扱わずに特定する。
- **Dependencies:** Project ownerが本Taskの開始と対象toolを承認していること。

### Subtask 2: Approve the execution contract

- **Outcome:** Reviewと実装補助について、sandbox、権限、送信対象、timeout、再試行、停止、報告のcontractを承認する。
- **Dependencies:** Subtask 1の分類が完了していること。

### Subtask 3: Validate optional local procedures

- **Outcome:** 必要なprovider固有手順をlocal-only資産として検証し、Project正本への一方向依存を確認する。
- **Dependencies:** Subtask 2のcontractが承認されていること。

## Completed

- 2026-08-31にProject ownerが、Claude通信方式の再検討を将来Taskとして記録する方針を承認した。

## Evidence

- sandbox内のClaude Opus／Sonnetは`API Error: Connection refused — a firewall or proxy may be blocking it (ConnectionRefused)`で失敗した。
- Claude CLI `2.1.233`、公式auth status、`claude doctor`は正常だった。
- sandbox内ではAnthropic／GitHubのHTTPS接続が拒否され、承認付きsandbox外ではAnthropic APIへ到達した。
- 同じClaude Opus読取専用reviewをsandbox外で実行し、正常完了した。

上記Evidenceは旧Claude固有運用時の履歴であり、Claudeまたはlocal Skillを本Taskの必須条件にしない。

## Remaining Work

- 本Taskを再開する場合、対象とする外部tool、送信可能なRepository範囲、許可する操作を明示する。
- Subtask 1から順に実施し、未確認の過去errorを現在の原因として推測しない。

## Exact next action

Project ownerが本Taskの開始、対象tool、最初の読取専用診断範囲を明示的に承認する。

## Termination condition

承認された外部実行contractがProject正本だけから理解でき、optionalなprovider固有手順がそのcontractへ一方向に依存し、代表疎通と失敗時処理がredacted Evidenceで確認されること。
