# TASK-034 Normalize Web Allowlist Domains and Define Security Policy Settings

## Status

In Progress — Subtask Aは承認済みSecurity Contract（`path_prefixes` fail-closedを含む）どおり実装、Verification、Security Reviewを完了。Subtask Bは着手条件の残りを満たすまで未着手。

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
- **Status:** Completed（2026-09-15）。domain表記と`path_prefixes`表記の要件を承認済みSecurity Contract 2件として記録し、正規化／拒否の規則をUnit Testで固定した。Acceptance Criteriaを満たす。

#### Approved Security Contract — 2026-09-15

- `example.com`はexact hostだけを、`*.example.com`はexactに1階層下のsubdomainだけを許可する。apexと多階層subdomainへ暗黙に許可を広げない。
- URL形式はhttp／httpsだけを入力として受理し、hostをlowercase・末尾slash／DNS root dot除去・IDN punycode化したCanonical形式で扱う。scheme、path、query、fragmentはdomainへ保存しない。
- userinfo、明示port、`localhost`、単一label host、IPv4、IPv6、不正DNS labelは拒否する。target URLのport判定は変更せず、port単位allowlistは追加しない。
- Canonical domainが重複するentryは統合し、`path_prefixes`を重複排除する。不正entryだけを除外し、正常entryは利用する。除外件数を非機密statusへ、理由をwarningへ残す。
- Python CoreのcanonicalizerをSource読込と将来のUI保存で共用する。Subtask AではGUI、Runtime/User state、Bridge更新Commandを追加しない。

#### Approved Security Contract — `path_prefixes` fail-closed（2026-09-15追加）

- `path_prefixes`を省略した場合は、現行の既定`["/"]`を維持する。
- `path_prefixes`が明示されていて次のいずれかに該当する場合は、当該allowlist entry全体をinvalidとして除外する。listでない、空list、null、非文字列要素を含む、空文字列要素を含む。
- `path_prefixes`の省略と、明示的な`path_prefixes: null`を区別する。
- 明示されたmalformedな`path_prefixes`を`["/"]`へfallbackさせない。許可範囲を広げるため。
- invalid entryはinvalid件数へ計上し、entry内容を含まないwarningを出し、他のvalid entryを無効化しない。

#### Implementation Plan

- **End State:** Source設定と公開判定が同じCanonical host contractを使い、`note.com`、exact、1階層wildcard、invalid entry分離が確認できる。
- **Goal Traceability:** canonicalizer Unit Testで表記と拒否境界、policy load Testで重複／invalid status、公開判定Testでexact／wildcard／path、既存Risk GateでChrome／Selenium／Bridge経路を証明する。
- **Critical Path:** Specification／Decision更新 → RED Test → Core最小実装とSource誤記修正 → focused verification → canonical Gates → Security Review → 指摘の技術検証。
- **Independent Work:** なし。Security Contract、実装、Testを同じAgentが一貫して扱う。
- **Deferred Decisions:** Subtask Bの保存形式、defaultとのmerge、Runtime反映、Bridge Command、確認／監査UXはSubtask B着手前にProject ownerが決定する。

### Subtask B: Security Policy設定UI

- **Outcome:** 承認された要件の範囲で、GUIからallowlistを確認・変更できる。
- **着手条件:** 保存先、default allowlistとの関係、Runtime反映タイミング、Security境界を含む要件を、Project ownerが承認していること。
- **Acceptance Criteria:** GUIからの変更がValidationを通り、承認された保存先に保存され、判定へ反映されることがTestで確認されている。
- **Security Boundary:** Settingsから変更可能にするのはallowlist entryの追加・削除だけとする。localhost／private network、credential保護、危険操作防止、内蔵WebView分離等の固定Security Policyは編集対象にせず、allowlist操作で解除できない構造にする。

## Out of scope

- `apis.profiles`（API接続Profile、証明書）の設定UI化。
- 外部URL schemeの境界の変更（TASK-019で確立済み）。
- 内蔵WebViewへの外部Page埋め込み（ADRで不採用）。
- BigQuery Project／Datasetの参照presetとFrequently Used File Paths。Web Securityと保存責務が異なるため、General／Connector Settingsの別Task候補として扱う。

## References

- Source設定: `apps/common/config/security_policies.yml`
- 判定: `apps/core/security_policies.py`。`load_security_policies`は判定ごとに設定fileを読む。`is_web_target_allowed`はhostnameとentryの`domain`の完全一致、`path_prefixes`の前方一致、scheme `http`／`https`で判定する。
- 利用箇所: `apps/connectors/chrome_connector.py`、`apps/connectors/selenium_connector.py`、`apps/desktop/bridge.py`（外部URLの判定）
- GUI: 診断表示（`security_policies_loaded`、`web_allowlist_count`）だけで、編集UIはない（`apps/gui/js/app.js`、`apps/gui/js/app.home.js`）。
- Current Specification: [Architecture](../../features/architecture.md)（外部URLはAllowlistで検証し、許可時だけOS browserへ委譲）、[Connector Contract](../../features/connectors.md)（Chrome／SeleniumのAllowlist検証）、[Frontend Libraries](../../features/frontend-libraries.md)（external URLはApplicationのscheme／allowlist policyを通す）
- Decision: [ADR Source, Runtime, and Workspace Boundary](../../decisions/ADR-source-runtime-workspace-boundary.md)（`security_policies.yml`はPython内部だけで読み、判定結果と非機密statusだけを返す）、[ADR-v23 Application Topology](../../decisions/ADR-v23-application-topology.md)
- Decision: [ADR Web Allowlist Canonicalization](../../decisions/ADR-web-allowlist-canonicalization.md)
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

