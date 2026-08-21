from __future__ import annotations

import subprocess
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def is_ignored(path: str) -> bool:
    result = subprocess.run(
        ["git", "check-ignore", "--quiet", "--no-index", path],
        cwd=REPOSITORY_ROOT,
        check=False,
    )
    return result.returncode == 0


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
@pytest.mark.parametrize(
    "path",
    [
        "tests/run-verification.ps1",
        "tests/unit/example.py",
        "tests/manual/manual-ui-result.schema.json",
        ".github/workflows/migration-verification.yml",
    ],
)
def test_canonical_verification_source_is_not_ignored(path: str) -> None:
    assert not is_ignored(path), f"canonical source is ignored: {path}"


@pytest.mark.static_analysis
@pytest.mark.risk_ci_001
@pytest.mark.parametrize(
    "path",
    [
        "tests/unit/__pycache__/example.cpython-311.pyc",
        "tests/playwright/node_modules/example/package.json",
        "tests/playwright/results/result.json",
        "tests/playwright/artifacts/screenshot.png",
        "tests/results/manual/evidence.png",
        "tests/ui_analysis/report.md",
        "tests/preview.html",
        "results/manual/RISK-UI-001.json",
        ".github/workflows/playwright.yml",
    ],
)
def test_generated_and_historical_artifacts_remain_ignored(path: str) -> None:
    assert is_ignored(path), f"artifact is not ignored: {path}"
