# Current Connector and Action Inventory

- Status: Current inventory with provisional display-pattern assignment — not Current Specification
- Verified: 2026-08-29
- UI source: `apps/gui/config/config.js`
- Backend source: `apps/connectors/*.py` and the WorkflowEngine special path

## この資料について

現在の画面で選択できるコネクタとアクションを一覧化し、各アクションへDataViewerの表示パターンを仮割当した調査資料である。表示パターンは検討中であり、Current Specificationや実装済み挙動を表すものではない。

- コネクタ: 12件
- アクション: 39件
- 画面から選択できない抽象基底`BaseConnector`は対象外
- `WindowsConnector.loop_tasks`はConnector本体ではなくWorkflowEngineの専用経路で実行される
- Windows系コネクタの物理分割は[TASK-024](../tasks/active/TASK-024-split-windows-connector-responsibilities.md)で別途扱う
- Pattern A〜Fに基づく個別表示の実装は[TASK-025](../tasks/active/TASK-025-implement-action-specific-data-viewer-policies.md)で別途扱う

## 表示パターン（仮）

| Pattern | 用途 | 帳票 | 表示名 | データ型 | カラム説明 | 出力・取込対象からの列除外 |
|---|---|---|---|---|---|---|
| A | スキーマ暗黙解釈・データ取得 | 取得・加工結果を表示 | 変更不可 | 変更不可 | 不要 | 不可 |
| B | スキーマ指定・ファイル取込 | 取得結果を表示 | 変更可 | 変更可 | 不要 | 可 |
| C | スキーマ指定・ファイル出力 | データ本体ではなく実行結果メタ情報を表示 | 変更可 | 変更可 | 不要 | 可 |
| D | スキーマ指定・DB出力 | データ本体ではなく実行結果メタ情報を表示 | 変更可 | 変更可 | 必要 | 可 |
| E | 外部操作・成果物作成 | 取得系は結果本体、それ以外は実行結果メタ情報を表示 | 変更不可 | 変更不可 | 不要 | 不可 |
| F | 実行制御 | 不要 | 不要 | 不要 | 不要 | 不可 |

### 仮割当の考え方

- Pattern Cは`CSVConnector.write_csv`と`ExcelConnector.write_excel`に割り当てる。
- Pattern Dは`BQConnector.load_data`と`DuckConnector.create_table`に割り当てる。
- Pattern Eのうち検索・取得系は結果本体を表示し、操作・file作成・可視化系は実行結果メタ情報を表示する。
- `DuckConnector.create_db_file`と`VectorConnector.embedding_vector_db`はschema編集を持たないため、現時点ではPattern Eへ仮置きする。
- Pattern Fは現在`WindowsConnector`に含まれるが、将来は独立したControl系コネクタへ分離する。

# データ系コネクタ

## 1. BigQuery — `BQConnector`

Google BigQueryに対してSQLを実行し、データの取得やテーブルへのロードを行う。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| SQL実行 | `execute_sql` | A | 画面に入力したSQLをBigQueryで実行し、結果を取得する。 |
| SQL実行（ファイル） | `execute_sql_file` | A | SQLファイルを読み込み、BigQueryで実行する。 |
| データロード | `load_data` | D | 前段のデータをBigQueryの指定テーブルへ書き込む。 |

## 2. DuckDB — `DuckConnector`

ローカルのDuckDBファイルを作成し、SQL実行やテーブル作成を行う。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| DBファイル作成 | `create_db_file` | E | 指定した場所に新しいDuckDBファイルを作成する。 |
| SQL実行（ファイル） | `execute_sql_file` | A | SQLファイルを読み込み、指定したDuckDBで実行する。 |
| SQL実行 | `execute_sql` | A | 画面に入力したSQLを指定したDuckDBで実行する。 |
| テーブル作成 | `create_table` | D | 前段のデータからDuckDB内にテーブルを作成する。 |

## 3. Excel — `ExcelConnector`

Excelブックからのデータ取得と、Excelファイルへの書き込みを行う。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| 読み込み | `read_excel` | B | Excelのシート、ヘッダー行、データ開始行を指定して読み込む。 |
| 書き込み | `write_excel` | C | 前段のデータをExcelファイルへ書き込む。 |
| エリア指定読み込み | `read_excel_range` | B | Excelのセル範囲を指定してデータを読み込む。 |

## 4. CSV — `CSVConnector`

CSV・TSV・テキスト形式の表データを読み書きする。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| 読み込み | `read_csv` | B | 文字コードや区切り文字などを指定して表データを読み込む。 |
| 書き込み | `write_csv` | C | 前段のデータを指定した文字コードと区切り文字で出力する。 |

## 5. Python実行 — `PythonConnector`

指定したPython環境でスクリプトを実行する。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| Python実行 | `execute_python` | A | 入力したPythonスクリプトを実行し、その戻り値を後続処理へ渡す。 |

