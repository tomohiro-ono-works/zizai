# v23 Migration Final Verification

## Status

In Progress — WP-AUDIT／WP-STATIC／WP-IGNORE／WP-AUTO complete、WP-EXEC pending

## Scope

TASK-015の最終合否に必要なEvidenceを段階的に記録する。本Reportは調査記録であり、単独でCurrent Specificationを変更しない。

## WP-AUDIT Task Status / Evidence preflight

Date: 2026-09-08

### Method

- `docs/tasks/active/`と`docs/tasks/done/`の全27 Taskについて、ID、配置、Status、Completed、Evidence、Remaining、Exact next actionを機械走査した。
- TASK-017 §11 Applied Task graphと各TaskのDependenciesを照合した。
- Task文書内のMarkdown相対linkについて参照先の存在を確認した。
- TerraはStatus／依存Graph、LunaはEvidence／参照、Claude Opusは両者を独立に読取reviewし、Codexが一次文書へ再照合した。
- Applicationコード、Testコード、資産、branch、commit、pushは変更せず、Test suiteも再実行していない。

### Result

- Task IDはTASK-001～TASK-027の27件で、重複0、欠番0。
- doneはTASK-001～014、TASK-016～019の18件で全件Completed系Status。activeはTASK-015がIn Progress、TASK-020～027がDeferredで配置不整合0。
- TASK-017 §11のCritical Pathと、初期release依存TASK-001～014／016～019のDependenciesに閉路・順序矛盾0。
- 初期releaseをBlockする実作業未完は0。TASK-020～026は初期release後、TASK-027はTASK-015後の有償BigQuery実接続検証として依存外。
- Markdown相対linkの不存在0。

### Corrected documentation defects

- TASK-015の「8 library」を承認済み7 libraryへ更新し、`zizai-sqlflow-designer`除外を明記した。
- TASK-015の依存外TaskをTASK-020～027まで分類し、「未完了0」を初期release blockerへ限定した。
- TASK-018へ7 library化のPost-completion amendmentと現行Evidenceを追加した。
- TASK-014の曖昧な追加Task依存を初期release Taskへ限定した。
- TASK-008／Verification Contractへ`RISK-CONFIG-001`と`RISK-FS-001`の解消先・PASS実績を反映した。
- TASK-016の将来項目をDeferredへ分離し、Remaining／Exact next actionの自己矛盾と不存在の一時report参照を解消した。
- TASK-017 Handoffの現行Task linkを`active/`から`done/`へ更新した。

### Non-blocking observations

- TASK-020～027は未着手のため、実装Evidenceがないこと自体はStatusと整合する。開始判断の根拠は各TaskのSource／Completedへ記録されている。
- TASK-026が参照する`.agents/skills/`は本Worktree直下にはなく、親Repositoryの運用資産である。TASK-026開始時に実行場所とEdit Scopeを再確認する。
- 1 YAML内の複数独立flowは初期release外としてTASK-016に記録されているが、専用Task IDは未付与。初期releaseのblockerではない。

## Remaining verification

- WP-EXECの代表dataflow／workflow実行とProject owner確認。

## WP-STATIC Repository / contract static verification

Date: 2026-09-08

Status: PASS

- `uv lock --check --offline`: exit 0、165 packages。
- canonical `static-analysis`: 初回は既知の`C:\Users\tomoh\AppData\Local\Temp\pytest-of-tomoh` ACL不整合により4 setup errors。Worktree内の新規ignored `.tmp/task015-static-20260908-a`を`--basetemp`として同一Gateを再実行し、`113 passed, 155 deselected`、exit 0。
- working treeでは正式entrypoint／imports、Target Tree、7 Frontend library、external URLのFrontend/backend二重境界、BigQuery非課金範囲に不整合を検出しなかった。
- 初回監査でApplication Source 7件、docs 11件、Test 4件の計22件が未追跡であることを検出した。Project owner承認後、初期release対象を全てstagingし、未追跡file 0、旧Canvas index残り0へ解消した。
- 正本仕様・Task・専用Testがない`nlp_connector.py`とconnector inventory登録はProject owner判断により初期release候補から除外した。connector inventoryは12件で整合している。
- staging後に新規Test 4件をcanonical source manifestへ追加し、manifest Test `3 passed`、canonical static-analysis `113 passed, 155 deselected`を確認した。
- `git diff --cached --check`違反0を確認した。
- BigQuery実資格情報、実接続、実queryは使用していない。

