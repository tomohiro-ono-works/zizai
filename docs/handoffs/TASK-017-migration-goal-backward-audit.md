# TASK-017 Migration Goal Backward Audit

- Status: Investigation Handoff — not Current Specification
- Related task: [TASK-017](../tasks/done/TASK-017-audit-migration-goal-and-replan.md) WP-1
- Date: 2026-08-23
- Author: claude-assist（限定Edit権限）
- Verification: 静的読み取りのみ。Test/Gateは実行していない（本Sessionにshell実行手段なし）。

## 0. Evidence class legend

本Reportは根拠の種類を必ず区別する。混同はAGENTS.md:37とdocs/README.md:23の禁止事項である。

| 記号 | 種別 | 扱い |
|---|---|---|
| `[SPEC]` | Current Specification（`docs/features/`） | 正本 |
| `[ADR]` | Accepted Decision（`docs/decisions/`） | 正本。再検討しない |
| `[TASK]` | Task定義（`docs/tasks/`） | 作業契約。正本ではない |
| `[HO]` | Handoff（`docs/handoffs/`） | 調査Evidence。単独では正本にしない |
| `[CODE]` | 実コード | 実装事実の一次情報 |
| `[TEST]` | Test / CI / fixture | 検証事実の一次情報 |

矛盾時の優先順位は`[SPEC]`/`[ADR]`＋`[CODE]`/`[TEST]` > `[TASK]` > `[HO]`とする（docs/README.md:23、AGENTS.md:36-37）。

---

## 1. Final observable End State

「最終的に利用者が観測できる完成状態」を、正本と承認済みDecisionから逆算して次の7項目へ固定する。これは新規決定ではなく、既存の`[SPEC]`/`[ADR]`/承認済み要件の再記述である。

| ID | End State（観測可能な完成状態） | 根拠 |
|---|---|---|
| `E1` | Windowsローカルで`bin\ziz.bat` / `zizai.py`からDesktopが起動し、PySide6/QtWebEngineが同梱HTMLを`file://`で読み込み、QWebChannel `backendBridge`（Protocol `1.0`／31 Command／8 Event）で通信する。localhost APIと独立Deploy可能なWeb Applicationは存在しない | `[SPEC]` architecture.md:9-14、`[ADR]` :18-22、`[CODE]` zizai.py:4-10,61、app/gui/host.py:426-428、app/gui/bridge.py:282-290 |
| `E2` | Repository責務Treeが`apps/{desktop,cli,gui,core,connectors,common}`であり、`app/gui/`、`apps/web/`、`apps/api/`、root `static/`、root `core/`、root `connectors/`が存在せず、旧Pathへの有効参照が全区分で`0`である | `[SPEC]` architecture.md:49、`[ADR]` :27-38,108-110、`[TASK]` TASK-011:55、TASK-012:48 |
| `E3` | 承認済み8 Frontend library（`zizai-app-shell` / `catalog-panel` / `data-viewer` / `editor-markdown` / `form` / `highlighter-sql` / `sqlflow-designer` / `workflow-designer`）がexact SHA・hash・LICENSE付きでlocal同梱され、**Project ownerが決定したspace**で全件使用され、同一UI責務のApplication実装が残っていない | `[TASK]` TASK-016:27-34,38-41,88-101、`[HO]` TASK-010-frontend-library-integration-audit.md:10-16 |
| `E4` | Source設定が`apps/common/config`だけに存在し、Runtime/User stateは保存場所も内容も変わらない | `[SPEC]` architecture.md:28、`[TASK]` TASK-010:40-43、`[CODE]` core/flow_locator.py:12-13、app/gui/bridge.py:132 |
| `E5` | `.zizd` Data Contract、正式CLI互換（`bin/ziz.bat`・`zizai.py`）、Connector入口`execute(action, params, context)`、12 module/class pairが維持され、Workflow Documentの正本が1つである | `[SPEC]` data-contract.md:6-12、connectors.md:8、architecture.md:41-45、`[HO]` verification-contract.md:111-124、TASK-010-frontend-...:131 |
| `E6` | uv `0.12.5`／frozen lockのclean環境で12 Risk全件が`Passing`、または証跡付き`Blocked/Fail`として記録され、Windows CIの必須Gateが緑である | `[HO]` verification-contract.md:92-105,137、`[TEST]` run-verification.ps1:65-73、.github/workflows/migration-verification.yml:16-62 |
| `E7` | 8 library要件・space決定・配布許諾がCurrent SpecificationまたはDecisionに存在し、最終検証Evidenceが保存されている | `[TASK]` TASK-016:90,100,138-174、`[SPEC]` frontend.md（現時点で未記載＝Gap、§4.6参照） |

### 1.1 不変条件（全中間commitで成立させる acceptance invariant）

| ID | 不変条件 | 破れた場合の検出手段 |
|---|---|---|
| `INV-1` | 正式CLIが起動する。`python -m app.main`は公開互換対象にしない | `RISK-ENTRY-001` |
| `INV-2` | Bridge Protocol `1.0`のEnvelope・31 Command・8 Event・error code・相関IDを変更しない。payload schemaの**追加**のみ許容 | `RISK-BRIDGE-001`、`[ADR]`:55,60-63 |
| `INV-3` | `.zizd`保存schemaを暗黙変換しない。既存User dataを書き換え・削除しない | `[SPEC]` data-contract.md:12、`[TASK]` TASK-010:42 |
| `INV-4` | Connector 12 module/class pairがdynamic discoveryで一意解決する | `RISK-CONN-001` |
| `INV-5` | 外部Page／外部iframe／Web Component／CDN JavaScriptをBridge到達可能なContextへ入れない。同梱`dataflow.html`の内部iframeのみ例外 | `RISK-WEB-002`、`[SPEC]` frontend.md:31-33 |
| `INV-6` | localhost APIを新設しない。test専用static serverはPlaywright実行中のみ | `[ADR]`:18、`[SPEC]` frontend.md:38 |
| `INV-7` | Source設定とgenerated/local stateを同一ignore単位で扱わない | `[SPEC]` refactor-policy.md:38-42 |
| `INV-8` | 削除は5区分（Code/Runtime/Test/CI/active documentation）参照`0`の証明後にのみ行う | `[SPEC]` refactor-policy.md:20-28 |
| `INV-9` | LocalとCIは同じcanonical command（`tests/run-verification.ps1`）で判定する | `[HO]` verification-contract.md:54-71 |

---

## 2. TASK-001〜009 audit

### 2.1 判定サマリ

