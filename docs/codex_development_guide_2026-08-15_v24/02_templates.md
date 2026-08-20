# Codex 開発テンプレート

> [!IMPORTANT]
> **Status: Versioned Reference — not ZizAI Current Specification.** ZizAIの現行仕様は[Documentation Index](../README.md)と`docs/features/`を正とする。本資料のTemplateは、現行Taskまたは運用規約が明示採用した場合だけ使用する。

更新日: 2026-08-15

## 1. 目的

Codex 開発で繰り返し使う文書・Promptを、同じ形式で作れるようにします。

## 2. 結論

本プロジェクトでは、**AGENTS.md / Spec / Task / Prompt / Handoff だけを共通テンプレート化し、その他は必要になった時点で追加**します。

---

## 3. Repository 指示

### 3.1 `AGENTS.md`

```md
# Repository instructions

## Purpose
このRepositoryの目的。

## Documentation
- Documentation map: `docs/index.md`
- Current features: `docs/features/`
- Active tasks: `docs/tasks/active/`

## Working rules
- Taskに関係する範囲だけ変更する。
- 無関係なリファクタリングをしない。
- 未確認の仕様を推測して追加しない。

## Verification
- 変更後にTaskで指定されたTestを実行する。
- 完了時にTest結果を報告する。

## Safety
- destructive operationは明示された場合だけ行う。
- secretをcommitしない。
```

---

## 4. Documentation

### 4.1 Feature

現在仕様の正本です。

```md
# <Feature>

## Purpose

## Current behavior

## Constraints

## Interfaces

## Verification

## Implementation references
```

保存先:

```text
docs/features/<feature>.md
```

Featureが十分大きくなった場合だけ:

```text
docs/features/<feature>/
├─ index.md
├─ <sub-feature-a>.md
└─ <sub-feature-b>.md
```

へ分割します。



### 4.2 ADR / Decision

必要な場合だけ作成します。

```md
# ADR-XXX: <Decision>

Date: YYYY-MM-DD
Status: Accepted

## Context

## Decision

## Alternatives

## Consequences

## Related specs
- ...
```


### 4.3 Documentation cost rule

```text
現在仕様 = Feature 1か所
作業中差分 = Task
過去仕様 = Git history
```

同じ情報をView / Spec / Current / Latestなどへ重複保存しません。

Featureを分割するのは、分割によってCodexが読むContextを減らせる場合だけです。

---

## 5. Task

### 5.0 Taskの粒度

Taskは、**単一のOutcomeを持ち、独立して実装・検証・マージできる最小の意味ある変更単位**です。

```text
Feature
└─ Task
   ├─ Work item
   ├─ Acceptance Criteria
   └─ Test Case
```

分割基準:

```text
Outcomeが独立
+
単独でDone判定可能
+
単独Mergeが意味を持つ
+
分割でContext / Review / Parallelismが改善
```

詳細は `07_development-process.md` の「1 Taskとは何か」を参照します。

```md
# TASK-XXX: <Title>

Status: Design

## Goal

## Scope

## Out of scope

## Source
- `docs/features/<feature>.md`

## Acceptance criteria
- [ ] ...

## Branch

## Worktree

## Expected change area

## Test plan
- Unit:
- Integration:
- Deploy/Smoke:

## Completed

## Evidence

## Remaining

## Exact next action

## Termination condition

## Merge
- Target:
- Result:

## Deploy
- Result:

## Do not repeat
```

推奨Status:

```text
Design
→ Ready for Development
→ Development
→ Merge
→ Ready for Deploy
→ Deploy
→ Done
```

---

## 6. Chat Prompt

### 6.1 新規Chat

```md
## Goal
<達成する結果>

## Context
Source:
- `docs/tasks/active/TASK-XXX.md`
- `docs/features/<feature>.md`

必要なSourceだけ確認してください。

## Boundaries
- 未確認の要件を追加しない。
- Task外の変更をしない。

## Verification
- <必要なTest>

## Output
1. 変更内容
2. 実行したTest
3. Test結果
4. 未解決事項
```

