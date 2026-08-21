# TASK-009 uv Toolchain Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repository's `requirements*.txt` / `.env` Python toolchain with pinned uv `0.12.5`, `pyproject.toml`, `uv.lock`, and `.venv` without changing application behavior or direct dependency versions.

**Architecture:** Keep the application as a flat, non-package project (`[tool.uv] package = false`). Preserve the canonical launcher and verification command surfaces while routing Python execution through the locked uv environment. Keep Node/Playwright independent.

**Tech stack:** PowerShell, Python 3.11, uv 0.12.5, pytest, GitHub Actions.

**Spec:** [TASK-009 Python Toolchain Migration Design](TASK-009-uv-toolchain-design.md)

## Global constraints

- Work only in `.worktrees/task-009-uv-toolchain` on `codex/task-009-uv-toolchain`.
- Do not push, merge, or modify the user's existing repository-root `.env/`.
- Do not change dependency names, versions, markers, application imports, or application behavior.
- Do not modify `connectors/python_connector.py` runtime `env_path`; it is application data, not the repository toolchain.
- Preserve the external syntax of `tests/run-verification.ps1` and the canonical Risk commands.
- Add one failing test before each behavior change, confirm the expected failure, then implement the minimum change.
- Use `superpowers:test-driven-development` for each implementation slice and `superpowers:verification-before-completion` before any completion claim.
- Keep Claude Code read-only and use it only for the final independent review.

---

## Task 1: Define the uv project contract and lock

**Files:**

- Create: `tests/static/test_uv_toolchain_contract.py`
- Modify: `tests/fixtures/contracts/tracked-test-sources.json`
- Create: `pyproject.toml`
- Create: `.python-version`
- Create: `uv.lock`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: production pins from `requirements.txt`; development pins from `requirements-dev.txt` after excluding include/comment/blank lines.
- Produces: `pyproject.toml` with `project.dependencies: list[str]`, `dependency-groups.dev: list[str]`, `[tool.uv].package: false`; `.python-version`; `uv.lock`; ignored `.venv/`.

- [ ] Add contract tests using `tomllib` that require:
  - `project.requires-python == ">=3.11,<3.12"`;
  - `[tool.uv].package is false`;
  - every direct dependency uses one literal `==` pin, with no URL, VCS, local path, or marker;
  - normalized dependency names are unique within each group;
  - `.python-version` is exactly `3.11`;
  - `uv.lock` exists and `.gitignore` ignores `.venv/`.

```python
from __future__ import annotations

import re
import tomllib
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PIN = re.compile(r"^([A-Za-z0-9_.-]+)==([^;@\s]+)$")
pytestmark = [pytest.mark.static_analysis]


def normalized_pins(entries: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for entry in entries:
        match = PIN.fullmatch(entry)
        assert match is not None, f"direct dependency is not one exact pin: {entry}"
        name = re.sub(r"[-_.]+", "-", match.group(1)).lower()
        assert name not in result, f"duplicate direct dependency: {name}"
        result[name] = match.group(2)
    return result


def test_uv_project_contract() -> None:
    project = tomllib.loads((REPOSITORY_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    production = normalized_pins(project["project"]["dependencies"])
    development = normalized_pins(project["dependency-groups"]["dev"])

    assert project["project"]["requires-python"] == ">=3.11,<3.12"
    assert project["tool"]["uv"]["package"] is False
    assert production
    assert development
    assert (REPOSITORY_ROOT / ".python-version").read_text(encoding="utf-8").strip() == "3.11"
    assert (REPOSITORY_ROOT / "uv.lock").is_file()
    assert ".venv/" in (REPOSITORY_ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
```
- [ ] Register the new static test in `tracked-test-sources.json` and run the focused tests. Expected result: FAIL because the uv project files do not exist.

```powershell
$baselinePython = (Resolve-Path '..\..\.env\Scripts\python.exe').Path
& $baselinePython -m pytest tests/static/test_uv_toolchain_contract.py tests/static/test_test_source_manifest.py -q
```

