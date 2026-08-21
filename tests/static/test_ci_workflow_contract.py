from __future__ import annotations

import runpy
import sys
from pathlib import Path

import pytest
import yaml


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = REPOSITORY_ROOT / ".github" / "workflows" / "migration-verification.yml"

pytestmark = [pytest.mark.static_analysis, pytest.mark.risk_ci_001]


def run_commands(job: dict) -> list[str]:
    return [str(step.get("run") or "") for step in job.get("steps", []) if isinstance(step, dict)]


def test_windows_ci_uses_canonical_runner_for_required_gates() -> None:
    workflow = yaml.safe_load(WORKFLOW_PATH.read_text(encoding="utf-8"))
    jobs = workflow["jobs"]
    expected_commands = {
        "static-analysis": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate static-analysis",
        "unit": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate unit",
        "integration": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -Gate integration",
    }

    for job_name, command in expected_commands.items():
        assert jobs[job_name]["runs-on"] == "windows-latest"
        assert command in run_commands(jobs[job_name])


def test_browser_and_webengine_jobs_are_deterministic_and_local_only() -> None:
    source = WORKFLOW_PATH.read_text(encoding="utf-8")
    workflow = yaml.safe_load(source)
    jobs = workflow["jobs"]

    assert jobs["browser-only"]["runs-on"] == "windows-latest"
    assert "npm test" in run_commands(jobs["browser-only"])
    assert jobs["webengine"]["runs-on"] == "windows-latest"
    assert (
        "powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/run-verification.ps1 -RiskId RISK-WEB-001"
        in run_commands(jobs["webengine"])
    )
    assert "secrets." not in source


@pytest.mark.parametrize(
    "relative_path",
    [
        "tests/integration/test_entrypoint_cli.py",
        "tests/integration/test_repository_layout_process.py",
        "tests/unit/test_manual_ui_validator.py",
    ],
)
def test_subprocess_tests_inherit_the_runner_python(
    relative_path: str,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ci_python = tmp_path / "ci-python.exe"
    monkeypatch.setattr(sys, "executable", str(ci_python))

    namespace = runpy.run_path(str(REPOSITORY_ROOT / relative_path))

    assert Path(namespace["PYTHON"]) == ci_python
