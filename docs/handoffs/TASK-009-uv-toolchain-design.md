# TASK-009 Python Toolchain Migration Design

- Related task: [TASK-009](../tasks/active/TASK-009-migrate-python-toolchain-to-uv.md)
- Date: 2026-08-21
- Status: Approved — design and written scope approved in chat
- Toolchain target: uv `0.12.5`, Python `>=3.11,<3.12`

## Goal

Python依存管理と再生成可能な実行環境を、`requirements*.txt`と`.env/`仮想環境から、`pyproject.toml`、`uv.lock`、`.venv/`へ移行する。正式CLIとcanonical verificationの外部commandは維持し、Application behaviorと依存versionを変更しない。

## Approved decisions

- 公式standalone版uv `0.12.5`をユーザー領域へ管理者権限なしで導入し、CIも同じversionへ固定する。
- Pythonは`>=3.11,<3.12`とし、`.python-version`へ`3.11`を記録する。
- `requirements.txt`のProduction 87件と`requirements-dev.txt`固有のDevelopment 23件を、名前・versionを変えず移行する。
- Production依存は`project.dependencies`、Development依存は単一の`dependency-groups.dev`へ定義する。
- 未使用疑いの依存削除、無関係なupgrade、platform marker追加は行わない。
- `pyproject.toml`と`uv.lock`を依存の唯一の正本とする。依存同等性と旧参照0を確認後、`requirements.txt`と`requirements-dev.txt`を削除する。
- `scripts/refresh_requirements.py`は役割を失うため、参照0を確認後に削除する。同じ機能が必要な場合も独自scriptを作らず、`uv lock`、`uv sync`等のuv標準commandを使用する。
- 既存`.env/`は削除、rename、更新を行わない。TASK-009 worktreeには既存`.env/`を持ち込まない。

## Non-goals

- Application source配置、import、Bridge、Connector、保存schemaの変更。
- 依存packageの棚卸し削除、version更新、Windows専用packageへのmarker追加。
- `connectors/python_connector.py`がworkflow parameterとして受け取る任意`env_path`の仕様変更。
- `scripts/requirements_inventory.csv`や欠落している第三者inventory文書の再設計。
- `.env`環境値fileの新規作成や内容定義。

## Existing-state evidence

- `requirements.txt`は87件、`requirements-dev.txt`は`-r requirements.txt`と固有23件を持つ。全件が`==`固定で、VCS、URL、local path、environment markerは0件である。
- `bin/ziz.bat`、`bin/ziz.sh`、`scripts/create_zizai_shortcut.ps1`、`tests/run-verification.ps1`、`README.md`が仮想環境として`.env/`を参照する。
- `.github/workflows/migration-verification.yml`のPython 4 jobsはpipと`requirements-dev.txt`を使用する。
- 現PCにuvは未導入である。
- TASK-009 worktreeで既存`.env/`を使用せず、元checkoutのPythonを読み取り実行にだけ使用したstatic baselineは30 passedである。
- Claude Code read-only reviewは上記参照、87/23件、CI parity gapを報告し、Codexが一次情報で採用判断した。

## Architecture

### Project metadata and lock

`pyproject.toml`はflat-layoutの非package Applicationとして定義する。

- `[project]`にname、version、description、`requires-python = ">=3.11,<3.12"`、Production dependencies 87件を置く。
- `[dependency-groups]`の`dev`へDevelopment dependencies 23件を置く。
- `[tool.uv] package = false`を明示し、現行root moduleをbuild/install対象へ変えない。
- build systemとpublished entrypointは追加しない。正式入口は引き続き`bin/ziz.bat`と`zizai.py`である。
- `uv.lock`はuv `0.12.5`で生成し、source管理する。
- `.python-version`は`3.11`をsource管理する。
- `.venv/`とuvが生成するcacheはsource管理しない。

### Runtime and verification invocation

- `bin/ziz.bat`は`.venv\Scripts\python.exe`、`bin/ziz.sh`は`.venv/bin/python`を使用し、引数透過とexit codeを維持する。
- `scripts/create_zizai_shortcut.ps1`の既定`pythonw.exe`を`.venv\Scripts\pythonw.exe`へ変更する。
- `tests/run-verification.ps1`の外部interfaceは変更しない。内部のPython／pytest／probe／manual validator起動は、repository rootで`uv run --frozen python ...`を使用する。
- PlaywrightはNode toolchainのままとし、Python toolchain移行へ混在させない。

### CI

