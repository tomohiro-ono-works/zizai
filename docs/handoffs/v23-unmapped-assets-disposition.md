# v23 Unmapped Assets Disposition

- Status: Approved Disposition — not Current Specification
- Related task: [TASK-005](../tasks/done/TASK-005-classify-target-unmapped-assets.md)
- Adopted Task graph: [TASK-017 Backward Audit §11](TASK-017-migration-goal-backward-audit.md)
- Date: 2026-08-23
- Branch / worktree: `codex/task-010-planning` (`.worktrees/task-010-planning`)
- Verification: Codexは静的読み取りのみ。**資産の移動・削除・rename・内容変更を一切行っていない。**

本Reportは調査Evidenceであり、単独ではCurrent Specificationではない（AGENTS.md:37、docs/README.md:23）。削除の実施承認でもない。

TASK-005で既に確認済みの`tableau-mcp/`削除方針に加え、Project ownerは2026-08-23に`D13`〜`D19`を確定した。全DispositionはProject owner確認済みである。

Project ownerは`template/preview.html`、`template/rename_pdf.py`、`template/rename_pdf_rules.json`、`zizai-craft.pptx`を自身で削除した。Codexが指定worktreeで4 fileの不在とGitの削除差分4件を確認した。Codexは削除を実施していない。

---

## 0. 語彙と判定基準

### 0.1 Disposition語彙

| 語 | 意味 | 実施Task |
|---|---|---|
| `KEEP` | 現在のPathとtracking状態を維持する。TASK-013で操作しない | — |
| `MOVE` | 承認されたTarget Pathへ移す | TASK-013 |
| `ARCHIVE` | 内容を保持したまま履歴・参考資料として別領域へ移す | TASK-013 |
| `IGNORE` | Source管理対象外として`.gitignore`で明示する。追跡もMOVEも削除もしない | TASK-013 |
| `REMOVE_CANDIDATE` | 削除候補。5区分参照`0`の証明とProject ownerの明示承認の後にのみ削除する | TASK-014 |
| `REMOVE` | Project ownerが不要と確定した最終Disposition。tracked資産は先行削除済みでも5区分Reference Gateを免除せず、untracked/local資産はProject ownerのlocal checkoutで扱う | TASK-014（tracked）／Project owner local checkout（untracked/local） |

`REMOVE_CANDIDATE`は削除承認ではない。`REMOVE`もDeletion gateを省略する承認ではない（refactor-policy.md「Deletion gate」、TASK-014「Acceptance criteria」）。

### 0.2 Class語彙

| Class | 定義 |
|---|---|
| `source` | 追跡対象。Code、deterministic fixture、configuration、利用者に提示するsample data |
| `runtime` | 実行時に生成・更新される状態。追跡しない |
| `generated` | 生成物・snapshot・cache・report。追跡しない |
| `personal` | 個人作業file・editor設定。local-onlyで保持する |
| `historical` | 過去の判断・企画・prototypeの証跡。現行実行経路を持たない |

### 0.3 未使用と不明の区別

refactor-policy.md:10-16に従い、次を区別する。

- `未使用`: Code/Runtime/Test/CI/active documentationからの参照が`0`であることを実地確認できたもの。
- `判断保留`: 参照が`0`でも、静的参照を持たない利用形態（手動実行utility、binary企画資料等）であり、利用実態のEvidenceが不足しているもの。

**判断保留を`REMOVE_CANDIDATE`へ倒していない。**

---

## 1. 調査条件と限界

1. 本Sessionは`.worktrees/task-010-planning`（tracked fileのみ展開されるlinked worktree）で実行した。**untracked / gitignored資産は本worktreeに実体が存在しない。** 不在は「Repositoryに存在しない」ことを意味しない。該当するのは`memo.md`、`test.ipynb`、`.obsidian/`、`無題のファイル.base`、`tmp_staged_files_release_202606.txt`、`.env/`、`logs/`、`workflows/`、`.playwright-mcp/`、`.tmp/`、`.codex-harness/`、`.docs/`である。これらは`.gitignore`の静的読解とMigration Map / Repository Auditの記録に基づいて分類した。
2. Claude Sessionでは`git check-ignore`を実行できなかったため、Codex検証で`git check-ignore -v --no-index`をfile probe付きで実行した。`memo.md`、`test.ipynb`、`scripts/`、`logs/`、`workflows/`、`.pytest_cache/`、`__pycache__/`は各明示規則にmatchし、`.tmp/`は`.gitignore:38`の`*.tmp`にdirectory名がmatchした。`.obsidian/`、`.playwright-mcp/`、`無題のファイル.base`、`tmp_staged_files_release_202606.txt`はmatchしなかった。
3. Binary（`zizai-craft.pptx`、`Tableau_MCP_...pptx`）は開いていない。file名、同梱mdの記述、Repository Auditの記録、size、git履歴のみを用いた。
4. tracking状態は`git ls-files`の実地確認による。

---

## 2. TASK-005 Disposition

### 2.1 `template/`（tracked、6 files）

#### 2.1.1 グループ判定

