from __future__ import annotations

from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from apps.connectors import selenium_connector
from apps.connectors.selenium_connector import SeleniumConnector
from apps.core.base_connector import BaseConnector


pytestmark = [pytest.mark.unit]

FORMAL_ACTIONS = ("navigate", "dom_action", "dom_get", "wait", "screenshot")


class BrowserLaunchForbidden:
    def ChromeOptions(self):
        raise AssertionError("contract test must not configure a browser")

    def Chrome(self, *args, **kwargs):
        raise AssertionError("contract test must not launch a browser")


@pytest.fixture
def isolated_sessions(monkeypatch: pytest.MonkeyPatch) -> dict[str, dict]:
    store: dict[str, dict] = {}
    monkeypatch.setattr(selenium_connector, "SESSION_STORE", store)
    monkeypatch.setattr(selenium_connector, "LAST_SESSION_KEY", "")
    return store


@pytest.fixture
def connector(monkeypatch: pytest.MonkeyPatch, isolated_sessions: dict[str, dict]) -> SeleniumConnector:
    monkeypatch.setattr(selenium_connector, "webdriver", BrowserLaunchForbidden())
    return SeleniumConnector()


def test_locked_selenium_provides_the_apis_used_by_the_connector() -> None:
    assert selenium_connector.webdriver is webdriver
    assert selenium_connector.By is By
    assert selenium_connector.Keys is Keys
    assert selenium_connector.EC is EC
    assert selenium_connector.Select is Select
    assert selenium_connector.WebDriverWait is WebDriverWait

    for member in (
        "get",
        "quit",
        "title",
        "current_url",
        "current_window_handle",
        "window_handles",
        "switch_to",
        "set_page_load_timeout",
        "find_elements",
        "execute_script",
        "execute_cdp_cmd",
        "save_screenshot",
    ):
        assert hasattr(webdriver.Chrome, member), member
    options = webdriver.ChromeOptions()
    options.page_load_strategy = "none"
    options.add_argument("--headless=new")
    assert options.page_load_strategy == "none"
    assert "--headless=new" in options.arguments
    assert By.CSS_SELECTOR and By.XPATH and Keys.ENTER
    for condition in (
        "presence_of_element_located",
        "visibility_of_element_located",
        "invisibility_of_element_located",
        "url_contains",
        "url_to_be",
    ):
        assert callable(getattr(EC, condition)), condition
    for method in ("select_by_value", "select_by_visible_text", "select_by_index"):
        assert callable(getattr(Select, method)), method
    assert callable(WebDriverWait.until)


def test_connector_initializes_without_browser_session(
    connector: SeleniumConnector, isolated_sessions: dict[str, dict]
) -> None:
    assert isinstance(connector, BaseConnector)
    assert isolated_sessions == {}


@pytest.mark.parametrize("action", FORMAL_ACTIONS)
def test_formal_actions_route_to_their_handlers(
    connector: SeleniumConnector, monkeypatch: pytest.MonkeyPatch, action: str
) -> None:
    calls: list[tuple[dict, dict]] = []

    def handler(params: dict, context: dict) -> str:
        calls.append((params, context))
        return action

    monkeypatch.setattr(connector, action, handler)
    params = {"marker": action}
    context: dict = {}

    assert connector.execute(action, params, context) == action
    assert calls == [(params, context)]


def test_unknown_action_is_rejected(connector: SeleniumConnector) -> None:
    with pytest.raises(ValueError, match="Unknown action: open_in_chrome"):
        connector.execute("open_in_chrome", {}, {})


@pytest.mark.parametrize(
    ("action", "missing"),
    [
        ("navigate", "url"),
        ("dom_action", "operation"),
        ("dom_get", "get_type, selector"),
        ("wait", "until"),
        ("screenshot", "path"),
    ],
)
def test_missing_required_parameters_are_rejected(
    connector: SeleniumConnector, action: str, missing: str
) -> None:
    with pytest.raises(ValueError, match=f"必須パラメータが不足しています: {missing}"):
        connector.execute(action, {}, {})


@pytest.mark.parametrize(
    "url",
    ["file:///C:/Windows/win.ini", "javascript:alert(1)", "data:text/html,blocked"],
)
def test_navigate_rejects_non_web_urls_before_browser_launch(
    connector: SeleniumConnector, isolated_sessions: dict[str, dict], url: str
) -> None:
    context: dict = {}

    with pytest.raises(ValueError, match="Web allowlist で許可されていない URL です"):
        connector.execute("navigate", {"url": url}, context)

    assert SeleniumConnector.RUNTIME_KEY not in context
    assert isolated_sessions == {}


def test_navigate_consults_web_policy_before_browser_launch(
    connector: SeleniumConnector,
    monkeypatch: pytest.MonkeyPatch,
    isolated_sessions: dict[str, dict],
) -> None:
    checked: list[str] = []

    def deny(url: str) -> bool:
        checked.append(url)
        return False

    monkeypatch.setattr(selenium_connector, "is_web_target_allowed", deny)
    context: dict = {}

    with pytest.raises(ValueError, match="Web allowlist で許可されていない URL です"):
        connector.execute("navigate", {"url": "https://blocked.example/path"}, context)

    assert checked == ["https://blocked.example/path"]
    assert SeleniumConnector.RUNTIME_KEY not in context
    assert isolated_sessions == {}


@pytest.mark.parametrize(
    ("action", "params"),
    [
        ("dom_action", {"operation": "click", "selector": "#submit"}),
        ("dom_get", {"get_type": "text", "selector": "#title"}),
        ("wait", {"until": "url_contains", "value": "done"}),
    ],
)
def test_page_actions_require_a_prior_navigate_session(
    connector: SeleniumConnector, action: str, params: dict
) -> None:
    with pytest.raises(ValueError, match="先に navigate を実行してください"):
        connector.execute(action, params, {})


def test_screenshot_requires_a_prior_navigate_session_before_writing(
    connector: SeleniumConnector, tmp_path: Path
) -> None:
    target = tmp_path / "captures" / "page.png"

    with pytest.raises(ValueError, match="先に navigate を実行してください"):
        connector.execute("screenshot", {"path": str(target)}, {})

    assert not target.parent.exists()


def test_missing_selenium_dependency_points_to_uv_setup(
    monkeypatch: pytest.MonkeyPatch, isolated_sessions: dict[str, dict]
) -> None:
    monkeypatch.setattr(selenium_connector, "webdriver", None)
    monkeypatch.setattr(selenium_connector, "is_web_target_allowed", lambda url: True)
    context: dict = {}

    with pytest.raises(ImportError) as raised:
        SeleniumConnector().execute("navigate", {"url": "https://allowed.example/"}, context)

    message = str(raised.value)
    assert "正式依存 selenium" in message
    assert "uv sync --frozen" in message
    assert "pip install" not in message
    assert SeleniumConnector.RUNTIME_KEY not in context
    assert isolated_sessions == {}
