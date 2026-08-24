# Frontend Library Integration Contract

- Status: Current Specification
- Decision: `docs/decisions/ADR-frontend-library-vendoring.md`
- Implementation task: `docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`

## Purpose

既存Applicationの復興と物理移動を完了した後、承認済みFrontend libraryへUI責務を段階移管するための共通契約を定義する。本仕様はlibraryを今すぐ導入する指示ではない。

## Approved libraries

次の8 libraryをすべて利用する。

1. `zizai-app-shell`
2. `zizai-catalog-panel`
3. `zizai-data-viewer`
4. `zizai-editor-markdown`
5. `zizai-form`
6. `zizai-highlighter-sql`
7. `zizai-sqlflow-designer`
8. `zizai-workflow-designer`

`zizai-sqlflow-designer`は、`zizai-workflow-designer`と`zizai-highlighter-sql`の導入契約が成立した後に導入する。

## Vendoring and version record

- GitHub、CDNその他のremote assetをApplicationから直接参照しない。
- library assetは`apps/gui/vendor/<library>/`へ同梱する。
- 初回導入時点における各repositoryの現行内容を使用する。実際に同梱した取得元URLとcommit identifierは`apps/gui/vendor/README.md`へ記録する。
- 同梱後の内容はApplication repositoryのGit履歴で追跡するため、別のfile hash台帳は作らない。
- 各libraryの`LICENSE`をlibrary directoryに保持し、追加の表示義務がある場合だけ`apps/gui/vendor/NOTICE.md`へ記録する。
- upstream更新は自動追従せず、必要になった時点で影響範囲と取得元revisionを確認して別途承認する。

## Ownership boundary

LibraryはUIの描画、UI内の一時状態、利用者操作のevent通知を担当する。Application Adapterは次を担当し、libraryから直接実行させない。

- QWebChannel Bridge通信
- Source／Runtime configの取得
- workflowやdocumentの保存・読込
- workflow実行と実行状態の反映
- Application内navigationとexternal URL policy
- OS window、dialog、clipboard等のnative操作

Applicationはlibraryごとの差をAdapter内へ閉じ込め、page codeから複数のlibrary global APIを直接横断しない。同じspaceの移管が検証を通過した時点で、Application側に残る同一UI責務を削除する。

## Space decision protocol

- 8 libraryの利用spaceを事前に一括決定しない。
- TASK-016の各移管Work Package開始直前に、Project ownerへ対象spaceと利用libraryを提示する。
- Project ownerの決定を該当Work Packageへ記録してから、そのspaceだけを変更する。
- repository名、sample、既存画面名からAgentが配置を推測しない。

## Theme, CSS, namespace, and lifecycle

- Applicationのcolor tokenを正本とし、library tokenはAdapterまたはlibrary側のaliasで接続する。
- library CSSは割り当てられたroot element配下へscopeし、Application全体へ無条件に適用するselectorを追加しない。
- libraryが公開するglobal namespaceはlibraryごとに一つとし、Applicationからは対応Adapterだけが参照する。
- mountごとに対応するunmount／destroyを持たせ、event listener、timer、observer、DOM参照を解放する。
- lifecycle、CSS scope、namespace、themeの不足は、そのlibraryを使用する移管Work Packageの開始条件として解消する。

## Workflow Document decision

Workflow Documentの管理主体を本Taskでは決めない。`zizai-workflow-designer`への移管Work Package直前に、同libraryの状態入出力APIだけを調査し、Project ownerが次のいずれかを決定する。

- JS Application stateを正本としてlibraryへ入出力する。
- library側のDocumentをFrontend正本とし、Application Adapterが保存・読込・実行形式へ接続する。

どちらの場合も正本は一つとし、JS Application stateとlibrary内部へ同じ永続データを二重管理しない。決定前にDocument変換や互換実装を開始しない。

## Security boundary

- libraryからremote script、stylesheet、iframe、Web Component、fontその他のremote assetを読み込まない。
- libraryへQWebChannel object、filesystem path、資格情報を直接渡さない。
- external URLは文字列eventとしてApplication Adapterへ渡し、Applicationのscheme／allowlist policyを通す。
- library導入を理由にBridge capabilityやfilesystem scopeを拡張しない。

## Integration and verification gates

各移管Work Packageは、対象spaceについて次を満たす。

- Project ownerによるspace決定が記録されている。
- local assetだけでoffline起動でき、取得元revisionとLICENSEが記録されている。
- Adapterのevent／payload、lifecycle、theme、CSS scope、namespaceが検証されている。
- Bridge、保存・読込・実行、external URL、native操作がApplication責務に残っている。
- libraryへ移管したUI責務と重複するApplication実装が削除され、回帰Testが通過している。

TASK-016でlibrary単位のUnit／Integration／E2Eを実行し、TASK-015で`RISK-BRIDGE-001`、`RISK-EXT-001`、`RISK-WEB-001/002`、`RISK-UI-001`、`RISK-CI-001`とTASK-016固有Testを最終回帰する。