| 項目 | 内容 |
|---|---|
| Purpose | 利用者へ提示するWorkflow templateの配布領域。`.zizd`のみがApplicationから列挙される |
| Reference sources | `core/flow_locator.py:11`（`TEMPLATE_DIR = BASE_DIR / "template"`）、:39-57（`list_templates_local()`、`.zizd`拡張子のみ）→ `app/gui/bridge.py:598-602`（`flow.list` kind=`template`）→ `static/js/app.home.js:267,321`、`static/js/app.js:2273,2329`、`static/js/ui.renderer.js:135`。`README.md:84`（directory tree） |
| Git tracking | 6 file全てtracked。`.gitignore`に該当規則なし |
| Class | `source`（`.zizd`）／`historical`（`preview.html`）／`source`（`rename_pdf.*`、D15で不要と確認） |
| **Disposition（グループ）** | **KEEP（Project owner承認済み。root `template/`を維持し、TASK-013でMOVEしない）** |
| Confidence | High |

**KEEP（MOVEしない）の根拠**

1. 承認済みTarget Treeは`apps/{desktop,cli,gui,core,connectors,common}`であり（architecture.md:49、ADR-v23）、利用者向けsample flow dataに対応するnodeが存在しない。Migration Map:130が「対応先未定義」とした点は現在も有効である。
2. `core/flow_locator.py:9-11`は`BASE_DIR = parents[1]`でrepository rootを逆算する。TASK-011で`core/`のmodule深さが変わるとこの定数自体が編集対象になる（TASK-017 `F-3`）。`template/`のMOVEを同時に行うと同一定数への往復編集が増える。
3. MOVEを選ぶ場合はTarget Treeへのnode追加＝新規Decisionが前提であり、TASK-013の「承認済みDispositionの適用」（TASK-013:19-21）を超える。
4. KEEPにより、TASK-017 `F-13`（`template/`の二重移動リスク）は発生しない。

#### 2.1.2 File単位

| Path | Size | Tracked | 参照元 | Class | Disposition | Rationale | Confidence | Follow-up |
|---|---|---|---|---|---|---|---|---|
| `template/.gitkeep` | 2 B | Yes | なし（directory placeholder） | `source`（構造marker） | KEEP | `template/`に追随する。実fileが存在するため機能上は冗長だが無害であり、単独で判断する対象ではない | High | なし |
| `template/BigQueryの抽出結果をExcelに出力する.zizd` | 3,926 B | Yes | `flow_locator.py:39-57` → Bridge `flow.list` → Home UI | `source`（利用者向けsample data） | KEEP | Runtime参照のある現行資産。data-contract.md:8-11の`.zizd` schemaに従う | High | `rename_list_path` 3箇所が`D2`の対象（§6） |
| `template/ExcelからBigQueryテーブルを作る.zizd` | 3,143 B | Yes | 同上 | `source`（利用者向けsample data） | KEEP | 同上 | High | `rename_list_path` 1箇所が`D2`の対象（§6） |
| `template/preview.html` | 30,551 B | Yes | **参照0**（repository全域grep 0件。`flow_locator`は`.zizd`のみ列挙するため列挙もされない） | `historical`（独立prototype） | **REMOVE（D14承認・Owner実施済み）** | 未使用（参照0）かつ旧仕様。`:335,341`が`https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js`を`<script type="module">`でimportし、`:347-382,458`が`public.tableau.com`の外部viz 7件を埋め込む。architecture.md:12「外部Pageや外部配信JavaScriptをBridge到達可能なContextへ入れない」およびTASK-005のCompletedに記録した確定方針（Tableauは内蔵UIへ埋め込まず既定ブラウザで利用）と正面衝突する内容である。Repository Audit L98も「zizai本体と無関係な独立ツール」と記録する | High | 指定worktreeで不在およびGit削除差分を確認。Codexは削除していない |
| `template/rename_pdf.py` | 14,159 B / mode 755 | Yes | **静的参照0**。ただしCLI utilityであり静的参照を持たない利用形態 | `source`（standalone utility sample。Application sourceではない） | **REMOVE（D15承認・Owner実施済み）** | 静的Evidenceだけでは未使用を断定しなかったが、Project ownerが不要と判断した。`pypdf`（`:56`）は`pyproject.toml`／`uv.lock`に存在せず、docstring `:13,16,19`は同梱fileと異なるconfig名を案内している | High（Owner判断） | 指定worktreeで不在およびGit削除差分を確認。Codexは削除していない |
| `template/rename_pdf_rules.json` | 1,456 B | Yes | `rename_pdf.py`の`--config`引数へ手動指定する想定（静的bindingなし） | `source`（sample data） | **REMOVE（D15承認・Owner実施済み）** | `rename_pdf.py`に追随するsample。Project ownerが不要と判断した | High（Owner判断） | 同上 |

### 2.2 `scripts/`

| 項目 | 内容 |
|---|---|
| Purpose | 開発補助領域。現在tracked fileは1件のみ |
| Git tracking | `.gitignore:32`が`scripts/`をbulk ignoreするが、`scripts/requirements_inventory.csv`はtrackedのため追跡が継続している（tracked fileはignoreより優先される） |

