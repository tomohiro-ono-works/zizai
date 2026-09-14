# TASK-031 Define Dashboard Chart Types and Default Settings

## Status

Deferred — 未確定要件と設計候補の保全のみ。このTaskでは実装しない。着手時期と採否はProject ownerが決定する。

## Goal

Dashboardのグラフ種別と表示設定の既定値（幅、高さ、Dashboard名、色、背景色）の要件を確定し、既定値をYAMLで管理してHTML生成時に参照する方式を、Project ownerが承認できる設計案にする。

## Scope

- `Remaining Work`に保全した未確定要件 / 設計候補の採否、具体値、単位の確定。
- Dashboardの対象範囲（どの機能・画面・ConnectorがHTMLを生成するか）の特定。
- グラフ種別対応表の意味（名称の置換か、種別の対応付けか）と、採用するグラフ種別一覧の確定。
- 既定値を持つYAML設定の配置、key構成、既定値の優先順位、未設定・不正値時の扱いの設計案。
- HTML生成時にYAML設定を参照する経路の設計案。
- 確定した要件をCurrent Specificationへ反映する場合の変更案と、実装を行う後続Taskの定義。

## Out of scope

- Dashboard機能の実装、Test追加、既存Connectorの変更。
- Project ownerの承認前に、Current Specificationへ要件を追加すること。
- DataViewerの表示Pattern（TASK-025）の範囲。
- 出典memoにない要件を、確定要件として追加すること。

## References

- 出典: local-only `.docs/memo.txt`（2026-09-14作成。要望の全内容を本Taskの`Remaining Work`へ移したうえで削除）
- HTMLを出力する既存実装（Dashboardとの関係は未確定）: `apps/connectors/plotly_connector.py`（`mode`によるPNG／HTML出力。現行paramsに幅、高さ、色、背景色の指定はない）、`apps/gui/config/config.js`のPlotlyConnector定義
- 名称整合の確認先: [Frontend Libraries](../../features/frontend-libraries.md)（DataViewerの「帳票」表示）
- Current Specification: [Connector Contract](../../features/connectors.md)、[Frontend](../../features/frontend.md)
- 外部依存: [Coding Rules](../../features/coding-rules.md)の`External dependencies`（YAML処理には既存の正式依存`PyYAML`がある）

## Constraints

- 本Taskの`Remaining Work`は未確定要件と設計候補であり、Current Specificationとして扱わない。
- 要件確定とProject ownerの承認前に実装しない。Current Specificationを変更する場合は、変更案を示して承認を得る。
- 出典memoの記載を超える要件や解釈は、候補として区別して記録し、Project ownerの確認を得る。
- 外部依存を追加・更新する場合は、Coding Rulesの`External dependencies`に従う。

## Acceptance Criteria

- `Remaining Work`の各要件 / 設計候補について、採用・不採用・変更と確定値（単位を含む）が記録されている。
- Dashboardの対象範囲とHTML生成経路が特定されている。
- グラフ種別対応表の意味と、採用するグラフ種別一覧が確定している。
- YAML設定のkey構成、既定値、優先順位、未設定・不正値時の扱いを含む設計案が、Project ownerに承認されている。
- Current Specificationの変更案、または実装を行う後続Taskが作成されている。

## Remaining Work

### 未確定要件 / 設計候補（出典memoの記載。Current Specificationではない）

1. 高さの既定値を100にする（単位の記載なし）。
2. 高さを20刻みで変更できるようにする。
3. 自由記述（任意値の入力）もできるようにする。出典memoでは高さの記述に続けて書かれており、対象が高さに限られるかは未確定。
4. 幅、高さ、Dashboard名、色、背景色の既定値を決める設定を持つ。出典memoでは「など」とあり、対象項目は追加の余地がある。
5. 4の既定値をYAMLで設定できるようにし、HTML生成時にその値を参照する。

### グラフ種別対応表（出典memoの記載のまま）

左右の対応の意味（旧名称から表示名への置換か、種別の対応付けか）は未確定。

| 出典memoの左側 | 出典memoの右側 |
| --- | --- |
| 土台シート | 帳票 |
| 棒グラフ | 棒グラフ |
| KPI カード | KPIカード |
| ヒートマップ付きクロス集計 | クロス集計（ヒートマップ） |
| 散布図の四象限 | 散布図（四象限） |

- 出典memoには「データソース」という見出しもあったが、内容の記載はなかった。
