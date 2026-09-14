# Coding Rules

- Status: Current Specification
- Last verified: 2026-08-21

## Before implementation

1. 対象Task、関連Feature、Decision、実コードを読む。
2. 変更方針、影響範囲、検証方法を実装前に共有し、承認された範囲だけ変更する。
3. Contract、保存形式、Path、Security boundaryを変更する場合は正本文書を先に更新する。
4. 変更後はTaskのAcceptance criteriaに対応するUnit/Integration/E2EまたはStatic checkを実行する。

Taskの変更権限は、明示されたGoal、Scope、Constraints、Acceptance Criteriaに限定する。通常の実装、Bug修正、Refactor、Test追加、検証を理由にCurrent Specificationを変更しない。仕様変更自体がTaskのGoalまたはScopeで承認されている場合だけ、その対象範囲の正本を更新する。

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

## Reproducibility and local configuration

- Project内のPathはRepository相対を原則とし、tracked fileへ個人ユーザー名を含む絶対Pathを追加しない。
- 環境依存値は、Repository相対値または安全なdefault、明示的な環境変数またはCLI引数、必要な場合のみignored local configの順で扱う。
- API key、token、password、private key、credential付きURL、browser profile、cookie、sessionをtracked fileへ保存しない。
- 共有可能な設定はsafe exampleとして追跡し、秘密値やPC固有値を含めない。
- Local-only assetが存在しなくても、clone環境でProject仕様、Build、正式Testを理解・実行できる状態を維持する。

## External dependencies

- 対象は、`pyproject.toml`/`uv.lock`で管理するPython package、`apps/gui/vendor/`等へ同梱するthird-party library、今後追加・更新するその他の外部依存とする。
- 外部依存を追加・更新する前に、Projectの利用方法で商用利用が可能か、再配布条件を満たせるか、有償licenseや継続費用が発生しないか、既知の脆弱性がSecurity上受容可能かを確認する。
- 確認結果は、追加・更新を行う対象TaskのEvidenceへ記録する。

## Verification and evidence

- Python syntaxだけでなく、変更が影響する公開behaviorを検証する。
- YAMLはparse、Pathは実在/拒否境界、移動は旧参照0を確認する。
- 実行方法と判定方法が確定しているTest、Lint、Static check、Buildは、既存Command、Script、Runnerを直接使用する。
- Test実行だけを行う場合は対象Commandと必要なContextへ限定し、FAIL時にTaskの許可なく原因調査、Source変更、再実行を開始しない。
- UIを実画面確認できない場合は、未確認としてTask Evidenceへ記録する。
- Test source/configは追跡し、cache、report、capture、log、node_modules、`.pyc`はartifactとして分離する。
- 成功/失敗の要約をTaskへ残し、長い実行logや画像はartifact path/hashで参照する。
- Remoteへ反映する前に、正式なRemote Safe Gateで新規credential、個人絶対Path、local-only設定、本文メールの混入を確認する。Historical Baseline以前の既知情報は通常Gateの失敗理由にしないが、実credentialは年代を問わずSecurity issueとして扱う。
- 通常Gateは`python .github/scripts/remote_safe_gate.py --push-base <remote-base>`で実行する。Baseline `8b66fe6`以降のPrivacy全履歴監査は`--mode audit --baseline 8b66fe6`、全履歴credential監査はこれに`--all-history-secrets`を加えて明示実行する。