| Path | Size | Tracked | 参照元 | Class | Disposition | Rationale | Confidence | Follow-up |
|---|---|---|---|---|---|---|---|---|
| `scripts/requirements_inventory.csv` | 29,306 B / 388行（header + 387 package） | Yes | **参照0**（Code/Test/CI 0件。`README.md:77`はdirectory treeの記載のみで実行先ではない） | `generated`（過去のlicense／security警告調査用snapshot） | **REMOVE（D18承認済み）** | pip時代のinventoryであり、依存の正本は`pyproject.toml`と`uv.lock`へ移行済み。Project ownerは監査用CSVの継続保管を不要と判断した | High（Owner判断） | TASK-014で削除を適用。新たなlicense／security調査は現行lockから都度実施し、本CSVを再利用しない |
| `scripts/`（directory責務） | — | 現在bulk ignored | Repository共通automationのsource置き場 | `source` | **KEEP（D18承認済み）** | Skill専用scriptは`.agents/skills/<skill-name>/scripts/`へ同梱し、複数Skill・開発者・CIから使うRepository共通scriptだけをroot `scripts/`へ置く | High（Owner判断） | 本会話では`.gitignore`を変更しない。必要な実変更はTASK-013、対象folder／pattern／例外ruleの全体レビューはTASK-015で行う |

TASK-009はdesign:28で「`scripts/requirements_inventory.csv`の再設計」を明示的にOut of scopeとしている。したがって本fileの所有はTASK-005である。

### 2.3 `tableau-mcp/`

**確定済み方針の保持**: Tableauは内蔵UIへ埋め込まず既定ブラウザで利用し、`tableau-mcp/`は削除方針で扱う（TASK-005「Completed」）。**本Reportはこの決定を変更せず、削除も実施しない。**

| 項目 | 内容 |
|---|---|
| Purpose | 外部toolのvendorではなく、社内企画資料（md + pptx）の2 file構成（Repository Audit L111、実地確認で一致） |
| Reference sources | **参照0**。Code/Test/CI/`pyproject.toml`いずれからも参照されない。MCP server実装・設定・依存は存在しない |
| Git tracking | 2 file共にtracked。`58593b1`「tableau-mcp資料を追加」で追加。`.gitignore`該当規則なし |

| Path | Size | Tracked | Class | Disposition | Rationale | Confidence | Follow-up |
|---|---|---|---|---|---|---|---|
| `tableau-mcp/tableau-mcp.md` | 11,495 B | Yes | `historical`（企画・予算取得資料） | **REMOVE_CANDIDATE** | 確定済み方針に従う。内容は「Tableau MCP 個人環境PoC 予算取得用メモ」（目的、必要権限・認証方式、体制、費用、成功条件）であり、Application仕様でもContractでもない。実装資産を伴わず参照0 | High（方針として） | TASK-014が5区分参照0を証明して除去する |
| `tableau-mcp/Tableau_MCP_個人環境PoC_予算取得に向けた実施方針整理.pptx` | 460,497 B（binary、未読） | Yes | `historical`（企画・予算取得資料） | **REMOVE_CANDIDATE** | 同上。file名と同梱mdから同一PoCの提案資料と判断した。binaryは最小調査方針により開いていない | Medium（内容未読のため） | 同上 |
| `tableau-mcp/`（directory） | — | — | `historical` | **REMOVE_CANDIDATE** | 上記2 fileのみで構成される | High | 除去前にProject ownerが「社内企画資料としての別途保管が必要か」を確認する。削除してもGit履歴からは取り出せる |

補足: 本資料は社内の予算・体制・権限情報を含む。公開領域へのARCHIVEは選択肢に含めない（AGENTS.md:79）。

### 2.4 企画資料

| Path | Size | Tracked | 参照元 | Class | Disposition | Rationale | Confidence | Follow-up |
|---|---|---|---|---|---|---|---|---|
| `zizai-craft.pptx` | 1,485,491 B（binary、未読） | Yes（`1c8b7a2`で追加） | **静的参照0**（repository全域grep 0件） | `historical`（企画資料） | **REMOVE（D16承認・Owner実施済み）** | Binary内容は未読だが、Project ownerが不要と判断した。Application source・Contract・Testからの参照は0 | High（Owner判断） | 指定worktreeで不在およびGit削除差分を確認。Codexは削除していない |

### 2.5 local-only作業資産（Migration Mapのpersonal分類）

**前提**: 以下5件はいずれもuntracked / local-onlyであり、本worktreeに実体が存在しない（§1-1）。分類は`.gitignore`本文とRepository Auditの記録に基づく。Project ownerは現行5件をすべて不要と判断し、Obsidianを利用する場合も新規に作り直す方針を確定した。

| Path | Tracked | Ignore rule | Class | Disposition | Rationale | Confidence | Follow-up |
|---|---|---|---|---|---|---|---|
| `memo.md` | No | あり（`.gitignore:47`） | `personal` / `local-only workspace` | **REMOVE（D19承認済み）** | Project ownerが不要と判断したlocal memo | High（Owner判断） | local checkoutでOwnerが適用。Codexは削除しない |
| `test.ipynb` | No | あり（`.gitignore:5` `*.ipynb`） | `personal` / `local-only workspace` | **REMOVE（D19承認済み）** | Project ownerが不要と判断したlocal notebook | High（Owner判断） | 同上。`core/テスト.ipynb`は別資産でありTASK-014所有 |
| `.obsidian/` | No | **なし** | `personal` / `local-only workspace`（editor / tool設定） | **REMOVE（D19承認済み）** | 現行設定を再利用せず、必要時にObsidian環境を新規作成する | High（Owner判断） | 新規作成分もlocal-onlyとし、tracking方針はTASK-015の`.gitignore`全体レビューで確認 |
| `無題のファイル.base` | No | **なし** | `personal` / `local-only workspace`（Obsidian Base推定） | **REMOVE（D19承認済み）** | Obsidian Baseであっても再利用せず、新規作成するとProject ownerが判断した | High（Owner判断） | local checkoutでOwnerが適用。Codexは削除しない |
| `tmp_staged_files_release_202606.txt` | No | **なし**（`.gitignore:38` `*.tmp`は`.txt`に一致しない） | `personal` / `local-only workspace` / temporary | **REMOVE（D19承認済み）** | 過去release作業の一時fileでありProject ownerが不要と判断した | High（Owner判断） | 同上 |