### 6.2 調査Chat

```md
## Goal
<調査対象>を特定する。

## Boundaries
- コードを変更しない。
- 確認済み事実と推測を分ける。
- 必要なFileだけ読む。

## Output
- 結論
- 根拠となるFile / Symbol
- 未確認事項
```

### 6.3 Subagent

```md
独立して調査できる範囲だけSubagentへ分けてください。

Main Chatにはraw logを返さず、各Subagentから以下だけ統合してください。

- finding
- evidence
- severity
- next action

全Subagentの完了を待ってから結論を出してください。
```

### 6.4 仕様変更時

```md
仕様を更新しました。

Source:
- `docs/features/<feature>.md`
- `docs/tasks/active/TASK-XXX.md`

変更箇所だけ再確認してください。

1. 実装との差分を確認
2. Acceptance criteriaを再評価
3. 完了済みの無関係作業は再実行しない
4. Outcome自体が変わる場合はその点を報告する
```

---

## 7. Handoff

```md
# Handoff: TASK-XXX

## Goal

## Current state

## Completed

## Evidence

## Remaining

## Exact next action

## Files changed

## Files to read next

## Do not repeat
```

---

## 8. Harness 6要素 — 書くこと / 書かないこと

### 8.1 `AGENTS.md`

#### 目的

CodexがRepository内で**どう作業するか**を定義します。

#### 書くこと

- Repository全体の作業原則
- Docsの参照先
- 必須の作業手順
- 変更範囲に関する制約
- 完了前に実行すべきVerificationの入口
- Reviewで特に確認する意味的ルール

例:

```md
# Repository instructions

## Documentation
- Current specifications: `docs/specs/current/`
- Active task: `docs/tasks/active/`

## Working rules
- TaskのScope外を変更しない。
- 未確認の仕様を推測して追加しない。
- 振る舞いを変更した場合は該当Specを更新する。

## Verification
- Taskで指定されたTestを実行する。
- Test失敗時は完了扱いにしない。
```

OpenAI公式でも、Repository-level `AGENTS.md` にProject normsや基本Setupを置き、Review ruleは簡潔にし、Formatting / Lintのような機械的チェックはCIに任せることを案内しています。

参照:
- https://learn.chatgpt.com/docs/agent-configuration/agents-md

#### 書かないこと

- 詳細な機能仕様
- 全Taskの進捗
- CommandごとのAllow / Deny一覧
- Test Caseの期待値そのもの
- CIのJob定義
- 長い調査ログ
- 一時的な会話内容

悪い例:

```md
- `rm`は禁止
- `git push --force`は禁止
- Login APIは200を返すこと
- PR時にpytestを実行
- TASK-042は現在80%完了
```

上記はそれぞれ `Rules / Tests / CI / Task` へ分離します。

---

### 8.2 `docs/`

#### 目的

**何が正しい仕様・判断・現在状態か**を保存します。

#### 書くこと

```text
docs/
├─ index.md
├─ specs/current/
├─ decisions/
├─ tasks/
└─ handoffs/
```

具体例:

```md
# Login

## Behavior
認証成功時はDesktop UIへ遷移する。

## Constraints
認証情報をLogへ出力しない。

## Acceptance criteria
- [ ] 正常認証できる
- [ ] 認証失敗を表示できる
```

Task:

```md
## Completed
- API呼び出し実装

## Evidence
- Test: PASS

## Remaining
- Desktopとの結合確認

## Exact next action
- Integration Testを実行
```

#### 書かないこと

- Shell Commandの実行権限
- Lifecycle HookのTrigger定義
- ExecutableなTest Code
- GitHub ActionsのYAML
- Codexへの一般的な行動ルールの重複

悪い例:

```md
# Spec
Codexは必ずpytestを実行すること。
git push --forceは禁止。
```

