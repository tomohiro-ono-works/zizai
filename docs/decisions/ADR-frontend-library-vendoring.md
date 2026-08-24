# ADR Frontend Library Vendoring

- Status: Accepted
- Date: 2026-08-24
- Decision owner: Project owner
- Applies to: TASK-016

## Context

承認済み8 Frontend libraryはProject owner所有のrepositoryにある。Desktop ApplicationはBridge到達可能なlocal `file://` UIを使用し、remote assetを読み込まないsecurity boundaryを持つ。

## Decision

- 8 libraryをApplicationへ同梱・利用することをProject ownerが許可する。
- GitHub上のassetをApplicationから直接参照しない。
- library assetは`apps/gui/vendor/<library>/`へ配置する。
- 初回導入時点における各repositoryの現行内容を使用する。
- 実際の取得元URLとcommit identifierは`apps/gui/vendor/README.md`、各license本文はlibrary directoryの`LICENSE`へ保持する。
- 将来のupstream更新は自動化せず、必要になった時点で別途判断する。

## Consequences

- Applicationはnetworkなしでlibrary assetを読み込める。
- 同梱内容はApplication repositoryのGit履歴、upstream由来はcommit identifierで追跡する。別のfile hash台帳は作らない。
- vendor snapshotの追加・更新はTASK-016で行い、TASK-018ではlibrary sourceを変更しない。
- libraryの利用spaceとWorkflow Document正本は本Decisionで固定しない。