---

## 3. Migration Map §3.6 の照合（全6行）

| # | Map §3.6 の行 | Map判定 | 本Reportの扱い | 所有Task |
|---|---|---|---|---|
| 1 | `requirements.txt`, `requirements-dev.txt`, `.env/`（venv） | UNKNOWN（§13 Exception 2） | **TASK-005 Out of scope。解決済み** — `requirements*.txt`は削除済みで、`pyproject.toml`／`uv.lock`／`.python-version`／`.venv/`が実在する。`.env/`はTASK-009:95,103により非破壊で残置（`.gitignore:9`でignore、local-only）。Map §13 Exception 2は解消済み | **TASK-009（Done）** |
| 2 | `template/*.zizd`, `rename_pdf.py`, `rename_pdf_rules.json` | UNKNOWN | **TASK-005 Disposition（§2.1）** — root `template/`と`.zizd`はKEEP。`preview.html`と`rename_pdf.*`はProject ownerがREMOVEを承認・実施し、指定worktreeでGit削除差分を確認した。Map行の記法は`rename_pdf.*`をroot直下のように読ませるが、実体は`template/`配下だった | **TASK-005 → TASK-013 / TASK-014** |
| 3 | `scripts/*` | UNKNOWN | **TASK-005 Disposition（§2.2）** — `requirements_inventory.csv`はREMOVE、root `scripts/`はRepository共通automation用のtracked source領域としてKEEP。Skill専用scriptは各Skill配下へ同梱 | **TASK-005 → TASK-013 / TASK-014** |
| 4 | `logs/`, `workflows/`, `.pytest_cache/`, `.playwright-mcp/`, `.tmp/`, `__pycache__/` | KEEP（現状維持、gitignore管理） | **TASK-005 Out of scope**（TASK-005「Scope」に含まれない生成物／runtime）。Map判定KEEPをそのまま維持する。**所見（引き継ぎ）**: `logs/`(:31)、`/workflows/`(:35)、`.pytest_cache/`(:24)、`__pycache__/`(:2)は明示ignore規則を持ち、`.tmp/`は`*.tmp`(:38)にdirectory名がmatchする。**`.playwright-mcp/`には規則がない**。さらにRepository Audit L172が指摘する「`workflows/`のbulk ignoreがSource相当の`.zizd`とDB／cacheを混在させる」状態はrefactor-policy.md:42／`INV-7`に抵触する | **TASK-013（`.gitignore`）／TASK-014（生成物除去）** |
| 5 | `memo.md`, `test.ipynb`, `.obsidian/`, `無題のファイル.base`, `tmp_staged_files_release_202606.txt`, `zizai-craft.pptx`, `tableau-mcp/` | UNKNOWN（範囲外） | **TASK-005 Disposition（§2.3〜2.5）** — 全件REMOVE。tracked資産4件は指定worktreeでGit削除差分を確認し、local-only 5件はOwnerがlocal checkoutで適用する | **TASK-005 → TASK-014（tracked）／Project owner local checkout（untracked/local）** |
| 6 | `README.md` | KEEP | **TASK-005 Out of scope。KEEP維持**。**所見**: `README.md:77,84,85`がdirectory treeとして`scripts/`、`template/`、`workflows/`を記載する。本ReportのDisposition確定後に整合させる | **TASK-011（Expected change area:42）／TASK-013** |
**§3.6に本Reportが扱っていない行はない。**

---

## 4. Migration Map §9 の照合（全5項目）