| Task | 成果 | 最終ゴールとの整合 | 判定 |
|---|---|---|---|
| TASK-001 Runtime Topology | ADR-v23確定 | E1/E2/E5と完全整合 | **再実施不要** |
| TASK-002 Docs/Harness Disposition | Disposition確定、Rules/Hooks不要 | 影響なし | **再実施不要** |
| TASK-003 Orphan WIP Disposition | PRESERVE_HISTORY/EXCLUDE/REMOVE_CANDIDATE確定 | E2の削除Gate入力として有効 | **再実施不要** |
| TASK-004 Verification Baseline | 12 Risk契約確定 | E3を判定するRiskが不在、担当割当に矛盾 | **文書・依存補正** |
| TASK-005 Unmapped Assets | 未実施（Tableau方針のみ） | E2/E4を阻害。成果物が存在しない | **部分修正（未完）** |
| TASK-006 Canonical Docs | `docs/`正本化完了 | 2箇所の正本記述が陳腐化 | **文書・依存補正** |
| TASK-007 Minimal Harness | Not Activated | 影響なし | **再実施不要** |
| TASK-008 Regression Baseline | runner/fixture/CI実装 | Gate設計の欠陥＋担当割当の矛盾 | **部分修正** |
| TASK-009 uv Toolchain | uv/`.venv`移行完了 | 整合。移動後の再実行が必要 | **再検証のみ** |

**全面再実施が必要なTaskは0件。** 過去9 Taskの主要成果は再利用可能である。

### 2.2 Evidence付き詳細

#### TASK-001 — 再実施不要

- 成果: `[ADR]` ADR-v23-application-topology.md（Status: Accepted, :3）。単一Desktop Runtime継続、Target Tree、Bridge互換期間、外部Web分離。
- 検証: 実コードと一致する。`[CODE]` zizai.py:4-10（`app.gui.host.run_webview_app`／`app.main.run_cli`分岐）、app/gui/host.py:110-118（`file`/`qrc`/`data`/`blob`/`about` scheme制御）、bridge.py:282-290（capabilities列挙）。
- 8 library要件との衝突なし: `[ADR]`:69は「CDN等の外部配信JavaScript」を禁止するが、8 libraryは**local同梱**であり`[HO]` TASK-010-frontend-...:12,171が「CDN/runtime downloadを行わない」と確認済み。よってE3はADRと両立する。
- 残る補足事項（再実施ではなく追記対象）: `[ADR]`:27-38のTarget Treeに、同梱library vendorの配置ノードが存在しない。→ Deferred Decision `D9`。

#### TASK-002 — 再実施不要

- 成果: `[HO]` v23-harness-docs-disposition.mdに基づく分類確定と、Rules/Hooks不要判断。`[TASK]` TASK-002:74-79。
- 最終ゴールへの影響なし。TASK-007のNot Activatedもここから追跡可能（TASK-007:36-37）。

#### TASK-003 — 再実施不要

- 成果: `[HO]` v23-orphan-wip-disposition.md（Status: Approved, :5）。202607 WIPの一括復元否定、`.pyc`削除承認、test 4 files/11 casesのINTEGRATE。
- 現状と整合: `[TEST]` tests/unit/test_dataintegration_connector.py、tests/unit/test_schema_apply_common.py、tests/integration/test_csv_connector.py、tests/integration/test_excel_connector.pyが実在し、TASK-008で移植済み（`[HO]` TASK-008-regression-baseline-design.md:85）。
- 注意（TASK-014へ引き継がれる未解決）: `[HO]` v23-orphan-wip-disposition.md:89は`tests/ui_analysis/ui_analysis.ps1`が実行不能であることを既知運用障害として残している。`[HO]` TASK-010-frontend-...:259が同じ障害を再確認している。TASK-005/013/014のどれが処理するか未確定。→ `D12`。

#### TASK-004 — 文書・依存補正

- 成果: `[HO]` v23-migration-verification-contract.md（Status: Approved, :6）。12 Risk、fixture、platform条件、command、機械判定基準、担当Taskを確定。
- 補正が必要な3点:
  1. **E3を判定するRiskが存在しない。** 12 Riskは`ENTRY/PATH/CONN/CONFIG/BRIDGE/FS/EXT/WEB/UI/CI`で、8 library同梱・pinned hash・重複UI 0・component lifecycle・external asset 0を機械判定するRiskがない（:92-105）。一方TASK-015は「12 Riskすべてを再実行」（:137）が完了条件である。このままではE3が最終Gateの対象外になる。
  2. **RISK-CONFIG-001の修正担当が矛盾。** 契約:98はRegressionを`TASK-010、TASK-012、TASK-015`、:134はTASK-012を「既知gapのallowlist適用」担当とする。一方`[TASK]` TASK-008:111は「TASK-012でallowlist適用後にRISK-CONFIG-001を12 passedへ」、`[TASK]` TASK-010:85は「CONFIGの既知Failは本Taskで解消する要件」と記す。→ `D3`。
  3. **`config_root`が単一keyであり、Source/Runtime分離を表現できない。** `[TEST]` tests/fixtures/contracts/repository-layout.json:4。E4は同一directory内でSourceとRuntime stateを分ける（`[SPEC]` architecture.md:28）ため、`source_config_root`と`runtime_state_root`の2値が必要になる。
- 12 Risk本体の再定義は不要。上記は追記・割当修正で足りる。

#### TASK-005 — 部分修正（成果物未作成）

- 現状: Status `Ready for Investigation`（`[TASK]` TASK-005:5）。`Completed`は「Tableauは既定ブラウザ、`tableau-mcp/`は削除方針」のみ（:72）。
- Expected change areaの`docs/handoffs/v23-unmapped-assets-disposition.md`は**存在しない**（`docs/handoffs/`の実ファイル一覧で不在を確認）。
- 影響: TASK-013（:28）、TASK-014（:28）、TASK-015（:28）がTASK-005に依存する。番号帯は001〜009だが、実体は未着手のCritical Path項目である。
- 追加で判明した対象: `[CODE]` template/BigQueryの抽出結果をExcelに出力する.zizd:117,128,139、template/ExcelからBigQueryテーブルを作る.zizd:30が`rename_list_path: config\rename.csv`を保持する。`template/`のDispositionはTASK-010のconfig MOVEと直結する（§4.2 `F-2`）。

#### TASK-006 — 文書・依存補正

- 成果: `docs/`正本化完了。`[TASK]` TASK-006:83-87、`[HO]` v23-canonical-docs-migration.md。
- 補正が必要な2点:
  1. `[SPEC]` refactor-policy.md:54「Migration中はTASK-009〜014の範囲とVerification Contractを優先する」。TASK-015/TASK-016が追加された現在、この範囲記述は陳腐化している。
  2. `[SPEC]` frontend.md:43-45「Approved target」はTASK-012の物理移動だけを記す。8 library要件（E3/E7）はCurrent Specificationに存在せず、`[HO]` TASK-010-frontend-...:28自身が「実装前にCurrent Specificationへ昇格する必要がある」と記録している。AGENTS.md:37によりHandoffのみでは正本にならない。
- どちらも小さな追記であり、TASK-006の再実施ではなくTASK-016 WP-1の範囲で解消するのが最小である。

#### TASK-007 — 再実施不要

- Not Activated。`.codex/rules/`・`.codex/hooks.json`は不在。後続Taskはいずれも非依存（TASK-008:30、TASK-009:29、TASK-010:28）。

#### TASK-008 — 部分修正

