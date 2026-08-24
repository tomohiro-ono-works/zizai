from __future__ import annotations

import importlib
import json
from pathlib import Path

import pytest

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
GOAL_LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task010" / "repository-layout-goal.json"

pytestmark = [pytest.mark.unit, pytest.mark.risk_path_001]

# TASK-010 WP-1 (Goal-state contract): `core.repository_layout.resolve_repository_layout`
# does not exist yet. Import it inside each test so the rest of the WP-1 suite can
# still collect and report its own focused RED reasons.


def resolve_repository_layout(repository_root: Path):
    module = importlib.import_module("core.repository_layout")
    return module.resolve_repository_layout(repository_root)


@pytest.fixture(scope="module")
def goal_layout() -> dict:
    return json.loads(GOAL_LAYOUT_PATH.read_text(encoding="utf-8"))


def test_resolver_derives_separate_roots_from_an_explicit_injected_repository_root(
    tmp_path: Path, goal_layout: dict
) -> None:
    layout = resolve_repository_layout(tmp_path)

    assert Path(layout.repository_root) == tmp_path.resolve()
    assert Path(layout.source_config_root) == (tmp_path / goal_layout["source_config_root"]).resolve()
    assert Path(layout.runtime_state_root) == (tmp_path / goal_layout["runtime_state_root"]).resolve()
    assert Path(layout.workspace_default_root) == (tmp_path / goal_layout["workspace_default_root"]).resolve()
    assert layout.source_config_root != layout.runtime_state_root
    assert layout.runtime_state_root != layout.workspace_default_root


def test_resolver_matches_the_production_repository_root(goal_layout: dict) -> None:
    layout = resolve_repository_layout(REPOSITORY_ROOT)

    assert Path(layout.source_config_root) == REPOSITORY_ROOT / goal_layout["source_config_root"]
    assert Path(layout.runtime_state_root) == REPOSITORY_ROOT / goal_layout["runtime_state_root"]
    assert Path(layout.workspace_default_root) == REPOSITORY_ROOT / goal_layout["workspace_default_root"]


def test_source_config_root_contains_exactly_the_four_source_configuration_sets(goal_layout: dict) -> None:
    layout = resolve_repository_layout(REPOSITORY_ROOT)
    source_root = Path(layout.source_config_root)

    assert source_root.is_dir(), f"source_config_root does not exist yet: {source_root}"
    entries = sorted(entry.name for entry in source_root.iterdir())
    assert entries == sorted(goal_layout["source_config_assets"])


def test_runtime_state_root_no_longer_hosts_source_configuration_assets(goal_layout: dict) -> None:
    layout = resolve_repository_layout(REPOSITORY_ROOT)
    runtime_root = Path(layout.runtime_state_root)

    assert runtime_root == REPOSITORY_ROOT / "config"
    for asset_name in goal_layout["source_config_assets"]:
        assert not (runtime_root / asset_name).exists(), (
            f"source configuration asset still present in runtime_state_root: {asset_name}"
        )
