from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.gui.bridge import BridgeRuntime


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PROTOCOL_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "bridge" / "protocol-v1.json"

pytestmark = [pytest.mark.unit, pytest.mark.risk_bridge_001]


@pytest.fixture(scope="module")
def protocol() -> dict:
    return json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))


def command(message_type: str, payload: dict | None = None, *, version: str = "1.0", kind: str = "cmd") -> str:
    return json.dumps(
        {
            "v": version,
            "kind": kind,
            "id": "request-1",
            "type": message_type,
            "ts": "2026-08-21T00:00:00+00:00",
            "payload": payload or {},
        }
    )


def test_status_response_preserves_envelope_and_capability_set(tmp_path: Path, protocol: dict) -> None:
    response = BridgeRuntime(tmp_path).handle_message(command("app.getStatus"))

    assert response["v"] == protocol["version"]
    assert response["kind"] == "res"
    assert response["id"] == "request-1"
    assert response["type"] == "app.getStatus"
    assert set(response["payload"]["capabilities"]) == set(protocol["commands"])
    assert len(response["payload"]["capabilities"]) == 31


@pytest.mark.parametrize(
    ("raw_message", "expected_code"),
    [
        (command("app.getStatus", version="0.9"), "E_CONTRACT_VERSION_MISMATCH"),
        (command("app.getStatus", kind="evt"), "E_VALIDATION"),
        ("not-json", "E_VALIDATION"),
    ],
)
def test_protocol_validation_maps_to_stable_error_codes(
    tmp_path: Path, raw_message: str, expected_code: str
) -> None:
    response = BridgeRuntime(tmp_path).handle_message(raw_message)

    assert response["error"]["code"] == expected_code


def test_workspace_errors_map_to_access_missing_and_conflict(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    existing = workspace / "existing.md"
    existing.write_text("original", encoding="utf-8")
    runtime = BridgeRuntime(tmp_path)
    runtime.workspace_root = workspace.resolve()

    outside = runtime.handle_message(command("workspace.readText", {"scope": "root", "rel_path": "../outside.md"}))
    missing = runtime.handle_message(command("workspace.readText", {"scope": "root", "rel_path": "missing.md"}))
    conflict = runtime.handle_message(
        command(
            "workspace.writeText",
            {
                "scope": "root",
                "rel_path": "existing.md",
                "content": "changed",
                "expected_mtime_ns": "0",
            },
        )
    )

    assert outside["error"]["code"] == "E_ACCESS_DENIED"
    assert missing["error"]["code"] == "E_NOT_FOUND"
    assert conflict["error"]["code"] == "E_CONFLICT"


def test_unexpected_handler_failure_maps_to_internal_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    runtime = BridgeRuntime(tmp_path)

    def fail_status() -> dict:
        raise RuntimeError("private detail")

    monkeypatch.setattr(runtime, "_handle_app_get_status", fail_status)
    response = runtime.handle_message(command("app.getStatus"))

    assert response["error"]["code"] == "E_INTERNAL"
    assert "private detail" not in response["error"]["message"]


def test_all_event_envelopes_preserve_type_and_correlation(tmp_path: Path, protocol: dict) -> None:
    runtime = BridgeRuntime(tmp_path)
    emitted = []
    runtime.set_event_sink(emitted.append)

    for event in protocol["events"]:
        runtime.emit_event(event["type"], event["payload"])

    assert len(emitted) == 8
    for actual, expected in zip(emitted, protocol["events"], strict=True):
        assert actual["v"] == protocol["version"]
        assert actual["kind"] == "evt"
        assert actual["type"] == expected["type"]
        assert actual["payload"][expected["correlation"]] == expected["payload"][expected["correlation"]]
