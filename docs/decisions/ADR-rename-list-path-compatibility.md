# ADR Rename List Path Compatibility

- Status: Accepted
- Date: 2026-08-24
- Decision owner: Project owner
- Applies to: TASK-010

## Context

現行Frontendの新規node既定値とRepository管理Templateには`rename_list_path: config\rename.csv`が保存される。現行Connectorはこの値をprocess working directory基準の相対pathとして開くため、`rename.csv`を`apps/common/config/`へ移すと旧参照は解決できない。

Project ownerは、既存`.zizd`に保存された旧`rename_list_path`値との後方互換を不要と判断した。

## Decision

- `config\rename.csv`から新しいSource config pathへのfallback、読み替え、aliasを実装しない。
- root `config/`へ`rename.csv`の互換copyまたはredirectを残さない。
- 利用者が保存した既存`.zizd`を自動変換・書き換えしない。
- 旧`config\rename.csv`を持つ`.zizd`は、移行後に通常のfile-not-foundとして失敗してよい。
- 新規nodeの既定値とRepository管理Templateは、TASK-010実装時に`apps\common\config\rename.csv`へ更新する。
- 利用者が明示指定した別CSVの絶対path／相対pathは、旧既定値互換とは分けて既存のfile指定として扱う。

## Verification

- 新しい`apps\common\config\rename.csv`参照でmappingを読み込めることをTestする。
- 旧`config\rename.csv`が新Source pathへ暗黙fallbackしないことをTestする。
- Repository管理Templateと新規node既定値に旧参照が残っていないことをStatic Testする。
- 利用者保存済み`.zizd`をMigration処理が書き換えないことを確認する。

## Consequences

- Source設定は`apps/common/config/`へ単一配置でき、root `config/`はRuntime/User state専用になる。
- 互換Resolverと重複fileを追加しないため、実装と将来cleanupが単純になる。
- 旧参照を持つ利用者保存済み`.zizd`は、そのままでは実行できない。利用者が新しいCSV pathを選び直す必要がある。
- `.zizd`の保存schema自体は変えず、旧既定path値の動作互換だけを明示的に終了する。
