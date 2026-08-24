from __future__ import annotations

import json
from pathlib import Path

import pytest

from apps.desktop.bridge import BridgeRuntime, WebViewBridge


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
EXTERNAL_URL_CASES_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "security" / "external-url-cases.json"
EXTERNAL_URL_CASES = json.loads(EXTERNAL_URL_CASES_PATH.read_text(encoding="utf-8"))["cases"]
POLICY_FIXTURE_PATH = (
    REPOSITORY_ROOT / "tests" / "fixtures" / "config" / "valid" / "apps" / "common" / "config" / "security_policies.yml"
)

pytestmark = [pytest.mark.integration, pytest.mark.risk_bridge_001]


def test_qwebchannel_signal_returns_one_correlated_response(tmp_path: Path) -> None:
    runtime = BridgeRuntime(tmp_path)
    bridge = WebViewBridge(runtime)
    emitted = []
    bridge.messageToFrontend.connect(emitted.append)
    request = json.dumps(
        {
            "v": "1.0",
            "kind": "cmd",
            "id": "signal-1",
            "type": "app.getStatus",
            "ts": "2026-08-21T00:00:00+00:00",
            "payload": {},
        }
    )

    bridge.postMessage(request)

    assert len(emitted) == 1
    response = json.loads(emitted[0])
    assert response["kind"] == "res"
    assert response["id"] == "signal-1"
    assert response["type"] == "app.getStatus"


@pytest.mark.risk_ext_001
def test_open_external_over_the_signal_boundary_respects_the_allowlist(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_dir = tmp_path / "apps" / "common" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "security_policies.yml").write_text(
        POLICY_FIXTURE_PATH.read_text(encoding="utf-8"), encoding="utf-8"
    )
    launcher_calls: list[tuple] = []

    def record_launch(*args, **kwargs):
        launcher_calls.append((args, kwargs))
        return None

    monkeypatch.setattr("apps.desktop.bridge.subprocess.Popen", record_launch)
    monkeypatch.setattr("apps.desktop.bridge.webbrowser.open", record_launch)
    monkeypatch.setattr(
        BridgeRuntime, "_resolve_chrome_executable", lambda self: str(tmp_path / "chrome.exe")
    )

    runtime = BridgeRuntime(tmp_path)
    bridge = WebViewBridge(runtime)
    emitted: list[str] = []
    bridge.messageToFrontend.connect(emitted.append)

    expected_launcher_calls = 0
    for index, case in enumerate(EXTERNAL_URL_CASES):
        bridge.postMessage(
            json.dumps(
                {
                    "v": "1.0",
                    "kind": "cmd",
                    "id": f"external-{index}",
                    "type": "app.openExternal",
                    "ts": "2026-08-24T00:00:00+00:00",
                    "payload": {"url": case["url"], "prefer": "chrome"},
                }
            )
        )
        expected_launcher_calls += int(case["launcher_calls"])
        response = json.loads(emitted[-1])
        assert response["kind"] == "res"
        assert response["id"] == f"external-{index}"
        assert response["type"] == "app.openExternal"
        if case["accepted"]:
            assert response["payload"]["accepted"] is True
        else:
            assert response["error"]["code"] == case["error_code"]
        assert len(launcher_calls) == expected_launcher_calls

    assert len(emitted) == len(EXTERNAL_URL_CASES)