- [ ] Create `pyproject.toml` with `name = "zizai"`, `version = "0.0.0"`, no build system, no published entrypoint, Python `>=3.11,<3.12`, and `package = false`.
- [ ] Copy all 87 nonblank `requirements.txt` entries literally and in existing order into `project.dependencies`.
- [ ] Copy the 23 pinned development/notebook entries from `requirements-dev.txt`, excluding `-r requirements.txt` and comments, into the single `dependency-groups.dev` array.
- [ ] Add `.python-version` containing `3.11`; add `.venv/` to `.gitignore` without touching `.env/`.

```toml
[project]
name = "zizai"
version = "0.0.0"
description = "Local visual workflow application"
requires-python = ">=3.11,<3.12"
dependencies = [
  "annotated-doc==0.0.4",
  "annotated-types==0.7.0",
  "anyio==4.12.1",
  "certifi==2026.1.4",
  "charset-normalizer==3.4.4",
  "choreographer==1.2.1",
  "click==8.3.1",
  "colorama==0.4.6",
  "comtypes==1.4.16",
  "decorator==5.2.1",
  "duckdb==1.4.2",
  "et_xmlfile==2.0.0",
  "fastapi==0.128.0",
  "faiss-cpu==1.14.3",
  "google-api-core==2.29.0",
  "google-api-python-client==2.188.0",
  "google-auth==2.47.0",
  "google-auth-httplib2==0.3.0",
  "google-auth-oauthlib==1.2.4",
  "google-cloud-bigquery==3.40.0",
  "google-cloud-core==2.5.0",
  "google-crc32c==1.8.0",
  "google-resumable-media==2.8.0",
  "googleapis-common-protos==1.72.0",
  "greenlet==3.3.2",
  "grpcio==1.76.0",
  "grpcio-status==1.76.0",
  "h11==0.16.0",
  "httplib2==0.31.2",
  "idna==3.11",
  "kaleido==1.2.0",
  "logistro==2.0.1",
  "markdown-it-py==4.0.0",
  "mdurl==0.1.2",
  "MouseInfo==0.1.3",
  "narwhals==2.17.0",
  "numpy==2.4.2",
  "oauthlib==3.3.1",
  "openpyxl==3.1.5",
  "orjson==3.11.7",
  "packaging==26.0",
  "pandas==3.0.1",
  "pillow==12.1.1",
  "platformdirs==4.5.1",
  "plotly==6.5.2",
  "prompt_toolkit==3.0.52",
  "proto-plus==1.27.0",
  "protobuf==6.33.4",
  "psutil==7.2.2",
  "pyasn1==0.6.2",
  "pyasn1_modules==0.4.2",
  "PyAutoGUI==0.9.54",
  "pydantic==2.12.5",
  "pydantic_core==2.41.5",
  "pyee==13.0.1",
  "PyGetWindow==0.0.9",
  "Pygments==2.19.2",
  "PyMsgBox==2.0.1",
  "pyparsing==3.3.2",
  "pyperclip==1.11.0",
  "PyRect==0.2.0",
  "PyScreeze==1.0.1",
  "PySide6==6.11.0",
  "PySide6_Addons==6.11.0",
  "PySide6_Essentials==6.11.0",
  "python-dateutil==2.9.0.post0",
  "pytweening==1.2.0",
  "pywin32==311",
  "pywinauto==0.6.9",
  "PyYAML==6.0.3",
  "requests==2.32.5",
  "requests-oauthlib==2.0.0",
  "rsa==4.9.1",
  "sentence-transformers==5.6.0",
  "shiboken6==6.11.0",
  "simplejson==3.20.2",
  "six==1.17.0",
  "slack_sdk==3.40.1",
  "starlette==0.50.0",
  "torch==2.12.1",
  "typing_extensions==4.15.0",
  "typing-inspection==0.4.2",
  "tzdata==2025.3",
  "uritemplate==4.2.0",
  "urllib3==2.6.3",
  "uvicorn==0.40.0",
  "wcwidth==0.5.3",
]

[dependency-groups]
dev = [
  "debugpy==1.8.20",
  "iniconfig==2.3.0",
  "playwright==1.58.0",
  "pluggy==1.6.0",
  "pytest==9.0.2",
  "pytest-timeout==2.4.0",
  "asttokens==3.0.1",
  "comm==0.2.3",
  "executing==2.2.1",
  "ipykernel==7.1.0",
  "ipython==9.9.0",
  "ipython_pygments_lexers==1.1.1",
  "jedi==0.19.2",
  "jupyter_client==8.8.0",
  "jupyter_core==5.9.1",
  "matplotlib-inline==0.2.1",
  "nest-asyncio==1.6.0",
  "parso==0.8.5",
  "pure_eval==0.2.3",
  "pyzmq==27.1.0",
  "stack-data==0.6.3",
  "tornado==6.5.4",
  "traitlets==5.14.3",
]

[tool.uv]
package = false
```
- [ ] Install official standalone uv `0.12.5` in user scope without administrator rights. Inspect the downloaded official installer before executing it; do not alter an existing uv installation silently.
- [ ] Run `uv lock`, then `uv lock --check`. If resolution requires changing any direct pin, stop and report the resolver error.
- [ ] Before deleting either requirements file, mechanically compare normalized `(name, version)` pairs from both legacy inputs against `pyproject.toml`. Require `87/23`, additions `0`, removals `0`, version differences `0`.

