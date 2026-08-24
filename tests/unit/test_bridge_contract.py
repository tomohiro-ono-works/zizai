from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.gui.bridge import BridgeRuntime


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
PROTOCOL_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "bridge" / "protocol-v1.json"
EXTERNAL_URL_CASES_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "security" / "external-url-cases.json"
EXTERNAL_URL_CASES = json.loads(EXTERNAL_URL_CASES_PATH.read_text(encoding="utf-8"))["cases"]
REJECTED_EXTERNAL_URL_CASES = [case for case in EXTERNAL_URL_CASES if not case["accepted"]]
ALLOWED_EXTERNAL_URL_CASES = [case for case in EXTERNAL_URL_CASES if case["accepted"]]
POLICY_FIXTURE_PATH = (
    REPOSITORY_ROOT / "tests" / "fixtures" / "config" / "valid" / "apps" / "common" / "config" / "security_policies.yml"
)
SCRIPT_ROOT = REPOSITORY_ROOT / "static" / "js"
EXTERNAL_URL_ADAPTER_PATH = SCRIPT_ROOT / "bridge.js"

pytestmark = [pytest.mark.unit, pytest.mark.risk_bridge_001]


@pytest.fixture(scope="module")
def protocol() -> dict:
    return json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))


class LauncherSpy:
    """OS browser launcher を実行せずに呼び出しだけを記録する。"""

    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def __call__(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return None


@pytest.fixture
def allowlisted_runtime(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> tuple[BridgeRuntime, LauncherSpy]:
    config_dir = tmp_path / "apps" / "common" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "security_policies.yml").write_text(
        POLICY_FIXTURE_PATH.read_text(encoding="utf-8"), encoding="utf-8"
    )
    launcher = LauncherSpy()
    monkeypatch.setattr("app.gui.bridge.subprocess.Popen", launcher)
    monkeypatch.setattr("app.gui.bridge.webbrowser.open", launcher)
    monkeypatch.setattr(
        BridgeRuntime, "_resolve_chrome_executable", lambda self: str(tmp_path / "chrome.exe")
    )
    return BridgeRuntime(tmp_path), launcher


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


@pytest.mark.risk_ext_001
def test_frontend_external_url_adapter_guards_schemes_without_window_open_fallback() -> None:
    adapter_source = EXTERNAL_URL_ADAPTER_PATH.read_text(encoding="utf-8")
    window_open_users = sorted(
        str(path.relative_to(REPOSITORY_ROOT)).replace("\\", "/")
        for path in SCRIPT_ROOT.rglob("*.js")
        if "window.open(" in path.read_text(encoding="utf-8")
    )

    assert window_open_users == []
    assert '"http:"' in adapter_source
    assert '"https:"' in adapter_source


@pytest.mark.risk_ext_001
@pytest.mark.parametrize(
    "case",
    REJECTED_EXTERNAL_URL_CASES,
    ids=[case["url"] for case in REJECTED_EXTERNAL_URL_CASES],
)
def test_rejected_external_url_maps_to_access_denied_without_launcher_call(
    allowlisted_runtime: tuple[BridgeRuntime, LauncherSpy], case: dict
) -> None:
    runtime, launcher = allowlisted_runtime

    response = runtime.handle_message(
        command("app.openExternal", {"url": case["url"], "prefer": "chrome"})
    )

    assert response["error"]["code"] == case["error_code"]
    assert len(launcher.calls) == case["launcher_calls"]


@pytest.mark.risk_ext_001
@pytest.mark.parametrize(
    "case",
    ALLOWED_EXTERNAL_URL_CASES,
    ids=[case["url"] for case in ALLOWED_EXTERNAL_URL_CASES],
)
def test_allowlisted_external_url_is_delegated_to_the_browser_once(
    allowlisted_runtime: tuple[BridgeRuntime, LauncherSpy], case: dict
) -> None:
    runtime, launcher = allowlisted_runtime

    response = runtime.handle_message(
        command("app.openExternal", {"url": case["url"], "prefer": "chrome"})
    )

    assert response["payload"]["accepted"] is True
    assert response["payload"]["url"] == case["url"]
    assert len(launcher.calls) == case["launcher_calls"]
    assert case["url"] in launcher.calls[0][0][0]


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
