# Backend Test Plan Handoff

- Source: `.docs/areas/backend-tests.md`（local-only。2026-09-14に必要部分を付録へ保全して削除）
- Migrated by: TASK-006
- Date: 2026-08-21
- Status: Handoff — implementation scope not independently approved

## Canonical relationship

Migrationに必要なverification contractは[v23 Migration Verification Contract](v23-migration-verification-contract.md)、test/CI実装はTASK-008を正とする。旧planの`backend_tests/`と100 offline connector/action caseは実装・実行されておらず、TASK-008の最小baselineへ自動追加しない。

## Retained test principles

- Connector actionは、代表success、代表failure、重要boundaryを直接Testする。
- Local CSV/Excel/DuckDB等はtemporary directoryとreal local libraryを使用できる。
- BigQuery、embedding model、browser driver、Chrome process、mouse/keyboard、clipboard、long waitは通常Testで実行せず、controlled fakeまたは専用Runtime Gateへ分離する。
- `WindowsConnector.loop_tasks`はWorkflowEngineのspecial pathを通して検証する。
- Test dataは`tmp_path`またはRepository外temporary directoryへ置き、Product code/configをTest都合で変更しない。
- Offline Gateはexternal service、real credential、real browser/desktop interactionへ依存しない。

## Integrated subset

TASK-003で現行contractに対してgreen確認されたCSV、Excel、Dataintegration、schemaの4 file/11 caseをTASK-008へ引き継ぐ。Connector discovery、config、Bridge、filesystem、Frontend/RuntimeはVerification ContractのRisk ID単位で実装する。

## External live execution boundary

外部serviceや実OS操作を行うcaseは、caseごとに実行直前の承認を必要とする。承認時は対象service、destination/account、送信data、side effect/cost、単一command、cleanup、期待結果を具体化する。1 caseの承認を他caseへ流用しない。

## Deferred decision

旧planの全action網羅scopeを再利用する場合は、TASK-008のbaseline完成後に、現行Connector inventoryと重複を照合して専用Taskを承認する。旧countや旧file layoutをそのまま復元しない。

## Appendix: Historical case design

`.docs/areas/backend-tests.md`（local-only、2026-08-13時点のPhase 1設計）から、今後のConnector Test設計に必要な部分だけを保全した。原本は2026-09-14に削除した。

- Current Specificationではない。実装、scope、件数は承認されていない。
- 当時の`static/config/config.js`と旧`connectors/`を基準にしている。利用前に[Current Connector and Action Inventory](current-connector-action-inventory.md)、`apps/gui/config/config.js`、`apps/connectors/`と照合し、外部URL・process起動・file操作などのSecurity境界は[Connector Contract](../features/connectors.md)と現行実装で再確認する。
- 旧`backend_tests/` layout、実行command、件数は復元しない（`Deferred decision`に従う）。
- Vector Connectorの動作確認と改修要否は[TASK-028](../tasks/active/TASK-028-verify-vector-connector-behavior.md)で扱う。

### A. Offline connector and action cases

記号: `!` required setting、`=` configured default、`{...}` configured choices、N representative normal、B important boundary or combination、E representative error。

