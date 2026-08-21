from __future__ import annotations

from pathlib import Path

import pytest

from app.gui.bridge import BridgeRuntime


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = REPOSITORY_ROOT / "tests" / "fixtures" / "config"

pytestmark = [pytest.mark.integration, pytest.mark.risk_config_001]


def request_suggest_index(base_dir: Path) -> dict:
    return BridgeRuntime(base_dir).handle_message(
        '{"v":"1.0","kind":"cmd","id":"config-1","type":"app.getSuggestIndex",'
        '"payload":{"connector":"TestConnector"}}'
    )


def test_valid_suggest_index_returns_two_entries() -> None:
    response = request_suggest_index(FIXTURE_ROOT / "valid")

    assert "error" not in response
    assert response["payload"]["loaded"] is True
    assert len(response["payload"]["entries"]) == 2


def test_invalid_suggest_index_maps_to_validation_error() -> None:
    response = request_suggest_index(FIXTURE_ROOT / "invalid-suggest")

    assert response["error"]["code"] == "E_VALIDATION"


def test_missing_suggest_index_returns_empty_unloaded_result(tmp_path: Path) -> None:
    response = request_suggest_index(tmp_path)

    assert "error" not in response
    assert response["payload"]["loaded"] is False
    assert response["payload"]["entries"] == []
