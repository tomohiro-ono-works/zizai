# Codex 開発 単語帳

> [!IMPORTANT]
> **Status: Versioned Reference — not ZizAI Current Specification.** 用語が現行の[Documentation Index](../README.md)、Feature、Decision、Taskと競合する場合は、そちらを優先する。

更新日: 2026-08-15

## 1. 目的

この資料内で使用する用語の意味を統一します。

## 2. 結論

本資料では、**以下の用語定義を標準として使用**します。

---

## 3. 用語一覧

| 用語 | 意味 |
|---|---|
| Project | 同じコードベースや関連資料を共有する作業単位。複数Chatを含められる。 |
| Chat | 個別の会話・作業スレッド。この資料では distinct outcome 単位で分ける。 |
| Distinct outcome | 明確に異なる成果・結果。Chatを分ける基準。 |
| Context | Codexがその時点で参照している指示・会話・ファイル内容などの情報。 |
| Context pollution | 探索ログや大量の中間出力などにより、有用な情報が埋もれる状態。 |
| Context rot | 関係の薄い情報がContextに蓄積し、応答や判断の信頼性が低下する問題。 |
| Compaction | 長い会話のContextを圧縮・要約して継続する処理。 |
| Main Chat | Taskの要件・決定・現在状態・最終結果を保持する中心Chat。 |
| Subagent | Main Chatから独立作業を委譲されるAgent。探索・テスト・レビューなどに使う。 |
| Custom Agent | `.codex/agents/` などで役割を定義した専用Agent。 |
| AGENTS.md | Codex向けの恒久的なRepository指示を置くファイル。 |
| AGENTS.override.md | 特定Scopeで `AGENTS.md` の指示を上書きするファイル。 |
| Skill | 繰り返し利用する手順や知識をまとめた再利用可能なWorkflow。 |
| Progressive disclosure | 必要な情報だけ段階的にContextへ読み込む方式。 |
| Prompt | Codexへ渡す作業指示。Goal / Context / Boundaries / Verification / Output などで構成する。 |
| Goal | Taskで達成したい最終結果。 |
| Scope | Taskで変更・検討する範囲。 |
| Out of scope | Taskでは扱わない範囲。 |
| Constraint | 実装・運用上の制約。 |
| Acceptance criteria | Taskを完了と判断する具体的な条件。 |
| Verification | Acceptance criteriaを満たしたことを証明するテストや確認。 |
| Source of truth | 現在有効な仕様・状態として参照する正本。 |
| Feature document | 1つのFeatureについて現在有効な仕様をまとめる正本。Taskから参照する。 |
| ADR | Architecture Decision Record。重要な設計判断と理由を記録する文書。 |
| Task | 単一のOutcomeを持ち、独立して実装・検証・マージできる最小の意味ある変更単位。 |
| Task state | Taskの現在状態。Completed / Remaining / Exact next action などを含む。 |
| Handoff | Chatや担当を切り替える際に、現在状態を引き継ぐための記録。 |
| Branch | Git上で変更を分離するための履歴の枝。 |
| Worktree | 同じGit Repositoryに紐づく別Working Tree。並列作業を物理的に分離できる。 |
| Main worktree | `git clone` や `git init` で作られた基準Working Tree。 |
| Linked worktree | `git worktree add` で追加されたWorking Tree。 |
| Working Tree | GitでCheckoutされた実ファイル群。 |
| Merge | 別Branchの変更を統合する操作。 |
| Merge conflict | Gitが変更を自動統合できず、解消が必要な状態。 |
| CI | Continuous Integration。テストや検証を自動実行する仕組み。 |
| Deploy | Build済み成果物を利用可能な状態へ配置・公開する工程。 |
| Smoke test | Deploy後に最低限の主要動作を確認するテスト。 |
| Unit test | 単一機能や小さな単位を検証するテスト。 |
| Integration test | 複数コンポーネントの連携を検証するテスト。 |
| E2E test | ユーザー操作に近い形でシステム全体を通して検証するテスト。 |
| Harness Engineering | Agentの外側に制約・権限・状態・Tool・検証・停止条件を置き、Modelの行動をBoundedかつ検証可能にする実行環境を設計する考え方。 |
| Guardrail | Agentの行動や出力を制限・検証する仕組み。 |
| Sandbox | Agentがアクセス・実行できる範囲を技術的に制限する仕組み。 |
| Approval | 特定操作を行う前に人間の確認を要求する仕組み。 |
| Rule | Commandを allow / prompt / forbidden などに分類する実行ルール。 |
| Hook | CodexのLifecycleイベントで決定的な処理を実行する仕組み。 |
| Lifecycle | Agent開始・Tool使用・Compaction・終了など、一連の実行段階。 |
| Loop Engineering | 人間が逐次Promptする代わりに、Goal・Trigger・Feedback・Verification・State・Stopを持つ自律cycle自体を設計する考え方。 |
| Graph Engineering | 複数のLoop / Agent / deterministic process / human gateを、依存関係・Handoff・分岐・並列・合流・検証を持つ実行構造として設計する考え方。 |
| Node | Graph内の処理単位。 |
| Edge | Graph内で次のNodeへの遷移を表す接続。 |
| State | GraphやTaskの途中状態として保持される情報。 |
| Spine | Loopを跨いでGoal・進捗・結果・次Actionを保持する永続状態。Chatだけに依存しないための記憶層。 |
| Monorepo | 複数のアプリやコンポーネントを1つのGit Repositoryで管理する構成。 |
| WebView | Desktop App内でWebコンテンツを表示するコンポーネント。 |
| localhost | 同じPC上で動くServerへ接続するためのHost。 |
| `apps/web/` | WebViewに表示するWeb側コードを置く場所。 |
| `apps/api/` | localhostで動作するPython Backend / APIを置く場所。 |
| `apps/desktop/` | WebViewとlocalhost ProcessのLifecycleを扱うDesktop側コードの場所。 |
| `apps/common/config/` | web / api / desktop が共通利用するアプリ設定の場所。 |
| `.venv/` | PythonのVirtual Environment。Git管理しない。 |
| `.env` | Local環境値を保存するファイル。Git管理しない。 |
| uv | PythonのPackage / Environment管理Tool。 |
| Hardlink | 同一Filesystem上で複数Pathから同じFile dataを参照する仕組み。 |
| Source ownership | 同じ情報を複数箇所に複製せず、どのファイルを正本とするか決めること。 |
| Enforcement | 定義済みのRuleやTestを特定Eventで強制的に実行すること。この資料では主にCIの責務。 |
| Assertion | 実装が期待条件を満たすかをExecutableに判定する条件。この資料ではTestsの主責務。 |
| Documentation cost | 文書の作成・更新・同期・探索にかかるコスト。分割によるContext削減効果と比較して最小化する。 |
| Anti-pattern | 一見合理的でも、Context増大・Source of truthの重複・探索コスト・同期コストを生みやすいため避けるべき設計・運用パターン。 |