| Connector / action | Configured settings | Case IDs and inputs | Expected result | Offline dependency and side effect |
| --- | --- | --- | --- | --- |
| BQ / `execute_sql` | `project_id!`, `sql!`, `schema?`, Google auth control | BQ01-N: fake SELECT with timezone-aware datetime; BQ02-B: fake DDL with no rows/schema; BQ03-E: missing project or SQL source | DataFrame with schema and timezone removed; one-row job/table result; `ValueError` | BigQuery client mocked; no I/O |
| BQ / `execute_sql_file` | `project_id!`, `sql_file!`, `encoding=utf8{utf8,shift_jis}` | BQ04-N: temporary Shift-JIS SQL; BQ05-E: missing SQL file | Exact SQL is passed to query; `FileNotFoundError` | BigQuery mocked; temporary SQL read |
| BQ / `load_data` | project/dataset/table/input required; `write_disposition={create_or_replace,create_or_insert}`; schema | BQ06-N: DataFrame with replace; BQ07-B: append with temporal schema; BQ08-E: missing context data | Serialized JSON and `WRITE_TRUNCATE`; `WRITE_APPEND`; `ValueError` | Load client mocked; no remote write |
| Duck / `create_db_file` | `db_folder!`, `db_file_name=sample.duckdb` | DU01-N: file name without extension; DU02-E: file name containing a path | `.duckdb` file and metadata; `ValueError` | Real DuckDB; temporary database |
| Duck / `execute_sql_file` | `db_file!`, `sql_file!`, `encoding=utf8{utf8,shift_jis,cp932}` | DU03-N: CP932 SELECT file; DU04-E: missing SQL file | Result DataFrame; `FileNotFoundError` | Real DuckDB; temporary DB/SQL |
| Duck / `execute_sql` | `db_file!`, `sql!` | DU05-N: SELECT; DU06-B: DDL; DU07-E: invalid SQL | Result DataFrame; executed-status row; database exception | Real DuckDB; temporary DB |
| Duck / `create_table` | `db_file!`, `input_data!`, `table_name!` | DU08-N: register DataFrame; DU09-B: recreate same table; DU10-E: invalid table name | Table and metadata; table replacement; `ValueError` | Real DuckDB; temporary DB |
| CSV / `read_csv` | file, encoding, delimiter, header/data row required; `chunk_size=50000`; `date_cleansing=true`; schema | CV01-N: UTF-8 comma, chunk 1, schema; CV02-B: tab, chunk 0, preamble rows; CV03-E: schema references missing column | Shape, Japanese text and types retained; non-chunked read; schema error | pandas; temporary CSV |
| CSV / `write_csv` | input/folder/name required; encoding, delimiter, schema | CV04-N: UTF-8 comma and automatic extension; CV05-B: CP932 tab; CV06-E: empty context | Correct file; text/delimiter retained; `ValueError` | Temporary CSV created |
| Excel / `read_excel` | file/sheet/header/data row required; `chunk_size=50000`; `date_cleansing=true`; schema | XL01-N: chunk 1 with schema; XL02-B: preamble rows with cleansing disabled; XL03-E: missing sheet or invalid chunk | DataFrame and schema; requested row layout; `ValueError` | openpyxl; temporary XLSX |
| Excel / `write_excel` | input/folder/name/sheet required; `mode={create_or_replace,create_or_insert}` | XL04-N: replace; XL05-B: insert; XL06-E: invalid mode | Sheet replacement; append without duplicate header; `ValueError` | Temporary XLSX |
| Excel / `read_excel_range` | file/sheet/range/header/data row required | XL07-N: `A1:B3`; XL08-E: invalid range | Range DataFrame; `ValueError` | Temporary XLSX |
| Python / `execute_python` | `env_path=defult{defult,venv1,venv2}`, `script!` | PY01-N: `main()` returns DataFrame; PY02-B: log plus scalar; PY03-E: missing `main()` | DataFrame; scalar and captured log; execution error with temporary scripts removed | Current Python subprocess; OS temp |
| Dataintegration / `replace_fields_forrenamelist` | input and rename list required; pre/post cleansing; schema | DI01-N: rename with schema; DI02-B: full-width, whitespace and symbol cleansing; DI03-E: invalid mapping columns | Columns/schema updated; normalized names; `ValueError` | pandas; temporary mapping CSV |
| Dataintegration / `filter_rows` | `input_data!`, conditions, schema | DI04-N: include plus exclude; DI05-B: no conditions; DI06-E: missing field | AND-filtered rows; input/schema preserved; `ValueError` | Memory only |
| Vector / `embedding_vector_db` | folder/collection/input/id/text required; default model | VE01-N: fake model with real FAISS/DuckDB; VE02-B: register same ID again; VE03-E: duplicate input IDs | Index and metadata created; record replaced without duplicate; `ValueError` | Model mocked; temporary index/DB |
| Vector / `search_vector_db` | folder/collection/query/top_k required; include vector; default model | VE04-N: top_k within count; VE05-B: top_k exceeds count with vector; VE06-E: collection missing | Score-ordered DataFrame; available count and vector column; `FileNotFoundError` | Model mocked; temporary index/DB read |
| Shell / `execute_bat` | `file_path!`, optional args | SH01-N: temporary BAT with argument/output; SH02-E: non-zero exit | stdout and return code 0; `RuntimeError` | Local subprocess; temporary BAT only |
| Windows / `define_values` | optional define-values collection | WI01-N: new/overwrite/system-fixed variables; WI02-E: invalid JSON/name | Context and definition type updated; `ValueError` | Memory only |
| Windows / `loop_tasks` | `source_step_id!`, `max_iterations=30,min=1` | WI03-N: two records with child step; WI04-B: max 1 and context restoration; WI05-E: source missing | Child executes per record; cap and restoration; `ValueError` | `WorkflowEngine`; memory only |
| Windows / `rename_and_move_file` | source required; folder/name optional; `allow_missing_source=false` | WI06-N: rename and move; WI07-B: missing source allowed; WI08-E: no destination | Temporary file moved; successful skip; `ValueError` | Temporary file move |
| Windows / `search_files_by_name` | root required; recursive; name/extension regex; timeout `[30,480]` | WI09-N: recursive regex search; WI10-E: invalid root/regex/timeout | Matching file DataFrame; `ValueError` | Temporary directory read |
| Windows / `search_text_in_files` | root/content required; recursive; regex; context `[0,200]`; timeout | WI11-N: UTF-8/CP932 with surrounding lines; WI12-E: invalid regex/context | Line numbers and excerpt; `ValueError` | Temporary files read |
| Windows / `create_markdown_file` | `write_mode={replace,append}`, path/content required | WI13-N: replace and extension completion; WI14-B: append; WI15-E: invalid mode | UTF-8 content; appended content; `ValueError` | Temporary Markdown |
| Windows / `mouse_click` | coordinate mode, x/y, button, click count | WI16-N: specified left single click; WI17-B: current right double click; WI18-E: invalid values | Mock call matches parameters; same; `ValueError` | pyautogui mocked; no real click |
| Windows / `input_text` | `input_mode={replace,append}`, `text!` | WI19-N: ASCII replace; WI20-B: Unicode with clipboard restore; WI21-E: missing text/invalid mode | Expected hotkey/write; paste and restore; `ValueError` | GUI and clipboard mocked |
| Windows / `send_keys` | modifiers, `key!`, `wait_seconds=0,min=0` | WI22-N: Ctrl+Enter; WI23-B: F24 with wait; WI24-E: invalid key | Expected hotkey; mocked sleep; `ValueError` | GUI/time mocked |
| Windows / `wait` | `duration_seconds=1,[0,600]` | WI25-N: zero; WI26-B: 600; WI27-E: 601 | Success; `sleep(600)` mocked; `ValueError` | time mocked; no real wait |
| Selenium / `navigate` | URL/tab mode/wait required; headless; timeout min 1000 | SE01-N: fake driver to allowed URL; SE02-E: redirect from allowed URL to blocked URL | Session DataFrame; navigation stopped and `ValueError` | WebDriver/network mocked |
| Selenium / `dom_action` | operation and conditional selector/value/key settings | SE03-N: input with `value_ref`; SE04-E: unknown operation or missing runtime | Clear/send_keys and session retained; `ValueError` | Driver mocked |
| Selenium / `dom_get` | get type, selector, attribute, all, outer | SE05-N: text with all; SE06-E: required attribute missing | Multi-row DataFrame; `ValueError` | Driver mocked |
| Selenium / `wait` | until, selector/value/state/ms, timeout | SE07-N: selector visible; SE08-E: unsupported condition | Expected wait condition invoked; `ValueError` | `WebDriverWait` mocked |
| Selenium / `screenshot` | path required; target, selector, full page | SE09-N: full-page CDP save; SE10-E: invalid target | Temporary PNG; `ValueError` | Driver mocked; temporary image |
| Chrome / `open_in_chrome` | `url!` | CH01-N: allowed URL with fake executable/Popen; CH02-E: blocked URL | Success DataFrame; `ValueError` | Process launch mocked |
| Plotly / `plot_combined_bar_line` | input/x/bar/line/folder/name required; output mode | PL01-N: duplicate x values to HTML; PL02-E: missing column | Aggregated HTML; `ValueError` | Temporary HTML |
| Plotly / `plot_stacked_bar` | input/x/y/folder/name required; percent and mode | PL03-N: stacked HTML; PL04-B: percent mode; PL05-E: invalid columns | HTML; percent normalization; `ValueError` | Temporary HTML |
| Plotly / `plot_scorecard` | input/value/folder/name required; mode | PL06-N: two rows; PL07-B: one row; PL08-E: empty data | Delta HTML; self-reference boundary; `ValueError` | Temporary HTML |
| Plotly / `plot_funnel` | input/stage/value/folder/name required; mode | PL09-N: HTML; PL10-E: missing column | Aggregated HTML; `ValueError` | Temporary HTML |
| Plotly / `plot_radar` | input/value columns/folder/name required; mode | PL11-N: multiple value columns; PL12-E: empty/missing column | Closed polar HTML; `ValueError` | Temporary HTML |

