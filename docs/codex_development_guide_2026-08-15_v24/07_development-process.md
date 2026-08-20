# 標準開発工程

> [!IMPORTANT]
> **Status: Versioned Reference — not ZizAI Current Specification.** ZizAIでは[AGENTS.md](../../AGENTS.md)、[Documentation Index](../README.md)、各TaskのAcceptance criteriaを優先し、本資料の一般工程を自動適用しない。

更新日: 2026-08-15

## 1. 目的

設計からDeployまでの流れを固定し、Codex・Git・Task・Testの役割を明確にします。

## 2. 結論

開発工程は **設計 → 開発 → マージ → デプロイ** の4段階に固定し、**Taskの状態と証跡は `docs/tasks/` で管理**します。

---

## 3. 工程全体の抽象ルール

### 3.1 3つの設計レイヤー

この開発工程は、次の3レイヤーで考えます。

```text
Harness Engineering
└─ 全工程を制約・状態・検証で囲う

Graph Engineering
└─ 設計 → 開発 → マージ → デプロイ の遷移を定義

Loop Engineering
└─ 各工程内で、完了条件を満たすまで反復
```

**[LLM解釈]**

役割を分けると:

| 観点 | 設計対象 | この開発工程での例 |
|---|---|---|
| Harness | 外側の制約・状態・検証 | AGENTS / Docs / Rules / Hooks / Tests / CI |
| Graph | Node・遷移・依存関係 | 設計 → 開発 → マージ → デプロイ |
| Loop | Node内の反復と停止条件 | 実装 → Test → 修正 → 再Test |

### 3.2 開発Graph

```text
① 設計
   ↓
② 開発
   ↓
③ マージ
   ↓
④ デプロイ
```

各工程は、前工程の完了条件を満たしたときだけ次へ進みます。

```text
Design criteria pass
    ↓
Development

Unit criteria pass
    ↓
Merge

Integration / CI pass
    ↓
Deploy

Smoke criteria pass
    ↓
Done
```

### 3.3 各NodeのLoop

開発:

```text
Implement
 ↓
Unit Test
 ↓
Pass? ─ Yes → Mergeへ
 │
 No
 ↓
Fix
 └────→ Unit Test
```

マージ:

```text
Integrate
 ↓
Integration Test / CI
 ↓
Pass? ─ Yes → Deployへ
 │
 No
 ↓
Fix / Conflict解消
 └────────→ Test
```

デプロイ:

```text
Deploy
 ↓
Smoke Test
 ↓
Pass? ─ Yes → Done
 │
 No
 ↓
Fix / Rollback判断
 └────────→ Recheck
```

### 3.4 Spine / Task State

LoopをChatの記憶だけで回しません。

Task Fileを永続状態として使います。

```text
docs/tasks/active/TASK-XXX.md
```

最低限、各反復後に次を更新します。

```text
Completed
Evidence
Remaining
Exact next action
```

これはLoop Engineeringでいう **spine（持続する進捗状態）** に相当するものとして、このプロジェクトで採用する **[LLM解釈]** です。

### 3.5 共通処理モデル

各工程では次の4点を管理します。

```text
Input
→ Work
→ Verification
→ State Update
```

具体的には:

| 工程 | Input | Work | Verification | State |
|---|---|---|---|---|
| 設計 | 要求 | Spec / Task整理 | Acceptance criteria | Design |
| 開発 | Task / Spec | Branch / Worktree / 実装 | Unit Test | Development |
| マージ | 実装済Branch | Main同期 / Conflict解消 | Integration / CI | Merge |
| デプロイ | Main | Build / Release | Smoke Test | Done |
---

---

## 4. 1 Taskとは何か

### 4.1 目的

Taskを、単なる「作業項目」や「機能名」ではなく、Codexが独立して扱える実装単位として定義します。

Task粒度が大きすぎると、

```text
Contextが広がる
→ Chatが長期化する
→ Completed / Remaining / Next action の管理が難しくなる
→ 再探索・再読・Compaction後の復元コストが増える
```

