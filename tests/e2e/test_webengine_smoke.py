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

from app.gui.bridge import BridgeRuntime, WebViewBridge


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
LAYOUT_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "contracts" / "repository-layout.json"
NAVIGATION_CASES_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "webengine" / "navigation-cases.json"

pytestmark = [pytest.mark.e2e, pytest.mark.risk_web_001, pytest.mark.timeout(45)]


class RequestProbe:
    """QWebEngineUrlRequestInterceptor へ渡す最小の request info スタブ。"""

    def __init__(self, url: QUrl) -> None:
        self._url = url
        self.blocked = False

    def requestUrl(self) -> QUrl:
        return self._url

    def block(self, value: bool) -> None:
        self.blocked = bool(value)


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


def wait_for_bridge_response(view: QWebEngineView, timeout_ms: int = 10000) -> dict:
    run_javascript(
        view,
        """
        window.__zizTestStatus = null;
        window.__zizTestError = null;
        window.zizBridge.call("app.getStatus", {}).then(
          (value) => { window.__zizTestStatus = value; },
          (error) => { window.__zizTestError = error; }
        );
        true;
        """,
    )
    deadline_steps = max(1, timeout_ms // 100)
    for _ in range(deadline_steps):
        raw = run_javascript(
            view,
            "JSON.stringify({status: window.__zizTestStatus, error: window.__zizTestError})",
            timeout_ms=1000,
        )
        state = json.loads(raw)
        if state["error"] is not None:
            raise AssertionError(f"Bridge request failed: {state['error']}")
        if state["status"] is not None:
            return state["status"]
        loop = QEventLoop()
        QTimer.singleShot(100, loop.quit)
        loop.exec()
    raise AssertionError("Bridge response timed out")


@pytest.mark.risk_web_002
def test_locked_down_page_blocks_untrusted_navigation_and_popups() -> None:
    from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile

    from app.gui.host import build_locked_down_web_types

    QApplication.instance() or QApplication([])
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
    entry = (REPOSITORY_ROOT / layout["web_entries"][0]).resolve()
    interceptor_type, page_type = build_locked_down_web_types()
    interceptor = interceptor_type(entry.parent, entry)
    profile = QWebEngineProfile("zizai-navigation-cases")
    page = page_type(profile, entry.parent, entry)

    violations: list[str] = []
    for case in json.loads(NAVIGATION_CASES_PATH.read_text(encoding="utf-8"))["cases"]:
        url = QUrl(case["url"])
        committed = bool(
            page.acceptNavigationRequest(
                url, QWebEnginePage.NavigationType.NavigationTypeLinkClicked, True
            )
        )
        probe = RequestProbe(url)
        interceptor.interceptRequest(probe)
        allowed = case["expected"] == "allowed"
        if committed is not allowed or probe.blocked is allowed:
            violations.append(f"{case['kind']}: navigation={committed} blocked={probe.blocked}")

    bundled = QUrl.fromLocalFile(str(entry))
    bundled_probe = RequestProbe(bundled)
    interceptor.interceptRequest(bundled_probe)

    assert violations == []
    assert page.createWindow(QWebEnginePage.WebWindowType.WebBrowserTab) is None
    assert (
        page.acceptNavigationRequest(
            bundled, QWebEnginePage.NavigationType.NavigationTypeTyped, True
        )
        is True
    )
    assert bundled_probe.blocked is False

    page.deleteLater()
    profile.deleteLater()


def test_production_pages_load_local_assets_and_bridge_round_trip() -> None:
    application = QApplication.instance() or QApplication([])
    layout = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))

    for relative_entry in layout["web_entries"]:
        entry = (REPOSITORY_ROOT / relative_entry).resolve()
        runtime = BridgeRuntime(REPOSITORY_ROOT)
        bridge = WebViewBridge(runtime)
        channel = QWebChannel()
        channel.registerObject("backendBridge", bridge)
        view = QWebEngineView()
        view.page().setWebChannel(channel)

        assert wait_for_load(view, QUrl.fromLocalFile(str(entry))) is True
        asset_urls = run_javascript(
            view,
            "JSON.stringify([...document.scripts, ...document.querySelectorAll('link[href]')].map((item) => item.src || item.href).filter(Boolean))",
        )
        assert all(
            url.startswith(entry.parent.as_uri()) or url.startswith("qrc:/")
            for url in json.loads(asset_urls)
        )
        status = wait_for_bridge_response(view)
        assert status["protocol_version"] == "1.0"
        assert status["host"] == "pyside6-qtwebengine"

        view.close()
        view.deleteLater()
        application.processEvents()
