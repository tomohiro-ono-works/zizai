from __future__ import annotations

import json
from pathlib import Path

import pytest

from apps.desktop.bridge import BridgeRuntime
from apps.desktop.host import _is_within_path
from apps.core import flow_locator
from apps.core import logger as app_logger
from apps.core import security_policies


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "contracts" / "repository-layout.json"

pytestmark = [pytest.mark.unit, pytest.mark.risk_path_001]


@pytest.fixture(scope="module")
def layout() -> dict:
    return json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))


def test_current_path_resolvers_match_the_layout_contract(layout: dict) -> None:
    runtime = BridgeRuntime(REPOSITORY_ROOT)

    assert flow_locator.BASE_DIR.resolve() == REPOSITORY_ROOT
    assert security_policies.BASE_DIR.resolve() == REPOSITORY_ROOT
    assert flow_locator.CONFIG_DIR.resolve() == REPOSITORY_ROOT / layout["runtime_state_root"]
    assert flow_locator.WORKFLOW_DIR.resolve() == REPOSITORY_ROOT / layout["workflow_root"]
    assert (REPOSITORY_ROOT / app_logger.LOG_DIR).resolve() == REPOSITORY_ROOT / layout["log_root"]
    assert runtime.source_config_root == REPOSITORY_ROOT / layout["source_config_root"]
    assert runtime.runtime_state_root == REPOSITORY_ROOT / layout["runtime_state_root"]
    assert runtime.config_root == runtime.runtime_state_root
    assert runtime.workspace_default_root == REPOSITORY_ROOT / layout["workflow_root"]
    assert runtime._execution_log_path.parent == REPOSITORY_ROOT / layout["log_root"]


def test_required_layout_files_exist(layout: dict) -> None:
    missing = [path for path in layout["required_files"] if not (REPOSITORY_ROOT / path).is_file()]

    assert missing == []


def test_gui_path_boundary_accepts_only_normalized_descendants(tmp_path: Path) -> None:
    gui_root = (tmp_path / "static").resolve()
    child = (gui_root / "assets" / "app.js").resolve()
    sibling = (tmp_path / "static-other" / "app.js").resolve()

    assert _is_within_path(child, gui_root) is True
    assert _is_within_path(gui_root, gui_root) is True
    assert _is_within_path(sibling, gui_root) is False