- 成果（再利用可能）: canonical runner、12 Risk marker、deterministic fixture、tracked-source manifest、Windows CI、manual UI validator。`[TEST]` run-verification.ps1、pytest.ini:3-17、tests/fixtures/、.github/workflows/migration-verification.yml。
- **欠陥1（機能的・要修正）: symlink capabilityが`unit` Gate全体をBlockする。**
  `[TEST]` run-verification.ps1:188-190は`-Gate unit`全体を、:213-215は`required`内のunit stepを、symlink probe失敗でexit `2`にする。`[TASK]` TASK-008:104はローカルで実際にこの状態（`required`もunit開始時にexit `2`）を記録している。
  結果: RISK-FS-001の実環境実行がTASK-015へ延期されている間（契約:139）、TASK-010〜014のどれもローカルで`unit`/`required`の緑を取得できない。これは§4.4 `F-8`で述べる順序反転の直接原因である。
- **欠陥2（文書・割当）: RISK-CONFIG-001の修正担当がTASK-010とTASK-012で二重記載**（TASK-008:111 vs TASK-010:85）。
- 設計上の一時要素: `[TEST]` run-verification.ps1:34,179-181がRISK-EXT-001／RISK-WEB-002を`"Blocked until TASK-012"`とhard-codeしている。恒久artifactにTask番号が埋め込まれており、TASK-012で必ず書き換えが必要（計画済みではあるが、§4.1 `F-4`として記録する）。
- 既知Fail/Blockedの扱い自体は正しい。`[HO]` TASK-008-regression-baseline-design.md:141-143、verification-contract.md:141-143。

#### TASK-009 — 再検証のみ

- 成果: `pyproject.toml`（:5 `>=3.11,<3.12`、:6-94 production 87件、:96-121 dev 23件、:123-124 `package = false`）、`uv.lock`、`.python-version`、launcher（bin/ziz.bat:4,12、bin/ziz.sh:7,15）、CI（migration-verification.yml:23-27）。
- E1〜E7と衝突なし。requirements／refresh scriptは削除済み、既存`.env/`は非破壊（TASK-009:95,103）。
- 必要な再検証: `[HO]` verification-contract.md:131が割り当てるとおり、Path移動を伴うTASK-010〜013の各完了時に`RISK-ENTRY-001`／`RISK-PATH-001`／`RISK-CI-001`を再実行する。
- 補足リスク（再実施不要・記録のみ）: `[TEST]` run-verification.ps1:69-73がuvを`0.12.5`完全一致で要求する。toolchainを更新すると全Gateがexit `2`になる。将来の更新時は同fileの更新を同一Outcomeへ含める必要がある。

---

## 3. Backward-derived dependency graph and Critical Path

### 3.1 逆算の起点

E1〜E7から逆に辿ると、最終Gate（TASK-015）が成立するために**直前に必要な状態**は次の3つである。

1. Repository Treeが最終形（E2）で、削除対象が全て除去済み（TASK-014完了）。
2. 8 libraryが承認spaceで稼働し重複UIが0（E3、TASK-016完了）。
3. E3を機械判定できるRisk/Gateが契約に存在する（TASK-004補正、TASK-016 WP-1）。

### 3.2 Dependency graph

```text
[並行・前提決定]                       [直列 Critical Path]
D4 symlink方針 ─────────┐
D1 config scope決定 ────┤
D2 .zizd rename_list 決定┤
D3 CONFIG-001担当決定 ───┴──▶ TASK-010 (Source config分離)
                                    │
                                    ▼
                              TASK-011 (Python責務移動)
                                    │
D5 dead asset削除承認 ──────────────┤
                                    ▼
                              TASK-012a (static/ → apps/gui/ 挙動維持移動)
                                    │
TASK-016 WP-1 (正本化) ─────────────┤
D8 配布許諾 / D9 vendor配置 ────────┤
D11 upstream修正SHA ────────────────┤
                                    ▼
                              TASK-016 WP-2 (pinned source + 導入Gate)
                                    │
                    ┌───────┬───────┼───────┬───────┬───────┐
                    ▼       ▼       ▼       ▼       ▼       ▼
                  WP-3    WP-4    WP-6    WP-7    WP-10   (D6: 各spaceのowner決定)
                          │                                   D7 Document決定
                          ▼                                   │
                        WP-5                                  ▼
                          │                                 WP-8
                          └───────────────┬──────────────────┘
                                          ▼
                                        WP-9
                                          ▼
                                        WP-11
                                          │
TASK-005 (未完調査) ──▶ TASK-013 ─────────┤
TASK-012b (EXT/WEB-002 security fix) ─────┤
                                          ▼
                                    TASK-014 (承認済み削除)
                                          ▼
                                    TASK-015 (最終検証 / RISK-FS-001実機)
```

### 3.3 Critical Path（最長直列）

```
D1–D4解決 → TASK-010 → TASK-011 → TASK-012a → TASK-016 WP-2
          → WP-4 → WP-8 → WP-9 → WP-11 → TASK-014 → TASK-015
```

- WP-9は`[HO]` TASK-010-frontend-...:13,40の依存（SQLFlow → WorkflowDesigner + SQL Highlighter）により、WP-4とWP-8の**両方**の後に置かれる（`[TASK]` TASK-016:449-450）。
- WP-11は全WP完了が条件（TASK-016:522-523）。
- 最長経路上の外部要因は`D11`（upstream repository修正と新SHA）である。他repositoryの作業であり本Worktreeから変更できない（TASK-016:61）。**リードタイムが読めないため最優先で着手すべき唯一の外部項目**である。

### 3.4 must-precede / 並行可能 / 推奨順序の分離

| 区分 | 対象 | 根拠 |
|---|---|---|
| **must precede（技術的必然）** | TASK-005 → TASK-013 | Dispositionなしに適用不可（TASK-013:28,86） |
| | TASK-012a → TASK-016 WP-3〜WP-10 | apps/gui未確定のまま統合すると二重移行（`[HO]` TASK-010-frontend-...:205-206） |
| | TASK-016 WP-2 → WP-3〜WP-10 | pinned source/hash/licenseがなければ導入不可（TASK-016:184-185） |
| | WP-4 → WP-9、WP-8 → WP-9 | library間の必須依存（`[HO]` :13,40） |
| | D7 → WP-8 | 二重Document正本の禁止（`[HO]` :136-145） |
| | TASK-016 → TASK-014（frontend削除集合） | 削除対象が重複（§4.3 `F-6`） |
| | 全Task → TASK-015 | 最終判定（TASK-015:28,71） |
| | D1 → TASK-010 | Bridge scope未決ではconfig MOVEが実行不能（§4.2 `F-1`） |
| **並行可能** | TASK-005 | Dependencies: None（TASK-005:26-28）。現在Critical Pathを不必要に伸ばしている |
| | TASK-016 WP-1 | 文書・Decisionのみ。TASK-010/012の完了を技術的に必要としない（§4.5 `F-9`） |
| | TASK-012b（RISK-EXT-001／RISK-WEB-002修正） | 対象は`bridge.py:481-486`と`host.py:110-118`で、Path移動と独立 |
| | D11 upstream修正 | 別repository |
| | D6 space決定 | 各WP直前にJust-in-timeで実施（TASK-016:38-41）。**事前一括決定しない** |
| **推奨順序（利便性のみ、必然ではない）** | TASK-010 → TASK-011 | 逆順でも成立する。§4.1 `F-3`で往復編集のコストを比較 |
| | TASK-011 → TASK-012a | 逆順でもHost path定数の編集回数は同じ |
| | TASK-013 → TASK-014 | 併合も可能 |

