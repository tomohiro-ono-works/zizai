# ADR Web Allowlist Canonicalization

- Status: Accepted
- Date: 2026-09-15
- Decision owner: Project owner
- Applies to: TASK-034 Subtask A

## Context

Web allowlistはURLのhostと`path_prefixes`を別々に判定するが、Source設定の`note.com/`は末尾slashを含むためhostname `note.com`と一致しない。現行実装はlowercase以外のdomain validationを行わず、wildcard、IDN、localhost、IP、port、重複entryのContractも未定義である。

## Decision

- allowlistは通常のdomain／hostを管理する。http／https URL形式も入力として受理するが、Canonical形式にはhostだけを保存する。
- lowercase、末尾slash／DNS root dot除去、IDNからASCII punycodeへの変換を行う。scheme、path、query、fragmentは保存しない。
- userinfo、明示port、`localhost`、単一label host、IPv4、IPv6、不正なDNS labelは拒否する。localhost／IP許可が必要になった場合は別Security Policyで設計する。
- bare domainはexact hostだけを許可する。`*.example.com`はexactに1階層下のsubdomainだけを許可し、apexと多階層subdomainは許可しない。
- target URLのportは現行どおり判定要素に含めず、port単位allowlistは導入しない。`path_prefixes`によるpath前方一致の判定責務は変更しない。
- `path_prefixes`を省略した場合は、現行どおり既定の`["/"]`を維持する。省略と明示的な`path_prefixes: null`は区別する。
- `path_prefixes`が明示されていて、listでない、空list、null、非文字列要素を含む、空文字列要素を含む、のいずれかに該当する場合は、当該allowlist entry全体をinvalidとして除外する。明示されたmalformedな`path_prefixes`は、許可範囲を広げるため`["/"]`へfallbackさせない。
- Canonical domainが重複するentryは1件へ統合し、`path_prefixes`を重複排除する。
- invalid entryはそのentryだけを除外し、valid entryは維持する。除外は許可を追加しないためfail-openとして扱わない。warningにはentry indexと非機密な理由を、statusにはinvalid entry件数だけを残す。
- CanonicalizationとValidationはPython Coreの単一関数へ集約し、Source読込と将来のSettings保存処理で共用する。

## Consequences

- `note.com/`、`https://NOTE.COM/path?a=1#x`、IDN表記等は同じCanonical hostとして扱える。
- exact entryからsubdomainへ暗黙に許可は広がらない。wildcardの範囲は1階層に限定される。
- invalid entryが他のvalid entryを無効化しない一方、invalid entry自身が許可判定に使われることはない。
- `path_prefixes`の表記誤りが、当該domain配下の全pathへ暗黙に許可を広げることはない。
- Security Settings UI、Runtime/User stateへの保存、default allowlistとのmerge、更新用Bridge CommandはSubtask Bの別Decisionとして残る。

## Verification

- Canonicalizationの入力表記、拒否境界、重複統合、invalid entry statusをUnit Testで固定する。
- exact／wildcard／pathの許可と拒否を公開判定関数で確認する。
- Chrome、Selenium、Bridgeの既存判定経路とRisk Gateを回帰する。
