# Vendored Frontend Libraries

- Status: Current Specification
- Contract: `docs/features/frontend-libraries.md`
- Decision: `docs/decisions/ADR-frontend-library-vendoring.md`
- Task: `docs/tasks/active/TASK-016-adopt-approved-frontend-libraries.md`

## Purpose

このディレクトリは、TASK-016で承認された7 Frontend libraryの`src/`treeと`LICENSE`をlocal `file://` assetとして同梱する。Applicationは本ディレクトリ配下のassetだけを読み込み、GitHubその他のremote sourceを実行時に参照しない。

`apps/gui/vendor/js-yaml/`は本Work Packageの対象外であり、変更しない。

## Update policy

- upstream更新は自動追従しない。
- upstream repository側の不具合修正やmigrationが必要になった時点で、対象repositoryでTest-firstに修正し、library単体とApplication結合Gateを通過した新しいcommitを確定してから、そのSHAのsourceを再取得してこのディレクトリを置き換える。
- vendor copyへの直接patchは行わない。
- 同梱内容の変更履歴はApplication repositoryのGit履歴で追跡する。別のfile hash台帳は作らない。

## Vendored libraries

### zizai-app-shell

- Source: https://github.com/tomohiro-ono-works/zizai-app-shell
- Commit: 4b81f4ad4762e8ddd3d89d413874f71ecf84856b
- License: `apps/gui/vendor/zizai-app-shell/LICENSE`
- Runtime load order (`file://`, in order):
  1. `apps/gui/vendor/zizai-app-shell/src/00_tokens.css`
  2. `apps/gui/vendor/zizai-app-shell/src/ui-shell.css`
  3. `apps/gui/vendor/zizai-app-shell/src/shell_types.js`
  4. `apps/gui/vendor/zizai-app-shell/src/shell_events.js`
  5. `apps/gui/vendor/zizai-app-shell/src/shell_dom.js`
  6. `apps/gui/vendor/zizai-app-shell/src/shell_layout.js`
  7. `apps/gui/vendor/zizai-app-shell/src/shell_regions.js`
  8. `apps/gui/vendor/zizai-app-shell/src/shell_tabs.js`
  9. `apps/gui/vendor/zizai-app-shell/src/shell_tab_interactions.js`
  10. `apps/gui/vendor/zizai-app-shell/src/shell_activitybar.js`
  11. `apps/gui/vendor/zizai-app-shell/src/shell_shortcuts.js`
  12. `apps/gui/vendor/zizai-app-shell/src/app_shell.js`

### zizai-catalog-panel

- Source: https://github.com/tomohiro-ono-works/zizai-catalog-panel
- Commit: 3141ba66d583eaa6d6947d42e572f31428eefc69
- License: `apps/gui/vendor/zizai-catalog-panel/LICENSE`
- Runtime load order (`file://`, in order):
  1. `apps/gui/vendor/zizai-catalog-panel/src/catalog-panel.css`
  2. `apps/gui/vendor/zizai-catalog-panel/src/catalog-store.js`
  3. `apps/gui/vendor/zizai-catalog-panel/src/catalog-panel.js`

### zizai-data-viewer

- Source: https://github.com/tomohiro-ono-works/zizai-data-viewer
- Commit: 07ed40e496ddf5795811260b48f71d0d3a6ef527
- License: `apps/gui/vendor/zizai-data-viewer/LICENSE`
- Runtime load order (`file://`, in order):
  1. `apps/gui/vendor/zizai-data-viewer/src/report-viewer.css`
  2. `apps/gui/vendor/zizai-data-viewer/src/report-viewer.js`

### zizai-editor-markdown

- Source: https://github.com/tomohiro-ono-works/zizai-editor-markdown
- Commit: 39f14305c1c6d9994fa6427cf805ffc8b3b02c69
- License: `apps/gui/vendor/zizai-editor-markdown/LICENSE`
- Runtime load order (`file://`, in order):
  1. `apps/gui/vendor/zizai-editor-markdown/src/markdown_editor.css`
  2. `apps/gui/vendor/zizai-editor-markdown/src/markdown_editor.js`

### zizai-form

- Source: https://github.com/tomohiro-ono-works/zizai-form
- Commit: f08bfc73350d04e9238b43fa4dbcfdb81fa5150e
- License: `apps/gui/vendor/zizai-form/LICENSE`
- Runtime load order (`file://`, in order):
  1. `apps/gui/vendor/zizai-form/src/node-form.css`
  2. `apps/gui/vendor/zizai-form/src/node-form.js`

### zizai-highlighter-sql

- Source: https://github.com/tomohiro-ono-works/zizai-highlighter-sql
- Commit: 9306ca2c87d5ba2857639f77c02d8fd8b1dfb4ed
- License: `apps/gui/vendor/zizai-highlighter-sql/LICENSE`
- Runtime load order (`file://`, in order):
  1. `apps/gui/vendor/zizai-highlighter-sql/src/sql-highlighter.css`
  2. `apps/gui/vendor/zizai-highlighter-sql/src/sql-highlighter.js`
  3. `apps/gui/vendor/zizai-highlighter-sql/src/dictionaries/bigquery.js`
  4. `apps/gui/vendor/zizai-highlighter-sql/src/dictionaries/duckdb.js`

`src/dictionaries/bigquery.json`、`src/dictionaries/duckdb.json`、`src/dictionaries/schema.json`はdictionary定義の参照用sourceであり、`file://`実行時は同内容を事前登録する`bigquery.js`/`duckdb.js`を読み込む。Adapterは`loadDialect(url)`をremote URLで呼び出さない。

### zizai-workflow-designer

- Source: https://github.com/tomohiro-ono-works/zizai-workflow-designer
- Commit: a8d1713dac14e29aa18f4723cb7c8c058e74beb2
- License: `apps/gui/vendor/zizai-workflow-designer/LICENSE`
- Runtime load order (`file://`, in order):
  1. `apps/gui/vendor/zizai-workflow-designer/src/workflow_designer.css`
  2. `apps/gui/vendor/zizai-workflow-designer/src/workflow_designer.js`

`src/designer_*.js`は`workflow_designer.js`へ事前bundleされた内部分割sourceであり、`file://`実行時に個別読み込みしない。

## License

7 libraryすべての`LICENSE`は同一著作権者(`tomohiro-ono-works`)によるALL RIGHTS RESERVEDである。同梱と利用範囲はADR記載のProject owner許諾に基づく。一般的なOSS再利用許諾ではないため、追加の頒布や第三者提供を行わない。追加のNOTICE表示義務は確認されていないため、`NOTICE.md`は作成しない。