一方、Task粒度が細かすぎると、

```text
Branch / Worktree / Task fileが増える
→ Coordination costが増える
→ Integration前提の未完成状態が大量に生まれる
→ Merge / Review / Documentation costが増える
```

そのため、Taskは「最小のコード変更」ではなく、**最小の意味ある完成単位**として定義します。

### 4.2 結論

**1 Task = 単一のOutcomeを持ち、独立して実装・検証・マージできる最小の意味ある変更単位**とします。

### 4.3 抽象原則

Taskを決めるときは、機能名・画面・API・ファイル・担当層ではなく、次の4軸で判断します。

```text
① Outcome
② Verification
③ Atomicity
④ Context
```

#### Outcome

Taskには1つの明確な変更目的があります。

良い例:

```text
30分無操作で自動ログアウトする
```

悪い例:

```text
Loginまわりをいろいろ改善する
```

#### Verification

Task単体で「Doneかどうか」を判定できる必要があります。

```text
Task:
30分無操作で自動ログアウトする

Verification:
- 30分無操作でSessionが失効する
- 操作中は失効しない
- Logout後に保護画面へ戻れない
```

#### Atomicity

Task単体でMergeしても、意味のある完成状態になることを重視します。

```text
この変更だけをMainへMergeしてよいか？
この変更だけをReleaseしてよいか？
この変更だけをRollbackしてよいか？
```

#### Context

1 Taskの中で扱う仕様・Code・Testが、1つのCodex作業Contextとしてまとまっていることを重視します。

複数の独立Outcomeを1 Taskへ入れると、必要Contextが広がります。独立して切り離せるOutcomeは分ける方向を基本にします。

### 4.4 Taskではないもの

以下は、原則としてTaskそのものではありません。

```text
Feature
Initiative / Change theme
Work item
Acceptance Criteria
Test Case
File
Function
API endpoint
UI component
```

関係は次です。

```text
Feature
└─ Initiative / Change theme
   └─ Task
      ├─ Work item
      ├─ Acceptance Criteria
      └─ Test Case
```

`Initiative / Change theme` は必要な場合だけ使います。

### 4.5 Featureとの違い

Featureは長期的に存在する機能単位です。

```text
Feature
└─ Login
```

Taskは、そのFeatureに対して今回加える変更単位です。

```text
Feature: Login

Task:
- 30分無操作で自動ログアウトする
- 同時ログインを3端末までに制限する
- Remember meを追加する
```

```text
Feature → docs/features/
Task    → docs/tasks/active/
```

### 4.6 Initiative / Change themeとの違い

複数Taskをまとめる上位テーマが必要な場合だけ使います。

```text
Feature
└─ Login

Initiative
└─ セキュリティ改善

Task
├─ 30分無操作ログアウト
├─ 同時ログイン制限
└─ Session失効方式の変更
```

`ログイン機能改修` のような言葉は、複数の独立Outcomeを含むならTaskではなく上位テーマとして扱います。

### 4.7 Work itemとの違い

Work itemは、Taskを完成させるための内部作業です。

```text
Task
└─ 30分無操作で自動ログアウトする

Work items
├─ Sessionに最終操作時刻を保持する
├─ APIでSession timeoutを判定する
├─ Web側で操作時刻を更新する
├─ Logout後にLogin画面へ遷移する
└─ Testを追加する
```

これらは通常、別Taskにはしません。

Taskは「実装手順」ではなく「完成状態」で切ります。

### 4.8 Acceptance Criteriaとの違い

Acceptance CriteriaはTaskのDone条件です。

```text
Task:
30分無操作で自動ログアウトする
```

```text
Acceptance Criteria:
- 30分無操作でSessionが失効する
- 操作があればTimeoutが更新される
- Logout後に認証必須画面へ戻れない
- 複数端末の場合もSession単位で判定される
```

条件が増えたからといって、機械的にTaskを分割しません。

### 4.9 Test Caseとの違い

Test Caseは、Acceptance Criteriaを具体的な入力・状態・期待結果へ落としたものです。