---

## 4. 明示的な異常検査

指示された5観点を、検出/非検出を明記して報告する。

### 4.1 一時Architecture（temporary architecture）— 4件検出

**`F-3` Path解決定数の二重書き換え（中）**
`[CODE]` core/security_policies.py:9,14（`BASE_DIR = parents[1]` → `root / "config"`）、core/flow_locator.py:9-13、app/gui/bridge.py:132は、いずれも「自module位置からrepository rootを逆算し、そこから`config`を辿る」構造である。
- TASK-010でconfig先を`apps/common/config`へ変更 → 同定数を編集。
- TASK-011で`core/`→`apps/core/`へ移動 → module深さが変わり`parents[1]`が無効になるため**同定数を再編集**。
順序を逆（TASK-011 → TASK-010）にすると、この編集は1回で済む。ただしTASK-011中は`config/`がroot、`apps/core/`が新Pathという別の混在状態が生じる。どちらも一時状態だが、往復編集の総量は逆順の方が少ない。→ 提案`C-6`。

**`F-4` 恒久artifactへのTask番号hard-code（低）**
`[TEST]` run-verification.ps1:34,179-181が`$deferredRisks`と`"Blocked until TASK-012."`を持つ。Task graphが変われば必ず書き換えが要る一時構造である。Gate責務としては「未実装Riskをexit `2`にする」だけで足り、Task番号はTaskまたは契約側で管理するのが正しい。

**`F-5` `file://`で機能しないlegacy fetch fallback（低）**
`[CODE]` static/js/code.editor.js:131-137が`/config/suggest_index/...`、`/static/config/...`、`./config/...`へ`fetch()`する。`file://`スキームでは`/config/...`はdrive rootへ解決され成功しない。実際のsuggest取得はBridge `app.getSuggestIndex`（`[CODE]` bridge.py:196-197,324-332）が担う。
これは「移行すべき参照」ではなく「除去すべき旧参照」である。TASK-010のAcceptance「旧Source config pathの有効参照0」（TASK-010:51）はこの3行を対象に含めるべきである。

**`F-12` 中間Treeのhybrid状態（低・許容）**
TASK-010完了時点で`apps/common/config/`と`app/`・`core/`・`connectors/`・`static/`が併存する。これは段階移行の必然であり、`[SPEC]` architecture.md:49も「TASK-011/012完了前にCurrent Pathとして記述しない」と明示している。**問題ではないが、`[TEST]` repository-layout.jsonが中間状態ごとに更新される**点は`F-7`で扱う。

### 4.2 Move-then-replace（移動してから置換する無駄）— 3件検出

**`F-6` 承認済みdead assetを移動してから削除する（中）**
`[HO]` v23-migration-map.md:71-72は`static/js/ui.node.js`（grep全域0件）と`static/styles.css`（未参照legacy集約）をREMOVE_CANDIDATEとする。`[TASK]` TASK-014:21が削除担当である。
現行順序では、TASK-012がこの2 fileを`apps/gui/`へ移動し、TASK-014が新Pathで削除する。移動→削除は純粋な無駄であり、両Taskの「参照0」Gateを二重に走らせる。両fileは`[CODE]` static/内に実在する。
- 制約: refactor-policy.md:16「判断が曖昧な対象は削除候補へ倒さない」、migration-map上のConfidenceは`Medium（要確認）`。よって**Project ownerの削除承認が前提**である。→ `D5`。