| # | Map §9 の項目 | 本Reportの扱い | 所有Task | 現状（本worktreeのtracked treeで確認） |
|---|---|---|---|---|
| 1 | `app/runtime/`, `app/services/`, `shared/`, `core/connector_factory.py`, `core/security_sanitizer.py`, `core/utils.py`, `connectors/`未実装8 file | **TASK-005 Out of scope**（TASK-005「Out of scope」の孤立Application WIP）。既存Dispositionが存在する | **TASK-003（Approved）** — `v23-orphan-wip-disposition.md:28-34`（`PRESERVE_HISTORY`／`REMOVE_CANDIDATE`）、`:50-58`（旧connectorの`EXCLUDE`／`REMOVE_CANDIDATE`）。残存`.pyc`除去はTASK-014 | 対象sourceは全て不在。実在は`app/{__init__.py, main.py, gui/}`、`core/`5 module + `テスト.ipynb`、`connectors/`13 file |
| 2 | `.codex-harness/`全体、`.docs/`（正本化可否） | **TASK-005 Out of scope**。既存Dispositionが存在する | **TASK-002（`v23-harness-docs-disposition.md:55-68` Approved）＋ TASK-006（Done、`docs/`正本化完了）＋ 残container除去はTASK-014**（`v23-canonical-docs-migration.md:41`） | `.gitignore:54-57`でlocal専用。本worktreeに不在（§1-1） |
| 3 | `tests/python/*.py`, `tests/native/*.py`, `tests/ui_analysis/*`, `tests/docs/sqlbilder`, `tests/playwright/scripts/*`, `tests/preview.html` | **TASK-005 Out of scope**（TASK-005「Scope」に`tests/`を含まない） | **TASK-003（test disposition）＋ TASK-008（Baseline再構築、Done）＋ TASK-014（residue）** | 全て不在。`tests/`は`conftest.py`／`e2e`／`fixtures`／`integration`／`manual`／`playwright`／`run-verification.ps1`／`selftest`／`static`／`support`／`unit`へ再構成済み。`/tests/ui_analysis/`(:71)、`/tests/results/`(:72)、`tests/preview.html`(:73)はignore規則を持ち、`tests/static/test_source_boundary.py:36-53`がignore継続をTestで固定している |
| 4 | `template/*`, `scripts/*`, `tableau-mcp/`, `zizai-craft.pptx`, `無題のファイル.base` | **TASK-005 Disposition（§2.1〜2.5）** | **TASK-005 → TASK-013 / TASK-014** | §2参照 |
| 5 | `requirements.txt`／`.env/` → `pyproject.toml`／`uv.lock`／`.venv` の移行方針そのもの | **TASK-005 Out of scope。解決済み** | **TASK-009（Done）** | §3 #1に同じ |

### 4.1 `D12` の残余（`tests/ui_analysis/`実行不能entrypoint）

TASK-017 `D12`は「`tests/ui_analysis/`の実行不能entrypoint」をTASK-005 Dispositionの一部として列挙し、同Report §2.2 TASK-003が「TASK-005/013/014のどれが処理するか未確定」と記録している。

- 事実: `tests/ui_analysis/`はTASK-005「Scope」（`template/`、`scripts/`、`tableau-mcp/`、企画資料、個人作業ファイル）に含まれない`tests/`配下の資産である。`.gitignore:71`でlocal-onlyであり、tracked treeに存在しない。
- Project owner判断: 現行の実行不能UI解析ツールは**廃止・REMOVE**とし、そのまま復元しない。
- 所有: 残存entrypoint／output／関連する旧参照の整理は、承認済みlegacy/generated residueを扱う**TASK-014**とする（TASK-014:20）。新しいUI解析ツールは要件を改めて定義する将来の別Taskで作成し、本Migrationでは再構築しない。

---

## 5. 追加Task要否とDeferred Decision

### 5.1 追加Taskの要否

**本Reportの推奨案を採用する場合、本Dispositionの適用のために新規Taskを必要としない。** 全対象がTASK-013（KEEP／IGNORE／`.gitignore`整備）とTASK-014（REMOVE_CANDIDATEの参照0 Gate）の既存Scopeに収まる。

例外として、新しいUI解析ツールの作成はTASK-014のcleanupへ混在させず、要件が決まる将来の別Taskとする。現時点ではTask定義を作成しない。

これは意図的な設計である。次の3つは「大規模移行を伴うため別Taskが必要になる」選択肢であり、いずれも本Reportでは採用しなかった。

| 大規模移行になり得る項目 | 別Taskが必要になる理由 | 本Reportの選択 |
|---|---|---|
| `template/`をTarget Tree配下へMOVEする | ADR Target Treeへのnode追加（Decision）＋`core/flow_locator.py:11`の`TEMPLATE_DIR`更新＋Bridge `flow.list` kind=`template`の回帰Test＋保存済み`.zizd`の`rename_list_path`（`D2`）を同一Outcomeで扱う必要があり、TASK-013の「承認済みDispositionの適用」を超える | **KEEP**（root維持）。追加Taskを発生させない。MOVEを選ぶ場合のみ新規Taskが必要 |
| `zizai-craft.pptx`／`tableau-mcp/`をARCHIVEする | binary企画資料のarchive領域が正本に未定義であり、保管先Decision＋領域新設が前提 | **REMOVE_CANDIDATE**。Project ownerは保管不要と判断したためARCHIVE Taskを追加しない |
| `scripts/requirements_inventory.csv`をlicense／security inventoryとして維持する | uv由来の再生成手順の定義（生成元scriptは削除済み）と、その正本化が必要 | **REMOVE**。Project ownerは監査用CSVの継続保管を不要と判断したため追加Taskを発生させない |

### 5.2 Deferred Decisions（提案のみ。本Reportで決定しない）

TASK-017 `D12`「TASK-005の各Disposition」に対し、本Reportが確定した部分と、Project ownerの確定が残る部分を分離する。