これは `AGENTS / Rules` の責務です。

---

### 8.3 `.codex/rules/`

#### 目的

Codexが**どのCommandを実行してよいか**を制御します。

OpenAI公式のRuleはCommand prefixに対して、

```text
allow
prompt
forbidden
```

を設定します。

複数Ruleが一致した場合は、より制限の強いDecisionが優先されます。

参照:
- https://learn.chatgpt.com/docs/agent-configuration/rules

#### 書くこと

- 自動実行してよい安全なCommand
- 毎回確認が必要なCommand
- 実行を禁止するCommand
- Ruleの理由
- Rule自体のmatch / not_match例

例:

```python
prefix_rule(
    pattern=["git", "status"],
    decision="allow",
    justification="Read-only Git status."
)

prefix_rule(
    pattern=["git", "push"],
    decision="prompt",
    justification="Remote state changes require confirmation."
)

prefix_rule(
    pattern=["git", "push", "--force"],
    decision="forbidden",
    justification="Force push is not allowed. Use a normal push or create a new branch."
)
```

#### 書かないこと

- 「コード品質を高くする」などの抽象指示
- 機能仕様
- Task状態
- Test Case
- Event発火時の処理
- CIの実行順

悪い例:

```text
コードは読みやすくする。
APIは500ms以内にする。
Testを必ず通す。
```

これらはRulesではCommand patternに落とせないため、`AGENTS / Docs / Tests` に置きます。

---

### 8.4 `.codex/hooks.json`

#### 目的

Codexの**特定Lifecycle Eventで自動処理を実行する**ために使います。

OpenAI公式では、例として以下のEventがあります。

```text
PreToolUse
PostToolUse
PreCompact
PostCompact
UserPromptSubmit
SubagentStop
Stop
SessionStart
SessionEnd
```

参照:
- https://learn.chatgpt.com/docs/hooks

#### 書くこと

- どのEventで発火するか
- 何を自動実行するか
- Failure時に継続するか停止するか
- 必要なMatcher
- 小さく決定的なValidation / State保存

このプロジェクトでの例:

```text
PreCompact
→ Active Taskの状態保存Scriptを実行

Stop
→ 必須Verificationが未実行なら警告

PreToolUse
→ Secretや危険な操作を補助検査
```

概念例:

```json
{
  "hooks": {
    "PreCompact": [
      {
        "command": "python tools/save_task_state.py"
      }
    ]
  }
}
```

※ Hook Schemaは利用時点の公式仕様に合わせて記述します。

#### 書かないこと

- 大量のBusiness Logic
- Specそのもの
- Testの期待値
- Command権限の本体
- 長時間かかるBuild Pipeline
- CI全体の代替

悪い例:

```text
Stop HookだけでUnit / Integration / E2Eを全部実行する
```

HookはLifecycle連携であり、Test定義やCIのSource of truthにはしません。

---

### 8.5 `tests/`

#### 目的

**何を満たせば実装が正しいか**をExecutable Codeとして定義します。

#### 書くこと

- InputとExpected Output
- Regression Case
- Boundary Case
- Error Case
- Component間のIntegration条件
- Deploy後に自動化できるSmoke / E2E条件

例:

```python
def test_login_rejects_invalid_credentials():
    result = login("invalid-user", "invalid-password")
    assert result.ok is False
```

Integration例:

```text
Desktop
→ localhost API起動
→ WebView表示
→ WebからAPI通信
→ Response確認
```

#### 書かないこと

- 「このTestをPR時に実行する」というTrigger
- Git権限
- Codexへの作業指示
- 設計理由の長文
- Task進捗

悪い例:

```python
# CodexはPR前に必ずこのTestを実行すること
```

実行タイミングは `AGENTS / CI` が担当します。

---

### 8.6 `.github/workflows/`（CI）

#### 目的

**どのEventで、どのVerificationを、どの順番で強制実行するか**を定義します。

