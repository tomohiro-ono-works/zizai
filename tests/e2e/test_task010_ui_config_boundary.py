from __future__ import annotations

import json
import os
from pathlib import Path

import pytest


os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
existing_flags = os.environ.get("QTWEBENGINE_CHROMIUM_FLAGS", "").strip()
os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = f"{existing_flags} --no-sandbox --disable-gpu".strip()

from PySide6.QtCore import QEventLoop, QTimer, QUrl
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication

from apps.desktop.bridge import BridgeRuntime, WebViewBridge


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
GOAL_LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "task010" / "repository-layout-goal.json"
ENTRY_HTML = REPOSITORY_ROOT / "apps" / "gui" / "dataflow.html"

pytestmark = [pytest.mark.e2e, pytest.mark.risk_web_001, pytest.mark.timeout(45)]


@pytest.fixture(scope="module")
def goal_layout() -> dict:
    return json.loads(GOAL_LAYOUT_PATH.read_text(encoding="utf-8"))


def wait_for_load(view: QWebEngineView, url: QUrl, timeout_ms: int = 15000) -> bool:
    loop = QEventLoop()
    result = {"loaded": False}
    timer = QTimer()
    timer.setSingleShot(True)
    timer.timeout.connect(loop.quit)

    def finished(ok: bool) -> None:
        result["loaded"] = bool(ok)
        loop.quit()

    view.loadFinished.connect(finished)
    timer.start(timeout_ms)
    view.load(url)
    loop.exec()
    view.loadFinished.disconnect(finished)
    return result["loaded"]


def run_javascript(view: QWebEngineView, script: str, timeout_ms: int = 5000):
    loop = QEventLoop()
    result = {"called": False, "value": None}
    timer = QTimer()
    timer.setSingleShot(True)
    timer.timeout.connect(loop.quit)

    def completed(value) -> None:
        result["called"] = True
        result["value"] = value
        loop.quit()

    timer.start(timeout_ms)
    view.page().runJavaScript(script, completed)
    loop.exec()
    assert result["called"], "JavaScript callback timed out"
    return result["value"]


def wait_for_js_value(view: QWebEngineView, expression: str, timeout_ms: int = 10000):
    deadline_steps = max(1, timeout_ms // 100)
    for _ in range(deadline_steps):
        raw = run_javascript(view, f"JSON.stringify({{value: {expression}}})", timeout_ms=1000)
        state = json.loads(raw)
        if state["value"] is not None:
            return state["value"]
        loop = QEventLoop()
        QTimer.singleShot(100, loop.quit)
        loop.exec()
    raise AssertionError(f"value not resolved in time: {expression}")


def test_real_webengine_bridge_reflects_icon_map_and_empty_deprecated_suggest_path() -> None:
    application = QApplication.instance() or QApplication([])
    runtime = BridgeRuntime(REPOSITORY_ROOT)
    bridge = WebViewBridge(runtime)
    channel = QWebChannel()
    channel.registerObject("backendBridge", bridge)
    view = QWebEngineView()
    view.page().setWebChannel(channel)

    try:
        assert wait_for_load(view, QUrl.fromLocalFile(str(ENTRY_HTML))) is True

        run_javascript(
            view,
            """
            window.__zizTask010Status = null;
            window.zizBridge.call("app.getStatus", {}).then((value) => { window.__zizTask010Status = value; });
            true;
            """,
        )
        status = wait_for_js_value(view, "window.__zizTask010Status")
        icon_map = status.get("file_icon_map")
        assert isinstance(icon_map, dict), "app.getStatus payload has no file_icon_map for the rendered page"
        assert icon_map.get("default")

        run_javascript(
            view,
            """
            window.__zizTask010Suggest = null;
            window.zizBridge.call("app.getSuggestIndex", { connector: "BQConnector" }).then(
              (value) => { window.__zizTask010Suggest = value; }
            );
            true;
            """,
        )
        suggest = wait_for_js_value(view, "window.__zizTask010Suggest")
        assert suggest.get("loaded") is True
        assert suggest.get("path") == ""
    finally:
        view.close()
        view.deleteLater()
        application.processEvents()


def test_real_webengine_generic_config_scope_cannot_list_source_configuration_assets(goal_layout: dict) -> None:
    application = QApplication.instance() or QApplication([])
    runtime = BridgeRuntime(REPOSITORY_ROOT)
    bridge = WebViewBridge(runtime)
    channel = QWebChannel()
    channel.registerObject("backendBridge", bridge)
    view = QWebEngineView()
    view.page().setWebChannel(channel)

    try:
        assert wait_for_load(view, QUrl.fromLocalFile(str(ENTRY_HTML))) is True

        run_javascript(
            view,
            """
            window.__zizTask010ConfigList = null;
            window.zizBridge.call("workspace.list", { scope: "config", rel_path: "" }).then(
              (value) => { window.__zizTask010ConfigList = value; }
            );
            true;
            """,
        )
        listing = wait_for_js_value(view, "window.__zizTask010ConfigList")
        listed_names = {entry["name"] for entry in listing.get("entries") or []}
        exposed = listed_names & set(goal_layout["source_config_assets"])
        assert exposed == set(), f"generic 'config' workspace scope still exposes source configuration: {exposed}"
    finally:
        view.close()
        view.deleteLater()
        application.processEvents()
