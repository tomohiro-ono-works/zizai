# TASK-037 Investigate Connector Behavior and UI Display Specification Gaps

## Status

Not Started — 仕様調査Task。実装は行わない。項目ごとに不具合か仕様かを判断し、必要な場合は個別の実装Taskへ分割する。TASK-032〜TASK-036の推奨実装順序とは独立に実施できる。

## Goal

2026-09-14〜15の非BigQuery検証で見つかった要確認事項5件について、次の順に進める。

1. 現状を確認する。
2. 現行のContract／UXと照合する。
3. 不具合か仕様かを判断する。
4. 改修方針案（または現状維持の理由）を示す。

各項目を必要に応じて個別の実装Taskへ分割できる状態にする。

## Scope

### 1. DuckDBの非query SQL（DDL等）の戻り値

- 現状確認: `DuckConnector.execute_sql`／`execute_sql_file`でDDL（`CREATE VIEW`、`CREATE TABLE`等）やDML（`INSERT`、`UPDATE`、`DELETE`）を実行したときの戻り値。DuckDB 1.4.2での`cursor.description`と`cursor.df()`の挙動を含む。
- UXの確認: 戻り値がDataViewerや後続stepでどう見えるか。
- Contract照合: Connector Contractのside-effect result（共通化は未完と記載）と、`execute_sql`がstatus行を返す分岐を持つ意図。

### 2. ShellConnectorの出力encoding

- 現状確認: `execute_bat`は標準出力／標準エラーを`cp932`固定（`errors="replace"`）でdecodeする。console code page（932／65001）と起動経路（consoleからの`bin\ziz.bat`、Desktop UI、CI）ごとの結果を確認する。
- Contract／UX照合:
  - 日本語出力を正しく扱う要件
  - batファイル自体の想定encoding
  - WindowsのUTF-8設定との関係

### 3. WindowsConnectorの日本語入力とclipboard

- 現状確認: 非ASCIIの`input_text`は、textをclipboardへcopyして`Ctrl+V`で貼り付け、元のtextだけを戻す。
  - text以外の内容（画像、ファイル、HTML／RTF等の書式付きdata）が保持されるか
  - 復元までのtiming
  - 復元に失敗したときの挙動
- UX照合: 利用者のclipboardを一時的に変更してよいかの要件と、注意表示の要否。

### 4. 下部パネルで「帳票」タブが2つ表示される

- 現状確認: どの画面・node種別・表示Patternで「帳票」タブが2つ並ぶか。表示しているのがhost ApplicationとDataViewer libraryのどちらかを特定する。
- Contract照合: [Frontend Libraries](../../features/frontend-libraries.md)は、初期版のtab構成を定めている。schema編集可能なdata nodeは「帳票／カラム設定／JSON編集」、schema編集を持たないdata nodeは「帳票」だけである。

### 5. 実行ログダイアログの「内容」列で長い文字列が切れる

- 現状確認: 「内容」列の文字列が切れる条件（step名、Connector名、action名、error message）、横スクロールの有無、全文を確認する手段。
- UX照合: 実行ログで利用者が確認すべき情報と、error全文の表示要件。

### 共通

- 5項目の結果に基づき、実装が必要な項目を個別の実装Taskへ分割する案を作る。担当Taskの候補を含める。

## Out of scope

- 実装修正（Source code、Test code、Config、Current Specificationの変更）。
- DataFrame→DuckDB型変換（TASK-032）。
- WorkflowEngineのConnector探索で全Connector moduleがimportされる件。未割当のArchitecture concernとして[TASK-015](TASK-015-verify-v23-migration-completion.md)のEvidenceに記録する。
- DataViewerの表示Pattern別の機能切替（TASK-025）。
- 実行状態、実行開始のラグ、キャンセルの表示（TASK-021）。

## References

- 項目1: `apps/connectors/duckdb_connector.py`（`execute_sql`、`execute_sql_file`）、[Connector Contract](../../features/connectors.md)（Known follow-up boundaries）、[TASK-032](TASK-032-define-dataframe-to-duckdb-type-contract.md)
- 項目2: `apps/connectors/shell_connector.py`（`execute_bat`）、`bin/ziz.bat`
- 項目3: `apps/connectors/windows_connector.py`（`input_text`、`_write_text`）、依存`pyperclip`／`PyAutoGUI`
- 項目4: `apps/gui/vendor/zizai-data-viewer/src/report-viewer.js`（`TAB_DEFS`）、`apps/gui/js/data-viewer.adapter.js`、`apps/gui/js/ui.node.detail.js`、[Frontend Libraries](../../features/frontend-libraries.md)、[TASK-025](TASK-025-implement-action-specific-data-viewer-policies.md)
- 項目5: `apps/gui/js/app.js`（`ensureFlowRunLogStarted`、実行ログダイアログの表示）、`apps/gui/js/dialog.js`、[Frontend](../../features/frontend.md)、[TASK-021](TASK-021-stabilize-step-execution-feedback-and-cancellation.md)
- 検証方式: [TASK-036](TASK-036-design-verification-harness-and-test-evidence-pipeline.md)

## Constraints

- 本Taskでは実装修正を行わない。Current Specificationの変更が必要と判断した場合は、変更案として提示するに留める。
- 調査用のdataは一時領域に置き、`workflows/`とroot `config/`の利用者データを変更しない。
- 利用者のclipboard内容を変更しうる確認や、OS入力を伴う確認は、専用test windowを使い、Project ownerの明示承認を得てから行う。
- 各項目の判断は、現行のSource、Current Specification、実画面での再現結果に基づき、推測だけで決めない。

## Acceptance Criteria

- 5項目それぞれについて、次が記録されている。
  - 再現条件と現状
  - 照合したContract／UXの根拠
  - 不具合か仕様かの判断
  - 改修方針案、または現状維持の理由
- 実装が必要な項目について、個別の実装Taskへの分割案（担当Taskの候補を含む）が作成され、Project ownerに確認されている。
- 本Taskで実装修正を行っていない。

## Evidence

2026-09-14〜15の非BigQuery検証（一時scriptによる確認。scriptはrepositoryに含めていない）。

1. `execute_sql`で`CREATE OR REPLACE VIEW`を実行すると、status行（`status: executed`）ではなく、0行・列`Count`のDataFrameが返った。VIEW自体は作成された。コード上、status行を返すのは`cursor.description`がNoneのときだけである。
2. 検証環境（console code page 65001）で、cp932で保存したbatの`echo テスト出力`が文字化けした。bat内で`chcp 932`を指定すると正しく取得でき、`chcp 65001`でUTF-8出力にすると再び文字化けした。
3. 専用test windowへの日本語`input_text`（追記）は成功し、clipboardのtextは実行前と同じ内容に戻った。text以外の内容が保持されるかは未検証である。コード上は`pyperclip.paste()`で取得したtextだけを戻す。
4. Desktop実画面の自動操作で、data nodeの下部パネルにtab「帳票」が2つ並んで表示された（screenshotで確認）。source上、「帳票」のlabel定義はDataViewer libraryの`TAB_DEFS`にだけ見つかる。
5. flow完了時の実行ログダイアログで、「内容」列の文字列（例: `[step2] DataintegrationConnector / replace_fields_forrenamelist`）が途中で切れ、横スクロールが必要だった（screenshotで確認）。

## Remaining Work

- 5項目の現状確認、Contract／UX照合、判断、改修方針案の作成。
- 実装が必要な項目の分割案を作り、Project ownerの確認を得る。