#### 書くこと

- Trigger
- Job
- Step
- 使用するTest / Lint / Build Command
- Mergeを許可するための必須Gate
- Artifact生成が必要な場合の処理

例:

```yaml
name: verify

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - run: uv sync
      - run: pytest
```

重要:

```text
Testの期待値       → tests/
Testの実行タイミング → CI
```

と分離します。

#### 書かないこと

- Product Spec
- Task進捗
- Agentへの自然言語ルール
- Commandの対話的Approval Policy
- Test Caseそのもの

悪い例:

```yaml
# Loginは必ず正しい仕様にする
```

CIは意味的仕様を書く場所ではなく、既存のVerificationを実行する場所です。

---

## 9. MECEチェック

### 9.1 判断フロー

新しい情報をどこへ書くか迷った場合は、次で判定します。

```text
Q1. 「正しい仕様・現在状態」か？
 └─ Yes → Docs

Q2. 「Agentにどう作業してほしいか」か？
 └─ Yes → AGENTS

Q3. 「このCommandを実行してよいか」か？
 └─ Yes → Rules

Q4. 「このEventが起きた時、自動で何をするか」か？
 └─ Yes → Hooks

Q5. 「実装が正しいかをExecutableに判定するもの」か？
 └─ Yes → Tests

Q6. 「いつ、どのVerificationを自動実行・強制するか」か？
 └─ Yes → CI
```

### 9.2 重複を避ける例

悪い:

```text
AGENTS.md:
- pytestを必ずPassさせる
- login invalid caseはFalseである

tests/:
- login invalid caseをTest

CI:
- login invalid caseはFalseであることを確認
```

良い:

```text
Docs
└─ Loginの期待Behaviorを定義

Tests
└─ BehaviorをExecutableに検証

AGENTS
└─ Task完了前に関連Testを実行するよう指示

CI
└─ PR時にTestsを実行

Rules
└─ 危険なCommandを制御

Hooks
└─ Lifecycle Eventで必要な補助処理
```

### 9.3 最終原則

```text
AGENTS = Instruction
Docs   = Truth / State
Rules  = Permission
Hooks  = Event
Tests  = Assertion
CI     = Enforcement
```

この6つをSource of truthとして重複させないことで、運用上MECEにします。


### 5.x Autonomous Loop Contract（必要なTaskのみ）

```md
## Loop contract

### Goal

### Trigger

### Context
- Feature:
- Code:
- Tests:

### Action boundary
#### Allowed

#### Do not change

### Verifier
- Command:
- Expected result:

### State
- Completed:
- Evidence:
- Remaining:
- Exact next action:
- Last failure:
- Attempt count:

### Stop condition
#### Success

#### Failure
- Max attempts:
- Max elapsed time:
- Repeated failure:

### Escalation
- Human decision required when:
```

原則:

```text
Task + Verifier + Stop condition
```

が最小核です。

`Trigger / Context / Action boundary / State / Resource limit / Escalation` は、Loopを安全に運用するための外側のContractです。
---

## 10. Anti-pattern checklist

Document / Task / Harnessを追加・変更する前に確認します。

```md
- [ ] 同じ仕様を複数ファイルにコピーしていない
- [ ] `current / latest / v2 / new` を作っていない
- [ ] TaskへFeature仕様全文をコピーしていない
- [ ] FeatureへAGENTS / Rules / Hooks / CIを複製していない
- [ ] TestsのAssertionをCIやHooksへ再定義していない
- [ ] CodexにRepository全体探索を要求していない
- [ ] ChatだけにCurrent stateを残していない
- [ ] 分割によってContext削減効果がある
- [ ] 新しい構成の根拠が、公式知見・検証・Project requirementのいずれかにある
```

---

## Graph Contract（必要なWorkflowのみ）

Graphを永続化する必要がある場合は、最低限次を定義します。

