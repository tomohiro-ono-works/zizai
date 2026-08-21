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
