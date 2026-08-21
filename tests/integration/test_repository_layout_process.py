from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PYTHON = Path(sys.executable)
LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "contracts" / "repository-layout.json"

pytestmark = [pytest.mark.integration, pytest.mark.risk_path_001]


def test_layout_resolves_identically_in_a_fresh_process() -> None:
    script = """
import json
from pathlib import Path
from core import flow_locator
from app.gui.bridge import BridgeRuntime

root = Path.cwd().resolve()
runtime = BridgeRuntime(root)
print(json.dumps({
    "repository_root": str(flow_locator.BASE_DIR.resolve()),
    "config_root": str(runtime.config_root),
    "workflow_root": str(flow_locator.WORKFLOW_DIR.resolve()),
    "log_root": str(runtime._execution_log_path.parent),
    "gui_root": str((root / "static").resolve()),
}))
"""
    result = subprocess.run(
        [str(PYTHON), "-c", script],
        cwd=REPOSITORY_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
        timeout=30,
    )
    actual = json.loads(result.stdout.strip())
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))

    assert result.returncode == 0
    assert actual == {
        "repository_root": str(REPOSITORY_ROOT),
        "config_root": str(REPOSITORY_ROOT / layout["config_root"]),
        "workflow_root": str(REPOSITORY_ROOT / layout["workflow_root"]),
        "log_root": str(REPOSITORY_ROOT / layout["log_root"]),
        "gui_root": str(REPOSITORY_ROOT / layout["gui_root"]),
    }
