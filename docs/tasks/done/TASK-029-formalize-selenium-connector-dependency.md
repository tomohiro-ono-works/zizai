# TASK-029 Formalize Selenium Connector Dependency

## Status

Completed — 2026-09-14

## Goal

Current SpecificationのSelenium Connectorを、`.venv/` + uvの正式環境で再現可能にする。`selenium`を`pyproject.toml`／`uv.lock`の正式依存にし、旧pip前提の案内を解消し、browserを起動しないcontract testで依存欠落の再発を防ぐ。そのうえで、旧`.env/`の削除を妨げる有効依存が残っていないか再判定する。

## Scope

- `selenium`をexact pinの直接依存として`pyproject.toml`へ追加し、推移依存を`uv.lock`でuvに解決させる。
- `apps/connectors/selenium_connector.py`の依存不足エラーを、正式依存の不足とuvのsetup手順（`uv sync --frozen`）が分かる表現にする。
- browser、driver、network、user profileを使わないSelenium Connector contract testを追加し、tracked test manifestへ登録する。
- `.venv/`でimport、非外部通信部分、関連Testを確認し、`.env/`の削除可否を再判定する。

## Out of scope

- `.env/`自体の削除。
- 実browser起動、外部URLアクセス、login、CAPTCHA、user profile利用を伴う確認。必要な場合は別のintegration／manual確認とする。
- Selenium Connectorのaction挙動、Chrome起動引数、Selenium Managerによるdriver解決方式、Current Specificationの変更。
- 既存直接依存（例: `certifi`）のversion変更。
- 他Connectorに残る`pip install`案内の修正。
- local-only資産（`test.ipynb`、VS Code interpreter／kernel cache、local-only Skill、untracked shortcut Script）の更新。

## References

- Current Specification: [Connector Contract](../../features/connectors.md)の`SeleniumConnector`
- 現行Source: `apps/connectors/selenium_connector.py`、`apps/core/security_policies.py`、`apps/gui/config/config.js`
- 現行action一覧（non-canonical）: [Current Connector and Action Inventory](../../handoffs/current-connector-action-inventory.md)
- 依存管理: `pyproject.toml`、`uv.lock`、[TASK-009](../done/TASK-009-migrate-python-toolchain-to-uv.md)
- Web URL境界: [TASK-019](../done/TASK-019-enforce-external-url-scheme-boundary.md)
- Verification: [v23 Migration Verification Contract](../../handoffs/v23-migration-verification-contract.md)、`tests/fixtures/contracts/tracked-test-sources.json`
- 旧Test（Git履歴のみ）: [v23 Orphan WIP Disposition](../../handoffs/v23-orphan-wip-disposition.md)の`test_selenium_connector.py`

## Constraints

- 依存の正本は`pyproject.toml`／`uv.lock`とし、`requirements*.txt`方式へ戻さない。直接依存は`selenium`だけを追加し、推移依存はuvに管理させる。
- 既存lock済みpackageのversionを変更しない。`selenium`のversionは、旧`.env/`で使っていた4.44.0を上限の参考にし、大幅なupgradeをしない。
- Application内から依存を自動installしない。
- Testはbrowser、driver、network、user profileを使わない。固定case数を持つRISK-CONN-002へ混ぜない。
- `.env/`を実行環境として使わない。

## Acceptance Criteria

- `pyproject.toml`に`selenium`のexact pinが1件追加され、`uv lock --check`が成功し、既存packageのversion変更が0件である。
- `.venv/`で`selenium`とSelenium Connectorをimportでき、Connectorが使うSelenium APIが存在する。
- 依存不足時のエラーが、正式依存の不足と`uv sync --frozen`を示し、`pip install`を含まない。
- 追加したcontract testが、action routing、未知action、必須parameter不足、許可外URL、navigate前のpage操作、依存不足を、browserを起動せずに検証してPassする。
- Static Gate、Remote Safe Gate、`git diff --check`がPassする。
- `.env/`削除可否の再判定結果が記録されている。

## Edit Scope

- `pyproject.toml`、`uv.lock`
- `apps/connectors/selenium_connector.py`（依存不足エラーのみ）
- `tests/unit/test_selenium_connector_contract.py`、`tests/fixtures/contracts/tracked-test-sources.json`
- 本Task

## Evidence

2026-09-14時点の記録。

- 正式機能の根拠: Current Specificationが`SeleniumConnector`の正式action 5件を定義し、`apps/gui/config/config.js`のaction定義も同じ5件である。Connector inventory（12 module/class pair）に含まれ、user workflowも`navigate`、`dom_get`、`dom_action`を使用している。一方、`selenium`は`requirements*.txt`時代から`pyproject.toml`／`uv.lock`まで一度も宣言されておらず、正式環境では実行できなかった。Selenium ConnectorのPython Testは存在しなかった。
- version選定: `selenium==4.44.0`は`certifi>=2026.2.25`を要求し、既存pin `certifi==2026.1.4`と両立しない（`uv lock`で解決不能）。既存pinを変えずに解決できる4.44.0以下の最新版として`selenium==4.43.0`を採用した。
- `uv lock`: 175 packagesを解決し、`selenium`と推移依存9件（`attrs`、`outcome`、`pysocks`、`sniffio`、`sortedcontainers`、`trio`、`trio-websocket`、`websocket-client`、`wsproto`）を追加した。既存packageのversion変更は0件で、既存blockの差分は`cffi`依存markerの補完と`urllib3`の`socks` extra定義だけである。`uv lock --check`はexit `0`。
- `uv sync --frozen`: 12 packagesをinstallした（上記10件と、`trio`がWindowsで要求する既存lock済みの`cffi`、`pycparser`）。uninstallは0件。
- `.venv/`確認: `sys.prefix`は`.venv`、`selenium` 4.43.0のimport、Connectorのimportと初期化、同梱Selenium Managerの存在を確認した。`.env/`は使用していない。
- Test: 追加contract test 22 passed、unit Gate 120 passed、Static Gate 134 passed、Connector discovery integration test 2 passed、Remote Safe Gate PASS、`git diff --check` exit `0`。
- driver／browser: Connectorはdriver pathを指定せず、Selenium Managerがdriverを解決する。PATH上にchromedriverはなく、user profileのSelenium Manager cacheと、installed Chromeを使用する。起動時に`--user-data-dir`を指定しないため、利用者のbrowser profileは使わない。
- `.env/`再判定: `.env/`だけにあるpackageは5件（Notebook表示用の`ipywidgets`系3件、参照0件の`sqlglot`、`pip`）となり、Project・local作業とも`.env/`を必要とする有効依存は残っていない。判定は「A. 削除可能」。`.env/`は削除していない。

## Remaining Work

- なし。Acceptance Criteriaを満たした。以下は本Taskの完了条件に含めない。
- Optional／Follow-up: 実browserを使うSelenium Connectorのsmoke確認（`.venv/`での起動、許可URLへの遷移、Selenium Managerによるdriver取得通信を含む）。必要な場合は承認のうえ別途行う。
- Follow-up候補（本Taskで変更していない境界）: Selenium Managerのdriver取得はWeb allowlistの対象外でnetwork通信を伴い得る。Chromeは`--no-sandbox`付きで起動する。`screenshot`の保存先pathはworkspace境界で制限していない。
- Local cleanup（Project変更ではない）: 旧`.env/`の削除と、local-only資産（VS Code interpreter／kernel、local-only Skill、untracked shortcut Script）の更新。