| ID | 決定事項 | 本Reportの立場 | Owner | 最終安全判断時点 | 適用Task |
|---|---|---|---|---|---|
| `D13` | `template/`のTarget Tree node（root維持か、`apps/`配下nodeを新設するか） | **確定: root維持（KEEP）** | Project owner（2026-08-23承認） | 確定済み | TASK-013 |
| `D14` | `template/preview.html`の扱い（REMOVE か、PoC証跡としてARCHIVE） | **確定: REMOVE**。Project owner実施、指定worktreeでGit削除差分を確認 | Project owner（2026-08-23承認・実施） | 完了 | TASK-014 Evidence |
| `D15` | `template/rename_pdf.py`＋`template/rename_pdf_rules.json`の現行利用有無 | **確定: 不要・REMOVE**。Project owner実施、指定worktreeでGit削除差分を確認 | Project owner（2026-08-23承認・実施） | 完了 | TASK-014 Evidence |
| `D16` | 企画binary（`zizai-craft.pptx`）の保管先 | **確定: 保管不要・REMOVE**。Project owner実施、指定worktreeでGit削除差分を確認 | Project owner（2026-08-23承認・実施） | 完了 | TASK-014 Evidence |
| `D17` | `tests/ui_analysis/`実行不能entrypointの所有Task（`D12`の残余） | **確定: 現行ツールを廃止・REMOVE**。そのまま復元せず、新規作成は将来の別Task | Project owner（2026-08-23承認） | 確定済み | TASK-014（cleanup）／将来Task（新規作成） |
| `D18` | `scripts/requirements_inventory.csv`と`scripts/`の扱い | **確定:** CSVは不要・REMOVE。Skill専用scriptは各Skill配下、root `scripts/`はRepository共通automation用のtracked source領域としてKEEP | Project owner（2026-08-23承認） | 方針確定済み。`.gitignore`全体レビューはTASK-015 | TASK-013 / TASK-014 / TASK-015 |
| `D19` | local-only作業資産5件の扱い | **確定: 全件不要・REMOVE**。Obsidianも現行設定を再利用せず必要時に新規作成 | Project owner（2026-08-23承認） | 方針確定済み。実体は指定worktreeに存在しない | Owner local checkout／TASK-014 Evidence |

`D12`の全Disposition（`tableau-mcp/`、`D13`〜`D19`）はProject owner確認済みである。

---

## 6. TASK-010 Deferred Decision `D2` との接続（`rename_list_path`）

TASK-005は`D2`（保存済み`.zizd`の`rename_list_path`互換方針）を**決定しない**。TASK-010:39とTASK-017 `D2`が定めるとおり、これはTASK-010着手前にProject ownerが決定する事項である。本節は決定に必要な事実だけを提供する。

### 6.1 実地確認したEvidence

| Path | 行 | 値 |
|---|---|---|
| `template/BigQueryの抽出結果をExcelに出力する.zizd` | 117, 128, 139 | `rename_list_path: config\rename.csv` |
| `template/ExcelからBigQueryテーブルを作る.zizd` | 30 | `rename_list_path: config\rename.csv` |

計**2 file / 4行**。いずれもtracked。TASK-017 §2.2 TASK-005（:108）および§4.2 `F-2`の記載と一致する（同Reportは`§10`で「採用（Critical）」と検証済み）。

consumer側の解決方式（`connectors/dataintegration_connector.py:199-202`の`os.path.abspath()`によるCWD相対解決、`bin/ziz.bat:3`／`bin/ziz.sh:5`のrepository rootへの`cd`）は、本ReportのRead Scope外のため再検証していない。TASK-017の記録を引用する。

### 6.2 TASK-005 Dispositionが`D2`に与える制約

- `template/`をKEEP（root維持）としたため、`.zizd`側の相対path `config\rename.csv`の**実効解決先は、TASK-010が`config/rename.csv`をMOVEするかどうかだけで決まる**。TASK-005のDispositionは`D2`の選択肢を狭めない。
- `template/`をMOVEしないため、TASK-017 `F-13`（`D2`で調整した`.zizd`内Pathを`template/`移動で再調整する二重作業）は**発生しない**。
- User保存分の`.zizd`はRepository外に存在し、本Reportからは列挙も変更もできない。`D2`の選択肢(c)（`template/*.zizd`を明示承認のうえ更新）を採る場合でも、User保存分は対象にできない（TASK-017 `D2`の注記と一致）。
- `D2`が選択肢(c)を採る場合、tracked fileの編集対象は上記4行に限られ、実施は**TASK-010が所有する**。TASK-005およびTASK-013はこの4行を編集しない。
- `static/config/config.js:365`の既定値`config\\rename.csv`は新規node作成時の既定値であり、TASK-010のScope内である（TASK-017:261）。本ReportのScope外。

---

## 7. 新規検出事項（Migration Mapに無い、または更新を要する点）

