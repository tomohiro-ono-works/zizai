# Refactor Policy

- Status: Current Specification
- Last verified: 2026-08-23

## Classification before action

整理対象は、変更前に次へ分類する。

- `未使用`: 現行Code/Runtime/Test/CI/active documentationから参照されない。
- `旧仕様`: 現行DecisionまたはContractと競合し、互換維持も承認されていない。
- `重複`: 同じ責務・Definitionが複数箇所に存在する。
- `責務混在`: 削除対象ではなく、変更時に境界を分離する候補。
- `判断保留`: Evidenceまたは利用者判断が不足している。

判断が曖昧な対象は削除候補へ倒さない。

## Deletion gate

削除または旧path廃止の前に、対象ごとに次が`0`であることを確認する。

1. Code reference
2. Runtime reference
3. Test reference
4. CI reference
5. Active/canonical documentationの有効参照

Historical Handoff/Decisionが旧pathを過去Evidenceとして記録することは許容する。ただし現行実行先として案内している場合は参照残りと判定する。未追跡/local-only資産は、明示承認なしに削除しない。

## Moves and responsibility splits

- 名前だけで責務を推測して移動しない。
- Source moveとimport、dynamic load、launcher、config、asset、test、CI、documentationの更新を同じOutcomeで扱う。
- 互換shimは必要性と終了条件が承認された場合だけ追加する。
- 情報を統合するときは、固有のDecision、未解決事項、再利用可能なEvidenceが失われていないことを確認する。
- 大きなfileは変更対象責務に沿って小さく分けるが、無関係な全面再構成を行わない。

## Source and generated data

- Source、deterministic fixture、configuration、manual checklist/schemaは追跡対象にできる。
- log、cache、`.pyc`、result/report、capture、temporary data、local historyはgenerated/local stateとして追跡しない。
- Sourceとgenerated dataを同じdirectory単位で一括ignoreしない。

## Current deferred candidates

次は削除承認ではなく、専用TaskでEvidenceを再確認する候補である。

- `WorkflowEngine`、`BridgeRuntime`、`apps/gui/js/app.js`、`ui.node.canvas.js`、`workspace.manager.js`の責務分割。
- Connectorのparameter validation、DataFrame解決、action dispatch、side-effect resultの段階的共通化。
- `config.js`、`ui.fields.js`、詳細panel CSSの責務分割。
- `flow_locator.py`のWindows固有探索と汎用path/history責務の分離。
- 未参照icon、legacy aggregate CSS等の利用有無確認。

これらは候補であり、候補記載だけでは実装・削除を許可しない。Migration中は`docs/tasks/active/`の承認済み依存Graph、TASK-017のCodex検証済み調査結果、Verification Contractを優先する。Frontend libraryと重複するUI責務の削除はTASK-016、その他の承認済みlegacy/generated residue削除はTASK-014へ分離する。
