from __future__ import annotations

import ast
from pathlib import Path

import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
HOST_PATH = REPOSITORY_ROOT / "apps" / "desktop" / "host.py"

pytestmark = [pytest.mark.unit, pytest.mark.risk_ui_001]


def test_resize_handles_are_installed_after_webview_is_attached() -> None:
    tree = ast.parse(HOST_PATH.read_text(encoding="utf-8"))
    run_webview_app = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "run_webview_app"
    )

    webview_attach_line = next(
        node.lineno
        for node in ast.walk(run_webview_app)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "setCentralWidget"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "window"
        and len(node.args) == 1
        and isinstance(node.args[0], ast.Name)
        and node.args[0].id == "view"
    )
    resize_handle_install_line = next(
        node.lineno
        for node in ast.walk(run_webview_app)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "install_resize_handles"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "window"
    )

    assert webview_attach_line < resize_handle_install_line, (
        "resize handles must be installed after QWebEngineView becomes the central widget "
        "so the WebView cannot cover their native resize hit targets"
    )
