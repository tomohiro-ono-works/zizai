# Repository / Worktree 構成

> [!IMPORTANT]
> **Status: Versioned Reference — proposed example, not adopted ZizAI topology.** 下記のlocalhost、`apps/web`、`apps/api`案はZizAIの現行構成ではない。現行仕様は[Architecture](../features/architecture.md)、採用済みTargetは[ADR-v23](../decisions/ADR-v23-application-topology.md)を正とする。

更新日: 2026-08-15

## 1. 目的

WebView + localhost のデスクトップアプリを、Codex・Git Worktree・Harness Engineeringを使って開発するためのRepository構成を定義します。

## 2. 結論

**1 Monorepo + `apps/web` / `apps/api` / `apps/desktop` + `apps/common/config` + Task単位のWorktree** を採用します。

---

## 3. 抽象構造

Repositoryは次の4領域に分けます。

```text
Application
├─ apps/

Knowledge / State
├─ docs/

Agent Harness
├─ AGENTS.md
├─ .agents/
├─ .codex/
├─ .github/

Local Runtime
├─ .venv/
└─ .env
```

---

## 4. 具体的なRepository構成

```text
repo/
├─ AGENTS.md
├─ .agents/
│  └─ skills/
├─ .codex/
│  ├─ agents/
│  ├─ rules/
│  ├─ config.toml
│  └─ hooks.json
├─ .git/
├─ .github/
│  └─ workflows/
├─ .vscode/
│
├─ apps/
│  ├─ web/
│  ├─ api/
│  ├─ desktop/
│  └─ common/
│     └─ config/
│
├─ docs/
├─ tests/
├─ .venv/
├─ .env
├─ pyproject.toml
└─ uv.lock
```

各 `apps/*` の内部サブフォルダは、現時点では定義しません。

---

## 5. Application

### `apps/web/`

WebViewに表示するWeb側。

### `apps/api/`

localhostで動作するPython backend / API。

### `apps/desktop/`

Desktop側。WebViewとlocalhost processのLifecycleを扱う。

### `apps/common/config/`

web / api / desktop が共通で利用するアプリ設定。

実行関係:

```text
apps/desktop
   │
   ├─ localhost の apps/api を起動
   │
   └─ WebViewを開く
            ↓
      apps/web を表示
```

具体的なPort、静的File配信、API Route、Package方法はこの資料では定義しません。

WebView2参照:
- https://learn.microsoft.com/windows/apps/develop/ui/controls/webview2
- https://learn.microsoft.com/microsoft-edge/webview2/concepts/security

---

## 6. Knowledge / State

```text
docs/
├─ features/
├─ tasks/
│  ├─ active/
│  └─ done/
├─ decisions/
└─ handoffs/
```

役割:

- `features/`：現在仕様の正本
- `tasks/`：今回の変更・進捗
- `decisions/`：重要な設計判断
- `handoffs/`：Chatを跨ぐ状態

---

## 7. Agent Harness

Harness専用の `.codex-harness/` は作りません。

```text
AGENTS.md            → Instruction（どう作業するか）
.agents/skills/      → Reusable workflow
.codex/agents/       → Specialized agent role
.codex/rules/        → Permission（何を実行してよいか）
.codex/hooks.json    → Event（いつ自動処理するか）
.codex/config.toml   → Codex project設定
docs/                → Truth / State（何が正しいか）
tests/               → Assertion（何を満たせば正しいか）
.github/workflows/   → Enforcement（いつ検証を強制するか）
```

---

## 8. Local Runtime

### `.venv/`

PythonのVirtual Environment。

- Git管理しない
- Worktreeごとに作成する
- 再生成可能なものとして扱う

参照:
- https://docs.python.org/3.14/library/venv.html

### `.env`

Local環境値。

- Git管理しない
- `.venv` とは別物
- `.env.example` は作成しない

### uv

uvをPython Package / Environment管理に使用する前提です。

Windowsでは既定link modeとしてhardlinkが利用されます。

参照:
- https://docs.astral.sh/uv/reference/settings/
- https://docs.astral.sh/uv/concepts/cache/

---

## 9. Worktree