```text
Acceptance Criteria:
複数端末の場合もSession単位でTimeout判定される
```

```text
Case 1:
端末A = 31分無操作
端末B = 操作継続
→ AのみLogout

Case 2:
端末A = 31分無操作
端末B = 31分無操作
→ A/BともLogout

Case 3:
端末A = 29分59秒無操作
→ Logoutしない

Case 4:
端末A = 30分00秒無操作
→ Logoutする
```

### 4.10 Login機能の具体例

要求:

```text
ログイン機能を改善したい

- 30分無操作でログアウト
- 同時ログインを3端末までに制限
- エラーメッセージ改善
- Remember me追加
```

この場合、原則は4 Taskです。

```text
Feature: Login

TASK-101
└─ 30分無操作で自動ログアウトする

TASK-102
└─ 同時ログインを3端末までに制限する

TASK-103
└─ ログインエラー表示を改善する

TASK-104
└─ Remember meを追加する
```

それぞれが独立して実装・検証・Merge・延期できる可能性が高いためです。

### 4.11 1 Taskにまとめる例

要求:

```text
複数端末環境で、
30分無操作の端末Sessionだけを失効させる
```

内部変更:

```text
- Session IDの扱い変更
- 最終操作時刻の保存
- APIのTimeout判定
- Webの操作通知
- 複数端末Session管理
- Logout UI遷移
- Unit Test
- Integration Test
```

これらは1 Taskです。

```text
TASK-201
└─ 複数端末環境で端末単位の自動ログアウトを実装する
```

すべてが1つのOutcomeを成立させるためのWork itemだからです。

### 4.12 分割した方がよい例

```text
TASK-300
ログイン機能改善

- 30分無操作ログアウト
- 3端末制限
- Remember me
- Error message改善
- Login画面再デザイン
```

これは分割候補です。

各変更を個別にMerge・延期・Rollbackできるなら、独立したOutcomeです。

### 4.13 分割しすぎの例

悪い例:

```text
TASK-401
Session modelにlast_activity_atを追加

TASK-402
Timeout判定関数を追加

TASK-403
Frontendでactivity eventを送信

TASK-404
Logout redirectを追加

TASK-405
Unit Test追加
```

これらがすべて「30分無操作で自動ログアウト」を成立させるために必須なら、分割しすぎです。

### 4.14 Task分割の判定フロー

```text
Q1. 独立したOutcomeか？
│
├─ No → 同じTask内のWork item / AC / Test Case
│
└─ Yes
    ↓
Q2. 単独でDone判定できるか？
│
├─ No → 同じTaskへまとめる
│
└─ Yes
    ↓
Q3. 単独でMergeして意味のある状態になるか？
│
├─ No → 同じTaskへまとめる
│
└─ Yes
    ↓
Q4. 分けることでContext / Parallelism / Reviewが改善するか？
│
├─ No → 無理に分けない
│
└─ Yes → 別Task
```

### 4.15 Task統合の判定フロー

```text
Q1. 一方だけ実装しても意味がないか？
│
└─ Yes
    ↓
Q2. 一方だけMergeすると未完成・不整合になるか？
│
└─ Yes
    ↓
Q3. 同じAcceptance Criteria群でDone判定されるか？
│
└─ Yes
    ↓
同じTaskへ統合
```

### 4.16 Branch / Worktreeとの関係

原則:

```text
1 Task
≈ 1 Branch
≈ 1 Worktree（並列時）
```

これは絶対ルールではありません。

目的は、Task・Branch・Reviewの変更範囲を揃えることです。

### 4.17 Chatとの関係

原則:

```text
1 Task
≈ 1 primary Chat
```

Outcomeを中心にContext境界を作ります。

同じTask内でも大量調査・独立検証が必要なら、Subagentや補助Chatへ分離できます。

### 4.18 `docs/tasks/active/` の1ファイル

`active/` は1 Task = 1ファイルです。

```text
docs/tasks/active/
├─ TASK-101-auto-logout.md
├─ TASK-102-session-limit.md
└─ TASK-103-login-error-message.md
```