```powershell
$comparison = @'
import re
import tomllib
from pathlib import Path

root = Path.cwd()
normalize = lambda name: re.sub(r"[-_.]+", "-", name).lower()

def parse(entries):
    pairs = {}
    for entry in entries:
        name, version = entry.split("==", 1)
        key = normalize(name)
        assert key not in pairs, f"duplicate: {key}"
        pairs[key] = version
    return pairs

legacy_production = parse([
    line.strip() for line in (root / "requirements.txt").read_text(encoding="utf-8").splitlines()
    if line.strip()
])
legacy_development = parse([
    line.strip() for line in (root / "requirements-dev.txt").read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.lstrip().startswith(("#", "-r "))
])
project = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
uv_production = parse(project["project"]["dependencies"])
uv_development = parse(project["dependency-groups"]["dev"])

assert len(legacy_production) == len(uv_production) == 87
assert len(legacy_development) == len(uv_development) == 23
assert legacy_production == uv_production
assert legacy_development == uv_development
print("production=87 development=23 additions=0 removals=0 version_differences=0")
'@
& $baselinePython -c $comparison
```
- [ ] Re-run the focused tests and commit only when green.

```powershell
uv lock
uv lock --check
& $baselinePython -m pytest tests/static/test_uv_toolchain_contract.py tests/static/test_test_source_manifest.py -q
git add pyproject.toml uv.lock .python-version .gitignore tests/static/test_uv_toolchain_contract.py tests/fixtures/contracts/tracked-test-sources.json
git commit -m "build: define locked uv toolchain"
```

## Task 2: Route canonical verification through uv

**Files:**

- Modify: `tests/selftest/test_verification_runner.py`
- Modify: `tests/run-verification.ps1`

**Interfaces:**

- Consumes: `uv` executable on `PATH`, exact output `uv 0.12.5`, repository `uv.lock`, and existing `-Gate`, `-RiskId`, `-EvidencePath` parameters.
- Produces: `Resolve-UvCommand -> string | $null`, `Test-UvToolchain -> bool`, and Python execution through `uv run --frozen python`; process results remain Pass `0`, Fail `1`, Blocked `2`.

- [ ] Add self-tests proving that a normal Risk invocation uses `uv run --frozen python`, that a missing/wrong uv toolchain returns Blocked (`2`), and that deferred Risk slots still return Blocked without requiring uv.

