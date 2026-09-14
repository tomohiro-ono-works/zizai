# TASK-034 Normalize Web Allowlist Domains and Define Security Policy Settings

## Status

Not Started — 推奨実装順序 3/7（Subtask A）と6/7（Subtask B）（TASK-032 → TASK-033 → TASK-034 Subtask A → TASK-036 → TASK-028 → TASK-034 Subtask B → TASK-035）。`note.com`が許可されない設定誤記を含む。

## Goal

Web allowlistのdomain表記を安全に正規化・検証し、誤記による許可漏れや、不正形式による意図しない許可を防ぐ。あわせて、Security PolicyをGUIから変更する場合の要件とSecurity境界を定義し、承認された範囲で設定UIを実装できる状態にする。

## Scope

- 誤記修正: `apps/common/config/security_policies.yml`の`domain: "note.com/"`。
- domain入力形式の要件定義。最低限、次を決める。
  - 受け付ける表記（hostnameのみか）
  - protocol（`https://`付き）を許すか
  - pathを許すか（既存の`path_prefixes`との責務分担）
  - trailing slashの正規化
  - 大文字小文字、IDN／punycode
  - wildcard（`*.example.com`等）の扱い
  - localhost／IP address（IPv4／IPv6）とportの扱い
  - 重複排除
- 読込側の正規化／拒否の設計。
  - 不正形式のentryを正規化するか、拒否するか。
  - 拒否時のlogと、非機密statusへの反映。
  - 判定不能な形式は許可しない（fail-closed）ことの確認。
- Validation規則。GUI入力時と読込時で同じ規則を使う設計にする。
- 保存先の設計。現行のSource設定（`apps/common/config/security_policies.yml`、tracked）とRuntime/User state（root `config/`）の境界を踏まえ、利用者が変更した内容の保存先を決める。
- default allowlistとの関係（利用者設定による追加／削除／上書き）。
- Runtimeへの反映タイミング。現状は判定ごとに設定fileを読む。実行中flowへの影響も確認する。
- 設定変更時のSecurity境界。
  - 変更できる主体と経路（QWebChannel Commandを追加する場合の検証）
  - Frontendへ返す情報（判定結果と非機密statusだけを返す原則）
  - 許可範囲を広げる変更の確認UI
  - 変更履歴／監査logの要否

## Subtasks

### Subtask A: 誤記修正と読込時の正規化・検証

- **Outcome:** `note.com`が意図どおり判定され、不正形式のentryが読込時に安全に正規化または拒否される。GUIの追加は行わない。
- **Acceptance Criteria:** domain表記の要件が決定され、正規化／拒否の規則がTestで固定されている。
- **Tests:** 表記ゆれ（protocol付き、path付き、trailing slash、大文字、wildcard、IP、localhost、重複）のunit Test。

### Subtask B: Security Policy設定UI

- **Outcome:** 承認された要件の範囲で、GUIからallowlistを確認・変更できる。
- **着手条件:** 保存先、default allowlistとの関係、Runtime反映タイミング、Security境界を含む要件を、Project ownerが承認していること。
- **Acceptance Criteria:** GUIからの変更がValidationを通り、承認された保存先に保存され、判定へ反映されることがTestで確認されている。

## Out of scope

- `apis.profiles`（API接続Profile、証明書）の設定UI化。
- 外部URL schemeの境界の変更（TASK-019で確立済み）。
- 内蔵WebViewへの外部Page埋め込み（ADRで不採用）。

## References

- Source設定: `apps/common/config/security_policies.yml`
- 判定: `apps/core/security_policies.py`。`load_security_policies`は判定ごとに設定fileを読む。`is_web_target_allowed`はhostnameとentryの`domain`の完全一致、`path_prefixes`の前方一致、scheme `http`／`https`で判定する。
- 利用箇所: `apps/connectors/chrome_connector.py`、`apps/connectors/selenium_connector.py`、`apps/desktop/bridge.py`（外部URLの判定）
- GUI: 診断表示（`security_policies_loaded`、`web_allowlist_count`）だけで、編集UIはない（`apps/gui/js/app.js`、`apps/gui/js/app.home.js`）。
- Current Specification: [Architecture](../../features/architecture.md)（外部URLはAllowlistで検証し、許可時だけOS browserへ委譲）、[Connector Contract](../../features/connectors.md)（Chrome／SeleniumのAllowlist検証）、[Frontend Libraries](../../features/frontend-libraries.md)（external URLはApplicationのscheme／allowlist policyを通す）
- Decision: [ADR Source, Runtime, and Workspace Boundary](../../decisions/ADR-source-runtime-workspace-boundary.md)（`security_policies.yml`はPython内部だけで読み、判定結果と非機密statusだけを返す）、[ADR-v23 Application Topology](../../decisions/ADR-v23-application-topology.md)
- 関連Task: [TASK-019](../done/TASK-019-enforce-external-url-scheme-boundary.md)（完了済み）

## Constraints

- Subtask Bの設定UIは、要件をProject ownerが承認してから実装する。自由入力欄を追加するだけの実装にしない。
- 正規化によって許可範囲が意図せず広がる変更をしない。
- Current Specification／ADRの変更が必要な場合は、変更案を示して承認を得る。
- 外部siteへの通信を伴う確認は、allowlistで許可された最小限の対象に限る。

## Acceptance Criteria

- domain表記の要件（protocol、path、trailing slash、大文字小文字、wildcard、localhost／IP、port、重複）が決定され、記録されている。
- Subtask Aの完了条件を満たしている（誤記修正、正規化／拒否規則とTest）。
- 保存先、default allowlistとの関係、Runtime反映タイミング、Security境界を含む設定UI要件が、Project ownerに承認されている。
- Subtask Bを実装した場合、その完了条件を満たしている。
- 変更後もChrome／Seleniumの許可判定と外部URL判定のTestが通過している。

## Evidence

2026-09-14の非BigQuery検証（一時scriptによる確認。scriptはrepositoryに含めていない）。

- `is_web_target_allowed()`の判定結果。
  - 許可（期待どおり）: `https://github.com/`、`https://zenn.dev/`、`https://fonts.google.com/icons`
  - 拒否（期待どおり）: `https://fonts.google.com/`（path不一致）、`https://example.com/`、`http://localhost/`、`file:///C:/Windows/`、`javascript:alert(1)`
- `https://note.com/`は拒否された。allowlistのentryが`domain: "note.com/"`であり、hostname `note.com`と完全一致しないため。
- SeleniumConnectorは、allowlist外のURLを指定するとbrowserを起動する前に拒否した。ChromeConnectorは、allowlist外のURLと`javascript:` URLを拒否した。