Task file:

```md
# TASK-101 Auto logout

## Goal

## Source
- `../../features/login.md`

## Scope

## Out of scope

## Acceptance criteria

## Expected change area

## Branch

## Worktree

## Test plan

## Completed

## Evidence

## Remaining

## Exact next action

## Termination condition
```

Feature仕様全文はコピーしません。

### 4.19 Task完了時

```text
実装
 ↓
Verification
 ↓
FeatureのCurrent behavior更新
 ↓
Task Evidence更新
 ↓
Merge
 ↓
docs/tasks/done/へ移動
```

Taskは変更履歴・実行証跡として残しますが、現在仕様の正本にはしません。

### 4.20 Task粒度のAnti-pattern

#### Feature = Task

```text
TASK-login.md
```

Login全体を永続Taskとして扱うと、Taskが終了せずContextも肥大化します。

#### File = Task

```text
TASK-web-login-js.md
TASK-api-auth-py.md
```

実装構造がTask境界を決めてしまいます。

#### Test Case = Task

```text
TASK-single-device.md
TASK-multi-device.md
TASK-timeout-boundary.md
```

同じOutcomeの条件違いならTaskではありません。

#### Implementation step = Task

```text
DB変更
API変更
UI変更
Test追加
```

独立した完成状態でなければWork itemです。

#### 大きなテーマ = Task

```text
Login改善
Performance改善
UX改善
```

複数の独立Outcomeを含むならInitiative / Themeです。

### 4.21 最終チェックリスト

```md
- [ ] Outcomeを1文で説明できる
- [ ] Task単体のAcceptance Criteriaがある
- [ ] 単体でDone判定できる
- [ ] 単体でMergeして意味のある状態になる
- [ ] 他Taskと独立して延期できる、または依存関係を明示できる
- [ ] Work itemをTaskへ過剰分割していない
- [ ] Test CaseをTaskとして扱っていない
- [ ] Feature全体をTaskにしていない
- [ ] 1 Chatで扱うContextとして大きすぎない
- [ ] 分割による管理コストがContext削減効果を上回っていない
```

### 4.22 要約

```text
Feature
= 長期的に存在する機能

Initiative / Theme
= 複数Taskをまとめる変更テーマ（必要な場合のみ）

Task
= 独立して実装・検証・Mergeできる
  最小の意味ある変更単位

Work item
= Taskを完成させる内部作業

Acceptance Criteria
= TaskのDone条件

Test Case
= Acceptance Criteriaを具体的に検証するケース
```

Task粒度はコード量ではなく、**Outcome・Verification・Atomicity・Context**で決めます。



### 4.23 TaskをLoopで実行する場合

通常のTaskを自律Loopへ載せる場合、Task粒度だけでなくLoop Contractを定義します。

```text
Task
 ↓
Goal
 ↓
Context load
 ↓
Implement
 ↓
Verifier
 ↓
Pass? ─ Yes → Stop
 │
 No
 ↓
Failure classification
 ↓
Fix
 ↓
State checkpoint
 └────────→ Verifier
```

最低限:

```md
## Loop contract

### Goal

### Context
- Feature:
- Code:
- Tests:

### Action boundary
- Allowed:
- Do not change:

### Verifier
- Command:
- Expected result:

### Stop condition
- Success:
- Failure:

### Resource limit
- Max attempts:
- Max elapsed time:

### Escalation
- Human decision required when:

### Loop state
- Attempt:
- Last failure:
- Last evidence:
```

すべてのTaskにこの欄を必須化しません。

**自律反復させるTaskだけ**に追加します。

#### Failure classification

Failした場合、すぐ同じ修正を繰り返さず、原因を分類します。

```text
Implementation failure
→ Code修正

Specification ambiguity
→ Stop + Human / Spec確認

Environment failure
→ Environment修復

Verifier failure
→ Test / Gate自体を確認

Permission failure
→ Stop + Escalation

Repeated same failure
→ Stop + Escalation
```

