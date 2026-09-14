# zizai

ローカル環境で動作する、PySide6 + WebView ベースのデータ加工 / ワークフロー作成アプリです。  
主な用途は、非エンジニア向けの ETL、業務自動化、SQL 作成補助です。

![zizai icon](apps/gui/icons/ziz.svg)

## 作業ルールと正本

- 常時ルール: [AGENTS.md](AGENTS.md)
- ドキュメント索引: [docs/README.md](docs/README.md)
- 現行仕様: [architecture.md](docs/features/architecture.md), [coding-rules.md](docs/features/coding-rules.md), [refactor-policy.md](docs/features/refactor-policy.md)
- 作業状態: `docs/tasks/active/`, `docs/tasks/done/`
- 承認済み判断・引継ぎ: `docs/decisions/`, `docs/handoffs/`
- 再利用手順（local-only補助。正本ではない）: `.agents/skills/`

## 概要

`zizai` は Windows ローカル環境で動くデスクトップアプリです。  
ネイティブ側は `PySide6`、UI は `Qt WebEngine` 上の HTML / CSS / JavaScript で構成しています。

現在の主要モード:

- ワークフロー作成
- データフロー作成
- 入力フォーム作成

## 主な機能

### データフロー

- Excel / CSV / JSON / BigQuery からの読込
- Excel / CSV / JSON / BigQuery への出力
- データ加工コネクタ
  - RENAME リストからのフィールド名変更
  - 行フィルタ
- Windows 操作コネクタ
  - ファイル名変更＆移動
  - ファイル名検索
  - ファイル内文字列検索
  - Markdown 作成
- Web / Slack / Windows 操作系コネクタの一部利用

### ワークフロー

- ブラウザ操作
- Slack 操作
- Windows 操作
- API 実行

## セキュリティ方針

- WebView 自体の外部通信は制限
- 外部ナビゲーションは制限
- DevTools は通常起動では無効
- `--debug` 起動時のみ DevTools 利用可
- API / Web 接続制御は `apps/common/config/security_policies.yml` で管理
  - `apis.profiles`
  - `web.allowlist`

補足:

- `api_profile.certificate` の Windows 証明書ストア実解決は未実装です

## ディレクトリ構成

```text
apps/
  cli/
    main.py
  common/
    config/
    contracts/
      bridge/
      web-frame/
  connectors/
  core/
  desktop/
    bridge.py
    host.py
  gui/
    css/
    img/
    icons/
    js/
    modal/
bin/
config/
template/
workflows/
zizai.py
pyproject.toml
uv.lock
```

主な役割:

- `zizai.py`
  - 起動エントリポイント
- `apps/cli/main.py`
  - フロー実行エンジン（ヘッドレス実行用途）
- `apps/desktop/host.py`
  - Qt / WebView ホスト
- `apps/desktop/bridge.py`
  - WebView と Python の bridge
- `apps/connectors/`
  - コネクタ実装
- `apps/core/`
  - 共通ロジック
- `apps/common/contracts/bridge/`
  - Bridge Protocol の言語中立な正本
- `apps/common/contracts/web-frame/`
  - 同梱`dataflow.html`内部Frame通信の言語中立な正本
- `apps/gui/`
  - フロントエンド UI

## 起動方法

依存環境は `uv.lock` に固定されています。初回および lock に変更があった場合は、Repository root で次を実行してください。

```powershell
uv sync --frozen
```

Windows では通常 `bin\ziz.bat` から起動します。`.venv` の Python で `zizai.py` に引数を渡す launcher です。

```powershell
.\bin\ziz.bat
```

DevTools を有効にする場合:

```powershell
.\bin\ziz.bat --debug
```

ヘッドレス実行（タスクスケジューラ向け）:

```powershell
.\bin\ziz.bat "C:\path\to\flow.zizd"
```

直接起動する場合:

```powershell
uv run --frozen python zizai.py
```

Linux では `bin/ziz.sh` から起動します。Windows 版と同じく `.venv` の Python に引数を渡します。

```sh
sh bin/ziz.sh
sh bin/ziz.sh --debug
sh bin/ziz.sh /path/to/flow.zizd
```

## 設定ファイル

### `apps/common/config/security_policies.yml`

外部接続のポリシーを管理します。

例:

```yaml
version: 1

apis:
  profiles:
    sales_orders_api:
      base_url: "https://api.example.com/orders"
      timeout_sec: 30

web:
  allowlist:
    - domain: "fonts.google.com"
      path_prefixes:
        - "/icons"
```

### `apps/common/config/rename.csv`

RENAME リストから列名を一括変更するためのサンプル CSV です。

### `config/recent_flows.json`

最近使ったファイルのローカル履歴です。  
ローカル運用前提のファイルです。

## 保存形式

- データフロー: `.zizd`

## 主なショートカット

- `Ctrl+S`
  - 保存
- `Ctrl+Enter`
  - 実行

## 依存ライブラリ

Python 依存の正本は [pyproject.toml](pyproject.toml) と lockfile [uv.lock](uv.lock) です。
同梱 Frontend library の取得元・commit・license は [apps/gui/vendor/README.md](apps/gui/vendor/README.md) に記録しています。

## ライセンス補足

このプロジェクトは `PySide6` を利用しています。  
`PySide6` は Qt for Python として LGPL 系ライセンスで提供されています。  
実際の配布形態では、同梱方法とライセンス条件を別途確認してください。

CodeMirror 5.65.16 
ReDoS は Regular Expression Denial of Service です。
正規表現の処理に時間がかかりすぎて、アプリが極端に重くなったり止まったりする問題があるバージョン


logistroを利用
マイナーなため、情報少なめ。後でライブラリ変更するかも


MouseInfo
GPLv3+ だからです。MIT/BSD/Apache 系と違って、再配布や組み込み配布のときに条件が重くなります。

orjson です。
危険という意味ではなく、ライセンス構成が単純ではないため、社内台帳には「MIT」だけでなく MPL-2.0 AND (Apache-2.0 OR MIT) と正確に書いておく方がよいです。