**`F-2` `.zizd`に保存された相対config pathの破壊（高）**
`[CODE]` template/*.zizd（4箇所）が`rename_list_path: config\rename.csv`を保持し、`[CODE]` connectors/dataintegration_connector.py:199-202が`os.path.abspath()`で**CWD相対**に解決する。`[CODE]` bin/ziz.bat:3・bin/ziz.sh:5がrepository rootへ`cd`するため、実効解決先は`<repo>/config/rename.csv`である。
`config/rename.csv`を`apps/common/config/`へ移すと、既存`.zizd`（template配布分およびUser保存分）が実行時に`RENAME リストファイルが見つかりません`で失敗する。
`[SPEC]` data-contract.md:12「Repository移行で保存schemaを暗黙変換しない」と`[TASK]` TASK-010:42「既存ユーザーデータは変わらない」の両方に抵触するため、**TASK-010着手前に方針決定が必要**。→ `D2`。
なお`[CODE]` static/config/config.js:365も`default:"config\\rename.csv"`を持つ（こちらは新規node作成時の既定値であり、更新はTASK-010の範囲内）。

**`F-13` `template/`の二重移動リスク（低）**
`template/`のDispositionはTASK-005未完のため未定（`[TASK]` TASK-005:81）。TASK-013が`template/`を移動する場合、`F-2`で調整した`.zizd`内Pathを再度調整することになる。TASK-005をTASK-010より前または並行に進めれば回避できる。

### 4.3 重複移行・重複Test（duplicate migration / testing）— 4件検出

**`F-7` `repository-layout.json`の4回更新と`RISK-PATH-001`の反復（中・一部不可避）**
`[TEST]` tests/fixtures/contracts/repository-layout.json:4,7,17-27を、TASK-010（config_root）、TASK-011（entrypoints／required_files／module path）、TASK-012（gui_root／web_entries）、TASK-013（移動scriptがある場合）が順に書き換える。契約:132-135が明示的にそう割り当てている。
段階移行の必然だが、`[TEST]` tests/unit/test_repository_layout.py:29,32、tests/integration/test_repository_layout_process.py:29,51、tests/static/test_entrypoint_contract.py:13-25、tests/static/test_frontend_asset_contract.py:12がそれぞれ独自にPath定数を持つため、更新漏れの面が広い。単一のlayout contractから全testが導出される形へ寄せると更新点が1つになる。

**`F-8` Playwright 3 specの三重作業（中）**
`[TEST]` tests/playwright/specs/ui-shell.spec.js、detail-panel-left-gap.spec.js、ui-fields-reference-warning.spec.jsは、
1. TASK-008で現行DOM向けに再作成（`[HO]` TASK-008-regression-baseline-design.md:87）、
2. TASK-012で`apps/gui/`のPath/static server rootへ追随、
3. TASK-016 WP-3/WP-6でAppShellおよびNodeFormがDOMを置換するため**再作成**（`[TASK]` TASK-016:252,358）。
2は不可避、3は本質的。ただし「TASK-012時点でDOM selectorへ深く依存したassertionを増やさない」方針を明示すれば、3の手戻り量を抑えられる。

**`F-9` RISK-CONFIG-001修正の二重/不履行リスク（高）**
§2.2 TASK-004／TASK-008参照。2 Taskが同じ修正を担当と読める記述を持つ。実装対象は`[CODE]` core/security_policies.py:96-108であり、`urlparse`のscheme検査がないため`ftp://example.com/allowed/`が`True`を返す。契約:98の合格基準「non-http(s)は`false`」を満たさない。
この修正は`[CODE]` connectors/chrome_connector.py:10とconnectors/selenium_connector.py:11の許可判定にも波及するApplication behavior変更であり、「MOVEのみ」のTASK-010へ暗黙に混ぜるべきではない（`[SPEC]` refactor-policy.md:31-33）。→ `D3`／提案`C-2`。

**`F-10` 削除Gateの二重実行（中）**
TASK-014のAcceptance（:36-51）とTASK-016 WP-3〜WP-11のAcceptance（例:246「重複shell/tab描画が0」、278、398、439）が、いずれも`apps/gui/`配下で5区分参照`0`を証明する。削除集合が重なるうえ、TASK-014のDependencies（:28）はTASK-016を名指ししていない。→ 提案`C-5`。

### 4.4 循環依存 — 形式的な循環は0件、実質的な相互待ちが2件

**`F-11` 形式的循環: 検出されず。**
TASK-005/008→009/010→011→012→013→014→015、TASK-016（008,010,012依存）→014/015のGraphに閉路はない。

**`F-1` 実質的な相互待ち①: `unit` Gateと`RISK-FS-001`（高）**
- `[TEST]` run-verification.ps1:188-190,213-215により、symlink capabilityがないと`unit`と`required`はexit `2`。
- `[HO]` verification-contract.md:100,139と`[TASK]` TASK-008:105により、symlinkを要する実環境実行は**TASK-015（最終Task）まで延期**。
- 一方、TASK-010:51、TASK-011:61、TASK-012:54、TASK-013:44、TASK-014:56はいずれも`unit`を含むGate PASSをAcceptanceに持つ。
つまり「TASK-010〜014の完了条件」が「TASK-015で行う作業」に依存している。順序としての反転であり、放置するとTASK-010の完了判定が最初から不可能になる。→ `D4`／提案`C-1`。
（補足: `[TEST]` .github/workflows/migration-verification.yml:32-46のCI unit jobは`windows-latest`で実行され、symlink probeを通過する可能性が高い。しかしLocal Gateが緑にならない以上、`[HO]` verification-contract.md:14の「LocalとCIは同じcommand」という契約が実質破れる。）

**`F-6b` 実質的な相互待ち②: TASK-014とTASK-016の削除集合（中）**
TASK-014は「全Migration Task完了後」（:69-71）、TASK-016 WP-11は「全WP完了後の最終Acceptance」（:522）。両者が`apps/gui/`の重複UI削除の完了を互いの前提として読めるため、担当を明記しないと着手待ちが発生する。→ 提案`C-5`。

### 4.5 必要な製品作業より前に置かれた最終検証 — 2件検出、1件は既に是正済み

**`F-14` TASK-015とTASK-016の順序: 既に是正済み（対応不要）**
`[TASK]` TASK-015:5,28,91はTASK-016を依存に含む（Project ownerのlocal変更で反映済み）。`[TASK]` TASK-016:71も同旨。逆転はない。

**`F-15` TASK-014（破壊的削除）がTASK-016より前に走り得る（中）**
TASK-014:5のStatusは`Blocked — TASK-005, TASK-008～013`で、TASK-016を含まない。:28の「Investigationから追加された全Migration Task」が唯一の間接的な包含である。最大のUI変更（TASK-016）より前に不可逆な削除Gateが走ると、TASK-016で再検討したい資産を失う。→ 提案`C-5`。

**`F-16` TASK-012が「移動」と「security修正」を同一Rollback単位に混在（中）**
`[TASK]` TASK-012:62はRollback `Yes`（単独で戻せる）とする一方、:46,49は`RISK-EXT-001`／`RISK-WEB-002`のPASSをAcceptanceに含む。これらは`[CODE]` bridge.py:481-486（allowlist未適用）とhost.py:110-118（`data`/`blob` scheme許可）を実際に直すsecurity修正であり、**Rollbackしてはならない変更**である。移動をRollbackするとsecurity修正も戻る構造になっている。→ 提案`C-3`。

### 4.6 追加検出: E3が正本に存在しない（高）

`[SPEC]` frontend.md全体に8 library要件の記載がない（:43-45はTASK-012の物理移動のみ）。E3/E7の根拠は`[TASK]` TASK-016と`[HO]` TASK-010-frontend-...だけである。AGENTS.md:37とdocs/README.md:23により、Handoffは単独で正本にならない。
`[HO]` legacy-ui-library-decisions.md:6,10-13はHistorical Contextであり、しかも3 libraryしか挙げていない（現要件は8件）。:26は「現在の導入・配布を許可しない」と明記する。
結果: **TASK-015が最終判定に使える正本の記述がE3について存在しない。** TASK-016 WP-1がこれを解消するが、WP-1自身がTASK-010/012完了を依存条件としている（TASK-016:146-148）ため、正本化が最も遅い時期まで先送りされている。→ 提案`C-4`。

---

## 5. Task graph変更案（提案のみ。適用しない）

いずれも「最小変更」を基準にした案であり、Project ownerの承認前に適用しない（`[TASK]` TASK-017:48）。

| ID | 種別 | 提案 | 根拠 | 影響 |
|---|---|---|---|---|
| `C-1` | 追加（小）または前提解消 | `unit` Gateのsymlink依存を解消する。**第1案（変更0）**: Project ownerがWindows Developer Mode有効化または管理者PowerShellでRISK-FS-001を先行実行し、Local Gateを開通させる。**第2案（新規TASK-018）**: `run-verification.ps1:188-190,213-215`を「symlink probe失敗時は`risk_fs_001`選択のみexit `2`、他のunit testは実行」へ変更し、契約:139へ追記する | `F-1` | 第1案は最小。第2案はTest基盤の変更＝TASK-008成果への部分修正。どちらもTASK-010着手前に必要 |
| `C-2` | 追加（小）または統合 | RISK-CONFIG-001のnon-http(s)拒否修正の担当を1 Taskへ確定する。**推奨**: `core/security_policies.py`＋connector 2件へ波及するApplication behavior変更のため、新規小Task（例 TASK-019 `Enforce http(s)-only web allowlist`）として独立させ、TASK-010と並行可能にする。**代替**: TASK-012のsecurity範囲へ明示的に統合し、TASK-010:44,85を「既知2件Fail・他10件PASS」へ訂正する | `F-9`、TASK-008:111 vs TASK-010:85 | どちらでもTASK-010のScopeが「MOVEのみ」に保たれる。TASK-010単独では判定不能な状態が解消する |
| `C-3` | 分割 | TASK-012を`12a: 挙動維持の物理移動`（Rollback可）と`12b: WebEngine navigation security ＋ external URL allowlist適用`（Rollback不可、RISK-EXT-001/WEB-002担当、runner:34,179-181のdeferral解除を含む）へ分ける。12bはPath非依存のためTASK-010/011と並行可能 | `F-16`、`F-4` | Rollback境界が明確化。恒久Blockedの2 Riskを早期に解消でき、最終Gateのリスクが下がる |
| `C-4` | 並べ替え | TASK-016 WP-1の依存から「TASK-010、TASK-012完了」（TASK-016:146-148）を外し、`Project ownerの本Task定義承認`のみとする。WP-1は文書とDecisionだけを扱い（Edit Scope: TASK-016:157-160）、両Taskの成果物を技術的に必要としない | `F-9`(4.6)、AGENTS.md:37 | E3/E7の正本が早期に確定し、TASK-015の判定基準が用意される。Critical Pathからも1段外れる |
| `C-5` | 並べ替え＋Scope移管 | (a) TASK-014のDependencies/Statusへ`TASK-016`を明記する。(b) frontend重複UIの削除責務は各TASK-016 WPに閉じ、TASK-014は「TASK-016の対象外資産」（`.pyc`、legacy docs/harness container、Playwright生成物等）に限定する | `F-6b`、`F-10`、`F-15` | 削除Gateの二重実行と相互待ちが解消。不可逆操作が最終UI変更の後になる |
| `C-6` | 並べ替え（要判断） | TASK-010とTASK-011の順序を入れ替える（TASK-011 → TASK-010）。理由は`F-3`のPath定数往復編集の削減。**ただし**TASK-011:30が現在TASK-010を依存に持ち、TASK-011は既にHigh riskの一括変更である。**推奨は現状維持（010→011）** とし、代わりにTASK-010で「repository rootとconfig rootを単一箇所で解決する」形へ整理して、TASK-011の編集点を1つに絞る | `F-3` | 現状維持なら追加Task変更なし。編集点集約はTASK-010内の実装方針として扱える |
| `C-7` | 前倒し | TASK-005を即時着手し、TASK-010と並行させる。Dependencies: None（TASK-005:26） | `F-13`、TASK-013/014/015のBlock解除 | Critical Path短縮。`template/`の扱いが`D2`と同時に決まる |
| `C-8` | 追加（文書） | Verification Contractへ、E3判定用のRisk（例 `RISK-FE-001` pinned hash/license/external asset 0、`RISK-FE-002` 重複UI参照0、`RISK-FE-003` component lifecycle leak 0）を追加し、TASK-015の「12 Risk」を更新後の件数へ改める。実施はTASK-016 WP-1のEdit Scope内で可能 | `F` §2.2 TASK-004、4.6 | TASK-015がE3を機械判定できるようになる |
| `C-9` | 追加（文書） | `[SPEC]` refactor-policy.md:54の「TASK-009〜014」をTASK-015/016を含む範囲へ更新する | §2.2 TASK-006 | 正本の陳腐化解消。1行 |
| `C-10` | 廃止 | なし。廃止を提案するTaskは0件 | — | — |

**分割・統合の非推奨案（検討したが採らない）**: TASK-010をTASK-011へ統合する案は、High riskの一括変更をさらに肥大化させ、Rollback単位を失うため採用しない（`[SPEC]` refactor-policy.md:36）。

---

## 6. Deferred Decisions register

| ID | 決定事項 | Owner | 最終安全判断時点 | 適用Work Package |
|---|---|---|---|---|
| `D1` | Source/Runtime config分離後のBridge `workspace` scope解決方式。現状`[CODE]` bridge.py:132,1357-1358の単一`config` scopeで、`[CODE]` workspace.manager.js:10-12,398-400,493-494が`file_icon_map.json`（Source）と`recent_roots.json`（Runtime）を**同じscope**で読み書きしている。選択肢: (a) scope値を追加（`[ADR]`:55のpayload schema拡張として整理、`INV-2`遵守）、(b) 2 rootをfile名で解決、(c) 専用取得経路。**推測で確定しない** | Project owner（Codexが選択肢と影響を提示） | TASK-010実装着手前 | TASK-010 |
| `D2` | `.zizd`保存済みの`rename_list_path: config\rename.csv`の互換方針。選択肢: (a) `rename.csv`はSource扱いとしつつroot `config/`に互換保持、(b) 解決fallbackを追加、(c) `template/*.zizd`を明示承認のうえ更新（User保存分は対象外にできない点に注意）。`[SPEC]` data-contract.md:12と`INV-3`に直結 | Project owner | TASK-010で`rename.csv`をMOVEする前 | TASK-010（＋TASK-005/013の`template/`判断） |
| `D3` | RISK-CONFIG-001 non-http(s)拒否修正の担当Taskと、TASK-010のCONFIG合格基準（12 passed か、既知2件Fail許容か） | Project owner | TASK-010のAcceptance確定前＝着手前 | TASK-010 / TASK-012 / 新規TASK-019のいずれか（`C-2`） |
| `D4` | `unit` Gateのsymlink capability方針（Developer Mode有効化 / 管理者実行の先行 / runner gating変更） | Project owner | TASK-010着手前 | TASK-010の前提、または新規TASK-018（`C-1`） |
| `D5` | `static/js/ui.node.js`と`static/styles.css`の削除承認（TASK-012の移動対象から外すため） | Project owner | TASK-012a着手前 | TASK-012a（TASK-014から移管） |
| `D6` | **各Frontend spaceにどのlibraryを使うか。** 一括事前確定せず、既存画面の移行段階でProject ownerが都度決定する（`[TASK]` TASK-016:38-41）。本Reportは配置を一切推測していない | Project owner | 該当WP着手直前（just in time） | TASK-016 WP-3、WP-4、WP-5、WP-6、WP-7、WP-8、WP-9、WP-10 |
| `D7` | Workflow Documentの正本（現行Application state維持＋双方向Adapter / WorkflowDesigner Documentへ移行）。二重正本は不可（`[HO]` TASK-010-frontend-...:138-145） | Project owner | WP-8着手前。WP-1完了時までの決定を推奨 | TASK-016 WP-8（＋`data-contract.md`の承認済み更新） |
| `D8` | 8 repositoryの同梱・改変・配布許諾の記録先。全件`ALL RIGHTS RESERVED`（`[HO]` :177） | 権利者＝Project owner | WP-2でsourceを配布物へ固定する前 | TASK-016 WP-2（`docs/decisions/`＋NOTICE） |
| `D9` | 同梱libraryのvendor**配置path**（Target Tree上のnode）。`[ADR]`:27-38に該当nodeがない。UI space配置（`D6`）とは別問題 | Project owner | WP-2着手前 | TASK-016 WP-2、正本（frontend仕様） |
| `D10` | 8 library要件の正本化先（`docs/features/frontend.md`へ追記 / `docs/features/frontend-libraries.md`を新設） | Project owner | WP-1着手時 | TASK-016 WP-1 |
| `D11` | upstream修正（DataViewer `destroy()`/`off()`欠如、WorkflowDesignerのunscoped `:root`、SQLFlow自動test不在）の実施可否・実施者・新pinned SHA（`[HO]` :91,123,132,157-165） | Project owner（upstream repository owner） | 各WP着手前。**外部リードタイムのため即時着手を推奨** | WP-2のGate、WP-7、WP-8、WP-9 |
| `D12` | TASK-005の各Disposition（`template/`、`scripts/`、企画・個人資料、`tableau-mcp/`、`tests/ui_analysis/`の実行不能entrypoint） | Project owner | TASK-013着手前。`template/`分は`D2`と同時 | TASK-013、TASK-014 |

---

## 7. TASK-010の着手判定

### 判定: **GO-AFTER-REVISION**

NO-GOではない理由: Scope（4種のSource config MOVEと全consumer更新）、境界（TASK-016をOut of scopeへ明記済み: TASK-010:24）、Rollback方針、Verification割当は妥当であり、`[ADR]`と`[SPEC]`に矛盾しない。基盤（TASK-008/009）も再利用可能である。

GOでない理由: 現定義のままでは、(a) Bridge scope未決で実装方式が決まらない、(b) 既存`.zizd`を壊す経路が塞がれていない、(c) Acceptanceに他Taskと矛盾する要件が入っている、(d) 完了判定に使うGateがローカルで実行不能、の4点により**完了判定が構造的に不可能**である。

### 着手前に必要な前提条件

| # | 前提 | 種別 | 根拠 |
|---|---|---|---|
| `P1` | `D4`解決。`unit`/`required` Gateがexit `0`を返せる状態にする | 環境またはTest基盤（`C-1`） | `F-1`、run-verification.ps1:188-190,213-215、TASK-008:104 |
| `P2` | `D1`解決。Bridge `workspace` scopeの解決方式を確定し、`INV-2`（Protocol 1.0非破壊）との整合を記録する | Decision | `F-1`(4.2)、bridge.py:1357-1358、workspace.manager.js:493-494 |
| `P3` | `D2`解決。`rename.csv`移動時の既存`.zizd`互換方針を確定する | Decision | `F-2`、dataintegration_connector.py:199-202、template/*.zizd |
| `P4` | `D3`解決。TASK-010:44,85のCONFIG要件を「修正して12 passed」か「既知2件Fail維持」かに一意化し、TASK-008:111との矛盾を解消する | Task文書修正 | `F-9` |
| `P5` | Acceptanceへ次を追加: ①Runtime state（`recent_flows.json`／`recent_roots.json`）のPathとファイル内容が変化しないことのTest、②`code.editor.js:131-137`の旧config fetch 3行を含む「旧参照0」判定、③`static/config/config.js:365`の既定値更新、④`repository-layout.json`をSource/Runtime 2 keyへ拡張 | Task文書修正 | `F-5`、`F-7`、`[TEST]` repository-layout.json:4、`.gitignore`:42,44 |
| `P6` | TASK-010:28の依存記述からCONFIG担当の曖昧さを除去し、`P4`の結論を反映する | Task文書修正 | `F-9` |

### 着手後にBlockしない事項（明示）

- `RISK-FS-001`の実機実行（TASK-015担当、契約:139）— `P1`が満たされれば`unit`の他testは実行できる。
- `RISK-EXT-001`／`RISK-WEB-002`（TASK-012担当、契約:143）。
- TASK-016の全事項（TASK-010:24でOut of scope）。8 libraryのvendorやUI置換をTASK-010へ混入させない。

---

## 8. 未確認事項とRead Scope外の必要Path

### 8.1 本Sessionで確認できなかった事項

1. **Test/Gateを1件も実行していない。** 本SessionにはRead/Glob/Grep/Edit/Writeのみが与えられ、shell実行手段がない。`run-verification.ps1`の各exit code、CIの実際の合否、symlink probeの現在の結果は、`[TASK]` TASK-008:101-106と`[TASK]` TASK-009:96-102の記録に依拠した推論である。§4.4 `F-1`の結論は、runnerのコード（:188-190,213-215）とTASK-008の記録の一致から導いており、再実行による確認を推奨する。
2. **Git状態の実行前後比較を行えなかった。** 変更が`docs/handoffs/TASK-017-migration-goal-backward-audit.md`の新規作成1件のみであることは、Write以外のfile変更操作を行っていない事実に基づく。`git status`による機械的確認はProject owner／Codex側で実施されたい。
3. **`uv.lock`はRead Scope内だが未読。** 依存同値性は`[TASK]` TASK-009:97（direct dependency parity 87/23、差分0/0/0）に依拠した。lock内容の再計算は行っていない。
4. **8 repositoryのpinned SHA・LICENSE・API・upstream blockerを再確認していない。** `[HO]` TASK-010-frontend-...:34-41,91,131-132,177の記載をそのまま引用しており、独立検証していない。同Handoff:261は当該調査でClaude Codeの独立レビューがFirewallで得られなかったことも記録している。
5. **`RISK-CONFIG-001`の失敗2件を実行再現していない。** `core/security_policies.py:96-108`に`urlparse`のscheme検査がないことをコードで確認したが、`ftp://`／`file://`が実際に`True`となる挙動はTASK-008:103の記録に依拠する。

### 8.2 Read Scope外だが参照した Path（開示）

| Path | 参照方法 | 理由 |
|---|---|---|
| `pytest.ini` | 直接読み取り | `run-verification.ps1`のmarker選択（`-m static_analysis|unit|...`）が何を収集するか判定するために必須だった。Read Scopeの`tests/`に隣接するがroot直下のため範囲外 |
| `.gitignore` | Grepのみ | Runtime state（`config/recent_flows.json`:42、`config/recent_roots.json`:44）のtracking境界確認に必要だった。`INV-7`とE4の判定根拠 |
| `template/*.zizd`、`template/rename_pdf.py` | Repository全体Grepの結果として表示 | `rename_list_path`の実consumer探索時、Path限定せずGrepしたため結果に含まれた。`F-2`の一次Evidenceとなった |

上記3件はScope宣言に反する参照である。意図的な範囲拡張ではなく、config consumer追跡の過程で発生した。内容は本Reportの根拠として使用しており、隠さず開示する。

### 8.3 追加で必要となるRead Scope（本Reportでは**アクセスしていない**）

| Path | 必要な理由 | 必要とするTask |
|---|---|---|
| `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md` | TASK-010/011/013/015がSourceに挙げるlayout参考資料。Target Tree解釈の補助。ただし`docs/README.md:12`により正本ではない | TASK-010以降 |
| `.tmp/task004-staged-investigation/` | `[TASK]` TASK-004:90がEvidenceとして挙げる一時資料。12 Riskの導出過程を再確認する場合に必要 | TASK-004補正（`C-8`） |
| 8 `tomohiro-ono-works/zizai-*` repository（pinned SHA） | `D8`/`D9`/`D11`の判断と、WP-2のhash/license manifest作成 | TASK-016 WP-2 |
| `template/`、`scripts/`、`tableau-mcp/`、企画・個人資料 | TASK-005のDisposition作成 | TASK-005 |
| Git履歴（`2e6ab92`ほか） | TASK-003 Dispositionの再確認が必要になった場合 | TASK-014 |

---

## 9. Codex検証向けの再照合ポイント

本Reportの重大指摘を、Codexが一次情報で再確認するための最小リストである。

1. `run-verification.ps1:188-190`と`:213-215` — symlink probeが`unit`/`required`全体をexit `2`にするか。実行して確認する（`F-1`）。
2. `core/security_policies.py:96-108` — `ftp://`／`file://`が`is_web_target_allowed`で`True`になるか（`F-9`）。
3. `connectors/dataintegration_connector.py:199-202` ＋ `template/*.zizd` — `config\rename.csv`がCWD相対で解決されるか（`F-2`）。
4. `app/gui/bridge.py:1351-1359` ＋ `static/js/workspace.manager.js:10-12,398-400,493-494` — Source configとRuntime stateが同一scopeを共有しているか（`D1`）。
5. `static/js/code.editor.js:131-137` — `file://`で当該fetchが成功しないこと（`F-5`）。
6. `docs/features/frontend.md`全文 — 8 library要件が存在しないこと（4.6）。
7. `docs/tasks/done/TASK-008:111` と `docs/tasks/active/TASK-010:85` — CONFIG担当の矛盾（`F-9`）。
8. `docs/tasks/active/TASK-014:5,28` — TASK-016が依存に含まれないこと（`F-15`）。
9. `git status` — 変更が本file 1件のみであること。

---

## 10. Codex verification

- Date: 2026-08-23
- Result: **Reportを条件付き採用。TASK-010はGO-AFTER-REVISION。ただし`P1`を着手前提から除外する。**

| Finding / proposal | Classification | Codex verification |
|---|---|---|
| TASK-001～009の全面再実施は0件 | 採用 | TASK-001～004、006～009の完了成果は再利用可能。TASK-005は完了成果の修正ではなく、現在も未完のActive Taskである |
| TASK-004/006/008の「補正」 | 部分採用 | 8 library追加後の正本・Gate拡張は後続Taskの新要件として扱う。完了済みTaskの再実施や失敗へのStatus変更は行わない |
| `F-1` / `P1`: symlink capabilityをTASK-010着手前に解消 | **不採用** | verification-contract.md:139-141とTASK-008 Evidenceにより、RISK-FS-001はTASK-015までBlockedを維持し、TASK-009以降をBlockしないことが承認済み。runnerが`unit`/`required`全体をexit `2`にする事実は確認したが、TASK-010では対象Riskの個別Gateと実行可能なTestを用い、承認済み延期を再検討しない |
| `F-2` / `D2`: `rename_list_path`互換 | **採用（Critical）** | template内4箇所の`config\rename.csv`と、dataintegration_connector.py:199-202のCWD相対解決を確認。Source MOVE前に既存`.zizd`を壊さない解決方式が必要 |
| `D1`: Source/Runtime config Bridge境界 | 採用 | bridge.py:132,1351-1359とworkspace.manager.js:10-12,395-400,486-495で、Sourceの`file_icon_map.json`とRuntimeの`recent_roots.json`が同じ`config` scopeを共有していることを確認 |
| `F-9` / `D3`: non-http(s)拒否と担当の一意化 | **採用（High）** | RISK-CONFIG-001を再実行し、`ftp://`と`file://`の2件Failを再現した。tmp fixture 2件は環境ACLでErrorとなったため、Gate全体は追加の環境確認が必要。承認済み拒否要件はTASK-010のMOVEへ暗黙に混ぜず、担当Taskを明記する |
| `C-4`: TASK-016 WP-1を前倒し | 採用 | WP-1は正本・Decision更新であり、TASK-010/012の実装完了を技術的に必要としない。実装前の正本化規約にも一致する |
| TASK-012a → TASK-016の段階移行 | 採用 | TASK-012はUI再設計ではなく挙動維持の物理MOVEである。旧UIの新規設計を行わない限り、TASK-016で設計をゼロからやり直す関係ではない。承認済みdead assetだけはMOVE前に除外する |
| `C-5`: TASK-014をTASK-016後へ置き削除責務を分離 | 採用 | 不可逆cleanupを全Frontend移行後に限定し、各libraryと重複するUI削除はTASK-016内へ閉じる |
| `C-8`: 12 Risk Contractを必ず増補 | 部分採用 | 8 libraryの正本化と機械Gateは必要。ただし既存12 Riskの再定義を必須とはせず、TASK-016固有GateをTASK-015の全suiteへ含める方法も比較する |
| TASK-010 GO-AFTER-REVISION | 採用 | 着手前条件は`P2`～`P6`。`P1`は除外し、RISK-FS-001のTASK-015延期を維持する |

### Verification evidence

- Claude実行前後の`git status`を比較し、Claudeが追加した変更は本Report 1件だけであることを確認した。
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-CONFIG-001`を実行し、scheme拒否2件のFailを再現した。別途2件が既存Temp directoryのACLでsetup Errorとなったため、結果は`2 failed / 8 passed / 2 errors`であり、Gate全体の純粋な再現結果とは扱わない。
- `F-2`、`D1`、`F-1`は該当Code、Task、承認済みVerification Contractへ静的に再照合した。

---

## 11. Applied Task graph

- Date: 2026-08-23
- Authority: Project owner approval after TASK-017 audit
- Scope: Documentation and Task graph only. Application code and Test code are unchanged.

```text
TASK-005 ───────────────────────────────┐
                                       ├─> TASK-010 ─> TASK-011 ─┬─> TASK-012 ─> TASK-016 ─┐
TASK-018 ─> TASK-019 ──────────────────┘                         │                           ├─> TASK-014 ─> TASK-015
                                                                └─> TASK-013 ──────────────┘
```

### Applied boundaries

1. `TASK-005`と`TASK-018`は並行着手可能である。
2. `TASK-019`は`TASK-018`後に、外部入力URLをFrontend/Backendの双方で`http(s)`へ限定する。Application内蔵Web UIの`file://`読込は別境界として維持する。
3. `TASK-010`は`TASK-005`、`TASK-018`、`TASK-019`完了後かつ、Source/Runtime Bridge境界と既存`.zizd`の`rename_list_path`互換方針をProject ownerが承認した後に開始する。
4. `TASK-012`は挙動を変えないFrontend物理MOVEに限定し、8 libraryによるspace移行は`TASK-016`で行う。
5. `TASK-016`は全8 Frontend libraryを利用する。どのspaceへどのlibraryを配置するかは各移行直前にProject ownerが決定する。
6. `TASK-014`は`TASK-013`と`TASK-016`の合流後に、Frontend重複UI以外の残存物だけを整理する。Frontend重複UIの削除責務は`TASK-016`に置く。
7. `RISK-FS-001`のsymlink実機検証はProject ownerが`TASK-015`で1回実施し、それ以前のTaskをBlockしない。
8. 各実装計画の承認までApplication codeを変更しない。commit・pushは別途指示まで行わない。