2026-09-15のSubtask A実装とVerification。

- Source誤記を修正した（`domain: "note.com/"` → `note.com`）。Canonicalizationは`apps/core/security_policies.py`の`canonicalize_web_allowlist_domain()`へ集約し、Source読込（`_normalize_allowlist()`）と公開判定（`is_web_target_allowed()`）で共用する。`app.getStatus`へは非機密な`web_allowlist_invalid_entry_count`だけを追加し、entry内容は返さない。
- `path_prefixes` fail-closedをTDDで追加した。`_normalize_path_prefixes()`は省略時だけ`["/"]`を返し、明示時のlist以外／空list／null／非文字列要素／空文字列要素は`ValueError`として当該entryを除外する。検証はCanonical domainの重複解決より前に行う。
- RED: 新規contract test 10件のうち9件が失敗（`9 failed, 27 passed`）。省略時の既定`["/"]`を固定する1件は現行挙動どおり成功した。
- GREEN: 実装後に`tests/unit/test_security_policies.py`、`tests/unit/test_bridge_contract.py`で`56 passed`。
- Canonical Gate: `static-analysis` `134 passed`、`unit` `184 passed`、`integration` `50 passed`、`required` `Required Gates passed`。いずれもexit `0`。
- Risk Gate: `RISK-CONFIG-001`、`RISK-EXT-001`、`RISK-BRIDGE-001`、`RISK-WEB-001`、`RISK-WEB-002`、`RISK-CONN-001`、`RISK-CONN-002`がいずれもexit `0`。marker合算で`162 passed, 218 deselected`。
- Chrome／Selenium／Bridge経路: `test_selenium_connector_contract.py`、`test_bridge_contract.py`、`test_connector_discovery.py`、`test_qwebchannel_signal_contract.py`、`test_task010_bridge_config_contract.py`で`54 passed`。
- Suite回帰: `tests/unit tests/static tests/integration`で`364 passed`。
- `git diff --check`はexit `0`で、whitespace errorはない。
- Canonical Gate runnerはpytest既定Tempのまま完走した。focusedとsuiteの直接実行だけ、既知のTemp ACL不整合を避けてignoredな`.tmp/task034-subtaskA-20260915-*`を`--basetemp`に使用した。ACLと所有権は変更していない。Source変更でもない。
- Subtask AのAcceptance Criteria（domain表記の要件決定と、正規化／拒否規則のTest固定）を満たしたため、Subtask Aは完了とする。TASK-034全体はSubtask B未着手のためIn Progressを維持する。

## Security Review — Subtask A

Security reviewはSubtask Aを担当したClaude Code／Opusが実施する。独立した別reviewerは置かない。

- `path_prefixes`のfail-open（2026-09-15にProject ownerが承認、同日修正済み）: 修正前は`path_prefixes`がlistでない場合、空listの場合、要素が`None`／空文字の場合に`["/"]`へ既定化し、`invalid_entry_count`にもwarningにも現れなかった。`domain: example.com`に対し`path_prefixes: "/admin"`、`[]`、`[None]`のいずれでも`https://example.com/secret/page`が許可されることを一時probeで確認した（probeはrepositoryに含めていない）。表記誤りが許可範囲を狭めず広げるため、承認済みContractに沿ってentry全体を除外するfail-closedへ変更した。
- 重複domainとの相互作用: Canonical domainの重複解決より前にdomainと`path_prefixes`の両方を検証し、invalid entryは既存ruleの生成にも更新にも関与しない。valid entryより前後どちらに置かれても、valid ruleの`path_prefixes`は変化しない。Unit Testで両順序を固定した。
- fallback除去: valid化した`path_prefixes`は非空文字列だけとなるため、旧実装の`str(prefix or "/")`による値変換を廃止した。Source記載の値がそのまま保持され、暗黙の`/`置換は発生しない。
- warningの内容: warningはentry indexと非機密な理由だけを出力し、domainや`path_prefixes`の値を含まない。statusへ返すのはinvalid entry件数だけで、entry内容は返さない。
- 残存する既知の挙動: `path_prefixes`のpath判定は前方一致であり、`/allowed`は`/allowedevil`にも一致する。これは本Task以前からの仕様で、ADRでも判定責務を変更しないと定めている。境界一致へ変更する場合は別Decisionを要する。

## Remaining Work

- Subtask Aは実装、Verification、Security Reviewを完了した。承認済みSecurity Contractに対する未解決事項はない。
- Subtask BのRuntime/User state保存形式、default allowlistの追加／削除／上書き関係、Runtime反映タイミング、専用Bridge Command、確認UI、audit log要否を設計し、Project owner承認後に実装する。
- 別Task候補: BigQuery ProjectとProjectに関連付けたDatasetの参照presetを、credential／service account key／tokenを保存せずGeneral／Connector Settingsとして管理する。
- 別Task候補: Frequently Used File PathsをSecurity allowlistと分離したRuntime/User stateとして管理し、将来のConnector file／folder選択候補へ提供する。