#### No-progress rule

次の状態をNo progressとして扱います。

```text
同一Errorが連続
同一Diffを繰り返す
Test結果が改善しない
変更量だけ増えてVerificationが改善しない
```

No progress時はLoopを継続せず、TaskへEvidenceを残してEscalateします。

#### Done判定

```text
Model says Done
```

はEvidenceではありません。

Doneに必要なのは、

```text
Acceptance criteria
+
Verifier PASS
+
Required evidence
```

です。

# 4. ① 設計

## 目的

実装前に次を確定します。

- Goal
- Scope / Out of scope
- Source of truth
- Acceptance criteria
- Test plan

## 使用する場所

```text
docs/features/
docs/decisions/
docs/tasks/active/
```

## Documentation flow

Taskを入口として、必要なFeatureだけ参照します。

```text
TASK
 ↓
Feature
 ↓
必要なCode / Tests
```

現在仕様はFeature、作業中の差分と進捗はTaskへ分離します。

## 必須Document

Task:

```text
docs/tasks/active/TASK-XXX.md
```

仕様変更がある場合:

```text
docs/features/<feature>.md
```

重要な設計判断を残す場合:

```text
docs/decisions/ADR-XXX.md
```

## Code

原則としてProduction Codeは変更しません。

## 完了条件

- Goalが明確
- Scopeが明確
- Source of truthが指定済み
- Acceptance criteriaがある
- Test planがある

Status:

```text
Design
→ Ready for Development
```

---

# 5. ② 開発

## 流れ

```text
Branch
→ Worktree
→ 実装
→ 単体Test
```

## Branch

命名例:

```text
feature/TASK-XXX-short-name
fix/TASK-XXX-short-name
```

必須規則ではありません。

## Worktree

必要に応じてTask専用Worktreeを作成します。

```bash
git fetch origin
git worktree add ../worktrees/TASK-XXX -b <branch> origin/main
```

Taskへ記録:

```md
Status: Development

## Branch
<branch>

## Worktree
<path>
```

## 実装場所

Taskの内容に応じて、確定済みの責務へ変更します。

```text
apps/web/
apps/api/
apps/desktop/
apps/common/config/
```

内部構成は必要になった場合だけ定義します。

## 単体Test

Test Code:

```text
tests/
```

`tests/` 内部の分類方法は、実際のTest Frameworkと既存構成を確認して決めます。

TaskのEvidence:

```md
## Evidence
- Test:
- Command:
- Result:
```

## 完了条件

- Acceptance criteriaの対象範囲を満たす
- 必要なUnit Testが成功
- TaskのCompleted / Evidence / Remaining / Exact next actionを更新済み

---

# 6. ③ マージ

## 流れ

```text
Mainの最新化
→ Conflict確認
→ 必要なら解消
→ Test再実行
→ 結合Test
→ CI / Review
→ MainへMerge
```

## Main同期

例:

```bash
git fetch origin
git merge origin/main
```

Merge / Rebase のどちらを標準にするかは固定しません。

## Conflict

```text
仕様確認
→ Conflict解消
→ Test
```

AIに解消させても、Testなしで完了扱いにしません。

## 結合Test

WebView + localhost の最低確認対象:

```text
Desktop起動
→ localhost backend起動
→ WebView表示
→ webとapiの通信
→ 正常終了
```

## CI / Review

CI:

```text
.github/workflows/
```

Codex Reviewerを用意する場合:

```text
.codex/agents/
```

確認対象:

- Correctness
- Regression
- Missing tests
- Specとの差異

## 完了条件

- 最新Mainとの統合済み
- Conflict解消済み
- 必要なUnit Test成功
- 必要なIntegration Test成功
- CI成功
- Acceptance criteriaを満たす

Status:

```text
Merge
→ Ready for Deploy
```

---

# 7. ④ デプロイ

## 基準

Deploy対象は原則Mainです。

```text
Main
→ Build / Package
→ Deploy / Release
→ Smoke Test
```

Feature Branchから直接Deployしません。