```python
def write_fake_uv(directory: Path, version: str = "0.12.5") -> Path:
    command = directory / "uv.cmd"
    command.write_text(
        "@echo off\n"
        "echo %*>>\"%ZIZAI_TEST_UV_LOG%\"\n"
        f'if "%~1"=="--version" echo uv {version}\n'
        "exit /b 0\n",
        encoding="utf-8",
    )
    return command


def test_runner_uses_frozen_uv_for_python(tmp_path: Path) -> None:
    log = tmp_path / "uv.log"
    write_fake_uv(tmp_path)
    result = run_runner(
        "-RiskId", "RISK-ENTRY-001",
        environment={"PATH": str(tmp_path), "ZIZAI_TEST_UV_LOG": str(log)},
    )
    assert result.returncode == 0
    assert "run --frozen python -m pytest" in log.read_text(encoding="utf-8")


def test_wrong_uv_version_is_blocked(tmp_path: Path) -> None:
    log = tmp_path / "uv.log"
    write_fake_uv(tmp_path, version="9.9.9")
    result = run_runner(
        "-RiskId", "RISK-ENTRY-001",
        environment={"PATH": str(tmp_path), "ZIZAI_TEST_UV_LOG": str(log)},
    )
    assert result.returncode == 2
    assert "uv 0.12.5" in combined_output(result)


def test_missing_uv_is_blocked() -> None:
    result = run_runner("-RiskId", "RISK-ENTRY-001", environment={"PATH": ""})
    assert result.returncode == 2
    assert "uv 0.12.5" in combined_output(result)


def test_deferred_risk_does_not_require_uv() -> None:
    result = run_runner("-RiskId", "RISK-EXT-001", environment={"PATH": ""})
    assert result.returncode == 2
    assert "RISK-EXT-001 is Blocked" in combined_output(result)
```
- [ ] Run the focused self-tests. Expected result: FAIL because the runner still resolves `.env`/`.venv`/PATH Python directly.
- [ ] Replace repository-Python discovery with one uv resolver/preflight for exactly `0.12.5` after deferred-slot handling.
- [ ] Route pytest, capability probes, and manual validator Python calls through `uv run --frozen python ...` from the repository root. Preserve stdout/stderr, exit-code mapping, parameters, Risk IDs, and the outer command interface.

```powershell
function Resolve-UvCommand {
    $command = Get-Command "uv.exe" -ErrorAction SilentlyContinue
    if ($null -eq $command) { $command = Get-Command "uv" -ErrorAction SilentlyContinue }
    if ($null -eq $command) { return $null }
    return $command.Source
}

function Test-UvToolchain {
    param([string]$UvCommand)
    $version = (& $UvCommand --version 2>$null | Select-Object -First 1)
    return $LASTEXITCODE -eq 0 -and $version -eq "uv 0.12.5"
}

function Invoke-UvPython {
    param([string[]]$Arguments)
    Push-Location $repositoryRoot
    try {
        & $script:uvCommand run --frozen python @Arguments | Out-Host
        return $LASTEXITCODE
    }
    finally { Pop-Location }
}
```
- [ ] Run focused self-tests and the full self-test suite; commit when green.

```powershell
& $baselinePython -m pytest tests/selftest/test_verification_runner.py -q
git add tests/run-verification.ps1 tests/selftest/test_verification_runner.py
git commit -m "test: run canonical verification through uv"
```

## Task 3: Move launchers to `.venv`

**Files:**

- Modify: `tests/static/test_entrypoint_contract.py`
- Test: `tests/integration/test_entrypoint_cli.py`
- Modify: `bin/ziz.bat`
- Modify: `bin/ziz.sh`

**Interfaces:**

- Consumes: `.venv` created by `uv sync --frozen`.
- Produces: unchanged launcher arguments/exit codes with default interpreters `bin/ziz.bat -> .venv\Scripts\python.exe` and `bin/ziz.sh -> .venv/bin/python`.

- [ ] Use the existing `test_windows_launcher_targets_the_public_entrypoint` as the real-process Windows launcher contract; run it before the edit. Expected result: FAIL because the worktree has `.venv` but no `.env`.
- [ ] Add one narrow static contract for the POSIX `.venv/bin/python` path and `"$@"` forwarding because the Windows verification environment cannot execute a Linux uv layout.

```python
def test_posix_launcher_uses_uv_environment_path() -> None:
    source = (REPOSITORY_ROOT / "bin" / "ziz.sh").read_text(encoding="utf-8")
    assert 'PYTHON_EXE=".venv/bin/python"' in source
    assert 'exec "$PYTHON_EXE" zizai.py "$@"' in source
```
- [ ] Run the focused contract. Expected result: FAIL on the current `.env` paths.
- [ ] Change only the interpreter paths to `.venv\Scripts\python.exe` and `.venv/bin/python`; preserve working-directory handling, arguments, and exit codes.
- [ ] Run the focused contract and `RISK-ENTRY-001`; commit when green.

