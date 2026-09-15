# ADR Step Reference Canonical Format

- Status: Accepted
- Date: 2026-09-15
- Decision owner: Project owner
- Applies to: TASK-033

## Context

`input_data`、`input_data_rename`、`source_step_id`、`value_ref`は参照先の値ではなくcontext key／step ID自体をConnectorへ渡すreference-only parameterである。一方、通常fieldの`{{step1.field}}`は値展開または文字列templateであり、同じbrace表記をreference-only parameterへ使用するとGUI、Validation、Runtime、Connectorの意味が一致しない。

現行`.zizd`は`schema_version`とmigration frameworkを持たない。Project ownerはRuntimeへ旧形式の永続的な互換処理を追加せず、現行schemaだけを扱う方針を決定した。

## Decision

- reference-only parameterのCanonical形式はbraceなしのcontext key／step ID（例: `step2`）だけとする。
- `{{step2}}`、`${step2}`、`{step2}`等のwrapper形式をValidationとRuntimeで拒否し、実行時の互換変換を行わない。
- `{{step1.field}}`等の通常templateはreference-only parameterと別の表現として維持する。
- GUIのreference-only選択／SuggestはCanonical形式を保存する。
- 保存済みflowをTASK-033で自動変換しない。
- `.zizd`の`schema_version`とmigration frameworkは別Taskで設計する。migrationを実装する場合はreference-only parameterだけを対象とし、通常templateを変換しない。

## Verification

- 全reference-only parameterでCanonical形式を受理し、wrapper形式とnested形式を拒否するRuntime Testを行う。
- GUIの候補、保存値、ValidationがCanonical形式と一致することをTestする。
- 通常templateの`{{step1.field}}`が引き続き解決されることをTestする。
- Windows loopとSelenium `source_step_id`／`value_ref`がCanonical形式でConnector境界へ到達することをTestする。

## Consequences

- 旧wrapper形式を持つ保存済みflowは、そのままでは実行保証しない。
- RuntimeとConnectorは現行schemaの単一表現だけを扱い、reference-only parameterと通常templateの責務を分離できる。
- 旧flowを安全に移行するには、将来のschema versioningとreference-only parameter限定のmigrationが必要になる。
