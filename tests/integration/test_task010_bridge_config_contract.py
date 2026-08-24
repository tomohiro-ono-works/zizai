from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.gui.bridge import BridgeRuntime


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PROTOCOL_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "bridge" / "protocol-v1.json"
GOAL_LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task010" / "repository-layout-goal.json"

pytestmark = [pytest.mark.integration, pytest.mark.risk_config_001, pytest.mark.risk_bridge_001]


def command(message_type: str, payload: dict | None = None, *, message_id: str = "task010-1") -> str:
    return json.dumps(
        {
            "v": "1.0",
            "kind": "cmd",
            "id": message_id,
            "type": message_type,
            "ts": "2026-08-24T00:00:00+00:00",
            "payload": payload or {},
        }
    )


@pytest.fixture(scope="module")
def protocol() -> dict:
    return json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def goal_layout() -> dict:
    return json.loads(GOAL_LAYOUT_PATH.read_text(encoding="utf-8"))


def test_protocol_command_and_event_sets_stay_at_31_and_8_during_the_migration_goal(protocol: dict) -> None:
    runtime = BridgeRuntime(REPOSITORY_ROOT)
    status = runtime.handle_message(command("app.getStatus"))

    assert set(status["payload"]["capabilities"]) == set(protocol["commands"])
    assert len(status["payload"]["capabilities"]) == 31

    emitted: list[dict] = []
    runtime.set_event_sink(emitted.append)
    for event in protocol["events"]:
        runtime.emit_event(event["type"], event["payload"])
    assert len(emitted) == 8


def test_security_policies_path_field_becomes_a_deprecated_empty_string() -> None:
    runtime = BridgeRuntime(REPOSITORY_ROOT)
    status = runtime.handle_message(command("app.getStatus"))

    security_policies = status["payload"]["security_policies"]
    assert security_policies["loaded"] is True
    assert "path" in security_policies
    assert security_policies["path"] == ""


def test_suggest_index_path_field_becomes_a_deprecated_empty_string() -> None:
    runtime = BridgeRuntime(REPOSITORY_ROOT)
    response = runtime.handle_message(command("app.getSuggestIndex", {"connector": "BQConnector"}))

    assert response["payload"]["loaded"] is True
    assert "path" in response["payload"]
    assert response["payload"]["path"] == ""


def test_workspace_root_config_path_field_becomes_a_deprecated_empty_string(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    runtime = BridgeRuntime(REPOSITORY_ROOT)

    applied = runtime.handle_message(command("workspace.setRoot", {"root_path": str(workspace)}))

    assert applied["payload"]["has_root"] is True
    assert "config_path" in applied["payload"]
    assert applied["payload"]["config_path"] == ""


def test_generic_config_scope_cannot_list_source_configuration_assets(goal_layout: dict) -> None:
    runtime = BridgeRuntime(REPOSITORY_ROOT)

    listing = runtime.handle_message(command("workspace.list", {"scope": "config", "rel_path": ""}))

    assert "error" not in listing
    listed_names = {entry["name"] for entry in listing["payload"]["entries"]}
    exposed = listed_names & set(goal_layout["source_config_assets"])
    assert exposed == set(), f"generic 'config' workspace scope still exposes source configuration: {exposed}"


def test_file_icon_map_is_delivered_through_the_app_get_status_payload() -> None:
    runtime = BridgeRuntime(REPOSITORY_ROOT)
    status = runtime.handle_message(command("app.getStatus"))

    icon_map = status["payload"].get("file_icon_map")
    assert isinstance(icon_map, dict), "app.getStatus payload is missing a validated file_icon_map"
    assert icon_map.get("default")
    assert icon_map.get("csv")


def test_runtime_scope_and_deprecated_config_alias_preserve_runtime_content(tmp_path: Path) -> None:
    runtime_root = tmp_path / "config"
    runtime_root.mkdir()
    recent_roots = runtime_root / "recent_roots.json"
    original = '[{"path":"C:/workspace","last_accessed_at":"2026-08-24T00:00:00Z"}]'
    recent_roots.write_text(original, encoding="utf-8")
    runtime = BridgeRuntime(tmp_path)

    for scope in ("runtime", "config"):
        response = runtime.handle_message(
            command("workspace.readText", {"scope": scope, "rel_path": "recent_roots.json"})
        )
        assert "error" not in response
        assert response["payload"]["content"] == original

    assert recent_roots.read_text(encoding="utf-8") == original


def test_failed_suggest_load_is_retried_after_the_source_file_appears(tmp_path: Path) -> None:
    runtime = BridgeRuntime(tmp_path)
    first = runtime.handle_message(command("app.getSuggestIndex", {"connector": "TestConnector"}))
    assert first["payload"]["loaded"] is False

    suggest_root = tmp_path / "apps" / "common" / "config" / "suggest_index"
    suggest_root.mkdir(parents=True)
    (suggest_root / "suggest_index_TestConnector.yml").write_text(
        "- index: retry.value\n  suggest_word:\n    - retry-ok\n",
        encoding="utf-8",
    )

    second = runtime.handle_message(command("app.getSuggestIndex", {"connector": "TestConnector"}))
    assert second["payload"]["loaded"] is True
    assert second["payload"]["entries"][0]["index"] == "retry.value"
