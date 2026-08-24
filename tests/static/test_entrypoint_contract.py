from __future__ import annotations

from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]

pytestmark = [pytest.mark.static_analysis, pytest.mark.risk_entry_001]


@pytest.mark.parametrize(
    "relative_path",
    [
        "zizai.py",
        "bin/ziz.bat",
        "apps/cli/main.py",
        "static/home.html",
        "tests/fixtures/workflows/minimal-noop.zizd",
        "tests/fixtures/workflows/invalid.txt",
    ],
)
def test_entrypoint_contract_files_exist(relative_path: str) -> None:
    assert (REPOSITORY_ROOT / relative_path).is_file()


def test_import_zizai_does_not_start_the_application() -> None:
    source = (REPOSITORY_ROOT / "zizai.py").read_text(encoding="utf-8")

    assert 'if __name__ == "__main__":' in source


def test_posix_launcher_uses_uv_environment_path() -> None:
    source = (REPOSITORY_ROOT / "bin" / "ziz.sh").read_text(encoding="utf-8")

    assert 'PYTHON_EXE=".venv/bin/python"' in source
    assert 'exec "$PYTHON_EXE" zizai.py "$@"' in source