- Windows Python jobsは公式`astral-sh/setup-uv`を使用し、uv `0.12.5`へ固定する。
- Python `3.11`を使用し、依存installを`uv sync --frozen`へ統一する。
- Gate/Riskの外部commandは`tests/run-verification.ps1`のまま維持する。
- Browser-only jobはPython依存を持たないため変更しない。
- workflow contract testでuv version、Python version、frozen sync、canonical runner command、pip/requirements参照0を検証する。

## Migration sequence

1. pyproject／lock／CI／launcher／旧参照0を表すstatic contract testを追加し、現状でFailすることを確認する。
2. `pyproject.toml`と`.python-version`を追加し、87件と23件を固定versionのまま定義する。
3. 公式standalone uv `0.12.5`をユーザー領域へ導入し、`uv lock`で`uv.lock`を生成する。
4. requirementsが残る状態で、正規化したdirect dependencyの名前・version集合が87件／23件とも完全一致することを機械比較する。
5. `.gitignore`へ`.venv/`を追加し、obsoleteな`requirements-dev.txt` ignoreを外す。runner、launchers、shortcut、CI、READMEをuv／`.venv`へ切り替える。
6. Code、Runtime、Test、CI、active/canonical documentationのrequirements／旧`.env` toolchain参照が0であることを確認する。
7. `requirements.txt`、`requirements-dev.txt`、`scripts/refresh_requirements.py`を削除する。
8. 新worktreeに`.venv`がない状態から`uv sync --frozen`を実行し、CLIとBaseline verificationを実行する。

## Dependency equivalence

- 比較対象はrequirementsのdirect entryだけとし、transitive dependencyは`uv.lock`が管理する。
- package名はPEP 503相当の小文字・`-`正規化後に比較し、versionは`==`右辺のliteralを比較する。
- Productionは87件、Developmentは23件、重複0件、追加0件、欠落0件、version差分0件を合格条件とする。
- 比較成功をTASK-009 Evidenceへ件数と差分0として記録してからrequirementsを削除する。
- lock解決が既存pinの変更を要求した場合は自動調整せず、対象packageとresolver errorを報告して停止する。

## Error handling and rollback

- uv未導入、lock不整合、依存解決不能、Python version不一致はPassへ読み替えずBlockedまたはFailとして区別する。
- `uv lock --check`または`uv sync --frozen`が失敗した場合、versionを緩めたりupgradeしたりしない。
- launcher parityが失敗しても`.env/`fallbackを復活させず、`.venv`生成・path・引数透過を修正する。
- RollbackはTASK-009 branchの`pyproject.toml`、`uv.lock`、`.python-version`、関連source変更を戻す。ユーザーの既存`.env/`はRollback対象にも含めない。
- `.venv/`はTASK-009 worktreeで生成するartifactであり、Git履歴へ含めない。

## Verification

- Static contract: `pyproject.toml`構造、Python／uv固定、dependency count、`.venv/` ignore、旧toolchain参照0、CI frozen sync。
- Lock: `uv lock --check`。
- Clean environment: `.venv/`が存在しないTASK-009 worktreeで`uv sync --frozen`がexit `0`。
- CLI: `tests/run-verification.ps1 -RiskId RISK-ENTRY-001`。
- Path: `tests/run-verification.ps1 -RiskId RISK-PATH-001`。
- CI: `tests/run-verification.ps1 -RiskId RISK-CI-001`。
- GUI/WebEngine: `tests/run-verification.ps1 -RiskId RISK-WEB-001`。
- `RISK-CONFIG-001`の既知FailはTASK-012、`RISK-FS-001`の実環境実行はTASK-015の要件として維持する。
- 実装完了前にClaude Codeをread-onlyで1回reviewし、Codexが各指摘を一次情報で採否判定する。

## Expected change area

- Create: `pyproject.toml`、`uv.lock`、`.python-version`、toolchain contract test。
- Modify: `.gitignore`、`bin/ziz.bat`、`bin/ziz.sh`、`scripts/create_zizai_shortcut.ps1`、`tests/run-verification.ps1`、`.github/workflows/migration-verification.yml`、`tests/static/test_ci_workflow_contract.py`、`README.md`、TASK-009 documentation。
- Delete after gates pass: `requirements.txt`、`requirements-dev.txt`、`scripts/refresh_requirements.py`。
- Do not modify: Application code、既存`.env/`、Node/Playwright dependency files、untracked personal files。

## Completion condition

- `pyproject.toml`と`uv.lock`が唯一の依存正本であり、uv `0.12.5`／Python 3.11でclean `.venv`を再生成できる。
- 87件／23件のdirect dependencyが追加・欠落・version差分0で移行されている。
- 正式CLI、assigned Risk、WebEngine smokeがuv環境でPassする。
- requirements、pip bootstrap、toolchain用途の`.env/` active referenceが0である。
- 既存`.env/`とApplication behaviorを変更していない。
