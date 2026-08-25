# Coding Rules

- Status: Current Specification
- Last verified: 2026-08-21

## Before implementation

1. 対象Task、関連Feature、Decision、実コードを読む。
2. 変更方針、影響範囲、検証方法を実装前に共有し、承認された範囲だけ変更する。
3. Contract、保存形式、Path、Security boundaryを変更する場合は正本文書を先に更新する。
4. 変更後はTaskのAcceptance criteriaに対応するUnit/Integration/E2EまたはStatic checkを実行する。

## Python

- 変数・関数は`snake_case`、classは`PascalCase`を使用する。
- Connector入口は`execute(action, params, context)`を維持する。
- 例外を握りつぶさず、利用者向けerror contractまたは実行Engineへ返す。
- File pathはbaseと許可範囲を明示し、relative/absolute、traversal、symlinkを区別する。
- Import時副作用を増やさない。避けられない初期化はTestで隔離可能にする。
- External service、実資格情報、browser/OS操作を通常Testの必須条件にしない。

## JavaScript

- 変数・関数は`camelCase`、classは`PascalCase`、定数は`UPPER_SNAKE_CASE`を使用する。
- `const`を優先し、再代入時だけ`let`を使う。`var`は追加しない。
- 文字列は既存コードに合わせてdouble quote、statementはsemicolon付きとする。
- State計算、DOM描画、Bridge Adapter、page固有処理を混在させない。
- 視覚状態はclass/data属性とCSSで表し、JSへ色値を直書きしない。
- 新しい`window.*` globalは必要最小限とし、既存`window.zizPackages`/Bridge boundaryを優先する。
- Error logと利用者向け表示を分離し、復旧不能な初期化失敗は継続しない。

## CSS and UI

- 色は`apps/gui/css/00_tokens.css`の既存tokenを使用する。
- 新規tokenは既存のbrand/semantic/interactive/surface/text/border/alpha責務へ分類する。
- Component CSSは対象componentへ閉じ、global selectorや既存tokenの意味変更を避ける。
- Semantic stateとinteractive stateを混同せず、hover等でerror/successの意味を消さない。
- 既存の非準拠箇所は無関係なTaskで一括修正せず、対象変更時に段階的に解消する。

## Data, Bridge, and Connector contracts

- `.zizd`とschemaは[Data Contract](data-contract.md)を正とする。
- Connectorの共通境界は[Connector Contract](connectors.md)を正とする。
- Bridge Protocol変更は[Architecture](architecture.md)とADRの互換期間に従う。
- Configの宣言、state、renderer、backend actionを変更する場合は、一方だけを更新しない。

## Verification and evidence

- Python syntaxだけでなく、変更が影響する公開behaviorを検証する。
- YAMLはparse、Pathは実在/拒否境界、移動は旧参照0を確認する。
- UIを実画面確認できない場合は、未確認としてTask Evidenceへ記録する。
- Test source/configは追跡し、cache、report、capture、log、node_modules、`.pyc`はartifactとして分離する。
- 成功/失敗の要約をTaskへ残し、長い実行logや画像はartifact path/hashで参照する。
