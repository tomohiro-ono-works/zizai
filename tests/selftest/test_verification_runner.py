from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
RUNNER = REPOSITORY_ROOT / "tests" / "run-verification.ps1"
POWERSHELL = shutil.which("powershell.exe")


def run_runner(
    *arguments: str,
    environment: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            POWERSHELL or "powershell.exe",
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


def test_runner_uses_frozen_uv_for_python(tmp_path: Path) -> None:
    log = tmp_path / "uv.log"
    write_fake_uv(tmp_path)

    result = run_runner(
        "-RiskId",
        "RISK-ENTRY-001",
        environment={"PATH": str(tmp_path), "ZIZAI_TEST_UV_LOG": str(log)},
    )

    assert result.returncode == 0
    assert "run --frozen python -m pytest" in log.read_text(encoding="utf-8")


def test_wrong_uv_version_is_blocked(tmp_path: Path) -> None:
    log = tmp_path / "uv.log"
    write_fake_uv(tmp_path, version="9.9.9")

    result = run_runner(
        "-RiskId",
        "RISK-ENTRY-001",
        environment={"PATH": str(tmp_path), "ZIZAI_TEST_UV_LOG": str(log)},
    )

    assert result.returncode == 2
    assert "uv 0.12.5" in combined_output(result)


def test_uv_version_with_build_metadata_is_accepted(tmp_path: Path) -> None:
    log = tmp_path / "uv.log"
    write_fake_uv(tmp_path, version="0.12.5 (build metadata)")

    result = run_runner(
        "-RiskId",
        "RISK-ENTRY-001",
        environment={"PATH": str(tmp_path), "ZIZAI_TEST_UV_LOG": str(log)},
    )

    assert result.returncode == 0


def test_missing_uv_is_blocked() -> None:
    result = run_runner("-RiskId", "RISK-ENTRY-001", environment={"PATH": ""})

    assert result.returncode == 2
    assert "uv 0.12.5" in combined_output(result)


def test_deferred_risk_does_not_require_uv() -> None:
    result = run_runner("-RiskId", "RISK-EXT-001", environment={"PATH": ""})

    assert result.returncode == 2
    assert "RISK-EXT-001 is Blocked" in combined_output(result)


def test_required_gate_rejects_a_skipped_test() -> None:
    result = run_runner(
        "-Gate",
        "static-analysis",
        environment={"ZIZAI_TEST_FORCE_REQUIRED_SKIP": "1"},
    )

    assert result.returncode == 1
    assert "Verification failed" in combined_output(result)


def test_required_gate_runs_static_analysis_before_unit_prerequisite_check(
    tmp_path: Path,
) -> None:
    log = tmp_path / "uv.log"
    write_fake_uv(tmp_path)
    result = run_runner(
        "-Gate",
        "required",
        environment={
            "PATH": str(tmp_path),
            "ZIZAI_TEST_FORCE_NO_SYMLINK": "1",
            "ZIZAI_TEST_UV_LOG": str(log),
        },
    )
    output = combined_output(result)

    assert result.returncode == 2
    assert "Running required Gate: static-analysis" in output
    assert output.index("Running required Gate: static-analysis") < output.index(
        "Symlink capability is required"
    )