### B. External live candidates

各caseの実行には`External live execution boundary`の承認が必要。1 caseの承認を他caseへ流用しない。

| ID | Connector / action | 外部対象と送信data | 副作用とcleanup |
| --- | --- | --- | --- |
| EXT-BQ-01 | BQ / `execute_sql` | 利用者が選ぶADC identity／project、固定`SELECT 1` | query課金の可能性、書込なし |
| EXT-BQ-02 | BQ / `load_data` | ADC identity／project／dataset／table、合成1行 | table作成・置換と課金、検証後にtest tableを削除 |
| EXT-VE-01 | Vector / `embedding_vector_db`、`search_vector_db` | 既定Hugging Face model、合成ID／text 2件 | model download／cache、CPU、disk、検証後に一時collectionを削除 |
| EXT-WI-01 | Windows / `mouse_click` | 未保存の新規Notepad、承認済み座標 | 実click、保存せずNotepadを閉じる |
| EXT-WI-02 | Windows / `input_text` | 未保存の新規Notepad、timestamp付き固定文字列 | 実keyboard／clipboard操作、clipboardを復元し保存せず閉じる |
| EXT-WI-03 | Windows / `send_keys` | 未保存の新規Notepad、固定key sequence 1件 | 実key event、保存せず閉じる |
| EXT-SE-01 | Selenium / `navigate` | 新規WebDriver profile、`https://www.google.com/`、login無し | network通信とbrowser process、driverを終了 |
| EXT-SE-02 | Selenium / `dom_action` | navigate済みの同target、`body`のscrollのみ | page移動のみ、driverを終了 |
| EXT-SE-03 | Selenium / `dom_get` | navigate済みの同target、機微でないpage text | page内容をmemoryへ読込、driverを終了 |
| EXT-SE-04 | Selenium / `wait` | navigate済みの同target、`body`の待機 | network通信と待機時間のみ、driverを終了 |
| EXT-SE-05 | Selenium / `screenshot` | navigate済みの同target、Repository外のPNG path | 一時screenshot、検証後に削除 |
| EXT-CH-01 | Chrome / `open_in_chrome` | `https://www.google.com/`、通常のChrome profileを使う可能性 | Chrome windowが開きprofile状態が見え得る、windowを閉じる |

### C. Configuration contract viewpoint

- UI設定上のconnector／action集合と、backendのdispatcher route（`loop_tasks`のWorkflowEngine special pathを含む）が一致することを契約Testで確認する観点があった。現行の`tests/fixtures/contracts/connector-inventory.json`はmodule／class単位で、action名を持たない。