| Work item | Taskを完成させるための内部作業。単独で意味のある完成状態にならない場合はTaskへ分割しない。 |
| Initiative | 複数Taskを束ねる上位の変更テーマ。必要な場合だけ使用する。 |
| Verifier | LoopのOutcome達成を判定する検証器。可能な限りdeterministicなTest・Compiler・Static analysisを優先する。 |
| Inner loop | 1 Task内部でAction→Observation→Verification→Adjustmentを反復するLoop。 |
| Outer loop | Task選択・Trigger・Context供給・Escalationなど、Inner loopの外側を制御するLoop。 |
| Loop Contract | Goal / Trigger / Context / Action boundary / Verifier / State / Stop / Resource limit / Escalationを定義する実行契約。 |
| Escalation | Agentだけで安全・正確に判断できない場合にLoopを停止し、人間や上位Processへ判断を戻すこと。 |
| Admission filter | EventをAgentへ渡す前に、安価で決定的な条件で不要入力を除外する前処理。 |
| No-progress detection | 同一Failureの反復やVerification改善なしを検知し、無限反復を止める仕組み。 |
| Closed loop | Action結果をObservation / Verificationし、そのFeedbackを次Actionへ反映するLoop。 |
| Orchestrator | Graph上のNodeをDispatchし、Context routing・Handoff・Transition・Stateの流れを制御する役割。 |
| Graph Node | Graphを構成する処理単位。Agentに限らずScript・Test・CI・Human gate・Toolも含み得る。 |
| Join | 並列に分岐した複数Nodeの結果を再び1つの後続処理へ集約する地点。 |