```md
# <Graph / Workflow>

## Goal

## State

## Nodes

### <Node A>
- Responsibility:
- Input:
- Output:
- Action boundary:
- Verifier:

### <Node B>
...

## Edges / Handoffs

## Parallel branches

## Join conditions

## Transition conditions

## Failure routes

## Human gates

## Final verification
```

原則:

```text
Task = Outcome boundary
Node = Responsibility boundary
Loop = Repetition boundary
```

すべてのTaskにGraph Contractを作りません。繰り返し利用する安定したOrchestrationだけを対象にします。

---

## Claude CodeによるRepository Audit

### 目的

既存Repositoryへv23 Architectureを適用する前に、Claude Codeを**Read-only Auditor**として使い、現在構造・責務・依存関係を事実ベースで調査します。

この段階ではMigration先を確定しません。

役割分担:

```text
Claude Code
= Read-only Repository Audit

Codex
= Target ArchitectureへのMapping
  + Task分解
  + Harness構築
  + Migration実装

Claude Code
= Migration後の独立Read-only Review
```

### Claude Code用 Audit Prompt

````text
```text
目的:
既存Repositoryをv23 Architectureへ移行する前に、
現在の構造・責務・依存関係を正確に把握する。

このTaskではコード・設定・ファイルを一切変更しないこと。
Read-onlyの調査のみ行う。

built-in Explore subagent を積極的に使用してください。

調査領域を独立した責務ごとに分離し、
必要に応じて並列に調査してください。

調査候補:
- Repository全体の主要フォルダ・ファイル
- Application entry point
- Web UI
- Python API / Backend
- Desktop / WebView Host
- Configuration
- Python import / dependency
- JavaScript / CSS / static asset dependency
- Tests
- CI
- Documentation
- Codex / Claude関連設定
- Runtime生成物 / Cache / Log
- 外部Tool固有フォルダ

各Explore結果は最終的にMain Agentで統合してください。

重要な制約:
- このTaskはRead-only。
- ファイル変更・Rename・Move・Deleteは禁止。
- フォルダ名だけから責務を推測しない。
- app / core / static / connectors / workflows 等の名前だけを根拠に判断しない。
- 実ファイル、import、entry point、呼び出し関係をEvidenceとして判断する。
- 確認できないものは Unknown とする。
- Unknownを推測で埋めない。
- v23へのMigration先はまだ確定しない。

各主要Pathについて以下を整理する:

| Existing Path | Observed Responsibility | Evidence | Dependencies | Runtime / Source | Confidence |
|---|---|---|---|---|---|

Confidence:
- High: 実装・参照関係から明確
- Medium: 複数Evidenceがあるが一部不明
- Low: 推測を含む
- Unknown: 判断不能

最後に以下を出力する:

## Repository Summary

## Entry Points

## Responsibility Map

## Dependency Findings

## Generated / Runtime Files

## Unknown / Needs Investigation

## Migration Risks

このTaskではMigration案を確定しない。
まず現状把握だけを完了すること。
```
````

### Audit後のCodexへの受け渡し

Claude CodeのAudit結果は、**事実情報としてCodexへ渡します**。

Codex側では次を行います。

```text
Observed responsibility
+
Evidence
+
Dependencies
+
v23 Target Architecture
↓
Migration Mapping
↓
Migration Task decomposition
```

Claude Code側で、

```text
static/ → apps/web/
core/   → apps/api/
```

のようなTarget判断まで確定させないことを基本とします。

### Migration後のClaude Code独立監査

Migration完了後、Claude Codeを再びRead-only Auditorとして使えます。

確認対象:

```text
- Legacy path参照が残っていないか
- import / entry pointが壊れていないか
- Source of truthが重複していないか
- apps/配下の責務が混在していないか
- tests / CIが新構成を参照しているか
- Documentationが旧Pathを参照していないか
```

Codexが実装し、Claude Codeが独立して検証することで、同一Agentの自己評価だけに依存しない構成にします。
