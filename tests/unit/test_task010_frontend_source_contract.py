from __future__ import annotations

import re
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
JS_ROOT = REPOSITORY_ROOT / "static" / "js"

pytestmark = [pytest.mark.unit, pytest.mark.risk_config_001, pytest.mark.static_analysis]


def _read(name: str) -> str:
    return (JS_ROOT / name).read_text(encoding="utf-8")


def test_suggest_index_uses_only_the_bridge_and_does_not_poison_failed_loads() -> None:
    text = _read("code.editor.js")

    assert 'bridgeApi.call("app.getSuggestIndex"' in text
    assert "fetchSuggestIndexFromStatic" not in text
    assert "/config/suggest_index/" not in text
    assert "/static/config/suggest_index/" not in text
    assert "SUGGEST_INDEX_CACHE.set(normalizedConnector, [])" not in text


def test_file_icon_map_is_not_read_through_a_generic_workspace_file_scope() -> None:
    text = _read("workspace.manager.js")

    assert "file_icon_map" in text
    assert "FILE_ICON_MAP_CONFIG_PATH" not in text
    assert "rel_path: FILE_ICON_MAP_CONFIG_PATH" not in text


def test_recent_roots_use_the_runtime_scope_and_explorer_has_no_config_node() -> None:
    for name in ("app.js", "app.home.js", "workspace.manager.js"):
        text = _read(name)
        assert re.search(r"RECENT_ROOTS_CONFIG_SCOPE\s*=\s*['\"]runtime['\"]", text), name

    workspace_manager = _read("workspace.manager.js")
    assert "buildTreeDetails('config'" not in workspace_manager
    assert 'buildTreeDetails("config"' not in workspace_manager
    assert "'Config', false" not in workspace_manager


def test_frontend_does_not_infer_workspace_defaults_from_config_path() -> None:
    offenders = []
    pattern = re.compile(r"config_path.{0,240}?getParentDir\(", re.DOTALL)
    for name in ("app.js", "app.home.js", "workspace.manager.js"):
        if pattern.search(_read(name)):
            offenders.append(name)

    assert offenders == [], f"frontend still derives workspace defaults from config_path: {offenders}"