`git worktree` はRepositoryを完全cloneするのではなく、同じRepositoryにLinked Working Treeを追加します。

参照:
- https://git-scm.com/docs/git-worktree

物理配置:

```text
project/
├─ main/
└─ worktrees/
   ├─ task-a/
   └─ task-b/
```

各Worktree:

```text
worktrees/task-a/
├─ apps/
├─ docs/
├─ tests/
├─ .agents/
├─ .codex/
└─ .venv/
```

運用:

- 独立したTask → 別Worktree
- 自動Mergeできない変更が重なるとConflict
- AIにConflict解消を任せてもTest成功を完了条件にする

---

## 10. 既存フォルダ移行時のルール

名前だけで責務を推測して移動しません。

現在存在する実装フォルダは、内容を確認してから次のどれに該当するか決めます。

```text
apps/web/
apps/api/
apps/desktop/
apps/common/config/
```

生成物はSourceとして管理しません。

例:

```text
.pytest_cache/
.tmp/
logs/
__pycache__/
```

Tool固有Folderは、用途を確認するまで削除・移動を確定しません。

例:

```text
.obsidian/
.playwright-mcp/
```

---

## 11. 構成上のAnti-pattern

以下はRepository構成として採用しません。

```text
docs/
├─ features/login.md
├─ specs/login.md
├─ login-current.md
└─ login-v2.md
```

また、Featureごとに以下を複製しません。

```text
AGENTS
Rules
Hooks
CI
```

基本は:

```text
Task
 ↓
Feature
 ↓
必要なCode / Tests
```

Global HarnessはRepository全体で共有します。

---

## 12.0 Harness / Graph / Loop の配置図

Repository上の配置とCodex機能の対応は次の図を基準にします。

![Harness / Graph / Loop のRepository実装マップ](images/loop-harness-graph-implementation-map.png)

## 12. Loop EngineeringとRepository構成

### 12.1 結論

**Loop専用フォルダは追加せず、Loopの各責務を既存のHarness / Docs / Tests / Worktreeへ割り当てます。**

### 12.2 抽象構造

Loop Engineeringは、新しい情報クラスではなく実行方式です。

```text
Loop
├─ Goal
├─ Context
├─ Action boundary
├─ Verifier
├─ State
├─ Stop condition
├─ Resource limit
└─ Escalation
```

そのため、

```text
loops/
loop-config/
agent-loops/
```

のような専用ディレクトリは現時点では作りません。

### 12.3 Repositoryとの対応

```text
AGENTS.md
└─ Loop時の基本行動・作業原則

docs/tasks/active/
└─ Goal / State / Stop / Escalation / Evidence

docs/features/
└─ Loopが参照する現在仕様

.codex/rules/
└─ Action boundary / Permission

.codex/hooks.json
└─ Trigger / Lifecycle Event

tests/
└─ Verifier / Assertion

.github/workflows/
└─ Verificationの強制 / Final gate

Worktree
└─ Parallel Loopの書き込み分離
```

対応表:

| Loop要素 | Source / 実装先 | 役割 |
|---|---|---|
| Goal | `docs/tasks/active/` | 今回達成するOutcome |
| Context | Task → Feature → Code / Tests | 必要Contextだけを段階的に取得 |
| Action boundary | `.codex/rules/` + Task Scope | 実行・変更可能範囲 |
| Verifier | `tests/` | 成功条件をExecutableに判定 |
| State | `docs/tasks/active/` | Completed / Evidence / Remaining等 |
| Stop condition | TaskのLoop Contract | Success / Failure終了条件 |
| Resource limit | TaskのLoop Contract | Max attempts / time / budget |
| Escalation | TaskのLoop Contract | 人間判断へ戻す条件 |
| Trigger | `.codex/hooks.json` 等 | Loop開始・Lifecycle処理 |
| Final gate | `.github/workflows/` | Merge前の強制Verification |
| Parallel isolation | Git Worktree | Loop同士の書き込み衝突回避 |

### 12.4 TaskとChatの関係

Loop Engineeringでは、Chatを永続状態として扱いません。

```text
1 Task
= 1 Outcome
= 1 durable state

Chat
= Taskを実行する一時Context
```

