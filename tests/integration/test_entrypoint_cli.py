from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PYTHON = Path(sys.executable)
MINIMAL_FLOW = REPOSITORY_ROOT / "tests" / "fixtures" / "workflows" / "minimal-noop.zizd"
INVALID_FLOW = REPOSITORY_ROOT / "tests" / "fixtures" / "workflows" / "invalid.txt"

pytestmark = [pytest.mark.integration, pytest.mark.risk_entry_001]


def run_process(*arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(arguments),
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
        timeout=30,
    )


def test_public_python_entrypoint_help_contract() -> None:
    result = run_process(str(PYTHON), "zizai.py", "--help")

    assert result.returncode == 0
    assert "COMMAND NAME" in result.stdout
    assert "SYNOPSIS" in result.stdout


def test_windows_launcher_targets_the_public_entrypoint() -> None:
    result = run_process("cmd.exe", "/d", "/c", "bin\\ziz.bat", "--help")

    assert result.returncode == 0
    assert "COMMAND NAME" in result.stdout


def test_importing_public_entrypoint_succeeds() -> None:
    result = run_process(str(PYTHON), "-c", "import zizai")

    assert result.returncode == 0


@pytest.mark.parametrize(
    ("flow_path", "expected_exit_code"),
    [
        (str(MINIMAL_FLOW), 0),
        (str(INVALID_FLOW), 1),
        (str(REPOSITORY_ROOT / "tests" / "fixtures" / "workflows" / "missing.zizd"), 1),
    ],
)
def test_headless_flow_exit_contract(flow_path: str, expected_exit_code: int) -> None:
    result = run_process(str(PYTHON), "zizai.py", flow_path)

    assert result.returncode == expected_exit_code