```powershell
uv sync --frozen
uv run --frozen python -m pytest tests/static/test_entrypoint_contract.py tests/integration/test_entrypoint_cli.py -q
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-ENTRY-001
git add tests/static/test_entrypoint_contract.py bin/ziz.bat bin/ziz.sh
git commit -m "fix: launch application from uv environment"
```

## Task 4: Make Windows CI reproduce the locked environment

**Files:**

- Modify: `tests/static/test_ci_workflow_contract.py`
- Modify: `.github/workflows/migration-verification.yml`

**Interfaces:**

- Consumes: GitHub-hosted Windows runner, Python `3.11`, checked-in `uv.lock`.
- Produces: four Python jobs (`static-analysis`, `unit`, `integration`, `webengine`) prepared by `astral-sh/setup-uv` and `uv sync --frozen`; canonical runner commands unchanged.

- [ ] Add CI contract assertions that every Python job keeps Python `3.11`, uses official `astral-sh/setup-uv` with `uv-version: "0.12.5"`, executes `uv sync --frozen`, and has no pip/requirements bootstrap. Preserve the browser-only job unchanged.

```python
def test_python_jobs_use_pinned_uv_and_frozen_sync() -> None:
    workflow = yaml.safe_load(WORKFLOW_PATH.read_text(encoding="utf-8"))
    for job_name in ("static-analysis", "unit", "integration", "webengine"):
        steps = workflow["jobs"][job_name]["steps"]
        setup_python = next(step for step in steps if str(step.get("uses", "")).startswith("actions/setup-python@"))
        setup_uv = next(step for step in steps if str(step.get("uses", "")).startswith("astral-sh/setup-uv@"))
        commands = [str(step.get("run", "")) for step in steps]

        assert str(setup_python["with"]["python-version"]) == "3.11"
        assert str(setup_uv["with"]["uv-version"]) == "0.12.5"
        assert "uv sync --frozen" in commands
        assert all("pip install" not in command and "requirements" not in command for command in commands)
```
- [ ] Run the focused contract. Expected result: FAIL because the Python jobs still install `requirements-dev.txt` with pip.
- [ ] Update only the four Python jobs: keep `actions/setup-python`, remove pip cache inputs, add pinned `setup-uv`, and replace pip installation with `uv sync --frozen`. Do not change canonical runner commands.
- [ ] Run the CI contract and `RISK-CI-001`; commit when green.

```powershell
uv run --frozen python -m pytest tests/static/test_ci_workflow_contract.py -q
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-CI-001
git add tests/static/test_ci_workflow_contract.py .github/workflows/migration-verification.yml
git commit -m "ci: sync Python environment with pinned uv"
```

## Task 5: Remove superseded dependency inputs and refresh documentation

**Files:**

- Modify: `README.md`
- Modify: `.gitignore`
- Delete: `requirements.txt`
- Delete: `requirements-dev.txt`
- Delete: `scripts/refresh_requirements.py`

**Interfaces:**

- Consumes: proven direct-dependency equivalence from Task 1 and locked setup commands.
- Produces: `pyproject.toml` plus `uv.lock` as the sole dependency truth; README commands that use uv; recorded one-time proof of no executable/bootstrap reference to requirements, pip install, refresh script, or toolchain `.env/`.

- [ ] Run a one-time explicit active-file scan for toolchain `.env` paths, `requirements*.txt`, `pip install`, and `refresh_requirements.py` references in launchers, bootstrap scripts, CI, and README. Do not scan historical handoffs/tasks/reports, `.gitignore`, or arbitrary connector `env_path` values. Expected result before edits: matches remain.
- [ ] Update README setup and direct-run commands to `uv sync --frozen` and `uv run --frozen`; identify `pyproject.toml` plus `uv.lock` as the dependency truth.
- [ ] Confirm dependency equivalence evidence is already recorded, then delete both requirements files and the obsolete refresh script. Remove the obsolete `requirements-dev.txt` ignore rule.
- [ ] Use `rg` over active code/runtime/test/CI/current documentation to confirm zero toolchain references; run the existing toolchain, entrypoint, and CI contracts and commit when green.

```powershell
uv run --frozen python -m pytest tests/static/test_uv_toolchain_contract.py tests/static/test_entrypoint_contract.py tests/static/test_ci_workflow_contract.py -q
git add -A -- .gitignore README.md requirements.txt requirements-dev.txt scripts/refresh_requirements.py
git commit -m "docs: make uv the sole Python dependency workflow"
```

