# Legacy UI Library Decision Handoff

- Source: 202606 UI baseline and JS library compatibility reports
- Migrated by: TASK-006
- Date: 2026-08-21
- Status: Historical Decision Context — not Current UI specification

## Preserved decisions

- 当時の方針では`zizai-app-shell`、`zizai-form`、`zizai-data-viewer`を使用し、既存Application側へ同一UI責務を重複実装しないとされた。
- Adapterはlibrary eventとQWebChannel、file保存、workflow実行、画面遷移、OS window controlを接続する境界とされた。
- `zizai-catalog-panel`の用途は未確定とされ、自動的にconnector catalogやworkspace explorerへ割り当てない判断だった。
- External/CDN assetを使わず、local固定版、network-zero、namespace/CSS scope、mount/unmount、Bridge/security testを導入Gateとする方針だった。

## Unresolved blockers at source time

- 調査対象8 repositoryは再利用・改変・再配布許諾が確認できず、配布判定は権利許諾待ちだった。
- Native Qt WebEngineの202606 visual baselineは未確認で、browser直接描画だけでは完全な正常基準とされなかった。
- 202606/202607 document schema、Qt/Chromium security patch、license/notice/hashのGateが未完だった。

## Current routing

- Current Frontend contractは[Embedded Frontend Contract](../features/frontend.md)とADRを正とする。
- 202607 WIPの復元/除外は[v23 Orphaned WIP Disposition](v23-orphan-wip-disposition.md)を正とする。
- 未整理asset/licenseはTASK-005、Frontend物理移行とsecurity GateはTASK-012の範囲で扱う。
- 本Handoffは過去Decisionを再承認する文書ではない。現在の導入・配布を許可せず、必要時にlicenseと現行実装を再確認する。
