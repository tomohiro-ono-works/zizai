# v23 Harness / Docs Disposition

- Related task: TASK-002
- Date: 2026-08-18
- Status: Approved

## Confirmed decision: Codex Rules / Hooks

- `.codex/rules` は作成しない。
- `.codex/hooks.json` は作成しない。
- TASK-007 は非着手（Not Activated）とする。

### Rationale

- Rules で固定すべき、反復利用する具体的なサンドボックス外コマンド・コマンド接頭辞が確認できない。
- Hooks でのみ実現すべき、ライフサイクルイベント固有の決定的・冪等な処理が確認できない。
- テストおよび CI の検証責務は TASK-008、010、011、012、014、015 が担うため、Hooks へ重複させない。
- 空または将来を推測した設定は、権限境界・実行タイミング・保守責務を不明瞭にする。

### Re-evaluation triggers

- Rules: 同一のサンドボックス外コマンド接頭辞について、恒常的な allow / prompt / forbidden の指定が必要になった場合。
- Hooks: task・tests・CI では代替できないライフサイクル固有処理が発生し、対象イベント、入出力、失敗時挙動、冪等性を具体化できた場合。

### Evidence

- OpenAI Codex Rules: <https://learn.chatgpt.com/docs/agent-configuration/rules>
- OpenAI Codex Hooks: <https://learn.chatgpt.com/docs/hooks>
- TASK-006～015を確認し、Rules / Hooks の具体的なコマンド、イベント、matcher、スクリプト、入出力契約が未定義であることを確認した。
- Claude Codeへ読み取り専用レビューを依頼し、Rules / Hooks とも現時点では不要、必要条件が具体化した場合のみ再評価する結論が得られた。

## Confirmed decision: migration strategy

- `.docs/` と `.codex-harness/` は、選択的MERGE＋最小限ARCHIVEとする。
- 現行仕様、未解決事項、重要な判断、再利用価値のある証跡だけを現行の `docs/` 配下へ移行する。
- 重複、旧仕様、矛盾を含む旧ツリー全体は、正本化または一括ARCHIVEしない。
- 移行先は内容に応じて `docs/features/`、`docs/tasks/`、`docs/decisions/`、`docs/handoffs/` から選ぶ。

## Confirmed decision: backend test plan

- `.docs/areas/backend-tests.md` は、現行仕様ではなく未実装の検証計画として扱う。
- 有効なテスト観点と未決事項を `docs/handoffs/` へ選択的に引き継ぐ。
- テスト実装は将来タスクとして管理し、`docs/features/` の正本仕様には直接移さない。

## Confirmed decision: stale operational assets

- 重複・陳腐化した `.codex-harness/scripts/`、`subagents/`、`orchestration/` は、必要情報の抽出後に移行対象からEXCLUDEする。
- EXCLUDEの決定だけでは元ファイルを削除しない。削除は移行内容の確認後に、別作業として実施する。

## Disposition by asset group

| Existing asset | Disposition | Destination / treatment |
| --- | --- | --- |
| `AGENTS.md` | KEEP / UPDATE | rootに維持し、下表の新しい正本参照へ更新する。更新実施はTASK-002の範囲外。 |
| `.agents/skills/` | KEEP | 再利用作業手順として現行パスを維持する。 |
| `.codex/agents/` | KEEP | エージェント定義として現行パスを維持する。 |
| `.codex/config.toml` | KEEP | 現行パスを維持する。設定内容の妥当性確認は別タスクとする。 |
| `.codex/rules/` | EXCLUDE | 現時点では作成しない。具体的な権限ルールが必要になった場合のみ再評価する。 |
| `.codex/hooks.json` | EXCLUDE | 現時点では作成しない。ライフサイクル固有処理が具体化した場合のみ再評価する。 |
| `.docs/areas/backend-tests.md` | MERGE | 有効なテスト観点と未決事項を `docs/handoffs/` へ移し、実装は将来タスク化する。 |
| `.docs/` の不在正本（architecture等） | EXCLUDE | 空の旧構造は再作成せず、必要な正本を現行 `docs/features/` に作成する。 |
| `.codex-harness/checks/` | MERGE | 現行化できる完了条件を対応する `docs/tasks/` または `docs/features/` へ統合する。統合後の旧チェックリストはEXCLUDEする。 |
| `.codex-harness/reports/areas/` | MERGE | 現行仕様は `docs/features/`、未解決事項は `docs/tasks/`、重要判断は `docs/decisions/`、必要な経緯は `docs/handoffs/` へ選択的に移す。 |
| `.codex-harness/reports/reference/standards/` | MERGE | 現行コード・決定と照合できた規約だけを `docs/features/` または適切な正本文書へ統合する。旧内容をそのまま正本化しない。 |
| 日付付き調査・監査・ベンチマーク等の履歴 | ARCHIVE | 将来の判断根拠になる固有情報だけを `docs/handoffs/` に要約して残す。重複ログはEXCLUDEする。 |
| `.codex-harness/orchestration/` | EXCLUDE | TASK-003に必要なWIP・欠落情報だけを抽出し、旧チャット運用状態は移行しない。 |
| `.codex-harness/subagents/` | EXCLUDE | 固有の判断・未解決事項だけを抽出し、2026-07時点の作業指示は移行しない。 |
| `.codex-harness/scripts/` | EXCLUDE | 再利用価値がある処理または証跡だけを抽出し、単純ラッパーやハードコードされた旧診断は移行しない。 |

## Canonical reference replacements

AGENTS/READMEの参照先は、移行実施時に次のとおり統一する。同じDefinitionを旧パスへ複製しない。

| Existing reference | Canonical reference |
| --- | --- |
| `.docs/architecture.md` | `docs/features/architecture.md` |
| `.docs/coding-rules.md` | `docs/features/coding-rules.md` |
| `.docs/refactor-policy.md` | `docs/features/refactor-policy.md` |
| `.docs/areas/<area>.md` | `docs/features/<area>.md` |
| `.codex-harness/tasks/<task>.md` | `docs/tasks/active/<task>.md` または `docs/tasks/done/<task>.md` |
| `.codex-harness/checks/` | 各 `docs/tasks/` のAcceptance criteria。横断ルールだけ `docs/features/` に置く。 |
| `.codex-harness/reports/areas/<area>/issues.md` | 対応する `docs/tasks/active/` のタスク。仕様化済み内容は `docs/features/` に置く。 |
| `.codex-harness/reports/` | `docs/handoffs/`。重要な確定判断は `docs/decisions/` に置く。 |
| `.codex-harness/reports/reference/` | 検証後に `docs/features/` へ統合し、旧参照は残さない。 |

## Migration order

1. MERGE対象を現行コード・既決定と照合する。
2. 正本、タスク、判断記録、引き継ぎへ分けて移行する。
3. ARCHIVE対象は固有の判断根拠だけを要約する。
4. 移行漏れがないことを確認してから、EXCLUDE対象の削除可否を別途判断する。

## Approval

- 上記のRules / Hooks、移行戦略、backend test plan、旧運用資産、分類表はユーザー承認済み。