## WP-IGNORE Source / generated ignore review

Date: 2026-09-08

Status: PASS

### Initial findings

- generated／local代表path（`logs/`、cache、venv、Playwright artifact、runtime recent state）は意図どおりignoreされる。
- `git ls-files -ci --exclude-standard`は2件。Project owner承認済みでworking treeから削除済みの`core/テスト.ipynb`と`scripts/requirements_inventory.csv`が、commit前のためindex上でtracked-ignoreとして残る。
- root `.gitignore`の`scripts/`は全階層の同名directory、`*.ps1`と`*.ipynb`は全階層を対象にし、将来の追跡対象Sourceを隠せるbulk ruleである。
- `!.codex-harness/scripts/*.ps1`と`!.agents/skills/**/scripts/*.ps1`は、後段のroot `/.codex-harness/`／`/.agents/` ignoreにより実効しない。
- 初回監査時点では`.gitignore`を変更せず、rule変更をProject owner判断待ちとした。

### Project owner decision and application

- Task成果物21件はGit対象とする。
- 正本仕様・Task・専用Testがない未追跡`apps/connectors/nlp_connector.py`は初期releaseへ含めず、fileとconnector inventory登録を削除する。
- `scripts/`と`*.ps1`のbulk ignoreを廃止し、`*.ipynb`は維持する。bulk ruleに依存していた例外行は削除する。
- 承認内容を適用し、`scripts/`と`*.ps1`は追跡可能、`*.ipynb`は引き続きignoreされることを代表pathで確認した。bulk ruleに依存していた無効・冗長な例外行は削除した。
- 全現行差分のstaging後、`git ls-files -ci --exclude-standard`は0件となり、tracked-ignoreを解消した。

## WP-AUTO Automated release candidate gate

Status: PASS

- 2026-09-08、管理者PowerShellでcanonical `required` Gateを実行した。static-analysis `113 passed`、unit `98 passed`、integration `46 passed`。symlink security Testを含め失敗・skip 0、既知のPandas deprecated warning 6件のみ。詳細logは`.tmp/task015-required-admin.log`（SHA-256 `F7EB88D0AFC694AF4FB32CBC1AD6FB756CF9F5F2BFB84BE2619AFF1A7DCECAE4`）。
- canonical `e2e` GateはPython `4 passed, 264 deselected`、Playwright `137 passed`。詳細logは`.tmp/task015-e2e.log`（SHA-256 `F842CEF990E9DB0A9908A9362856EF583DE8E384B475CD47C8FF4B8A1B6331B1`）。
- pytest既定TempのACL不整合を避けるため、ignoredなWorktree内`.tmp/task015-*`を`--basetemp`に使用した。Source変更ではない。
- 有償BigQuery実接続は対象外とし、contract／mock／静的確認だけを本Gateに含めた。実接続はTASK-027で実施する。

## WP-EXEC Release workflow execution gate

Status: FAIL — UI不具合を検出、表示対象の特定待ち

- 2026-09-08のProject owner手動確認で、workflow実行時に表示されるmenuが右端で見切れ、2回目以降は表示されない事象を確認した。
- 現時点では対象がnode context menuか実行完了dialogかを確定できていないため、製品コードを推測修正せず、画面または操作手順を照合してから責務箇所を特定する。
- 未実施をPASS扱いにせず、dataflow／workflowの完走確認は本事象の解消後に再実施する。
