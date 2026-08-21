from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.gui.bridge import BridgeRuntime, WebViewBridge


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