| ID | 内容 | 影響 | 引き継ぎ先 |
|---|---|---|---|
| `N-1` | Migration Map:130は`template/`を「ワークフロー定義テンプレート／対応先未定義／UNKNOWN」とするが、実際には`core/flow_locator.py:11,39-57` → `app/gui/bridge.py:598-602` → Home UIというRuntime参照を持つSource dataである。「対応先未定義」は正しいが「用途不明」ではない | Dispositionの前提が変わる（§2.1で反映済み） | 本Report |
| `N-2` | `docs/features/architecture.md:18-28`のCurrent responsibility mapに`template/`（および`workflows/`、`bin/`）の行がない。Runtime参照されるPathが正本のresponsibility mapに欠けている | 正本の網羅性Gap。本ReportのEdit Scope外のため**変更していない** | 正本追記候補（TASK-013またはTASK-016 WP-1のdocument範囲） |
| `N-3` | 調査時点の`template/preview.html`は外部CDN JavaScriptと外部Pageを含むprototypeだった。Runtimeへ読み込まれる経路はなく、TASK-019の対象外である | Project ownerがD14で削除し、指定worktreeでGit削除差分を確認済み | §2.1 / `D14` |
| `N-4` | `.gitignore:32`がroot `scripts/`をbulk ignoreする一方、D18は同directoryをRepository共通automationのtracked source領域と確定した | 方針と現行ignoreが不一致 | 必要な実変更はTASK-013へ反映し、対象folder／pattern／例外ruleの全体レビューはTASK-015で行う |
| `N-5` | `.playwright-mcp/`、`.obsidian/`、`無題のファイル.base`、`tmp_staged_files_release_202606.txt`に`.gitignore`規則がない。`.tmp/`は`*.tmp`にmatchするため対象外 | 誤commitのリスク（Repository Audit L169） | TASK-013（`.gitignore`更新、削除は行わない） |
| `N-6` | Migration Map:130の記法が`rename_pdf.py`／`rename_pdf_rules.json`をroot直下のfileのように読ませるが、実体は`template/`配下である。root直下に同名fileは存在しない | Map読解時の誤解を招く。本Reportの§2.1が正しいPathを示す | 本Report |
| `N-7` | `template/rename_pdf.py`は`pypdf`（`:56`）に依存するが、`pyproject.toml`／`uv.lock`のいずれにも`pypdf`が存在しない | 現行`.venv`では実行できない。ただしこれは「壊れている」証跡であって「使われていない」証跡ではない | `D15` |

---

## 8. Static completeness / ownership review

### 8.1 Completeness check（Migration Map §3.6 / §9）

| 対象 | 件数 | 本Reportで扱った件数 | 省略 |
|---|---|---|---|
| Migration Map §3.6 の行 | 6 | 6（§3） | 0 |
| Migration Map §9 の項目 | 5 | 5（§4） | 0 |
| §3.6 / §9 が名指しする個別Path（重複除く） | 全件 | 全件 | 0 |

`§3.6`のうちTASK-005 Dispositionを与えた行は #2, #3, #5 の3行、既存Task所有として差し戻した行は #1, #4, #6 の3行。`§9`のうちTASK-005 Dispositionを与えた項目は #4 の1件、既存Task所有として差し戻した項目は #1, #2, #3, #5 の4件。

### 8.2 Ownership review

| 所有 | 対象 |
|---|---|
| **TASK-005（本Report）** | `template/`6 file、`scripts/`（csv + directory）、`tableau-mcp/`2 file + directory、`zizai-craft.pptx`、個人file 5件 |
| TASK-002 / TASK-006 | `.codex-harness/`、`.docs/` |
| TASK-003 | 孤立WIP（`app/runtime/`、`app/services/`、`shared/`、`core/`3 file、旧connector 8 file）、旧test |
| TASK-008 | `tests/`のBaseline再構築 |
| TASK-009 | `requirements*.txt`、`.env/`、pip→uv移行方針 |
| TASK-010 | `config/`4種のSource設定MOVE、`D2`の互換方針、`static/config/config.js:365` |
| TASK-011 | `README.md`のdirectory tree、`core/flow_locator.py`のPath定数 |
| TASK-013 | 本DispositionのKEEP／IGNORE適用と必要な`.gitignore`整備（`N-4`、`N-5`） |
| TASK-015 | `.gitignore`対象folder、pattern、例外ruleの全体レビューと最終Gate |
| TASK-014 | 本Reportのtracked REMOVE／REMOVE_CANDIDATE（`template/preview.html`、`template/rename_pdf.*`、`scripts/requirements_inventory.csv`、`tableau-mcp/`、`zizai-craft.pptx`）、`core/テスト.ipynb`、生成物residue、D17の旧UI解析tool residue |
| TASK-016 | 本ReportのScope外（Frontend library導入・重複UI削除） |

**確定済み範囲では重複所有・所有欠落は検出されなかった。** D17は旧tool cleanupをTASK-014、新規tool作成を将来の別Taskへ分離した。

### 8.3 TASK-005 Acceptance criteria 照合

| TASK-005「Acceptance criteria」 | 判定 | 根拠 |
|---|---|---|
| Migration Map §3.6/§9の全対象にDispositionと理由がある | PASS | §3（6/6行）、§4（5/5項目）を省略なく照合し、`D13`〜`D19`をProject ownerが確定した |
| Source、runtime、generated、personal、historicalが区別されている | PASS | §0.2でclassを定義し、§2の全表に記載した |
| 不明なものを削除候補へ変換していない | PASS | 静的Evidenceだけでは削除候補へ倒さず判断保留とした後、Project ownerが`D15`／`D16`で不要と明示判断した。§0.3の判定基準を維持している |
| 大規模な移行が必要な項目は追加Taskへ分解されている | PASS | Project ownerは本Migrationで追加のMOVE／ARCHIVEを選択しなかった。新UI解析toolだけを将来の別Taskへ分離した |

### 8.4 Termination condition 照合（TASK-005「Termination condition」）

| 条件 | 判定 |
|---|---|
| 全対象のDispositionと追加Task要否が確定している | 満たす — `D13`〜`D19`をProject ownerが確定し、新UI解析toolは将来の別Taskへ分離した |
| 対象資産を移動・削除・変更していない | 満たす（§8.5） |

### 8.5 変更の申告

**本Reportの作成にあたり、資産の移動・削除・rename・内容変更を一切行っていない。**

