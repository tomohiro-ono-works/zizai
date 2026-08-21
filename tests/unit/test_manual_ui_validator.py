from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PYTHON = Path(sys.executable)
VALIDATOR = REPOSITORY_ROOT / "tests" / "manual" / "validate_manual_ui_result.py"
VALID_RECORD = REPOSITORY_ROOT / "tests" / "fixtures" / "manual" / "valid-result.json"

pytestmark = [pytest.mark.unit, pytest.mark.risk_ui_001]


def run_validator(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PYTHON), str(VALIDATOR), str(path)],
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


def test_valid_manual_ui_fixture_passes() -> None:
    result = run_validator(VALID_RECORD)

    assert result.returncode == 0
    assert "passed" in result.stdout


def test_non_pass_case_fails_validation(tmp_path: Path) -> None:
    record = json.loads(VALID_RECORD.read_text(encoding="utf-8"))
    record["cases"][0]["result"] = "Blocked"
    invalid_record = tmp_path / "invalid-result.json"
    invalid_record.write_text(json.dumps(record), encoding="utf-8")

    result = run_validator(invalid_record)

    assert result.returncode == 1
    assert "result must be Pass" in result.stderr


def test_missing_record_is_blocked(tmp_path: Path) -> None:
    result = run_validator(tmp_path / "missing.json")

    assert result.returncode == 2
    assert "missing" in result.stderr