## Task 6: Prove clean regeneration and migration-risk parity

**Files:**

- Modify: `docs/tasks/active/TASK-009-migrate-python-toolchain-to-uv.md`

**Interfaces:**

- Consumes: all committed implementation slices and the ignored worktree `.venv/`.
- Produces: clean-lock regeneration evidence and exit-code evidence for all TASK-009-assigned Risks.

- [ ] Resolve and verify that the deletion target is exactly the worktree's generated `.venv`; remove only that ignored artifact. Never delete or modify the repository-root `.env/`.

```powershell
$worktreeRoot = (Resolve-Path '.').Path
$generatedVenv = [System.IO.Path]::GetFullPath((Join-Path $worktreeRoot '.venv'))
$expectedVenv = [System.IO.Path]::GetFullPath("$worktreeRoot\.venv")
if ($generatedVenv -ne $expectedVenv -or -not $generatedVenv.StartsWith($worktreeRoot + [System.IO.Path]::DirectorySeparatorChar)) {
    throw "Refusing unexpected deletion target: $generatedVenv"
}
if (Test-Path -LiteralPath $generatedVenv) {
    Remove-Item -LiteralPath $generatedVenv -Recurse -Force
}
if (Test-Path -LiteralPath $generatedVenv) {
    throw "Clean-environment precondition failed: $generatedVenv still exists"
}
```
- [ ] From the now-clean worktree run `uv sync --frozen`, `uv lock --check`, the static/self-test suites, and the assigned Risk commands.
- [ ] Require PASS for `RISK-ENTRY-001`, `RISK-PATH-001`, `RISK-CI-001`, and `RISK-WEB-001`. Keep CONFIG assigned to TASK-012 and the real symlink check assigned to TASK-015; do not reinterpret them as TASK-009 failures.
- [ ] Record commands, counts, exit codes, direct dependency equality (`87/23; 0/0/0`), and confirmation that `.env/` was untouched in TASK-009 Evidence.

```powershell
uv sync --frozen
uv lock --check
uv run --frozen python -m pytest tests/static tests/selftest -q
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-ENTRY-001
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-PATH-001
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-CI-001
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-WEB-001
```

## Task 7: Independent read-only review and completion

**Files:**

- Modify: `docs/handoffs/TASK-009-uv-toolchain-design.md`
- Move after all gates pass: `docs/tasks/active/TASK-009-migrate-python-toolchain-to-uv.md` to `docs/tasks/done/`

**Interfaces:**

- Consumes: complete branch diff, verification evidence, and one read-only Claude Code review.
- Produces: validated review disposition, Implemented design status, completed TASK-009 document, and local-only commits ready for user review.

- [ ] Ask Claude Code once, read-only, to review the branch diff for dependency drift, uv/frozen consistency, launcher parity, CI parity, hidden `.env` fallback, and acceptance-criteria gaps. Do not grant write permission.
- [ ] Validate every finding against the diff, tests, and approved design. Implement only confirmed in-scope issues, test them first, and record adopted/rejected findings briefly.
- [ ] Run `git diff --check`, `git status --short`, `uv lock --check`, the final required test set, and confirm no `.env/` path was added, removed, or modified.
- [ ] Mark the design Implemented, move TASK-009 to done, and make the final local commit. Do not push or merge.

```powershell
git diff --check
uv lock --check
uv run --frozen python -m pytest tests/static tests/selftest -q
git status --short
git add docs/handoffs/TASK-009-uv-toolchain-design.md docs/tasks/active/TASK-009-migrate-python-toolchain-to-uv.md docs/tasks/done/TASK-009-migrate-python-toolchain-to-uv.md
git commit -m "docs: complete task 009 uv migration"
```

## Stop conditions

- Any direct dependency addition, removal, or version change.
- uv `0.12.5` cannot resolve the exact pins under Python 3.11.
- A required change reaches application behavior, connector runtime `env_path`, Node/Playwright dependencies, or the user's existing `.env/`.
- An assigned TASK-009 Risk or clean frozen sync fails after scoped diagnosis.