Project ownerが`template/preview.html`、`template/rename_pdf.py`、`template/rename_pdf_rules.json`、`zizai-craft.pptx`を削除した。Codexは指定worktreeで4 fileの不在と対象限定Git statusの削除差分4件を確認した。これらの削除はProject ownerの変更であり、Codexは実施していない。

- Application code、Test code、`.gitignore`、`README.md`、`docs/features/`、`docs/tasks/`、`docs/decisions/`のいずれも変更していない。
- 変更したfileは`docs/handoffs/v23-unmapped-assets-disposition.md`（本file、新規作成）1件のみである。
- Git操作は読み取り（`status`、`ls-files`、`log`、`worktree list`）のみで、`checkout`／`switch`／`reset`／`add`／`commit`／`push`／`merge`／`rebase`／`tag`を実行していない。branchと既存の未commit変更は保持している。
- Test / Gateは実行していない。本Reportの検証は静的構造確認とMigration Map照合のみである。

### 8.6 TASK-005クローズ処理

- Date: 2026-08-23
- TASK-005を`Completed`へ更新し、`docs/tasks/active/`から`docs/tasks/done/`へ移した。
- 本ReportのTask link、Disposition語彙、所有境界を補正し、TASK-010／TASK-013／TASK-014のTASK-005完了反映だけを行った。
- 資産、Application code、Test code、`.gitignore`は変更していない。branch切替、commit、pushも行っていない。

---

## 9. 未確認事項とRead Scope

### 9.1 本Sessionで確認できなかった事項

1. **untracked / local-only資産の実在。** §1-1のとおりlinked worktreeでは展開されない。`memo.md`、`test.ipynb`、`.obsidian/`、`無題のファイル.base`、`tmp_staged_files_release_202606.txt`、`.env/`、`logs/`、`workflows/`、`.playwright-mcp/`、`.tmp/`のDispositionは、実在確認ではなく`.gitignore`とAudit記録に基づく。主checkoutでの確認を推奨する。
2. **Claude Sessionでは`git check-ignore`未実行**（Bash権限で拒否された）。Codex検証ではfile probe付きで実行し、結果を§1-2、§3 #4、`N-5`へ反映した。global ignore fileの読取warningが出たため、Repository `.gitignore`のmatchだけをEvidenceとして採用した。
3. **Binaryの内容未読。** `zizai-craft.pptx`（1,485,491 B）と`Tableau_MCP_...pptx`（460,497 B）は最小調査方針により開いていない。用途はfile名・同梱md・Audit記録・git履歴からの判断である。
4. **`connectors/dataintegration_connector.py:199-202`の再検証未実施**（Read Scope外）。`rename_list_path`のCWD相対解決はTASK-017:258およびその`§10`検証結果を引用した。
5. **`template/preview.html`の全文は未読。** 外部CDN import（`:335,341`）、外部viz URL（`:347-382,458`）、title（`:6`）、冒頭style（`:1-30`）のみ確認した。
6. **`scripts/requirements_inventory.csv`の全388行は未読。** header行と先頭3データ行、行数のみ確認した。

### 9.2 Read Scope外で参照したPath（開示）

TASK-005 Acceptance「用途・参照元・tracking状態」の確認に必要だったため参照した。いずれも読み取りのみで変更していない。

| Path | 参照方法 | 理由 |
|---|---|---|
| `core/flow_locator.py:1-70` | 直接読み取り | `template/`がRuntime参照を持つか（Source か 未使用 か）の一次確認。`N-1`の根拠 |
| `tests/static/test_source_boundary.py`（全文） | 直接読み取り | repository全域の参照検索結果に含まれた。`tests/`配下local-only資産のignore継続がTestで固定されている事実の確認（§4 #3） |
| `README.md:60-104` | 直接読み取り | `scripts/`・`template/`のactive documentation参照の有無確認（削除Gate 5区分のうちdocumentation reference） |
| `pyproject.toml`、`uv.lock` | Grepのみ（`pypdf`） | `template/rename_pdf.py`が現行`.venv`で実行可能かの確認。`N-7`の根拠 |
| `app/gui/bridge.py`、`static/js/app.home.js`、`static/js/app.js`、`static/js/ui.renderer.js` | Grep結果の該当行のみ（fileは開いていない） | `template/`のRuntime参照経路の追跡 |
| `connectors/`、`app/`、`core/`、`tests/`のdirectory listing | `ls`のみ | Migration Map §9記載Pathの現存確認（§4） |

### 9.3 参照しなかったが関連し得るPath

| Path | 理由 |
|---|---|
| `docs/handoffs/TASK-001-005-review-guidance.md:147`（`### scripts/`） | repository全域のpath参照検索で見出しを検出したが、Read Scopeに含まれないため**開いていない**。`scripts/`に関する既存のreview guidanceが存在する可能性があり、TASK-013着手前に確認することを推奨する |
| `.obsidian/**` | Read Scopeに記載があるが、本worktreeに実体が存在しない（§1-1）。個人資産のため主checkoutでも内容確認は最小限に留めることを推奨する |
| `docs/codex_development_guide_2026-08-15_v24/05_repo-worktree-folder-structure.md` | Read Scope外。`template/`のTarget Tree node（`D13`）を判断する際の参考資料になり得る。docs/README.md:12により正本ではない |