## 6. データ加工 — `DataintegrationConnector`

前段から受け取った表データの列名や行を加工する。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| フィールド名をRENAMEリストから変更 | `replace_fields_forrenamelist` | A | RENAMEリストの規則に基づいて列名を変更する。 |
| 条件指定 | `filter_rows` | A | 指定した条件に一致する行へデータを絞り込む。 |

## 7. VectorDB — `VectorConnector`

表データをベクトル化して検索用データベースを構築し、類似検索を行う。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| ベクトルDB構築 | `embedding_vector_db` | E | 指定列のテキストをベクトル化して検索用DBへ保存する。 |
| ベクトル検索 | `search_vector_db` | A | 入力した文章に近いレコードをベクトルDBから取得する。 |

# ワーク系コネクタ

## 8. Shell — `ShellConnector`

Windowsのバッチファイルを外部プロセスとして実行する。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| バッチ実行 | `execute_bat` | E | 指定したBATファイルを引数付きで実行する。 |

## 9. Selenium — `SeleniumConnector`

Seleniumのブラウザーセッションを使ってWebページを操作する。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| ページを開く/遷移 | `navigate` | E | 許可されたURLを開く、または現在のページから移動する。 |
| DOM操作 | `dom_action` | E | 要素のクリック、入力、選択、キー操作、スクロールなどを行う。 |
| DOM取得 | `dom_get` | A | ページ内の要素からテキストや属性などを取得する。 |
| 待機 | `wait` | E | 時間、要素の出現、URLなどの条件を満たすまで待機する。 |
| スクリーンショット | `screenshot` | E | 現在のページまたは指定要素を画像として保存する。 |

## 10. Chrome — `ChromeConnector`

URLを利用者のChromeで開くための単機能コネクタである。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| Chromeでページを開く | `open_in_chrome` | E | 許可されたURLを外部のChromeへ渡して開く。 |

## 11. Windows操作 — `WindowsConnector`

現在はfile操作、外部入力、実行制御を1つのコネクタが担当している。将来は責務ごとに3コネクタへ分割する。

### File操作（将来の`WindowsFileConnector`候補）

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| ファイル名変更＆移動 | `rename_and_move_file` | E | 対象ファイルの名前を変更し、指定したフォルダーへ移動する。 |
| ファイル名検索 | `search_files_by_name` | A | 指定フォルダー内から名前の条件に合うファイルを検索する。 |
| ファイル内の文字列検索 | `search_text_in_files` | A | 対象ファイルの内容から指定文字列を検索する。 |
| マークダウンを作成 | `create_markdown_file` | E | 指定した内容でMarkdownまたはテキストファイルを作成・更新する。 |

### 外部入力（将来の`WindowsInputConnector`候補）

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| マウスクリック | `mouse_click` | E | 指定座標または現在位置でマウスをクリックする。 |
| 文字列入力 | `input_text` | E | 現在選択されている入力先へ文字列を入力する。 |
| キー入力 | `send_keys` | E | 通常キーや修飾キーの組み合わせを送信する。 |

### 実行制御（将来の`ControlConnector`候補）

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| 変数定義 | `define_values` | F | ワークフロー内で使用する名前と値を定義する。 |
| 繰り返し処理 | `loop_tasks` | F | 対象データの各行に対して内側のステップを繰り返す。実行はWorkflowEngineが担当する。 |
| 待機 | `wait` | F | 指定した時間だけ処理を停止して待機する。 |

## 12. Plotly — `PlotlyConnector`

前段の表データを使ってグラフや可視化成果物を作成する。

| アクション | Action ID | Pattern | 説明 |
|---|---|---|---|
| 棒＋折れ線グラフ | `plot_combined_bar_line` | E | 棒グラフと折れ線グラフを組み合わせて出力する。 |
| 積み上げ棒グラフ | `plot_stacked_bar` | E | 複数系列を積み上げた棒グラフを出力する。 |
| スコアカード | `plot_scorecard` | E | 指定した値を指標カードとして出力する。 |
| ファネルチャート | `plot_funnel` | E | 段階ごとの件数や値をファネル形式で出力する。 |
| レーダーチャート | `plot_radar` | E | 複数指標を放射状のレーダーチャートで出力する。 |

## 仮割当の集計

| Pattern | Action数 |
|---|---:|
| A | 11 |
| B | 3 |
| C | 2 |
| D | 2 |
| E | 18 |
| F | 3 |
| 合計 | 39 |

## 照合結果

- UIカタログの39アクションについて、対応するConnector実装またはWorkflowEngine専用経路を確認した。
- Backendにだけ存在し、現在のUIカタログから選択できるものとして追加すべきアクションは確認されなかった。
- 本資料のPatternは仮割当であり、分類、名称変更、追加・削除、実装着手を決定するものではない。
