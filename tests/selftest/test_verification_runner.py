from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
RUNNER = REPOSITORY_ROOT / "tests" / "run-verification.ps1"


def run_runner(
    *arguments: str,
    environment: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(RUNNER),
            *arguments,
        ],
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env={**os.environ, **(environment or {})},
        check=False,
    )


def combined_output(result: subprocess.CompletedProcess[str]) -> str:
    return f"{result.stdout}\n{result.stderr}"


def test_unknown_gate_is_a_verification_failure() -> None:
    result = run_runner("-Gate", "unsupported")

    assert result.returncode == 1
    assert "Unsupported Gate" in combined_output(result)


@pytest.mark.parametrize("risk_id", ["RISK-EXT-001", "RISK-WEB-002"])
def test_deferred_risk_is_blocked_in_task_008(risk_id: str) -> None:
    result = run_runner("-RiskId", risk_id)

    assert result.returncode == 2
    assert "Blocked" in combined_output(result)


def test_manual_ui_without_evidence_is_blocked() -> None:
    result = run_runner("-Gate", "manual-ui", "-RiskId", "RISK-UI-001")

    assert result.returncode == 2
    assert "EvidencePath" in combined_output(result)


def test_passing_risk_propagates_pytest_exit_code() -> None:
    result = run_runner("-RiskId", "RISK-ENTRY-001")

    assert result.returncode == 0
    assert "Verification passed" in combined_output(result)


def test_required_gate_rejects_a_skipped_test() -> None:
    result = run_runner(
        "-Gate",
        "static-analysis",
        environment={"ZIZAI_TEST_FORCE_REQUIRED_SKIP": "1"},
    )

    assert result.returncode == 1
    assert "Verification failed" in combined_output(result)


def test_required_gate_runs_static_analysis_before_unit_prerequisite_check() -> None:
    result = run_runner(
        "-Gate",
        "required",
        environment={"ZIZAI_TEST_FORCE_NO_SYMLINK": "1"},
    )
    output = combined_output(result)

    assert result.returncode == 2
    assert "Running required Gate: static-analysis" in output
    assert output.index("Running required Gate: static-analysis") < output.index(
        "Symlink capability is required"
    )