## 使用する場所

Application:

```text
apps/
```

CI / Release automation:

```text
.github/workflows/
```

追加Scriptが必要になった場合だけ、その時点で配置を決めます。

## Smoke Test

```text
Desktop起動
→ localhost起動
→ WebView表示
→ API通信
→ 主要機能確認
→ 正常終了
```

## 完了条件

TaskへDeploy結果とEvidenceを記録します。

```md
## Deploy
- Result:

## Evidence
- Unit:
- Integration:
- CI:
- Smoke:
```

成功後:

```text
FeatureのCurrent behaviorを最終状態へ更新
 ↓
docs/tasks/active/TASK-XXX.md
→ docs/tasks/done/TASK-XXX.md
```

過去仕様は別ファイルへ複製せず、Git historyへ残します。

不要になったWorktreeは削除します。

---

# 8. Task管理

## 保存場所

```text
docs/tasks/
├─ active/
└─ done/
```

Task一覧が必要になった場合だけ `docs/tasks/index.md` を追加します。

## Status

```text
Design
→ Ready for Development
→ Development
→ Merge
→ Ready for Deploy
→ Deploy
→ Done
```

## Taskに残す情報

最低限:

```text
Goal
Scope
Source of truth
Acceptance criteria
Branch
Worktree
Test plan
Completed
Evidence
Remaining
Exact next action
Termination condition
```

`Termination condition` は、Agentが「いつLoopを終了するか」を明示するために使います。

長時間作業では特に次を更新します。

```text
Completed
Evidence
Remaining
Exact next action
```

Chat履歴だけに進捗を依存させません。

---

# 9. Chatとの対応

| 工程 | Chat |
|---|---|
| 設計 | TaskのOutcome単位 |
| 開発 | 同じOutcomeなら継続 |
| Test | 同じChatまたはSubagent |
| マージ | 同じTaskで継続可能 |
| Review | Subagent利用可 |
| デプロイ | 同じOutcomeなら継続 |

Outcomeが変わった場合は、新しいTask / Chatへ分けます。

---

# 10. Harnessとの対応

| 工程 | 主に使うHarness |
|---|---|
| 設計 | `AGENTS.md`, `docs/` |
| 開発 | `.agents/skills/`, `.codex/agents/`, `.codex/rules/` |
| マージ | `tests/`, `.codex/hooks.json`, `.github/workflows/` |
| デプロイ | `.github/workflows/`, `tests/`, Task Evidence |

Harness専用工程や専用Folderは作りません。

---

## Graph化とTask粒度の関係

### 結論

**TaskをGraphのNodeへ機械的に1対1対応させません。TaskはOutcome単位、Graph Nodeは実行上の責務単位です。**

例:

```text
TASK-101 Auto logout
 ↓
Planner
 ↓
┌───────────────┐
API Worker    Web Worker
└──────┬────────┘
       ↓
Integration Test
       ↓
Review
```

このGraph全体で1 Taskを完了させることがあります。

逆に、Orchestratorが複数の独立TaskをDispatchするOuter Graphもあり得ます。

```text
Initiative
 ↓
Orchestrator
├→ TASK-A
├→ TASK-B
└→ TASK-C
```

したがって:

```text
Task
= Outcome boundary

Graph Node
= Execution responsibility

Loop
= Repetition boundary
```

と分けます。

### Subagentを使う条件

Subagentは次の場合に使います。

```text
独立したContextで処理できる
明確なInput / Outputがある
並列化またはContext隔離の利益がある
結果をMain Agentへ要約して返せる
```

単に「専門家っぽく見える」ためにAgent数を増やしません。

### Orchestrationを外部化する条件

同じ、

```text
Dispatch
→ Handoff
→ Verify
→ Retry / Next
```

が繰り返され、安定した場合にだけWorkflowとして外部化します。

最初から固定Graphを設計するのではなく、

```text
Taskで実行
→ Loopで安定化
→ 繰り返しHandoffを観測
→ Graphとして外部化
```

の順を基本にします。