したがって、Chatが切り替わってもTaskから再開できる状態を維持します。

最低限:

```text
Completed
Evidence
Remaining
Exact next action
Last failure
Attempt count
```

をTask側へ保持します。

### 12.5 Autonomous Loop時だけ追加する情報

すべてのTaskへLoop情報を追加しません。

通常Task:

```text
Goal
Scope
Acceptance criteria
Completed
Evidence
Remaining
Exact next action
```

自律Loopを使用するTaskのみ:

```text
Loop contract
├─ Trigger
├─ Action boundary
├─ Verifier
├─ Stop condition
├─ Resource limit
├─ Escalation
├─ Last failure
└─ Attempt count
```

これにより、通常TaskのDocument costを増やしません。

### 12.6 Hooksへ責務を集めすぎない

Loopを導入しても、Hooksを万能な実行場所にはしません。

悪い例:

```text
Stop Hook
├─ Unit Test
├─ Integration Test
├─ Build
├─ Review
└─ Deploy
```

責務は引き続き分離します。

```text
Hooks
= Event / Trigger

Tests
= Assertion / Verifier

CI
= Enforcement / Final gate
```

原則:

```text
Definition = 1 place
Reference  = many
Execution  = many
```

### 12.7 Parallel Loop

独立Taskを並列実行する場合:

```text
TASK-A
└─ Worktree A
   └─ Loop A

TASK-B
└─ Worktree B
   └─ Loop B
```

同一Working treeで複数の書き込みLoopを走らせません。

共有するもの:

```text
Repository history
Feature specification
Tests
CI
```

分離するもの:

```text
Working files
Branch
Task state
Loop state
```

### 12.8 構成上の原則

```text
Loop Engineering
≠ Loop用フォルダを作ること

Loop Engineering
= 既存のRepository構造に
  Goal / State / Verification / Stop / Escalationを
  明示的に割り当てること
```

新しいフォルダは、既存構造では表現できない独立した永続データが実際に発生した場合だけ追加します。

---

## 13. Graph EngineeringとRepository構成

### 13.1 結論

**Graph専用フォルダは最初から作らず、Subagent / Orchestration / State / Gateを既存構成へ割り当てます。**

### 13.2 対応関係

```text
.codex/agents/
└─ Specialist Agent / Graph Node候補

.agents/skills/
└─ Node内部で再利用するWorkflow

docs/tasks/active/
└─ Task State / Evidence / Dependency

docs/features/
└─ Shared specification

.codex/rules/
└─ NodeごとのAction boundary

.codex/hooks.json
└─ Event / Trigger

tests/
└─ Transitionを決めるVerifier

.github/workflows/
└─ Integration / Final gate

Git Worktree
└─ Parallel write Nodeの隔離
```

### 13.3 SubagentとOrchestrator

```text
Subagent
= Graph上のWorker / Specialist Node

Orchestrator
= NodeのDispatch
  + Context routing
  + Handoff
  + Transition
```

ただし、NodeはAgentだけではありません。

```text
Agent
Script
Test
CI
Human approval
Tool
```

を混在できます。

### 13.4 Graph State

Graph全体の状態をChatへ閉じ込めません。

Task側で必要に応じて:

```text
Current node
Completed nodes
Evidence
Blocked by
Remaining
Exact next action
```

を保持します。

Graphが複雑化するまでは専用State fileを追加しません。

### 13.5 Graph化する条件

次を満たす場合だけGraph化します。

```text
同じ役割分担を繰り返す
Handoffが安定している
NodeのInput / Outputが定義できる
Parallelismに利益がある
Transition条件が明確
```

探索的Taskや一度しか使わない流れは、通常のTask + Loopで処理します。

### 13.6 新しい `graphs/` を作る条件

以下のような**永続的・実行可能なGraph定義そのもの**が必要になった場合のみ、新しい保存場所を検討します。

例:

```text
Node definition
Edge / dependency definition
Transition condition
Graph version
Executable workflow configuration
```

それまでは、

```text
graphs/
orchestration/
workflows/
```

を構成上の流行語だけで追加しません。
