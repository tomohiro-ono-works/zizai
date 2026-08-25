from __future__ import annotations

import json
import re
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
GOAL_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task012" / "frontend-boundary-goal.json"

pytestmark = [pytest.mark.integration]


@pytest.fixture(scope="module")
def goal() -> dict:
    return json.loads(GOAL_PATH.read_text(encoding="utf-8"))


def resolve_frontend_root(goal: dict) -> Path:
    # apps/gui after the WP-2 MOVE, static/ before it; the same relative js/ layout is expected either way.
    gui_root = REPOSITORY_ROOT / goal["gui_root"]
    if gui_root.is_dir():
        return gui_root
    return REPOSITORY_ROOT / goal["retired_gui_root"]


def extract_frame_to_host_message_types(frontend_root: Path) -> set[str]:
    source = (frontend_root / "js" / "app.js").read_text(encoding="utf-8")
    return set(re.findall(r'postEmbeddedEvent\(\s*["\']([\w-]+)["\']', source))


def extract_host_to_frame_custom_events(frontend_root: Path) -> set[str]:
    source = (frontend_root / "js" / "workspace.manager.js").read_text(encoding="utf-8")
    return set(re.findall(r"CustomEvent\(\s*['\"](ziz:workspace-flow-[\w-]+)['\"]", source))


def test_web_frame_contract_json_exists_under_apps_common_contracts_web_frame(goal: dict) -> None:
    contract_path = REPOSITORY_ROOT / goal["web_frame_contract"]["path"]

    assert contract_path.is_file(), f"internal web-frame contract JSON is missing: {contract_path}"


def test_web_frame_contract_enumerates_exactly_the_message_types_currently_emitted_by_the_frontend(
    goal: dict,
) -> None:
    frontend_root = resolve_frontend_root(goal)
    actual_message_types = extract_frame_to_host_message_types(frontend_root)
    actual_custom_events = extract_host_to_frame_custom_events(frontend_root)

    expected_message_types = set(goal["web_frame_contract"]["frame_to_host_message_types"])
    expected_custom_events = set(goal["web_frame_contract"]["host_to_frame_custom_events"])
    assert actual_message_types == expected_message_types, (
        f"goal fixture message types no longer match the frontend source: {sorted(actual_message_types)}"
    )
    assert actual_custom_events == expected_custom_events, (
        f"goal fixture custom event types no longer match the frontend source: {sorted(actual_custom_events)}"
    )

    contract_path = REPOSITORY_ROOT / goal["web_frame_contract"]["path"]
    assert contract_path.is_file(), f"internal web-frame contract JSON is missing: {contract_path}"
    contract = json.loads(contract_path.read_text(encoding="utf-8"))

    assert contract["version"] == goal["web_frame_contract"]["version"]
    assert set(contract["frame_to_host_message_types"]) == expected_message_types
    assert set(contract["host_to_frame_custom_events"]) == expected_custom_events
